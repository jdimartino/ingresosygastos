import { Component } from 'react';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                    <p className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                        Algo salió mal
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        Ocurrió un error inesperado en esta sección.
                    </p>
                    <button
                        onClick={() => this.setState({ hasError: false })}
                        className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                        Reintentar
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
