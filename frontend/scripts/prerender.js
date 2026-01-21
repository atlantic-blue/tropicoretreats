const path = require('path');
const Prerenderer = require('@prerenderer/prerenderer');
const PuppeteerRenderer = require('@prerenderer/renderer-puppeteer');
const fs = require('fs');

const DIST_PATH = path.resolve(__dirname, '..', 'dist');

const routes = [
  '/',
  '/about',
  '/services',
  '/faqs',
  '/contact',
  '/privacy',
  '/terms',
  '/destinations/caribbean',
  '/destinations/casanare',
  '/destinations/coffee-region',
];

async function prerender() {
  console.log('Starting pre-rendering...');
  console.log('Dist path:', DIST_PATH);

  const prerenderer = new Prerenderer({
    staticDir: DIST_PATH,
    renderer: new PuppeteerRenderer({
      headless: true,
      renderAfterDocumentEvent: 'DOMContentLoaded',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    }),
  });

  try {
    await prerenderer.initialize();
    console.log('Prerenderer initialized');

    const renderedRoutes = await prerenderer.renderRoutes(routes);
    console.log(`Rendered ${renderedRoutes.length} routes`);

    // Write each rendered route to its own HTML file
    for (const route of renderedRoutes) {
      const routePath = route.route === '/' ? '/index' : route.route;
      const filePath = path.join(DIST_PATH, `${routePath}.html`);
      const dirPath = path.dirname(filePath);

      // Create directory if it doesn't exist
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      fs.writeFileSync(filePath, route.html);
      console.log(`Written: ${filePath}`);
    }

    console.log('Pre-rendering complete!');
  } catch (error) {
    console.error('Pre-rendering failed:', error);
    process.exit(1);
  } finally {
    await prerenderer.destroy();
  }
}

prerender();
