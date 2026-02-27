import type { VercelRequest, VercelResponse } from '@vercel/node';

const OPENPIX_API_URL = 'https://api.woovi.com/api/v1';

export default async function handler(
    req: VercelRequest,
    res: VercelResponse
) {
    // CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const OPENPIX_APP_ID = process.env.VITE_OPENPIX_APP_ID;
    if (!OPENPIX_APP_ID) {
        return res.status(500).json({ error: 'Missing OPENPIX_APP_ID' });
    }

    const { action } = req.query;

    try {
        // GET /api/woovi?action=company
        if (action === 'company' && req.method === 'GET') {
            const response = await fetch(`${OPENPIX_API_URL}/company`, {
                method: 'GET',
                headers: {
                    'Authorization': OPENPIX_APP_ID,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({ message: 'Woovi API Error' }));
                console.error('Woovi company error:', error);
                return res.status(response.status).json(error);
            }

            const data = await response.json();
            return res.status(200).json(data);
        }

        // POST /api/woovi?action=withdraw
        if (action === 'withdraw' && req.method === 'POST') {
            const { accountId, value } = req.body;
            if (!value) {
                return res.status(400).json({ error: 'Missing value' });
            }

            const endpoint = accountId && accountId !== 'default'
                ? `${OPENPIX_API_URL}/account/${accountId}/withdraw`
                : `${OPENPIX_API_URL}/subaccount/withdraw`;

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': OPENPIX_APP_ID,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ value }),
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({ message: 'Falha ao solicitar saque' }));
                console.error('Woovi withdraw error:', error);
                return res.status(response.status).json(error);
            }

            const data = await response.json();
            return res.status(200).json(data);
        }

        return res.status(400).json({ error: `Unknown action: ${action}` });
    } catch (error) {
        console.error('Woovi proxy error:', error);
        return res.status(500).json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : String(error)
        });
    }
}
