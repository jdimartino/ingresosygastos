import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, serverTimestamp, getDocs, query, limit, where } from 'firebase/firestore';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { TbBusinessplan, TbFileInvoice, TbCheck, TbCalculator, TbChevronDown, TbChevronUp, TbPlus } from 'react-icons/tb';
import { useAuth } from '../context/AuthContext';
import AutocompleteInput from '../components/AutocompleteInput';
import KPICards from '../components/KPICards';

// ── Helper: Fetch totales del mes actual ────────────────────────────────────
const fetchTotalesMes = async () => {
    const hoy = new Date();
    const primerDia = startOfMonth(hoy);
    const ultimoDia = endOfMonth(hoy);

    try {
        const [ingresoSnap, gastoSnap] = await Promise.all([
            getDocs(query(collection(db, 'ingresos'), where('fecha', '>=', format(primerDia, 'yyyy-MM-dd')), where('fecha', '<=', format(ultimoDia, 'yyyy-MM-dd')))),
            getDocs(query(collection(db, 'gastos'), where('fecha', '>=', format(primerDia, 'yyyy-MM-dd')), where('fecha', '<=', format(ultimoDia, 'yyyy-MM-dd'))))
        ]);

        // Separar comisiones de aportes
        const totalAportes = ingresoSnap.docs
            .filter(doc => doc.data().tipo === 'aporte_fondo_vitalicio')
            .reduce((sum, doc) => sum + (doc.data().ingresoReal || 0), 0);

        const totalIngresos = ingresoSnap.docs
            .filter(doc => doc.data().tipo !== 'aporte_fondo_vitalicio')
            .reduce((sum, doc) => sum + (doc.data().ingresoReal || 0), 0);

        const totalGastos = gastoSnap.docs.reduce((sum, doc) => sum + (doc.data().monto || 0), 0);

        return { totalIngresos, totalGastos, totalAportes };
    } catch (error) {
        console.error('Error al obtener totales:', error);
        return { totalIngresos: 0, totalGastos: 0, totalAportes: 0 };
    }
};

// ── Ingreso Form ───────────────────────────────────────────────────────────────
const IngresoPanel = () => {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        fecha: format(new Date(), 'yyyy-MM-dd'),
        cliente: '',
        montoBase: '',
        porcentaje: ''
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [validationError, setValidationError] = useState('');
    const [clientesTotales, setClientesTotales] = useState([]);
    const [resumen, setResumen] = useState(null);

    useEffect(() => {
        if (!user) return;  // Esperar a que Firebase Auth restaure la sesión
        const fetchClientes = async () => {
            try {
                // Fix 9: límite de 200 docs para el autocomplete
                const querySnapshot = await getDocs(query(collection(db, 'ingresos'), limit(200)));
                const list = querySnapshot.docs.map(doc => doc.data().cliente);
                setClientesTotales([...new Set(list)].filter(Boolean).sort());
            } catch {
                // Fallo silencioso: el autocomplete simplemente no muestra sugerencias
            }
        };
        fetchClientes();
    }, [user]);

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
        setValidationError('');

        // Fix 7: Feedback claro en validación
        const cliente = formData.cliente.trim();
        const montoBase = parseFloat(formData.montoBase);
        const porcentaje = parseFloat(formData.porcentaje);

        if (!cliente) { setValidationError('El campo Cliente es obligatorio.'); return; }
        if (!formData.montoBase) { setValidationError('El Monto Base es obligatorio.'); return; }
        if (!formData.porcentaje) { setValidationError('El Porcentaje es obligatorio.'); return; }
        if (montoBase <= 0) { setValidationError('El Monto Base debe ser mayor a 0.'); return; }
        // Fix 4: validación de rango en porcentaje
        if (porcentaje < 0 || porcentaje > 100) { setValidationError('El Porcentaje debe estar entre 0 y 100.'); return; }

        setLoading(true);
        setSuccess(false);
        try {
            const ingresoReal = calculateIngresoReal();
            await addDoc(collection(db, 'ingresos'), {
                fecha: formData.fecha,
                cliente,          // Fix 15: trimmed
                montoBase,
                porcentaje,
                ingresoReal,
                timestampRegistro: serverTimestamp()
            });
            setSuccess(true);
            setFormData(prev => ({ ...prev, montoBase: '', cliente: '' }));

            // Fetch y mostrar totales del mes
            const totales = await fetchTotalesMes();
            setResumen(totales);
        } catch {
            setValidationError('Error al guardar el registro. Intenta nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    // Mostrar resumen si existe
    if (resumen) {
        return (
            <div className="space-y-5">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800 flex items-center gap-3">
                    <TbCheck size={24} className="text-green-600 dark:text-green-400" />
                    <div>
                        <h3 className="font-semibold text-green-700 dark:text-green-400">¡Ingreso registrado!</h3>
                        <p className="text-sm text-green-600 dark:text-green-300">Aquí está el resumen de tu mes</p>
                    </div>
                </div>

                <KPICards ingresosTotales={resumen.totalIngresos} gastosTotales={resumen.totalGastos} compact={true} />

                <button
                    onClick={() => {
                        setResumen(null);
                        setFormData(prev => ({ ...prev, fecha: format(new Date(), 'yyyy-MM-dd'), porcentaje: '' }));
                    }}
                    className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl shadow-md transition-all flex justify-center items-center gap-2"
                >
                    <TbPlus size={20} />
                    Registrar otro ingreso
                </button>
            </div>
        );
    }

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
                    aria-label="Fecha del ingreso"
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
                    ariaLabel="Nombre del cliente"
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
                        aria-label="Monto base del ingreso"
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
                        max="100"
                        name="porcentaje"
                        value={formData.porcentaje}
                        onChange={handleChange}
                        placeholder="0"
                        aria-label="Porcentaje de comisión"
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

            {/* Fix 7: Mensaje de error visible */}
            {validationError && (
                <p className="text-sm text-red-600 dark:text-red-400 font-medium" role="alert">{validationError}</p>
            )}

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

// ── Aporte Fondo Vitalicio Form ───────────────────────────────────────────────
const AportePanel = () => {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        fecha: format(new Date(), 'yyyy-MM-dd'),
        monto: ''
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [validationError, setValidationError] = useState('');
    const [resumen, setResumen] = useState(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setValidationError('');

        const monto = parseFloat(formData.monto);

        if (!formData.monto) { setValidationError('El Monto es obligatorio.'); return; }
        if (monto <= 0) { setValidationError('El Monto debe ser mayor a 0.'); return; }

        setLoading(true);
        setSuccess(false);
        try {
            await addDoc(collection(db, 'ingresos'), {
                fecha: formData.fecha,
                tipo: 'aporte_fondo_vitalicio',
                ingresoReal: monto,
                timestampRegistro: serverTimestamp()
            });
            setSuccess(true);
            setFormData(prev => ({ ...prev, monto: '' }));

            const totales = await fetchTotalesMes();
            setResumen(totales);
        } catch {
            setValidationError('Error al guardar el registro. Intenta nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    if (resumen) {
        return (
            <div className="space-y-5">
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-800 flex items-center gap-3">
                    <TbCheck size={24} className="text-purple-600 dark:text-purple-400" />
                    <div>
                        <h3 className="font-semibold text-purple-700 dark:text-purple-400">¡Aporte registrado!</h3>
                        <p className="text-sm text-purple-600 dark:text-purple-300">Aquí está el resumen de tu mes</p>
                    </div>
                </div>

                <KPICards ingresosTotales={resumen.totalIngresos} gastosTotales={resumen.totalGastos} totalAportes={resumen.totalAportes} compact={true} />

                <button
                    onClick={() => {
                        setResumen(null);
                        setFormData(prev => ({ ...prev, fecha: format(new Date(), 'yyyy-MM-dd') }));
                    }}
                    className="w-full mt-6 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 px-6 rounded-xl shadow-md transition-all flex justify-center items-center gap-2"
                >
                    <TbPlus size={20} />
                    Registrar otro aporte
                </button>
            </div>
        );
    }

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
                    aria-label="Fecha del aporte"
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-700 border-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white"
                    required
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Monto del Aporte</label>
                <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="monto"
                    value={formData.monto}
                    onChange={handleChange}
                    placeholder="0.00"
                    aria-label="Monto del aporte fondo vitalicio"
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-700 border-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white text-xl font-bold"
                    required
                />
            </div>

            {validationError && (
                <p className="text-sm text-red-600 dark:text-red-400 font-medium" role="alert">{validationError}</p>
            )}

            <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 px-6 rounded-xl shadow-md disabled:opacity-75 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-2"
            >
                {loading ? 'Guardando...' : success ? <><TbCheck size={20} /> Guardado Exitosamente</> : 'Registrar Aporte'}
            </button>
        </form>
    );
};

// ── Gasto Form ─────────────────────────────────────────────────────────────────
// ── Gasto Form ─────────────────────────────────────────────────────────────────
const GastoPanel = () => {
    const { user } = useAuth();
    
    // Check if Colombia Mode is selected
    const [currency, setCurrency] = useState(() => {
        try {
            return localStorage.getItem('gastoCurrency') || 'VES';
        } catch {
            return 'VES';
        }
    });

    const modoColombia = currency === 'COP';

    const [formData, setFormData] = useState({
        fecha: format(new Date(), 'yyyy-MM-dd'),
        categoria: '',
        monto: '',
        detalle: '',
        montoBs: null,
        montoCop: null
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [validationError, setValidationError] = useState('');
    const [categorias, setCategorias] = useState([]);
    const [detalles, setDetalles] = useState([]);
    const [resumen, setResumen] = useState(null);

    // Calculator states
    const [calcMontoLocal, setCalcMontoLocal] = useState('');
    const [calcTasa, setCalcTasa] = useState('');
    const [apiRate, setApiRate] = useState(null);
    const [rateLoading, setRateLoading] = useState(false);
    const [rateLastUpdate, setRateLastUpdate] = useState(null);

    // Fetch Rate depending on selected currency
    const fetchExchangeRate = useCallback(async (selectedCurr) => {
        setRateLoading(true);
        setApiRate(null);
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            if (selectedCurr === 'COP') {
                // Colombia API
                const res = await fetch('https://co.dolarapi.com/v1/trm', { signal: controller.signal });
                clearTimeout(timeoutId);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                if (data && data.valor) {
                    setApiRate(data.valor);
                    setCalcTasa(data.valor.toString()); // Auto-fill rate for Colombia
                    setRateLastUpdate(new Date());
                }
            } else {
                // Venezuela API
                const res = await fetch('https://ve.dolarapi.com/v1/dolares', { signal: controller.signal });
                clearTimeout(timeoutId);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                if (!Array.isArray(data)) throw new Error('Formato inválido');
                const paralelo = data.find(item => item?.fuente === 'paralelo' && item?.promedio);
                if (!paralelo) throw new Error('No paralelos');
                setApiRate(paralelo.promedio);
                setCalcTasa(''); // VES typically manual input, leave blank for manual override
                setRateLastUpdate(new Date());
            }
        } catch (e) {
            console.warn('Silent rate fetch failed:', e);
        } finally {
            setRateLoading(false);
        }
    }, []);

    // Fetch rate on mount or when currency changes
    useEffect(() => {
        fetchExchangeRate(currency);
    }, [currency, fetchExchangeRate]);

    const handleCurrencyChange = (newCurr) => {
        setCurrency(newCurr);
        try {
            localStorage.setItem('gastoCurrency', newCurr);
        } catch { /* noop */ }
        setCalcMontoLocal('');
        setCalcTasa('');
        setFormData(prev => ({ ...prev, montoBs: null, montoCop: null }));
    };

    const calcResult = () => {
        const localVal = parseFloat(calcMontoLocal);
        const tasa = parseFloat(calcTasa);
        if (localVal > 0 && tasa > 0) {
            return (localVal / tasa).toFixed(2);
        }
        return '0.00';
    };

    const handleUseCalcMonto = () => {
        const res = calcResult();
        if (res !== '0.00') {
            if (modoColombia) {
                setFormData(prev => ({ ...prev, monto: res, montoCop: parseFloat(calcMontoLocal), montoBs: null }));
            } else {
                setFormData(prev => ({ ...prev, monto: res, montoBs: parseFloat(calcMontoLocal), montoCop: null }));
            }
        }
    };

    // Auto-apply result when calcResult changes to avoid manual "Usar monto" step for maximum speed
    useEffect(() => {
        const res = calcResult();
        if (res !== '0.00') {
            if (modoColombia) {
                setFormData(prev => ({ ...prev, monto: res, montoCop: parseFloat(calcMontoLocal), montoBs: null }));
            } else {
                setFormData(prev => ({ ...prev, monto: res, montoBs: parseFloat(calcMontoLocal), montoCop: null }));
            }
        } else {
            setFormData(prev => ({ ...prev, monto: '' }));
        }
    }, [calcMontoLocal, calcTasa, modoColombia]);

    useEffect(() => {
        if (!user) return;
        const fetchData = async () => {
            try {
                const querySnapshot = await getDocs(query(collection(db, 'gastos'), limit(200)));
                const cats = querySnapshot.docs.map(doc => doc.data().categoria);
                const dets = querySnapshot.docs.map(doc => doc.data().detalle);
                setCategorias([...new Set(cats)].filter(Boolean).sort());
                setDetalles([...new Set(dets)].filter(Boolean).sort());
            } catch {
                // Silent catch
            }
        };
        fetchData();
    }, [user]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setValidationError('');

        const categoria = formData.categoria.trim();
        const monto = parseFloat(formData.monto);

        if (!categoria) { setValidationError('La Categoría es obligatoria.'); return; }
        if (!formData.monto) { setValidationError('El Monto es obligatorio.'); return; }
        if (monto <= 0) { setValidationError('El Monto debe ser mayor a 0.'); return; }

        setLoading(true);
        setSuccess(false);
        try {
            await addDoc(collection(db, 'gastos'), {
                fecha: formData.fecha,
                categoria,
                monto,
                montoBs: modoColombia ? null : (formData.montoBs || null),
                montoCop: modoColombia ? (formData.montoCop || null) : null,
                detalle: formData.detalle.trim(),
                timestampRegistro: serverTimestamp()
            });
            setSuccess(true);
            setFormData(prev => ({ ...prev, monto: '', detalle: '', montoBs: null, montoCop: null }));
            setCalcMontoLocal('');

            const totales = await fetchTotalesMes();
            setResumen(totales);
        } catch {
            setValidationError('Error al guardar el registro. Intenta nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    if (resumen) {
        return (
            <div className="space-y-4">
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800 flex items-center gap-3">
                    <TbCheck size={24} className="text-red-600 dark:text-red-400" />
                    <div>
                        <h3 className="font-semibold text-red-700 dark:text-red-400">¡Gasto registrado!</h3>
                        <p className="text-sm text-red-600 dark:text-red-300">Aquí está el resumen de tu mes</p>
                    </div>
                </div>

                <KPICards ingresosTotales={resumen.totalIngresos} gastosTotales={resumen.totalGastos} compact={true} />

                <button
                    onClick={() => {
                        setResumen(null);
                        setFormData(prev => ({ ...prev, fecha: format(new Date(), 'yyyy-MM-dd') }));
                    }}
                    className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white font-semibold py-3.5 px-6 rounded-xl shadow-md transition-all flex justify-center items-center gap-2"
                >
                    <TbPlus size={20} />
                    Registrar otro gasto
                </button>
            </div>
        );
    }

    return (
        <form
            onSubmit={handleSubmit}
            onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
            className="space-y-4"
        >
            {/* Grid 1: Fecha y Categoría */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Fecha</label>
                    <input
                        type="date"
                        name="fecha"
                        value={formData.fecha}
                        onChange={handleChange}
                        aria-label="Fecha del gasto"
                        className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-700 border-none focus:ring-2 focus:ring-red-500 text-sm text-gray-900 dark:text-white"
                        required
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Categoría</label>
                    <AutocompleteInput
                        name="categoria"
                        value={formData.categoria}
                        options={categorias}
                        onChange={handleChange}
                        placeholder="Categoría"
                        required={true}
                        ariaLabel="Categoría del gasto"
                    />
                </div>
            </div>

            {/* Conversor Integrado Siempre Visible */}
            <div className={`p-4 rounded-xl border transition-all ${
                modoColombia 
                    ? 'bg-yellow-50/20 border-yellow-200 dark:border-yellow-900/40 dark:bg-yellow-950/5' 
                    : 'bg-blue-50/10 border-blue-100 dark:border-blue-900/20 dark:bg-blue-950/5'
            }`}>
                {/* Header Conversor: Title + Selector Segmentado */}
                <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                        <TbCalculator size={16} className={modoColombia ? "text-amber-500" : "text-blue-500"} />
                        Conversión de Moneda
                    </span>

                    {/* Selector de moneda integrado */}
                    <div className="flex bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg border border-gray-200 dark:border-gray-700">
                        <button
                            type="button"
                            onClick={() => handleCurrencyChange('VES')}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 ${
                                !modoColombia
                                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
                            }`}
                        >
                            <span>🇻🇪</span> VES
                        </button>
                        <button
                            type="button"
                            onClick={() => handleCurrencyChange('COP')}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 ${
                                modoColombia
                                    ? 'bg-white dark:bg-gray-700 text-amber-600 dark:text-amber-400 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
                            }`}
                        >
                            <span>🇨🇴</span> COP
                        </button>
                    </div>
                </div>

                {/* Subinfo de tasa */}
                <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 mb-3 border-b border-gray-100 dark:border-gray-800 pb-2">
                    <span>
                        📡 {modoColombia ? 'Tasa TRM:' : 'Tasa Paralelo:'}{' '}
                        <strong className="text-gray-700 dark:text-gray-300">
                            {rateLoading 
                                ? 'Cargando...' 
                                : apiRate 
                                    ? `${apiRate} ${modoColombia ? 'COP' : 'Bs'}/$` 
                                    : 'N/A'
                            }
                        </strong>
                    </span>
                    {rateLastUpdate && (
                        <span className="opacity-80">
                            Act: {format(rateLastUpdate, 'HH:mm:ss')}
                        </span>
                    )}
                </div>

                {/* Grid Inputs Calculadora */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400 mb-1">
                            {modoColombia ? 'Monto en COP' : 'Monto en Bs'}
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={calcMontoLocal}
                            onChange={(e) => setCalcMontoLocal(e.target.value)}
                            placeholder="0.00"
                            aria-label={modoColombia ? 'Monto en pesos colombianos' : 'Monto en bolívares'}
                            className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-1 focus:ring-red-500 text-gray-900 dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400 mb-1">
                            Tasa de Cambio
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={calcTasa}
                            onChange={(e) => setCalcTasa(e.target.value)}
                            placeholder="0.00"
                            aria-label="Tasa de cambio por USD"
                            className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-1 focus:ring-red-500 text-gray-900 dark:text-white"
                        />
                    </div>
                </div>
            </div>

            {/* Grid 2: Monto USD y Detalle */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                        Monto del Gasto (USD)
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        min="0"
                        name="monto"
                        value={formData.monto}
                        onChange={handleChange}
                        placeholder="0.00"
                        aria-label="Monto del gasto en USD"
                        className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-700 border-none focus:ring-2 focus:ring-red-500 text-base font-bold text-gray-900 dark:text-white"
                        required
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Detalle Adicional</label>
                    <AutocompleteInput
                        name="detalle"
                        value={formData.detalle}
                        options={detalles}
                        onChange={handleChange}
                        placeholder="Detalle (opcional)"
                        required={false}
                        ariaLabel="Detalle adicional del gasto"
                    />
                </div>
            </div>

            {validationError && (
                <p className="text-sm text-red-600 dark:text-red-400 font-medium" role="alert">{validationError}</p>
            )}

            <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-xl shadow-md disabled:opacity-75 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-2"
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
    const isGasto = activeTab === 'gasto';
    const isAporte = activeTab === 'aporte';

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
                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all duration-200 ${isGasto
                        ? 'bg-red-600 text-white shadow-inner'
                        : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                >
                    <TbFileInvoice size={18} />
                    Gasto
                </button>
                <button
                    onClick={() => setActiveTab('aporte')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all duration-200 ${isAporte
                        ? 'bg-purple-600 text-white shadow-inner'
                        : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                >
                    <TbBusinessplan size={18} />
                    Aporte
                </button>
            </div>

            {/* Form Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-visible">
                <div className="p-6 pb-32">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-6">
                        <div className={`p-3 rounded-xl ${
                            isIngreso ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' :
                            isGasto ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400' :
                            'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400'
                        }`}>
                            {isIngreso ? <TbBusinessplan size={24} /> : isGasto ? <TbFileInvoice size={24} /> : <TbBusinessplan size={24} />}
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                            {isIngreso ? 'Nuevo Ingreso' : isGasto ? 'Nuevo Gasto' : 'Aporte Fondo Vitalicio'}
                        </h2>
                    </div>

                    {/* Active Panel */}
                    {isIngreso ? <IngresoPanel /> : isGasto ? <GastoPanel /> : <AportePanel />}
                </div>
            </div>
        </div>
    );
};

export default NuevoRegistro;
