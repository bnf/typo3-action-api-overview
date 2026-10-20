import { pageData } from './dom.js';
import { initNavigation } from './nav.js';
import { fixPhpAttributes, initAnatomy, initCopyButtons, initTabs } from './code.js';
import { initStack } from './stack.js';
import { initCalculator } from './calculator.js';
import { initViewer } from './viewer.js';
import { initDiagrams } from './diagrams.js';

const content = document.querySelector('.content');

initNavigation(content);
fixPhpAttributes(content);
initAnatomy(content, pageData.concept);
initCopyButtons(content);
initTabs(content);
initStack(content, pageData.stack);
initCalculator(content, pageData.calculator);
initViewer(content);
await initDiagrams(content);
