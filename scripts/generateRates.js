import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { XMLParser } from 'fast-xml-parser';

const API_BASE_URL = 'https://apis.data.go.kr/1220000/retrieveTrifFxrtInfo/getRetrieveTrifFxrtInfo';
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(ROOT, '..');
const OUTPUT_PATH = path.join(PROJECT_ROOT, 'public', 'exchange-rates.json');
const TABLE_OUTPUTS = [
  path.join(PROJECT_ROOT, 'public', 'table.html'),
  path.join(PROJECT_ROOT, 'public', 'table', 'index.html')
];
const IMPORTANT_CODES = ['USD', 'EUR', 'CNY', 'JPY'];
const WEEK_COUNT = parseInt(process.env.WEEKS_TO_FETCH || '12', 10);

const RateType = {
  EXPORT: '1',
  IMPORT: '2'
};

const loadEnvFile = () => {
  const envPath = path.join(PROJECT_ROOT, '.env');
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, 'utf-8').split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.trim().startsWith('#')) continue;
    const match = line.match(/^\s*([^=\s#]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const key = match[1];
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
};

loadEnvFile();

const SERVICE_KEY = process.env.CUSTOMS_API_KEY || process.env.VITE_SERVICE_KEY || process.env.REACT_APP_SERVICE_KEY || '';
const parser = new XMLParser({ ignoreAttributes: false });

const getRecentSundays = (count) => {
  const dates = [];
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const kstDate = new Date(utc + 9 * 60 * 60 * 1000);

  // 이번 주 일요일 계산 (오늘이 토요일이면 내일 일요일 포함)
  const dayOfWeek = kstDate.getDay(); // 0=일, 1=월, ..., 6=토
  const thisSunday = new Date(kstDate);
  thisSunday.setDate(kstDate.getDate() + (7 - dayOfWeek) % 7); // 이번 주 일요일 (일요일이면 오늘)

  for (let i = 0; i < count; i++) {
    const d = new Date(thisSunday);
    d.setDate(thisSunday.getDate() - i * 7);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    dates.push(`${year}${month}${day}`);
  }

  return dates;
};

const formatDateForDisplay = (yyyyMMdd) => `${yyyyMMdd.substring(0, 4)}-${yyyyMMdd.substring(4, 6)}-${yyyyMMdd.substring(6, 8)}`;

const loadExistingData = () => {
  if (fs.existsSync(OUTPUT_PATH)) {
    try {
      const raw = fs.readFileSync(OUTPUT_PATH, 'utf-8');
      return JSON.parse(raw);
    } catch (e) {
      console.warn('[generator] Failed to load existing data:', e);
    }
  }
  return { weeks: [] };
};

const fetchWeek = async (date, type) => {
  const formattedDate = formatDateForDisplay(date);
  if (!SERVICE_KEY) {
    console.warn(`[generator] SERVICE_KEY missing, skipping ${formattedDate} (${type}).`);
    return null;
  }

  const params = new URLSearchParams({
    serviceKey: SERVICE_KEY,
    aplyBgnDt: date,
    weekFxrtTpcd: type
  });

  try {
    const response = await fetch(`${API_BASE_URL}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const xmlText = await response.text();
    const parsed = parser.parse(xmlText);
    const items = parsed?.response?.body?.items?.item || [];
    const list = Array.isArray(items) ? items : [items];

    const cleaned = list
      .map((item) => ({
        id: `${item.aplyBgnDt}-${item.currSgn}-${item.imexTp}`,
        countryCode: item.cntySgn,
        currencyName: item.mtryUtNm,
        currencyCode: item.currSgn,
        rate: Number(item.fxrt),
        date: formattedDate,
        type: type === RateType.EXPORT ? 'export' : 'import'
      }))
      .filter((row) => !Number.isNaN(row.rate));

    if (!cleaned.length) {
      console.warn(`[generator] API returned no data for ${formattedDate} (${type}).`);
      return null;
    }

    return cleaned;
  } catch (error) {
    console.warn(`[generator] Failed to fetch ${formattedDate} (${type}).`, error);
    return null;
  }
};

const buildDataset = async () => {
  const sundays = getRecentSundays(WEEK_COUNT);
  const existingData = loadExistingData();
  const existingWeeksMap = new Map();

  if (existingData && Array.isArray(existingData.weeks)) {
    for (const week of existingData.weeks) {
      existingWeeksMap.set(week.startDate, week);
    }
  }

  const weeks = [];

  for (const date of sundays) {
    const formattedDate = formatDateForDisplay(date);

    // Try fetching fresh data
    const [exportRates, importRates] = await Promise.all([
      fetchWeek(date, RateType.EXPORT),
      fetchWeek(date, RateType.IMPORT)
    ]);

    if (exportRates && importRates) {
      // Both succeeded
      weeks.push({
        startDate: formattedDate,
        export: exportRates,
        import: importRates
      });
    } else {
      // Failed to fetch one or both. Check existing data.
      const existingWeek = existingWeeksMap.get(formattedDate);
      if (existingWeek) {
        console.log(`[generator] Using existing data for ${formattedDate} due to API failure/empty.`);
        weeks.push(existingWeek);
      } else {
        console.warn(`[generator] No data available for ${formattedDate} (API failed and no existing data). Skipping.`);
      }
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    source: 'Korea Customs Service (static snapshot)',
    weeks
  };
};

const writeDataset = (payload) => {
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(payload, null, 2), 'utf-8');
  console.log(`[generator] Wrote ${payload.weeks.length} weeks to ${OUTPUT_PATH}`);
};

const escapeHtml = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const pickImportantRates = (list) => {
  const map = new Map();
  for (const code of IMPORTANT_CODES) {
    const hit = list.find((r) => (r.currencyCode || '').toUpperCase() === code);
    if (hit) {
      map.set(code, hit);
    }
  }
  return IMPORTANT_CODES.map((code) => map.get(code)).filter(Boolean);
};

const buildRatesTable = (title, rates) => {
  const rows = pickImportantRates(rates)
    .map((r) => `
          <tr>
            <td>${escapeHtml(r.currencyName)}</td>
            <td>${escapeHtml(r.currencyCode)}</td>
            <td class="number">${escapeHtml(r.rate)}</td>
          </tr>`)
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

const writeTableHtml = (payload) => {
  if (!Array.isArray(payload.weeks) || payload.weeks.length === 0) {
    console.warn('[generator] No weeks available, skipping table.html write.');
    return;
  }

  const latest = payload.weeks[0];
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
    <p class="meta">적용 시작일: ${escapeHtml(latest.startDate || '')} · 생성시각: ${escapeHtml(payload.generatedAt || '')}</p>
  </header>
${exportSection}
${importSection}
</body>
</html>`;

  for (const target of TABLE_OUTPUTS) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, html, 'utf-8');
    console.log(`[generator] Wrote latest table view to ${target}`);
  }
};

const main = async () => {
  const dataset = await buildDataset();
  writeDataset(dataset);
  writeTableHtml(dataset);
};

main().catch((error) => {
  console.error('[generator] Fatal error', error);
  process.exit(1);
});
