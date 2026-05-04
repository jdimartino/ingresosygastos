import { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { TbLoaderQuarter, TbSearch, TbX } from 'react-icons/tb';

import MonthSelector from '../components/MonthSelector';
import KPICards from '../components/KPICards';
import { IngresosList, GastosList, AgrupadoList } from '../components/ReporteTablas';

const Dashboard = () => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [ingresos, setIngresos] = useState([]);
    const [gastos, setGastos] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        setSearchQuery(''); // Resetear búsqueda al cambiar de mes
        try {
            const start = format(startOfMonth(selectedDate), 'yyyy-MM-dd');
            const endStr = format(endOfMonth(selectedDate), 'yyyy-MM-dd') + 'T23:59:59';

            const [ingResult, gasResult] = await Promise.allSettled([
                getDocs(query(collection(db, 'ingresos'), where("fecha", ">=", start), where("fecha", "<=", endStr))),
                getDocs(query(collection(db, 'gastos'), where("fecha", ">=", start), where("fecha", "<=", endStr))),
            ]);

            const ingData = ingResult.status === 'fulfilled'
                ? ingResult.value.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                : [];
            const gasData = gasResult.status === 'fulfilled'
                ? gasResult.value.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                : [];

            ingData.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
            gasData.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

            setIngresos(ingData);
            setGastos(gasData);
        } catch {
            // Los errores parciales ya se manejan con allSettled arriba
        } finally {
            setLoading(false);
        }
    }, [selectedDate]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Arrays filtrados por búsqueda (client-side, sin consultas extra a Firebase)
    const filteredIngresos = useMemo(() => {
        if (!searchQuery.trim()) return ingresos;
        const q = searchQuery.toLowerCase();
        return ingresos.filter(r =>
            r.cliente?.toLowerCase().includes(q) ||
            r.tipo === 'aporte_fondo_vitalicio'
        );
    }, [ingresos, searchQuery]);

    const filteredGastos = useMemo(() => {
        if (!searchQuery.trim()) return gastos;
        const q = searchQuery.toLowerCase();
        return gastos.filter(r =>
            r.categoria?.toLowerCase().includes(q) ||
            r.detalle?.toLowerCase().includes(q)
        );
    }, [gastos, searchQuery]);

    // Separar comisiones de aportes
    const comisiones = useMemo(() =>
        filteredIngresos.filter(i => i.tipo !== 'aporte_fondo_vitalicio'),
        [filteredIngresos]
    );

    const aportes = useMemo(() =>
        filteredIngresos.filter(i => i.tipo === 'aporte_fondo_vitalicio'),
        [filteredIngresos]
    );

    // Totales y agrupaciones calculadas sobre los arrays filtrados
    const totalIngresos = comisiones.reduce((sum, item) => sum + (item.ingresoReal || 0), 0);
    const totalAportes = aportes.reduce((sum, item) => sum + (item.ingresoReal || 0), 0);
    const totalGastos = filteredGastos.reduce((sum, item) => sum + (item.monto || 0), 0);

    const agIngresos = useMemo(() => {
        const grouped = comisiones.reduce((acc, cur) => {
            const client = cur.cliente || 'Desconocido';
            acc[client] = (acc[client] || 0) + (cur.ingresoReal || 0);
            return acc;
        }, {});
        return Object.entries(grouped)
            .map(([name, total]) => ({ name, total }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [comisiones]);

    const agGastos = useMemo(() => {
        const grouped = filteredGastos.reduce((acc, cur) => {
            const cat = cur.categoria || 'Otra';
            acc[cat] = (acc[cat] || 0) + (cur.monto || 0);
            return acc;
        }, {});
        return Object.entries(grouped)
            .map(([name, total]) => ({ name, total }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [filteredGastos]);

    const isSearching = searchQuery.trim().length > 0;
    const totalResultados = filteredIngresos.length + filteredGastos.length;

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
                    <KPICards ingresosTotales={totalIngresos} gastosTotales={totalGastos} totalAportes={totalAportes} />

                    {/* Barra de búsqueda */}
                    <div className="space-y-2">
                        <div className="relative">
                            <TbSearch
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                                size={18}
                            />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Buscar por cliente, categoría o detalle..."
                                aria-label="Buscar registros del mes"
                                className="w-full pl-11 pr-10 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white text-sm shadow-sm transition-shadow"
                            />
                            {isSearching && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    aria-label="Limpiar búsqueda"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                                >
                                    <TbX size={16} />
                                </button>
                            )}
                        </div>
                        {isSearching && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 pl-1">
                                {totalResultados === 0
                                    ? `Sin resultados para "${searchQuery}"`
                                    : `${totalResultados} resultado${totalResultados !== 1 ? 's' : ''} para "${searchQuery}"`
                                }
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-blue-600 dark:text-blue-400 border-b border-gray-200 dark:border-gray-700 pb-2">Ingresos</h2>
                            <AgrupadoList data={agIngresos} categoryKey="Cliente" amountKey="Comisión" title="Resumen por Cliente" isIncome={true} transactions={filteredIngresos} filterKey="cliente" />
                            <IngresosList ingresos={filteredIngresos} onMutate={fetchData} />
                        </div>
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-red-600 dark:text-red-400 border-b border-gray-200 dark:border-gray-700 pb-2">Gastos</h2>
                            <AgrupadoList data={agGastos} categoryKey="Categoría" amountKey="Total" title="Resumen por Categoría" isIncome={false} transactions={filteredGastos} filterKey="categoria" />
                            <GastosList gastos={filteredGastos} onMutate={fetchData} />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default Dashboard;
