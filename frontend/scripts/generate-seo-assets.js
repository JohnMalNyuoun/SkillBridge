import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const distDirectory = path.resolve(scriptDirectory, '../dist');
const indexPath = path.join(distDirectory, 'index.html');
const configuredSiteUrl = process.env.VITE_SITE_URL?.trim();

let siteOrigin = null;
if (configuredSiteUrl) {
  const parsedUrl = new URL(configuredSiteUrl);
  if (
    !['https:', 'http:'].includes(parsedUrl.protocol) ||
    parsedUrl.pathname !== '/' ||
    parsedUrl.search ||
    parsedUrl.hash
  ) {
    throw new Error(
      'VITE_SITE_URL must be an absolute site origin, such as https://skillbridge.example.org.',
    );
  }
  siteOrigin = parsedUrl.origin;
}

await mkdir(distDirectory, { recursive: true });

const robotsLines = ['User-agent: *', 'Allow: /'];
let indexHtml = await readFile(indexPath, 'utf8');
if (siteOrigin) {
  const urls = ['/', '/updates']
    .map((route) => `  <url><loc>${siteOrigin}${route}</loc></url>`)
    .join('\n');
  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    '</urlset>',
    '',
  ].join('\n');

  await writeFile(path.join(distDirectory, 'sitemap.xml'), sitemap);
  robotsLines.push(`Sitemap: ${siteOrigin}/sitemap.xml`);
  indexHtml = indexHtml
    .replace(
      '<meta property="og:image" content="/skillbridge-logo.jpg" />',
      `<meta property="og:image" content="${siteOrigin}/skillbridge-logo.jpg" />`,
    )
    .replace(
      '</head>',
      `    <link rel="canonical" href="${siteOrigin}/" />\n    <meta property="og:url" content="${siteOrigin}/" />\n  </head>`,
    );
} else {
  console.warn(
    'VITE_SITE_URL is not set; sitemap.xml was not generated. Set it to the production origin to enable canonical URLs and the sitemap.',
  );
}

await writeFile(path.join(distDirectory, 'robots.txt'), `${robotsLines.join('\n')}\n`);
await writeFile(indexPath, indexHtml);
