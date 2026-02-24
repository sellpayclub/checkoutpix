import type { VercelRequest, VercelResponse } from '@vercel/node';

const UTMIFY_TOKEN = '1yUDmnd8pszFtqHqLk4YOJFQE8mVKz9IFi2Q';
const UTMIFY_ENDPOINT = 'https://api.utmify.com.br/api-credentials/orders';

export default async function handler(
    req: VercelRequest,
    res: VercelResponse
) {
    // CORS Configuration
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-api-token'
    );

    // Handle OPTIONS request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const order = req.body;

        if (!order || !order.orderId) {
            return res.status(400).json({ error: 'Invalid order data' });
        }

        console.log(`[Utmify Proxy] Sending event: ${order.status} for order ${order.orderId}`);

        const response = await fetch(UTMIFY_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-token': UTMIFY_TOKEN
            },
            body: JSON.stringify(order)
        });

        const status = response.status;
        const responseText = await response.text();

        let responseData;
        try {
            responseData = JSON.parse(responseText);
        } catch (e) {
            responseData = responseText;
        }

        if (!response.ok) {
            console.error('[Utmify Proxy] API Error:', {
                status,
                error: responseData,
                orderId: order.orderId
            });
            return res.status(status).json({ error: 'Utmify API Error', details: responseData });
        }

        return res.status(200).json({ success: true, data: responseData });

    } catch (error) {
        console.error('[Utmify Proxy] Internal Error:', error);
        return res.status(500).json({
            error: 'Internal Server Error',
            details: error instanceof Error ? error.message : String(error)
        });
    }
}
