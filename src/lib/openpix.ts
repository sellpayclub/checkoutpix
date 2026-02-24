import type { OpenPixCharge, OpenPixChargeResponse } from '../types';

const OPENPIX_APP_ID = import.meta.env.VITE_OPENPIX_APP_ID;
const OPENPIX_API_URL = 'https://api.woovi.com/api/v1';

if (!OPENPIX_APP_ID) {
    console.warn('Missing OPENPIX_APP_ID environment variable');
}

/**
 * Create a PIX charge using OpenPix/Woovi API
 */
export async function createPixCharge(charge: OpenPixCharge): Promise<OpenPixChargeResponse> {
    const response = await fetch(`${OPENPIX_API_URL}/charge`, {
        method: 'POST',
        headers: {
            'Authorization': OPENPIX_APP_ID,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(charge),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create PIX charge');
    }

    return response.json();
}

/**
 * Get charge status from OpenPix
 */
export async function getChargeStatus(correlationId: string): Promise<{
    status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED';
    paidAt?: string;
}> {
    const response = await fetch(`${OPENPIX_API_URL}/charge/${correlationId}`, {
        method: 'GET',
        headers: {
            'Authorization': OPENPIX_APP_ID,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to get charge status');
    }

    const data = await response.json();
    return {
        status: data.charge.status,
        paidAt: data.charge.paidAt,
    };
}

/**
 * Generate a unique correlation ID for PIX charges
 */
export function generateCorrelationId(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 10);
    return `sellpay_${timestamp}_${randomPart}`;
}

/**
 * Format price in cents to BRL currency string
 */
export function formatPrice(cents: number): string {
    if (cents === undefined || cents === null || isNaN(cents)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(cents / 100);
}

/**
 * Parse price string (e.g., "27,00") to cents
 * Returns 0 for invalid inputs
 */
export function parsePriceToCents(priceString: string): number {
    if (!priceString || typeof priceString !== 'string') return 0;
    // Remove currency symbol and whitespace
    const cleaned = priceString.replace(/[R$\s]/g, '').trim();
    if (!cleaned) return 0;
    // Replace comma with dot for parsing
    const normalized = cleaned.replace(',', '.');
    // Parse and convert to cents
    const value = parseFloat(normalized);
    return isNaN(value) ? 0 : Math.round(value * 100);
}

/**
 * Format phone number for display
 */
export function formatPhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
        return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
}

/**
 * Clean phone number for API
 */
export function cleanPhone(phone: string): string {
    return phone.replace(/\D/g, '');
}

// ============ Woovi Account & Withdraw Functions ============

export interface WooviCompany {
    name: string;
    taxID: string;
    balance: number;
    withdrawBalance: number;
}

export interface WooviAccount {
    accountId: string;
    name: string;
    balance: number;
}

/**
 * Get company info from Woovi (includes main balance)
 */
export async function getCompanyInfo(): Promise<WooviCompany | null> {
    try {
        const response = await fetch(`${OPENPIX_API_URL}/company`, {
            method: 'GET',
            headers: {
                'Authorization': OPENPIX_APP_ID,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            console.error('Failed to get company info');
            return null;
        }

        const data = await response.json();
        return {
            name: data.company.name,
            taxID: data.company.taxID?.taxID || data.company.taxID,
            balance: data.company.balance || 0,
            withdrawBalance: data.company.withdrawBalance || 0,
        };
    } catch (error) {
        console.error('Error getting company info:', error);
        return null;
    }
}

/**
 * Get accounts list from Woovi
 */
export async function getAccounts(): Promise<WooviAccount[]> {
    try {
        const response = await fetch(`${OPENPIX_API_URL}/account/`, {
            method: 'GET',
            headers: {
                'Authorization': OPENPIX_APP_ID,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            console.error('Failed to get accounts');
            return [];
        }

        const data = await response.json();
        return (data.accounts || []).map((acc: { id: string; name: string; balance: number }) => ({
            accountId: acc.id,
            name: acc.name,
            balance: acc.balance || 0,
        }));
    } catch (error) {
        console.error('Error getting accounts:', error);
        return [];
    }
}

/**
 * Request a withdraw from account
 * Note: This requires proper permissions on the Woovi account
 */
export async function requestWithdraw(accountId: string, valueInCents: number): Promise<{
    success: boolean;
    message: string;
    withdrawId?: string;
}> {
    try {
        const response = await fetch(`${OPENPIX_API_URL}/account/${accountId}/withdraw`, {
            method: 'POST',
            headers: {
                'Authorization': OPENPIX_APP_ID,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                value: valueInCents,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            return {
                success: false,
                message: error.message || 'Falha ao solicitar saque. Verifique se você tem saldo e permissões.',
            };
        }

        const data = await response.json();
        return {
            success: true,
            message: 'Saque solicitado com sucesso!',
            withdrawId: data.withdraw?.id,
        };
    } catch (error) {
        console.error('Error requesting withdraw:', error);
        return {
            success: false,
            message: 'Erro ao conectar com a Woovi. Tente novamente.',
        };
    }
}

