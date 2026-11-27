#!/usr/bin/env node
// Genera la versió estàtica en castellà (es/index.html) a partir d'index.html i del
// diccionari I18N que hi ha al seu <script>, i refresca les dades estructurades (JSON-LD)
// de les dues pàgines i el sitemap.xml. Sense dependències: només Node >= 18.
//
//   node tools/build-es.mjs                     # genera es/index.html, JSON-LD i sitemap (lastmod = avui)
//   node tools/build-es.mjs --lastmod=2026-12-01
//   node tools/build-es.mjs --check             # no escriu res; surt amb codi 1 si cal regenerar
//
// index.html és la font: el contingut en català s'hi edita directament i el castellà, al
// diccionari I18N.es del mateix fitxer (claus data-i18n / data-i18n-attr).

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://gohan.cat/';
const PAGES = { ca: SITE, es: SITE + 'es/' };
const ARGS = process.argv.slice(2);
const CHECK = ARGS.includes('--check');
const LASTMOD = (ARGS.find(a => a.startsWith('--lastmod=')) || '').split('=')[1] || localDate();

// Metadades dels projectes que no surten del text visible (clau: URL del botó «Obre l'app»).
const PROJECT_META = {
  'https://overmanaging.gohan.cat/': { type: 'VideoGame', category: 'GameApplication', free: true, players: [1, 2], playMode: ['SinglePlayer', 'CoOp'], languages: ['ca', 'es'] },
  'https://overworking.gohan.cat/': { type: 'VideoGame', category: 'GameApplication', free: true, players: [1, 2], playMode: ['SinglePlayer', 'CoOp'] },
  'https://cost-ledger.gohan.cat/': { type: 'WebApplication', category: 'FinanceApplication', free: true, alternateName: 'Casa en orden' },
  'https://viajarconcamper.com/': { type: 'WebSite', free: false, languages: ['es', 'en'] },
};
const PERSON = {
  '@type': 'Person',
  '@id': SITE + '#ivan-pico',
  name: 'Ivan Picó',
  url: 'https://ivanpico.com/',
  sameAs: ['https://www.linkedin.com/in/ivanpico', 'https://github.com/ivan-pico', 'https://ivanpico.com/'],
};
const person = dict => ({ ...PERSON, jobTitle: dict['person.job'], description: stripTags(dict['about.p3']) });

function localDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const fail = msg => { console.error('build-es: ' + msg); process.exit(2); };

// ---------- Diccionari ----------
function extractI18N(html) {
  const start = html.indexOf('var I18N = {');
  if (start < 0) fail("no s'ha trobat 'var I18N = {' a index.html");
  let i = html.indexOf('{', start), depth = 0, quote = null;
  for (; i < html.length; i++) {
    const c = html[i];
    if (quote) { if (c === '\\') i++; else if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'" || c === '`') quote = c;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) break;
  }
  const src = html.slice(html.indexOf('{', start), i + 1);
  return vm.runInNewContext('(' + src + ')', {});
}

// ---------- Utilitats HTML (el marcatge d'index.html és regular i el controlem nosaltres) ----------
const escAttr = v => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const stripTags = v => String(v).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

function setAttr(tag, name, value) {
  const re = new RegExp(`(\\s${name}=)"[^"]*"`);
  if (re.test(tag)) return tag.replace(re, `$1"${escAttr(value)}"`);
  return tag.replace(/\s*(\/?)>$/, ` ${name}="${escAttr(value)}"$1>`);
}
const getAttr = (tag, name) => { const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`)); return m ? m[1] : null; };

// Divideix el document en trossos de marcatge i blocs <script>/<style> (que no es toquen).
function mapMarkup(html, fn) {
  const re = /<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi;
  let out = '', last = 0, m;
  while ((m = re.exec(html))) { out += fn(html.slice(last, m.index)) + m[0]; last = re.lastIndex; }
  return out + fn(html.slice(last));
}

// Substitueix el contingut de cada element amb data-i18n="clau" (equivalent a innerHTML).
function replaceI18nContent(html, dict) {
  const open = /<([a-zA-Z][\w-]*)\b[^>]*\sdata-i18n="([^"]+)"[^>]*>/g;
  let m;
  while ((m = open.exec(html))) {
    const [tag, name, key] = m;
    if (dict[key] == null) { console.warn(`build-es: falta la clau «${key}» al diccionari`); continue; }
    const from = m.index + tag.length;
    const scan = new RegExp(`<(/?)${name}\\b[^>]*>`, 'g');
    scan.lastIndex = from;
    let depth = 1, t;
    while ((t = scan.exec(html))) { depth += t[1] ? -1 : 1; if (depth === 0) break; }
    if (!t) fail(`element <${name} data-i18n="${key}"> sense tancar`);
    html = html.slice(0, from) + dict[key] + html.slice(t.index);
    open.lastIndex = from + String(dict[key]).length;
  }
  return html;
}

function replaceI18nAttrs(html, dict) {
  return html.replace(/<[a-zA-Z][\w-]*\b[^>]*\sdata-i18n-attr="([^"]+)"[^>]*>/g, (tag, spec) => {
    for (const pair of spec.split(';')) {
      const [attr, key] = pair.split(':').map(s => s && s.trim());
      if (!attr || !key) continue;
      if (dict[key] == null) { console.warn(`build-es: falta la clau «${key}» al diccionari`); continue; }
      tag = setAttr(tag, attr, dict[key]);
    }
    return tag;
  });
}

function formatDate(iso, lang) {
  const [y, mo, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, mo - 1, d)));
}

// Converteix una URL relativa a l'arrel en relativa a /es/.
function rebaseUrl(u) {
  if (!u || /^(?:[a-z][a-z0-9+.-]*:|\/\/|\/|#)/i.test(u)) return u;
  const abs = new URL(u, 'https://x/');
  const path = abs.pathname.startsWith('/es/') ? './' + abs.pathname.slice(4) : '../' + abs.pathname.slice(1);
  return path + abs.search + abs.hash;
}
function rebaseUrls(markup) {
  return markup
    .replace(/(\s(?:href|src)=")([^"]*)"/g, (_, a, u) => `${a}${rebaseUrl(u)}"`)
    .replace(/(\ssrcset=")([^"]*)"/g, (_, a, v) => a + v.split(',').map(part => {
      const [u, ...rest] = part.trim().split(/\s+/);
      return [rebaseUrl(u), ...rest].join(' ');
    }).join(', ') + '"');
}

// ---------- Dades estructurades ----------
function readContent(html) {
  const projects = [];
  for (const [card] of html.matchAll(/<article class="card">[\s\S]*?<\/article>/g)) {
    const img = card.match(/<img\b[^>]*>/)[0];
    const srcset = getAttr(img, 'srcset');
    const best = srcset ? srcset.split(',').map(s => s.trim().split(/\s+/)).sort((a, b) => parseInt(b[1]) - parseInt(a[1]))[0][0] : getAttr(img, 'src');
    const url = (card.match(/class="card-open" href="([^"]+)"/) || [])[1];
    projects.push({
      name: stripTags(card.match(/<h3>([\s\S]*?)(?:<small|<\/h3>)/)[1]),
      descKey: card.match(/<p data-i18n="([\w.]+\.card)"/)[1],
      image: new URL(best, SITE).href,
      url,
      kind: /class="tag game"/.test(card) ? 'game' : 'app',
      newsId: (card.match(/href="#(noticia-[\w-]+)"/) || [])[1],
      meta: PROJECT_META[url] || {},
    });
  }
  const news = [];
  for (const [post] of html.matchAll(/<article class="post" id="[^"]+"[\s\S]*?<\/article>/g)) {
    news.push({
      id: post.match(/id="([^"]+)"/)[1],
      date: post.match(/<time datetime="([^"]+)"/)[1],
      titleKey: post.match(/<h3[^>]*data-i18n="([^"]+)"/)[1],
      sumKey: (post.match(/<p data-i18n="([\w.]+\.sum)"/) || [])[1],
    });
  }
  if (!projects.length || !news.length) fail("no s'han trobat targetes de projecte o notícies a index.html");
  return { projects, news };
}

// Data ISO 8601 amb hora i zona (Europe/Madrid), com demana Google: 2026-11-26 -> 2026-11-26T12:00:00+01:00
const lastSunday = (y, m) => { const d = new Date(Date.UTC(y, m + 1, 0)); return d.getUTCDate() - d.getUTCDay(); };
function isoDateTime(d) {
  if (!d || d.includes('T')) return d;
  const [y, m, day] = d.split('-').map(Number);
  const summer = (m > 3 && m < 10) || (m === 3 && day >= lastSunday(y, 2)) || (m === 10 && day < lastSunday(y, 9));
  return `${d}T12:00:00${summer ? '+02:00' : '+01:00'}`;
}

function buildJsonLd(content, dict, lang) {
  const page = PAGES[lang];
  const ogImage = dict['meta.ogimage'] || SITE + 'img/og-image.png';
  const projId = p => page + '#projecte-' + (p.newsId ? p.newsId.replace(/^noticia-/, '') : p.name.toLowerCase().replace(/\W+/g, '-'));
  const projects = content.projects.map(p => {
    const m = p.meta;
    const o = {
      '@type': m.type || (p.kind === 'game' ? 'VideoGame' : 'WebApplication'),
      '@id': projId(p),
      name: p.name,
      url: p.url,
      description: stripTags(dict[p.descKey]),
      image: p.image,
      author: { '@id': PERSON['@id'] },
      creator: { '@id': PERSON['@id'] },
    };
    if (o['@type'] !== 'WebSite') {
      o.applicationCategory = m.category || (p.kind === 'game' ? 'GameApplication' : 'WebApplication');
      o.operatingSystem = 'Web';
    }
    if (m.alternateName) o.alternateName = m.alternateName;
    if (m.languages) o.inLanguage = m.languages;
    if (o['@type'] === 'VideoGame') {
      o.gamePlatform = 'Web browser';
      if (m.playMode) o.playMode = m.playMode;
      if (m.players) o.numberOfPlayers = { '@type': 'QuantitativeValue', minValue: m.players[0], maxValue: m.players[1] };
    }
    if (m.free) o.offers = { '@type': 'Offer', price: '0', priceCurrency: 'EUR', availability: 'https://schema.org/InStock' };
    return o;
  });
  const byNews = Object.fromEntries(content.projects.filter(p => p.newsId).map((p, i) => [p.newsId, { p, id: projects[i]['@id'] }]));
  const posts = content.news.map(n => {
    const rel = byNews[n.id];
    const o = {
      '@type': 'BlogPosting',
      '@id': page + '#' + n.id,
      url: page + '#' + n.id,
      headline: stripTags(dict[n.titleKey]),
      datePublished: isoDateTime(n.date),
      dateModified: isoDateTime(n.date),
      inLanguage: lang,
      author: { '@id': PERSON['@id'] },
      publisher: { '@id': PERSON['@id'] },
      image: rel ? rel.p.image : ogImage,
      mainEntityOfPage: { '@id': page + '#webpage' },
      isPartOf: { '@id': page + '#webpage' },
    };
    if (n.sumKey) o.description = stripTags(dict[n.sumKey]);
    if (rel) o.about = { '@id': rel.id };
    return o;
  });
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': SITE + '#website',
        url: SITE,
        name: 'GoHan Cat',
        alternateName: ['gohan.cat', 'GoHan Cat ご飯'],
        description: dict['meta.site'],
        inLanguage: ['ca', 'es'],
        author: { '@id': PERSON['@id'] },
        creator: { '@id': PERSON['@id'] },
        publisher: { '@id': PERSON['@id'] },
      },
      person(dict),
      {
        '@type': 'WebPage',
        '@id': page + '#webpage',
        url: page,
        name: dict['meta.title'],
        description: dict['meta.desc'],
        inLanguage: lang,
        isPartOf: { '@id': SITE + '#website' },
        author: { '@id': PERSON['@id'] },
        about: { '@id': PERSON['@id'] },
        primaryImageOfPage: { '@type': 'ImageObject', url: ogImage, width: 1200, height: 630 },
        mainEntity: { '@id': page + '#projectes' },
        dateModified: isoDateTime(LASTMOD),
      },
      {
        '@type': 'ItemList',
        '@id': page + '#projectes',
        name: stripTags(dict['projects.title']),
        numberOfItems: projects.length,
        itemListElement: projects.map((item, i) => ({ '@type': 'ListItem', position: i + 1, item })),
      },
      ...posts,
    ],
  };
}

function injectJsonLd(html, data) {
  const json = JSON.stringify(data, null, 1).replace(/</g, '\\u003c');
  const re = /(<script type="application\/ld\+json" id="dades-estructurades">)[\s\S]*?(<\/script>)/;
  if (!re.test(html)) fail('falta <script type="application/ld+json" id="dades-estructurades"> a index.html');
  return html.replace(re, (_, a, b) => a + '\n' + json + '\n' + b);
}

// Conserva el dateModified/lastmod anterior si el contingut no ha canviat (evita diffs buits).
const normalize = s => s.replace(/"dateModified": "[^"]*"/g, '');

// ---------- Generació ----------
const indexPath = join(ROOT, 'index.html');
const esPath = join(ROOT, 'es', 'index.html');
const sitemapPath = join(ROOT, 'sitemap.xml');
const read = p => (existsSync(p) ? readFileSync(p, 'utf8') : '');

const source = read(indexPath);
const I18N = extractI18N(source);
const content = readContent(source);
const es = I18N.es;

const newIndex = injectJsonLd(source, buildJsonLd(content, I18N.ca, 'ca'));

let out = injectJsonLd(source, buildJsonLd(content, es, 'es'));
out = out.replace('<html lang="ca">', '<html lang="es">');
out = out.replace(/^<!doctype html>\n/i, '<!doctype html>\n<!-- Fitxer generat per tools/build-es.mjs a partir de ../index.html: no l\'editis a mà. -->\n');
out = mapMarkup(out, markup => {
  markup = replaceI18nContent(markup, es);
  markup = replaceI18nAttrs(markup, es);
  markup = markup.replace(/(<time datetime="([^"]+)" data-i18n-date>)[^<]*(<\/time>)/g, (_, a, iso, b) => a + formatDate(iso, 'es') + b);
  markup = markup.replace(/(<a\b[^>]*data-lang="(ca|es)"[^>]*>)/g, (tag, _t, l) => {
    tag = tag.replace(/\saria-current="[^"]*"/, '');
    return l === 'es' ? tag.replace(/>$/, ' aria-current="page">') : tag;
  });
  return rebaseUrls(markup);
});

function sitemap(lastmod) {
  const alts = Object.entries(PAGES).map(([l, u]) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${u}"/>`)
    .concat(`    <xhtml:link rel="alternate" hreflang="x-default" href="${PAGES.ca}"/>`).join('\n');
  const urls = Object.values(PAGES).map(u => `  <url>\n    <loc>${u}</loc>\n    <lastmod>${lastmod}</lastmod>\n${alts}\n  </url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`;
}

const oldIndex = source, oldEs = read(esPath), oldSitemap = read(sitemapPath);
const changed = normalize(newIndex) !== normalize(oldIndex) || normalize(out) !== normalize(oldEs) || !oldSitemap;
const finalIndex = changed ? newIndex : oldIndex;
const finalEs = changed ? out : oldEs;
const finalSitemap = changed ? sitemap(LASTMOD) : oldSitemap;

if (CHECK) {
  if (changed) { console.error('build-es: es/index.html, el JSON-LD o el sitemap no estan al dia. Executa: node tools/build-es.mjs'); process.exit(1); }
  console.log('build-es: tot al dia.');
  process.exit(0);
}
if (!changed) { console.log('build-es: sense canvis de contingut; no s\'ha tocat res.'); process.exit(0); }
writeFileSync(indexPath, finalIndex);
mkdirSync(dirname(esPath), { recursive: true });
writeFileSync(esPath, finalEs);
writeFileSync(sitemapPath, finalSitemap);
console.log(`build-es: generats es/index.html, JSON-LD (ca, es) i sitemap.xml (lastmod ${LASTMOD}).`);
