import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const publicDir = join(root, 'public');
const origin = 'https://nvmemonitor.app';
const appStore = 'https://apps.apple.com/app/id6837879526';
const email = 'support@nvmemonitor.app';
const locales = {
  en: 'English', ar: 'العربية', de: 'Deutsch', es: 'Español', fr: 'Français',
  hi: 'हिन्दी', id: 'Bahasa Indonesia', it: 'Italiano', ja: '日本語', ko: '한국어',
  'pt-BR': 'Português (Brasil)', ru: 'Русский', tr: 'Türkçe', uk: 'Українська',
  vi: 'Tiếng Việt', 'zh-Hans': '简体中文', 'zh-Hant': '繁體中文',
};
const pages = ['home', 'support', 'privacy', 'press'];
const storePublished = process.argv.includes('--published-store');
const storeBadges = new Map();
if (storePublished) {
  const badgeDirectory = process.env.NVME_APPLE_BADGES_DIR;
  if (!badgeDirectory) throw new Error('Set NVME_APPLE_BADGES_DIR to the unmodified Mac App Store Marketing Kit badges.');
  await mkdir(join(publicDir, 'assets/badges'), { recursive: true });
  for (const locale of Object.keys(locales)) {
    let badgeLocale = locale;
    const filename = code => `badge-mac-black-${code}.svg`;
    let artwork;
    try {
      artwork = await readFile(join(badgeDirectory, filename(locale)), 'utf8');
    } catch (error) {
      if (locale === 'en' || error.code !== 'ENOENT') throw error;
      badgeLocale = 'en';
      artwork = await readFile(join(badgeDirectory, filename(badgeLocale)), 'utf8');
    }
    const aspect = artwork.match(/viewBox="\s*[\d.]+\s+[\d.]+\s+([\d.]+)\s+([\d.]+)"/);
    if (!aspect || !(Number(aspect[1]) > 0) || !(Number(aspect[2]) > 0)) {
      throw new Error(`Invalid Mac App Store badge dimensions: ${badgeLocale}`);
    }
    const height = 48;
    const width = Math.round(height * Number(aspect[1]) / Number(aspect[2]));
    const url = `/assets/badges/${filename(badgeLocale)}`;
    await writeFile(join(publicDir, url), artwork);
    storeBadges.set(locale, { url, width, height });
  }
}
const releaseAssets = '/assets/releases';
await mkdir(join(publicDir, releaseAssets), { recursive: true });

async function versionAsset(name, extension) {
  const bytes = await readFile(join(publicDir, 'assets', `${name}.${extension}`));
  const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 16);
  const url = `${releaseAssets}/${name}.${hash}.${extension}`;
  await writeFile(join(publicDir, url), bytes);
  return url;
}

// Cached HTML must keep referring to the CSS and JavaScript it was built with.
const stylesheet = await versionAsset('site', 'css');
const preferencesScript = await versionAsset('preferences', 'js');

function route(locale, page) {
  const parts = [];
  if (locale !== 'en') parts.push(locale.toLowerCase());
  if (page !== 'home') parts.push(page);
  return parts.length ? `/${parts.join('/')}/` : '/';
}

function escape(text) {
  return text.replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

function validate(value, example, path) {
  if (typeof example === 'string') {
    if (typeof value !== 'string' || !value.trim()) throw new Error(`Missing translation: ${path}`);
    return escape(value);
  }
  if (!value || Object.keys(value).length !== Object.keys(example).length) {
    throw new Error(`Unexpected localization shape: ${path}`);
  }
  return Object.fromEntries(Object.entries(example).map(([key, nested]) =>
    [key, validate(value[key], nested, `${path}.${key}`)]));
}

const english = JSON.parse(await readFile(join(root, 'i18n/en.json'), 'utf8'));
const draft = process.argv.includes('--draft');
const copy = {};
const descriptions = {};
for (const locale of Object.keys(locales)) {
  try {
    const source = JSON.parse(await readFile(join(root, `i18n/${locale}.json`), 'utf8'));
    copy[locale] = validate(source, english, locale);
    descriptions[locale] = source.home.description;
  } catch (error) {
    if (!draft || error.code !== 'ENOENT') throw error;
  }
}
const languages = Object.keys(copy);

function alternateLinks(page) {
  return [...languages.map(locale =>
    `<link rel="alternate" hreflang="${locale}" href="${origin}${route(locale, page)}">`),
    `<link rel="alternate" hreflang="x-default" href="${origin}${route('en', page)}">`,
  ].join('\n  ');
}

function navigation(locale, page, strings, footer = false) {
  const item = (id, label, css = '') =>
    `<a href="${route(locale, id)}"${page === id ? ' aria-current="page"' : ''}${css}>${label}</a>`;
  const start = !footer && page === 'home'
    ? `<a class="desktop-link" href="#compatibility">${strings.compatibility}</a>`
    : item('home', strings.overview, footer ? '' : ' class="desktop-link"');
  return [start, item('support', strings.support), item('privacy', strings.privacy, footer ? '' : ' class="desktop-link"'),
    item('press', strings.press, footer ? '' : ' class="desktop-link"')].join('');
}

function controls(locale, page, ui) {
  const options = languages.map(code =>
    `<li><a href="${route(code, page)}" lang="${code}" hreflang="${code}" dir="auto"${code === locale ? ' aria-current="page"' : ''}>${locales[code]}</a></li>`).join('');
  return `<div class="site-controls">
      <details class="languages">
        <summary aria-label="${ui.language}: ${locales[locale]}">${locales[locale]}</summary>
        <ul>${options}</ul>
      </details>
      <label class="theme-control" hidden>
        <span class="sr-only">${ui.theme}</span>
        <select id="theme" aria-label="${ui.theme}">
          <option value="system">${ui.system}</option>
          <option value="light">${ui.light}</option>
          <option value="dark">${ui.dark}</option>
        </select>
      </label>
    </div>`;
}

function storeLink(locale) {
  const badge = storeBadges.get(locale);
  if (!badge) return `<a class="store-link" href="${appStore}">Mac App Store</a>`;
  return `<a class="store-badge" href="${appStore}"><img src="${badge.url}" alt="${copy[locale].ui.badgeAlt}" width="${badge.width}" height="${badge.height}"></a>`;
}

function layout(locale, page, body) {
  const strings = copy[locale];
  const ui = strings.ui;
  const { title, description } = strings[page];
  const canonical = origin + route(locale, page);
  const schema = page === 'home' ? {
    '@context': 'https://schema.org', '@type': 'SoftwareApplication',
    name: 'NVMe Monitor', url: canonical, inLanguage: locale,
    applicationCategory: 'UtilitiesApplication', operatingSystem: 'macOS 27+',
    description: descriptions[locale], image: origin + '/assets/social.jpg',
  } : null;
  return `<!doctype html>
<html lang="${locale}"${locale === 'ar' ? ' dir="rtl"' : ''}>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <link rel="canonical" href="${canonical}">
  ${alternateLinks(page)}
  <link rel="icon" type="image/png" href="/assets/icon.png">
  <script src="${preferencesScript}"></script>
  <link rel="stylesheet" href="${stylesheet}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="NVMe Monitor">
  <meta property="og:url" content="${canonical}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${origin}/assets/social.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${strings.home.heroAlt}">
  <meta name="twitter:card" content="summary_large_image">${schema ? `\n  <script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>` : ''}
</head>
<body>
  <a class="skip" href="#main">${ui.skip}</a>
  <header class="bar masthead">
    <a class="brand" href="${route(locale, 'home')}"><img src="/assets/icon.png" alt="" width="36" height="36"> NVMe Monitor</a>
    <nav aria-label="${ui.mainNav}">${navigation(locale, page, ui)}</nav>
    ${controls(locale, page, ui)}
  </header>
  <main id="main">
${body}
  </main>
  <footer class="bar footer">
    <div><a class="footer-name" href="${route(locale, 'home')}">NVMe Monitor</a><p>${ui.local}</p></div>
    <div><p>${ui.shortcuts}</p><a href="mailto:${email}">${email}</a></div>
    <nav aria-label="${ui.footerNav}">${navigation(locale, page, ui, true)}</nav>${page === 'home' ? '' : `\n    ${storeLink(locale)}`}
  </footer>
</body>
</html>
`;
}

function home(locale, { ui, home: t }) {
  const feature = (key) => `<div><h3>${t[key]}</h3><p>${t[key + 'Body']}</p></div>`;
  const requirement = (key) => `<div><dt>${t[key]}</dt><dd>${t[key + 'Body']}</dd></div>`;
  return `    <section class="hero">
      <div class="hero-layout">
        <div class="hero-copy">
          <p class="eyebrow">${t.eyebrow}</p>
          <h1>${t.headlineFirst}<br> ${t.headlineSecond}</h1>
          <p class="intro">${t.intro}</p>
          <div class="hero-actions">
            <a class="button" href="#compatibility">${t.check}<img src="/assets/arrow.svg" width="16" height="16" alt=""></a>
            ${storeLink(locale)}
          </div>
        </div>
        <figure class="hero-image">
          <picture class="contours" aria-hidden="true">
            <source media="(max-width: 45rem)" srcset="/assets/contours-mobile.svg">
            <img src="/assets/contours-desktop.svg" width="668" height="580" alt="">
          </picture>
          <img id="smart-preview" class="popover" src="/assets/smart.webp" width="820" height="972" fetchpriority="high" alt="${t.heroAlt}">
          <figcaption>
            <span>${t.example}</span>
            <label class="temperature-control" hidden>
              <span class="sr-only">${ui.unit}</span>
              <select id="temperature-unit" aria-label="${ui.unit}">
                <option value="celsius">${ui.celsius} (°C)</option>
                <option value="fahrenheit">${ui.fahrenheit} (°F)</option>
              </select>
            </label>
          </figcaption>
        </figure>
      </div>
    </section>
    <section class="features" aria-labelledby="features">
      <h2 id="features">${t.features}</h2>
      <div class="columns">${['temperature', 'smart', 'alerts'].map(feature).join('')}</div>
    </section>
    <section class="compatibility" id="compatibility" aria-labelledby="compatibility-title">
      <div class="compatibility-layout">
        <div><p class="eyebrow">${ui.compatibility}</p><h2 id="compatibility-title">${t.compatibilityHeading}</h2></div>
        <div class="requirements">
          <dl>${['mac', 'drive', 'enclosure'].map(requirement).join('')}</dl>
          <a href="${route(locale, 'support')}#missing-drive">${t.missing}</a>
        </div>
      </div>
    </section>`;
}

function support(locale, { support: t }) {
  return `    <article>
      <h1>${t.heading}</h1>
      <p>${t.intro}</p>
      <p><a class="button" href="mailto:${email}">${t.email} · <bdi>${email}</bdi></a></p>
      <h2 id="compatibility">${t.compatibility}</h2><p>${t.compatibilityBody}</p>
      <h2 id="missing-drive">${t.missing}</h2>
      <ol><li>${t.step1}</li><li>${t.step2}</li><li>${t.step3}</li></ol>
      <h2>${t.notifications}</h2><p>${t.notificationsBody}</p>
      <h2>${t.diagnostics}</h2><p>${t.diagnosticsBody}</p>
      <p><a href="${route(locale, 'privacy')}">${t.policy}</a></p>
    </article>`;
}

function privacy(_locale, { privacy: t }) {
  const sections = ['readings', 'diagnostics', 'email', 'notifications', 'choices', 'website'];
  return `    <article>
      <h1>${t.heading}</h1>
      <p>${t.publisher}</p><p>${t.intro}</p>
      ${sections.map(key => `<h2>${t[key]}</h2><p>${t[key + 'Body']}</p>`).join('\n      ')}
      <p>${t.localPreferences}</p>
      <p>${t.contact} <a href="mailto:${email}">${email}</a></p>
    </article>`;
}

function press(_locale, { ui, home, press: t }) {
  const facts = [
    [t.developer, 'Ramiz Kichibekov'], [t.platform, home.macBody], [t.version, t.versionBody],
    [t.languages, t.languagesBody], [ui.compatibility, t.compatibilityBody], [ui.privacy, t.privacyBody],
  ];
  const shots = [
    ['smart', 472, 560], ['settings', 640, 417], ['alerts', 640, 417],
  ];
  const gallery = shots.map(([key, width, height]) => {
    const asset = `/press/nvme-monitor-${key}`;
    return `<li><a href="${asset}.png"><img src="${asset}.webp" width="${width}" height="${height}" loading="lazy" alt="${t[key]}"></a><p>${t[key]}</p></li>`;
  });
  return `    <article class="press">
      <h1>${t.heading}</h1><p class="lede">${t.lede}</p>
      <p><a class="button" href="/press/nvme-monitor-press-kit.zip" download>${t.zip}</a></p>
      <h2>${t.facts}</h2>
      <dl class="press-facts">${facts.map(([label, value]) => `<dt>${label}</dt><dd>${value}</dd>`).join('')}</dl>
      <p><a href="/press/nvme-monitor-fact-sheet.txt" download>${t.factDownload}</a></p>
      <h2>${t.about}</h2><p>${t.aboutBody}</p>
      <h2>${t.screenshots}</h2><p>${t.screenshotIntro}</p>
      <ul class="press-gallery">${gallery.join('')}</ul>
      <h2>${t.icon}</h2>
      <p><img src="/press/nvme-monitor-icon.png" alt="${t.icon}" width="112" height="112" loading="lazy"></p>
      <p><a href="/press/nvme-monitor-icon.png" download>${t.downloadPng}</a> · <a href="/press/nvme-monitor-icon.icns" download>${t.downloadIcns}</a></p>
      <h2>${t.contact}</h2>
      <p><a href="mailto:${email}?subject=NVMe%20Monitor%20press">${email}</a></p>
      <p class="muted">${t.editorial}</p>
    </article>`;
}

const views = { home, support, privacy, press };
const entries = [];
for (const locale of languages) {
  for (const page of pages) {
    const url = route(locale, page);
    const directory = join(publicDir, url);
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, 'index.html'), layout(locale, page, views[page](locale, copy[locale])));
    entries.push(`  <url>\n    <loc>${origin}${url}</loc>\n    ${alternateLinks(page)
      .replaceAll('<link rel', '<xhtml:link rel').replaceAll('">', '"/>').replaceAll('\n  ', '\n    ')}\n  </url>`);
  }
}
await writeFile(join(publicDir, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries.join('\n')}\n</urlset>\n`);
await writeFile(join(publicDir, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);
console.log(`Built ${entries.length} pages in ${languages.length} languages`);
