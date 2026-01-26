

interface EmailData {
    to: string;
    subject: string;
    html: string;
}

/**
 * Send email via internal API (Vercel Function)
 */
async function sendEmail(data: EmailData): Promise<boolean> {
    try {
        const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to: data.to,
                subject: data.subject,
                html: data.html,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('Email Service Error:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Network/System Error sending email:', error);
        return false;
    }
}

/**
 * Format price in cents to BRL
 */
function formatPrice(cents: number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(cents / 100);
}

/**
 * Email: PIX Gerado
 */
export async function sendPixGeneratedEmail(data: {
    customerEmail: string;
    customerName: string;
    productName: string;
    amount: number;
    pixCode: string;
}): Promise<boolean> {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
    <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 32px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">PIX Gerado com Sucesso! 💰</h1>
            </div>
            
            <!-- Content -->
            <div style="padding: 32px;">
                <p style="color: #374151; font-size: 16px; margin: 0 0 24px;">
                    Olá <strong>${data.customerName.split(' ')[0]}</strong>,
                </p>
                
                <p style="color: #6b7280; font-size: 15px; margin: 0 0 24px;">
                    Seu PIX para pagamento do produto <strong>${data.productName}</strong> foi gerado!
                </p>
                
                <!-- Amount Box -->
                <div style="background: #f0fdf4; border: 2px solid #059669; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                    <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px;">Valor a pagar:</p>
                    <p style="color: #059669; font-size: 32px; font-weight: bold; margin: 0;">${formatPrice(data.amount)}</p>
                </div>
                
                <!-- PIX Code -->
                <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                    <p style="color: #374151; font-size: 14px; font-weight: 600; margin: 0 0 12px;">Código PIX Copia e Cola:</p>
                    <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; word-break: break-all;">
                        <code style="font-size: 12px; color: #6b7280;">${data.pixCode}</code>
                    </div>
                </div>
                
                <p style="color: #9ca3af; font-size: 14px; text-align: center; margin: 0;">
                    Abra o app do seu banco e escaneie o QR Code ou cole o código acima.
                </p>
            </div>
            
            <!-- Footer -->
            <div style="background: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                    © 2026 SellPay. Todos os direitos reservados.
                </p>
            </div>
        </div>
    </div>
</body>
</html>
    `;

    return sendEmail({
        to: data.customerEmail,
        subject: `🔔 PIX Gerado - ${data.productName}`,
        html,
    });
}

/**
 * Email: Compra Aprovada
 */
export async function sendPurchaseApprovedEmail(data: {
    customerEmail: string;
    customerName: string;
    productName: string;
    amount: number;
    accessUrl?: string;
    downloadUrl?: string;
}): Promise<boolean> {
    const accessButton = data.accessUrl ? `
        <a href="${data.accessUrl}" style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px; margin-top: 24px;">
            Acessar Conteúdo
        </a>
    ` : '';

    const downloadButton = data.downloadUrl ? `
        <a href="${data.downloadUrl}" style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px; margin-top: 24px;">
            Baixar Produto
        </a>
    ` : '';

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
    <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 32px; text-align: center;">
                <div style="width: 64px; height: 64px; background: white; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                    <span style="font-size: 32px;">✅</span>
                </div>
                <h1 style="color: white; margin: 0; font-size: 24px;">Pagamento Confirmado!</h1>
            </div>
            
            <!-- Content -->
            <div style="padding: 32px; text-align: center;">
                <p style="color: #374151; font-size: 18px; margin: 0 0 8px;">
                    Parabéns, <strong>${data.customerName.split(' ')[0]}</strong>! 🎉
                </p>
                
                <p style="color: #6b7280; font-size: 15px; margin: 0 0 32px;">
                    Seu pagamento foi confirmado com sucesso.
                </p>
                
                <!-- Order Summary -->
                <div style="background: #f9fafb; border-radius: 12px; padding: 24px; text-align: left; margin-bottom: 24px;">
                    <h3 style="color: #374151; font-size: 14px; font-weight: 600; margin: 0 0 16px; text-transform: uppercase; letter-spacing: 0.5px;">Resumo da Compra</h3>
                    
                    <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                        <span style="color: #6b7280;">Produto:</span>
                        <span style="color: #374151; font-weight: 600;">${data.productName}</span>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; padding-top: 12px; border-top: 1px solid #e5e7eb;">
                        <span style="color: #6b7280;">Valor pago:</span>
                        <span style="color: #059669; font-weight: 700; font-size: 18px;">${formatPrice(data.amount)}</span>
                    </div>
                </div>
                
                ${accessButton}
                ${downloadButton}
                
                ${!data.accessUrl && !data.downloadUrl ? `
                    <p style="color: #9ca3af; font-size: 14px; margin-top: 24px;">
                        Em breve você receberá mais informações sobre seu acesso.
                    </p>
                ` : ''}
            </div>
            
            <!-- Footer -->
            <div style="background: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0 0 8px;">
                    Dúvidas? Responda este email que ajudaremos você.
                </p>
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                    © 2026 SellPay. Todos os direitos reservados.
                </p>
            </div>
        </div>
    </div>
</body>
</html>
    `;

    return sendEmail({
        to: data.customerEmail,
        subject: `✅ Compra Aprovada - ${data.productName}`,
        html,
    });
}

/**
 * Email: PIX Expirado
 */
export async function sendPixExpiredEmail(data: {
    customerEmail: string;
    customerName: string;
    productName: string;
    checkoutUrl: string;
}): Promise<boolean> {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
    <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 32px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">PIX Expirado ⏰</h1>
            </div>
            
            <!-- Content -->
            <div style="padding: 32px; text-align: center;">
                <p style="color: #374151; font-size: 16px; margin: 0 0 24px;">
                    Olá <strong>${data.customerName.split(' ')[0]}</strong>,
                </p>
                
                <p style="color: #6b7280; font-size: 15px; margin: 0 0 24px;">
                    O PIX para pagamento do produto <strong>${data.productName}</strong> expirou antes de ser pago.
                </p>
                
                <p style="color: #6b7280; font-size: 15px; margin: 0 0 32px;">
                    Não se preocupe! Você pode gerar um novo PIX a qualquer momento.
                </p>
                
                <a href="${data.checkoutUrl}" style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px;">
                    Tentar Novamente
                </a>
            </div>
            
            <!-- Footer -->
            <div style="background: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                    © 2026 SellPay. Todos os direitos reservados.
                </p>
            </div>
        </div>
    </div>
</body>
</html>
    `;

    return sendEmail({
        to: data.customerEmail,
        subject: `⏰ PIX Expirado - ${data.productName}`,
        html,
    });
}

/**
 * Email: Recuperação de Carrinho
 */
export async function sendAbandonedCartEmail(data: {
    customerEmail: string;
    customerName: string;
    productName: string;
    checkoutUrl: string;
}): Promise<boolean> {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
    <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 32px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">Não perca essa oportunidade! 🛒</h1>
            </div>
            
            <!-- Content -->
            <div style="padding: 32px; text-align: center;">
                <p style="color: #374151; font-size: 16px; margin: 0 0 24px;">
                    Olá <strong>${data.customerName.split(' ')[0]}</strong>,
                </p>
                
                <p style="color: #6b7280; font-size: 15px; margin: 0 0 24px;">
                    Notamos que você iniciou a compra de <strong>${data.productName}</strong> mas não finalizou.
                </p>
                
                <p style="color: #6b7280; font-size: 15px; margin: 0 0 32px;">
                    Seu carrinho está salvo e esperando por você. Clique abaixo para retomar de onde parou:
                </p>
                
                <a href="${data.checkoutUrl}" style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px;">
                    Finalizar Compra Agora
                </a>
            </div>
            
            <!-- Footer -->
            <div style="background: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                    © 2026 SellPay. Todos os direitos reservados.
                </p>
            </div>
        </div>
    </div>
</body>
</html>
    `;

    return sendEmail({
        to: data.customerEmail,
        subject: `🛒 Seu carrinho está te esperando - ${data.productName}`,
        html,
    });
}
