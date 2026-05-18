import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
// wait, we need to import icons from react-icons, fixing it below
import { TbPencilPlus, TbReportMoney, TbLogout, TbLogin, TbSettings, TbChartBar } from "react-icons/tb";

const Layout = () => {
    const { user, loginWithGoogle, logOut } = useAuth();
    const location = useLocation();

    const navItems = [
        { name: 'Registrar', path: '/registrar', icon: TbPencilPlus, public: true },
        { name: 'Dashboard', path: '/dashboard', icon: TbReportMoney, public: false },
        { name: 'Estadísticas', path: '/estadisticas', icon: TbChartBar, public: false },
        { name: 'Admin', path: '/admin', icon: TbSettings, public: false },
    ];

    return (
        <div className="min-h-screen flex flex-col items-center bg-gray-50 dark:bg-gray-900 w-full transition-colors duration-200">
            <header className="w-full bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex">
                            <div className="flex-shrink-0 flex items-center">
                                <Link to="/" className="text-xl font-bold text-primary dark:text-blue-400 flex items-center gap-2">
                                    <TbReportMoney className="text-2xl" /> IngresosYGastos
                                </Link>
                            </div>
                            <nav className="hidden sm:-my-px sm:ml-6 sm:flex sm:space-x-8">
                                {navItems.map((item) => (
                                    (item.public || user) && (
                                        <Link
                                            key={item.name}
                                            to={item.path}
                                            className={`${location.pathname === item.path
                                                ? 'border-primary text-gray-900 dark:text-white'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'
                                                } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200`}
                                        >
                                            {item.name}
                                        </Link>
                                    )
                                ))}
                            </nav>
                        </div>
                        <div className="flex items-center">
                            {user ? (
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-gray-600 dark:text-gray-300 hidden sm:block">
                                        {user.email}
                                    </span>
                                    <button
                                        onClick={logOut}
                                        className="p-2 text-gray-500 hover:text-red-500 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                        title="Cerrar sesión"
                                    >
                                        <TbLogout size={20} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={loginWithGoogle}
                                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 shadow-sm"
                                >
                                    <TbLogin className="mr-2" /> Entrar
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-32">
                <Outlet />
            </main>

            {/* Mobile Bottom Navigation */}
            <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50 pb-safe">
                <div className="flex justify-around">
                    {navItems.map((item) => (
                        (item.public || user) && (
                            <Link
                                key={item.name}
                                to={item.path}
                                className={`${location.pathname === item.path
                                    ? 'text-blue-600 dark:text-blue-400'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                                    } flex flex-col items-center py-3 px-2 flex-1 transition-colors duration-200`}
                            >
                                <item.icon className="text-xl mb-1" />
                                <span className="text-[10px] font-medium">{item.name}</span>
                            </Link>
                        )
                    ))}
                </div>
            </nav>
        </div>
    );
};

export default Layout;
