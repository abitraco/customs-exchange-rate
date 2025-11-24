import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(ROOT, '..');
const SOURCE_PATH = path.join(PROJECT_ROOT, 'public', 'exchange-rates.json');
const TABLE_OUTPUTS = [
  path.join(PROJECT_ROOT, 'public', 'table.html'),
  path.join(PROJECT_ROOT, 'public', 'table', 'index.html')
];
const IMPORTANT_CODES = ['USD', 'EUR', 'CNY', 'JPY'];

const escapeHtml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const pickImportantRates = (list) => {
  const map = new Map();
  for (const code of IMPORTANT_CODES) {
    const hit = list.find((r) => (r.currencyCode || '').toUpperCase() === code);
    if (hit) map.set(code, hit);
  }
  return IMPORTANT_CODES.map((code) => map.get(code)).filter(Boolean);
};

const buildRatesTable = (title, rates) => {
  const rows = pickImportantRates(rates)
    .map(
      (r) => `
          <tr>
            <td>${escapeHtml(r.currencyName)}</td>
            <td>${escapeHtml(r.currencyCode)}</td>
            <td class="number">${escapeHtml(r.rate)}</td>
          </tr>`
    )
    .join('\n');

  return `
      <section>
        <h2>${escapeHtml(title)}</h2>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>통화명</th>
                <th>통화코드</th>
                <th>환율 (KRW)</th>
              </tr>
            </thead>
            <tbody>
${rows}
            </tbody>
          </table>
        </div>
      </section>`;
};

const main = () => {
  if (!fs.existsSync(SOURCE_PATH)) {
    throw new Error(`Missing source file: ${SOURCE_PATH}`);
  }

  const raw = JSON.parse(fs.readFileSync(SOURCE_PATH, 'utf-8'));
  const latest = Array.isArray(raw.weeks) && raw.weeks.length > 0 ? raw.weeks[0] : null;

  if (!latest) {
    throw new Error('No weeks found in exchange-rates.json');
  }

  const exportSection = buildRatesTable('수출 환율', latest.export || []);
  const importSection = buildRatesTable('수입 환율', latest.import || []);

  const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <title>관세청 환율 테이블</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" href="/favicon.ico">
  <link rel="icon" type="image/png" href="/favicon.png">
  <style>
    :root { color-scheme: light; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 24px; background: #f7f9fb; color: #111; }
    header { margin-bottom: 24px; }
    h1 { margin: 0 0 8px; font-size: 24px; }
    p.meta { margin: 0; color: #555; font-size: 14px; }
    section { margin-bottom: 32px; }
    h2 { margin: 0 0 12px; font-size: 18px; }
    .table-wrapper { overflow-x: auto; background: #fff; border: 1px solid #dde3ea; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.04); }
    table { width: 100%; border-collapse: collapse; min-width: 320px; }
    th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #eef2f6; }
    th { background: #f0f4f8; font-weight: 600; }
    tr:last-child td { border-bottom: none; }
    .number { text-align: right; font-variant-numeric: tabular-nums; }
  </style>
</head>
<body>
  <header>
    <h1>관세청 주간 환율 테이블</h1>
    <p class="meta">적용 시작일: ${escapeHtml(latest.startDate || '')} · 생성시각: ${escapeHtml(raw.generatedAt || '')}</p>
  </header>
${exportSection}
${importSection}
</body>
</html>`;

  for (const target of TABLE_OUTPUTS) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, html, 'utf-8');
    console.log(`[table] Wrote table view to ${target}`);
  }
};

main();
