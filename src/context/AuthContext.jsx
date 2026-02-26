import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../firebase/config';
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// Fix #2: Defined OUTSIDE the component so it is not recreated on every render
const ADMIN_EMAILS = ["jdimartino@gmail.com", "dimartinoj@gmail.com"];

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const loginWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            if (!ADMIN_EMAILS.includes(result.user.email)) {
                await logOut();
                alert('Acceso denegado: Este correo no está autorizado.');
            }
        } catch (error) {
            console.error("Error signing in with Google", error);
        }
    };

    const logOut = () => {
        return signOut(auth);
    };

    return (
        <AuthContext.Provider value={{ user, loginWithGoogle, logOut, loading, ADMIN_EMAILS }}>
            {children}
        </AuthContext.Provider>
    );
};
