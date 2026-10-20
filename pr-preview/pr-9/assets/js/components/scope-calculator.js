import { LitElement, css, html } from 'lit';

// Mirrors ScopeInterface::allowedForUser() of the scopes shipped with TYPO3, see _data/security.json
const allowedFor = {
  everyone: () => true,
  dashboard_access: (user) => user.dashboard_access,
  admin: (user) => user.admin,
};

/**
 * The scope calculator in "Security model" (_includes/sections/security.html):
 * the token's scopes are the intersection of what the app requests, what is
 * configured for the app and what the user may hold. The data of
 * security.json → calculator is passed as a JSON <script> child, the note
 * below the result as the slot "note".
 */
export class ScopeCalculator extends LitElement {
  static properties = {
    user: { state: true },
    requested: { state: true },
    configured: { state: true },
  };

  static styles = css`
    :host { display: block; }
    button { font: inherit; }
    .calc {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      box-shadow: var(--shadow);
      padding: 20px;
      font-size: var(--font-size-text, 17px);
    }
    .label { font-size: var(--font-size-label, 13px); font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); }
    .users { display: flex; flex-wrap: wrap; gap: 8px; margin: 6px 0 16px; }
    .users button {
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--fg);
      border-radius: 999px;
      padding: 6px 14px;
      cursor: pointer;
      font-weight: 600;
    }
    .users button[aria-pressed="true"] { background: var(--fg); border-color: var(--fg); color: var(--surface); }
    .matrix-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: separate; border-spacing: 0; }
    th, td { padding: 8px 10px; border-bottom: 1px solid var(--border); text-align: center; }
    th { font-size: var(--font-size-label, 13px); color: var(--muted); font-weight: 700; vertical-align: bottom; }
    th:first-child, td:first-child { text-align: left; }
    code {
      font: .86em "Source Code Pro", ui-monospace, monospace;
      white-space: nowrap;
      background: var(--surface-2);
      border: 1px solid var(--border);
      padding: .08em .35em;
      border-radius: 5px;
    }
    small { display: block; color: var(--muted); font-size: var(--font-size-label, 13px); }
    .op { color: var(--muted); font-weight: 700; padding: 0 2px; }
    .toggle, .state {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      border: 1px solid var(--border);
      display: inline-grid;
      place-items: center;
      font-weight: 700;
    }
    .toggle { cursor: pointer; }
    .toggle:hover { border-color: var(--accent); }
    .toggle:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
    .yes { background: var(--ok-soft); border-color: color-mix(in srgb, var(--ok) 50%, var(--border)); color: var(--ok); }
    .no { background: var(--no-soft); border-color: color-mix(in srgb, var(--no) 40%, var(--border)); color: var(--no); }
    .result { font-weight: 700; border-radius: 999px; padding: 3px 10px; font-size: var(--font-size-label, 13px); white-space: nowrap; }
    .result.granted { background: var(--ok); color: #fff; }
    .result.denied { background: var(--surface-2); color: var(--muted); border: 1px solid var(--border); }
    .actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin: 6px 0 0; padding: 0; list-style: none; }
    .action {
      display: flex;
      align-items: center;
      gap: 10px;
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 8px 12px;
      transition: background .2s, border-color .2s;
    }
    .verb {
      flex: none;
      font: 600 var(--font-size-label, 13px) "Source Code Pro", monospace;
      border-radius: 6px;
      padding: 2px 6px;
      background: var(--info-soft);
      color: var(--info);
    }
    .verb.write { background: var(--accent-soft); color: var(--accent-strong); }
    .name { flex: 1; min-width: 0; }
    .check { font-weight: 700; }
    .action.allowed { border-color: color-mix(in srgb, var(--ok) 45%, var(--border)); background: var(--ok-soft); }
    .action.allowed .check { color: var(--ok); }
    .action.blocked { opacity: .7; }
    .action.blocked .check { color: var(--no); }
    .spaced { margin-top: 18px; }
    .note { margin: 14px 0 0; color: var(--muted); }
    @media (max-width: 960px) {
      .actions { grid-template-columns: minmax(0, 1fr); }
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    if (!this.data) {
      this.data = JSON.parse(this.querySelector(':scope > script[type="application/json"]')?.textContent || '{}');
      const { users = [], defaults = {} } = this.data;
      this.user = users.find((user) => user.id === defaults.user) ?? users[0];
      this.requested = new Set(defaults.requested);
      this.configured = new Set(defaults.configured);
    }
  }

  render() {
    if (!this.user) {
      return html``;
    }
    const { scopes, users, actions } = this.data;
    const rows = scopes.map((scope) => {
      const allowed = allowedFor[scope.allowed_for](this.user);
      return { scope, allowed, granted: this.requested.has(scope.id) && this.configured.has(scope.id) && allowed };
    });
    const granted = new Set(rows.filter((row) => row.granted).map((row) => row.scope.id));
    return html`
      <div class="calc">
        <div class="label" id="user-label">Backend user who grants access</div>
        <div class="users" role="group" aria-labelledby="user-label">
          ${users.map((user) => html`
            <button type="button" aria-pressed=${user === this.user ? 'true' : 'false'} @click=${() => { this.user = user; }}>${user.label}</button>
          `)}
        </div>
        <div class="matrix-wrap">
          <table>
            <thead>
              <tr>
                <th>Scope</th><th>Requested<br>by the app</th><th></th><th>Configured<br>for the app</th><th></th><th>Allowed<br>for the user</th><th></th><th>Token</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map(({ scope, allowed, granted: ok }) => html`
                <tr>
                  <td><code>${scope.id}</code><small>${scope.name}</small></td>
                  <td>${this.renderToggle(this.requested, scope, 'requested by the app')}</td>
                  <td class="op" aria-hidden="true">∩</td>
                  <td>${this.renderToggle(this.configured, scope, 'configured for the app')}</td>
                  <td class="op" aria-hidden="true">∩</td>
                  <td><span class="state ${allowed ? 'yes' : 'no'}" role="img" aria-label=${allowed ? 'allowed' : 'not allowed'}>${allowed ? '✓' : '✕'}</span></td>
                  <td class="op" aria-hidden="true">=</td>
                  <td><span class="result ${ok ? 'granted' : 'denied'}">${ok ? 'granted' : 'not granted'}</span></td>
                </tr>
              `)}
            </tbody>
          </table>
        </div>
        <div class="label spaced" id="actions-label">What the app can call</div>
        <ul class="actions" aria-labelledby="actions-label" aria-live="polite">
          ${actions.map((action) => {
            const missing = action.scopes.filter((scope) => !granted.has(scope));
            const allowed = missing.length === 0;
            return html`
              <li class="action ${allowed ? 'allowed' : 'blocked'}">
                <span class="verb ${action.method === 'GET' ? '' : 'write'}">${action.method}</span>
                <span class="name">${action.name}<small>${allowed ? action.path : `missing ${missing.join(', ')}`}</small></span>
                <span class="check" role="img" aria-label=${allowed ? 'allowed' : 'not allowed'}>${allowed ? '✓' : '✕'}</span>
              </li>
            `;
          })}
        </ul>
        <p class="note"><slot name="note"></slot></p>
      </div>
    `;
  }

  renderToggle(set, scope, column) {
    const on = set.has(scope.id);
    return html`
      <button type="button" class="toggle ${on ? 'yes' : 'no'}" aria-pressed=${on ? 'true' : 'false'}
        aria-label="${scope.id} ${column}" title="Click to toggle" @click=${() => this.toggle(set, scope.id)}>${on ? '✓' : '✕'}</button>
    `;
  }

  toggle(set, id) {
    const next = new Set(set);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    if (set === this.requested) {
      this.requested = next;
    } else {
      this.configured = next;
    }
  }
}

customElements.define('scope-calculator', ScopeCalculator);
