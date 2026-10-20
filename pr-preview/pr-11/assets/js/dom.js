export const el = (tag, props = {}, ...children) => {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
};

// Data rendered by Jekyll from _data/*.json, see index.html
export const pageData = JSON.parse(document.getElementById('page-data')?.textContent || '{}');

export const template = (id) => document.getElementById(id)?.innerHTML ?? '';
