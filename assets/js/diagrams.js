import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
import { el } from './dom.js';
import { openViewer } from './viewer.js';

export async function initDiagrams(root) {
  const diagrams = [...root.querySelectorAll('pre.mermaid')];
  for (const diagram of diagrams) {
    const frame = el('div', { className: 'frame' });
    const button = el('button', { type: 'button', className: 'zoom-hint', textContent: 'Enlarge' });
    const caption = el('figcaption', {}, el('span', { textContent: diagram.dataset.caption || 'Diagram' }), button);
    const figure = el('figure', { className: 'diagram' }, frame, caption);
    diagram.replaceWith(figure);
    frame.append(diagram);
    frame.addEventListener('click', () => openViewer(diagram));
    button.addEventListener('click', () => openViewer(diagram));
  }
  if (diagrams.length === 0) {
    return;
  }

  mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    fontFamily: '"Source Sans 3", sans-serif',
    themeVariables: {
      primaryColor: '#fff3e6',
      primaryBorderColor: '#ff8700',
      primaryTextColor: '#1d1f23',
      lineColor: '#5c6370',
      secondaryColor: '#eef4ff',
      tertiaryColor: '#f6f7f9',
      clusterBkg: '#fafafb',
      clusterBorder: '#d5d8de',
      noteBkgColor: '#fff8d6',
      noteBorderColor: '#e8cf6a',
      actorBkg: '#fff3e6',
      actorBorder: '#ff8700',
      signalColor: '#3b4048',
      signalTextColor: '#1d1f23',
      fontSize: '16px',
    },
  });
  // Mermaid measures labels when rendering, so the web font has to be available first
  await document.fonts.load('400 16px "Source Sans 3"');
  await document.fonts.ready;
  await mermaid.run({ nodes: diagrams });
  for (const diagram of diagrams) {
    diagram.style.visibility = 'visible';
  }
}
