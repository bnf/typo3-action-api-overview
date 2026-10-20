import { el } from './dom.js';

// Mirrors ScopeInterface::allowedForUser() of the scopes shipped with TYPO3, see _data/security.json
const allowedFor = {
  everyone: () => true,
  dashboard_access: (user) => user.dashboard_access,
  admin: (user) => user.admin,
};

export function initCalculator(root, data) {
  const calc = root.querySelector('.calc');
  if (!calc || !data) {
    return;
  }
  const state = {
    user: data.users.find((user) => user.id === data.defaults.user),
    requested: new Set(data.defaults.requested),
    configured: new Set(data.defaults.configured),
  };
  const userBar = calc.querySelector('.users');
  const tbody = calc.querySelector('tbody');
  const list = calc.querySelector('.actions-list');

  for (const user of data.users) {
    const button = el('button', { type: 'button', textContent: user.label });
    button.dataset.user = user.id;
    button.addEventListener('click', () => {
      state.user = user;
      update();
    });
    userBar.append(button);
  }

  const toggleButton = (set, id) => {
    const on = set.has(id);
    const button = el('button', { type: 'button', className: 'toggle ' + (on ? 'yes' : 'no'), textContent: on ? '✓' : '✕', title: 'Click to toggle' });
    button.addEventListener('click', () => {
      on ? set.delete(id) : set.add(id);
      update();
    });
    return button;
  };

  function update() {
    for (const button of userBar.querySelectorAll('button')) {
      button.setAttribute('aria-pressed', String(button.dataset.user === state.user.id));
    }
    const granted = new Set();
    tbody.replaceChildren();
    for (const scope of data.scopes) {
      const allowed = allowedFor[scope.allowed_for](state.user);
      const ok = state.requested.has(scope.id) && state.configured.has(scope.id) && allowed;
      if (ok) {
        granted.add(scope.id);
      }
      tbody.append(el('tr', {},
        el('td', {}, el('code', { textContent: scope.id }), el('small', { textContent: scope.name })),
        el('td', {}, toggleButton(state.requested, scope.id)),
        el('td', { className: 'op', textContent: '∩' }),
        el('td', {}, toggleButton(state.configured, scope.id)),
        el('td', { className: 'op', textContent: '∩' }),
        el('td', {}, el('span', { className: 'state ' + (allowed ? 'yes' : 'no'), textContent: allowed ? '✓' : '✕' })),
        el('td', { className: 'op', textContent: '=' }),
        el('td', {}, el('span', { className: 'result ' + (ok ? 'yes' : 'no'), textContent: ok ? 'granted' : 'not granted' })),
      ));
    }
    list.replaceChildren();
    for (const action of data.actions) {
      const missing = action.scopes.filter((scope) => !granted.has(scope));
      const allowed = missing.length === 0;
      list.append(el('div', { className: 'action-row ' + (allowed ? 'allowed' : 'denied') },
        el('span', { className: 'verb' + (action.method === 'GET' ? '' : ' write'), textContent: action.method }),
        el('span', { className: 'label' }, action.name, el('small', { textContent: allowed ? action.path : 'missing ' + missing.join(', ') })),
        el('span', { className: 'mark-ok', textContent: allowed ? '✓' : '✕' }),
      ));
    }
  }
  update();
}
