import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs, writeBatch, query, where, doc } from 'firebase/firestore';
import { TbEdit, TbTrash, TbShieldCheck, TbAlertCircle, TbX, TbCheck } from 'react-icons/tb';

// Fix #3: Custom React Modal instead of browser prompt/confirm

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">{message}</p>
                <div className="flex gap-3 justify-end">
                    <button onClick={onCancel} className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        Cancelar
                    </button>
                    <button onClick={onConfirm} className="px-4 py-2 rounded-xl text-sm font-medium bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center gap-2">
                        <TbCheck size={16} /> Confirmar
                    </button>
                </div>
            </div>
        </div>
    );
};

const RenameModal = ({ isOpen, title, oldName, onConfirm, onCancel }) => {
    const [newName, setNewName] = useState('');
    useEffect(() => { if (isOpen) setNewName(''); }, [isOpen]);
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-gray-100 dark:border-gray-700">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
                    <button onClick={onCancel} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                        <TbX size={20} />
                    </button>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    Renombrando: <span className="font-semibold text-gray-900 dark:text-white">"{oldName}"</span>
                </p>
                <input
                    type="text"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) onConfirm(newName.trim()); }}
                    placeholder="Nuevo nombre..."
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-700 border-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white mb-4"
                    autoFocus
                />
                <div className="flex gap-3 justify-end">
                    <button onClick={onCancel} className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        Cancelar
                    </button>
                    <button
                        onClick={() => { if (newName.trim() && newName.trim() !== oldName) onConfirm(newName.trim()); }}
                        disabled={!newName.trim() || newName.trim() === oldName}
                        className="px-4 py-2 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors flex items-center gap-2"
                    >
                        <TbCheck size={16} /> Guardar
                    </button>
                </div>
            </div>
        </div>
    );
};

const Administracion = () => {
    const [clientes, setClientes] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionState, setActionState] = useState({ loading: false, message: '', type: '' });

    // Modal state
    const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', onConfirm: null });
    const [renameModal, setRenameModal] = useState({ open: false, title: '', oldName: '', onConfirm: null });

    const fetchData = async () => {
        setLoading(true);
        try {
            const ingresosSnap = await getDocs(collection(db, 'ingresos'));
            const listClientes = ingresosSnap.docs.map(doc => doc.data().cliente);
            const uniqClientes = [...new Set(listClientes)].filter(c => c && c !== 'Desconocido').sort();
            setClientes(uniqClientes);

            const gastosSnap = await getDocs(collection(db, 'gastos'));
            const listCategorias = gastosSnap.docs.map(doc => doc.data().categoria);
            const uniqCategorias = [...new Set(listCategorias)].filter(c => c && c !== 'Otra').sort();
            setCategorias(uniqCategorias);
        } catch (error) {
            console.error('Error cargando datos de administración:', error);
            setActionState({ loading: false, message: 'Error cargando datos.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const performBatchUpdate = async (collectionName, fieldName, oldValue, newValue) => {
        setActionState({ loading: true, message: `Procesando cambios para "${oldValue}"...`, type: 'info' });
        try {
            const q = query(collection(db, collectionName), where(fieldName, '==', oldValue));
            const querySnapshot = await getDocs(q);
            const batch = writeBatch(db);
            let count = 0;
            querySnapshot.forEach((document) => {
                batch.update(doc(db, collectionName, document.id), { [fieldName]: newValue });
                count++;
            });
            if (count > 0) {
                await batch.commit();
                setActionState({ loading: false, message: `Éxito: Se actualizaron ${count} registros de "${oldValue}" a "${newValue}".`, type: 'success' });
                await fetchData();
            } else {
                setActionState({ loading: false, message: `No se encontraron registros para actualizar.`, type: 'warning' });
            }
        } catch (error) {
            console.error('Error en batch update:', error);
            setActionState({ loading: false, message: `Error al procesar: ${error.message}`, type: 'error' });
        }
    };

    // Fix #3: Handlers now open custom React modals instead of calling window.prompt/confirm
    const handleRenameCliente = (oldName) => {
        setRenameModal({
            open: true, title: 'Renombrar Cliente', oldName,
            onConfirm: (newName) => {
                setRenameModal(m => ({ ...m, open: false }));
                performBatchUpdate('ingresos', 'cliente', oldName, newName);
            }
        });
    };

    const handleDeleteCliente = (oldName) => {
        setConfirmModal({
            open: true,
            title: `Ocultar "${oldName}"`,
            message: `Su dinero seguirá sumando al balance total, pero todas sus transacciones pasarán al nombre "Desconocido" y desaparecerá del autocompletado. ¿Confirmas?`,
            onConfirm: () => {
                setConfirmModal(m => ({ ...m, open: false }));
                performBatchUpdate('ingresos', 'cliente', oldName, 'Desconocido');
            }
        });
    };

    const handleRenameCategoria = (oldName) => {
        setRenameModal({
            open: true, title: 'Renombrar Categoría', oldName,
            onConfirm: (newName) => {
                setRenameModal(m => ({ ...m, open: false }));
                performBatchUpdate('gastos', 'categoria', oldName, newName);
            }
        });
    };

    const handleDeleteCategoria = (oldName) => {
        setConfirmModal({
            open: true,
            title: `Ocultar "${oldName}"`,
            message: `Su dinero seguirá restando al balance total, pero todas sus transacciones pasarán a la categoría "Otra" y desaparecerá del autocompletado. ¿Confirmas?`,
            onConfirm: () => {
                setConfirmModal(m => ({ ...m, open: false }));
                performBatchUpdate('gastos', 'categoria', oldName, 'Otra');
            }
        });
    };

    // Fix #10: key uses item value (string), not array index
    const AdminTable = ({ title, items, onRename, onDelete, itemName }) => (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <TbShieldCheck className="text-blue-500" /> Administrar {title}
                </h3>
                <span className="text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 px-2.5 py-1 rounded-full">{items.length} {title}</span>
            </div>
            <ul className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[400px] overflow-y-auto">
                {items.length === 0 ? (
                    <li className="px-6 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">No se encontraron {title.toLowerCase()}.</li>
                ) : items.map((item) => (
                    <li key={item} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-200">{item}</span>
                        <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <button onClick={() => onRename(item)} disabled={actionState.loading}
                                className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-lg transition-colors" title={`Renombrar ${itemName}`}>
                                <TbEdit size={18} />
                            </button>
                            <button onClick={() => onDelete(item)} disabled={actionState.loading}
                                className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg transition-colors" title={`Ocultar ${itemName}`}>
                                <TbTrash size={18} />
                            </button>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Fix #3: Custom modals */}
            <ConfirmModal
                isOpen={confirmModal.open}
                title={confirmModal.title}
                message={confirmModal.message}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal(m => ({ ...m, open: false }))}
            />
            <RenameModal
                isOpen={renameModal.open}
                title={renameModal.title}
                oldName={renameModal.oldName}
                onConfirm={renameModal.onConfirm}
                onCancel={() => setRenameModal(m => ({ ...m, open: false }))}
            />

            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Administración de Datos</h1>
                <p className="text-gray-500 dark:text-gray-400">Corrige errores tipográficos o limpia tus listas de autocompletado sin perder el balance total de tu dinero.</p>
            </div>

            {actionState.message && (
                <div className={`p-4 rounded-xl mb-6 flex items-center gap-3 border ${actionState.type === 'error' ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400' :
                    actionState.type === 'success' ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400' :
                        'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400'
                    }`}>
                    <TbAlertCircle size={20} className="flex-shrink-0" />
                    <p className="text-sm font-medium">{actionState.message}</p>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <AdminTable title="Clientes (Ingresos)" itemName="cliente" items={clientes} onRename={handleRenameCliente} onDelete={handleDeleteCliente} />
                    <AdminTable title="Categorías (Gastos)" itemName="categoría" items={categorias} onRename={handleRenameCategoria} onDelete={handleDeleteCategoria} />
                </div>
            )}
        </div>
    );
};

export default Administracion;
