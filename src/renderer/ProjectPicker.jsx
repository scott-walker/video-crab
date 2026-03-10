import { createSignal, onMount, Show, For } from 'solid-js';
import { projects, loadProjects, createProject, deleteProjectById, openProject, showToast, currentProject, setPage } from './store';

export default function ProjectPicker() {
  const [creating, setCreating] = createSignal(false);
  const [newName, setNewName] = createSignal('');
  const [confirmDelete, setConfirmDelete] = createSignal(null);
  let inputRef;

  onMount(() => loadProjects());

  async function handleCreate() {
    const name = newName().trim();
    if (!name) return;
    const proj = await createProject(name);
    setNewName('');
    setCreating(false);
    openProject(proj);
    showToast(`Project "${name}" created`, 'success');
  }

  function startCreate() {
    setCreating(true);
    setTimeout(() => inputRef?.focus(), 50);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleCreate();
    if (e.key === 'Escape') { setCreating(false); setNewName(''); }
  }

  async function handleDelete(id, name) {
    await deleteProjectById(id);
    setConfirmDelete(null);
    showToast(`"${name}" deleted`, 'success');
  }

  function fmtDate(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  return (
    <div class="project-picker">
      <div class="project-picker-inner">
        {/* Header */}
        <div class="project-picker-header">
          <svg width="48" height="48" viewBox="0 0 64 64" fill="none">
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
          <h1 class="project-picker-title">Video<span class="brand-highlight">Crab</span></h1>
          <p class="project-picker-subtitle">Choose a project or create a new one</p>
        </div>

        {/* Back to editor if a project is already open */}
        <Show when={currentProject()}>
          <button class="project-back-btn" onClick={() => setPage('editor')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to {currentProject().name}
          </button>
        </Show>

        {/* New project */}
        <Show when={!creating()} fallback={
          <div class="project-create-form">
            <input
              ref={inputRef}
              class="project-create-input"
              placeholder="Project name…"
              value={newName()}
              onInput={e => setNewName(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <div class="project-create-actions">
              <button class="project-create-cancel" onClick={() => { setCreating(false); setNewName(''); }}>Cancel</button>
              <button class="project-create-confirm" onClick={handleCreate} disabled={!newName().trim()}>Create</button>
            </div>
          </div>
        }>
          <button class="project-new-btn" onClick={startCreate}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            New Project
          </button>
        </Show>

        {/* Project list */}
        <div class="project-list">
          <For each={projects()}>{proj =>
            <div class="project-card" onClick={() => openProject(proj)}>
              <div class="project-card-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div class="project-card-info">
                <span class="project-card-name">{proj.name}</span>
                <span class="project-card-meta">
                  {proj.clips?.length || 0} clips
                  {proj.transcriptSegments?.length ? ` · ${proj.transcriptSegments.length} segments` : ''}
                  {proj.updatedAt ? ` · ${fmtDate(proj.updatedAt)}` : ''}
                </span>
              </div>
              <Show when={confirmDelete() === proj.id} fallback={
                <button class="project-card-delete" onClick={e => { e.stopPropagation(); setConfirmDelete(proj.id); }} title="Delete">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              }>
                <button class="project-card-delete confirm" onClick={e => { e.stopPropagation(); handleDelete(proj.id, proj.name); }}>
                  Delete?
                </button>
              </Show>
            </div>
          }</For>
          <Show when={projects().length === 0}>
            <div class="project-empty">No projects yet. Create your first one!</div>
          </Show>
        </div>
      </div>
    </div>
  );
}
