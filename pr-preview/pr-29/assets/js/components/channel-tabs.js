import { LitElement, css, html } from 'lit';

/**
 * "One action, every channel" (_includes/sections/channels.html). Each channel
 * is a child with id, data-label, data-icon and data-summary; its content is
 * the explanation and the code. The tabs are cards that say what each channel
 * shows, so that readers see what they get by clicking; a link below the
 * panel leads to the next channel. A link to the id of a channel (the tiles in
 * the hero) selects it.
 */
export class ChannelTabs extends LitElement {
  static properties = {
    selected: { state: true },
  };

  static styles = css`
    :host { display: block; }
    button { font: inherit; color: inherit; }
    .tablist {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 10px;
    }
    [role="tab"] {
      position: relative;
      display: grid;
      grid-template-columns: 36px minmax(0, 1fr);
      gap: 4px 10px;
      align-content: start;
      margin: 0;
      padding: 12px;
      text-align: left;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      box-shadow: var(--shadow);
      cursor: pointer;
      transition: border-color .15s, background .15s, transform .15s;
    }
    [role="tab"]:hover { border-color: var(--accent); transform: translateY(-2px); }
    [role="tab"]:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
    [role="tab"][aria-selected="true"] { border-color: var(--accent); background: var(--accent-soft); transform: none; }
    /* Notch that connects the selected card with the panel */
    [role="tab"][aria-selected="true"]::after {
      content: "";
      position: absolute;
      left: 50%;
      bottom: -11px;
      width: 14px;
      height: 14px;
      background: var(--surface);
      border-left: 1px solid var(--accent);
      border-top: 1px solid var(--accent);
      transform: translateX(-50%) rotate(45deg);
      z-index: 1;
    }
    .icon {
      grid-row: span 2;
      width: 36px;
      height: 36px;
      border-radius: 10px;
      display: grid;
      place-items: center;
      background: var(--accent-soft);
      color: var(--accent-strong);
      font-size: var(--font-size-label, 13px);
      font-weight: 700;
    }
    [aria-selected="true"] .icon { background: var(--accent); color: #1d1f23; }
    .label { font-weight: 700; line-height: 1.3; }
    .summary { color: var(--muted); font-size: var(--font-size-small, 15.5px); line-height: 1.35; }

    .panel {
      position: relative;
      margin-top: 10px;
      padding: 20px;
      background: var(--surface);
      border: 1px solid var(--accent);
      border-radius: 16px;
      box-shadow: var(--shadow);
    }
    .panel:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
    ::slotted([slot="panel"]) { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; }
    .next {
      display: flex;
      justify-content: flex-end;
      margin-top: 14px;
    }
    .next button {
      border: 1px solid var(--border);
      background: var(--surface);
      border-radius: 999px;
      padding: 6px 14px;
      font-weight: 600;
      cursor: pointer;
    }
    .next button:hover { border-color: var(--accent); }
    .next small { color: var(--muted); font-weight: 400; margin-right: 4px; }
    @media (max-width: 760px) {
      .tablist { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .panel { padding: 14px; }
      [role="tab"][aria-selected="true"]::after { display: none; }
    }
  `;

  constructor() {
    super();
    this.channels = [];
    this.onHashChange = () => this.selectFromHash(true);
  }

  connectedCallback() {
    super.connectedCallback();
    if (this.channels.length === 0) {
      this.channels = [...this.querySelectorAll(':scope > [id]')].map((node) => ({ id: node.id, ...node.dataset, node }));
      this.selected = this.channels[0]?.id;
      this.selectFromHash(false);
    }
    window.addEventListener('hashchange', this.onHashChange);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('hashchange', this.onHashChange);
  }

  // The selected channel is shown in the panel, the others have no box, so
  // the browser cannot scroll to them: scroll to the component instead
  selectFromHash(scroll) {
    const channel = this.channels.find((entry) => `#${entry.id}` === location.hash);
    if (channel) {
      this.selected = channel.id;
      if (scroll) {
        this.updateComplete.then(() => this.scrollIntoView({ block: 'start' }));
      }
    }
  }

  render() {
    const index = this.channels.findIndex((entry) => entry.id === this.selected);
    const next = this.channels[index + 1];
    return html`
      <div class="tablist" role="tablist" aria-label="Channels" @keydown=${this.onKey}>
        ${this.channels.map((channel) => html`
          <button type="button" role="tab" id="tab-${channel.id}" aria-controls="panel"
            aria-selected=${channel.id === this.selected ? 'true' : 'false'} tabindex=${channel.id === this.selected ? '0' : '-1'}
            @click=${() => this.select(channel.id)}>
            <span class="icon" aria-hidden="true">${channel.icon}</span>
            <span class="label">${channel.label}</span>
            <span class="summary">${channel.summary}</span>
          </button>
        `)}
      </div>
      <div class="panel" id="panel" role="tabpanel" aria-labelledby="tab-${this.selected}" tabindex="0">
        <slot name="panel"></slot>
        ${next ? html`
          <div class="next">
            <button type="button" @click=${() => this.select(next.id, true)}><small>Next:</small> ${next.label} →</button>
          </div>
        ` : ''}
      </div>
    `;
  }

  updated() {
    for (const channel of this.channels) {
      if (channel.id === this.selected) {
        channel.node.slot = 'panel';
      } else {
        channel.node.removeAttribute('slot');
      }
    }
  }

  select(id, focus = false) {
    this.selected = id;
    if (focus) {
      this.updateComplete.then(() => this.renderRoot.getElementById(`tab-${id}`)?.focus());
    }
  }

  onKey(event) {
    const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    let index = this.channels.findIndex((entry) => entry.id === this.selected);
    if (event.key in keys) {
      index = (index + keys[event.key] + this.channels.length) % this.channels.length;
    } else if (event.key === 'Home') {
      index = 0;
    } else if (event.key === 'End') {
      index = this.channels.length - 1;
    } else {
      return;
    }
    event.preventDefault();
    this.select(this.channels[index].id, true);
  }
}

customElements.define('channel-tabs', ChannelTabs);
