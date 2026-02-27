import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
    req: VercelRequest,
    res: VercelResponse
) {
    // Configuração de CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Tratamento de preflight request (OPTIONS)
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { to, subject, html } = req.body;

    if (!to || !subject || !html) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    if (!RESEND_API_KEY) {
        console.error('RESEND_API_KEY is missing from environment variables');
        return res.status(500).json({ error: 'Server configuration error: Missing API Key' });
    }

    try {
        console.log(`Attempting to send email to: ${to}, Subject: ${subject}`);

        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
                'X-Source': 'SellPay-Checkout'
            },
            body: JSON.stringify({
                from: 'SellPay <suporte@email.clonefyia.com>',
                to,
                subject,
                html,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Resend API Error:', JSON.stringify(data, null, 2));
            return res.status(response.status).json({
                error: 'Resend API Error',
                details: data
            });
        }

        console.log('Email sent successfully:', data.id);
        return res.status(200).json(data);

    } catch (error) {
        console.error('Error sending email:', error);
        return res.status(500).json({ error: 'Failed to send email', details: error instanceof Error ? error.message : String(error) });
    }
}
