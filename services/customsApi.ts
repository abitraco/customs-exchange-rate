import { RateDataset, RateData, RateType } from '../types';

const DATA_URL = '/exchange-rates.json';

const normalizeEntry = (entry: any, type: 'export' | 'import', fallbackDate: string): RateData => {
    return {
        id: entry.id || `${fallbackDate}-${entry.currencyCode || entry.currSgn || 'UNKNOWN'}-${type}`,
        countryCode: entry.countryCode || entry.cntySgn || '',
        currencyName: entry.currencyName || entry.mtryUtNm || '',
        currencyCode: entry.currencyCode || entry.currSgn || '',
        rate: typeof entry.rate === 'number' ? entry.rate : Number(entry.rate || 0),
        date: entry.date || fallbackDate,
        type
    };
};

export const fetchRateDataset = async (): Promise<RateDataset> => {
    const response = await fetch(DATA_URL, { cache: 'no-store' });

    if (!response.ok) {
        throw new Error(`Failed to load local rate dataset (${response.status})`);
    }

    const raw = await response.json();
    const weeksRaw = Array.isArray(raw.weeks) ? raw.weeks : [];

    const weeks = weeksRaw.map((week: any) => {
        const startDate = week.startDate || week.date || '';
        return {
            startDate,
            import: Array.isArray(week.import) ? week.import.map((entry: any) => normalizeEntry(entry, 'import', startDate)) : [],
            export: Array.isArray(week.export) ? week.export.map((entry: any) => normalizeEntry(entry, 'export', startDate)) : []
        };
    });

    return {
        generatedAt: raw.generatedAt || '',
        source: raw.source,
        weeks
    };
};

export const pickRatesByType = (dataset: RateDataset, type: RateType): RateData[][] => {
    const key = type === RateType.EXPORT ? 'export' : 'import';
    return dataset.weeks.map((week) => week[key]);
};
