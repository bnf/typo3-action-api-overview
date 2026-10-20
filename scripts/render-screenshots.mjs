// Renders every block of the built site as an image, for the comments on
// GitHub (assets/js/components/github-comments.js): an issue shows the image of
// the block it is about, on every device.
//
// The images are named after a hash of their content, so a block that did not
// change keeps its file; screenshots/<revision>.json maps the id of each block
// to its image. The deployment keeps older files, so that older issues still
// show the block as it was.
//
// Usage: node scripts/render-screenshots.mjs <site directory> <base URL path> <revision>
//        node scripts/render-screenshots.mjs _site /typo3-action-api-overview/ 1a2b3c…
// Needs Playwright with Chromium (npm install playwright && npx playwright install chromium).

import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { chromium } from 'playwright';

const [site = '_site', base = '/', revision = 'local'] = process.argv.slice(2);
const types = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg',
};

// Serves the built site below the base URL path, as GitHub Pages does
const server = createServer((request, response) => {
  const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  let file = path.startsWith(base) ? join(site, normalize(path.slice(base.length))) : null;
  if (file && existsSync(file) && statSync(file).isDirectory()) {
    file = join(file, 'index.html');
  }
  if (!file || !existsSync(file)) {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' });
  response.end(readFileSync(file));
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, colorScheme: 'light', deviceScaleFactor: 1 });
await page.goto(`http://127.0.0.1:${server.address().port}${base}`, { waitUntil: 'networkidle' });
// The sticky top bar would cover the top of a block; the comment controls do not belong in an image
await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; } .topbar { position: static !important; } github-comments { display: none !important; }' });
await page.evaluate(async () => {
  for (const image of document.querySelectorAll('img[loading="lazy"]')) {
    image.loading = 'eager';
  }
  await Promise.all([...document.images].map((image) => (image.complete ? null : new Promise((resolve) => { image.onload = resolve; image.onerror = resolve; }))));
  await document.fonts.ready;
});
// Mermaid renders the diagrams after the page has loaded
await page.waitForFunction(() => [...document.querySelectorAll('mermaid-diagram')].every((diagram) => diagram.shadowRoot?.querySelector('.svg svg')), null, { timeout: 30000 })
  .catch(() => console.warn('Diagrams did not render in time'));

const output = join(site, 'screenshots');
mkdirSync(output, { recursive: true });
const ids = await page.evaluate(() => document.querySelector('github-comments').screenshotTargets().map((target) => target.id));
const manifest = {};
for (const id of ids) {
  const element = await page.evaluateHandle((wanted) => document.querySelector('github-comments').screenshotTargets().find((target) => target.id === wanted).element, id);
  const image = await element.asElement().screenshot({ animations: 'disabled' });
  const file = `${createHash('sha256').update(image).digest('hex').slice(0, 20)}.png`;
  writeFileSync(join(output, file), image);
  manifest[id] = file;
}
writeFileSync(join(output, `${revision}.json`), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Rendered ${ids.length} blocks into ${output}`);

await browser.close();
server.close();
