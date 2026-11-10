import { useEffect, useReducer, useState } from 'react';
import { auth } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import {
    clearAuthDebugLog,
    getRedirectInfo,
    isAuthDebugEnabled,
    readAuthDebugLog,
    subscribeAuthDebug,
} from '../utils/authDebug';

// TEMPORAL: panel de diagnóstico de auth (solo con ?debug=1). Nunca muestra tokens ni apiKey.

const probarStorage = (store) => {
    try {
        store.setItem('__dbg_probe', '1');
        const ok = store.getItem('__dbg_probe') === '1';
        store.removeItem('__dbg_probe');
        return ok ? 'OK' : 'FALLA';
    } catch (e) {
        return `ERROR ${e.name}`;
    }
};

const probarIndexedDB = () => new Promise((resolve) => {
    try {
        const req = indexedDB.open('__dbg_probe');
        req.onsuccess = () => {
            req.result.close();
            indexedDB.deleteDatabase('__dbg_probe');
            resolve('OK');
        };
        req.onerror = () => resolve(`ERROR ${req.error?.name ?? 'desconocido'}`);
    } catch (e) {
        resolve(`ERROR ${e.name}`);
    }
});

const leerEntorno = async () => {
    const sw = navigator.serviceWorker;
    let swRegistros = 'no soportado';
    if (sw) {
        try {
            swRegistros = (await sw.getRegistrations()).length;
        } catch (e) {
            swRegistros = `ERROR ${e.name}`;
        }
    }

    let indexedDBNombres = 'no disponible';
    try {
        const bases = await indexedDB.databases();
        indexedDBNombres = bases.map((b) => b.name).filter(Boolean).join(', ') || 'ninguna';
    } catch {
        indexedDBNombres = 'no disponible';
    }

    // Solo se cuenta por tipo (segundo segmento de la clave); nunca se muestra el nombre completo porque incluye la apiKey.
    const conteoFirebase = {};
    try {
        Object.keys(localStorage)
            .filter((k) => k.startsWith('firebase:'))
            .forEach((k) => {
                const tipo = k.split(':')[1];
                conteoFirebase[tipo] = (conteoFirebase[tipo] || 0) + 1;
            });
    } catch {
        // localStorage no disponible
    }

    return {
        swController: sw?.controller?.scriptURL ?? 'ninguno',
        swRegistros,
        ls: probarStorage(localStorage),
        ss: probarStorage(sessionStorage),
        idb: await probarIndexedDB(),
        indexedDBNombres,
        fbKeys: Object.keys(conteoFirebase).length
            ? Object.entries(conteoFirebase).map(([t, n]) => `${t}=${n}`).join(' ')
            : 'ninguna',
    };
};

const describirRedirect = (r) => {
    if (r.tipo === 'usuario') return `usuario ${r.email}`;
    if (r.tipo === 'error') return `error ${r.code ?? ''} ${r.message ?? ''}`.trim();
    return r.tipo;
};

const hrefSeguro = () => {
    const { origin, pathname, search, hash } = window.location;
    return `${origin}${pathname} [query=${search ? 'sí, oculta' : 'no'}] [hash=${hash ? `sí (${hash.length} chars, oculto)` : 'no'}]`;
};

export default function AuthDebugPanel() {
    const { isMobile } = useAuth();
    const [, actualizar] = useReducer((n) => n + 1, 0);
    const [entorno, setEntorno] = useState(null);
    const [aviso, setAviso] = useState('');

    useEffect(() => {
        if (!isAuthDebugEnabled()) return undefined;
        const quitar = subscribeAuthDebug(() => actualizar());
        let vivo = true;
        leerEntorno().then((datos) => {
            if (vivo) setEntorno(datos);
        });
        return () => {
            vivo = false;
            quitar();
        };
    }, []);

    if (!isAuthDebugEnabled()) return null;

    const log = readAuthDebugLog();
    const lineas = [
        ['href', hrefSeguro()],
        ['referrer', (document.referrer || '(vacío)').split('?')[0]],
        ['userAgent', navigator.userAgent],
        ['isMobile (AuthContext)', String(isMobile)],
        ['sw.controller', entorno?.swController ?? '…'],
        ['sw.registros', entorno?.swRegistros ?? '…'],
        ['localStorage escribe/lee', entorno?.ls ?? '…'],
        ['sessionStorage escribe/lee', entorno?.ss ?? '…'],
        ['indexedDB.open', entorno?.idb ?? '…'],
        ['indexedDB (nombres)', entorno?.indexedDBNombres ?? '…'],
        ['firebase keys (LS, por tipo)', entorno?.fbKeys ?? '…'],
        ['authDomain', auth.config?.authDomain ?? '?'],
        ['auth.currentUser', auth.currentUser?.email ?? 'null'],
        ['getRedirectResult', describirRedirect(getRedirectInfo())],
    ];

    const copiar = async () => {
        const texto = [...lineas.map(([k, v]) => `${k}: ${v}`), '--- LOG ---', ...log].join('\n');
        try {
            await navigator.clipboard.writeText(texto);
            setAviso('Copiado');
        } catch {
            setAviso('No se pudo copiar');
        }
    };

    const limpiar = () => {
        clearAuthDebugLog();
        setAviso('Registro limpiado');
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[9999] max-h-[45vh] overflow-auto bg-black/90 p-2 font-mono text-[10px] leading-snug text-green-300">
            <div className="mb-1 flex items-center gap-2">
                <span className="font-bold text-yellow-300">AUTH DEBUG {new Date().toLocaleTimeString('es-ES')}</span>
                <button type="button" onClick={copiar} className="rounded bg-blue-600 px-2 py-0.5 text-white">Copiar</button>
                <button type="button" onClick={limpiar} className="rounded bg-red-600 px-2 py-0.5 text-white">Limpiar</button>
                {aviso && <span className="text-white">{aviso}</span>}
            </div>
            {lineas.map(([k, v]) => (
                <div key={k} className="break-all">
                    <span className="text-yellow-300">{k}:</span> {v}
                </div>
            ))}
            <div className="mt-1 font-bold text-yellow-300">--- LOG (máx. 50) ---</div>
            {log.length === 0 && <div>(sin registros)</div>}
            {log.map((linea, i) => (
                <div key={i} className="break-all">{linea}</div>
            ))}
        </div>
    );
}
