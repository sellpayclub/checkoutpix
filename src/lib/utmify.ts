
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
    src: string | null;
    sck: string | null;
    utm_source: string | null;
    utm_campaign: string | null;
    utm_medium: string | null;
    utm_content: string | null;
    utm_term: string | null;
    fbclid: string | null;
    gclid: string | null;
    ttclid: string | null;
    [key: string]: string | null; // Allow any other parameters
}

export interface UtmifyCommission {
    totalPriceInCents: number;
    gatewayFeeInCents: number;
    userCommissionInCents: number;
    currency?: string;
}

export interface UtmifyOrder {
    orderId: string;
    platform: string;
    paymentMethod: 'pix';
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

export async function sendToUtmify(order: UtmifyOrder) {
    try {
        const response = await fetch(UTMIFY_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-token': UTMIFY_TOKEN
            },
            body: JSON.stringify(order)
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('Utmify API error:', error);
        } else {
            console.log(`[Utmify] Event ${order.status} sent successfully for order ${order.orderId}`);
        }
    } catch (error) {
        console.error('Error sending to Utmify:', error);
    }
}

export function getTrackingParameters(): UtmifyTrackingParameters {
    const params = new URLSearchParams(window.location.search);
    const storageKey = 'utmify_tracking_params';

    // List of parameters we specifically want to track
    const trackedKeys = [
        'src', 'sck', 'utm_source', 'utm_campaign', 'utm_medium', 'utm_content', 'utm_term',
        'fbclid', 'gclid', 'ttclid', 'utm_id', 'utm_placement', 'utm_creative'
    ];

    const currentParams: any = {};

    // 1. Try to get from URL
    trackedKeys.forEach(key => {
        const value = params.get(key);
        if (value) currentParams[key] = value;
    });

    // Capture ANY other parameters that start with utm_
    params.forEach((value, key) => {
        if (key.startsWith('utm_') && !currentParams[key]) {
            currentParams[key] = value;
        }
    });

    // 2. Check if we have any current params
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

    // 3. Try to load from localStorage if URL is empty
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
