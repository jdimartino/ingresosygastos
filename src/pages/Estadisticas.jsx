import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { format, subMonths, addMonths, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import MonthSelector from '../components/MonthSelector';
import { es } from 'date-fns/locale';
import {
    TbLoaderQuarter, TbTrendingUp, TbTrendingDown,
    TbWallet, TbStar, TbUsers
} from 'react-icons/tb';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

// ── Paleta de colores para el gráfico de dona ────────────────────────────────
const PIE_COLORS = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
    '#8b5cf6', '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#6366f1'
];

// ── Tooltip personalizado ────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-xl text-xs">
            <p className="font-bold text-gray-700 dark:text-gray-200 mb-1">{label}</p>
            {payload.map((entry, i) => (
                <p key={i} style={{ color: entry.color }}>
                    {entry.name}: <span className="font-semibold">${Number(entry.value).toFixed(2)}</span>
                </p>
            ))}
        </div>
    );
};

// ── KPI Card ─────────────────────────────────────────────────────────────────
const StatCard = ({ title, value, subtitle, icon: Icon, colorClass }) => (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 flex flex-col gap-3">
        <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${colorClass}`}>
                <Icon size={20} />
            </div>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400 leading-tight">{title}</span>
        </div>
        <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
    </div>
);

// ── Sección wrapper ──────────────────────────────────────────────────────────
const Section = ({ title, subtitle, children }) => (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <h2 className="text-lg font-bold text-gray-800 dark:text-white">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5 mb-4">{subtitle}</p>}
        {children}
    </div>
);

// ── Página principal ─────────────────────────────────────────────────────────
const Estadisticas = () => {
    const [loading, setLoading] = useState(true);
    const [monthlyData, setMonthlyData] = useState([]);
    const [categoryData, setCategoryData] = useState([]);
    const [clientData, setClientData] = useState([]);
    const [kpis, setKpis] = useState({});
    const [mode, setMode] = useState('mensual'); // 'mensual' | 'periodo'
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [periodoStart, setPeriodoStart] = useState(subMonths(new Date(), 5));
    const [periodoEnd, setPeriodoEnd] = useState(new Date());
    const [dailyData, setDailyData] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                let start, end;
                if (mode === 'mensual') {
                    start = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
                    end = format(endOfMonth(selectedMonth), 'yyyy-MM-dd') + 'T23:59:59';
                } else {
                    start = format(startOfMonth(periodoStart), 'yyyy-MM-dd');
                    end = format(endOfMonth(periodoEnd), 'yyyy-MM-dd') + 'T23:59:59';
                }

                // Fix 6: allSettled para que un fallo no anule los dos resultados
                const [ingResult, gasResult] = await Promise.allSettled([
                    getDocs(query(collection(db, 'ingresos'), where('fecha', '>=', start), where('fecha', '<=', end))),
                    getDocs(query(collection(db, 'gastos'), where('fecha', '>=', start), where('fecha', '<=', end))),
                ]);

                const ingresos = ingResult.status === 'fulfilled' ? ingResult.value.docs.map(d => d.data()) : [];
                const gastos = gasResult.status === 'fulfilled' ? gasResult.value.docs.map(d => d.data()) : [];

                let monthly = [];
                let daily = [];

                if (mode === 'mensual') {
                    // ── Datos Diarios ──────────────────────────────────────────
                    const days = eachDayOfInterval({
                        start: startOfMonth(selectedMonth),
                        end: endOfMonth(selectedMonth)
                    });
                    daily = days.map(date => {
                        const dateStr = format(date, 'yyyy-MM-dd');
                        const ingDia = ingresos.filter(r => r.fecha?.startsWith(dateStr));
                        const gasDia = gastos.filter(r => r.fecha?.startsWith(dateStr));
                        const ing = ingDia.reduce((s, r) => s + (r.ingresoReal || 0), 0);
                        const gas = gasDia.reduce((s, r) => s + (r.monto || 0), 0);
                        const bal = ing - gas;
                        const label = format(date, 'd MMM', { locale: es });
                        return { dateStr, label, ing, gas, bal };
                    });
                    setDailyData(daily);
                    setMonthlyData([]);
                } else {
                    // ── Datos Mensuales ──────────────────────────────────────────
                    const months = [];
                    let current = startOfMonth(periodoStart);
                    while (current <= periodoEnd) {
                        months.push(format(current, 'yyyy-MM'));
                        current = addMonths(current, 1);
                    }

                    monthly = months.map(ym => {
                        const ingMes = ingresos.filter(r => r.fecha?.startsWith(ym));
                        const gasMes = gastos.filter(r => r.fecha?.startsWith(ym));
                        const ing = ingMes.reduce((s, r) => s + (r.ingresoReal || 0), 0);
                        const gas = gasMes.reduce((s, r) => s + (r.monto || 0), 0);
                        const bal = ing - gas;
                        const rawLabel = format(new Date(ym + '-01'), 'MMM yy', { locale: es });
                        const label = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);
                        return { ym, label, ing, gas, bal };
                    });
                    setMonthlyData(monthly);
                    setDailyData([]);
                }

                // ── Categorías (dona) ────────────────────────────────────────
                const catMap = {};
                gastos.forEach(r => {
                    const cat = r.categoria || 'Otro';
                    catMap[cat] = (catMap[cat] || 0) + (r.monto || 0);
                });
                setCategoryData(
                    Object.entries(catMap)
                        .map(([name, value]) => ({ name, value }))
                        .sort((a, b) => b.value - a.value)
                );

                // ── Ranking clientes ─────────────────────────────────────────
                const cliMap = {};
                ingresos.forEach(r => {
                    const cli = r.cliente || 'Desconocido';
                    cliMap[cli] = (cliMap[cli] || 0) + (r.ingresoReal || 0);
                });
                setClientData(
                    Object.entries(cliMap)
                        .map(([name, total]) => ({ name, total }))
                        .sort((a, b) => b.total - a.total)
                );

                // ── KPIs globales ────────────────────────────────────────────
                const totalIng = ingresos.reduce((s, r) => s + (r.ingresoReal || 0), 0);
                const totalGas = gastos.reduce((s, r) => s + (r.monto || 0), 0);
                const savingsRate = totalIng > 0 ? ((totalIng - totalGas) / totalIng * 100) : 0;
                const currentData = mode === 'mensual' ? daily : monthly;
                const active = currentData.filter(m => m.ing > 0 || m.gas > 0);
                const avgIng = active.length ? totalIng / active.length : 0;
                const avgGas = active.length ? totalGas / active.length : 0;
                const bestPeriod = currentData.reduce(
                    (best, m) => m.bal > (best?.bal ?? -Infinity) ? m : best, null
                );
                setKpis({ savingsRate, avgIng, avgGas, bestMonth: bestPeriod });

            } catch (e) {
                console.error('Error fetching estadísticas:', e);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [mode, selectedMonth, periodoStart, periodoEnd]);

    if (loading) {
        return (
            <div className="flex justify-center items-center py-24">
                <TbLoaderQuarter className="animate-spin text-blue-500 text-4xl" />
            </div>
        );
    }

    const totalGastosPie = categoryData.reduce((s, c) => s + c.value, 0);
    const medals = ['🥇', '🥈', '🥉'];

    return (
        <div className="space-y-6">

            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Estadísticas</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Análisis de tus finanzas personales
                    </p>
                </div>
                {/* Selectores */}
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
                    {mode === 'mensual' ? (
                        <MonthSelector selectedDate={selectedMonth} onChangeDate={setSelectedMonth} />
                    ) : (
                        <div className="flex items-center gap-2">
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Desde</p>
                                <MonthSelector selectedDate={periodoStart} onChangeDate={setPeriodoStart} />
                            </div>
                            <span className="text-gray-400 mt-6 text-lg">→</span>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Hasta</p>
                                <MonthSelector selectedDate={periodoEnd} onChangeDate={setPeriodoEnd} />
                            </div>
                        </div>
                    )}
                    <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm text-sm font-semibold">
                        <button
                            onClick={() => setMode('mensual')}
                            className={`px-5 py-2 transition-all ${mode === 'mensual'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                        >
                            Mensual
                        </button>
                        <button
                            onClick={() => setMode('periodo')}
                            className={`px-5 py-2 transition-all ${mode === 'periodo'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                        >
                            Período
                        </button>
                    </div>
                </div>
            </div>

            {/* ── KPI Cards ───────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Tasa de Ahorro"
                    value={`${kpis.savingsRate?.toFixed(1)}%`}
                    subtitle={kpis.savingsRate >= 0 ? 'de tus ingresos guardado' : 'estás en déficit'}
                    icon={TbWallet}
                    colorClass={
                        kpis.savingsRate >= 0
                            ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                    }
                />
                <StatCard
                    title={mode === 'mensual' ? "Promedio Ingreso/día" : "Promedio Ingreso/mes"}
                    value={`$${kpis.avgIng?.toFixed(2)}`}
                    subtitle={mode === 'mensual' ? 'en el mes' : 'en el período'}
                    icon={TbTrendingUp}
                    colorClass="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                />
                <StatCard
                    title={mode === 'mensual' ? "Promedio Gasto/día" : "Promedio Gasto/mes"}
                    value={`$${kpis.avgGas?.toFixed(2)}`}
                    subtitle={mode === 'mensual' ? 'en el mes' : 'en el período'}
                    icon={TbTrendingDown}
                    colorClass="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                />
                <StatCard
                    title={mode === 'mensual' ? "Mejor Día" : "Mejor Mes"}
                    value={kpis.bestMonth ? `$${kpis.bestMonth.bal.toFixed(2)}` : '--'}
                    subtitle={kpis.bestMonth?.label || 'sin datos'}
                    icon={TbStar}
                    colorClass="bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400"
                />
            </div>

            {/* ── Barra: Ingresos vs Gastos ────────────────────────────────── */}
            <Section
                title={mode === 'mensual' ? "Ingresos vs Gastos por Día" : "Ingresos vs Gastos por Mes"}
                subtitle={mode === 'mensual' ? "Comparativa diaria en USD" : "Comparativa mensual en USD"}
            >
                <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={mode === 'mensual' ? dailyData : monthlyData} margin={{ top: 4, right: 10, left: 0, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
                        <XAxis
                            dataKey="label"
                            tick={{ fontSize: 11, fill: '#9ca3af' }}
                            axisLine={false} tickLine={false}
                        />
                        <YAxis
                            tick={{ fontSize: 11, fill: '#9ca3af' }}
                            axisLine={false} tickLine={false}
                            tickFormatter={v => `$${v}`}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
                        <Bar dataKey="ing" name="Ingresos" fill="#22c55e" radius={[6, 6, 0, 0]} maxBarSize={40} />
                        <Bar dataKey="gas" name="Gastos" fill="#ef4444" radius={[6, 6, 0, 0]} maxBarSize={40} />
                    </BarChart>
                </ResponsiveContainer>
            </Section>

            {/* ── Área: Balance Neto ───────────────────────────────────────── */}
            <Section
                title="Evolución del Balance Neto"
                subtitle={mode === 'mensual' ? "Ingresos − Gastos diarios" : "Ingresos − Gastos cada mes"}
            >
                <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={mode === 'mensual' ? dailyData : monthlyData} margin={{ top: 4, right: 10, left: 0, bottom: 4 }}>
                        <defs>
                            <linearGradient id="gradBal" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                            dataKey="label"
                            tick={{ fontSize: 11, fill: '#9ca3af' }}
                            axisLine={false} tickLine={false}
                        />
                        <YAxis
                            tick={{ fontSize: 11, fill: '#9ca3af' }}
                            axisLine={false} tickLine={false}
                            tickFormatter={v => `$${v}`}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                            type="monotone"
                            dataKey="bal"
                            name="Balance"
                            stroke="#3b82f6"
                            strokeWidth={2.5}
                            fill="url(#gradBal)"
                            dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }}
                            activeDot={{ r: 6 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </Section>

            {/* ── Dona + Ranking ───────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Dona: Gastos por categoría */}
                <Section title="Gastos por Categoría" subtitle="Distribución del total gastado">
                    {categoryData.length === 0 ? (
                        <p className="text-center text-sm text-gray-400 py-10">Sin datos en este período</p>
                    ) : (
                        <>
                            <ResponsiveContainer width="100%" height={210}>
                                <PieChart>
                                    <Pie
                                        data={categoryData}
                                        cx="50%" cy="50%"
                                        innerRadius={60} outerRadius={90}
                                        paddingAngle={3}
                                        dataKey="value"
                                    >
                                        {categoryData.map((_, i) => (
                                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(v) => [`$${Number(v).toFixed(2)}`, '']}
                                        contentStyle={{
                                            borderRadius: '12px', border: '1px solid #e5e7eb',
                                            fontSize: '12px'
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>

                            {/* Leyenda */}
                            <div className="space-y-2 mt-3">
                                {categoryData.slice(0, 7).map((c, i) => (
                                    <div key={c.name} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span
                                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                                            />
                                            <span className="text-gray-700 dark:text-gray-300 truncate">{c.name}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                                            <span className="font-semibold text-gray-900 dark:text-white">
                                                ${c.value.toFixed(2)}
                                            </span>
                                            <span className="text-gray-400 text-xs">
                                                ({((c.value / totalGastosPie) * 100).toFixed(0)}%)
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </Section>

                {/* Ranking de clientes */}
                <Section title="Ranking de Clientes" subtitle="Por comisión generada en el período">
                    {clientData.length === 0 ? (
                        <p className="text-center text-sm text-gray-400 py-10">Sin datos en este período</p>
                    ) : (
                        <div className="space-y-4">
                            {clientData.map((c, i) => {
                                const pct = (c.total / clientData[0].total) * 100;
                                return (
                                    <div key={c.name}>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="text-base flex-shrink-0">
                                                    {medals[i] ?? `#${i + 1}`}
                                                </span>
                                                <span className="text-sm font-medium text-gray-800 dark:text-white truncate">
                                                    {c.name}
                                                </span>
                                            </div>
                                            <span className="text-sm font-bold text-green-600 dark:text-green-400 flex-shrink-0 ml-2">
                                                ${c.total.toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                                            <div
                                                className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-green-400 transition-all duration-700"
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Section>

            </div>
        </div>
    );
};

export default Estadisticas;
