import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { format } from 'date-fns';
import { TbFileInvoice, TbCheck } from 'react-icons/tb';
import AutocompleteInput from '../components/AutocompleteInput';

const GastoForm = () => {
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
        setFormData((prev) => ({ ...prev, [name]: value }));
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
            setFormData(prev => ({
                ...prev,
                monto: '',
                detalle: '',
            }));
            setTimeout(() => setSuccess(false), 3000);
        } catch (error) {
            console.error('Error guardando gasto:', error);
            alert('Hubo un error al guardar el registro. Revisa la consola.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-visible">
            <div className="p-6 pb-32">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-xl">
                        <TbFileInvoice size={24} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Nuevo Gasto</h2>
                </div>

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
                </form>
            </div>
        </div>
    );
};

export default GastoForm;
