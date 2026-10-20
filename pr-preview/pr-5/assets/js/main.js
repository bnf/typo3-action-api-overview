import { pageData } from './dom.js';
import { initNavigation } from './nav.js';
import './components/code-block.js';
import './components/action-anatomy.js';
import './components/color-scheme-toggle.js';
import { initTabs } from './tabs.js';
import { initStack } from './stack.js';
import { initCalculator } from './calculator.js';
import { initViewer } from './viewer.js';
import { initDiagrams } from './diagrams.js';

const content = document.querySelector('.content');

initNavigation(content);
initTabs(content);
initStack(content, pageData.stack);
initCalculator(content, pageData.calculator);
initViewer(content);
await initDiagrams(content);
