import { pageData } from './dom.js';
import { initNavigation } from './nav.js';
import './components/code-block.js';
import './components/action-anatomy.js';
import './components/problem-comparison.js';
import './components/color-scheme-toggle.js';
import './components/scope-calculator.js';
import { initTabs } from './tabs.js';
import { initStack } from './stack.js';
import { initViewer } from './viewer.js';
import { initDiagrams } from './diagrams.js';

const content = document.querySelector('.content');

initNavigation(content);
initTabs(content);
initStack(content, pageData.stack);
initViewer(content);
await initDiagrams(content);
