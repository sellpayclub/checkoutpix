
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
    return {
        src: params.get('src'),
        sck: params.get('sck'),
        utm_source: params.get('utm_source'),
        utm_campaign: params.get('utm_campaign'),
        utm_medium: params.get('utm_medium'),
        utm_content: params.get('utm_content'),
        utm_term: params.get('utm_term'),
    };
}

export function getCurrentDateTime() {
    return new Date().toISOString().replace('T', ' ').split('.')[0];
}
