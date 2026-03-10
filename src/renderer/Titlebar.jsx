import { Show } from 'solid-js';
import { page, setPage, filePath, videoFileName, statusVisible, statusMessage, statusProgress, sidebarMode, toggleSidebarMode, currentProject } from './store';

export default function Titlebar() {
  return (
    <div class="titlebar">
      <div class="titlebar-brand">
        <svg width="28" height="28" viewBox="0 0 64 64" fill="none">
          <ellipse cx="32" cy="36" rx="16" ry="12" fill="#ff3d8a" opacity="0.9" />
          <circle cx="24" cy="23" r="4.5" fill="#ff3d8a" />
          <circle cx="40" cy="23" r="4.5" fill="#ff3d8a" />
          <circle cx="24" cy="22.5" r="2" fill="#0c0c10" />
          <circle cx="40" cy="22.5" r="2" fill="#0c0c10" />
          <line x1="27" y1="30" x2="25" y2="26" stroke="#e0326f" stroke-width="2.5" stroke-linecap="round" />
          <line x1="37" y1="30" x2="39" y2="26" stroke="#e0326f" stroke-width="2.5" stroke-linecap="round" />
          <path d="M16 33 Q7 26 5 31 Q3 36 11 35 Z" fill="#ff3d8a" opacity="0.8" />
          <path d="M16 39 Q7 46 5 41 Q3 36 11 37 Z" fill="#ff3d8a" opacity="0.8" />
          <path d="M48 33 Q57 26 59 31 Q61 36 53 35 Z" fill="#ff3d8a" opacity="0.8" />
          <path d="M48 39 Q57 46 59 41 Q61 36 53 37 Z" fill="#ff3d8a" opacity="0.8" />
          <line x1="18" y1="41" x2="10" y2="49" stroke="#e0326f" stroke-width="1.8" stroke-linecap="round" />
          <line x1="20" y1="44" x2="13" y2="53" stroke="#e0326f" stroke-width="1.8" stroke-linecap="round" />
          <line x1="46" y1="41" x2="54" y2="49" stroke="#e0326f" stroke-width="1.8" stroke-linecap="round" />
          <line x1="44" y1="44" x2="51" y2="53" stroke="#e0326f" stroke-width="1.8" stroke-linecap="round" />
          <path d="M28 39 Q32 43 36 39" stroke="#0c0c10" stroke-width="1.5" fill="none" stroke-linecap="round" />
        </svg>
        <span class="brand-text">Video<span class="brand-highlight">Crab</span></span>

        <Show when={page() === 'editor'}>
          {/* Clips mode toggle */}
          {/* Projects */}
          <button class="titlebar-btn sidebar-toggle" classList={{ active: sidebarMode() === 'projects' }}
            onClick={() => toggleSidebarMode('projects')} data-tooltip="Projects"
            style={{ '-webkit-app-region': 'no-drag', 'margin-left': 'var(--sp-xl)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </button>
          {/* Clips */}
          <button class="titlebar-btn" classList={{ active: sidebarMode() === 'clips' }}
            onClick={() => toggleSidebarMode('clips')} data-tooltip="Clips"
            style={{ '-webkit-app-region': 'no-drag' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
              <line x1="7" y1="2" x2="7" y2="22" />
              <line x1="17" y1="2" x2="17" y2="22" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <line x1="2" y1="7" x2="7" y2="7" />
              <line x1="2" y1="17" x2="7" y2="17" />
              <line x1="17" y1="7" x2="22" y2="7" />
              <line x1="17" y1="17" x2="22" y2="17" />
            </svg>
          </button>
          {/* Transcript */}
          <button class="titlebar-btn" classList={{ active: sidebarMode() === 'transcript' }}
            onClick={() => toggleSidebarMode('transcript')} data-tooltip="Transcript"
            style={{ '-webkit-app-region': 'no-drag' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="17" y1="10" x2="3" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="14" x2="3" y2="14" /><line x1="17" y1="18" x2="3" y2="18" />
            </svg>
          </button>
          {/* Analysis */}
          <button class="titlebar-btn" classList={{ active: sidebarMode() === 'analysis' }}
            onClick={() => toggleSidebarMode('analysis')} data-tooltip="Analysis"
            style={{ '-webkit-app-region': 'no-drag' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </button>
        </Show>
      </div>

      <div class="titlebar-center">
        <Show when={statusVisible()}>
          <div class="titlebar-status">
            <Show when={statusProgress() < 0}>
              <div class="status-spinner" />
            </Show>
            <span>{statusMessage()}</span>
            <Show when={statusProgress() >= 0}>
              <div class="status-progress-track">
                <div class="status-progress-fill" style={{ width: (statusProgress() * 100) + '%' }} />
              </div>
              <span class="status-progress-pct">{Math.round(statusProgress() * 100)}%</span>
            </Show>
          </div>
        </Show>
        <Show when={!statusVisible() && page() === 'editor' && currentProject()}>
          <div class="titlebar-file">
            <Show when={filePath()}>
              <span class="titlebar-dot" />
              <span>{videoFileName()}</span>
              <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>·</span>
            </Show>
            <span style={{ color: 'var(--text-muted)' }}>{currentProject().name}</span>
          </div>
        </Show>
      </div>

      <div class="titlebar-controls">
        <Show when={page() === 'editor'}>
          <button class="titlebar-btn" onClick={() => { setPage('projects'); }} data-tooltip="All projects" style={{ '-webkit-app-region': 'no-drag' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </button>
        </Show>
        <button class="titlebar-btn" classList={{ active: page() === 'settings' }} onClick={() => setPage(page() === 'settings' ? 'editor' : 'settings')} data-tooltip="Settings" style={{ '-webkit-app-region': 'no-drag' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
        </button>
        <button class="titlebar-btn" onClick={() => window.api.minimize()}>
          <svg width="12" height="12" viewBox="0 0 12 12"><rect y="5" width="12" height="1.5" rx="0.75" fill="currentColor" /></svg>
        </button>
        <button class="titlebar-btn" onClick={() => window.api.maximize()}>
          <svg width="12" height="12" viewBox="0 0 12 12"><rect x="1" y="1" width="10" height="10" rx="1.5" stroke="currentColor" stroke-width="1.5" fill="none" /></svg>
        </button>
        <button class="titlebar-btn close" onClick={() => window.api.close()}>
          <svg width="12" height="12" viewBox="0 0 12 12"><line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /><line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /></svg>
        </button>
      </div>
    </div>
  );
}
