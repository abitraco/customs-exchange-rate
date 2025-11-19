import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
    currency: string;
    code: string;
    rate: number;
    prevRate: number | undefined;
    label: string;
}

const StatCard: React.FC<StatCardProps> = ({ currency, code, rate, prevRate, label }) => {
    const diff = prevRate ? rate - prevRate : 0;
    const percentage = prevRate ? ((diff / prevRate) * 100).toFixed(2) : '0.00';
    
    let TrendIcon = Minus;
    let trendColor = 'text-gray-500';
    
    if (diff > 0) {
        TrendIcon = TrendingUp;
        trendColor = 'text-red-500'; // Red is usually "up/expensive" in KR financial contexts.
    } else if (diff < 0) {
        TrendIcon = TrendingDown;
        trendColor = 'text-blue-500'; // Blue usually down
    }

    return (
        <div className="bg-white overflow-hidden rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
            <div className="p-5">
                <div className="flex items-center">
                    <div className="flex-shrink-0">
                       <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-gray-100 font-bold text-gray-600 text-xs">
                           {code}
                       </span>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                        <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">{currency}</dt>
                            <dd>
                                <div className="text-lg font-bold text-gray-900">{rate.toLocaleString('ko-KR')} <span className="text-xs font-normal text-gray-400">KRW</span></div>
                            </dd>
                        </dl>
                    </div>
                </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
                <div className="text-sm">
                    <div className={`font-medium inline-flex items-center ${trendColor}`}>
                        <TrendIcon className="mr-1 h-4 w-4" aria-hidden="true" />
                        {Math.abs(diff).toFixed(2)} ({percentage}%)
                    </div>
                    <span className="text-gray-400 text-xs ml-2">{label}</span>
                </div>
            </div>
        </div>
    );
};

export default StatCard;