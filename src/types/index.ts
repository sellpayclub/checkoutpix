// ============================================
// Types for SellPay Checkout
// Based on localStorage data layer
// ============================================

// Product types
export interface ProductPlan {
    id: string;
    product_id: string;
    name: string;
    price: number;
    is_recurring: boolean;
    recurring_interval: 'monthly' | 'yearly' | null;
    is_active: boolean;
}

export interface ProductDeliverable {
    id: string;
    product_id: string;
    file_url: string | null;
    redirect_url: string | null;
    type: 'file' | 'redirect';
}

export interface Product {
    id: string;
    name: string;
    description: string | null;
    image_url: string | null;
    cover_image_url: string | null;
    order_bump_ids: string[];
    created_at: string;
    updated_at: string;
    product_plans: ProductPlan[];
    product_deliverables: ProductDeliverable[];
}

// Order Bump types
export interface OrderBump {
    id: string;
    name: string;
    title: string;
    description: string | null;
    price: number;
    image_url: string | null;
    box_color: string;
    text_color: string;
    button_text?: string | null;
    is_active: boolean;
    created_at: string;
}

// Order types
export interface Order {
    id: string;
    correlation_id: string;
    product_id: string;
    plan_id: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    amount: number;
    status: 'PENDING' | 'APPROVED' | 'EXPIRED' | 'REFUNDED';
    pix_qr_code: string | null;
    pix_copy_paste: string | null;
    pix_charge_id: string | null;
    order_bump_id: string | null;
    paid_at: string | null;
    created_at: string;
    product?: Product;
    plan?: ProductPlan;
    order_bump?: OrderBump;
}

// Facebook Pixel types
export interface FacebookPixel {
    id: string;
    pixel_id: string;
    name: string | null;
    is_active: boolean;
    events: string[];
    created_at: string;
}

// Google Pixel types
export interface GooglePixel {
    id: string;
    pixel_id: string;
    name: string | null;
    is_active: boolean;
    events: string[];
    conversion_label: string | null;
    created_at: string;
}

// Checkout Settings types
export interface CheckoutSettings {
    id: string;
    timer_enabled: boolean;
    timer_text: string;
    timer_duration: number;
    primary_color: string;
    button_text: string;
    logo_url: string | null;
    footer_text: string;
    cpf_enabled: boolean;
    order_bump_title: string;
    order_bump_button_text: string;
    updated_at: string;
}

// OpenPix types
export interface OpenPixCharge {
    correlationID: string;
    value: number;
    comment?: string;
    customer: {
        name: string;
        email: string;
        phone: string;
    };
}

export interface OpenPixChargeResponse {
    charge: {
        correlationID: string;
        value: number;
        qrCodeImage: string;
        brCode: string;
        globalID: string;
        status: string;
    };
}

// Checkout Form types
export interface CheckoutFormData {
    name: string;
    email: string;
    phone: string;
    cpf: string;
}
