import './components/code-block.js';
import './components/action-anatomy.js';
import './components/problem-comparison.js';
import './components/color-scheme-toggle.js';
import './components/page-navigation.js';
import './components/stack-explorer.js';
import './components/scope-calculator.js';
import './components/zoom-viewer.js';
import './components/screen-shot.js';
import './components/mermaid-diagram.js';
import { initTabs } from './tabs.js';

initTabs(document.querySelector('.content'));
