import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartDataPoint } from '../types';

export interface CurrencyConfig {
    key: string;
    color: string;
}

interface RateChartProps {
    data: ChartDataPoint[];
    isLoading: boolean;
    title: string;
    currencies: CurrencyConfig[];
}

const RateChart: React.FC<RateChartProps> = ({ data, isLoading, title, currencies }) => {
    if (isLoading) {
        return (
            <div className="h-80 flex items-center justify-center bg-gray-50 rounded-lg animate-pulse border border-gray-100">
                <p className="text-gray-400">Loading chart data...</p>
            </div>
        );
    }

    // Reverse data to show chronological order (oldest to newest)
    const chartData = [...data].reverse();

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={chartData}
                        margin={{
                            top: 10,
                            right: 30,
                            left: 10,
                            bottom: 5,
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                        <XAxis 
                            dataKey="date" 
                            tick={{fontSize: 12, fill: '#6b7280'}} 
                            tickLine={false}
                            axisLine={false}
                            tickMargin={10}
                            tickFormatter={(val) => val.substring(5)} // Show MM-DD
                        />
                        <YAxis 
                            domain={['auto', 'auto']} 
                            tick={{fontSize: 12, fill: '#6b7280'}}
                            tickLine={false}
                            axisLine={false}
                            width={45}
                            padding={{ top: 20, bottom: 20 }}
                            tickFormatter={(value) => Math.floor(value).toLocaleString()}
                        />
                        <Tooltip 
                            contentStyle={{ 
                                backgroundColor: '#fff', 
                                borderRadius: '8px', 
                                border: 'none', 
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                                fontSize: '12px'
                            }}
                            itemStyle={{ fontWeight: 500 }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} iconType="circle" />
                        {currencies.map((curr) => (
                            <Line 
                                key={curr.key}
                                type="monotone" 
                                dataKey={curr.key} 
                                stroke={curr.color} 
                                strokeWidth={3} 
                                dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} 
                                activeDot={{ r: 7, strokeWidth: 0 }}
                                animationDuration={1000}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default RateChart;