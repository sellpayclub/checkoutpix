import { type ClassValue, clsx } from 'clsx';

/**
 * Merge class names and handle conditional classes
 */
export function cn(...inputs: ClassValue[]) {
    return clsx(inputs);
}

/**
 * Format date to Brazilian format
 */
export function formatDate(date: string | Date): string {
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(new Date(date));
}

/**
 * Format date and time to Brazilian format
 */
export function formatDateTime(date: string | Date): string {
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(date));
}

/**
 * Get relative time (e.g., "2 hours ago")
 */
export function getRelativeTime(date: string | Date): string {
    const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });
    const now = new Date();
    const then = new Date(date);
    const diffInMs = then.getTime() - now.getTime();
    const diffInMinutes = Math.round(diffInMs / (1000 * 60));
    const diffInHours = Math.round(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.round(diffInMs / (1000 * 60 * 60 * 24));

    if (Math.abs(diffInMinutes) < 60) {
        return rtf.format(diffInMinutes, 'minute');
    }
    if (Math.abs(diffInHours) < 24) {
        return rtf.format(diffInHours, 'hour');
    }
    return rtf.format(diffInDays, 'day');
}

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: number;
    return (...args: Parameters<T>) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

/**
 * Generate a random ID
 */
export function generateId(): string {
    return Math.random().toString(36).substring(2, 15);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate Brazilian phone number
 */
export function isValidPhone(phone: string): boolean {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length === 10 || cleaned.length === 11;
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            document.body.removeChild(textArea);
            return true;
        } catch {
            document.body.removeChild(textArea);
            return false;
        }
    }
}

/**
 * Format seconds to MM:SS
 */
export function formatTimer(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Sleep utility for async operations
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get order status label in Portuguese
 */
export function getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
        PENDING: 'Pendente',
        APPROVED: 'Aprovado',
        EXPIRED: 'Expirado',
        REFUNDED: 'Reembolsado',
    };
    return labels[status] || status;
}

/**
 * Get order status color class
 */
export function getStatusColor(status: string): string {
    const colors: Record<string, string> = {
        PENDING: 'bg-yellow-100 text-yellow-800',
        APPROVED: 'bg-green-100 text-green-800',
        EXPIRED: 'bg-gray-100 text-gray-800',
        REFUNDED: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
}
