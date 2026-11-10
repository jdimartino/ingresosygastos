// Diagnóstico TEMPORAL de autenticación.
// Se activa visitando la app con ?debug=1 y se desactiva con ?debug=0.
// Mientras la bandera no esté activa, todas las funciones de registro no hacen nada.
// NUNCA registrar tokens, apiKey ni valores de credenciales aquí.

const FLAG_KEY = 'debugAuth';
const LOG_KEY = 'debugAuthLog';
const MAX_LINES = 50;

const listeners = new Set();
let redirectInfo = { tipo: 'pendiente' };

const notify = () => listeners.forEach((fn) => fn());

export const isAuthDebugEnabled = () => {
    try {
        return localStorage.getItem(FLAG_KEY) === '1';
    } catch {
        return false;
    }
};

export const initAuthDebugFromUrl = () => {
    try {
        const url = new URL(window.location.href);
        const flag = url.searchParams.get('debug');
        if (flag !== '1' && flag !== '0') return;
        if (flag === '1') localStorage.setItem(FLAG_KEY, '1');
        else localStorage.removeItem(FLAG_KEY);
        url.searchParams.delete('debug');
        window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    } catch {
        // Sin acceso a localStorage: el panel simplemente no se activa.
    }
};

export const logAuthDebug = (mensaje) => {
    if (!isAuthDebugEnabled()) return;
    const ahora = new Date();
    const linea = `${ahora.toLocaleTimeString('es-ES')}.${String(ahora.getMilliseconds()).padStart(3, '0')} ${mensaje}`;
    try {
        const previo = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
        localStorage.setItem(LOG_KEY, JSON.stringify([...previo, linea].slice(-MAX_LINES)));
    } catch {
        // Almacenamiento lleno o bloqueado: se ignora.
    }
    notify();
};

export const readAuthDebugLog = () => {
    try {
        return JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
    } catch {
        return [];
    }
};

export const clearAuthDebugLog = () => {
    try {
        localStorage.removeItem(LOG_KEY);
    } catch {
        // Ignorado.
    }
    notify();
};

export const setRedirectInfo = (info) => {
    redirectInfo = info;
    notify();
};

export const getRedirectInfo = () => redirectInfo;

export const subscribeAuthDebug = (fn) => {
    listeners.add(fn);
    return () => {
        listeners.delete(fn);
    };
};
