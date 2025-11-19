import { ExchangeRateRecord, RateData, RateType } from '../types';
import { formatDateForDisplay } from '../utils/dateUtils';

const API_BASE_URL = 'https://apis.data.go.kr/1220000/retrieveTrifFxrtInfo/getRetrieveTrifFxrtInfo';

// API Key Management
// The API key must be set in the local .env file.
// Do NOT hardcode keys here for public repositories.
//
// VITE_SERVICE_KEY=your_decoded_key_here
// or
// REACT_APP_SERVICE_KEY=your_decoded_key_here

// @ts-ignore - import.meta is a valid property in modern bundlers like Vite
const ENV_KEY_VITE = import.meta && import.meta.env ? import.meta.env.VITE_SERVICE_KEY : undefined;
const ENV_KEY_REACT = typeof process !== 'undefined' && process.env ? process.env.REACT_APP_SERVICE_KEY : undefined;

const SERVICE_KEY = ENV_KEY_VITE || ENV_KEY_REACT || '';

const CACHE_PREFIX = 'customs_fx_cache_v1_';

export const fetchWeeklyRates = async (date: string, type: RateType, allowMock: boolean = true): Promise<RateData[]> => {
    // 1. Check Local Cache
    const cacheKey = `${CACHE_PREFIX}${date}_${type}`;
    const cachedData = localStorage.getItem(cacheKey);
    
    if (cachedData) {
        try {
            const parsed = JSON.parse(cachedData);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed;
            }
        } catch (e) {
            console.warn("Cache parse error, fetching fresh data.");
            localStorage.removeItem(cacheKey);
        }
    }

    // 2. Check API Key availability
    if (!SERVICE_KEY) {
        console.warn("API Key is missing in environment variables. Falling back to mock data. Please configure .env file.");
        if (!allowMock) return [];
        return generateMockData(date, type);
    }

    // 3. Fetch from API if not in cache and Key exists
    const params = new URLSearchParams();
    params.append('serviceKey', SERVICE_KEY);
    params.append('aplyBgnDt', date);
    params.append('weekFxrtTpcd', type);

    try {
        // Note: Direct calls to apis.data.go.kr often fail due to CORS in pure client-side apps.
        const response = await fetch(`${API_BASE_URL}?${params.toString()}`);
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const xmlText = await response.text();
        const data = parseXmlResponse(xmlText);

        // 4. Save to Cache if data is valid
        if (data.length > 0) {
            localStorage.setItem(cacheKey, JSON.stringify(data));
        } else if (!allowMock) {
            // If we don't allow mock and data is empty, return empty (e.g. for polling checks)
            return [];
        } else if (data.length === 0) {
             // XML parsed but no items found (could be error response in XML)
             console.warn("API returned valid XML but 0 items. Falling back to mock.");
             return generateMockData(date, type);
        }

        return data;

    } catch (error) {
        if (!allowMock) {
            console.warn(`Fetch failed for new date ${date}. Not using mock data.`);
            return [];
        }
        console.warn(`Fetch failed for date ${date} (likely CORS or Network). Returning mock data for demo.`, error);
        // We do NOT cache mock data to allow real data to load later if connection is fixed
        return generateMockData(date, type);
    }
};

const parseXmlResponse = (xmlText: string): RateData[] => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    
    const items = xmlDoc.getElementsByTagName("item");
    const results: RateData[] = [];

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const getVal = (tag: string) => item.getElementsByTagName(tag)[0]?.textContent || '';

        const rate = parseFloat(getVal('fxrt'));
        if (!isNaN(rate)) {
            results.push({
                id: `${getVal('aplyBgnDt')}-${getVal('currSgn')}-${getVal('imexTp')}`,
                countryCode: getVal('cntySgn'),
                currencyName: getVal('mtryUtNm'),
                currencyCode: getVal('currSgn'),
                rate: rate,
                date: formatDateForDisplay(getVal('aplyBgnDt')),
                type: getVal('imexTp') === '1' ? 'export' : 'import'
            });
        }
    }
    return results;
};

// Fallback mock data generator to ensure the UI works without a backend proxy for CORS
const generateMockData = (date: string, type: RateType): RateData[] => {
    const formattedDate = formatDateForDisplay(date);
    // Simulate slight variations based on date hash to make graphs look real
    const seed = parseInt(date) % 100; 
    const noise = (base: number) => base + (Math.sin(seed) * base * 0.05);

    const typeStr = type === RateType.EXPORT ? 'export' : 'import';

    return [
        { id: `${date}-USD`, countryCode: 'US', currencyName: 'US Dollar', currencyCode: 'USD', rate: noise(1350), date: formattedDate, type: typeStr },
        { id: `${date}-JPY`, countryCode: 'JP', currencyName: 'Japanese Yen', currencyCode: 'JPY', rate: noise(900), date: formattedDate, type: typeStr },
        { id: `${date}-EUR`, countryCode: 'EU', currencyName: 'Euro', currencyCode: 'EUR', rate: noise(1450), date: formattedDate, type: typeStr },
        { id: `${date}-CNY`, countryCode: 'CN', currencyName: 'Chinese Yuan', currencyCode: 'CNY', rate: noise(190), date: formattedDate, type: typeStr },
        { id: `${date}-GBP`, countryCode: 'GB', currencyName: 'British Pound', currencyCode: 'GBP', rate: noise(1700), date: formattedDate, type: typeStr },
        { id: `${date}-HKD`, countryCode: 'HK', currencyName: 'Hong Kong Dollar', currencyCode: 'HKD', rate: noise(172), date: formattedDate, type: typeStr },
        { id: `${date}-CAD`, countryCode: 'CA', currencyName: 'Canadian Dollar', currencyCode: 'CAD', rate: noise(980), date: formattedDate, type: typeStr },
        { id: `${date}-AUD`, countryCode: 'AU', currencyName: 'Australian Dollar', currencyCode: 'AUD', rate: noise(880), date: formattedDate, type: typeStr },
    ];
};