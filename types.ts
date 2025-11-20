// Represents a single exchange rate record from the API
export interface ExchangeRateRecord {
    resultCode: string;
    resultMsg: string;
    cntySgn: string; // Country Code (e.g., US)
    mtryUtNm: string; // Currency Name (e.g., United States Dollar)
    fxrt: string; // Exchange Rate (string from XML, needs parsing)
    currSgn: string; // Currency Code (e.g., USD)
    aplyBgnDt: string; // Application Start Date (YYYYMMDD)
    imexTp: string; // '1' for Export, '2' for Import
}

// Cleaned up internal model
export interface RateData {
    id: string;
    countryCode: string;
    currencyName: string;
    currencyCode: string;
    rate: number;
    date: string; // YYYY-MM-DD format for UI
    type: 'export' | 'import';
}

export interface RateWeek {
    startDate: string; // YYYY-MM-DD (Sunday start)
    import: RateData[];
    export: RateData[];
}

export interface RateDataset {
    generatedAt: string; // ISO timestamp
    source?: string;
    weeks: RateWeek[];
}

export enum RateType {
    EXPORT = '1',
    IMPORT = '2'
}

export type Language = 'KO' | 'EN';

export interface ApiConfig {
    serviceKey: string;
}

// For Charting
export interface ChartDataPoint {
    date: string;
    USD?: number;
    JPY?: number;
    EUR?: number;
    CNY?: number;
    [key: string]: number | string | undefined;
}
