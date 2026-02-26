import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TbLoaderQuarter } from 'react-icons/tb';

const ProtectedRoute = ({ children }) => {
    // Fix #7: Handle loading state to avoid premature redirect on page refresh
    const { user, loading, ADMIN_EMAILS } = useAuth();

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <TbLoaderQuarter className="animate-spin text-blue-500 text-4xl" />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/" />;
    }

    if (!ADMIN_EMAILS.includes(user.email)) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center text-red-500">
                <h2 className="text-2xl font-bold mb-4">Acceso Denegado</h2>
                <p>Tu correo ({user.email}) no tiene permisos para ver esta sección.</p>
            </div>
        );
    }

    return children;
};

export default ProtectedRoute;
