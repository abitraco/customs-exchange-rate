import React from 'react';
import { Activity, Ship, Plane } from 'lucide-react';
import { RateType, Language } from '../types';

interface HeaderProps {
    activeType: RateType;
    onTypeChange: (type: RateType) => void;
    language: Language;
    onLanguageChange: (lang: Language) => void;
    labels: {
        title: string;
        import: string;
        export: string;
        bankRate: string;
    };
}

const Header: React.FC<HeaderProps> = ({ activeType, onTypeChange, language, onLanguageChange, labels }) => {

    const LanguageToggle = () => (
        <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
                onClick={() => onLanguageChange('KO')}
                className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${language === 'KO' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
            >
                한글
            </button>
            <button
                onClick={() => onLanguageChange('EN')}
                className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${language === 'EN' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
            >
                EN
            </button>
        </div>
    );

    return (
        <header className="bg-white shadow-sm sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between py-3 md:h-16 md:py-0 gap-3 md:gap-0">

                    {/* Left Group: Title + Buttons */}
                    <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6 w-full md:w-auto">
                        
                        {/* Title Row */}
                        <div className="flex justify-between items-center w-full md:w-auto">
                            <div className="flex items-center gap-2 text-blue-600 min-w-0 pr-2">
                                <Activity className="h-6 w-6 md:h-8 md:w-8 flex-shrink-0" />
                                <span className="font-bold text-lg md:text-xl tracking-tight text-gray-900 truncate block">
                                    {labels.title}
                                </span>
                            </div>

                            {/* Mobile Language Toggle */}
                            <div className="md:hidden flex-shrink-0">
                                <LanguageToggle />
                            </div>
                        </div>

                        {/* Import/Export Buttons */}
                        <div className="flex gap-2 w-full md:w-auto">
                            <button
                                onClick={() => onTypeChange(RateType.IMPORT)}
                                className={`flex-1 md:flex-none inline-flex justify-center items-center px-3 py-2 border rounded-md text-sm font-medium transition-colors duration-150 ${activeType === RateType.IMPORT
                                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                                    : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                                    }`}
                            >
                                <Ship className="mr-2 h-4 w-4" />
                                {labels.import}
                            </button>
                            <button
                                onClick={() => onTypeChange(RateType.EXPORT)}
                                className={`flex-1 md:flex-none inline-flex justify-center items-center px-3 py-2 border rounded-md text-sm font-medium transition-colors duration-150 ${activeType === RateType.EXPORT
                                    ? 'border-green-500 text-green-600 bg-green-50'
                                    : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                                    }`}
                            >
                                <Plane className="mr-2 h-4 w-4" />
                                {labels.export}
                            </button>
                        </div>
                    </div>

                    {/* Right Group: Bank Rate + Separator + Lang */}
                    <div className="flex items-center justify-end gap-3 w-full md:w-auto">
                        
                        {/* Bank Rate Link */}
                        <a
                            href="https://exrate.abitra.co/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors whitespace-nowrap"
                        >
                            {labels.bankRate}
                        </a>

                        {/* Vertical Separator */}
                        <div className="hidden md:block h-4 w-px bg-gray-300 mx-1"></div>

                        {/* Desktop Language Toggle */}
                        <div className="hidden md:block">
                            <LanguageToggle />
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;