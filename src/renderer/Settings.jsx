import { createSignal, onMount, onCleanup, Show, For } from 'solid-js';
import { setPage, showToast } from './store';

// ── Custom Dropdown ──
function CustomSelect(props) {
  const [open, setOpen] = createSignal(false);
  let ref;

  const currentLabel = () => {
    const opt = props.options.find(o => o.value === props.value);
    return opt ? opt.label : props.value;
  };

  const handleClickOutside = (e) => {
    if (ref && !ref.contains(e.target)) setOpen(false);
  };

  onMount(() => document.addEventListener('mousedown', handleClickOutside));
  onCleanup(() => document.removeEventListener('mousedown', handleClickOutside));

  return (
    <div class="custom-select" ref={ref} classList={{ open: open() }}>
      <button class="custom-select-trigger" onClick={() => setOpen(!open())}>
        <span class="custom-select-value">{currentLabel()}</span>
        <svg class="custom-select-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <Show when={open()}>
        <div class="custom-select-menu">
          <For each={props.options}>{opt =>
            <div
              class="custom-select-option"
              classList={{ active: opt.value === props.value }}
              onClick={() => { props.onChange(opt.value); setOpen(false); }}
            >
              <span>{opt.label}</span>
              <Show when={opt.value === props.value}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </Show>
            </div>
          }</For>
        </div>
      </Show>
    </div>
  );
}

// ── Custom Number Stepper ──
function NumberStepper(props) {
  const val = () => props.value || 0;

  const dec = () => {
    const next = Math.max(props.min ?? 0, val() - (props.step || 1));
    props.onChange(next);
  };
  const inc = () => {
    const next = Math.min(props.max ?? 999, val() + (props.step || 1));
    props.onChange(next);
  };

  return (
    <div class="number-stepper">
      <button class="stepper-btn" onClick={dec} disabled={val() <= (props.min ?? 0)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12" /></svg>
      </button>
      <span class="stepper-value">{val()}</span>
      <button class="stepper-btn" onClick={inc} disabled={val() >= (props.max ?? 999)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
      </button>
    </div>
  );
}

export default function Settings() {
  const [settings, setSettings] = createSignal({});
  const [saved, setSaved] = createSignal(false);

  onMount(async () => {
    const s = await window.api.getSettings();
    setSettings(s);
  });

  const update = (key, value) => {
    const next = { ...settings(), [key]: value };
    setSettings(next);
    window.api.saveSettings(next);
  };

  async function save() {
    await window.api.saveSettings(settings());
    showToast('Settings saved', 'success');
  }

  function ToggleEye(props) {
    return (
      <button class="settings-token-toggle" onClick={() => {
        const el = document.getElementById(props.target);
        el.type = el.type === 'password' ? 'text' : 'password';
      }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
      </button>
    );
  }

  const elevenLabsVoices = [
    { value: '21m00Tcm4TlvDq8ikWAM', label: 'Rachel (female, calm)' },
    { value: 'EXAVITQu4vr4xnSDxMaL', label: 'Sarah (female, soft)' },
    { value: 'AZnzlk1XvdvUeBnXmlld', label: 'Domi (female, confident)' },
    { value: 'MF3mGyEYCl7XYWbV9V6O', label: 'Elli (female, clear)' },
    { value: 'ErXwobaYiN019PkySvjV', label: 'Antoni (male, warm)' },
    { value: '5Q0t7uMcjvnagumLfvZi', label: 'Paul (male, grounded)' },
    { value: '29vD33N1CtxCmqQRPOHJ', label: 'Drew (male, neutral)' },
    { value: '2EiwWnXFnvU5JabPnv8n', label: 'Clyde (male, deep)' },
    { value: 'IKne3meq5aSn9XLyUdCD', label: 'Charlie (male, casual)' },
    { value: 'GBv7mTt0atIp3Br8iCZE', label: 'Thomas (male, British)' },
    { value: 'D38z5RcWu1voky8WS1ja', label: 'Fin (male, Irish)' },
  ];

  const groqModels = [
    { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B (versatile)' },
    { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B (instant)' },
    { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' },
    { value: 'gemma2-9b-it', label: 'Gemma 2 9B' },
  ];

  return (
    <div class="settings-page" style={{ display: 'flex', "flex-direction": 'column', flex: 1 }}>
      <div class="settings-scroll">
        <h1 class="settings-h1">Settings</h1>
        <p class="settings-subtitle">API tokens and model configuration. Stored locally on your machine.</p>

        {/* API Keys */}
        <div class="settings-section">
          <div class="settings-section-title">API Keys</div>

          <div class="settings-field">
            <label class="settings-label">OpenAI API Key</label>
            <div class="settings-input-wrap">
              <input type="password" class="settings-input" id="fOpenai" placeholder="sk-..." value={settings().openaiKey || ''} onInput={e => update('openaiKey', e.target.value)} />
              <ToggleEye target="fOpenai" />
            </div>
            <div class="settings-hint">Used for Whisper API transcription and GPT-4o vision</div>
          </div>

          <div class="settings-field">
            <label class="settings-label">Groq API Key</label>
            <div class="settings-input-wrap">
              <input type="password" class="settings-input" id="fGroq" placeholder="gsk_..." value={settings().groqKey || ''} onInput={e => update('groqKey', e.target.value)} />
              <ToggleEye target="fGroq" />
            </div>
            <div class="settings-hint">Used for semantic analysis of video content</div>
          </div>
        </div>

        {/* Language */}
        <div class="settings-section">
          <div class="settings-section-title">Language</div>
          <div class="settings-field">
            <label class="settings-label">Transcription & Analysis Language</label>
            <CustomSelect
              value={settings().whisperLanguage || 'en'}
              options={[
                { value: 'en', label: 'English' },
                { value: 'ru', label: 'Русский' },
              ]}
              onChange={v => update('whisperLanguage', v)}
            />
          </div>
        </div>

        {/* Vision */}
        <div class="settings-section">
          <div class="settings-section-title">Vision Analysis (OpenAI GPT-4o)</div>
          <div class="settings-field">
            <label class="settings-label">Frame interval (seconds)</label>
            <NumberStepper value={settings().frameInterval || 3} min={1} max={60} step={1} onChange={v => update('frameInterval', v)} />
          </div>
        </div>

        {/* Groq */}
        <div class="settings-section">
          <div class="settings-section-title">Semantic Analysis (Groq)</div>
          <div class="settings-field">
            <label class="settings-label">Model</label>
            <CustomSelect
              value={settings().groqModel || 'llama-3.3-70b-versatile'}
              options={groqModels}
              onChange={v => update('groqModel', v)}
            />
          </div>
        </div>

        {/* ElevenLabs TTS */}
        <div class="settings-section">
          <div class="settings-section-title">Text-to-Speech (ElevenLabs)</div>
          <div class="settings-field">
            <label class="settings-label">API Key</label>
            <div class="settings-input-wrap">
              <input type="password" class="settings-input" id="fElevenLabs" placeholder="sk_..." value={settings().elevenLabsKey || ''} onInput={e => update('elevenLabsKey', e.target.value)} />
              <ToggleEye target="fElevenLabs" />
            </div>
            <div class="settings-hint">ElevenLabs API key for text-to-speech</div>
          </div>
          <div class="settings-field">
            <label class="settings-label">Proxy URL</label>
            <div class="settings-input-wrap">
              <input type="text" class="settings-input" placeholder="https://your-proxy.example.com/tts" value={settings().elevenLabsProxy || ''} onInput={e => update('elevenLabsProxy', e.target.value)} />
            </div>
            <div class="settings-hint">Optional HTTP proxy (e.g. http://user:pass@host:port)</div>
          </div>
          <div class="settings-field">
            <label class="settings-label">Voice</label>
            <CustomSelect
              value={settings().elevenLabsVoice || '21m00Tcm4TlvDq8ikWAM'}
              options={elevenLabsVoices}
              onChange={v => update('elevenLabsVoice', v)}
            />
          </div>
          <div class="settings-field">
            <label class="settings-label">Speech Speed</label>
            <div class="settings-speed-row">
              <input type="range" class="settings-range" min="0.7" max="1.2" step="0.05"
                value={settings().elevenLabsSpeed || 1.0}
                onInput={e => update('elevenLabsSpeed', parseFloat(e.target.value))} />
              <span class="settings-speed-value">{(settings().elevenLabsSpeed || 1.0).toFixed(2)}×</span>
            </div>
            <div class="settings-hint">0.70× (slow) — 1.00× (normal) — 1.20× (fast)</div>
          </div>
        </div>

        <div class="settings-save-bar">
          <span class="settings-saved-msg" classList={{ show: saved() }}>Settings saved</span>
          <button class="settings-save-btn" onClick={save}>Save Settings</button>
        </div>
      </div>
    </div>
  );
}
