import React from 'react';
import { TbTrendingUp, TbTrendingDown, TbWallet } from 'react-icons/tb';
import clsx from 'clsx';

const KPICard = ({ title, amount, type, icon: Icon }) => {
    const isPositive = type === 'income' || (type === 'balance' && amount >= 0);
    const isNegative = type === 'expense' || (type === 'balance' && amount < 0);

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
            <div className={clsx(
                "p-4 rounded-xl flex-shrink-0",
                isPositive && type !== 'balance' && "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
                isNegative && type !== 'balance' && "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
                type === 'balance' && isPositive && "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
                type === 'balance' && isNegative && "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
            )}>
                <Icon size={28} />
            </div>
            <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
                <p className={clsx(
                    "text-2xl font-bold truncate",
                    type === 'balance' ? (isPositive ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400') : "text-gray-900 dark:text-white"
                )}>
                    ${amount.toFixed(2)}
                </p>
            </div>
        </div>
    );
};

const KPICards = ({ ingresosTotales, gastosTotales }) => {
    const balance = ingresosTotales - gastosTotales;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KPICard title="Total Ingresos (Comisión)" amount={ingresosTotales} type="income" icon={TbTrendingUp} />
            <KPICard title="Total Gastos" amount={gastosTotales} type="expense" icon={TbTrendingDown} />
            <KPICard title="Balance Neto" amount={balance} type="balance" icon={TbWallet} />
        </div>
    );
};

export default KPICards;
