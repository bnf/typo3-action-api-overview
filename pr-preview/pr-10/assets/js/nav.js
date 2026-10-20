import { el } from './dom.js';

export function initNavigation(content) {
  const navList = document.querySelector('.sidebar ol');
  const navLinks = [];
  let chapter = 0;
  for (const heading of content.querySelectorAll('h2[id], h3[id]')) {
    heading.prepend(el('a', { className: 'anchor', href: '#' + heading.id, textContent: '#', ariaHidden: 'true' }));
    const link = el('a', { href: '#' + heading.id });
    const item = el('li', {}, link);
    if (heading.tagName === 'H2') {
      chapter++;
      link.append(el('span', { className: 'num', textContent: String(chapter).padStart(2, '0') }));
    } else {
      item.className = 'sub';
    }
    link.append(heading.textContent.replace(/^#/, ''));
    navList.append(item);
    navLinks.push({ heading, link });
  }

  const setActive = () => {
    let current = navLinks[0];
    for (const entry of navLinks) {
      if (entry.heading.getBoundingClientRect().top < 160) {
        current = entry;
      }
    }
    for (const entry of navLinks) {
      entry.link.classList.toggle('active', entry === current);
    }
  };
  document.addEventListener('scroll', setActive, { passive: true });
  setActive();

  const toggle = document.querySelector('.menu-toggle');
  toggle.addEventListener('click', () => {
    toggle.setAttribute('aria-expanded', String(document.body.classList.toggle('nav-open')));
  });
  navList.addEventListener('click', (event) => {
    if (event.target.closest('a')) {
      document.body.classList.remove('nav-open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
}
