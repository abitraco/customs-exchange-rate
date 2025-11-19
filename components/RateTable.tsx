import React from 'react';
import { RateData } from '../types';
import { Search } from 'lucide-react';

interface RateTableProps {
    data: RateData[];
    isLoading: boolean;
    labels: {
        title: string;
        searchPlaceholder: string;
        country: string;
        currency: string;
        rate: string;
        date: string;
        noData: string;
    };
}

const RateTable: React.FC<RateTableProps> = ({ data, isLoading, labels }) => {
    const [search, setSearch] = React.useState('');

    const filteredData = data.filter(item => 
        item.currencyName.toLowerCase().includes(search.toLowerCase()) || 
        item.currencyCode.toLowerCase().includes(search.toLowerCase()) ||
        item.countryCode.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
            <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="text-lg font-semibold text-gray-900">{labels.title}</h3>
                <div className="relative w-full sm:w-auto">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        className="block w-full sm:w-64 pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out"
                        placeholder={labels.searchPlaceholder}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>
            
            <div className="overflow-y-auto custom-scrollbar flex-grow relative">
                {isLoading ? (
                     <div className="w-full p-4 space-y-4">
                         {[...Array(5)].map((_, i) => (
                            <div key={i} className="bg-gray-50 h-24 rounded-lg animate-pulse"></div>
                         ))}
                     </div>
                ) : filteredData.length > 0 ? (
                    <div className="">
                        {filteredData.map((item) => (
                            <div key={item.id} className="p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-sm shadow-sm border border-blue-100">
                                            {item.countryCode}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-gray-900">{item.countryCode}</span>
                                                <span className="text-xs text-gray-400 font-medium px-1.5 py-0.5 bg-gray-100 rounded">{item.currencyCode}</span>
                                            </div>
                                            <div className="text-sm text-gray-500 mt-0.5">{item.currencyName}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-gray-900 text-lg">
                                            {item.rate.toLocaleString('ko-KR')}
                                            <span className="text-xs font-normal text-gray-400 ml-1">KRW</span>
                                        </div>
                                        <div className="text-xs text-gray-400 mt-1">{item.date}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full py-10 text-gray-500">
                        <Search className="h-10 w-10 text-gray-300 mb-2" />
                        <p>{labels.noData}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RateTable;