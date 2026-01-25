// Local Storage based data layer (works without Supabase)
// This allows the app to work in demo mode

const STORAGE_KEYS = {
    products: 'sellpay_products',
    orderBumps: 'sellpay_order_bumps',
    orders: 'sellpay_orders',
    pixels: 'sellpay_pixels',
    settings: 'sellpay_settings',
};

// Utility functions
function generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function getFromStorage<T>(key: string): T[] {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
}

function saveToStorage<T>(key: string, data: T[]): void {
    localStorage.setItem(key, JSON.stringify(data));
}

// ============ Products ============

export interface LocalProduct {
    id: string;
    name: string;
    description: string | null;
    image_url: string | null;
    cover_image_url: string | null;
    created_at: string;
    updated_at: string;
    product_plans: LocalProductPlan[];
    product_deliverables: LocalDeliverable[];
    order_bump_ids?: string[];
}

export interface LocalProductPlan {
    id: string;
    product_id: string;
    name: string;
    price: number;
    is_recurring: boolean;
    recurring_interval: 'monthly' | 'yearly' | null;
    is_active: boolean;
}

interface LocalDeliverable {
    id: string;
    product_id: string;
    file_url: string | null;
    redirect_url: string | null;
    type: 'file' | 'redirect';
}

export async function getProducts(): Promise<LocalProduct[]> {
    const products = getFromStorage<LocalProduct>(STORAGE_KEYS.products);
    // Safety check for legacy data
    return products.map(p => ({
        ...p,
        product_plans: p.product_plans || [],
        product_deliverables: p.product_deliverables || [],
        order_bump_ids: p.order_bump_ids || []
    }));
}

export async function getProduct(id: string): Promise<LocalProduct | null> {
    const products = getFromStorage<LocalProduct>(STORAGE_KEYS.products);
    return products.find(p => p.id === id) || null;
}

export async function createProduct(product: {
    name: string;
    description?: string;
    image_url?: string;
    cover_image_url?: string;
    order_bump_ids?: string[];
    product_plans?: Omit<LocalProductPlan, 'id' | 'product_id' | 'is_active'>[];
    product_deliverables?: Omit<LocalDeliverable, 'id' | 'product_id'>[];
}): Promise<LocalProduct> {
    const products = getFromStorage<LocalProduct>(STORAGE_KEYS.products);
    const productId = generateId();

    const newProduct: LocalProduct = {
        id: productId,
        name: product.name,
        description: product.description || null,
        image_url: product.image_url || null,
        cover_image_url: product.cover_image_url || null,
        order_bump_ids: product.order_bump_ids || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        product_plans: (product.product_plans || []).map(p => ({
            ...p,
            id: generateId(),
            product_id: productId,
            is_active: true
        })),
        product_deliverables: (product.product_deliverables || []).map(d => ({
            ...d,
            id: generateId(),
            product_id: productId
        })),
    };

    products.unshift(newProduct);
    saveToStorage(STORAGE_KEYS.products, products);
    return newProduct;
}

export async function updateProduct(id: string, updates: Partial<{
    name: string;
    description: string;
    image_url: string;
    cover_image_url: string;
    order_bump_ids: string[];
    product_plans: LocalProductPlan[];
}>): Promise<LocalProduct> {
    const products = getFromStorage<LocalProduct>(STORAGE_KEYS.products);
    const index = products.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Product not found');

    products[index] = { ...products[index], ...updates, updated_at: new Date().toISOString() };
    saveToStorage(STORAGE_KEYS.products, products);
    return products[index];
}

export async function deleteProduct(id: string): Promise<void> {
    const products = getFromStorage<LocalProduct>(STORAGE_KEYS.products);
    saveToStorage(STORAGE_KEYS.products, products.filter(p => p.id !== id));
}

// ============ Product Plans ============

export async function createProductPlan(plan: {
    product_id: string;
    name: string;
    price: number;
    is_recurring?: boolean;
    recurring_interval?: 'monthly' | 'yearly' | null;
}): Promise<LocalProductPlan> {
    const products = getFromStorage<LocalProduct>(STORAGE_KEYS.products);
    const productIndex = products.findIndex(p => p.id === plan.product_id);
    if (productIndex === -1) throw new Error('Product not found');

    const newPlan: LocalProductPlan = {
        id: generateId(),
        product_id: plan.product_id,
        name: plan.name,
        price: plan.price,
        is_recurring: plan.is_recurring || false,
        recurring_interval: plan.recurring_interval || null,
        is_active: true,
    };

    products[productIndex].product_plans.push(newPlan);
    saveToStorage(STORAGE_KEYS.products, products);
    return newPlan;
}

export async function updateProductPlan(id: string, updates: Partial<LocalProductPlan>): Promise<LocalProductPlan> {
    const products = getFromStorage<LocalProduct>(STORAGE_KEYS.products);
    let updatedPlan: LocalProductPlan | null = null;

    for (let i = 0; i < products.length; i++) {
        const planIndex = products[i].product_plans.findIndex(p => p.id === id);
        if (planIndex !== -1) {
            products[i].product_plans[planIndex] = { ...products[i].product_plans[planIndex], ...updates };
            updatedPlan = products[i].product_plans[planIndex];
            break;
        }
    }

    if (!updatedPlan) throw new Error('Plan not found');
    saveToStorage(STORAGE_KEYS.products, products);
    return updatedPlan;
}

export async function deleteProductPlan(id: string): Promise<void> {
    const products = getFromStorage<LocalProduct>(STORAGE_KEYS.products);
    for (const product of products) {
        product.product_plans = product.product_plans.filter(p => p.id !== id);
    }
    saveToStorage(STORAGE_KEYS.products, products);
}

// ============ Product Deliverables ============

export async function upsertDeliverable(deliverable: {
    product_id: string;
    file_url?: string;
    redirect_url?: string;
    type: 'file' | 'redirect';
}): Promise<LocalDeliverable> {
    const products = getFromStorage<LocalProduct>(STORAGE_KEYS.products);
    const productIndex = products.findIndex(p => p.id === deliverable.product_id);
    if (productIndex === -1) throw new Error('Product not found');

    const newDeliverable: LocalDeliverable = {
        id: generateId(),
        product_id: deliverable.product_id,
        file_url: deliverable.file_url || null,
        redirect_url: deliverable.redirect_url || null,
        type: deliverable.type,
    };

    products[productIndex].product_deliverables = [newDeliverable];
    saveToStorage(STORAGE_KEYS.products, products);
    return newDeliverable;
}

// ============ Order Bumps ============

export interface LocalOrderBump {
    id: string;
    name: string;
    title: string;
    description: string | null;
    price: number;
    image_url: string | null;
    box_color: string;
    text_color: string;
    button_text?: string;
    is_active: boolean;
    created_at: string;
}

export async function getOrderBumps(): Promise<LocalOrderBump[]> {
    return getFromStorage<LocalOrderBump>(STORAGE_KEYS.orderBumps);
}

export async function getOrderBump(id: string): Promise<LocalOrderBump | null> {
    const bumps = getFromStorage<LocalOrderBump>(STORAGE_KEYS.orderBumps);
    return bumps.find(b => b.id === id) || null;
}

export async function createOrderBump(bump: {
    name: string;
    title: string;
    description?: string;
    price: number;
    image_url?: string;
    box_color?: string;
    text_color?: string;
    button_text?: string;
    is_active?: boolean;
}): Promise<LocalOrderBump> {
    const bumps = getFromStorage<LocalOrderBump>(STORAGE_KEYS.orderBumps);
    const newBump: LocalOrderBump = {
        id: generateId(),
        name: bump.name,
        title: bump.title,
        description: bump.description || null,
        price: bump.price,
        image_url: bump.image_url || null,
        box_color: bump.box_color || '#22c55e',
        text_color: bump.text_color || '#ffffff',
        button_text: bump.button_text || undefined,
        is_active: bump.is_active ?? true,
        created_at: new Date().toISOString(),
    };
    bumps.unshift(newBump);
    saveToStorage(STORAGE_KEYS.orderBumps, bumps);
    return newBump;
}

export async function updateOrderBump(id: string, updates: Partial<LocalOrderBump>): Promise<LocalOrderBump> {
    const bumps = getFromStorage<LocalOrderBump>(STORAGE_KEYS.orderBumps);
    const index = bumps.findIndex(b => b.id === id);
    if (index === -1) throw new Error('Order bump not found');

    bumps[index] = { ...bumps[index], ...updates };
    saveToStorage(STORAGE_KEYS.orderBumps, bumps);
    return bumps[index];
}

export async function deleteOrderBump(id: string): Promise<void> {
    const bumps = getFromStorage<LocalOrderBump>(STORAGE_KEYS.orderBumps);
    saveToStorage(STORAGE_KEYS.orderBumps, bumps.filter(b => b.id !== id));
}

export async function linkOrderBumpToProduct(productId: string, orderBumpId: string): Promise<void> {
    const products = getFromStorage<LocalProduct>(STORAGE_KEYS.products);
    const index = products.findIndex(p => p.id === productId);
    if (index === -1) throw new Error('Product not found');

    const currentBumps = products[index].order_bump_ids || [];
    if (!currentBumps.includes(orderBumpId)) {
        products[index].order_bump_ids = [...currentBumps, orderBumpId];
        saveToStorage(STORAGE_KEYS.products, products);
    }
}

export async function unlinkOrderBumpFromProduct(productId: string, orderBumpId: string): Promise<void> {
    const products = getFromStorage<LocalProduct>(STORAGE_KEYS.products);
    const index = products.findIndex(p => p.id === productId);
    if (index === -1) throw new Error('Product not found');

    products[index].order_bump_ids = (products[index].order_bump_ids || []).filter(id => id !== orderBumpId);
    saveToStorage(STORAGE_KEYS.products, products);
}

// ============ Orders ============

export interface LocalOrder {
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
    product?: LocalProduct;
    plan?: LocalProductPlan;
    order_bump?: LocalOrderBump;
}

export async function getOrders(filters?: {
    status?: string;
    productId?: string;
    startDate?: string;
    endDate?: string;
}): Promise<LocalOrder[]> {
    let orders = getFromStorage<LocalOrder>(STORAGE_KEYS.orders);
    const products = getFromStorage<LocalProduct>(STORAGE_KEYS.products);

    // Apply filters
    if (filters?.status) {
        orders = orders.filter(o => o.status === filters.status);
    }
    if (filters?.productId) {
        orders = orders.filter(o => o.product_id === filters.productId);
    }
    if (filters?.startDate) {
        orders = orders.filter(o => o.created_at >= filters.startDate!);
    }
    if (filters?.endDate) {
        orders = orders.filter(o => o.created_at <= filters.endDate!);
    }

    return orders.map(order => {
        const product = products.find(p => p.id === order.product_id);
        const plan = product?.product_plans?.find(pl => pl.id === order.plan_id);
        return { ...order, product, plan };
    });
}

export async function getOrder(id: string): Promise<LocalOrder | null> {
    const orders = await getOrders();
    return orders.find(o => o.id === id) || null;
}

export async function getOrderByCorrelationId(correlationId: string): Promise<LocalOrder | null> {
    const orders = await getOrders();
    return orders.find(o => o.correlation_id === correlationId) || null;
}

export async function createOrder(order: {
    correlation_id: string;
    product_id: string;
    plan_id: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    amount: number;
    pix_qr_code?: string;
    pix_copy_paste?: string;
    pix_charge_id?: string;
    order_bump_id?: string;
}): Promise<LocalOrder> {
    const orders = getFromStorage<LocalOrder>(STORAGE_KEYS.orders);
    const newOrder: LocalOrder = {
        id: generateId(),
        ...order,
        pix_qr_code: order.pix_qr_code || null,
        pix_copy_paste: order.pix_copy_paste || null,
        pix_charge_id: order.pix_charge_id || null,
        order_bump_id: order.order_bump_id || null,
        status: 'PENDING',
        paid_at: null,
        created_at: new Date().toISOString(),
    };
    orders.unshift(newOrder);
    saveToStorage(STORAGE_KEYS.orders, orders);
    return newOrder;
}

export async function updateOrderStatus(correlationId: string, status: string, paidAt?: string): Promise<LocalOrder> {
    const orders = getFromStorage<LocalOrder>(STORAGE_KEYS.orders);
    const index = orders.findIndex(o => o.correlation_id === correlationId);
    if (index === -1) throw new Error('Order not found');

    orders[index].status = status as LocalOrder['status'];
    if (paidAt) orders[index].paid_at = paidAt;
    saveToStorage(STORAGE_KEYS.orders, orders);
    return orders[index];
}

// ============ Facebook Pixels ============

export interface LocalPixel {
    id: string;
    pixel_id: string;
    name: string | null;
    is_active: boolean;
    events: string[];
    created_at: string;
}

export async function getPixels(): Promise<LocalPixel[]> {
    return getFromStorage<LocalPixel>(STORAGE_KEYS.pixels);
}

export async function createPixel(pixel: {
    pixel_id: string;
    name?: string;
    events?: string[];
}): Promise<LocalPixel> {
    const pixels = getFromStorage<LocalPixel>(STORAGE_KEYS.pixels);
    const newPixel: LocalPixel = {
        id: generateId(),
        pixel_id: pixel.pixel_id,
        name: pixel.name || null,
        is_active: true,
        events: pixel.events || ['PageView', 'InitiateCheckout', 'Purchase'],
        created_at: new Date().toISOString(),
    };
    pixels.unshift(newPixel);
    saveToStorage(STORAGE_KEYS.pixels, pixels);
    return newPixel;
}

export async function updatePixel(id: string, updates: Partial<LocalPixel>): Promise<LocalPixel> {
    const pixels = getFromStorage<LocalPixel>(STORAGE_KEYS.pixels);
    const index = pixels.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Pixel not found');

    pixels[index] = { ...pixels[index], ...updates };
    saveToStorage(STORAGE_KEYS.pixels, pixels);
    return pixels[index];
}

export async function deletePixel(id: string): Promise<void> {
    const pixels = getFromStorage<LocalPixel>(STORAGE_KEYS.pixels);
    saveToStorage(STORAGE_KEYS.pixels, pixels.filter(p => p.id !== id));
}

// ============ Checkout Settings ============

// Logo SellPay default
const SELLPAY_LOGO = 'https://xyzgvsuttwrvbyyxdppq.supabase.co/storage/v1/object/public/logos/logo%20sellpay.png';

export interface LocalSettings {
    id: string;
    timer_enabled: boolean;
    timer_text: string;
    timer_duration: number;
    primary_color: string;
    button_text: string;
    logo_url: string | null;
    cover_image_url: string | null;
    footer_text: string;
    cpf_enabled: boolean;
    order_bump_title: string;
    order_bump_button_text: string;
    updated_at: string;
}

const DEFAULT_SETTINGS: LocalSettings = {
    id: 'default',
    timer_enabled: true,
    timer_text: 'Oferta por tempo limitado',
    timer_duration: 600,
    primary_color: '#059669',
    button_text: 'FINALIZAR COMPRA',
    logo_url: SELLPAY_LOGO,
    cover_image_url: null,
    footer_text: '© 2026 SellPay. Todos os direitos reservados.',
    cpf_enabled: false,
    order_bump_title: 'Aproveite essa oferta especial!',
    order_bump_button_text: 'Adicionar oferta',
    updated_at: new Date().toISOString(),
};

export async function getCheckoutSettings(): Promise<LocalSettings> {
    const settings = localStorage.getItem(STORAGE_KEYS.settings);
    return settings ? JSON.parse(settings) : DEFAULT_SETTINGS;
}

export async function updateCheckoutSettings(updates: Partial<LocalSettings>): Promise<LocalSettings> {
    const current = await getCheckoutSettings();
    const updated = { ...current, ...updates, updated_at: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(updated));
    return updated;
}

// ============ Dashboard Stats ============

export async function getDashboardStats(_startDate?: string, _endDate?: string) {
    const orders = getFromStorage<LocalOrder>(STORAGE_KEYS.orders);

    const stats = {
        totalOrders: orders.length,
        approvedOrders: orders.filter(o => o.status === 'APPROVED').length,
        pendingOrders: orders.filter(o => o.status === 'PENDING').length,
        totalRevenue: orders.filter(o => o.status === 'APPROVED').reduce((acc, o) => acc + o.amount, 0),
        conversionRate: 0,
    };

    if (stats.totalOrders > 0) {
        stats.conversionRate = (stats.approvedOrders / stats.totalOrders) * 100;
    }

    return stats;
}

// ============ File Upload (Local) ============

export async function uploadFile(_bucket: string, _path: string, file: File): Promise<string> {
    // Convert file to data URL for local storage
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
