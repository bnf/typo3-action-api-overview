import { el } from './dom.js';

// Rouge on GitHub Pages predates PHP attributes and highlights `#[…]` as a comment
export function fixPhpAttributes(root) {
  for (const comment of root.querySelectorAll('.language-php .c1')) {
    if (comment.textContent.startsWith('#[')) {
      comment.className = 'nd';
    }
  }
}

export function initCopyButtons(root) {
  for (const wrap of root.querySelectorAll('.code-wrap')) {
    const button = el('button', { type: 'button', className: 'copy', textContent: 'Copy' });
    button.addEventListener('click', async () => {
      const pre = wrap.querySelector('pre').cloneNode(true);
      pre.querySelectorAll('.mark-badge').forEach((badge) => badge.remove());
      await navigator.clipboard.writeText(pre.textContent.trim());
      button.textContent = 'Copied';
      setTimeout(() => { button.textContent = 'Copy'; }, 1500);
    });
    wrap.append(button);
  }
}

const selectTab = (tabs, id) => {
  for (const button of tabs.querySelectorAll('[role="tab"]')) {
    const selected = button.dataset.tab === id;
    button.setAttribute('aria-selected', String(selected));
    tabs.querySelector('#' + button.getAttribute('aria-controls')).hidden = !selected;
  }
};

export function initTabs(root) {
  for (const tabs of root.querySelectorAll('.tabs')) {
    tabs.querySelector('.tablist').addEventListener('click', (event) => {
      const button = event.target.closest('[role="tab"]');
      if (button) {
        selectTab(tabs, button.dataset.tab);
      }
    });
  }
  for (const channel of root.querySelectorAll('[data-show-tab]')) {
    channel.addEventListener('click', () => {
      const tabs = document.getElementById('channel-tabs');
      selectTab(tabs, channel.dataset.showTab);
      tabs.scrollIntoView({ block: 'start' });
    });
  }
}

// Wraps the characters [start, end) of the text below root, which may span several highlighted tokens
function wrapRange(root, start, end, ref) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const pieces = [];
  let offset = 0;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const length = node.textContent.length;
    const from = Math.max(start, offset);
    const to = Math.min(end, offset + length);
    if (from < to) {
      pieces.push({ node, from: from - offset, to: to - offset });
    }
    offset += length;
  }
  let last = null;
  for (const { node, from, to } of pieces) {
    const range = document.createRange();
    range.setStart(node, from);
    range.setEnd(node, to);
    const mark = el('span', { className: 'mark' });
    mark.dataset.ref = ref;
    range.surroundContents(mark);
    last = mark;
  }
  last?.append(el('span', { className: 'mark-badge', textContent: ref }));
}

export function initAnatomy(root, parts) {
  const anatomy = root.querySelector('.anatomy');
  if (!anatomy || !parts) {
    return;
  }
  const code = anatomy.querySelector('pre code') || anatomy.querySelector('pre');
  // Wrap from the end so earlier offsets stay valid
  const located = parts
    .map((part) => ({ ref: String(part.ref), start: code.textContent.indexOf(part.match), length: part.match.length }))
    .filter((part) => part.start >= 0)
    .sort((a, b) => b.start - a.start);
  for (const part of located) {
    wrapRange(code, part.start, part.start + part.length, part.ref);
  }

  const highlight = (ref) => {
    for (const node of anatomy.querySelectorAll('[data-ref]')) {
      node.classList.toggle('on', node.dataset.ref === ref);
    }
  };
  const onEvent = (event) => {
    const target = event.target.closest('[data-ref]');
    if (target) {
      highlight(target.dataset.ref);
    }
  };
  anatomy.addEventListener('mouseover', onEvent);
  anatomy.addEventListener('click', onEvent);
  highlight('1');
}
