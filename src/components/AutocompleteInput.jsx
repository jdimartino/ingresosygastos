import { useState, useRef, useEffect } from 'react';

const AutocompleteInput = ({ name, value, options, onChange, placeholder, required, ariaLabel }) => {
    const [showOptions, setShowOptions] = useState(false);
    const [filtered, setFiltered] = useState(options);
    const [openUpwards, setOpenUpwards] = useState(false);
    const wrapperRef = useRef(null);

    useEffect(() => {
        const lowerVal = (value || '').toLowerCase();
        const newFiltered = options.filter(o => o.toLowerCase().includes(lowerVal));
        setFiltered(newFiltered);
    }, [value, options]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setShowOptions(false);
            }
        };
        document.addEventListener('pointerdown', handleClickOutside);
        return () => document.removeEventListener('pointerdown', handleClickOutside);
    }, []);

    const handleSelect = (option) => {
        onChange({ target: { name, value: option } });
        setShowOptions(false);
    };

    const handleFocus = () => {
        // Fix 5: usar variable local en lugar de estado para evitar closure stale en setTimeout
        let shouldOpenUpwards = false;
        if (wrapperRef.current) {
            const rect = wrapperRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            shouldOpenUpwards = spaceBelow < 260;
            setOpenUpwards(shouldOpenUpwards);
        }
        setShowOptions(true);
        setTimeout(() => {
            if (wrapperRef.current && !shouldOpenUpwards) {
                wrapperRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 150);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            setShowOptions(false);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            setShowOptions(false);
        }
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <input
                type="text"
                name={name}
                value={value}
                onChange={(e) => {
                    onChange(e);
                    setShowOptions(true);
                }}
                onFocus={handleFocus}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                aria-label={ariaLabel || placeholder}
                aria-autocomplete="list"
                aria-expanded={showOptions && filtered.length > 0}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-700 border-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                required={required}
                autoComplete="off"
            />
            {showOptions && filtered.length > 0 && (
                <ul
                    role="listbox"
                    aria-label={`Opciones para ${ariaLabel || placeholder}`}
                    className={`absolute z-[60] w-full ${openUpwards ? 'bottom-full mb-1' : 'mt-1'} bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl max-h-64 overflow-y-auto ring-1 ring-black/5`}
                >
                    {filtered.map((opt) => (
                        <li
                            key={opt}
                            role="option"
                            aria-selected={value === opt}
                            className="px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/40 cursor-pointer text-gray-800 dark:text-gray-200 border-b border-gray-100 dark:border-gray-700/50 last:border-0 transition-colors"
                            onPointerDown={(e) => {
                                e.preventDefault();
                                handleSelect(opt);
                            }}
                        >
                            {opt}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default AutocompleteInput;
