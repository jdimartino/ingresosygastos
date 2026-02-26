import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { TbRefresh } from 'react-icons/tb';

const ReloadPrompt = () => {
    // Check if there is an update waiting
    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(swRegistration) {
            console.log('SW Registered:', swRegistration);
        },
        onRegisterError(error) {
            console.error('SW Registration Error:', error);
        },
    });

    const close = () => {
        setNeedRefresh(false);
    };

    if (!needRefresh) return null;

    return (
        <div className="fixed bottom-20 sm:bottom-6 right-4 left-4 sm:left-auto z-50 p-4 rounded-xl shadow-xl bg-blue-600 text-white flex flex-col sm:flex-row items-center justify-between gap-4 border-2 border-white dark:border-gray-800 transition-all">
            <div className="flex-1 text-sm font-medium">
                ¡Nueva versión disponible! Actualiza para ver los cambios.
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
                <button
                    onClick={() => updateServiceWorker(true)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white text-blue-600 px-4 py-2 rounded-lg font-bold hover:bg-gray-100 transition-colors"
                >
                    <TbRefresh size={18} /> Actualizar
                </button>
                <button
                    onClick={close}
                    className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 font-medium transition-colors"
                >
                    Cerrar
                </button>
            </div>
        </div>
    );
};

export default ReloadPrompt;
