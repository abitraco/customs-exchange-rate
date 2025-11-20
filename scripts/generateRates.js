import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { XMLParser } from 'fast-xml-parser';

const API_BASE_URL = 'https://apis.data.go.kr/1220000/retrieveTrifFxrtInfo/getRetrieveTrifFxrtInfo';
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(ROOT, '..');
const OUTPUT_PATH = path.join(PROJECT_ROOT, 'public', 'exchange-rates.json');
const WEEK_COUNT = parseInt(process.env.WEEKS_TO_FETCH || '12', 10);

const RateType = {
  EXPORT: '1',
  IMPORT: '2'
};

const SERVICE_KEY = process.env.CUSTOMS_API_KEY || process.env.VITE_SERVICE_KEY || process.env.REACT_APP_SERVICE_KEY || '';
const parser = new XMLParser({ ignoreAttributes: false });

const getRecentSundays = (count) => {
  const dates = [];
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const kstDate = new Date(utc + 9 * 60 * 60 * 1000);
  const lastSunday = new Date(kstDate);
  lastSunday.setDate(kstDate.getDate() - kstDate.getDay());

  for (let i = 0; i < count; i++) {
    const d = new Date(lastSunday);
    d.setDate(lastSunday.getDate() - i * 7);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    dates.push(`${year}${month}${day}`);
  }

  return dates;
};

const formatDateForDisplay = (yyyyMMdd) => `${yyyyMMdd.substring(0, 4)}-${yyyyMMdd.substring(4, 6)}-${yyyyMMdd.substring(6, 8)}`;

const generateMockData = (date, type) => {
  const formattedDate = formatDateForDisplay(date);
  const seed = parseInt(date, 10) % 100;
  const noise = (base) => base + Math.sin(seed) * base * 0.05;
  const typeStr = type === RateType.EXPORT ? 'export' : 'import';

  return [
    { id: `${date}-USD`, countryCode: 'US', currencyName: 'US Dollar', currencyCode: 'USD', rate: noise(1350), date: formattedDate, type: typeStr },
    { id: `${date}-JPY`, countryCode: 'JP', currencyName: 'Japanese Yen', currencyCode: 'JPY', rate: noise(900), date: formattedDate, type: typeStr },
    { id: `${date}-EUR`, countryCode: 'EU', currencyName: 'Euro', currencyCode: 'EUR', rate: noise(1450), date: formattedDate, type: typeStr },
    { id: `${date}-CNY`, countryCode: 'CN', currencyName: 'Chinese Yuan', currencyCode: 'CNY', rate: noise(190), date: formattedDate, type: typeStr },
    { id: `${date}-GBP`, countryCode: 'GB', currencyName: 'British Pound', currencyCode: 'GBP', rate: noise(1700), date: formattedDate, type: typeStr },
    { id: `${date}-HKD`, countryCode: 'HK', currencyName: 'Hong Kong Dollar', currencyCode: 'HKD', rate: noise(172), date: formattedDate, type: typeStr },
    { id: `${date}-CAD`, countryCode: 'CA', currencyName: 'Canadian Dollar', currencyCode: 'CAD', rate: noise(980), date: formattedDate, type: typeStr },
    { id: `${date}-AUD`, countryCode: 'AU', currencyName: 'Australian Dollar', currencyCode: 'AUD', rate: noise(880), date: formattedDate, type: typeStr }
  ];
};

const fetchWeek = async (date, type) => {
  const formattedDate = formatDateForDisplay(date);
  if (!SERVICE_KEY) {
    console.warn(`[generator] SERVICE_KEY missing, using mock data for ${formattedDate} (${type}).`);
    return generateMockData(date, type);
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
      console.warn(`[generator] API returned no data for ${formattedDate} (${type}), using mock.`);
      return generateMockData(date, type);
    }

    return cleaned;
  } catch (error) {
    console.warn(`[generator] Failed to fetch ${formattedDate} (${type}). Falling back to mock.`, error);
    return generateMockData(date, type);
  }
};

const buildDataset = async () => {
  const sundays = getRecentSundays(WEEK_COUNT);
  const weeks = [];

  for (const date of sundays) {
    const [exportRates, importRates] = await Promise.all([
      fetchWeek(date, RateType.EXPORT),
      fetchWeek(date, RateType.IMPORT)
    ]);

    weeks.push({
      startDate: formatDateForDisplay(date),
      export: exportRates,
      import: importRates
    });
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

const main = async () => {
  const dataset = await buildDataset();
  writeDataset(dataset);
};

main().catch((error) => {
  console.error('[generator] Fatal error', error);
  process.exit(1);
});
