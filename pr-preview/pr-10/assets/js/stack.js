import { el, template } from './dom.js';
import { upgradeCode } from './components/code-block.js';

export function initStack(root, data) {
  const explorer = root.querySelector('.explorer');
  if (!explorer || !data) {
    return;
  }
  const stack = explorer.querySelector('.stack');
  const panel = explorer.querySelector('.panel');
  const scenarioBar = explorer.parentElement.querySelector('.scenarios');
  const layerNodes = new Map();

  for (const layer of data.layers) {
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

  const showLayer = (id) => {
    stopScenario();
    const layer = data.layers.find((entry) => entry.id === id);
    for (const [key, node] of layerNodes) {
      node.classList.toggle('selected', key === id);
    }
    panel.innerHTML = `<div class="kicker">Layer</div><h4></h4>${template('layer-' + id)}
      <p class="meta">Pick a scenario above to follow a request through the stack.</p>`;
    panel.querySelector('h4').textContent = layer.title;
    upgradeCode(panel);
  };

  const render = () => {
    const steps = scenario.steps;
    const current = steps[step];
    stack.classList.add('playing');
    for (const [key, node] of layerNodes) {
      node.classList.remove('selected');
      node.classList.toggle('current', key === current.layer);
      node.classList.toggle('visited', steps.slice(0, step).some((entry) => entry.layer === key));
      node.querySelector('.step-badge').textContent = String(step + 1);
      for (const item of node.querySelectorAll('.item')) {
        item.classList.toggle('hit', key === current.layer && item.textContent === current.item);
      }
    }
    panel.innerHTML = `<div class="kicker"></div><h4></h4>${template(`step-${scenario.id}-${step}`)}
      <div class="controls">
        <button type="button" data-step="prev" ${step === 0 ? 'disabled' : ''}>← Back</button>
        <button type="button" class="primary" data-step="next" ${step === steps.length - 1 ? 'disabled' : ''}>Next →</button>
        <button type="button" data-step="play">${timer ? 'Pause' : 'Autoplay'}</button>
        <span class="dots">${steps.map((_, index) => `<span class="${index <= step ? 'on' : ''}"></span>`).join('')}</span>
      </div>`;
    panel.querySelector('.kicker').textContent = `${scenario.label} · Step ${step + 1} of ${steps.length}`;
    panel.querySelector('h4').textContent = current.title;
    upgradeCode(panel);
  };

  const startScenario = (id) => {
    stopScenario();
    scenario = data.scenarios.find((entry) => entry.id === id);
    step = 0;
    for (const button of scenarioBar.querySelectorAll('button')) {
      button.setAttribute('aria-pressed', String(button.dataset.scenario === id));
    }
    render();
  };

  for (const entry of data.scenarios) {
    const button = el('button', { type: 'button', textContent: '▶ ' + entry.label });
    button.dataset.scenario = entry.id;
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => startScenario(entry.id));
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
    const last = scenario.steps.length - 1;
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

  startScenario(data.scenarios[0].id);
}
