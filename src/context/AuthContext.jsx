import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { auth } from '../firebase/config';
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, setPersistence, browserLocalPersistence, signOut } from 'firebase/auth';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// Emails leídos desde variable de entorno (no hardcodeados en el código)
const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim())
    .filter(Boolean);

const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const enforceAllowedUser = async (currentUser, logOut, setLoginError) => {
    if (currentUser && !ADMIN_EMAILS.includes(currentUser.email)) {
        await logOut();
        setLoginError('Acceso denegado: Este correo no está autorizado.');
        return false;
    }
    return true;
};

const handleAuthError = (error, setLoginError) => {
    if (error.code === 'auth/popup-closed-by-user') {
        setLoginError('Inicio de sesión cancelado.');
    } else {
        setLoginError('Error al iniciar sesión. Intenta nuevamente.');
    }
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loginError, setLoginError] = useState('');

    const logOut = useCallback(() => {
        setLoginError('');
        return signOut(auth);
    }, []);

    useEffect(() => {
        setPersistence(auth, browserLocalPersistence)
            .then(() => getRedirectResult(auth))
            .then((result) => enforceAllowedUser(result?.user, logOut, setLoginError))
            .catch((error) => handleAuthError(error, setLoginError));

        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });

        return unsubscribe;
    }, [logOut]);

    const loginWithGoogle = async () => {
        setLoginError('');
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ login_hint: 'dimartinoj@gmail.com' });
        try {
            if (isMobile) {
                await signInWithRedirect(auth, provider);
                return;
            }
            try {
                const result = await signInWithPopup(auth, provider);
                await enforceAllowedUser(result.user, logOut, setLoginError);
            } catch (error) {
                if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/cancelled-popup-request'].includes(error.code)) {
                    await signInWithRedirect(auth, provider);
                    return;
                }
                throw error;
            }
        } catch (error) {
            handleAuthError(error, setLoginError);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loginWithGoogle, logOut, loading, ADMIN_EMAILS, loginError }}>
            {children}
        </AuthContext.Provider>
    );
};
