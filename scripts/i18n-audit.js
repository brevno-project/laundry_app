const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const uiPath = path.join(projectRoot, 'src', 'contexts', 'UiContext.tsx');

function readFile(p) {
  return fs.readFileSync(p, 'utf8');
}

const ui = readFile(uiPath).replace(/\r\n/g, "\n");
const langs = ['ru', 'en', 'ko', 'ky'];

function segment(lang) {
  const idx = langs.indexOf(lang);
  if (idx < 0) throw new Error(`unknown lang ${lang}`);

  const translationsPos = ui.indexOf('const translations');
  if (translationsPos < 0) throw new Error('const translations not found');

  const translationsEnd = ui.indexOf('\n};', translationsPos);
  if (translationsEnd < 0) throw new Error('end of translations object not found');

  const slice = ui.slice(translationsPos, translationsEnd + 3);

  const re = /\n\s*(ru|en|ko|ky)\s*:\s*\{/g;
  const starts = [];
  let m;
  while ((m = re.exec(slice))) {
    starts.push({ lang: m[1], start: m.index + m[0].length });
  }

  const mine = starts.find((s) => s.lang === lang);
  if (!mine) throw new Error(`language block not found: ${lang}`);

  const sorted = starts.slice().sort((a, b) => a.start - b.start);
  const posInSorted = sorted.findIndex((s) => s.lang === lang);
  const end = posInSorted >= 0 && posInSorted < sorted.length - 1 ? sorted[posInSorted + 1].start : slice.length;

  let body = slice.slice(mine.start, end);
  body = body.replace(/\n\s*\}\s*,?\s*$/m, '');
  return body;
}

function keysOf(txt) {
  const re = /\n\s*"([^"]+)"\s*:/g;
  const set = new Set();
  let m;
  while ((m = re.exec(txt))) set.add(m[1]);
  return set;
}

const dict = {};
for (const l of langs) dict[l] = keysOf(segment(l));

const ru = dict.ru;

console.log('== Missing translations compared to ru ==');
for (const l of ['en', 'ko', 'ky']) {
  const miss = [...ru].filter((k) => !dict[l].has(k));
  console.log(`${l}: ${miss.length}`);
  if (miss.length) console.log(`  sample: ${miss.slice(0, 50).join(',')}`);
}

function walk(dir, out) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith('.')) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|js|jsx)$/.test(ent.name)) out.push(p);
  }
}

const files = [];
walk(path.join(projectRoot, 'src'), files);

const used = new Set();
const tre = /\bt\(\s*["']([^"']+)["']/g;

for (const f of files) {
  const s = readFile(f);
  let m;
  while ((m = tre.exec(s))) used.add(m[1]);
}

const missingInRu = [...used].filter((k) => !ru.has(k));

console.log('\n== Used keys not present in translations.ru ==');
console.log(`missing_in_ru: ${missingInRu.length}`);
if (missingInRu.length) console.log(`  keys: ${missingInRu.slice(0, 120).join(',')}`);

console.log('\n== Missing used keys per language (only for keys that exist in ru) ==');
for (const l of ['en', 'ko', 'ky']) {
  const miss = [...used].filter((k) => ru.has(k) && !dict[l].has(k));
  console.log(`${l}: ${miss.length}`);
  if (miss.length) console.log(`  keys: ${miss.slice(0, 120).join(',')}`);
}
