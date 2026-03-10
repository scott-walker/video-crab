const { app, BrowserWindow, ipcMain, dialog, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

let mainWindow;
let activeTtsSocket = null;

// Register custom protocol for serving local video files
protocol.registerSchemesAsPrivileged([{
  scheme: 'local-video',
  privileges: { stream: true, bypassCSP: true, supportFetchAPI: true },
}]);

// ── Projects persistence ──
const projectsDir = path.join(app.getPath('userData'), 'projects');
if (!fs.existsSync(projectsDir)) fs.mkdirSync(projectsDir, { recursive: true });

function listProjects() {
  try {
    return fs.readdirSync(projectsDir)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        try { return JSON.parse(fs.readFileSync(path.join(projectsDir, f), 'utf-8')); }
        catch { return null; }
      })
      .filter(Boolean)
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  } catch { return []; }
}

function saveProject(project) {
  const filePath = path.join(projectsDir, `${project.id}.json`);
  project.updatedAt = Date.now();
  fs.writeFileSync(filePath, JSON.stringify(project, null, 2), 'utf-8');
  return project;
}

function deleteProject(id) {
  const filePath = path.join(projectsDir, `${id}.json`);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

function getProject(id) {
  const filePath = path.join(projectsDir, `${id}.json`);
  try { return JSON.parse(fs.readFileSync(filePath, 'utf-8')); }
  catch { return null; }
}

// ── Settings persistence (JSON in userData) ──
const settingsPath = path.join(app.getPath('userData'), 'settings.json');

function loadSettings() {
  try {
    if (fs.existsSync(settingsPath)) {
      return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    }
  } catch (e) { /* ignore */ }
  return {
    openaiKey: '',
    groqKey: '',
    whisperLanguage: '',        // auto-detect if empty
    groqModel: 'llama-3.3-70b-versatile',
    frameInterval: 3,           // seconds between keyframes for vision
    elevenLabsProxy: '',                    // HTTP proxy URL (optional)
    elevenLabsKey: '',                      // ElevenLabs API key
    elevenLabsVoice: '21m00Tcm4TlvDq8ikWAM', // voice ID (Rachel by default)
    elevenLabsSpeed: 1.0,                   // speech speed 0.5–2.0
  };
}

function saveSettings(settings) {
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1380,
    height: 900,
    minWidth: 1000,
    minHeight: 650,
    frame: false,
    backgroundColor: '#0a0a0c',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  // Register protocol handler to serve local files (needed when running from localhost in dev)
  protocol.registerFileProtocol('local-video', (request, callback) => {
    const filePath = decodeURIComponent(request.url.replace('local-video://', ''));
    callback({ path: filePath });
  });
  createWindow();
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('will-quit', () => {
  // Kill any open TTS sockets so the process can exit
  if (activeTtsSocket) { try { activeTtsSocket.destroy(); } catch {} activeTtsSocket = null; }
});
app.on('quit', () => { process.exit(0); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

// ── Window controls ──
ipcMain.on('window-minimize', () => mainWindow.minimize());
ipcMain.on('window-maximize', () => {
  mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
});
ipcMain.on('window-close', () => mainWindow.close());

// ── Settings IPC ──
ipcMain.handle('get-settings', () => loadSettings());
ipcMain.handle('save-settings', (event, settings) => {
  saveSettings(settings);
  return { success: true };
});

// ── Projects IPC ──
ipcMain.handle('list-projects', () => listProjects());
ipcMain.handle('get-project', (event, id) => getProject(id));
ipcMain.handle('save-project', (event, project) => saveProject(project));
ipcMain.handle('delete-project', (event, id) => { deleteProject(id); return { success: true }; });

// ── Open file dialog ──
ipcMain.handle('open-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Video', extensions: ['mp4', 'mkv', 'avi', 'mov', 'webm', 'flv', 'wmv'] },
    ],
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

// ── Export trimmed video ──
ipcMain.handle('export-video', async (event, { inputPath, startTime, endTime }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: 'trimmed_video.mp4',
    filters: [{ name: 'MP4 Video', extensions: ['mp4'] }],
  });
  if (result.canceled) return { success: false };

  const outputPath = result.filePath;
  const duration = endTime - startTime;

  return new Promise((resolve) => {
    const cmd = `ffmpeg -y -i "${inputPath}" -ss ${startTime} -t ${duration} -c copy "${outputPath}"`;
    exec(cmd, (error) => {
      if (error) resolve({ success: false, error: error.message });
      else resolve({ success: true, outputPath });
    });
  });
});

// ── Extract audio from video ──
ipcMain.handle('extract-audio', async (event, { videoPath, startTime, duration }) => {
  const tmpDir = path.join(app.getPath('temp'), 'video-trimmer');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  const audioPath = path.join(tmpDir, `audio_${Date.now()}.wav`);

  return new Promise((resolve) => {
    const timeArgs = (startTime != null && duration != null) ? `-ss ${startTime} -t ${duration} ` : '';
    const cmd = `ffmpeg -y -i "${videoPath}" ${timeArgs}-ar 16000 -ac 1 -c:a pcm_s16le "${audioPath}"`;
    exec(cmd, { timeout: 120000 }, (error) => {
      if (error) resolve({ success: false, error: error.message });
      else resolve({ success: true, audioPath });
    });
  });
});

// ── Transcribe with OpenAI Whisper API ──
ipcMain.handle('transcribe-openai', async (event, { audioPath }) => {
  const settings = loadSettings();
  if (!settings.openaiKey) return { success: false, error: 'OpenAI API key not set' };

  try {
    const audioData = fs.readFileSync(audioPath);
    const boundary = '----FormBoundary' + Date.now();
    const body = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="audio.wav"\r\nContent-Type: audio/wav\r\n\r\n`
      ),
      audioData,
      Buffer.from(
        `\r\n--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-1\r\n` +
        `--${boundary}\r\nContent-Disposition: form-data; name="response_format"\r\n\r\nverbose_json\r\n` +
        `--${boundary}\r\nContent-Disposition: form-data; name="timestamp_granularities[]"\r\n\r\nsegment\r\n` +
        (settings.whisperLanguage ? `--${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\n${settings.whisperLanguage}\r\n` : '') +
        `--${boundary}--\r\n`
      ),
    ]);

    const { net } = require('electron');
    return new Promise((resolve) => {
      const request = net.request({
        method: 'POST',
        url: 'https://api.openai.com/v1/audio/transcriptions',
      });
      request.setHeader('Authorization', `Bearer ${settings.openaiKey}`);
      request.setHeader('Content-Type', `multipart/form-data; boundary=${boundary}`);

      let responseData = '';
      request.on('response', (response) => {
        response.on('data', (chunk) => { responseData += chunk.toString(); });
        response.on('end', () => {
          try {
            const data = JSON.parse(responseData);
            if (data.segments) {
              resolve({ success: true, segments: data.segments });
            } else if (data.error) {
              resolve({ success: false, error: data.error.message });
            } else {
              resolve({ success: false, error: 'Unexpected response format' });
            }
          } catch (e) {
            resolve({ success: false, error: 'Parse error: ' + e.message });
          }
        });
      });
      request.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });
      request.write(body);
      request.end();
    });
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// ── Transcribe short audio buffer (for voice input) ──
ipcMain.handle('transcribe-buffer', async (event, { base64 }) => {
  console.log('[transcribe-buffer] received, base64 length:', base64?.length);
  const settings = loadSettings();
  if (!settings.openaiKey) return { success: false, error: 'OpenAI API key not set' };

  try {
    const audioData = Buffer.from(base64, 'base64');
    console.log('[transcribe-buffer] audio size:', audioData.length, 'bytes');
    const boundary = '----FormBoundary' + Date.now();
    const body = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="voice.webm"\r\nContent-Type: audio/webm\r\n\r\n`
      ),
      audioData,
      Buffer.from(
        `\r\n--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-1\r\n` +
        `--${boundary}\r\nContent-Disposition: form-data; name="response_format"\r\n\r\njson\r\n` +
        (settings.whisperLanguage ? `--${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\n${settings.whisperLanguage}\r\n` : '') +
        `--${boundary}--\r\n`
      ),
    ]);

    const { net } = require('electron');
    return new Promise((resolve) => {
      const request = net.request({
        method: 'POST',
        url: 'https://api.openai.com/v1/audio/transcriptions',
      });
      request.setHeader('Authorization', `Bearer ${settings.openaiKey}`);
      request.setHeader('Content-Type', `multipart/form-data; boundary=${boundary}`);

      let responseData = '';
      request.on('response', (response) => {
        response.on('data', (chunk) => { responseData += chunk.toString(); });
        response.on('end', () => {
          console.log('[transcribe-buffer] response status:', response.statusCode, 'body:', responseData.slice(0, 500));
          try {
            const data = JSON.parse(responseData);
            if (data.text !== undefined) {
              resolve({ success: true, text: data.text });
            } else if (data.error) {
              resolve({ success: false, error: data.error.message });
            } else {
              resolve({ success: false, error: 'Unexpected response' });
            }
          } catch (e) {
            resolve({ success: false, error: 'Parse error: ' + e.message });
          }
        });
      });
      request.on('error', (err) => { console.error('[transcribe-buffer] request error:', err); resolve({ success: false, error: err.message }); });
      request.write(body);
      request.end();
    });
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// ── Extract keyframes ──
ipcMain.handle('extract-frames', async (event, { videoPath, interval }) => {
  const tmpDir = path.join(app.getPath('temp'), 'video-trimmer', 'frames_' + Date.now());
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  return new Promise((resolve) => {
    const cmd = `ffmpeg -y -i "${videoPath}" -vf "fps=1/${interval}" "${path.join(tmpDir, 'frame_%04d.jpg')}"`;
    exec(cmd, { timeout: 300000 }, (error) => {
      if (error) {
        resolve({ success: false, error: error.message });
        return;
      }
      const files = fs.readdirSync(tmpDir).filter(f => f.endsWith('.jpg')).sort();
      const frames = files.map((f, i) => ({
        path: path.join(tmpDir, f),
        time: i * interval,
        base64: fs.readFileSync(path.join(tmpDir, f)).toString('base64'),
      }));
      resolve({ success: true, frames });
    });
  });
});

// ── Semantic analysis with Groq ──
ipcMain.handle('groq-analyze', async (event, { prompt, systemPrompt }) => {
  const settings = loadSettings();
  if (!settings.groqKey) return { success: false, error: 'Groq API key not set' };

  const { net } = require('electron');
  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: prompt });

  const body = JSON.stringify({
    model: settings.groqModel || 'llama-3.3-70b-versatile',
    messages,
    temperature: 0.3,
  });

  return new Promise((resolve) => {
    const request = net.request({
      method: 'POST',
      url: 'https://api.groq.com/openai/v1/chat/completions',
    });
    request.setHeader('Content-Type', 'application/json');
    request.setHeader('Authorization', `Bearer ${settings.groqKey}`);

    let responseData = '';
    request.on('response', (response) => {
      response.on('data', (chunk) => { responseData += chunk.toString(); });
      response.on('end', () => {
        try {
          const data = JSON.parse(responseData);
          if (data.choices && data.choices[0]) {
            resolve({ success: true, text: data.choices[0].message.content });
          } else if (data.error) {
            resolve({ success: false, error: data.error.message });
          } else {
            resolve({ success: false, error: 'Unexpected Groq response' });
          }
        } catch (e) {
          resolve({ success: false, error: 'Parse error: ' + e.message });
        }
      });
    });
    request.on('error', (err) => resolve({ success: false, error: err.message }));
    request.write(body);
    request.end();
  });
});

// ── Analyze frame with OpenAI Vision ──
ipcMain.handle('analyze-frame-openai', async (event, { base64, prompt }) => {
  const settings = loadSettings();
  if (!settings.openaiKey) return { success: false, error: 'OpenAI API key not set' };

  const { net } = require('electron');
  const body = JSON.stringify({
    model: 'gpt-4o',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } },
        { type: 'text', text: prompt || 'Briefly describe what is happening in this video frame. Be concise.' },
      ],
    }],
  });

  return new Promise((resolve) => {
    const request = net.request({
      method: 'POST',
      url: 'https://api.openai.com/v1/chat/completions',
    });
    request.setHeader('Content-Type', 'application/json');
    request.setHeader('Authorization', `Bearer ${settings.openaiKey}`);

    let responseData = '';
    request.on('response', (response) => {
      response.on('data', (chunk) => { responseData += chunk.toString(); });
      response.on('end', () => {
        try {
          const data = JSON.parse(responseData);
          if (data.choices && data.choices[0]) {
            resolve({ success: true, text: data.choices[0].message.content });
          } else if (data.error) {
            resolve({ success: false, error: data.error.message });
          } else {
            resolve({ success: false, error: 'Unexpected response' });
          }
        } catch (e) {
          resolve({ success: false, error: 'Parse error: ' + e.message });
        }
      });
    });
    request.on('error', (err) => resolve({ success: false, error: err.message }));
    request.write(body);
    request.end();
  });
});

// ── ElevenLabs TTS streaming (via HTTP proxy → ElevenLabs API) ──

ipcMain.on('tts-stream-start', (event, { text, voice }) => {
  const settings = loadSettings();
  const proxyStr = settings.elevenLabsProxy;
  const apiKey = settings.elevenLabsKey;
  const voiceId = voice || settings.elevenLabsVoice || '21m00Tcm4TlvDq8ikWAM';
  const lang = settings.whisperLanguage || 'en';

  console.log('[TTS] Start. text length:', text?.length, 'voiceId:', voiceId, 'lang:', lang, 'proxy:', proxyStr, 'key set:', !!apiKey);

  if (!apiKey) { event.sender.send('tts-error', 'ElevenLabs API key not set'); return; }

  const http = require('http');
  const https = require('https');
  const tls = require('tls');

  const apiHost = 'api.elevenlabs.io';
  const apiPath = `/v1/text-to-speech/${voiceId}/stream`;
  const speed = Math.max(0.7, Math.min(1.2, parseFloat(settings.elevenLabsSpeed) || 1.0));
  console.log('[TTS] speed after clamp:', speed);
  const body = JSON.stringify({
    text,
    model_id: 'eleven_flash_v2_5',
    language_code: lang,
    voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    speed,
  });

  const apiHeaders = {
    'Content-Type': 'application/json',
    'xi-api-key': apiKey,
    'Content-Length': Buffer.byteLength(body),
  };

  function handleApiResponse(response) {
    const ct = (response.headers['content-type'] || '').toString();
    const status = response.statusCode;
    console.log('[TTS] API response, status:', status, 'content-type:', ct);

    if (status >= 400 || (!ct.includes('audio') && !ct.includes('octet-stream'))) {
      let data = '';
      response.on('data', (chunk) => { data += chunk.toString(); });
      response.on('end', () => {
        console.log('[TTS] Error body:', data.substring(0, 500));
        try {
          const parsed = JSON.parse(data);
          event.sender.send('tts-error', parsed.detail?.message || parsed.error || data.substring(0, 200));
        } catch { event.sender.send('tts-error', `API error ${status}: ${data.substring(0, 200)}`); }
        activeTtsSocket = null;
      });
      return;
    }

    let chunkCount = 0, totalBytes = 0;
    response.on('data', (chunk) => {
      chunkCount++; totalBytes += chunk.length;
      if (chunkCount <= 3 || chunkCount % 10 === 0) console.log('[TTS] Chunk #' + chunkCount, 'size:', chunk.length, 'total:', totalBytes);
      try { event.sender.send('tts-chunk', chunk.toString('base64')); } catch {}
    });
    response.on('end', () => {
      console.log('[TTS] Done. Chunks:', chunkCount, 'bytes:', totalBytes);
      event.sender.send('tts-done');
      activeTtsSocket = null;
    });
  }

  // ── Direct request (no proxy) ──
  if (!proxyStr) {
    console.log('[TTS] Direct request to ElevenLabs API');
    const req = https.request({ hostname: apiHost, path: apiPath, method: 'POST', headers: apiHeaders }, handleApiResponse);
    req.on('error', (err) => { console.log('[TTS] Request error:', err.message); event.sender.send('tts-error', err.message); activeTtsSocket = null; });
    req.write(body);
    req.end();
    return;
  }

  // ── Request via HTTP proxy (CONNECT tunnel) ──
  let proxyUrl;
  try { proxyUrl = new URL(proxyStr.includes('://') ? proxyStr : 'http://' + proxyStr); }
  catch (e) { event.sender.send('tts-error', 'Invalid proxy URL: ' + e.message); return; }

  console.log('[TTS] CONNECT tunnel via', proxyUrl.hostname + ':' + proxyUrl.port);

  const connectHeaders = { Host: `${apiHost}:443` };
  if (proxyUrl.username) {
    connectHeaders['Proxy-Authorization'] = 'Basic ' + Buffer.from(
      `${decodeURIComponent(proxyUrl.username)}:${decodeURIComponent(proxyUrl.password || '')}`
    ).toString('base64');
  }

  const connectReq = http.request({
    host: proxyUrl.hostname,
    port: parseInt(proxyUrl.port) || 80,
    method: 'CONNECT',
    path: `${apiHost}:443`,
    headers: connectHeaders,
  });

  connectReq.on('connect', (res, socket) => {
    console.log('[TTS] CONNECT status:', res.statusCode);
    if (res.statusCode !== 200) {
      event.sender.send('tts-error', `Proxy CONNECT failed: ${res.statusCode}`);
      socket.destroy();
      activeTtsSocket = null;
      return;
    }

    const tlsSocket = tls.connect({ socket, servername: apiHost }, () => {
      console.log('[TTS] TLS handshake done, sending API request');
      const req = https.request({
        hostname: apiHost, path: apiPath, method: 'POST', headers: apiHeaders,
        createConnection: () => tlsSocket,
      }, handleApiResponse);
      req.on('error', (err) => { console.log('[TTS] API request error:', err.message); event.sender.send('tts-error', err.message); activeTtsSocket = null; });
      req.write(body);
      req.end();
    });

    activeTtsSocket = tlsSocket;
    tlsSocket.on('error', (err) => { console.log('[TTS] TLS error:', err.message); event.sender.send('tts-error', 'TLS: ' + err.message); activeTtsSocket = null; });
  });

  connectReq.on('error', (err) => {
    console.log('[TTS] Proxy connect error:', err.message);
    event.sender.send('tts-error', 'Proxy: ' + err.message);
    activeTtsSocket = null;
  });

  connectReq.end();
});

ipcMain.on('tts-stream-stop', () => {
  if (activeTtsSocket) {
    try { activeTtsSocket.destroy(); } catch {}
    activeTtsSocket = null;
  }
});

