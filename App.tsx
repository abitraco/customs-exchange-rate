import React, { useEffect, useState, useMemo, useRef } from 'react';
import { RateType, RateData, ChartDataPoint, Language } from './types';
import { fetchWeeklyRates } from './services/customsApi';
import { getRecentSundays, getNextWeekSundayIfApplicable, formatDateForDisplay } from './utils/dateUtils';
import Header from './components/Header';
import StatCard from './components/StatCard';
import RateChart from './components/RateChart';
import RateTable from './components/RateTable';
import { Info } from 'lucide-react';

// Translation Dictionary
const TRANSLATIONS = {
  KO: {
    header: { title: '과세환율', import: '수입', export: '수출' },
    table: {
      title: '환율 목록',
      searchPlaceholder: '통화 검색...',
      country: '국가/부호',
      currency: '통화명',
      rate: '환율 (KRW)',
      date: '적용일자',
      noData: '데이터가 없습니다.'
    },
    chart: { 
        titleUsd: '주간 환율 변동 추이 (미국 달러)',
        titleEur: '주간 환율 변동 추이 (유로)',
        titleCny: '주간 환율 변동 추이 (중국 위안)',
        titleJpy: '주간 환율 변동 추이 (일본 엔)'
    },
    card: { vsLastWeek: '지난주 대비' },
    footer: '관세환율 대시보드. 데이터 제공: 관세청.',
    info: {
      text: '데이터는 관세청 공공 API를 통해 제공됩니다.',
      periodPrefix: '금주 적용기간: ',
      note: ''
    }
  },
  EN: {
    header: { title: 'Korea Customs FX Rate', import: 'Import', export: 'Export' },
    table: {
      title: 'Exchange Rates List',
      searchPlaceholder: 'Search currency...',
      country: 'Country/Code',
      currency: 'Currency',
      rate: 'Rate (KRW)',
      date: 'Apply Date',
      noData: 'No data found.'
    },
    chart: { 
        titleUsd: 'Weekly Trend (USD)',
        titleEur: 'Weekly Trend (EUR)',
        titleCny: 'Weekly Trend (CNY)',
        titleJpy: 'Weekly Trend (JPY)'
    },
    card: { vsLastWeek: 'vs last week' },
    footer: 'Korea Customs Rate Dashboard. Data provided by Korea Customs Service.',
    info: {
      text: 'Data is provided via the Korea Customs Service Public API.',
      periodPrefix: 'Current Period: ',
      note: ''
    }
  }
};

function App() {
  const [language, setLanguage] = useState<Language>('KO'); // Default to Korean
  const [activeType, setActiveType] = useState<RateType>(RateType.IMPORT);
  const [loading, setLoading] = useState<boolean>(true);
  const [allData, setAllData] = useState<RateData[]>([]); // Flattened data from all weeks
  const [currentWeekData, setCurrentWeekData] = useState<RateData[]>([]);
  const [prevWeekData, setPrevWeekData] = useState<RateData[]>([]);
  
  // Ref to track polling interval to clear it on unmount
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const t = TRANSLATIONS[language];
  const WEEKS_TO_FETCH = 12;

  // Calculate the current period string based on the loaded currentWeekData
  const currentPeriodRange = useMemo(() => {
      if (currentWeekData.length === 0) return '';
      
      // Extract date from the first item of current data (format: YYYY-MM-DD)
      const dateStr = currentWeekData[0].date; // e.g. 2023-10-29
      const [year, month, day] = dateStr.split('-').map(Number);
      
      const start = new Date(year, month - 1, day);
      const end = new Date(start);
      end.setDate(start.getDate() + 6); // Add 6 days for Saturday
      
      const formatDate = (date: Date) => {
          const yyyy = date.getFullYear();
          const mm = String(date.getMonth() + 1).padStart(2, '0');
          const dd = String(date.getDate()).padStart(2, '0');
          return `${yyyy}-${mm}-${dd}`;
      };
      
      return `${formatDate(start)} 00:00 ~ ${formatDate(end)} 24:00`;
  }, [currentWeekData]);

  // Initial Data Load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const weekDates = getRecentSundays(WEEKS_TO_FETCH); // ['20231029', '20231022', ...]
      
      try {
        // Parallel fetch with caching implemented in service layer
        const promises = weekDates.map(date => fetchWeeklyRates(date, activeType));
        const results = await Promise.all(promises);
        
        const flattened = results.flat();
        setAllData(flattened);
        
        // The first result corresponds to the most recent date requested
        if (results.length > 0) {
          setCurrentWeekData(results[0]);
        }
        if (results.length > 1) {
            setPrevWeekData(results[1]);
        }
      } catch (error) {
        console.error("Failed to load data", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    
    // Cleanup polling on unmount or type change
    return () => {
        if (pollingRef.current) clearTimeout(pollingRef.current);
    };
  }, [activeType]);

  // Polling Logic for Next Week's Data
  useEffect(() => {
      const checkNewRates = async () => {
          const nextSundayStr = getNextWeekSundayIfApplicable();
          
          if (!nextSundayStr) {
              // Not time yet (Before Fri 17:00), stop polling
              return; 
          }

          // Check if we already have this data in state
          const nextSundayFormatted = formatDateForDisplay(nextSundayStr);
          const alreadyExists = allData.some(d => d.date === nextSundayFormatted);

          if (alreadyExists) {
              // Already loaded, no need to poll
              return;
          }

          console.log(`Checking for new rates for: ${nextSundayStr} (Fri 17:00+ Rule)`);
          
          // Try to fetch WITHOUT mock data (allowMock = false)
          const newData = await fetchWeeklyRates(nextSundayStr, activeType, false);

          if (newData && newData.length > 0) {
              console.log("New rates found! Updating dashboard.");
              
              // Update State: New data becomes current, current becomes prev
              setAllData(prev => [...newData, ...prev]);
              setPrevWeekData(currentWeekData); // Push current to prev
              setCurrentWeekData(newData);      // New data is now current
          } else {
              // No data yet, schedule retry in 15 minutes
              console.log("New rates not published yet. Retrying in 15 minutes.");
              pollingRef.current = setTimeout(checkNewRates, 15 * 60 * 1000);
          }
      };

      // Run the check
      checkNewRates();

      return () => {
          if (pollingRef.current) clearTimeout(pollingRef.current);
      };
  }, [activeType, allData, currentWeekData]);

  // Prepare Chart Data
  const chartData = useMemo<ChartDataPoint[]>(() => {
    const dataByDate = new Map<string, ChartDataPoint>();

    allData.forEach(item => {
      const dateKey = item.date;
      if (!dataByDate.has(dateKey)) {
        dataByDate.set(dateKey, { date: dateKey });
      }
      const point = dataByDate.get(dateKey)!;
      
      // Only track major currencies for the main chart to avoid clutter
      if (['USD', 'JPY', 'EUR', 'CNY'].includes(item.currencyCode)) {
          point[item.currencyCode] = item.rate;
      }
    });

    return Array.from(dataByDate.values());
  }, [allData]);

  // Helper to get rates for Stat Cards
  const getRate = (data: RateData[], code: string) => data.find(d => d.currencyCode === code)?.rate || 0;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans">
      <Header 
        activeType={activeType} 
        onTypeChange={setActiveType} 
        language={language}
        onLanguageChange={setLanguage}
        labels={t.header}
      />

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Warning/Info Banner */}
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-8 rounded-r-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <Info className="h-5 w-5 text-blue-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                {t.info.text}
              </p>
              <p className="text-sm text-blue-700 font-medium mt-1">
                {t.info.periodPrefix} {currentPeriodRange}
              </p>
              {t.info.note && (
                  <p className="text-xs text-blue-500 opacity-75 mt-1">
                    {t.info.note}
                  </p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 mb-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* Top Currency Cards */}
            <StatCard 
                currency={language === 'KO' ? "미국 달러" : "US Dollar"}
                code="USD" 
                rate={getRate(currentWeekData, 'USD')} 
                prevRate={getRate(prevWeekData, 'USD')}
                label={t.card.vsLastWeek}
            />
            <StatCard 
                currency={language === 'KO' ? "유로" : "Euro"}
                code="EUR" 
                rate={getRate(currentWeekData, 'EUR')} 
                prevRate={getRate(prevWeekData, 'EUR')} 
                label={t.card.vsLastWeek}
            />
            <StatCard 
                currency={language === 'KO' ? "중국 위안" : "Chinese Yuan"}
                code="CNY" 
                rate={getRate(currentWeekData, 'CNY')} 
                prevRate={getRate(prevWeekData, 'CNY')} 
                label={t.card.vsLastWeek}
            />
            <StatCard 
                currency={language === 'KO' ? "일본 엔 (100)" : "Japanese Yen (100)"}
                code="JPY" 
                rate={getRate(currentWeekData, 'JPY')} 
                prevRate={getRate(prevWeekData, 'JPY')} 
                label={t.card.vsLastWeek}
            />            
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chart Section - Separated into 4 distinct charts */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <RateChart 
                data={chartData} 
                isLoading={loading} 
                title={t.chart.titleUsd}
                currencies={[
                    { key: 'USD', color: '#ef4444' } // Red
                ]}
            />
            <RateChart 
                data={chartData} 
                isLoading={loading} 
                title={t.chart.titleEur}
                currencies={[
                    { key: 'EUR', color: '#3b82f6' } // Blue
                ]}
            />
            <RateChart 
                data={chartData} 
                isLoading={loading} 
                title={t.chart.titleCny} 
                currencies={[
                    { key: 'CNY', color: '#d97706' } // Amber (darker yellow for contrast)
                ]}
            />
            <RateChart 
                data={chartData} 
                isLoading={loading} 
                title={t.chart.titleJpy} 
                currencies={[
                    { key: 'JPY', color: '#22c55e' } // Green
                ]}
            />
          </div>

          {/* Table Section */}
          <div className="lg:col-span-1 lg:h-auto min-h-[600px]">
            <RateTable data={currentWeekData} isLoading={loading} labels={t.table} />
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 mt-8">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} {t.footer}
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;