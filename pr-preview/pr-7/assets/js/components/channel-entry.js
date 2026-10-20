import { LitElement, css, html } from 'lit';

/**
 * One channel in "One action, every channel" (_includes/sections/channels.html):
 * the attribute heading, the slot "intro" and the code snippets as content.
 * The hero tiles link to it by its id.
 */
export class ChannelEntry extends LitElement {
  static properties = {
    heading: {},
  };

  static styles = css`
    :host { display: block; }
    .entry {
      display: grid;
      gap: 14px;
      padding: 24px 0;
      border-top: 1px solid var(--border);
    }
    :host(:first-of-type) .entry { border-top: 0; padding-top: 8px; }
    h3 { margin: 0 0 4px; font-size: 1.15em; line-height: 1.4; color: var(--fg); }
    .intro { color: var(--muted); font-size: var(--font-size-text, 17px); line-height: 1.55; max-width: 46em; }
    .code { display: grid; gap: 12px; min-width: 0; }
    ::slotted(code-block) { --code-font-size: 14px; }
  `;

  render() {
    return html`
      <div class="entry">
        <div><h3>${this.heading}</h3><div class="intro"><slot name="intro"></slot></div></div>
        <div class="code"><slot></slot></div>
      </div>
    `;
  }
}

customElements.define('channel-entry', ChannelEntry);
