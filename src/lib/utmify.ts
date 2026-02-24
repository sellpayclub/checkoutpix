
// UTMify configurations moved to /api/utmify proxy for security and CORS compliance
const UTMIFY_ENDPOINT = '/api/utmify';

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
    src: string | null;
    sck: string | null;
    utm_source: string | null;
    utm_campaign: string | null;
    utm_medium: string | null;
    utm_content: string | null;
    utm_term: string | null;
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
        console.log('[Utmify] Attempting to send event:', order.status);

        const response = await fetch(UTMIFY_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(order)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Utmify] Proxy Error:', response.status, errorText);

            // Fallback for local dev or if proxy fails: Try direct call if we are in local dev?
            // Actually, better to just log it and let the order proceed.
        } else {
            console.log(`[Utmify] Event ${order.status} sent successfully`);
        }
    } catch (error) {
        // CRITICAL: We NEVER let Utmify errors break the user's checkout experience
        console.error('[Utmify] Integration Error (silenced):', error);
    }
}

export function getTrackingParameters(): UtmifyTrackingParameters {
    const params = new URLSearchParams(window.location.search);
    const storageKey = 'utmify_tracking_params';

    // Strict Utmify fields
    const trackedKeys: (keyof UtmifyTrackingParameters)[] = [
        'src', 'sck', 'utm_source', 'utm_campaign', 'utm_medium', 'utm_content', 'utm_term'
    ];

    const currentParams: Partial<UtmifyTrackingParameters> = {};
    let hasNewKeys = false;

    trackedKeys.forEach(key => {
        const value = params.get(key);
        if (value) {
            currentParams[key] = value;
            hasNewKeys = true;
        }
    });

    // Capture ANY other parameters to persist them locally, even if not sent to Utmify directly
    const allParamsForStorage: any = { ...currentParams };
    const prefixes = ['utm_', 'fb_', 'g_', 'msclkid', 'dclid', 'fbclid', 'gclid', 'ttclid'];
    params.forEach((value, key) => {
        const hasPrefix = prefixes.some(p => key.startsWith(p));
        if (hasPrefix && !allParamsForStorage[key]) {
            allParamsForStorage[key] = value;
            hasNewKeys = true;
        }
    });

    let merged = { ...allParamsForStorage };
    try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
            const storedParams = JSON.parse(stored);
            merged = { ...storedParams, ...allParamsForStorage };
        }
        if (hasNewKeys) {
            localStorage.setItem(storageKey, JSON.stringify(merged));
        }
    } catch (e) {
        console.error('Error with UTM localStorage', e);
    }

    // Return strictly formatted Utmify parameters, ensuring all are at least null
    return {
        src: merged.src || null,
        sck: merged.sck || null,
        utm_source: merged.utm_source || null,
        utm_campaign: merged.utm_campaign || null,
        utm_medium: merged.utm_medium || null,
        utm_content: merged.utm_content || null,
        utm_term: merged.utm_term || null,
    };
}

export function getCurrentDateTime() {
    // Exact format YYYY-MM-DD HH:MM:SS
    return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

export function formatToUtmifyDate(dateString: string) {
    return new Date(dateString).toISOString().replace('T', ' ').substring(0, 19);
}
