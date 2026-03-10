import { Show, For, createEffect, onMount, onCleanup, createSignal, createMemo } from 'solid-js';
import { fmt, fmtShort, fmtDur, parseTimestamp } from './format';
import {
  filePath, setFilePath, videoFileName, duration, setDuration, currentTime, setCurrentTime,
  isPlaying, setIsPlaying, trimIn, setTrimIn, trimOut, setTrimOut, trimDuration,
  clips, activeClipId, addClip, removeClip, selectClip,
  transcriptSegments, transcriptRegions, activeRegionId, setActiveRegionId, activeRegion,
  addTranscriptRegion, removeTranscriptRegion, selectTranscriptRegion, allTranscriptSegments,
  showAnalysis, setShowAnalysis, analysisHtml,
  analysisRegions, activeAnalysisId, setActiveAnalysisId, activeAnalysis,
  addAnalysisRegion, removeAnalysisRegion, selectAnalysisRegion,
  statusVisible, statusMessage, statusProgress, setStatus, hideStatus,
  showToast, videoEl, setVideoEl, resetForNewFile, page, sidebarVisible, sidebarMode, setSidebarMode,
  projects, loadProjects, openProject, deleteProjectById, createProject, currentProject, setPage,
  scheduleAutoSave,
} from './store';

// ── Icons as components ──
const IconPlus = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
const IconExport = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>;
const IconX = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
const IconMic = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>;
const IconText = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="17" y1="10" x2="3" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="14" x2="3" y2="14" /><line x1="17" y1="18" x2="3" y2="18" /></svg>;
const IconBrain = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>;
const IconFolder = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>;

function ProjectsSidebar() {
  const [confirmDelete, setConfirmDelete] = createSignal(null);

  onMount(() => loadProjects());

  function fmtDate(ts) {
    if (!ts) return '';
    return new Date(ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  }

  return (
    <>
      <div class="sidebar-header">
        <span class="sidebar-title">Projects</span>
        <span class="clip-count">{projects().length}</span>
      </div>
      <div class="sidebar-clips">
        <For each={projects()}>{proj =>
          <div class="clip-card" classList={{ active: currentProject()?.id === proj.id }} onClick={() => openProject(proj)}>
            <div class="clip-card-top">
              <span class="clip-card-name" style={{ "max-width": "180px" }}>{proj.name}</span>
              <div class="clip-card-actions">
                <Show when={confirmDelete() === proj.id} fallback={
                  <button class="clip-action-btn delete-clip" onClick={e => { e.stopPropagation(); setConfirmDelete(proj.id); }} data-tooltip="Delete">
                    <IconX />
                  </button>
                }>
                  <button class="clip-action-btn delete-clip" style={{ color: 'var(--accent)', "font-size": 'var(--fs-xs)' }}
                    onClick={e => { e.stopPropagation(); deleteProjectById(proj.id); setConfirmDelete(null); }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </button>
                </Show>
              </div>
            </div>
            <div class="clip-card-times">
              <span style={{ "font-family": "var(--font-mono)", "font-size": "var(--fs-sm)", color: "var(--text-muted)" }}>
                {proj.clips?.length || 0} clips
              </span>
              <Show when={proj.updatedAt}>
                <span class="clip-arrow">·</span>
                <span style={{ "font-family": "var(--font-mono)", "font-size": "var(--fs-sm)", color: "var(--text-muted)" }}>
                  {fmtDate(proj.updatedAt)}
                </span>
              </Show>
            </div>
          </div>
        }</For>
        <button class="sidebar-new-project-btn" onClick={() => setPage('projects')}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          New Project
        </button>
      </div>
    </>
  );
}

export default function Editor() {
  let videoRef;
  let timelineRef;
  const [dragging, setDragging] = createSignal(null);
  const [transcribing, setTranscribing] = createSignal(false);
  const [analyzing, setAnalyzing] = createSignal(false);
  const [showAnalysisPrompt, setShowAnalysisPrompt] = createSignal(false);
  const [analysisQuery, setAnalysisQuery] = createSignal('');
  const [voiceRecording, setVoiceRecording] = createSignal(false);
  let mediaRecorder = null;
  const [speaking, setSpeaking] = createSignal(false);
  let currentAudioEl = null;
  let rangeAnchor = null; // starting time for range-drag on timeline
  let rangeStartX = null; // mouse X at mousedown, to detect drag vs click

  // ── Computed ──
  const timeToPct = (t) => duration() > 0 ? (t / duration()) * 100 : 0;
  const handleW = 7; // half of handle width in px

  // ── Video setup ──
  onMount(() => {
    setVideoEl(videoRef);

    // rAF loop for playhead
    let raf;
    const tick = () => {
      if (videoRef) {
        const t = videoRef.currentTime;
        const tIn = trimIn();
        const tOut = trimOut();
        // Clamp playhead: only force-seek if significantly out of bounds
        // Allow 0.15s tolerance to avoid fighting with video seeking/buffering
        if (t < tIn - 0.15) { videoRef.currentTime = tIn; setCurrentTime(tIn); }
        else if (t > tOut + 0.05) {
          videoRef.currentTime = tOut;
          setCurrentTime(tOut);
          if (isPlaying()) { videoRef.pause(); setIsPlaying(false); }
        } else if (t >= tOut && isPlaying()) {
          videoRef.pause(); setIsPlaying(false);
          setCurrentTime(tOut);
        } else {
          setCurrentTime(t);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    onCleanup(() => cancelAnimationFrame(raf));

    // Keyboard
    const onKey = (e) => {
      if (page() !== 'editor') return;

      // Ctrl+B — toggle sidebar (works in any layout)
      if (e.ctrlKey && (e.code === 'KeyB')) {
        e.preventDefault();
        const current = sidebarMode();
        setSidebarMode(current ? null : 'clips');
        return;
      }

      // Ctrl +/- zoom
      if (e.ctrlKey && (e.code === 'Equal' || e.code === 'NumpadAdd')) {
        e.preventDefault();
        const root = document.documentElement;
        const current = parseFloat(getComputedStyle(root).getPropertyValue('--zoom')) || 1;
        root.style.setProperty('--zoom', Math.min(2, current + 0.05));
        return;
      }
      if (e.ctrlKey && (e.code === 'Minus' || e.code === 'NumpadSubtract')) {
        e.preventDefault();
        const root = document.documentElement;
        const current = parseFloat(getComputedStyle(root).getPropertyValue('--zoom')) || 1;
        root.style.setProperty('--zoom', Math.max(0.5, current - 0.05));
        return;
      }

      if (!filePath()) return;
      switch (e.code) {
        case 'Space': e.preventDefault(); togglePlay(); break;
        case 'ArrowLeft': videoRef.currentTime = Math.max(trimIn(), videoRef.currentTime - (e.shiftKey ? 5 : 1 / 30)); break;
        case 'ArrowRight': videoRef.currentTime = Math.min(trimOut(), videoRef.currentTime + (e.shiftKey ? 5 : 1 / 30)); break;
        case 'KeyI': setTrimIn(videoRef.currentTime); if (trimIn() >= trimOut()) setTrimOut(Math.min(duration(), trimIn() + 0.1)); break;
        case 'KeyO': setTrimOut(videoRef.currentTime); if (trimOut() <= trimIn()) setTrimIn(Math.max(0, trimOut() - 0.1)); break;
      }
    };
    document.addEventListener('keydown', onKey);
    onCleanup(() => document.removeEventListener('keydown', onKey));

    // Mouse up for drag
    const onMouseUp = () => { setDragging(null); rangeAnchor = null; rangeStartX = null; };
    document.addEventListener('mouseup', onMouseUp);
    onCleanup(() => document.removeEventListener('mouseup', onMouseUp));

    // Mouse move for drag
    const onMouseMove = (e) => {
      const d = dragging();
      if (!d || !timelineRef) return;
      const rect = timelineRef.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const t = pct * duration();
      if (d === 'left') {
        setTrimIn(Math.max(0, Math.min(t, trimOut() - 0.1)));
        if (videoRef.currentTime < trimIn()) videoRef.currentTime = trimIn();
      } else if (d === 'right') {
        setTrimOut(Math.min(duration(), Math.max(t, trimIn() + 0.1)));
        if (videoRef.currentTime > trimOut()) videoRef.currentTime = trimOut();
      } else if (d === 'pending-range') {
        // Only switch to range mode after dragging 5+ px
        if (rangeStartX !== null && Math.abs(e.clientX - rangeStartX) > 5) {
          setDragging('range');
        }
      } else if (d === 'range') {
        const lo = Math.max(0, Math.min(rangeAnchor, t));
        const hi = Math.min(duration(), Math.max(rangeAnchor, t));
        setTrimIn(lo);
        setTrimOut(hi);
        videoRef.currentTime = lo;
      } else if (d === 'playhead') {
        videoRef.currentTime = Math.max(trimIn(), Math.min(trimOut(), t));
      }
    };
    document.addEventListener('mousemove', onMouseMove);
    onCleanup(() => document.removeEventListener('mousemove', onMouseMove));

  });

  // ── Playback ──
  function togglePlay() {
    if (!videoRef) return;
    if (videoRef.paused) {
      if (videoRef.currentTime < trimIn() - 0.2 || videoRef.currentTime >= trimOut() - 0.05) videoRef.currentTime = trimIn();
      videoRef.play();
      setIsPlaying(true);
    } else {
      videoRef.pause();
      setIsPlaying(false);
    }
  }

  // ── File loading ──
  // Watch filePath changes (e.g. when opening a project with existing video)
  createEffect(() => {
    const fp = filePath();
    if (!fp || !videoRef) return;
    const newSrc = `local-video://${encodeURIComponent(fp)}`;
    // Always set src and re-read metadata when filePath changes
    videoRef.src = newSrc;
    videoRef.onloadedmetadata = () => {
      setDuration(videoRef.duration);
      if (trimOut() === 0 || trimOut() > videoRef.duration) setTrimOut(videoRef.duration);
    };
  });

  async function openFile() {
    const p = await window.api.openFile();
    if (p) loadFile(p);
  }

  function loadFile(path) {
    resetForNewFile(path);
  }

  function onDrop(e) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) loadFile(f.path);
  }

  // ── Clips ──
  function handleAddClip() {
    const id = addClip();
    if (id) showToast(`Clip ${id} added (${fmtDur(trimDuration())})`, 'success');
  }

  function handleSelectClip(id) {
    const clip = selectClip(id);
    if (clip && videoRef) videoRef.currentTime = clip.inTime;
  }

  async function exportClip(clip) {
    if (!filePath()) return;
    const result = await window.api.exportVideo({ inputPath: filePath(), startTime: clip.inTime, endTime: clip.outTime });
    if (result.success) showToast(`${clip.name} → exported`, 'success');
    else showToast(`${clip.name} failed`, 'error');
  }

  async function exportAllClips() {
    if (!filePath() || clips.length === 0) return;
    showToast(`Exporting ${clips.length} clips…`);
    let ok = 0;
    for (const clip of clips) {
      const r = await window.api.exportVideo({ inputPath: filePath(), startTime: clip.inTime, endTime: clip.outTime });
      if (r && r.success) ok++;
    }
    showToast(`Done: ${ok}/${clips.length}`, ok === clips.length ? 'success' : 'error');
  }

  // ── Transcript segment modal ──
  const [modalSegment, setModalSegment] = createSignal(null);

  function openSegmentModal(seg) {
    setModalSegment(seg);
  }

  function closeSegmentModal() {
    setModalSegment(null);
  }

  // ── Transcription ──
  let transcriptionCancelled = false;

  function handleTranscriptionClick() {
    if (transcribing()) {
      transcriptionCancelled = true;
      hideStatus();
      setTranscribing(false);
      showToast('Transcription cancelled', 'error');
    } else {
      startTranscription();
    }
  }

  async function startTranscription() {
    if (!filePath()) return;
    transcriptionCancelled = false;
    setTranscribing(true);
    showToast('Transcription started…');
    setStatus('Extracting audio…');

    const startTime = trimIn();
    const dur = trimOut() - trimIn();
    const audio = await window.api.extractAudio({ videoPath: filePath(), startTime, duration: dur });
    if (transcriptionCancelled) return;
    if (!audio.success) { hideStatus(); setTranscribing(false); showToast('Audio extraction failed: ' + audio.error, 'error'); return; }

    setStatus('Transcribing via OpenAI…');
    const result = await window.api.transcribeOpenAI({ audioPath: audio.audioPath });
    if (transcriptionCancelled) return;

    hideStatus();
    setTranscribing(false);
    if (!result.success) { showToast('Transcription failed: ' + result.error, 'error'); return; }

    // Offset segment times by trimIn so they align with the video timeline
    const offsetSegments = result.segments.map(s => ({
      ...s,
      start: s.start + startTime,
      end: s.end + startTime,
    }));
    addTranscriptRegion(startTime, startTime + dur, offsetSegments);
    showToast(`Done! ${offsetSegments.length} segments transcribed`, 'success');
  }

  // ── Semantic analysis (chunked, parallel) ──
  function markdownToHtml(text) {
    return text
      .replace(/####\s*(.+)/g, '<h4>$1</h4>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code style="color:var(--accent);background:var(--bg-deep);padding:1px 4px;border-radius:3px;font-size:11px;">$1</code>')
      .replace(/(\d{1,2}:\d{2})(?:–|-)(\d{1,2}:\d{2})/g, (_, t1, t2) =>
        `<span class="time-ref" data-time="${parseTimestamp(t1)}">${t1}</span>–<span class="time-ref" data-time="${parseTimestamp(t2)}">${t2}</span>`)
      .replace(/(?<![–\-]|\d:)(\d{1,2}:\d{2})(?![–\-]|<\/span>)/g, (_, t1) =>
        `<span class="time-ref" data-time="${parseTimestamp(t1)}">${t1}</span>`)
      .replace(/\n/g, '<br>');
  }

  async function toggleVoiceInput() {
    if (voiceRecording()) {
      // Stop recording — mediaRecorder.onstop will handle transcription
      if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks = [];
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setVoiceRecording(false);
        mediaRecorder = null;
        console.log('[voice] onstop, chunks:', chunks.length);
        if (chunks.length === 0) return;
        const blob = new Blob(chunks, { type: 'audio/webm' });
        console.log('[voice] blob size:', blob.size);
        const arrayBuf = await blob.arrayBuffer();
        const uint8 = new Uint8Array(arrayBuf);
        // Convert to base64 for safe IPC transfer
        let binary = '';
        for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]);
        const base64 = btoa(binary);
        console.log('[voice] base64 length:', base64.length);
        setStatus('Transcribing voice…');
        try {
          const result = await window.api.transcribeBuffer({ base64 });
          console.log('[voice] result:', JSON.stringify(result));
          hideStatus();
          if (result.success && result.text) {
            const prev = analysisQuery().trim();
            setAnalysisQuery(prev ? prev + ' ' + result.text : result.text);
          } else if (!result.success) {
            showToast('Voice transcription failed: ' + result.error, 'error');
          }
        } catch (err) {
          console.error('[voice] IPC error:', err);
          hideStatus();
          showToast('Voice transcription error: ' + err.message, 'error');
        }
      };
      mediaRecorder = recorder;
      recorder.start();
      setVoiceRecording(true);
    } catch (e) {
      showToast('Microphone access denied', 'error');
    }
  }

  async function runAnalysis(userQuery = '') {
    const segs = allTranscriptSegments();
    if (segs.length === 0) { showToast('Transcribe the video first', 'error'); return; }

    setAnalyzing(true);
    showToast('Semantic analysis started…');

    const settings = await window.api.getSettings();
    const lang = settings.whisperLanguage === 'ru' ? 'Russian' : 'English';

    // Filter segments within trim range
    const tIn = trimIn(), tOut = trimOut();
    const rangeSegs = segs.filter(s => s.end > tIn && s.start < tOut);
    if (rangeSegs.length === 0) { showToast('No transcript in selected range', 'error'); setAnalyzing(false); return; }

    // Full plain text (no timestamps) for context extraction
    const plainText = rangeSegs.map(s => s.text.trim()).join(' ');
    // Full text with timestamps for detailed analysis
    const fullTranscript = rangeSegs.map(s => `[${fmtShort(s.start)}–${fmtShort(s.end)}] ${s.text.trim()}`).join('\n');

    // Split into ~10-minute chunks
    const CHUNK_MINUTES = 10;
    const chunks = [];
    let chunk = [];
    let chunkStart = rangeSegs[0].start;
    for (const s of rangeSegs) {
      if (s.start - chunkStart >= CHUNK_MINUTES * 60 && chunk.length > 0) {
        chunks.push(chunk);
        chunk = [];
        chunkStart = s.start;
      }
      chunk.push(s);
    }
    if (chunk.length > 0) chunks.push(chunk);

    const userFocus = userQuery.trim()
      ? `\n\nUSER'S FOCUS: The user is specifically interested in: "${userQuery.trim()}". Pay special attention to this aspect and provide extra detail on it throughout your analysis.`
      : '';

    const analysisPrompt = (context) => `You are a video content analyst. Analyze the transcript and provide an EXTREMELY DETAILED response in ${lang}.

CONTEXT OF THIS VIDEO: ${context}${userFocus}

Structure your response with these sections:
1. #### SUMMARY — Comprehensive summary (at least one full paragraph).
2. #### DETAILED ANALYSIS — This is the MAIN section. Go through the content chronologically in great detail. For each topic or discussion point: describe what exactly is being said, by whom, what arguments are made, what decisions are reached, how topics transition. Write multiple paragraphs — each covering a distinct part of the conversation. Aim for at least one paragraph per 2-3 minutes of content. Do NOT skip or compress anything — every meaningful exchange should be described. Do NOT include timestamps — write as a pure narrative.
3. #### TOPICS — All topics discussed with time ranges.
4. #### KEY MOMENTS — Important moments with timestamps (as many as needed).
5. #### SUGGESTED CLIPS — Logical clip boundaries with titles.
Format timestamps as MM:SS only in TOPICS, KEY MOMENTS, and SUGGESTED CLIPS sections. Use markdown headers (#### TITLE). Respond entirely in ${lang}. The DETAILED ANALYSIS section should be the longest part of your response — be exhaustive.`;

    // ── Step 0: Extract global context ──
    setStatus('Extracting context…', 0);

    // Compress plain text if too long (keep first + last parts for context)
    const MAX_CONTEXT_CHARS = 12000;
    let contextInput = plainText;
    if (contextInput.length > MAX_CONTEXT_CHARS) {
      const half = Math.floor(MAX_CONTEXT_CHARS / 2);
      contextInput = contextInput.slice(0, half) + '\n[...]\n' + contextInput.slice(-half);
    }

    const contextResult = await window.api.groqAnalyze({
      systemPrompt: `You are a video content analyst. Read the transcript and provide a brief context overview in ${lang}. Include:
- What is this video about (main topic/purpose)
- Who are the participants/speakers and their roles
- What is the overall narrative arc or agenda
- Key terminology or domain-specific context
Write 3-5 sentences. Be accurate — this context will guide further detailed analysis. Respond in ${lang}.`,
      prompt: contextInput,
    });

    let globalContext = '';
    if (contextResult.success) {
      globalContext = contextResult.text;
    } else {
      // Continue without context if extraction fails
      globalContext = 'Context extraction failed. Analyze based on the transcript content alone.';
    }

    // ── Single chunk: direct analysis with context ──
    if (chunks.length === 1) {
      setStatus('Analyzing…', 0.5);

      const result = await window.api.groqAnalyze({
        systemPrompt: analysisPrompt(globalContext),
        prompt: `Transcript (${fmtDur(duration())} video, range ${fmtShort(tIn)}–${fmtShort(tOut)}):\n\n${fullTranscript}`,
      });

      hideStatus();
      setAnalyzing(false);
      if (!result.success) { showToast('Analysis failed: ' + result.error, 'error'); return; }
      addAnalysisRegion(tIn, tOut, markdownToHtml(result.text));
      setShowAnalysis(true);
      showToast('Semantic analysis complete', 'success');
      return;
    }

    // ── Multi-chunk: context → parallel chunks → synthesis ──
    const totalSteps = chunks.length + 2; // context + chunks + synthesis
    let completedSteps = 1; // context done
    setStatus(`Analyzing chunks: 0/${chunks.length}…`, completedSteps / totalSteps);

    const chunkSystemPrompt = `You are a video content analyst.

CONTEXT OF THE FULL VIDEO: ${globalContext}${userFocus}

Analyze this transcript chunk and provide an EXTREMELY DETAILED description in ${lang}:
- Describe chronologically what is being discussed — every meaningful exchange
- Who says what, the logical flow of dialogue, arguments and counterarguments
- Decisions, conclusions, key details, specific examples mentioned
- Interpret the content accurately within the context of the full video described above
- Write multiple paragraphs, each covering a distinct discussion point
Do NOT include any timestamps — write a pure narrative. Do NOT compress or summarize — describe EVERYTHING that happens. Respond entirely in ${lang}.`;

    // Run chunks in parallel (max 5 concurrent)
    const MAX_CONCURRENT = 5;
    const chunkResults = new Array(chunks.length);

    for (let i = 0; i < chunks.length; i += MAX_CONCURRENT) {
      const batch = chunks.slice(i, i + MAX_CONCURRENT);
      const promises = batch.map((ch, j) => {
        const idx = i + j;
        const text = ch.map(s => `[${fmtShort(s.start)}–${fmtShort(s.end)}] ${s.text.trim()}`).join('\n');
        const rangeLabel = `${fmtShort(ch[0].start)}–${fmtShort(ch[ch.length - 1].end)}`;
        return window.api.groqAnalyze({
          systemPrompt: chunkSystemPrompt,
          prompt: `Chunk ${idx + 1}/${chunks.length} (${rangeLabel}):\n\n${text}`,
        }).then(result => {
          chunkResults[idx] = result;
          completedSteps++;
          setStatus(`Analyzing chunks: ${completedSteps - 1}/${chunks.length}…`, completedSteps / totalSteps);
        });
      });
      await Promise.all(promises);
    }

    // Check for failures
    const failed = chunkResults.filter(r => !r.success);
    if (failed.length === chunkResults.length) {
      hideStatus();
      setAnalyzing(false);
      showToast('Analysis failed: ' + (failed[0]?.error || 'unknown'), 'error');
      return;
    }

    // ── Synthesis step ──
    setStatus('Synthesizing final analysis…', completedSteps / totalSteps);

    const chunkAnalyses = chunkResults.map((r, i) => {
      if (!r.success) return `[Chunk ${i + 1}: analysis failed]`;
      const ch = chunks[i];
      return `--- Chunk ${i + 1} (${fmtShort(ch[0].start)}–${fmtShort(ch[ch.length - 1].end)}) ---\n${r.text}`;
    }).join('\n\n');

    const synthSystemPrompt = `You are a video content analyst.

CONTEXT OF THE FULL VIDEO: ${globalContext}${userFocus}

You receive detailed analyses of consecutive video chunks. Combine them into a single cohesive analysis in ${lang}:
1. #### SUMMARY — Comprehensive summary (at least one full paragraph). Accurately reflect the true topic and narrative.
2. #### DETAILED ANALYSIS — Combine all chunk analyses into one coherent chronological narrative. Preserve ALL details, dialogue points, and logical flow from each chunk. Do NOT compress or remove information — the combined text should be at least as long as the sum of chunk analyses. Write it as a pure narrative without timestamps.
3. #### TOPICS — All topics discussed with time ranges.
4. #### KEY MOMENTS — All important moments with timestamps.
5. #### SUGGESTED CLIPS — Logical clip boundaries with titles.
Format timestamps as MM:SS only in TOPICS, KEY MOMENTS, and SUGGESTED CLIPS sections. Use markdown headers (#### TITLE). Respond entirely in ${lang}. The DETAILED ANALYSIS must be exhaustive — do NOT lose any detail from the chunk analyses.`;

    const synthResult = await window.api.groqAnalyze({
      systemPrompt: synthSystemPrompt,
      prompt: `Full video: ${fmtDur(duration())}, range ${fmtShort(tIn)}–${fmtShort(tOut)}, ${chunks.length} chunks:\n\n${chunkAnalyses}`,
    });

    hideStatus();
    setAnalyzing(false);

    if (!synthResult.success) {
      // Fallback: show concatenated chunk results
      const fallbackHtml = chunkResults.map((r, i) => {
        if (!r.success) return '';
        const ch = chunks[i];
        return `<h4>Chunk ${i + 1} (${fmtShort(ch[0].start)}–${fmtShort(ch[ch.length - 1].end)})</h4>\n${r.text}`;
      }).filter(Boolean).join('\n\n');
      addAnalysisRegion(tIn, tOut, markdownToHtml(fallbackHtml));
      setShowAnalysis(true);
      showToast('Synthesis failed, showing chunk results', 'error');
      return;
    }

    addAnalysisRegion(tIn, tOut, markdownToHtml(synthResult.text));
    setShowAnalysis(true);
    showToast('Semantic analysis complete', 'success');
  }

  // Click handler for analysis body (event delegation for time-refs)
  function onAnalysisClick(e) {
    const tr = e.target.closest('.time-ref');
    if (tr && videoRef) {
      videoRef.currentTime = parseFloat(tr.dataset.time) || 0;
    }
  }

  // ── TTS: parallel section fetch, sequential playback ──
  // ── TTS mini-player system ──
  let ttsCancelled = false;
  const ttsCache = new Map(); // analysisId -> blobUrl (single merged audio)
  const [ttsPlaying, setTtsPlaying] = createSignal(false);
  const [ttsProgress, setTtsProgress] = createSignal(0);
  const [ttsDuration, setTtsDuration] = createSignal(0);
  const [ttsLoading, setTtsLoading] = createSignal(false);
  const [ttsVisible, setTtsVisible] = createSignal(false);

  function stopTts() {
    ttsCancelled = true;
    window.api.stopTtsStream();
    window.api.removeTtsListeners();
    if (currentAudioEl) { currentAudioEl.pause(); currentAudioEl = null; }
    setTtsPlaying(false);
    setTtsLoading(false);
    setSpeaking(false);
  }

  function closeTtsPlayer() {
    stopTts();
    setTtsVisible(false);
  }

  function toggleTtsPlayPause() {
    if (!currentAudioEl) return;
    if (currentAudioEl.paused) {
      currentAudioEl.play();
      setTtsPlaying(true);
    } else {
      currentAudioEl.pause();
      setTtsPlaying(false);
    }
  }

  function seekTts(e) {
    if (!currentAudioEl || !ttsDuration()) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    currentAudioEl.currentTime = pct * ttsDuration();
    setTtsProgress(currentAudioEl.currentTime);
  }

  function skipTts(delta) {
    if (!currentAudioEl) return;
    currentAudioEl.currentTime = Math.max(0, Math.min(ttsDuration(), currentAudioEl.currentTime + delta));
    setTtsProgress(currentAudioEl.currentTime);
  }

  // Start audio element with blob URL, wire up mini-player
  function playFromUrl(url) {
    if (currentAudioEl) { currentAudioEl.pause(); currentAudioEl = null; }
    const audio = new Audio(url);
    currentAudioEl = audio;

    audio.onloadedmetadata = () => setTtsDuration(audio.duration);
    audio.ontimeupdate = () => setTtsProgress(audio.currentTime);
    audio.onended = () => { setTtsPlaying(false); setSpeaking(false); };
    audio.onerror = () => { setTtsPlaying(false); setSpeaking(false); };

    audio.play().then(() => {
      setTtsPlaying(true);
      setSpeaking(true);
      setTtsVisible(true);
      setTtsLoading(false);
    }).catch(() => { setTtsLoading(false); showToast('Playback failed', 'error'); });
  }

  // Strip timestamps
  function stripTimecodes(text) {
    return text
      .replace(/\(?\d{1,2}:\d{2}(?:[–\-]\d{1,2}:\d{2})?\)?/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  // Split analysis HTML into logical sections
  function splitSections(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const sections = [];
    let current = [];
    for (const node of tmp.childNodes) {
      if (node.nodeName === 'H4') {
        if (current.length) sections.push(current.join(' '));
        current = [node.textContent.trim()];
      } else {
        const t = node.textContent?.trim();
        if (t) current.push(t);
      }
    }
    if (current.length) sections.push(current.join(' '));
    const skipHeaders = ['suggested clips', 'предлагаемые клипы', 'clips'];
    return sections
      .filter(s => !skipHeaders.some(h => s.toLowerCase().startsWith(h)))
      .map(s => stripTimecodes(s))
      .filter(s => s.length > 5);
  }

  // Fetch one section audio, returns Promise<ArrayBuffer>
  function fetchSectionAudioBuffer(text) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      const onChunk = (b64) => {
        const bin = atob(b64);
        const buf = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
        chunks.push(buf);
      };
      const onDone = () => {
        window.api.removeTtsListeners();
        if (chunks.length === 0) { reject(new Error('No audio')); return; }
        // Merge all chunks into one buffer
        const total = chunks.reduce((s, c) => s + c.length, 0);
        const merged = new Uint8Array(total);
        let off = 0;
        for (const c of chunks) { merged.set(c, off); off += c.length; }
        resolve(merged);
      };
      const onError = (err) => { window.api.removeTtsListeners(); reject(new Error(err)); };

      window.api.removeTtsListeners();
      window.api.onTtsChunk(onChunk);
      window.api.onTtsDone(onDone);
      window.api.onTtsError(onError);
      window.api.startTtsStream({ text });
    });
  }

  async function speakAnalysis() {
    if (speaking()) { stopTts(); return; }

    const aid = activeAnalysisId();

    // Play from cache
    if (aid && ttsCache.has(aid)) {
      playFromUrl(ttsCache.get(aid));
      return;
    }

    const sections = splitSections(analysisHtml());
    if (!sections.length) { showToast('No analysis text', 'error'); return; }

    setSpeaking(true);
    ttsCancelled = false;
    setTtsLoading(true);
    setTtsVisible(true);
    showToast('Generating speech…');

    // Fetch all sections sequentially (shared IPC), merge into one blob
    const allBuffers = [];
    for (const section of sections) {
      if (ttsCancelled) break;
      try {
        const buf = await fetchSectionAudioBuffer(section);
        allBuffers.push(buf);
      } catch { /* skip failed sections */ }
    }

    if (ttsCancelled || allBuffers.length === 0) {
      setTtsLoading(false);
      if (!ttsCancelled) { setSpeaking(false); setTtsVisible(false); showToast('TTS failed', 'error'); }
      return;
    }

    const mergedBlob = new Blob(allBuffers, { type: 'audio/mpeg' });
    const url = URL.createObjectURL(mergedBlob);

    // Cache
    if (aid) ttsCache.set(aid, url);

    playFromUrl(url);
  }

  // ── Timeline interactions ──
  function onTimelineDown(e) {
    if (!timelineRef) return;
    const rect = timelineRef.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const t = pct * duration();
    rangeAnchor = t;
    rangeStartX = e.clientX;
    // Move playhead immediately (click behavior)
    videoRef.currentTime = t;
    setDragging('pending-range');
  }

  // ── Waveform bars (generated once, static) ──
  function WaveformBars() {
    const bars = Array.from({ length: 200 }, () => 15 + Math.random() * 75);
    return (
      <div class="timeline-waveform">
        <For each={bars}>{h => <div class="waveform-bar" style={{ height: h + '%' }} />}</For>
      </div>
    );
  }

  // ── Ticks ──
  const ticks = createMemo(() => {
    const d = duration();
    if (d <= 0) return [];
    const count = Math.min(10, Math.max(5, Math.floor(d / 5)));
    return Array.from({ length: count + 1 }, (_, i) => fmt((i / count) * d));
  });

  // ── Active transcript segment ──
  const activeSegIndex = createMemo(() => {
    const t = currentTime();
    const segs = transcriptSegments();
    return segs.findIndex(s => t >= s.start && t < s.end);
  });

  return (
    <div style={{ display: 'flex', "flex-direction": 'column', flex: 1, overflow: 'hidden' }}>
      <div class="app-body">
        {/* ─── Sidebar ─── */}
        <div class="sidebar" classList={{ hidden: !sidebarVisible() }}>
          {/* Clips mode */}
          <Show when={sidebarMode() === 'clips'}>
            <div class="sidebar-header">
              <span class="sidebar-title">Clips</span>
              <span class="clip-count">{clips.length}</span>
            </div>
            <div class="sidebar-clips">
              <For each={clips}>{clip =>
                <div class="clip-card" classList={{ active: activeClipId() === clip.id }} onClick={() => handleSelectClip(clip.id)}>
                  <div class="clip-card-top">
                    <span class="clip-card-name">{clip.name}</span>
                    <div class="clip-card-actions">
                      <button class="clip-action-btn export-clip" onClick={e => { e.stopPropagation(); exportClip(clip); }} data-tooltip="Export"><IconExport /></button>
                      <button class="clip-action-btn delete-clip" onClick={e => { e.stopPropagation(); removeClip(clip.id); }} data-tooltip="Remove"><IconX /></button>
                    </div>
                  </div>
                  <div class="clip-card-times">
                    <span class="clip-time in">{fmtShort(clip.inTime)}</span>
                    <span class="clip-arrow">→</span>
                    <span class="clip-time out">{fmtShort(clip.outTime)}</span>
                    <span class="clip-dur">{fmtDur(clip.outTime - clip.inTime)}</span>
                  </div>
                  <div class="clip-minibar">
                    <div class="clip-minibar-fill" style={{
                      left: timeToPct(clip.inTime) + '%',
                      width: (timeToPct(clip.outTime) - timeToPct(clip.inTime)) + '%',
                    }} />
                  </div>
                </div>
              }</For>
            </div>
          </Show>

          {/* Projects mode */}
          <Show when={sidebarMode() === 'projects'}>
            <ProjectsSidebar />
          </Show>

          {/* Transcript mode */}
          <Show when={sidebarMode() === 'transcript'}>
            <div class="sidebar-header">
              <span class="sidebar-title">Transcript</span>
              <span class="clip-count">{transcriptRegions().length}</span>
            </div>
            <div class="sidebar-clips">
              <Show when={transcriptRegions().length > 0} fallback={
                <div style={{ padding: 'var(--sp-4xl) var(--sp-xl)', "text-align": 'center', color: 'var(--text-muted)', "font-size": 'var(--fs-md)' }}>
                  No transcripts yet. Select a region and press the transcribe button.
                </div>
              }>
                <For each={transcriptRegions()}>{region => {
                  const isOpen = () => activeRegionId() === region.id;
                  const toggle = () => {
                    if (isOpen()) setActiveRegionId(null);
                    else selectTranscriptRegion(region.id);
                  };
                  return (
                    <div class="region-spoiler" classList={{ open: isOpen() }}>
                      <div class="region-spoiler-header" onClick={toggle}>
                        <svg class="region-spoiler-arrow" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="9 6 15 12 9 18" />
                        </svg>
                        <span class="region-spoiler-range">{fmtShort(region.inTime)} – {fmtShort(region.outTime)}</span>
                        <span class="region-tab-count">{region.segments.length}</span>
                        <button class="region-tab-delete" onClick={e => { e.stopPropagation(); removeTranscriptRegion(region.id); }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                      </div>
                      <Show when={isOpen()}>
                        <div class="region-spoiler-body">
                          <For each={region.segments}>{(seg, i) =>
                            <div class="transcript-sidebar-seg" classList={{ active: activeSegIndex() === i() }}
                              onClick={() => { if (videoRef) { const t = seg.start + 0.05; videoRef.currentTime = t; setCurrentTime(t); } }}>
                              <span class="transcript-sidebar-time">{fmtShort(seg.start)}</span>
                              <span class="transcript-sidebar-text">{seg.text.trim()}</span>
                            </div>
                          }</For>
                        </div>
                      </Show>
                    </div>
                  );
                }}</For>
              </Show>
            </div>
          </Show>

          {/* Analysis mode */}
          <Show when={sidebarMode() === 'analysis'}>
            <div class="sidebar-header">
              <span class="sidebar-title">Analysis</span>
              <span class="clip-count">{analysisRegions().length}</span>
            </div>
            <div class="sidebar-clips">
              <Show when={analysisRegions().length > 0} fallback={
                <div style={{ padding: 'var(--sp-4xl) var(--sp-xl)', "text-align": 'center', color: 'var(--text-muted)', "font-size": 'var(--fs-md)' }}>
                  No analyses yet. Transcribe and run semantic analysis.
                </div>
              }>
                <For each={analysisRegions()}>{region => {
                  const isOpen = () => activeAnalysisId() === region.id;
                  const toggle = () => {
                    if (isOpen()) setActiveAnalysisId(null);
                    else selectAnalysisRegion(region.id);
                  };
                  return (
                    <div class="region-spoiler" classList={{ open: isOpen() }}>
                      <div class="region-spoiler-header" onClick={toggle}>
                        <svg class="region-spoiler-arrow" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="9 6 15 12 9 18" />
                        </svg>
                        <span class="region-spoiler-range">{fmtShort(region.inTime)} – {fmtShort(region.outTime)}</span>
                        <button class="region-tab-delete" onClick={e => { e.stopPropagation(); removeAnalysisRegion(region.id); ttsCache.delete(region.id); }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                      </div>
                      <Show when={isOpen()}>
                        <div class="region-spoiler-body" style={{ padding: 'var(--sp-sm) var(--sp-lg)' }}>
                          <button class="analysis-sidebar-btn" onClick={() => { selectAnalysisRegion(region.id); setShowAnalysis(true); }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                            Open analysis
                          </button>
                          <button class="analysis-sidebar-btn" onClick={() => { selectAnalysisRegion(region.id); speakAnalysis(); }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></svg>
                            {ttsCache.has(region.id) ? 'Play (cached)' : 'Read aloud'}
                          </button>
                        </div>
                      </Show>
                    </div>
                  );
                }}</For>
              </Show>
            </div>
          </Show>
        </div>

        {/* ─── Main Content ─── */}
        <div class="main-content">
          {/* Video area */}
          <div class="video-area">
            <Show when={!filePath()}>
              <div class="drop-zone" onClick={openFile}
                onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }}
                onDragLeave={e => e.currentTarget.classList.remove('drag-over')}
                onDrop={onDrop}>
                <div class="drop-ring"><div class="drop-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div></div>
                <div class="drop-text">Перетащите видео или <strong>выберите файл</strong></div>
                <div class="drop-hint">MP4 · MKV · AVI · MOV · WEBM</div>
              </div>
            </Show>
            <video ref={videoRef} style={{ display: filePath() ? 'block' : 'none' }}
              onClick={togglePlay} onDblClick={togglePlay}
              onPause={() => setIsPlaying(false)} onPlay={() => setIsPlaying(true)} />
          </div>

          {/* Bottom panel */}
          <Show when={filePath() && duration() > 0}>
            <div class="bottom-panel visible">
              {/* Controls bar */}
              <div class="controls-bar">
                <div class="controls-left">
                  <span class="timecode trim-in">{fmt(trimIn())}</span>
                  <span class="timecode trim-out">{fmt(trimOut())}</span>
                  <span class="duration-badge">{fmtDur(trimDuration())}</span>
                </div>

                <div class="controls-center">
                  <button class="ctrl-btn" onClick={() => videoRef.currentTime = Math.max(trimIn(), videoRef.currentTime - 5)} data-tooltip="−5s">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="11 17 6 12 11 7" /><polyline points="18 17 13 12 18 7" /></svg>
                  </button>
                  <button class="ctrl-btn" onClick={() => videoRef.currentTime = trimIn()} data-tooltip="Go to trim start">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                  </button>
                  <button class="ctrl-btn play-btn" onClick={togglePlay}>
                    <Show when={!isPlaying()} fallback={
                      <svg viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="3" width="4" height="18" rx="1" /><rect x="15" y="3" width="4" height="18" rx="1" /></svg>
                    }>
                      <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3" /></svg>
                    </Show>
                  </button>
                  <button class="ctrl-btn" onClick={() => videoRef.currentTime = trimOut()} data-tooltip="Go to trim end">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                  </button>
                  <button class="ctrl-btn" onClick={() => videoRef.currentTime = Math.min(trimOut(), videoRef.currentTime + 5)} data-tooltip="+5s">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="13 17 18 12 13 7" /><polyline points="6 17 11 12 6 7" /></svg>
                  </button>
                </div>

                <div class="controls-right">
                  <button class="add-clip-btn" onClick={handleAddClip}><IconPlus /> Add Clip</button>
                  <button class="ctrl-btn" classList={{ active: transcribing() }} onClick={handleTranscriptionClick} data-tooltip="Transcribe"><IconText /></button>
                  <Show when={allTranscriptSegments().length > 0}>
                    <button class="ctrl-btn" classList={{ active: analyzing() || showAnalysisPrompt() }} onClick={() => setShowAnalysisPrompt(true)} data-tooltip="Semantic analysis (Groq)"><IconBrain /></button>
                  </Show>
                  <div class="volume-group">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>
                    <input type="range" min="0" max="1" step="0.05" value="1" onInput={e => videoRef.volume = parseFloat(e.target.value)} />
                  </div>
                  <Show when={!filePath()}>
                    <button class="ctrl-btn" onClick={openFile} data-tooltip="Open file"><IconFolder /></button>
                  </Show>
                </div>
              </div>

              {/* Timeline */}
              <div class="timeline-container">
                <div class="timeline-wrap">
                  <div class="timeline" ref={timelineRef} onMouseDown={onTimelineDown}>
                    <WaveformBars />

                    {/* Overlays */}
                    <div class="trim-overlay-left" style={{ width: timeToPct(trimIn()) + '%' }} />
                    <div class="trim-overlay-right" style={{ width: (100 - timeToPct(trimOut())) + '%' }} />

                    {/* Trim region */}
                    <div class="trim-region" style={{
                      left: timeToPct(trimIn()) + '%',
                      width: (timeToPct(trimOut()) - timeToPct(trimIn())) + '%',
                    }} />

                    {/* Playhead */}
                    <div class="playhead" style={{ left: timeToPct(currentTime()) + '%' }} />
                  </div>

                  {/* Handles — outside .timeline to avoid overflow:hidden clipping */}
                  <div class="trim-handle trim-handle-left"
                    classList={{ dragging: dragging() === 'left' }}
                    style={{ left: `calc(${timeToPct(trimIn())}% - ${handleW}px)` }}
                    onMouseDown={e => { e.stopPropagation(); setDragging('left'); }} />
                  <div class="trim-handle trim-handle-right"
                    classList={{ dragging: dragging() === 'right' }}
                    style={{ left: `calc(${timeToPct(trimOut())}% - ${handleW}px)` }}
                    onMouseDown={e => { e.stopPropagation(); setDragging('right'); }} />
                </div>

                <div class="timeline-ticks">
                  <For each={ticks()}>{t => <span class="tick">{t}</span>}</For>
                </div>
              </div>

              {/* Transcript track — always visible */}
              <div class="transcript-track visible">
                <div class="transcript-bar">
                  <For each={allTranscriptSegments()}>{seg => {
                    const left = () => timeToPct(seg.start);
                    const width = () => Math.max(timeToPct(seg.end) - timeToPct(seg.start), 0.5);
                    return (
                      <div class="transcript-segment"
                        style={{ left: left() + '%', width: width() + '%' }}
                        onClick={() => openSegmentModal(seg)}>
                        <span class="transcript-segment-text">{seg.text.trim()}</span>
                      </div>
                    );
                  }}</For>
                </div>
              </div>

              {/* Analysis panel removed — now uses modal */}

            </div>
          </Show>
        </div>
      </div>

      {/* Transcript segment modal */}
      <Show when={modalSegment()}>
        <div class="segment-modal-overlay" onClick={closeSegmentModal}>
          <div class="segment-modal" onClick={e => e.stopPropagation()}>
            <div class="segment-modal-header">
              <span class="segment-modal-time">{fmtShort(modalSegment().start)} – {fmtShort(modalSegment().end)}</span>
              <button class="segment-modal-close" onClick={closeSegmentModal}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div class="segment-modal-body">
              {modalSegment().text.trim()}
            </div>
            <button class="segment-modal-goto" onClick={() => { videoRef.currentTime = modalSegment().start; closeSegmentModal(); }}>
              Go to segment
            </button>
          </div>
        </div>
      </Show>

      {/* Analysis query prompt */}
      <Show when={showAnalysisPrompt()}>
        <div class="segment-modal-overlay" onClick={() => { if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop(); setShowAnalysisPrompt(false); }}>
          <div class="analysis-prompt-modal" onClick={e => e.stopPropagation()}>
            <div class="segment-modal-header">
              <span class="analysis-modal-title"><IconBrain /> Semantic Analysis</span>
              <button class="segment-modal-close" onClick={() => { if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop(); setShowAnalysisPrompt(false); }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div class="analysis-prompt-body">
              <label class="analysis-prompt-label">What aspect interests you? <span style={{ color: 'var(--text-muted)', "font-weight": 'normal' }}>(optional)</span></label>
              <textarea
                class="analysis-prompt-input"
                placeholder="e.g. &quot;Focus on financial decisions and money transfers&quot; or leave empty for a general analysis…"
                value={analysisQuery()}
                onInput={e => setAnalysisQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); setShowAnalysisPrompt(false); runAnalysis(analysisQuery()); } }}
                rows="3"
              />
              <div class="analysis-prompt-actions">
                <button class="analysis-prompt-mic" classList={{ active: voiceRecording() }} onClick={toggleVoiceInput} data-tooltip={voiceRecording() ? 'Stop' : 'Voice input'}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                </button>
                <button class="analysis-prompt-run" onClick={() => { if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop(); setShowAnalysisPrompt(false); runAnalysis(analysisQuery()); }}>
                  <IconBrain /> Run Analysis
                </button>
              </div>
            </div>
          </div>
        </div>
      </Show>

      {/* Analysis modal */}
      <Show when={showAnalysis()}>
        <div class="segment-modal-overlay" onClick={() => setShowAnalysis(false)}>
          <div class="analysis-modal" onClick={e => e.stopPropagation()}>
            <div class="segment-modal-header">
              <span class="analysis-modal-title"><IconBrain /> Semantic Analysis</span>
              <div class="analysis-modal-actions">
                <button class="analysis-speak-btn" classList={{ active: speaking() }} onClick={e => { e.stopPropagation(); speakAnalysis(); }} data-tooltip={speaking() ? 'Stop' : 'Read aloud'}>
                  <Show when={!speaking()} fallback={
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
                  }>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>
                  </Show>
                </button>
                <button class="segment-modal-close" onClick={() => setShowAnalysis(false)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
            </div>
            <div class="analysis-modal-body" innerHTML={analysisHtml()} onClick={onAnalysisClick} />
          </div>
        </div>
      </Show>

      {/* TTS Mini Player */}
      <Show when={ttsVisible()}>
        <div class="tts-player">
          <Show when={ttsLoading()}>
            <div class="tts-player-loading">
              <div class="status-spinner" />
              <span>Generating…</span>
            </div>
          </Show>
          <Show when={!ttsLoading()}>
            <button class="tts-player-btn" onClick={() => skipTts(-5)} data-tooltip="-5s">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="11 17 6 12 11 7" /><polyline points="18 17 13 12 18 7" /></svg>
            </button>
            <button class="tts-player-btn tts-play-btn" onClick={toggleTtsPlayPause}>
              <Show when={!ttsPlaying()} fallback={
                <svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
              }>
                <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3" /></svg>
              </Show>
            </button>
            <button class="tts-player-btn" onClick={() => skipTts(5)} data-tooltip="+5s">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="13 17 18 12 13 7" /><polyline points="6 17 11 12 6 7" /></svg>
            </button>
            <div class="tts-player-track" onMouseDown={seekTts}>
              <div class="tts-player-fill" style={{ width: (ttsDuration() > 0 ? (ttsProgress() / ttsDuration()) * 100 : 0) + '%' }} />
            </div>
            <span class="tts-player-time">{fmtShort(ttsProgress())} / {fmtShort(ttsDuration())}</span>
          </Show>
          <button class="tts-player-btn tts-close-btn" onClick={closeTtsPlayer}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
      </Show>
    </div>
  );
}
