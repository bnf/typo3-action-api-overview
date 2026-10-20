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
