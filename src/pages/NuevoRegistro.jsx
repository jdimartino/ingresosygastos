import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { format } from 'date-fns';
import { TbBusinessplan, TbFileInvoice, TbCheck, TbCalculator, TbChevronDown, TbChevronUp } from 'react-icons/tb';
import AutocompleteInput from '../components/AutocompleteInput';

// ── Ingreso Form ───────────────────────────────────────────────────────────────
const IngresoPanel = () => {
    const [formData, setFormData] = useState({
        fecha: format(new Date(), 'yyyy-MM-dd'),
        cliente: '',
        montoBase: '',
        porcentaje: ''
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [clientesTotales, setClientesTotales] = useState([]);

    useEffect(() => {
        const fetchClientes = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, 'ingresos'));
                const list = querySnapshot.docs.map(doc => doc.data().cliente);
                setClientesTotales([...new Set(list)].filter(Boolean).sort());
            } catch (error) {
                console.error('Error fetching clients:', error);
            }
        };
        fetchClientes();
    }, []);

    const calculateIngresoReal = () => {
        const base = parseFloat(formData.montoBase) || 0;
        const perc = parseFloat(formData.porcentaje) || 0;
        return base * (perc / 100);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.cliente || !formData.montoBase || !formData.porcentaje) return;

        setLoading(true);
        setSuccess(false);
        try {
            const ingresoReal = calculateIngresoReal();
            await addDoc(collection(db, 'ingresos'), {
                fecha: formData.fecha,
                cliente: formData.cliente,
                montoBase: parseFloat(formData.montoBase),
                porcentaje: parseFloat(formData.porcentaje),
                ingresoReal,
                timestampRegistro: serverTimestamp()
            });
            setSuccess(true);
            setFormData(prev => ({ ...prev, montoBase: '', cliente: '' }));
            setTimeout(() => setSuccess(false), 3000);
        } catch (error) {
            console.error('Error guardando ingreso:', error);
            alert('Hubo un error al guardar el registro. Revisa la consola.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
            className="space-y-5"
        >
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha</label>
                <input
                    type="date"
                    name="fecha"
                    value={formData.fecha}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-700 border-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                    required
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cliente / Quién</label>
                <AutocompleteInput
                    name="cliente"
                    value={formData.cliente}
                    options={clientesTotales}
                    onChange={handleChange}
                    placeholder="Selecciona o escribe un nombre"
                    required={true}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Monto Base</label>
                    <input
                        type="number"
                        step="0.01"
                        min="0"
                        name="montoBase"
                        value={formData.montoBase}
                        onChange={handleChange}
                        placeholder="0.00"
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-700 border-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Porcentaje (%)</label>
                    <input
                        type="number"
                        step="0.1"
                        min="0"
                        name="porcentaje"
                        value={formData.porcentaje}
                        onChange={handleChange}
                        placeholder="0"
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-700 border-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                        required
                    />
                </div>
            </div>

            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800">
                <span className="text-sm text-green-700 dark:text-green-400 font-medium">Comisión Generada (Ingreso Real):</span>
                <div className="text-3xl font-bold text-green-600 dark:text-green-300 mt-1">
                    ${calculateIngresoReal().toFixed(2)}
                </div>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl shadow-md disabled:opacity-75 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-2"
            >
                {loading ? 'Guardando...' : success ? <><TbCheck size={20} /> Guardado Exitosamente</> : 'Registrar Ingreso'}
            </button>
        </form>
    );
};

// ── Gasto Form ─────────────────────────────────────────────────────────────────
const GastoPanel = () => {
    const [formData, setFormData] = useState({
        fecha: format(new Date(), 'yyyy-MM-dd'),
        categoria: '',
        monto: '',
        detalle: ''
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [categorias, setCategorias] = useState([]);
    const [detalles, setDetalles] = useState([]);

    // Calculator states
    const [showCalc, setShowCalc] = useState(false);
    const [calcMontoBs, setCalcMontoBs] = useState('');
    const [calcTasa, setCalcTasa] = useState('');
    const [binanceRate, setBinanceRate] = useState(null);
    const [rateLoading, setRateLoading] = useState(false);
    const [rateLastUpdate, setRateLastUpdate] = useState(null);

    const fetchBinanceRate = async () => {
        setRateLoading(true);
        try {
            const res = await fetch('https://ve.dolarapi.com/v1/dolares');
            const data = await res.json();
            const paralelo = data.find(item => item.fuente === 'paralelo');
            if (paralelo && paralelo.promedio) {
                setBinanceRate(paralelo.promedio);
                setCalcTasa(paralelo.promedio.toString());
                setRateLastUpdate(new Date());
            }
        } catch (error) {
            console.error('Error fetching Binance rate:', error);
        } finally {
            setRateLoading(false);
        }
    };

    useEffect(() => {
        if (showCalc && !binanceRate) {
            fetchBinanceRate();
        }
    }, [showCalc]);

    const calcResult = () => {
        const bs = parseFloat(calcMontoBs);
        const tasa = parseFloat(calcTasa);
        if (bs > 0 && tasa > 0) {
            return (bs / tasa).toFixed(2);
        }
        return '0.00';
    };

    const handleUseCalcMonto = () => {
        const res = calcResult();
        if (res !== '0.00') {
            setFormData(prev => ({ ...prev, monto: res }));
            setShowCalc(false);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, 'gastos'));
                const cats = querySnapshot.docs.map(doc => doc.data().categoria);
                const dets = querySnapshot.docs.map(doc => doc.data().detalle);
                setCategorias([...new Set(cats)].filter(Boolean).sort());
                setDetalles([...new Set(dets)].filter(Boolean).sort());
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };
        fetchData();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.categoria || !formData.monto) return;

        setLoading(true);
        setSuccess(false);
        try {
            await addDoc(collection(db, 'gastos'), {
                fecha: formData.fecha,
                categoria: formData.categoria,
                monto: parseFloat(formData.monto),
                detalle: formData.detalle,
                timestampRegistro: serverTimestamp()
            });
            setSuccess(true);
            setFormData(prev => ({ ...prev, monto: '', detalle: '' }));
            setTimeout(() => setSuccess(false), 3000);
        } catch (error) {
            console.error('Error guardando gasto:', error);
            alert('Hubo un error al guardar el registro. Revisa la consola.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
            className="space-y-5"
        >
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha</label>
                <input
                    type="date"
                    name="fecha"
                    value={formData.fecha}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-700 border-none focus:ring-2 focus:ring-red-500 text-gray-900 dark:text-white"
                    required
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoría / Descripción</label>
                <AutocompleteInput
                    name="categoria"
                    value={formData.categoria}
                    options={categorias}
                    onChange={handleChange}
                    placeholder="Selecciona o escribe una categoría"
                    required={true}
                />
            </div>

            {/* Calculadora VES -> USD */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden mb-5">
                <button
                    type="button"
                    onClick={() => setShowCalc(!showCalc)}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                >
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        <TbCalculator size={18} className="text-blue-500" />
                        Calculadora VES → USD
                    </div>
                    {showCalc ? <TbChevronUp size={18} className="text-gray-400" /> : <TbChevronDown size={18} className="text-gray-400" />}
                </button>

                {showCalc && (
                    <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 space-y-4">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                📡 Tasa Binance: <span className="font-bold text-gray-800 dark:text-gray-200">{rateLoading ? 'Cargando...' : binanceRate ? `${binanceRate} Bs/$` : 'N/A'}</span>
                            </span>
                            {rateLastUpdate && (
                                <span className="text-gray-400">
                                    Actualizado: {format(rateLastUpdate, 'HH:mm:ss')}
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Monto en Bs</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={calcMontoBs}
                                    onChange={(e) => setCalcMontoBs(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full px-3 py-2 text-sm rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Tasa VES/USD</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={calcTasa}
                                    onChange={(e) => setCalcTasa(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full px-3 py-2 text-sm rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800/30">
                            <div>
                                <span className="text-xs text-blue-600 dark:text-blue-400 block mb-1">Resultado</span>
                                <span className="text-lg font-bold text-blue-700 dark:text-blue-300">$ {calcResult()} Ref.</span>
                            </div>
                            <button
                                type="button"
                                onClick={handleUseCalcMonto}
                                disabled={calcResult() === '0.00'}
                                className="px-3 py-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50 transition-colors"
                            >
                                Usar monto →
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Monto del Gasto</label>
                <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="monto"
                    value={formData.monto}
                    onChange={handleChange}
                    placeholder="0.00"
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-700 border-none focus:ring-2 focus:ring-red-500 text-gray-900 dark:text-white text-xl font-bold"
                    required
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Detalle Adicional (Opcional)</label>
                <AutocompleteInput
                    name="detalle"
                    value={formData.detalle}
                    options={detalles}
                    onChange={handleChange}
                    placeholder="Ej. Almuerzo negocio"
                    required={false}
                />
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full mt-6 bg-red-600 hover:bg-red-700 text-white font-semibold py-4 px-6 rounded-xl shadow-md disabled:opacity-75 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-2"
            >
                {loading ? 'Guardando...' : success ? <><TbCheck size={20} /> Guardado Exitosamente</> : 'Registrar Gasto'}
            </button>
        </form >
    );
};

// ── Main Unified Page ──────────────────────────────────────────────────────────
const NuevoRegistro = () => {
    const [activeTab, setActiveTab] = useState('ingreso');

    const isIngreso = activeTab === 'ingreso';

    return (
        <div className="max-w-md mx-auto">
            {/* Tab Switcher */}
            <div className="flex rounded-2xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
                <button
                    onClick={() => setActiveTab('ingreso')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all duration-200 ${isIngreso
                        ? 'bg-blue-600 text-white shadow-inner'
                        : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                >
                    <TbBusinessplan size={18} />
                    Ingreso
                </button>
                <button
                    onClick={() => setActiveTab('gasto')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all duration-200 ${!isIngreso
                        ? 'bg-red-600 text-white shadow-inner'
                        : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                >
                    <TbFileInvoice size={18} />
                    Gasto
                </button>
            </div>

            {/* Form Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-visible">
                <div className="p-6 pb-32">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-6">
                        <div className={`p-3 rounded-xl ${isIngreso ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' : 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400'}`}>
                            {isIngreso ? <TbBusinessplan size={24} /> : <TbFileInvoice size={24} />}
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                            {isIngreso ? 'Nuevo Ingreso' : 'Nuevo Gasto'}
                        </h2>
                    </div>

                    {/* Active Panel */}
                    {isIngreso ? <IngresoPanel /> : <GastoPanel />}
                </div>
            </div>
        </div>
    );
};

export default NuevoRegistro;
