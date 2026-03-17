import React, { useState } from 'react';
import { TbChevronDown, TbChevronRight, TbEdit, TbTrash } from 'react-icons/tb';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { formatFecha } from '../utils/format';
import EditRecordModal from './EditRecordModal';

// ─── Shared confirmation modal ──────────────────────────────────────────────
const ConfirmDeleteModal = ({ item, type, onConfirm, onCancel }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Eliminar {type === 'ingreso' ? 'Ingreso' : 'Gasto'}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                ¿Estás seguro de que deseas eliminar este registro? Esta acción <strong>no se puede deshacer</strong>.
            </p>
            <div className="flex gap-3 justify-end">
                <button onClick={onCancel} className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    Cancelar
                </button>
                <button onClick={onConfirm} className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors">
                    Sí, Eliminar
                </button>
            </div>
        </div>
    </div>
);

// ─── TableWrapper ───────────────────────────────────────────────────────────
const TableWrapper = ({ title, children }) => (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">{title}</h3>
        </div>
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                {children}
            </table>
        </div>
    </div>
);

// ─── Row action buttons ─────────────────────────────────────────────────────
const RowActions = ({ onEdit, onDelete }) => (
    <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} title="Editar"
            className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">
            <TbEdit size={15} />
        </button>
        <button onClick={onDelete} title="Eliminar"
            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
            <TbTrash size={15} />
        </button>
    </div>
);

// ─── IngresosList ───────────────────────────────────────────────────────────
export const IngresosList = ({ ingresos, onMutate }) => {
    const [editRecord, setEditRecord] = useState(null);
    const [deleteRecord, setDeleteRecord] = useState(null);

    const handleDelete = async () => {
        await deleteDoc(doc(db, 'ingresos', deleteRecord.id));
        setDeleteRecord(null);
        onMutate?.();
    };

    return (
        <>
            {editRecord && (
                <EditRecordModal
                    record={editRecord}
                    type="ingreso"
                    onClose={() => setEditRecord(null)}
                    onSaved={() => { setEditRecord(null); onMutate?.(); }}
                />
            )}
            {deleteRecord && (
                <ConfirmDeleteModal
                    item={deleteRecord}
                    type="ingreso"
                    onConfirm={handleDelete}
                    onCancel={() => setDeleteRecord(null)}
                />
            )}
            <TableWrapper title="Detalle de Ingresos">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Fecha</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Base</th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Comisión</th>
                        <th className="px-3 py-3 w-16"></th>
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {ingresos.length === 0 ? (
                        <tr><td colSpan="5" className="px-3 py-4 text-center text-sm text-gray-500">No hay ingresos registrados</td></tr>
                    ) : ingresos.map((item) => (
                        <tr key={item.id} className="group hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                            <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">{formatFecha(item.fecha)}</td>
                            <td className="px-3 py-3 text-sm font-medium text-gray-900 dark:text-white max-w-[100px] truncate" title={item.cliente}>{item.cliente}</td>
                            <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400 text-right">
                                ${item.montoBase ? item.montoBase.toFixed(2) : '0.00'}
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-sm font-bold text-green-600 dark:text-green-400 text-right">
                                ${item.ingresoReal ? Number(item.ingresoReal).toFixed(2) : '0.00'}
                            </td>
                            <td className="px-3 py-3">
                                <RowActions onEdit={() => setEditRecord(item)} onDelete={() => setDeleteRecord(item)} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </TableWrapper>
        </>
    );
};

// ─── GastosList ─────────────────────────────────────────────────────────────
export const GastosList = ({ gastos, onMutate }) => {
    const [editRecord, setEditRecord] = useState(null);
    const [deleteRecord, setDeleteRecord] = useState(null);

    const handleDelete = async () => {
        await deleteDoc(doc(db, 'gastos', deleteRecord.id));
        setDeleteRecord(null);
        onMutate?.();
    };

    return (
        <>
            {editRecord && (
                <EditRecordModal
                    record={editRecord}
                    type="gasto"
                    onClose={() => setEditRecord(null)}
                    onSaved={() => { setEditRecord(null); onMutate?.(); }}
                />
            )}
            {deleteRecord && (
                <ConfirmDeleteModal
                    item={deleteRecord}
                    type="gasto"
                    onConfirm={handleDelete}
                    onCancel={() => setDeleteRecord(null)}
                />
            )}
            <TableWrapper title="Detalle de Gastos">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Fecha</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Detalle</th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Monto</th>
                        <th className="px-3 py-3 w-16"></th>
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {gastos.length === 0 ? (
                        <tr><td colSpan="5" className="px-3 py-4 text-center text-sm text-gray-500">No hay gastos registrados</td></tr>
                    ) : gastos.map((item) => (
                        <tr key={item.id} className="group hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                            <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">{formatFecha(item.fecha)}</td>
                            <td className="px-3 py-3 text-sm font-medium text-gray-900 dark:text-white max-w-[110px] truncate" title={item.categoria}>
                                <span className="px-1.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 truncate max-w-full">
                                    {item.categoria}
                                </span>
                            </td>
                            <td className="px-3 py-3 text-xs text-gray-500 dark:text-gray-400 max-w-[100px] truncate hidden sm:table-cell" title={item.detalle}>
                                {item.detalle || '-'}
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-sm font-bold text-red-600 dark:text-red-400 text-right">
                                ${item.monto != null ? Number(item.monto).toFixed(2) : '0.00'}
                            </td>
                            <td className="px-3 py-3">
                                <RowActions onEdit={() => setEditRecord(item)} onDelete={() => setDeleteRecord(item)} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </TableWrapper>
        </>
    );
};

// Fix 14: función helper fuera del render en lugar de IIFE dentro del JSX
const renderSubRows = (item, transactions, filterKey, isIncome, bgAccent, accentColor) => {
    const related = transactions
        .filter(t => t[filterKey] === item.name)
        .sort((a, b) => a.fecha.localeCompare(b.fecha));
    if (related.length === 0) return null;
    return related.map((t) => (
        <tr key={t.id} className={`${bgAccent} border-l-2 ${isIncome ? 'border-green-400' : 'border-red-400'}`}>
            <td className="pl-6 pr-2 py-2"></td>
            <td className="px-2 py-2">
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-16 shrink-0">{formatFecha(t.fecha)}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {isIncome ? `Base: $${t.montoBase?.toFixed(2)}` : (t.detalle || t.categoria)}
                    </span>
                </div>
            </td>
            <td className={`px-3 py-2 text-xs font-semibold text-right ${accentColor}`}>
                ${isIncome ? Number(t.ingresoReal || 0).toFixed(2) : Number(t.monto || 0).toFixed(2)}
            </td>
        </tr>
    ));
};

// ─── AgrupadoList ────────────────────────────────────────────────────────────
export const AgrupadoList = ({ data, categoryKey, title, isIncome = true, transactions = [], filterKey }) => {
    const [openRow, setOpenRow] = useState(null);
    const accentColor = isIncome ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
    const bgAccent = isIncome ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20';

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">{title}</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                        <tr>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-6"></th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{categoryKey}</th>
                            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Total</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {data.length === 0 ? (
                            <tr><td colSpan="3" className="px-6 py-4 text-center text-sm text-gray-500">No hay datos agrupados</td></tr>
                        ) : data.map((item) => (
                            <React.Fragment key={item.name}>
                                <tr
                                    className={`cursor-pointer transition-colors ${openRow === item.name ? bgAccent : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}`}
                                    onClick={() => setOpenRow(openRow === item.name ? null : item.name)}
                                >
                                    <td className="px-3 py-3 text-gray-400">
                                        {openRow === item.name
                                            ? <TbChevronDown size={14} className={accentColor} />
                                            : <TbChevronRight size={14} />}
                                    </td>
                                    <td className="px-3 py-3 text-sm font-medium text-gray-900 dark:text-white">{item.name}</td>
                                    <td className={`px-3 py-3 text-sm font-bold text-right ${accentColor}`}>
                                        ${item.total.toFixed(2)}
                                    </td>
                                </tr>
                                {openRow === item.name && renderSubRows(item, transactions, filterKey, isIncome, bgAccent, accentColor)}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
