
const UTMIFY_TOKEN = '1yUDmnd8pszFtqHqLk4YOJFQE8mVKz9IFi2Q';
const UTMIFY_ENDPOINT = 'https://api.utmify.com.br/api-credentials/orders';

export interface UtmifyCustomer {
    name: string;
    email: string;
    phone: string | null;
    document: string | null;
    country?: string;
    ip?: string;
}

export interface UtmifyProduct {
    id: string;
    name: string;
    planId: string | null;
    planName: string | null;
    quantity: number;
    priceInCents: number;
}

export interface UtmifyTrackingParameters {
    src?: string | null;
    sck?: string | null;
    utm_source?: string | null;
    utm_campaign?: string | null;
    utm_medium?: string | null;
    utm_content?: string | null;
    utm_term?: string | null;
    fbclid?: string | null;
    gclid?: string | null;
    ttclid?: string | null;
    [key: string]: string | null | undefined;
}

export interface UtmifyCommission {
    totalPriceInCents: number;
    gatewayFeeInCents: number;
    userCommissionInCents: number;
    currency?: 'BRL' | 'USD' | 'EUR' | 'GBP' | 'ARS' | 'CAD' | 'COP' | 'MXN' | 'PYG' | 'CLP' | 'PEN' | 'PLN';
}

export interface UtmifyOrder {
    orderId: string;
    platform: string;
    paymentMethod: 'credit_card' | 'boleto' | 'pix' | 'paypal' | 'free_price';
    status: 'waiting_payment' | 'paid' | 'refused' | 'refunded' | 'chargedback';
    createdAt: string;
    approvedDate: string | null;
    refundedAt: string | null;
    customer: UtmifyCustomer;
    products: UtmifyProduct[];
    trackingParameters: UtmifyTrackingParameters;
    commission: UtmifyCommission;
    isTest?: boolean;
}

/**
 * Fetches user's public IP address using a public API
 */
export async function getUserIP(): Promise<string | undefined> {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.warn('[Utmify] Could not fetch IP:', error);
        return undefined;
    }
}

export async function sendToUtmify(order: UtmifyOrder) {
    try {
        // Log outgoing payload for debugging
        console.debug('[Utmify] Sending event:', order.status, order);

        const response = await fetch(UTMIFY_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-token': UTMIFY_TOKEN
            },
            body: JSON.stringify(order)
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorJson;
            try {
                errorJson = JSON.parse(errorText);
            } catch (e) {
                errorJson = errorText;
            }
            console.error('[Utmify] API Error:', {
                status: response.status,
                error: errorJson,
                orderId: order.orderId,
                status_sent: order.status
            });
        } else {
            console.log(`[Utmify] Event ${order.status} sent successfully for order ${order.orderId}`);
        }
    } catch (error) {
        console.error('[Utmify] Network/Internal Error:', error);
    }
}

export function getTrackingParameters(): UtmifyTrackingParameters {
    const params = new URLSearchParams(window.location.search);
    const storageKey = 'utmify_tracking_params';

    // Core keys we track by default
    const trackedKeys = [
        'src', 'sck', 'utm_source', 'utm_campaign', 'utm_medium', 'utm_content', 'utm_term',
        'fbclid', 'gclid', 'ttclid', 'utm_id', 'utm_placement', 'utm_creative',
        'pixel_id', 'ad_id', 'adset_id', 'campaign_id'
    ];

    const currentParams: any = {};

    // 1. Capture known tracked keys
    trackedKeys.forEach(key => {
        const value = params.get(key);
        if (value) currentParams[key] = value;
    });

    // 2. Capture ANY other parameters that start with utm_ or other common prefixes
    const prefixes = ['utm_', 'fb_', 'g_', 'msclkid', 'dclid'];
    params.forEach((value, key) => {
        const hasPrefix = prefixes.some(p => key.startsWith(p));
        if (hasPrefix && !currentParams[key]) {
            currentParams[key] = value;
        }
    });

    // 3. Check if we have any current params to persist
    const hasCurrentParams = Object.keys(currentParams).length > 0;

    if (hasCurrentParams) {
        // Merge with existing stored params to not lose them
        let merged = { ...currentParams };
        try {
            const stored = localStorage.getItem(storageKey);
            if (stored) {
                const storedParams = JSON.parse(stored);
                merged = { ...storedParams, ...currentParams };
            }
            localStorage.setItem(storageKey, JSON.stringify(merged));
        } catch (e) {
            console.error('Error saving UTMs', e);
        }
        return merged;
    }

    // 4. Try to load from localStorage if URL is empty
    try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error('Error loading UTMs', e);
    }

    return currentParams as UtmifyTrackingParameters;
}

export function getCurrentDateTime() {
    return new Date().toISOString().replace('T', ' ').split('.')[0];
}

export function formatToUtmifyDate(dateString: string) {
    return new Date(dateString).toISOString().replace('T', ' ').split('.')[0];
}
