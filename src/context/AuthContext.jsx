import { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../firebase/config';
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// Emails leídos desde variable de entorno (no hardcodeados en el código)
const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim())
    .filter(Boolean);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loginError, setLoginError] = useState('');

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const loginWithGoogle = async () => {
        setLoginError('');
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            if (!ADMIN_EMAILS.includes(result.user.email)) {
                await logOut();
                setLoginError('Acceso denegado: Este correo no está autorizado.');
            }
        } catch (error) {
            if (error.code === 'auth/popup-closed-by-user') {
                setLoginError('Inicio de sesión cancelado.');
            } else {
                setLoginError('Error al iniciar sesión. Intenta nuevamente.');
            }
        }
    };

    const logOut = () => {
        setLoginError('');
        return signOut(auth);
    };

    return (
        <AuthContext.Provider value={{ user, loginWithGoogle, logOut, loading, ADMIN_EMAILS, loginError }}>
            {children}
        </AuthContext.Provider>
    );
};
