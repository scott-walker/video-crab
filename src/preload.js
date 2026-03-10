const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Window
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // Files
  openFile: () => ipcRenderer.invoke('open-file'),
  exportVideo: (opts) => ipcRenderer.invoke('export-video', opts),

  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (s) => ipcRenderer.invoke('save-settings', s),

  // Projects
  listProjects: () => ipcRenderer.invoke('list-projects'),
  getProject: (id) => ipcRenderer.invoke('get-project', id),
  saveProject: (p) => ipcRenderer.invoke('save-project', p),
  deleteProject: (id) => ipcRenderer.invoke('delete-project', id),

  // Transcription (OpenAI Whisper API)
  extractAudio: (opts) => ipcRenderer.invoke('extract-audio', opts),
  transcribeOpenAI: (opts) => ipcRenderer.invoke('transcribe-openai', opts),
  transcribeBuffer: (opts) => ipcRenderer.invoke('transcribe-buffer', opts),

  // Vision / frames (OpenAI GPT-4o)
  extractFrames: (opts) => ipcRenderer.invoke('extract-frames', opts),
  analyzeFrameOpenAI: (opts) => ipcRenderer.invoke('analyze-frame-openai', opts),

  // Groq semantic analysis
  groqAnalyze: (opts) => ipcRenderer.invoke('groq-analyze', opts),

  // ElevenLabs TTS (streaming)
  startTtsStream: (opts) => ipcRenderer.send('tts-stream-start', opts),
  stopTtsStream: () => ipcRenderer.send('tts-stream-stop'),
  onTtsChunk: (cb) => { ipcRenderer.on('tts-chunk', (_, data) => cb(data)); },
  onTtsDone: (cb) => { ipcRenderer.on('tts-done', () => cb()); },
  onTtsError: (cb) => { ipcRenderer.on('tts-error', (_, err) => cb(err)); },
  removeTtsListeners: () => {
    ipcRenderer.removeAllListeners('tts-chunk');
    ipcRenderer.removeAllListeners('tts-done');
    ipcRenderer.removeAllListeners('tts-error');
  },
});
