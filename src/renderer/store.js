import { createSignal, createMemo, batch } from 'solid-js';
import { createStore, produce } from 'solid-js/store';

// ── Page navigation ──
export const [page, setPage] = createSignal('projects'); // 'projects' | 'editor' | 'settings'

// ── Sidebar ──
// mode: 'clips' | 'projects' | 'transcript' | 'analysis' | null (hidden)
export const [sidebarMode, setSidebarMode] = createSignal('clips');
export const sidebarVisible = () => sidebarMode() !== null;

export function toggleSidebarMode(mode) {
  if (sidebarMode() === mode) setSidebarMode(null);
  else setSidebarMode(mode);
}

// ── Projects ──
export const [projects, setProjects] = createSignal([]);
export const [currentProject, setCurrentProject] = createSignal(null);

export async function loadProjects() {
  const list = await window.api.listProjects();
  setProjects(list);
}

export async function createProject(name) {
  const project = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name,
    videoPath: null,
    clips: [],
    transcriptRegions: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await window.api.saveProject(project);
  await loadProjects();
  return project;
}

export async function deleteProjectById(id) {
  await window.api.deleteProject(id);
  await loadProjects();
  if (currentProject()?.id === id) {
    setCurrentProject(null);
    setPage('projects');
  }
}

export async function openProject(project) {
  // Migrate old projects that have transcriptSegments instead of transcriptRegions
  const regions = project.transcriptRegions || [];
  if (!project.transcriptRegions && project.transcriptSegments?.length) {
    regions.push({
      id: 1,
      inTime: 0,
      outTime: 9999,
      segments: project.transcriptSegments,
    });
  }

  const analyses = project.analysisRegions || [];

  batch(() => {
    setCurrentProject(project);
    setFilePath(project.videoPath);
    setVideoFileName(project.videoPath ? project.videoPath.split('/').pop().split('\\').pop() : '');
    setDuration(0);
    setCurrentTime(0);
    setIsPlaying(false);
    setTrimIn(0);
    setTrimOut(0);
    setClips(project.clips || []);
    setActiveClipId(null);
    setTranscriptRegions(regions);
    setActiveRegionId(regions.length > 0 ? regions[regions.length - 1].id : null);
    setAnalysisRegions(analyses);
    setActiveAnalysisId(analyses.length > 0 ? analyses[analyses.length - 1].id : null);
    setShowAnalysis(false);
    clipIdCounter = project.clips?.length ? Math.max(...project.clips.map(c => c.id)) : 0;
    regionIdCounter = regions.length ? Math.max(...regions.map(r => r.id)) : 0;
    analysisIdCounter = analyses.length ? Math.max(...analyses.map(a => a.id)) : 0;
    setPage('editor');
    setSidebarMode(null);
  });
}

export async function saveCurrentProject() {
  const proj = currentProject();
  if (!proj) return;
  const updated = {
    ...proj,
    videoPath: filePath(),
    clips: [...clips],
    transcriptRegions: transcriptRegions(),
    analysisRegions: analysisRegions(),
  };
  await window.api.saveProject(updated);
  setCurrentProject(updated);
}

// Auto-save debounce
let autoSaveTimer = null;
export function scheduleAutoSave() {
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => saveCurrentProject(), 1000);
}

// ── Video state ──
export const [filePath, setFilePath] = createSignal(null);
export const [videoFileName, setVideoFileName] = createSignal('');
export const [duration, setDuration] = createSignal(0);
export const [currentTime, setCurrentTime] = createSignal(0);
export const [isPlaying, setIsPlaying] = createSignal(false);

// ── Trim state ──
export const [trimIn, setTrimIn] = createSignal(0);
export const [trimOut, setTrimOut] = createSignal(0);
export const trimDuration = createMemo(() => trimOut() - trimIn());

// ── Clips ──
let clipIdCounter = 0;
export const [clips, setClips] = createStore([]);
export const [activeClipId, setActiveClipId] = createSignal(null);

export function addClip() {
  if (!filePath() || trimIn() >= trimOut()) return null;
  const id = ++clipIdCounter;
  setClips(produce(c => c.push({ id, inTime: trimIn(), outTime: trimOut(), name: `Clip ${id}` })));
  setActiveClipId(id);
  scheduleAutoSave();
  return id;
}

export function removeClip(id) {
  setClips(c => c.filter(x => x.id !== id));
  if (activeClipId() === id) setActiveClipId(null);
  scheduleAutoSave();
}

export function selectClip(id) {
  const clip = clips.find(c => c.id === id);
  if (!clip) return;
  batch(() => {
    setActiveClipId(id);
    setTrimIn(clip.inTime);
    setTrimOut(clip.outTime);
  });
  return clip;
}

// ── Transcript regions ──
let regionIdCounter = 0;
export const [transcriptRegions, setTranscriptRegions] = createSignal([]);
export const [activeRegionId, setActiveRegionId] = createSignal(null);

export const activeRegion = createMemo(() => {
  const id = activeRegionId();
  return transcriptRegions().find(r => r.id === id) || null;
});

// Segments for the active region
export const transcriptSegments = createMemo(() => {
  const r = activeRegion();
  return r ? r.segments : [];
});

// All segments from all regions (for timeline display)
export const allTranscriptSegments = createMemo(() => {
  return transcriptRegions().flatMap(r => r.segments);
});

export function addTranscriptRegion(inTime, outTime, segments) {
  const id = ++regionIdCounter;
  const region = { id, inTime, outTime, segments };
  setTranscriptRegions(prev => [...prev, region]);
  setActiveRegionId(id);
  scheduleAutoSave();
  return region;
}

export function removeTranscriptRegion(id) {
  setTranscriptRegions(prev => prev.filter(r => r.id !== id));
  if (activeRegionId() === id) {
    const remaining = transcriptRegions();
    setActiveRegionId(remaining.length > 0 ? remaining[remaining.length - 1].id : null);
  }
  scheduleAutoSave();
}

export function selectTranscriptRegion(id) {
  const region = transcriptRegions().find(r => r.id === id);
  if (!region) return;
  batch(() => {
    setActiveRegionId(id);
    setTrimIn(region.inTime);
    setTrimOut(region.outTime);
  });
  // Clamp video playhead into the new region
  if (videoEl) {
    const t = videoEl.currentTime;
    if (t < region.inTime) videoEl.currentTime = region.inTime;
    else if (t > region.outTime) videoEl.currentTime = region.outTime;
  }
  return region;
}

// ── Analysis regions ──
let analysisIdCounter = 0;
export const [analysisRegions, setAnalysisRegions] = createSignal([]);
export const [activeAnalysisId, setActiveAnalysisId] = createSignal(null);
export const [showAnalysis, setShowAnalysis] = createSignal(false);

export const activeAnalysis = createMemo(() => {
  const id = activeAnalysisId();
  return analysisRegions().find(a => a.id === id) || null;
});

// Derived: html of the active analysis (for modal)
export const analysisHtml = createMemo(() => {
  const a = activeAnalysis();
  return a ? a.html : '';
});

export function addAnalysisRegion(inTime, outTime, html) {
  const id = ++analysisIdCounter;
  const region = { id, inTime, outTime, html };
  setAnalysisRegions(prev => [...prev, region]);
  setActiveAnalysisId(id);
  scheduleAutoSave();
  return region;
}

export function removeAnalysisRegion(id) {
  setAnalysisRegions(prev => prev.filter(a => a.id !== id));
  if (activeAnalysisId() === id) {
    const remaining = analysisRegions();
    setActiveAnalysisId(remaining.length > 0 ? remaining[remaining.length - 1].id : null);
  }
  scheduleAutoSave();
}

export function selectAnalysisRegion(id) {
  const region = analysisRegions().find(a => a.id === id);
  if (!region) return;
  batch(() => {
    setActiveAnalysisId(id);
    setTrimIn(region.inTime);
    setTrimOut(region.outTime);
  });
  if (videoEl) {
    const t = videoEl.currentTime;
    if (t < region.inTime) videoEl.currentTime = region.inTime;
    else if (t > region.outTime) videoEl.currentTime = region.outTime;
  }
  return region;
}

// ── Status ──
export const [statusMessage, setStatusMessage] = createSignal('');
export const [statusVisible, setStatusVisible] = createSignal(false);
export const [statusProgress, setStatusProgress] = createSignal(-1); // -1 = indeterminate, 0–1 = progress

export function setStatus(msg, progress) {
  setStatusMessage(msg);
  setStatusProgress(progress !== undefined ? progress : -1);
  setStatusVisible(true);
}
export function hideStatus() {
  setStatusVisible(false);
  setStatusProgress(-1);
}

// ── Toast ──
export const [toastMessage, setToastMessage] = createSignal('');
export const [toastType, setToastType] = createSignal('');
export const [toastVisible, setToastVisible] = createSignal(false);
let toastTimer = null;

export function showToast(msg, type = '') {
  clearTimeout(toastTimer);
  batch(() => {
    setToastMessage(msg);
    setToastType(type);
    setToastVisible(true);
  });
  toastTimer = setTimeout(() => setToastVisible(false), 2500);
}

// ── Video element ref (shared across components) ──
export let videoEl = null;
export function setVideoEl(el) { videoEl = el; }

// ── Reset on new file ──
export function resetForNewFile(path) {
  const name = path.split('/').pop().split('\\').pop();
  batch(() => {
    setFilePath(path);
    setVideoFileName(name);
    setClips([]);
    setActiveClipId(null);
    setTranscriptRegions([]);
    setActiveRegionId(null);
    setAnalysisRegions([]);
    setActiveAnalysisId(null);
    setShowAnalysis(false);
    clipIdCounter = 0;
    regionIdCounter = 0;
    analysisIdCounter = 0;
  });
  scheduleAutoSave();
}
