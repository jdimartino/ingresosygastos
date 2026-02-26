import React from 'react';
import { format, subMonths, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { TbChevronLeft, TbChevronRight } from 'react-icons/tb';

const MonthSelector = ({ selectedDate, onChangeDate }) => {
    const handlePrev = () => onChangeDate(subMonths(selectedDate, 1));
    const handleNext = () => onChangeDate(addMonths(selectedDate, 1));

    // Fix #4: Compare by year-month string to avoid millisecond-level date comparison bugs
    const isFutureMonth = format(selectedDate, 'yyyy-MM') >= format(new Date(), 'yyyy-MM');

    return (
        <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 w-full md:w-auto">
            <button
                onClick={handlePrev}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
                <TbChevronLeft size={24} className="text-gray-600 dark:text-gray-400" />
            </button>

            <div className="text-lg font-bold text-gray-800 dark:text-white capitalize px-4 min-w-[150px] text-center">
                {format(selectedDate, 'MMMM yyyy', { locale: es })}
            </div>

            <button
                onClick={handleNext}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                disabled={isFutureMonth}
            >
                <TbChevronRight size={24} className={`text-gray-600 dark:text-gray-400 ${isFutureMonth ? 'opacity-30' : ''}`} />
            </button>
        </div>
    );
};

export default MonthSelector;
