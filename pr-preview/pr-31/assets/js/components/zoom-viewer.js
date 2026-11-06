import { LitElement, css, html } from 'lit';

/**
 * Full-screen viewer to zoom and pan screenshots and diagrams, a modal
 * <dialog>. There is one in _layouts/default.html; components open it with
 * ZoomViewer.open(node), where node is a copy of the image or SVG to show.
 */
export class ZoomViewer extends LitElement {
  static styles = css`
    dialog {
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100vh;
      max-width: none;
      max-height: none;
      margin: 0;
      padding: 0;
      border: 0;
      background: transparent;
      overflow: hidden;
    }
    dialog::backdrop { background: rgba(10, 12, 15, 0.85); backdrop-filter: blur(4px); }
    .stage { position: absolute; inset: 0; overflow: hidden; cursor: grab; touch-action: none; }
    .stage.dragging { cursor: grabbing; }
    .canvas {
      position: absolute;
      top: 0;
      left: 0;
      transform-origin: 0 0;
      background: var(--surface);
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
    }
    .canvas.image { padding: 0; overflow: hidden; background: #fff; }
    .canvas > * { display: block; max-width: none; }
    .toolbar { position: absolute; top: 16px; right: 16px; display: flex; gap: 6px; z-index: 1; }
    .toolbar button {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.18);
      background: rgba(30, 34, 40, 0.9);
      color: #fff;
      font: 18px/1 "Source Sans 3", sans-serif;
      cursor: pointer;
    }
    .toolbar button:hover, .toolbar button:focus-visible { background: var(--accent-strong); border-color: var(--accent-strong); outline: none; }
    .help {
      position: absolute;
      bottom: 16px;
      left: 50%;
      transform: translateX(-50%);
      color: #c9ced6;
      font: var(--font-size-small, 15.5px) "Source Sans 3", sans-serif;
      background: rgba(30, 34, 40, 0.8);
      padding: 6px 14px;
      border-radius: 999px;
      white-space: nowrap;
    }
    @media (max-width: 960px) {
      .help { display: none; }
    }
  `;

  static open(node) {
    document.querySelector('zoom-viewer')?.show(node);
  }

  constructor() {
    super();
    this.view = { scale: 1, x: 0, y: 0 };
    this.pointers = new Map();
    this.pinchDistance = 0;
    this.onResize = () => {
      if (this.dialog?.open) {
        this.fit();
      }
    };
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('resize', this.onResize);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('resize', this.onResize);
  }

  render() {
    return html`
      <dialog aria-label="Zoomed view" @keydown=${this.onKey} @close=${this.onClose}>
        <div class="stage" @wheel=${this.onWheel} @pointerdown=${this.onPointerDown} @pointermove=${this.onPointerMove}
          @pointerup=${this.onPointerUp} @pointercancel=${this.onPointerUp} @dblclick=${this.fit}>
          <div class="canvas"></div>
        </div>
        <div class="toolbar">
          <button type="button" title="Zoom in" aria-label="Zoom in" @click=${() => this.zoomCentered(1.4)}>+</button>
          <button type="button" title="Zoom out" aria-label="Zoom out" @click=${() => this.zoomCentered(1 / 1.4)}>−</button>
          <button type="button" title="Fit to screen" aria-label="Fit to screen" @click=${this.fit}>⤢</button>
          <button type="button" title="Close (Esc)" aria-label="Close" @click=${() => this.dialog.close()}>✕</button>
        </div>
        <div class="help">Scroll or pinch to zoom · drag to move · double-click to fit · Esc to close</div>
      </dialog>
    `;
  }

  get dialog() {
    return this.renderRoot?.querySelector('dialog');
  }

  get canvas() {
    return this.renderRoot.querySelector('.canvas');
  }

  async show(node) {
    await this.updateComplete;
    this.canvas.replaceChildren(node);
    this.canvas.classList.toggle('image', node.tagName === 'IMG');
    this.dialog.showModal();
    document.body.style.overflow = 'hidden';
    if (node.tagName === 'IMG' && !node.complete) {
      await new Promise((resolve) => { node.onload = resolve; node.onerror = resolve; });
    }
    requestAnimationFrame(() => this.fit());
  }

  onClose() {
    this.canvas.replaceChildren();
    document.body.style.overflow = '';
  }

  apply() {
    this.canvas.style.transform = `translate(${this.view.x}px, ${this.view.y}px) scale(${this.view.scale})`;
  }

  fit() {
    const canvas = this.canvas;
    const top = 72;
    const bottom = 56;
    const scale = Math.min((innerWidth - 48) / canvas.offsetWidth, (innerHeight - top - bottom) / canvas.offsetHeight);
    this.view = {
      scale,
      x: (innerWidth - canvas.offsetWidth * scale) / 2,
      y: top + (innerHeight - top - bottom - canvas.offsetHeight * scale) / 2,
    };
    this.apply();
  }

  zoomAt(factor, clientX, clientY) {
    const scale = Math.min(Math.max(this.view.scale * factor, 0.1), 12);
    const real = scale / this.view.scale;
    this.view.x = clientX - (clientX - this.view.x) * real;
    this.view.y = clientY - (clientY - this.view.y) * real;
    this.view.scale = scale;
    this.apply();
  }

  zoomCentered(factor) {
    this.zoomAt(factor, innerWidth / 2, innerHeight / 2);
  }

  onKey(event) {
    if (event.key === '+' || event.key === '=') this.zoomCentered(1.4);
    if (event.key === '-') this.zoomCentered(1 / 1.4);
    if (event.key === '0') this.fit();
  }

  onWheel(event) {
    event.preventDefault();
    this.zoomAt(Math.exp(-event.deltaY * 0.0015), event.clientX, event.clientY);
  }

  onPointerDown(event) {
    event.currentTarget.setPointerCapture(event.pointerId);
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    event.currentTarget.classList.add('dragging');
  }

  onPointerMove(event) {
    const previous = this.pointers.get(event.pointerId);
    if (!previous) {
      return;
    }
    const current = { x: event.clientX, y: event.clientY };
    this.pointers.set(event.pointerId, current);
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (this.pinchDistance > 0) {
        this.zoomAt(distance / this.pinchDistance, (a.x + b.x) / 2, (a.y + b.y) / 2);
      }
      this.pinchDistance = distance;
      return;
    }
    this.view.x += current.x - previous.x;
    this.view.y += current.y - previous.y;
    this.apply();
  }

  onPointerUp(event) {
    this.pointers.delete(event.pointerId);
    this.pinchDistance = 0;
    if (this.pointers.size === 0) {
      event.currentTarget.classList.remove('dragging');
    }
  }
}

customElements.define('zoom-viewer', ZoomViewer);
