import { format } from 'date-fns';

/**
 * Safely formats a date string (e.g., '2026-02-23') to 'dd/MM/yy'.
 * Appends T12:00:00 to the string to avoid timezone-based off-by-one errors.
 */
export const formatFecha = (fecha) => {
    try {
        return format(new Date(fecha + 'T12:00:00'), 'dd/MM/yy');
    } catch {
        return String(fecha).substring(0, 10);
    }
};
