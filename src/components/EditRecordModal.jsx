import { useState, useEffect } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { TbX, TbCheck, TbCalculator } from 'react-icons/tb';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import AutocompleteInput from './AutocompleteInput';

/**
 * EditRecordModal
 * Works for both "ingreso" and "gasto" record types.
 * Props:
 *   record    — the Firestore document object (must include `.id`)
 *   type      — 'ingreso' | 'gasto'
 *   onClose   — callback to close without saving
 *   onSaved   — callback called after a successful save; triggers parent refetch
 */
const EditRecordModal = ({ record, type, onClose, onSaved }) => {
    const isIngreso = type === 'ingreso';

    const [formData, setFormData] = useState(() => ({
        fecha: record.fecha || '',
        cliente: record.cliente || '',
        montoBase: record.montoBase || '',
        porcentaje: record.porcentaje || '',
        categoria: record.categoria || '',
        monto: record.monto || '',
        detalle: record.detalle || '',
        montoBs: record.montoBs || '',
    }));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const [clientesTotales, setClientesTotales] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [detalles, setDetalles] = useState([]);

    // Fix 9: límite de 200 docs para el autocomplete
    useEffect(() => {
        const fetchOptions = async () => {
            try {
                if (isIngreso) {
                    const snap = await getDocs(query(collection(db, 'ingresos'), limit(200)));
                    const list = snap.docs.map(doc => doc.data().cliente);
                    setClientesTotales([...new Set(list)].filter(Boolean).sort());
                } else {
                    const snap = await getDocs(query(collection(db, 'gastos'), limit(200)));
                    const cats = snap.docs.map(doc => doc.data().categoria);
                    const dets = snap.docs.map(doc => doc.data().detalle);
                    setCategorias([...new Set(cats)].filter(Boolean).sort());
                    setDetalles([...new Set(dets)].filter(Boolean).sort());
                }
            } catch {
                // Fallo silencioso: el autocomplete simplemente no muestra sugerencias
            }
        };
        fetchOptions();
    }, [isIngreso]);

    // Lock body scroll while modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const ingresoReal = isIngreso
        ? (parseFloat(formData.montoBase) || 0) * ((parseFloat(formData.porcentaje) || 0) / 100)
        : 0;

    const handleSave = async () => {
        setError('');

        // Fix 4: validación con rangos + Fix 15: trim de strings
        if (isIngreso) {
            const cliente = formData.cliente.trim();
            const montoBase = parseFloat(formData.montoBase);
            const porcentaje = parseFloat(formData.porcentaje);

            if (!cliente || !formData.montoBase || !formData.porcentaje) {
                setError('Cliente, Monto Base y Porcentaje son obligatorios.');
                return;
            }
            if (montoBase <= 0) { setError('El Monto Base debe ser mayor a 0.'); return; }
            if (porcentaje < 0 || porcentaje > 100) { setError('El Porcentaje debe estar entre 0 y 100.'); return; }
        } else {
            const categoria = formData.categoria.trim();
            const monto = parseFloat(formData.monto);

            if (!categoria || !formData.monto) {
                setError('Categoría y Monto son obligatorios.');
                return;
            }
            if (monto <= 0) { setError('El Monto debe ser mayor a 0.'); return; }
        }

        setSaving(true);
        try {
            const docRef = doc(db, isIngreso ? 'ingresos' : 'gastos', record.id);
            const payload = isIngreso
                ? {
                    fecha: formData.fecha,
                    cliente: formData.cliente.trim(),          // Fix 15: trimmed
                    montoBase: parseFloat(formData.montoBase),
                    porcentaje: parseFloat(formData.porcentaje),
                    ingresoReal,
                    timestampModificado: serverTimestamp(),
                }
                : {
                    fecha: formData.fecha,
                    categoria: formData.categoria.trim(),      // Fix 15: trimmed
                    monto: parseFloat(formData.monto),
                    montoBs: formData.montoBs ? parseFloat(formData.montoBs) : null,
                    detalle: formData.detalle.trim(),          // Fix 15: trimmed
                    timestampModificado: serverTimestamp(),
                };
            await updateDoc(docRef, payload);
            onSaved();
        } catch {
            // Fix 12: sin console.error que exponga detalles internos
            setError('Error al guardar. Intenta nuevamente.');
        } finally {
            setSaving(false);
        }
    };

    const accentClass = isIngreso ? 'focus:ring-blue-500' : 'focus:ring-red-500';
    const btnClass = isIngreso
        ? 'bg-blue-600 hover:bg-blue-700'
        : 'bg-red-600 hover:bg-red-700';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-100 dark:border-gray-700"
                onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }}
            >
                {/* Header */}
                <div className="flex justify-between items-center px-6 pt-5 pb-4 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        Editar {isIngreso ? 'Ingreso' : 'Gasto'}
                    </h3>
                    <button onClick={onClose} aria-label="Cerrar modal" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <TbX size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-4 space-y-4">

                    {/* Date */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Fecha</label>
                        <input type="date" name="fecha" value={formData.fecha} onChange={handleChange}
                            aria-label="Fecha del registro"
                            className={`w-full px-3 py-2.5 text-sm rounded-xl bg-gray-50 dark:bg-gray-700 border-none focus:ring-2 ${accentClass} text-gray-900 dark:text-white`} />
                    </div>

                    {isIngreso ? (
                        <>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Cliente</label>
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
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Monto Base ($)</label>
                                    <input type="number" step="0.01" min="0" name="montoBase" value={formData.montoBase} onChange={handleChange}
                                        aria-label="Monto base del ingreso"
                                        className={`w-full px-3 py-2.5 text-sm rounded-xl bg-gray-50 dark:bg-gray-700 border-none focus:ring-2 ${accentClass} text-gray-900 dark:text-white`} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Porcentaje (%)</label>
                                    <input type="number" step="0.1" min="0" max="100" name="porcentaje" value={formData.porcentaje} onChange={handleChange}
                                        aria-label="Porcentaje de comisión"
                                        className={`w-full px-3 py-2.5 text-sm rounded-xl bg-gray-50 dark:bg-gray-700 border-none focus:ring-2 ${accentClass} text-gray-900 dark:text-white`} />
                                </div>
                            </div>
                            {/* Live calculation */}
                            <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 rounded-xl px-4 py-3 border border-green-100 dark:border-green-800">
                                <TbCalculator className="text-green-600 dark:text-green-400 flex-shrink-0" size={18} />
                                <span className="text-sm text-green-700 dark:text-green-300">
                                    Comisión: <strong>${ingresoReal.toFixed(2)}</strong>
                                </span>
                            </div>
                        </>
                    ) : (
                        <>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Categoría</label>
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
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Monto ($)</label>
                                    <input type="number" step="0.01" min="0" name="monto" value={formData.monto} onChange={handleChange}
                                        aria-label="Monto del gasto"
                                        className={`w-full px-3 py-2.5 text-sm rounded-xl bg-gray-50 dark:bg-gray-700 border-none focus:ring-2 ${accentClass} text-gray-900 dark:text-white`} />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Monto (Bs.)</label>
                                    <input type="number" step="0.01" min="0" name="montoBs" value={formData.montoBs || ''} onChange={handleChange}
                                        aria-label="Monto del gasto en bolívares"
                                        className={`w-full px-3 py-2.5 text-sm rounded-xl bg-gray-50 dark:bg-gray-700 border-none focus:ring-2 ${accentClass} text-gray-900 dark:text-white`} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Detalle (Opcional)</label>
                                <AutocompleteInput
                                    name="detalle"
                                    value={formData.detalle}
                                    options={detalles}
                                    onChange={handleChange}
                                    placeholder="Ej. Almuerzo negocio"
                                    required={false}
                                    ariaLabel="Detalle adicional del gasto"
                                />
                            </div>
                        </>
                    )}

                    {error && (
                        <p className="text-sm text-red-600 dark:text-red-400 font-medium" role="alert">{error}</p>
                    )}
                </div>

                {/* Footer */}
                <div className="flex gap-3 px-6 pb-5">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-colors flex items-center justify-center gap-2 ${btnClass}`}
                    >
                        <TbCheck size={16} /> {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditRecordModal;
