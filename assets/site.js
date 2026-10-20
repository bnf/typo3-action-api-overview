import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';

const content = document.querySelector('.content');
const el = (tag, props = {}, ...children) => {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
};

/* Sidebar navigation, built from the headings */
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
  link.append(heading.dataset.nav || heading.textContent.replace(/^#/, ''));
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

/* Copy buttons */
for (const wrap of content.querySelectorAll('.code-wrap')) {
  const button = el('button', { type: 'button', className: 'copy', textContent: 'Copy' });
  button.addEventListener('click', async () => {
    await navigator.clipboard.writeText(wrap.querySelector('pre').innerText.trim());
    button.textContent = 'Copied';
    setTimeout(() => { button.textContent = 'Copy'; }, 1500);
  });
  wrap.append(button);
}

/* Tabs */
const selectTab = (tabs, id) => {
  for (const button of tabs.querySelectorAll('[role="tab"]')) {
    const selected = button.dataset.tab === id;
    button.setAttribute('aria-selected', String(selected));
    tabs.querySelector('#' + button.getAttribute('aria-controls')).hidden = !selected;
  }
};
for (const tabs of content.querySelectorAll('.tabs')) {
  tabs.querySelector('.tablist').addEventListener('click', (event) => {
    const button = event.target.closest('[role="tab"]');
    if (button) {
      selectTab(tabs, button.dataset.tab);
    }
  });
}
for (const channel of content.querySelectorAll('[data-show-tab]')) {
  channel.addEventListener('click', () => {
    const tabs = document.getElementById('channels');
    selectTab(tabs, channel.dataset.showTab);
    tabs.scrollIntoView({ block: 'start' });
  });
}

/* Anatomy of an action: highlight code part and explanation together */
for (const anatomy of content.querySelectorAll('.anatomy')) {
  const highlight = (ref) => {
    for (const node of anatomy.querySelectorAll('[data-ref]')) {
      node.classList.toggle('on', node.dataset.ref === ref);
    }
  };
  anatomy.addEventListener('mouseover', (event) => {
    const target = event.target.closest('[data-ref]');
    if (target) {
      highlight(target.dataset.ref);
    }
  });
  anatomy.addEventListener('click', (event) => {
    const target = event.target.closest('[data-ref]');
    if (target) {
      highlight(target.dataset.ref);
    }
  });
  highlight('1');
}

/* Stack explorer */
const layers = [
  {
    id: 'clients',
    name: 'Clients',
    tagline: 'Who calls',
    items: ['Backend UI', 'Scripts & integrations', 'AI agents', 'Local coding agents'],
    title: 'Clients: everyone talks to the same actions',
    body: `<p>The TYPO3 backend itself, external scripts and integrations, AI assistants
      and local coding agents all use the same actions. None of them needs a
      dedicated endpoint.</p>
      <ul><li>Backend JavaScript: <code>@typo3/core/action/request</code></li>
      <li>Any HTTP client: <code>curl</code>, generated OpenAPI clients, automation tools</li>
      <li>MCP clients: Claude, MCP Inspector, other AI agents</li></ul>`,
  },
  {
    id: 'protocols',
    name: 'Protocols',
    tagline: 'How they talk',
    items: ['HTTP + JSON', 'MCP over HTTP', 'MCP over stdio', 'OpenAPI'],
    title: 'Protocols: different wire formats, one model',
    body: `<p>Every action is reachable as a JSON endpoint below <code>/typo3/api/</code>,
      with the HTTP method derived from its type. The same actions are offered as
      MCP tools, over HTTP or locally via <code>mcp:serve</code>, and described in
      an OpenAPI 3.1 document at <code>/typo3/api/schema</code>.</p>
      <p class="meta">Components: <code>ActionHandler</code>, MCP server, <code>OpenApiBuilder</code></p>`,
  },
  {
    id: 'access',
    name: 'Access',
    tagline: 'Who is it, what may they do',
    items: ['Backend session', 'EXT:hub (OAuth 2.0, tokens)', 'Scopes'],
    title: 'Access: identify the user, limit the app',
    body: `<p>Every call runs as a backend user. Inside the backend, the session
      identifies the user. External applications authenticate with a token issued
      by <strong>EXT:hub</strong>, via OAuth 2.0 or as a static token.</p>
      <p><strong>Scopes</strong> limit which actions an application may call on behalf
      of the user, for example <code>content:read</code> or <code>dashboard:write</code>.</p>
      <p class="meta">Components: backend authentication, <code>AppResolver</code>, OAuth 2.0 server, <code>ScopeRegistry</code></p>`,
  },
  {
    id: 'core',
    name: 'Action core',
    tagline: 'Check, validate, invoke',
    items: ['ActionRegistry', 'RequestHandler', 'ActionInvoker', 'JSON Schema'],
    title: 'Action core: one place for the hard parts',
    body: `<p>The core knows every action and its JSON Schema, compiled once with the
      dependency injection container. For each call it</p>
      <ul><li>checks the required scopes,</li>
      <li>validates arguments and converts them to PHP types,</li>
      <li>calls the action method with an <code>ActionContext</code>,</li>
      <li>validates the result against the output schema,</li>
      <li>maps declared errors to status codes.</li></ul>
      <p class="meta">Components: <code>ActionRegistry</code>, <code>RequestHandler</code>, <code>ActionInvoker</code>, schema builder and hydrator</p>`,
  },
  {
    id: 'actions',
    name: 'Actions',
    tagline: 'What can be done',
    items: ['Dashboard', 'Page tree', 'Records', 'MCP server', 'Your extension'],
    title: 'Actions: plain PHP methods with #[AsAction]',
    body: `<p>Actions are methods of regular services, marked with the
      <code>#[AsAction]</code> attribute. They contain only the business logic:
      no request parsing, no serialization, no authentication.</p>
      <p>TYPO3 provides actions for the dashboard, the page tree, file resources and
      records. Even the MCP server is an action. Extensions add their own.</p>`,
  },
  {
    id: 'typo3',
    name: 'TYPO3',
    tagline: 'Where it happens',
    items: ['DataHandler', 'Permissions', 'TcaSchema', 'Workspaces'],
    title: 'TYPO3: the familiar foundation',
    body: `<p>Actions use the regular TYPO3 APIs. Because they run as a backend user,
      page permissions, table and field access, workspaces and all other backend
      rules apply, exactly as in the backend.</p>
      <p>Record schemas are derived from <code>TcaSchema</code>, so the API describes
      the content model of each installation.</p>`,
  },
];

const scenarios = {
  backend: {
    label: 'Backend UI loads the page tree',
    steps: [
      ['clients', 'Backend UI', 'The page tree requests its data',
        `<p>The page tree component calls the action with the JavaScript client:</p>
        <pre class="code">action('/page/tree', { … }).get()</pre>
        <p>The client adds a bearer token that is embedded in the backend document.</p>`],
      ['protocols', 'HTTP + JSON', 'A regular HTTP request',
        `<p><code>GET /typo3/api/page/tree</code> matches the backend route that was
        registered for this action.</p>`],
      ['access', 'Backend session', 'The session identifies the editor',
        `<p>Session cookie and bearer token must belong to the same user, so other
        websites cannot call actions in the name of a logged-in editor.</p>
        <p>All scopes the editor may hold are granted.</p>`],
      ['core', 'RequestHandler', 'Scopes and arguments are checked',
        `<p>The action requires <code>content:read</code>, which is granted. Query
        arguments are validated against the input schema.</p>`],
      ['core', 'ActionInvoker', 'The action is invoked',
        `<p>Arguments are converted to PHP types and the method is called with an
        <code>ActionContext</code> holding user, scopes and request.</p>`],
      ['actions', 'Page tree', 'Business logic only',
        `<p>The page tree action builds the tree items. It knows nothing about HTTP.</p>`],
      ['typo3', 'Permissions', 'Backend permissions apply',
        `<p>Only pages the editor is allowed to see end up in the tree.</p>`],
      ['clients', 'Backend UI', 'Validated JSON comes back',
        `<p>The result is validated against the output schema and returned as JSON.
        The former internal AJAX route is no longer needed.</p>`],
    ],
  },
  integration: {
    label: 'Script with a static token',
    steps: [
      ['clients', 'Scripts & integrations', 'An integration calls TYPO3',
        `<pre class="code">curl -H 'Authorization: Bearer &lt;token&gt;' \\
  https://example.org/typo3/api/dashboards</pre>
        <p>An administrator created the token for this app in the API Hub module.</p>`],
      ['protocols', 'HTTP + JSON', 'Same endpoint as the backend uses',
        `<p>The request reaches the same route as a request from the backend UI.</p>`],
      ['access', 'EXT:hub (OAuth 2.0, tokens)', 'EXT:hub validates the token',
        `<p>There is no backend session, so EXT:hub takes over: the app must be
        enabled and its secret unchanged. EXT:hub loads the backend user selected in
        the app record.</p>`],
      ['access', 'Scopes', 'The app only gets its scopes',
        `<p>Granted are exactly the scopes selected in the app record, for example
        <code>dashboard:read</code>.</p>`],
      ['core', 'RequestHandler', 'Scope check',
        `<p><code>dashboard:read</code> is required and granted. A write action would be
        rejected with <code>403 Missing scope</code>.</p>`],
      ['core', 'ActionInvoker', 'Invoked as the app user',
        `<p>The <code>ActionContext</code> carries the backend user of the app.</p>`],
      ['actions', 'Dashboard', 'Same code as in the backend',
        `<p>The dashboard action that serves the backend UI also serves the integration.</p>`],
      ['clients', 'Scripts & integrations', 'JSON response',
        `<p>The integration receives the validated JSON result.</p>`],
    ],
  },
  mcp: {
    label: 'AI agent via MCP',
    steps: [
      ['clients', 'AI agents', 'An AI client connects',
        `<p>The MCP client discovers the authorization server at
        <code>/.well-known/oauth-authorization-server</code> and starts the OAuth flow.</p>`],
      ['access', 'EXT:hub (OAuth 2.0, tokens)', 'The user grants access',
        `<p>The user logs in and approves the requested scopes on the consent screen.
        The token contains only scopes that were requested, are configured for the
        app and are allowed for this user.</p>`],
      ['protocols', 'MCP over HTTP', 'MCP is just another endpoint',
        `<pre class="code">POST /typo3/api/mcp
{"method": "tools/list", …}</pre>`],
      ['access', 'Scopes', 'Token checked on every request',
        `<p>EXT:hub validates the token and intersects its scopes with the scopes the
        app currently has.</p>`],
      ['core', 'RequestHandler', 'The scope mcp is required',
        `<p>The MCP server is an action and requires the scope <code>mcp</code>.</p>`],
      ['actions', 'MCP server', 'The MCP server is an action',
        `<p><code>tools/list</code> returns every action whose scopes are granted,
        with input and output schema and hints such as <code>readOnlyHint</code>.</p>`],
      ['protocols', 'MCP over HTTP', 'The agent calls a tool',
        `<pre class="code">{"method": "tools/call",
 "params": {"name": "fetch_dashboards"}}</pre>`],
      ['core', 'ActionInvoker', 'Nested invocation',
        `<p>The MCP action invokes the target action through the same
        <code>ActionInvoker</code>, with the same user and scopes.</p>`],
      ['actions', 'Dashboard', 'Same action, third consumer',
        `<p>The dashboard action now serves the backend, integrations and AI agents.</p>`],
      ['clients', 'AI agents', 'Structured result',
        `<p>The validated result is returned as <code>structuredContent</code> in the
        JSON-RPC response. The agent can render the user's dashboard.</p>`],
    ],
  },
  stdio: {
    label: 'Coding agent via stdio',
    steps: [
      ['clients', 'Local coding agents', 'A local agent starts TYPO3',
        `<pre class="code">vendor/bin/typo3 mcp:serve --user=editor</pre>
        <p>The MCP client starts the command and talks to it via standard input and
        output.</p>`],
      ['protocols', 'MCP over stdio', 'No web server needed',
        `<p>JSON-RPC messages are exchanged line by line. EXT:hub is not required.</p>`],
      ['access', 'Scopes', 'Runs as the selected user',
        `<p>The user <code>editor</code> must exist and be enabled. All scopes allowed
        for this user are granted. Without <code>--user</code>, the CLI user
        <code>_cli_</code> is used.</p>`],
      ['actions', 'MCP server', 'Same MCP implementation',
        `<p>The same MCP action handles <code>initialize</code>, <code>tools/list</code>
        and <code>tools/call</code>.</p>`],
      ['core', 'ActionInvoker', 'Same validation',
        `<p>Tool calls are invoked and validated exactly as over HTTP.</p>`],
      ['typo3', 'Permissions', 'The user’s permissions apply',
        `<p>The agent can do what <code>editor</code> can do, and nothing more.</p>`],
    ],
  },
};

const explorer = document.querySelector('.explorer');
if (explorer) {
  const stack = explorer.querySelector('.stack');
  const panel = explorer.querySelector('.panel');
  const scenarioBar = explorer.parentElement.querySelector('.scenarios');
  const layerNodes = new Map();

  for (const layer of layers) {
    const node = el('div', { className: 'layer', tabIndex: 0, role: 'button' },
      el('div', { className: 'name' }, el('strong', { textContent: layer.name }), el('small', { textContent: layer.tagline })),
      el('div', { className: 'items' }, ...layer.items.map((item) => el('span', { className: 'item', textContent: item }))),
      el('span', { className: 'step-badge' }),
    );
    node.dataset.layer = layer.id;
    stack.append(node);
    layerNodes.set(layer.id, node);
  }

  let scenario = null;
  let step = 0;
  let timer = null;

  const showLayer = (id) => {
    stopScenario();
    const layer = layers.find((entry) => entry.id === id);
    for (const [key, node] of layerNodes) {
      node.classList.toggle('selected', key === id);
    }
    panel.innerHTML = `<div class="kicker">Layer</div><h4>${layer.title}</h4>${layer.body}
      <p class="meta">Pick a scenario above to follow a request through the stack.</p>`;
  };

  const render = () => {
    const steps = scenarios[scenario].steps;
    const [layerId, itemName, title, body] = steps[step];
    stack.classList.add('playing');
    for (const [key, node] of layerNodes) {
      node.classList.remove('selected');
      node.classList.toggle('current', key === layerId);
      node.classList.toggle('visited', steps.slice(0, step).some(([id]) => id === key));
      node.querySelector('.step-badge').textContent = String(step + 1);
      for (const item of node.querySelectorAll('.item')) {
        item.classList.toggle('hit', key === layerId && item.textContent === itemName);
      }
    }
    panel.innerHTML = `<div class="kicker">${scenarios[scenario].label} · Step ${step + 1} of ${steps.length}</div>
      <h4>${title}</h4>${body}
      <div class="controls">
        <button type="button" data-step="prev" ${step === 0 ? 'disabled' : ''}>← Back</button>
        <button type="button" class="primary" data-step="next" ${step === steps.length - 1 ? 'disabled' : ''}>Next →</button>
        <button type="button" data-step="play">${timer ? 'Pause' : 'Autoplay'}</button>
        <span class="dots">${steps.map((_, index) => `<span class="${index <= step ? 'on' : ''}"></span>`).join('')}</span>
      </div>`;
  };

  const stopScenario = () => {
    clearInterval(timer);
    timer = null;
    scenario = null;
    stack.classList.remove('playing');
    for (const node of layerNodes.values()) {
      node.classList.remove('current', 'visited');
      for (const item of node.querySelectorAll('.item')) {
        item.classList.remove('hit');
      }
    }
    for (const button of scenarioBar.querySelectorAll('button')) {
      button.setAttribute('aria-pressed', 'false');
    }
  };

  const startScenario = (id) => {
    stopScenario();
    scenario = id;
    step = 0;
    for (const button of scenarioBar.querySelectorAll('button')) {
      button.setAttribute('aria-pressed', String(button.dataset.scenario === id));
    }
    render();
  };

  for (const [id, entry] of Object.entries(scenarios)) {
    const button = el('button', { type: 'button', textContent: '▶ ' + entry.label });
    button.dataset.scenario = id;
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => startScenario(id));
    scenarioBar.append(button);
  }

  stack.addEventListener('click', (event) => {
    const node = event.target.closest('.layer');
    if (node) {
      showLayer(node.dataset.layer);
    }
  });
  stack.addEventListener('keydown', (event) => {
    const node = event.target.closest('.layer');
    if (node && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      showLayer(node.dataset.layer);
    }
  });
  panel.addEventListener('click', (event) => {
    const action = event.target.closest('[data-step]')?.dataset.step;
    if (!action || !scenario) {
      return;
    }
    const last = scenarios[scenario].steps.length - 1;
    if (action === 'prev') step = Math.max(0, step - 1);
    if (action === 'next') step = Math.min(last, step + 1);
    if (action === 'play') {
      if (timer) {
        clearInterval(timer);
        timer = null;
      } else {
        if (step === last) step = 0;
        timer = setInterval(() => {
          if (step >= last) {
            clearInterval(timer);
            timer = null;
          } else {
            step++;
          }
          render();
        }, 3200);
      }
    }
    render();
  });

  startScenario('backend');
}

/* Scope calculator */
const calc = document.querySelector('.calc');
if (calc) {
  const scopes = [
    { id: 'content:read', name: 'Read access to content', allowed: () => true },
    { id: 'content:write', name: 'Writable access to content', allowed: () => true },
    { id: 'dashboard:read', name: 'Dashboard read access', allowed: (user) => user.dashboard },
    { id: 'dashboard:write', name: 'Dashboard write access', allowed: (user) => user.dashboard },
    { id: 'token:generate', name: 'Management of app tokens', allowed: (user) => user.admin },
    { id: 'mcp', name: 'Model Context Protocol (MCP)', allowed: () => true },
  ];
  const users = [
    { id: 'admin', label: 'Administrator', admin: true, dashboard: true },
    { id: 'editor', label: 'Editor with dashboard', admin: false, dashboard: true },
    { id: 'limited', label: 'Editor without dashboard', admin: false, dashboard: false },
  ];
  const actions = [
    { verb: 'GET', name: 'Page tree', path: '/page/tree', scopes: ['content:read'] },
    { verb: 'PATCH', name: 'Update a record', path: '/records/{schema}/{identifier}', scopes: ['content:read', 'content:write'] },
    { verb: 'GET', name: 'Fetch dashboards', path: '/dashboards', scopes: ['dashboard:read'] },
    { verb: 'POST', name: 'Create a dashboard', path: '/dashboards', scopes: ['dashboard:read', 'dashboard:write'] },
    { verb: 'POST', name: 'Generate an app token', path: '/token/generate', scopes: ['token:generate'] },
    { verb: 'POST', name: 'Use actions as MCP tools', path: '/mcp', scopes: ['mcp'] },
  ];
  const state = {
    user: users[1],
    requested: new Set(['content:read', 'content:write', 'dashboard:read', 'dashboard:write', 'mcp']),
    configured: new Set(['content:read', 'dashboard:read', 'dashboard:write', 'mcp']),
  };

  const userBar = calc.querySelector('.users');
  for (const user of users) {
    const button = el('button', { type: 'button', textContent: user.label });
    button.addEventListener('click', () => {
      state.user = user;
      update();
    });
    button.dataset.user = user.id;
    userBar.append(button);
  }

  const tbody = calc.querySelector('tbody');
  const list = calc.querySelector('.actions-list');

  const toggleButton = (set, id) => {
    const on = set.has(id);
    const button = el('button', { type: 'button', className: 'toggle ' + (on ? 'yes' : 'no'), textContent: on ? '✓' : '✕' });
    button.title = 'Click to toggle';
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
    for (const scope of scopes) {
      const allowed = scope.allowed(state.user);
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
    for (const action of actions) {
      const missing = action.scopes.filter((scope) => !granted.has(scope));
      const allowed = missing.length === 0;
      list.append(el('div', { className: 'action-row ' + (allowed ? 'allowed' : 'denied') },
        el('span', { className: 'verb' + (action.verb === 'GET' ? '' : ' write'), textContent: action.verb }),
        el('span', { className: 'label' }, action.name, el('small', { textContent: allowed ? action.path : 'missing ' + missing.join(', ') })),
        el('span', { className: 'mark-ok', textContent: allowed ? '✓' : '✕' }),
      ));
    }
  }
  update();
}

/* Zoomable figures */
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

function openViewer(element) {
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

for (const image of content.querySelectorAll('figure.shot img')) {
  image.loading = 'lazy';
  image.closest('.frame').addEventListener('click', () => openViewer(image));
}

for (const diagram of content.querySelectorAll('pre.mermaid')) {
  const frame = el('div', { className: 'frame' });
  const caption = el('figcaption', {}, el('span', { textContent: diagram.dataset.caption || 'Diagram' }));
  const button = el('button', { type: 'button', className: 'zoom-hint', textContent: 'Enlarge' });
  caption.append(button);
  const figure = el('figure', { className: 'diagram' }, frame, caption);
  diagram.replaceWith(figure);
  frame.append(diagram);
  frame.addEventListener('click', () => openViewer(diagram));
  button.addEventListener('click', () => openViewer(diagram));
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

/* Mermaid diagrams (deep dive) */
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
await mermaid.run({ querySelector: 'pre.mermaid' });
for (const diagram of content.querySelectorAll('pre.mermaid')) {
  diagram.style.visibility = 'visible';
}
