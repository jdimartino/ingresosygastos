import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { TbLoaderQuarter } from 'react-icons/tb';

import MonthSelector from '../components/MonthSelector';
import KPICards from '../components/KPICards';
import { IngresosList, GastosList, AgrupadoList } from '../components/ReporteTablas';

const Dashboard = () => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [ingresos, setIngresos] = useState([]);
    const [gastos, setGastos] = useState([]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const start = format(startOfMonth(selectedDate), 'yyyy-MM-dd');
            const endStr = format(endOfMonth(selectedDate), 'yyyy-MM-dd') + 'T23:59:59';

            const [ingSnap, gasSnap] = await Promise.all([
                getDocs(query(collection(db, 'ingresos'), where("fecha", ">=", start), where("fecha", "<=", endStr))),
                getDocs(query(collection(db, 'gastos'), where("fecha", ">=", start), where("fecha", "<=", endStr))),
            ]);

            const ingData = ingSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const gasData = gasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            ingData.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
            gasData.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

            setIngresos(ingData);
            setGastos(gasData);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    }, [selectedDate]);

    // Refetch whenever the selected month changes
    useEffect(() => { fetchData(); }, [fetchData]);

    // Calculations
    const totalIngresos = ingresos.reduce((sum, item) => sum + (item.ingresoReal || 0), 0);
    const totalGastos = gastos.reduce((sum, item) => sum + (item.monto || 0), 0);

    // Groupings
    const groupedIngresos = ingresos.reduce((acc, current) => {
        const client = current.cliente || 'Desconocido';
        acc[client] = (acc[client] || 0) + (current.ingresoReal || 0);
        return acc;
    }, {});
    const agIngresos = Object.entries(groupedIngresos)
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => a.name.localeCompare(b.name));

    const groupedGastos = gastos.reduce((acc, current) => {
        const cat = current.categoria || 'Otra';
        acc[cat] = (acc[cat] || 0) + (current.monto || 0);
        return acc;
    }, {});
    const agGastos = Object.entries(groupedGastos)
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => a.name.localeCompare(b.name));

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 md:mb-0">Mi Balance</h1>
                <MonthSelector selectedDate={selectedDate} onChangeDate={setSelectedDate} />
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <TbLoaderQuarter className="animate-spin text-blue-500 text-4xl" />
                </div>
            ) : (
                <>
                    <KPICards ingresosTotales={totalIngresos} gastosTotales={totalGastos} />

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-blue-600 dark:text-blue-400 border-b border-gray-200 dark:border-gray-700 pb-2">Ingresos</h2>
                            <AgrupadoList data={agIngresos} categoryKey="Cliente" amountKey="Comisión" title="Resumen por Cliente" isIncome={true} transactions={ingresos} filterKey="cliente" />
                            {/* onMutate triggers a fresh Firestore fetch after any edit/delete */}
                            <IngresosList ingresos={ingresos} onMutate={fetchData} />
                        </div>
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-red-600 dark:text-red-400 border-b border-gray-200 dark:border-gray-700 pb-2">Gastos</h2>
                            <AgrupadoList data={agGastos} categoryKey="Categoría" amountKey="Total" title="Resumen por Categoría" isIncome={false} transactions={gastos} filterKey="categoria" />
                            <GastosList gastos={gastos} onMutate={fetchData} />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default Dashboard;
