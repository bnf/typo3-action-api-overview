import { LitElement, css, html, nothing } from 'lit';
import { upgradeCode } from './code-block.js';

/**
 * The stack explorer (_includes/sections/stack.html): the layers of the stack,
 * scenarios that follow a request through them step by step, and a panel
 * with the details of the selected layer or step.
 *
 * Jekyll renders the details as children: one element per layer
 * (data-layer-id, data-name, data-tagline, data-title, data-items as JSON)
 * and one per scenario step (data-scenario, data-scenario-label, data-layer,
 * data-item, data-title). The selected one is shown in the panel.
 */
export class StackExplorer extends LitElement {
  static properties = {
    selection: { state: true },
    playing: { state: true },
  };

  static styles = css`
    :host { display: block; }
    button { font: inherit; color: inherit; }
    .scenarios { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 16px; }
    .scenarios button {
      border: 1px solid var(--border);
      background: var(--surface);
      border-radius: 999px;
      padding: 6px 14px;
      cursor: pointer;
      font-weight: 600;
      font-size: var(--font-size-text, 17px);
    }
    .scenarios button:hover { border-color: var(--accent); }
    .scenarios button[aria-pressed="true"] { background: var(--accent); border-color: var(--accent); color: #1d1f23; }

    .explorer {
      display: grid;
      grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
      gap: 18px;
      align-items: start;
    }
    .stack { display: grid; gap: 8px; }
    .layer {
      position: relative;
      display: grid;
      grid-template-columns: 150px minmax(0, 1fr);
      gap: 12px;
      align-items: center;
      width: 100%;
      margin: 0;
      text-align: left;
      border: 1px solid var(--border);
      background: var(--surface);
      border-radius: 14px;
      padding: 12px 14px;
      cursor: pointer;
      transition: border-color .2s, box-shadow .2s, opacity .2s, transform .2s;
    }
    .layer:hover { border-color: color-mix(in srgb, var(--accent) 60%, var(--border)); }
    .layer:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
    .name strong { display: block; line-height: 1.25; }
    .name small { color: var(--muted); font-size: var(--font-size-small, 15.5px); line-height: 1.3; display: block; }
    .items { display: flex; flex-wrap: wrap; gap: 6px; }
    .item {
      font-size: var(--font-size-small, 15.5px);
      padding: 3px 9px;
      border-radius: 999px;
      background: var(--surface-2);
      border: 1px solid var(--border);
      transition: background .2s, border-color .2s, color .2s;
    }
    .layer.selected { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(255, 135, 0, 0.18); }
    .playing .layer { opacity: .45; }
    .playing .layer.visited { opacity: .8; }
    .playing .layer.current { opacity: 1; border-color: var(--accent); box-shadow: 0 0 0 3px rgba(255, 135, 0, 0.22); transform: scale(1.01); }
    .item.hit { background: var(--accent); border-color: var(--accent); color: #1d1f23; font-weight: 600; }
    .badge {
      position: absolute;
      right: -10px;
      top: -10px;
      min-width: 26px;
      height: 26px;
      border-radius: 999px;
      background: var(--accent);
      color: #1d1f23;
      font-weight: 700;
      font-size: var(--font-size-label, 13px);
      display: grid;
      place-items: center;
      padding: 0 6px;
      box-shadow: var(--shadow);
    }

    .panel {
      position: sticky;
      top: calc(var(--topbar-height, 56px) + 16px);
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      box-shadow: var(--shadow);
      padding: 18px 20px;
      min-height: 300px;
    }
    .kicker {
      font-size: var(--font-size-label, 13px);
      font-weight: 700;
      letter-spacing: .08em;
      text-transform: uppercase;
      color: var(--accent-strong);
    }
    h4 { font-size: 1.2em; margin: 4px 0 8px; line-height: 1.3; }
    .hint { color: var(--muted); font-size: var(--font-size-small, 15.5px); margin: 10px 0 0; }
    .controls { display: flex; align-items: center; gap: 8px; margin-top: 14px; flex-wrap: wrap; }
    .controls button {
      border: 1px solid var(--border);
      background: var(--surface);
      border-radius: 9px;
      padding: 6px 12px;
      cursor: pointer;
      font-weight: 600;
    }
    .controls button:hover:not(:disabled) { border-color: var(--accent); }
    .controls button:disabled { opacity: .4; cursor: default; }
    .controls button.primary { background: var(--accent); border-color: var(--accent); color: #1d1f23; }
    .dots { display: flex; gap: 5px; margin-left: auto; }
    .dots span { width: 8px; height: 8px; border-radius: 999px; background: var(--border); }
    .dots span.on { background: var(--accent); }

    @media (max-width: 1100px) {
      .explorer { grid-template-columns: minmax(0, 1fr); }
      .panel { position: static; min-height: 0; }
    }
    @media (max-width: 960px) {
      .layer { grid-template-columns: minmax(0, 1fr); }
    }
  `;

  constructor() {
    super();
    this.layers = [];
    this.scenarios = [];
    this.selection = null;
    this.playing = false;
  }

  connectedCallback() {
    super.connectedCallback();
    if (this.layers.length === 0) {
      this.readContent();
      this.startScenario(this.scenarios[0]?.id);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.pause();
  }

  readContent() {
    upgradeCode(this);
    for (const node of this.querySelectorAll(':scope > [data-layer-id]')) {
      const { layerId, name, tagline, title, items } = node.dataset;
      this.layers.push({ id: layerId, name, tagline, title, items: JSON.parse(items), node });
    }
    for (const node of this.querySelectorAll(':scope > [data-scenario]')) {
      const { scenario: id, scenarioLabel: label, layer, item, title } = node.dataset;
      let scenario = this.scenarios.find((entry) => entry.id === id);
      if (!scenario) {
        scenario = { id, label, steps: [] };
        this.scenarios.push(scenario);
      }
      scenario.steps.push({ layer, item, title, node });
    }
  }

  get scenario() {
    return this.scenarios.find((entry) => entry.id === this.selection?.scenario);
  }

  render() {
    const scenario = this.scenario;
    const step = scenario?.steps[this.selection.step];
    const layer = this.layers.find((entry) => entry.id === this.selection?.layer);
    return html`
      <div class="scenarios">
        ${this.scenarios.map((entry) => html`
          <button type="button" aria-pressed=${entry.id === scenario?.id ? 'true' : 'false'}
            @click=${() => this.startScenario(entry.id)}>▶ ${entry.label}</button>
        `)}
      </div>
      <div class="explorer">
        <div class="stack ${scenario ? 'playing' : ''}">
          ${this.layers.map((entry) => this.renderLayer(entry, scenario, step))}
        </div>
        <div class="panel" aria-live="polite">
          ${scenario ? html`
            <div class="kicker">${scenario.label} · Step ${this.selection.step + 1} of ${scenario.steps.length}</div>
            <h4>${step.title}</h4>
          ` : html`
            <div class="kicker">Layer</div>
            <h4>${layer?.title}</h4>
          `}
          <slot name="panel"></slot>
          ${scenario ? this.renderControls(scenario) : html`<p class="hint">Select a scenario to follow a request through the stack.</p>`}
        </div>
      </div>
    `;
  }

  renderLayer(layer, scenario, step) {
    const index = scenario ? this.selection.step : -1;
    const current = step?.layer === layer.id;
    const visited = scenario?.steps.slice(0, index).some((entry) => entry.layer === layer.id);
    const classes = ['layer', current ? 'current' : '', visited ? 'visited' : '', this.selection?.layer === layer.id ? 'selected' : ''];
    return html`
      <button type="button" class=${classes.join(' ')} @click=${() => this.showLayer(layer.id)}>
        <span class="name"><strong>${layer.name}</strong><small>${layer.tagline}</small></span>
        <span class="items">
          ${layer.items.map((item) => html`<span class="item ${current && item === step.item ? 'hit' : ''}">${item}</span>`)}
        </span>
        ${current ? html`<span class="badge" aria-hidden="true">${index + 1}</span>` : nothing}
      </button>
    `;
  }

  renderControls(scenario) {
    const index = this.selection.step;
    const last = scenario.steps.length - 1;
    return html`
      <div class="controls">
        <button type="button" ?disabled=${index === 0} @click=${() => this.goTo(index - 1)}>← Back</button>
        <button type="button" class="primary" ?disabled=${index === last} @click=${() => this.goTo(index + 1)}>Next →</button>
        <button type="button" @click=${this.togglePlay}>${this.playing ? 'Pause' : 'Autoplay'}</button>
        <span class="dots" aria-hidden="true">${scenario.steps.map((_, dot) => html`<span class=${dot <= index ? 'on' : ''}></span>`)}</span>
      </div>
    `;
  }

  updated() {
    // Show the details of the selection in the panel
    const scenario = this.scenario;
    const active = scenario
      ? scenario.steps[this.selection.step].node
      : this.layers.find((entry) => entry.id === this.selection?.layer)?.node;
    for (const node of this.children) {
      if (node === active) {
        node.slot = 'panel';
      } else {
        node.removeAttribute('slot');
      }
    }
  }

  showLayer(id) {
    this.pause();
    this.selection = { layer: id };
  }

  startScenario(id) {
    if (!id) {
      return;
    }
    this.pause();
    this.selection = { scenario: id, step: 0 };
  }

  goTo(step) {
    this.selection = { ...this.selection, step };
  }

  togglePlay() {
    if (this.playing) {
      this.pause();
      return;
    }
    const last = this.scenario.steps.length - 1;
    if (this.selection.step === last) {
      this.goTo(0);
    }
    this.playing = true;
    this.timer = setInterval(() => {
      if (this.selection.step >= last - 1) {
        this.pause();
      }
      this.goTo(Math.min(last, this.selection.step + 1));
    }, 3200);
  }

  pause() {
    clearInterval(this.timer);
    this.playing = false;
  }
}

customElements.define('stack-explorer', StackExplorer);
