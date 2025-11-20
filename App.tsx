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
    header: { title: '과세환율', import: '수입', export: '수출', bankRate: '은행환율보기' },
    table: {
      title: '환율목록',
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
    footer: '(주)아비트라서울',
    footerLink: 'https://www.abitra.co',
    info: {
      text: '데이터는 관세청 공공 API를 통해 제공됩니다.',
      periodPrefix: '금주 적용기간: ',
      note: ''
    }
  },
  EN: {
    header: { title: 'Korea Customs FX Rate', import: 'Import', export: 'Export', bankRate: 'View Bank Rate' },
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

const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>('KO');
  const [activeType, setActiveType] = useState<RateType>(RateType.IMPORT);
  const [allData, setAllData] = useState<RateData[]>([]);
  const [currentWeekData, setCurrentWeekData] = useState<RateData[]>([]);
  const [prevWeekData, setPrevWeekData] = useState<RateData[]>([]);
  const [loading, setLoading] = useState(true);

  const t = TRANSLATIONS[language] as any;

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      const sundays = getRecentSundays(12);
      try {
        const data = await Promise.all(sundays.map(day => fetchWeeklyRates(day, activeType)));
        const flatData = data.flat();
        setAllData(flatData);
        setCurrentWeekData(data[0] || []);
        setPrevWeekData(data[1] || []);
      } catch (error) {
        console.error("Error fetching initial data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, [activeType]);

  const chartData = useMemo<ChartDataPoint[]>(() => {
    const dataByDate = new Map<string, ChartDataPoint>();
    allData.forEach(item => {
      if (!dataByDate.has(item.date)) {
        dataByDate.set(item.date, { date: item.date });
      }
      const point = dataByDate.get(item.date)!;
      if (['USD', 'JPY', 'EUR', 'CNY'].includes(item.currencyCode)) {
        point[item.currencyCode] = item.rate;
      }
    });
    return Array.from(dataByDate.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [allData]);

  const getRate = (data: RateData[], code: string) => data.find(d => d.currencyCode === code)?.rate || 0;

  const currentPeriod = useMemo(() => {
    if (!currentWeekData.length) return '';
    const startDate = new Date(currentWeekData[0].date);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    return `${formatDateForDisplay(startDate.toISOString().split('T')[0])} ~ ${formatDateForDisplay(endDate.toISOString().split('T')[0])}`;
  }, [currentWeekData]);

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
                {t.info.periodPrefix} {currentPeriod}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 mb-8 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard currency="미국 달러" code="USD" rate={getRate(currentWeekData, 'USD')} prevRate={getRate(prevWeekData, 'USD')} label={t.card.vsLastWeek} />
          <StatCard currency="유로" code="EUR" rate={getRate(currentWeekData, 'EUR')} prevRate={getRate(prevWeekData, 'EUR')} label={t.card.vsLastWeek} />
          <StatCard currency="중국 위안" code="CNY" rate={getRate(currentWeekData, 'CNY')} prevRate={getRate(prevWeekData, 'CNY')} label={t.card.vsLastWeek} />
          <StatCard currency="일본 엔 (100)" code="JPY" rate={getRate(currentWeekData, 'JPY')} prevRate={getRate(prevWeekData, 'JPY')} label={t.card.vsLastWeek} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <RateChart data={chartData} isLoading={loading} title={t.chart.titleUsd} currencies={[{ key: 'USD', color: '#ef4444' }]} />
            <RateChart data={chartData} isLoading={loading} title={t.chart.titleEur} currencies={[{ key: 'EUR', color: '#3b82f6' }]} />
            <RateChart data={chartData} isLoading={loading} title={t.chart.titleCny} currencies={[{ key: 'CNY', color: '#d97706' }]} />
            <RateChart data={chartData} isLoading={loading} title={t.chart.titleJpy} currencies={[{ key: 'JPY', color: '#22c55e' }]} />
          </div>

          <div className="lg:col-span-1 lg:h-auto min-h-[600px]">
            <RateTable data={currentWeekData} isLoading={loading} labels={t.table} />
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 mt-8">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()}{' '}
            {t.footerLink ? (
              <a
                href={t.footerLink}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                {t.footer}
              </a>
            ) : (
              t.footer
            )}
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
