import { el } from './dom.js';

// Zoom and pan viewer for screenshots and diagrams
const viewer = document.querySelector('.viewer');
const stage = viewer.querySelector('.stage');
const canvas = viewer.querySelector('.canvas');
let view = { scale: 1, x: 0, y: 0 };
let moved = null;
let placeholder = null;
let saved = {};

const apply = () => {
  canvas.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.scale})`;
};
const fit = () => {
  const box = stage.getBoundingClientRect();
  const top = 72;
  const bottom = 56;
  const scale = Math.min((box.width - 48) / canvas.offsetWidth, (box.height - top - bottom) / canvas.offsetHeight);
  view = {
    scale,
    x: (box.width - canvas.offsetWidth * scale) / 2,
    y: top + (box.height - top - bottom - canvas.offsetHeight * scale) / 2,
  };
  apply();
};
const zoomAt = (factor, clientX, clientY) => {
  const scale = Math.min(Math.max(view.scale * factor, 0.1), 12);
  const real = scale / view.scale;
  view.x = clientX - (clientX - view.x) * real;
  view.y = clientY - (clientY - view.y) * real;
  view.scale = scale;
  apply();
};

export function openViewer(element) {
  canvas.replaceChildren();
  canvas.classList.toggle('image', element.tagName === 'IMG');
  if (element.tagName === 'IMG') {
    const image = new Image();
    image.src = element.currentSrc || element.src;
    image.alt = element.alt;
    image.width = element.naturalWidth;
    image.height = element.naturalHeight;
    canvas.append(image);
  } else {
    const svg = element.querySelector('svg');
    // Move the rendered SVG instead of cloning it, so its scoped styles keep applying
    placeholder = el('div');
    placeholder.style.height = svg.getBoundingClientRect().height + 'px';
    svg.replaceWith(placeholder);
    moved = svg;
    saved = { width: svg.style.width, height: svg.style.height, maxWidth: svg.style.maxWidth };
    const viewBox = svg.viewBox.baseVal;
    svg.style.maxWidth = 'none';
    svg.style.width = viewBox.width + 'px';
    svg.style.height = viewBox.height + 'px';
    canvas.append(svg);
  }
  viewer.classList.add('open');
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(fit);
}

function closeViewer() {
  if (moved) {
    Object.assign(moved.style, saved);
    placeholder.replaceWith(moved);
    moved = null;
    placeholder = null;
  }
  canvas.replaceChildren();
  viewer.classList.remove('open');
  document.body.style.overflow = '';
}

export function initViewer(root) {
  for (const image of root.querySelectorAll('figure.shot img')) {
    image.closest('.frame').addEventListener('click', () => openViewer(image));
  }

  stage.addEventListener('wheel', (event) => {
    event.preventDefault();
    zoomAt(Math.exp(-event.deltaY * 0.0015), event.clientX, event.clientY);
  }, { passive: false });

  const pointers = new Map();
  let pinchDistance = 0;
  stage.addEventListener('pointerdown', (event) => {
    stage.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    stage.classList.add('dragging');
  });
  stage.addEventListener('pointermove', (event) => {
    const previous = pointers.get(event.pointerId);
    if (!previous) {
      return;
    }
    const current = { x: event.clientX, y: event.clientY };
    pointers.set(event.pointerId, current);
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDistance > 0) {
        zoomAt(distance / pinchDistance, (a.x + b.x) / 2, (a.y + b.y) / 2);
      }
      pinchDistance = distance;
      return;
    }
    view.x += current.x - previous.x;
    view.y += current.y - previous.y;
    apply();
  });
  const release = (event) => {
    pointers.delete(event.pointerId);
    pinchDistance = 0;
    if (pointers.size === 0) {
      stage.classList.remove('dragging');
    }
  };
  stage.addEventListener('pointerup', release);
  stage.addEventListener('pointercancel', release);
  stage.addEventListener('dblclick', fit);
  viewer.querySelector('.toolbar').addEventListener('click', (event) => {
    const action = event.target.closest('button')?.dataset.zoom;
    const box = stage.getBoundingClientRect();
    if (action === 'in') zoomAt(1.4, box.width / 2, box.height / 2);
    if (action === 'out') zoomAt(1 / 1.4, box.width / 2, box.height / 2);
    if (action === 'fit') fit();
    if (action === 'close') closeViewer();
  });
  document.addEventListener('keydown', (event) => {
    if (!viewer.classList.contains('open')) {
      return;
    }
    if (event.key === 'Escape') closeViewer();
    if (event.key === '+' || event.key === '=') zoomAt(1.4, innerWidth / 2, innerHeight / 2);
    if (event.key === '-') zoomAt(1 / 1.4, innerWidth / 2, innerHeight / 2);
    if (event.key === '0') fit();
  });
  window.addEventListener('resize', () => {
    if (viewer.classList.contains('open')) {
      fit();
    }
  });
}
