import { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, getDocs, deleteDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { TbBuildingWarehouse, TbCheck, TbTrash, TbCalculator, TbPencil, TbX } from 'react-icons/tb';
import AutocompleteInput from '../components/AutocompleteInput';
import { formatFecha } from '../utils/format';

// Colecciones aisladas: no se mezclan con 'gastos' ni 'ingresos'
const COL_GASTOS = 'galpon_gastos';
const COL_INGRESOS = 'galpon_ingresos';

const usd = (n) => `$${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ── Formulario compartido (gasto o canon) ─────────────────────────────────────
const RegistroForm = ({ tipo, categorias, detalles, onSaved }) => {
    const esGasto = tipo === 'gasto';
    const [formData, setFormData] = useState({
        fecha: format(new Date(), 'yyyy-MM-dd'),
        categoria: '',
        monto: '',
        detalle: '',
        montoBs: null,
        tasa: null,
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [validationError, setValidationError] = useState('');

    // Conversor Bs → USD (misma tasa paralelo que el resto de la app)
    const [calcMontoBs, setCalcMontoBs] = useState('');
    const [calcTasa, setCalcTasa] = useState('');
    const [apiRate, setApiRate] = useState(null);
    const [rateLoading, setRateLoading] = useState(false);
    const [rateLastUpdate, setRateLastUpdate] = useState(null);

    const fetchRate = useCallback(async () => {
        setRateLoading(true);
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);
            const res = await fetch('https://ve.dolarapi.com/v1/dolares', { signal: controller.signal });
            clearTimeout(timeoutId);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            if (!Array.isArray(data)) throw new Error('Formato inválido');
            const paralelo = data.find(item => item?.fuente === 'paralelo' && item?.promedio);
            if (!paralelo) throw new Error('No paralelos');
            setApiRate(paralelo.promedio);
            setRateLastUpdate(new Date());
        } catch (e) {
            console.warn('Silent rate fetch failed:', e);
        } finally {
            setRateLoading(false);
        }
    }, []);

    useEffect(() => { fetchRate(); }, [fetchRate]);

    const calcResult = () => {
        const bs = parseFloat(calcMontoBs);
        const tasa = parseFloat(calcTasa);
        return bs > 0 && tasa > 0 ? (bs / tasa).toFixed(2) : '0.00';
    };

    // Al calcular, el USD queda fijado con la tasa del día del registro
    useEffect(() => {
        const res = calcResult();
        if (res !== '0.00') {
            setFormData(prev => ({
                ...prev,
                monto: res,
                montoBs: parseFloat(calcMontoBs),
                tasa: parseFloat(calcTasa),
            }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [calcMontoBs, calcTasa]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setValidationError('');

        const categoria = formData.categoria.trim();
        const monto = parseFloat(formData.monto);

        if (esGasto && !categoria) { setValidationError('La Categoría es obligatoria.'); return; }
        if (!formData.monto) { setValidationError('El Monto es obligatorio.'); return; }
        if (!(monto > 0)) { setValidationError('El Monto debe ser mayor a 0.'); return; }

        setLoading(true);
        setSuccess(false);
        try {
            await addDoc(collection(db, esGasto ? COL_GASTOS : COL_INGRESOS), {
                fecha: formData.fecha,
                categoria: esGasto ? categoria : 'Canon de arrendamiento',
                monto,
                montoBs: formData.montoBs || null,
                tasa: formData.tasa || null,
                detalle: formData.detalle.trim(),
                timestampRegistro: serverTimestamp(),
            });
            setSuccess(true);
            setFormData(prev => ({ ...prev, monto: '', detalle: '', montoBs: null, tasa: null }));
            setCalcMontoBs('');
            onSaved();
            setTimeout(() => setSuccess(false), 3000);
        } catch {
            setValidationError('Error al guardar el registro. Intenta nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    const ring = esGasto ? 'focus:ring-red-500' : 'focus:ring-green-500';

    return (
        <form
            onSubmit={handleSubmit}
            onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
            className="space-y-4"
        >
            <div className={esGasto ? 'grid grid-cols-2 gap-3' : ''}>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Fecha</label>
                    <input
                        type="date"
                        name="fecha"
                        value={formData.fecha}
                        onChange={handleChange}
                        aria-label="Fecha del registro"
                        className={`w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-700 border-none focus:ring-2 ${ring} text-sm text-gray-900 dark:text-white`}
                        required
                    />
                </div>
                {esGasto && (
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
                )}
            </div>

            {/* Conversor Bs → USD */}
            <div className="p-4 rounded-xl border bg-blue-50/10 border-blue-100 dark:border-blue-900/20 dark:bg-blue-950/5">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                        <TbCalculator size={16} className="text-blue-500" />
                        Conversión de Moneda (Bs → USD)
                    </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 mb-3 border-b border-gray-100 dark:border-gray-800 pb-2">
                    <span>
                        📡 Tasa Paralelo:{' '}
                        <strong className="text-gray-700 dark:text-gray-300">
                            {rateLoading ? 'Cargando...' : apiRate ? `${apiRate} Bs/$` : 'N/A'}
                        </strong>
                    </span>
                    {rateLastUpdate && <span className="opacity-80">Act: {format(rateLastUpdate, 'HH:mm:ss')}</span>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400 mb-1">Monto en Bs</label>
                        <input
                            type="number" step="0.01" min="0"
                            value={calcMontoBs}
                            onChange={(e) => setCalcMontoBs(e.target.value)}
                            placeholder="0.00"
                            aria-label="Monto en bolívares"
                            className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400 mb-1">Tasa de Cambio</label>
                        <input
                            type="number" step="0.01" min="0"
                            value={calcTasa}
                            onChange={(e) => setCalcTasa(e.target.value)}
                            placeholder={apiRate ? String(apiRate) : '0.00'}
                            aria-label="Tasa de cambio por USD"
                            className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
                        />
                    </div>
                </div>
                {apiRate && !calcTasa && (
                    <button
                        type="button"
                        onClick={() => setCalcTasa(String(apiRate))}
                        className="mt-2 text-xs text-blue-600 dark:text-blue-400 font-medium"
                    >
                        Usar tasa de hoy ({apiRate})
                    </button>
                )}
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                        {esGasto ? 'Monto del Gasto (USD)' : 'Monto del Canon (USD)'}
                    </label>
                    <input
                        type="number" step="0.01" min="0"
                        name="monto"
                        value={formData.monto}
                        onChange={handleChange}
                        placeholder="0.00"
                        aria-label="Monto en USD"
                        className={`w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-700 border-none focus:ring-2 ${ring} text-base font-bold text-gray-900 dark:text-white`}
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
                        ariaLabel="Detalle adicional"
                    />
                </div>
            </div>

            {validationError && (
                <p className="text-sm text-red-600 dark:text-red-400 font-medium" role="alert">{validationError}</p>
            )}

            <button
                type="submit"
                disabled={loading}
                className={`w-full mt-2 ${esGasto ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white font-semibold py-3 px-6 rounded-xl shadow-md disabled:opacity-75 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-2`}
            >
                {loading ? 'Guardando...' : success ? <><TbCheck size={20} /> Guardado Exitosamente</> : esGasto ? 'Registrar Gasto' : 'Registrar Canon'}
            </button>
        </form>
    );
};

// ── Resumen ───────────────────────────────────────────────────────────────────
const Resumen = ({ gastos, ingresos }) => {
    const invertido = gastos.reduce((s, g) => s + (g.monto || 0), 0);
    const recuperado = ingresos.reduce((s, i) => s + (i.monto || 0), 0);
    const balance = recuperado - invertido;
    const enGanancia = balance > 0;
    const pct = invertido > 0 ? Math.min(100, (recuperado / invertido) * 100) : 0;

    const cardBase = 'rounded-xl p-4 border';
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
                <div className={`${cardBase} bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800`}>
                    <p className="text-xs font-semibold text-red-600 dark:text-red-400">Invertido</p>
                    <p className="text-xl font-bold text-red-700 dark:text-red-300">{usd(invertido)}</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">{gastos.length} gastos</p>
                </div>
                <div className={`${cardBase} bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800`}>
                    <p className="text-xs font-semibold text-green-600 dark:text-green-400">Recuperado</p>
                    <p className="text-xl font-bold text-green-700 dark:text-green-300">{usd(recuperado)}</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">{ingresos.length} canon(es)</p>
                </div>
            </div>

            <div className={`${cardBase} ${enGanancia
                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'}`}>
                <p className={`text-xs font-semibold ${enGanancia ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {enGanancia ? '🎉 Ganancia neta' : 'Falta para quedar en cero'}
                </p>
                <p className={`text-3xl font-bold ${enGanancia ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
                    {usd(Math.abs(balance))}
                </p>
                <div className="mt-3 h-3 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all ${enGanancia ? 'bg-emerald-500' : 'bg-amber-500'}`}
                        style={{ width: `${pct}%` }}
                    />
                </div>
                <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                    {pct.toFixed(1)}% de la inversión recuperada
                </p>
            </div>
        </div>
    );
};

// ── Modal de edición ──────────────────────────────────────────────────────────
const EditModal = ({ record, categorias, onClose, onSaved }) => {
    const esGasto = record._tipo === 'gasto';
    const [formData, setFormData] = useState(() => ({
        fecha: record.fecha || '',
        categoria: record.categoria || '',
        monto: record.monto ?? '',
        montoBs: record.montoBs ?? '',
        tasa: record.tasa ?? '',
        detalle: record.detalle || '',
    }));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const next = { ...prev, [name]: value };
            // Si cambian Bs o tasa, el USD se recalcula
            if (name === 'montoBs' || name === 'tasa') {
                const bs = parseFloat(next.montoBs);
                const tasa = parseFloat(next.tasa);
                if (bs > 0 && tasa > 0) next.monto = (bs / tasa).toFixed(2);
            }
            return next;
        });
    };

    const handleSave = async () => {
        setError('');
        const categoria = formData.categoria.trim();
        const monto = parseFloat(formData.monto);
        if (esGasto && !categoria) { setError('La Categoría es obligatoria.'); return; }
        if (!(monto > 0)) { setError('El Monto debe ser mayor a 0.'); return; }

        setSaving(true);
        try {
            await updateDoc(doc(db, esGasto ? COL_GASTOS : COL_INGRESOS, record.id), {
                fecha: formData.fecha,
                categoria: esGasto ? categoria : 'Canon de arrendamiento',
                monto,
                montoBs: formData.montoBs ? parseFloat(formData.montoBs) : null,
                tasa: formData.tasa ? parseFloat(formData.tasa) : null,
                detalle: formData.detalle.trim(),
                timestampModificado: serverTimestamp(),
            });
            onSaved();
        } catch {
            setError('Error al guardar. Intenta nuevamente.');
        } finally {
            setSaving(false);
        }
    };

    const ring = esGasto ? 'focus:ring-red-500' : 'focus:ring-green-500';
    const inputCls = `w-full px-3 py-2.5 text-sm rounded-xl bg-gray-50 dark:bg-gray-700 border-none focus:ring-2 ${ring} text-gray-900 dark:text-white`;
    const labelCls = 'block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-100 dark:border-gray-700"
                onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }}
            >
                <div className="flex justify-between items-center px-6 pt-5 pb-4 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        Editar {esGasto ? 'Gasto' : 'Canon'}
                    </h3>
                    <button onClick={onClose} aria-label="Cerrar modal" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <TbX size={20} />
                    </button>
                </div>

                <div className="px-6 py-4 space-y-4">
                    <div>
                        <label className={labelCls}>Fecha</label>
                        <input type="date" name="fecha" value={formData.fecha} onChange={handleChange}
                            aria-label="Fecha del registro" className={inputCls} />
                    </div>

                    {esGasto && (
                        <div>
                            <label className={labelCls}>Categoría</label>
                            <AutocompleteInput
                                name="categoria"
                                value={formData.categoria}
                                options={categorias}
                                onChange={handleChange}
                                placeholder="Selecciona o escribe una categoría"
                                required={true}
                                ariaLabel="Categoría del gasto"
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelCls}>Monto (Bs.)</label>
                            <input type="number" step="0.01" min="0" name="montoBs" value={formData.montoBs} onChange={handleChange}
                                aria-label="Monto en bolívares" className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Tasa</label>
                            <input type="number" step="0.01" min="0" name="tasa" value={formData.tasa} onChange={handleChange}
                                aria-label="Tasa de cambio" className={inputCls} />
                        </div>
                    </div>

                    <div>
                        <label className={labelCls}>Monto (USD)</label>
                        <input type="number" step="0.01" min="0" name="monto" value={formData.monto} onChange={handleChange}
                            aria-label="Monto en USD" className={`${inputCls} font-bold`} />
                    </div>

                    <div>
                        <label className={labelCls}>Detalle (Opcional)</label>
                        <input type="text" name="detalle" value={formData.detalle} onChange={handleChange}
                            aria-label="Detalle adicional" className={inputCls} />
                    </div>

                    {error && (
                        <p className="text-sm text-red-600 dark:text-red-400 font-medium" role="alert">{error}</p>
                    )}
                </div>

                <div className="flex gap-3 px-6 pb-5">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-colors flex items-center justify-center gap-2 ${esGasto ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                    >
                        <TbCheck size={16} /> {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Historial ─────────────────────────────────────────────────────────────────
const Historial = ({ gastos, ingresos, categorias, onChanged }) => {
    const [filtro, setFiltro] = useState('todos');
    const [editing, setEditing] = useState(null);

    const items = useMemo(() => {
        const g = gastos.map(r => ({ ...r, _tipo: 'gasto' }));
        const i = ingresos.map(r => ({ ...r, _tipo: 'ingreso' }));
        const all = filtro === 'gasto' ? g : filtro === 'ingreso' ? i : [...g, ...i];
        return all.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    }, [gastos, ingresos, filtro]);

    const handleDelete = async (item) => {
        if (!window.confirm(`¿Eliminar ${item.categoria} por ${usd(item.monto)}?`)) return;
        try {
            await deleteDoc(doc(db, item._tipo === 'gasto' ? COL_GASTOS : COL_INGRESOS, item.id));
            onChanged();
        } catch {
            alert('No se pudo eliminar el registro.');
        }
    };

    const chip = (key, label) => (
        <button
            key={key}
            onClick={() => setFiltro(key)}
            className={`px-3 py-1 text-xs font-semibold rounded-full border transition-colors ${filtro === key
                ? 'bg-gray-800 text-white border-gray-800 dark:bg-gray-200 dark:text-gray-900'
                : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'}`}
        >
            {label}
        </button>
    );

    return (
        <div className="space-y-3">
            <div className="flex gap-2">
                {chip('todos', 'Todos')}
                {chip('gasto', 'Gastos')}
                {chip('ingreso', 'Canon')}
            </div>
            {items.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">Sin movimientos todavía.</p>
            ) : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                    {items.map(item => (
                        <li key={`${item._tipo}-${item.id}`} className="py-3 flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{item.categoria}</p>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                                    {formatFecha(item.fecha)}
                                    {item.detalle ? ` · ${item.detalle}` : ''}
                                    {item.montoBs ? ` · Bs ${item.montoBs.toLocaleString('en-US')} @ ${item.tasa}` : ''}
                                </p>
                            </div>
                            <span className={`text-sm font-bold ${item._tipo === 'gasto' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                {item._tipo === 'gasto' ? '-' : '+'}{usd(item.monto)}
                            </span>
                            <button
                                onClick={() => setEditing(item)}
                                aria-label="Editar registro"
                                className="p-1.5 text-gray-400 hover:text-blue-500 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                            >
                                <TbPencil size={16} />
                            </button>
                            <button
                                onClick={() => handleDelete(item)}
                                aria-label="Eliminar registro"
                                className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                                <TbTrash size={16} />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            {editing && (
                <EditModal
                    record={editing}
                    categorias={categorias}
                    onClose={() => setEditing(null)}
                    onSaved={() => { setEditing(null); onChanged(); }}
                />
            )}
        </div>
    );
};

// ── Página ────────────────────────────────────────────────────────────────────
const TABS = [
    { key: 'resumen', label: 'Resumen', active: 'bg-blue-600' },
    { key: 'gasto', label: 'Gasto', active: 'bg-red-600' },
    { key: 'canon', label: 'Canon', active: 'bg-green-600' },
    { key: 'historial', label: 'Historial', active: 'bg-gray-700' },
];

const Galpon = () => {
    const [activeTab, setActiveTab] = useState('resumen');
    const [gastos, setGastos] = useState([]);
    const [ingresos, setIngresos] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            const [g, i] = await Promise.all([
                getDocs(collection(db, COL_GASTOS)),
                getDocs(collection(db, COL_INGRESOS)),
            ]);
            setGastos(g.docs.map(d => ({ id: d.id, ...d.data() })));
            setIngresos(i.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
            console.error('Error cargando Galpón:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const categorias = useMemo(() => [...new Set(gastos.map(g => g.categoria))].filter(Boolean).sort(), [gastos]);
    const detallesGasto = useMemo(() => [...new Set(gastos.map(g => g.detalle))].filter(Boolean).sort(), [gastos]);
    const detallesCanon = useMemo(() => [...new Set(ingresos.map(g => g.detalle))].filter(Boolean).sort(), [ingresos]);

    return (
        <div className="max-w-md mx-auto">
            <div className="flex rounded-2xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
                {TABS.map(t => (
                    <button
                        key={t.key}
                        onClick={() => setActiveTab(t.key)}
                        className={`flex-1 py-3 text-sm font-semibold transition-all duration-200 ${activeTab === t.key
                            ? `${t.active} text-white shadow-inner`
                            : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-visible">
                <div className="p-6 pb-32">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
                            <TbBuildingWarehouse size={24} />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Galpón</h2>
                    </div>

                    {loading ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">Cargando...</p>
                    ) : activeTab === 'resumen' ? (
                        <Resumen gastos={gastos} ingresos={ingresos} />
                    ) : activeTab === 'gasto' ? (
                        <RegistroForm tipo="gasto" categorias={categorias} detalles={detallesGasto} onSaved={fetchData} />
                    ) : activeTab === 'canon' ? (
                        <RegistroForm tipo="canon" categorias={[]} detalles={detallesCanon} onSaved={fetchData} />
                    ) : (
                        <Historial gastos={gastos} ingresos={ingresos} categorias={categorias} onChanged={fetchData} />
                    )}
                </div>
            </div>
        </div>
    );
};

export default Galpon;
