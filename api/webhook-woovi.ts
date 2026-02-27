import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client (Standard)
const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!
);

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const UTMIFY_TOKEN = '1yUDmnd8pszFtqHqLk4YOJFQE8mVKz9IFi2Q';

export default async function handler(
    req: VercelRequest,
    res: VercelResponse
) {
    // Woovi sends a GET request to verify the endpoint returns 200 before registering
    if (req.method === 'GET' || req.method === 'OPTIONS') {
        return res.status(200).json({ status: 'ok', webhook: 'sellpay-woovi' });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const payload = req.body;

        // Woovi sends correlationID in the charge object
        const charge = payload.charge || (payload.event === 'OPENPIX:CHARGE_COMPLETED' ? payload.charge : null);

        if (!charge) {
            console.log('[Webhook] Invalid payload or not a charge event');
            return res.status(200).json({ status: 'ignored' });
        }

        const correlationId = charge.correlationID;
        const status = charge.status;

        console.log(`[Webhook] Processing charge ${correlationId}, status: ${status}`);

        if (status !== 'COMPLETED') {
            return res.status(200).json({ status: 'pending' });
        }

        // 1. Find Order in Supabase
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select(`
                *,
                product:products(*, product_deliverables(*)),
                plan:product_plans(*),
                order_bump:order_bumps(*)
            `)
            .eq('correlation_id', correlationId)
            .single();

        if (orderError || !order) {
            console.error('[Webhook] Order not found:', correlationId);
            return res.status(404).json({ error: 'Order not found' });
        }

        // 2. Check if already approved to avoid duplicate triggers
        if (order.status === 'APPROVED') {
            console.log('[Webhook] Order already approved:', correlationId);
            return res.status(200).json({ status: 'already_approved' });
        }

        // 3. Update Order Status
        const { error: updateError } = await supabase
            .from('orders')
            .update({
                status: 'APPROVED',
                paid_at: new Date().toISOString()
            })
            .eq('id', order.id);

        if (updateError) {
            console.error('[Webhook] Error updating order:', updateError);
            return res.status(500).json({ error: 'Failed to update order' });
        }

        console.log('[Webhook] Order updated to APPROVED');

        // 4. Send Utmify Event (Fix Attribution for Late Payments)
        try {
            const utmifyOrder = {
                orderId: order.id,
                platform: 'SellPay',
                paymentMethod: 'pix',
                status: 'paid',
                createdAt: order.created_at.replace('T', ' ').substring(0, 19),
                approvedDate: new Date().toISOString().replace('T', ' ').substring(0, 19),
                refundedAt: null,
                customer: {
                    name: order.customer_name,
                    email: order.customer_email,
                    phone: order.customer_phone,
                    document: order.customer_cpf || null,
                },
                products: [
                    {
                        id: order.product_id,
                        name: order.product?.name || 'Produto',
                        planId: order.plan_id,
                        planName: order.plan?.name || 'Plano',
                        quantity: 1,
                        priceInCents: order.amount
                    }
                ],
                trackingParameters: order.tracking_params || {
                    src: null, sck: null, utm_source: null, utm_campaign: null,
                    utm_medium: null, utm_content: null, utm_term: null
                },
                commission: {
                    totalPriceInCents: order.amount,
                    gatewayFeeInCents: Math.round(order.amount * 0.03), // Estimate
                    userCommissionInCents: order.amount
                }
            };

            await fetch('https://api.utmify.com.br/api-credentials/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-token': UTMIFY_TOKEN
                },
                body: JSON.stringify(utmifyOrder)
            });
            console.log('[Webhook] Utmify event sent');
        } catch (e) {
            console.error('[Webhook] Utmify error:', e);
        }

        // 5. Send Approval Email (Fix Delivery)
        if (RESEND_API_KEY) {
            try {
                const deliverables = order.product?.product_deliverables || [];
                const deliverablesHtml = deliverables.length > 0
                    ? deliverables.map((d: any, index: number) => {
                        const label = d.type === 'file' ? 'Baixar Produto' : 'Acessar Conteúdo';
                        const url = d.type === 'file' ? d.file_url : d.redirect_url;
                        return `
                            <div style="margin-top: 16px;">
                                <a href="${url}" style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 15px; width: 80%;">
                                    ${label} ${deliverables.length > 1 ? (index + 1) : ''}
                                </a>
                            </div>`;
                    }).join('')
                    : `<p style="color: #6b7280; margin-top: 24px;">Em breve você receberá mais informações sobre seu acesso.</p>`;

                const emailHtml = `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                        <h1 style="color: #059669; text-align: center;">Pagamento Confirmado! ✅</h1>
                        <p>Olá <strong>${order.customer_name}</strong>,</p>
                        <p>Seu pagamento para <strong>${order.product?.name}</strong> foi confirmado com sucesso.</p>
                        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <p><strong>Valor:</strong> R$ ${(order.amount / 100).toFixed(2)}</p>
                            <p><strong>ID do Pedido:</strong> ${order.id}</p>
                        </div>
                        <div style="text-align: center; margin-top: 30px;">
                            <h3 style="color: #374151;">Seu Acesso:</h3>
                            ${deliverablesHtml}
                        </div>
                        <hr style="margin-top: 40px; border: none; border-top: 1px solid #eee;">
                        <p style="font-size: 12px; color: #9ca3af; text-align: center;">© 2026 SellPay. Todos os direitos reservados.</p>
                    </div>`;

                await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${RESEND_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        from: 'SellPay <suporte@email.clonefyia.com>',
                        to: order.customer_email,
                        subject: `✅ Compra Aprovada - ${order.product?.name}`,
                        html: emailHtml,
                    }),
                });
                console.log('[Webhook] Approval email sent');
            } catch (e) {
                console.error('[Webhook] Email error:', e);
            }
        }

        return res.status(200).json({ status: 'success', orderId: order.id });

    } catch (error) {
        console.error('[Webhook] Global error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
