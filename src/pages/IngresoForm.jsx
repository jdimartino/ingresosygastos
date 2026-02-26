import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { format } from 'date-fns';
import { TbBusinessplan, TbCheck } from 'react-icons/tb';
import AutocompleteInput from '../components/AutocompleteInput';

const IngresoForm = () => {
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
                const uniqueClientes = [...new Set(list)].filter(Boolean);
                setClientesTotales(uniqueClientes.sort());
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
        setFormData((prev) => ({ ...prev, [name]: value }));
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
            setFormData(prev => ({
                ...prev,
                montoBase: '',
                cliente: '',
            }));
            setTimeout(() => setSuccess(false), 3000);
        } catch (error) {
            console.error('Error guardando ingreso:', error);
            alert('Hubo un error al guardar el registro. Revisa la consola.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-visible">
            <div className="p-6 pb-32">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl">
                        <TbBusinessplan size={24} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Nuevo Ingreso</h2>
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
            </div>
        </div>
    );
};

export default IngresoForm;
