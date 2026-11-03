import { LitElement, css, html } from 'lit';
import { ZoomViewer } from './zoom-viewer.js';

/**
 * A screenshot from _data/screenshots.json in a stylized window frame
 * (_includes/screenshot.html). Attributes: window (title bar), heading,
 * featured (larger backdrop, caption beside the image on wide screens),
 * compact (small frame in a gallery, caption beside the image on narrow
 * screens). The <img slot="image"> is the screenshot, the
 * remaining content is the caption. A click opens the zoom viewer.
 * --shot-height crops the image to a fixed height, from the top.
 */
export class ScreenShot extends LitElement {
  static properties = {
    window: {},
    heading: {},
    featured: { type: Boolean, reflect: true },
    compact: { type: Boolean, reflect: true },
  };

  static styles = css`
    :host { display: block; }
    figure {
      height: 100%;
      margin: 0;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius, 14px);
      box-shadow: var(--shadow);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .backdrop {
      padding: 22px 22px 0;
      background:
        radial-gradient(120% 90% at 0% 0%, rgba(255, 135, 0, 0.22), transparent 60%),
        radial-gradient(120% 90% at 100% 100%, rgba(37, 87, 214, 0.18), transparent 60%),
        var(--surface-2);
    }
    :host([featured]) .backdrop { padding: 32px 48px 0; }
    .window {
      border-radius: 10px 10px 0 0;
      overflow: hidden;
      background: #fff;
      box-shadow: 0 10px 30px rgba(16, 24, 40, 0.18), 0 0 0 1px rgba(16, 24, 40, 0.08);
    }
    .titlebar {
      display: flex;
      align-items: center;
      gap: 10px;
      height: 30px;
      padding: 0 12px;
      background: #eceef1;
      border-bottom: 1px solid #dde0e5;
      font: var(--font-size-label, 13px) "Source Sans 3", sans-serif;
      color: #5c6370;
    }
    .lights { display: flex; gap: 6px; }
    .lights i { width: 10px; height: 10px; border-radius: 999px; }
    .lights i:nth-child(1) { background: #ff5f57; }
    .lights i:nth-child(2) { background: #febc2e; }
    .lights i:nth-child(3) { background: #28c840; }
    .title { flex: 1; text-align: center; margin-right: 46px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .frame {
      display: block;
      width: 100%;
      height: var(--shot-height, auto);
      max-height: var(--shot-max-height, none);
      margin: 0;
      padding: 0;
      border: 0;
      background: #fff;
      overflow: hidden;
      cursor: zoom-in;
    }
    .frame:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
    ::slotted(img) {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: top;
      transition: transform .35s ease;
    }
    figure:hover ::slotted(img) { transform: scale(1.015); }
    figcaption {
      flex: 1;
      padding: 12px 16px;
      font-size: var(--font-size-small, 15.5px);
      line-height: 1.5;
      color: var(--muted);
      border-top: 1px solid var(--border);
    }
    strong { color: var(--fg); display: block; }

    :host([compact]) .backdrop { padding: 12px 12px 0; }
    :host([compact]) .titlebar { height: 22px; gap: 6px; padding: 0 8px; }
    :host([compact]) .lights { gap: 4px; }
    :host([compact]) .lights i { width: 7px; height: 7px; }
    :host([compact]) .title { margin-right: 33px; }
    :host([compact]) figcaption { padding: 10px 14px; }

    /* The caption beside the image: a screenshot takes less height */
    @media (min-width: 900px) {
      :host([featured]) figure { flex-direction: row; }
      :host([featured]) .backdrop { flex: 0 0 68%; display: flex; align-items: flex-end; padding: 24px 28px 0; }
      :host([featured]) .window { flex: 1; }
      :host([featured]) figcaption { border-top: 0; border-left: 1px solid var(--border); padding: 20px 22px; }
    }
    @media (max-width: 640px) {
      :host([compact]) figure { flex-direction: row; }
      :host([compact]) .backdrop { flex: 0 0 40%; display: flex; padding: 8px 8px 0; }
      :host([compact]) .window { flex: 1; display: flex; flex-direction: column; }
      /* The image fills the height of the caption beside it */
      :host([compact]) .frame { flex: 1; position: relative; height: auto; min-height: var(--shot-height, 104px); }
      :host([compact]) ::slotted(img) { position: absolute; inset: 0; }
      :host([compact]) .titlebar { display: none; }
      :host([compact]) figcaption { border-top: 0; border-left: 1px solid var(--border); padding: 10px 12px; }
    }
  `;

  render() {
    return html`
      <figure>
        <div class="backdrop">
          <div class="window">
            <div class="titlebar" aria-hidden="true"><span class="lights"><i></i><i></i><i></i></span><span class="title">${this.window}</span></div>
            <button type="button" class="frame" aria-label="Enlarge the screenshot ${this.heading}" @click=${this.zoom}><slot name="image"></slot></button>
          </div>
        </div>
        <figcaption><strong>${this.heading}</strong><slot></slot></figcaption>
      </figure>
    `;
  }

  zoom() {
    const source = this.querySelector(':scope > img');
    const image = new Image();
    image.src = source.currentSrc || source.src;
    image.alt = source.alt;
    if (source.naturalWidth) {
      image.width = source.naturalWidth;
      image.height = source.naturalHeight;
    }
    ZoomViewer.open(image);
  }
}

customElements.define('screen-shot', ScreenShot);
