
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types
export interface Product {
    id: string;
    name: string;
    description: string | null;
    image_url: string | null;
    cover_image_url: string | null;
    created_at: string;
    updated_at: string;
    product_plans?: ProductPlan[];
    product_deliverables?: Deliverable[];
    order_bump_ids?: string[]; // Computed from relation
}

export interface ProductPlan {
    id: string;
    product_id: string;
    name: string;
    price: number;
    is_recurring: boolean;
    recurring_interval: 'monthly' | 'yearly' | null;
    is_active: boolean;
}

export interface Deliverable {
    id: string;
    product_id: string;
    file_url: string | null;
    redirect_url: string | null;
    type: 'file' | 'redirect';
}

export interface OrderBump {
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

export interface Pixel {
    id: string;
    pixel_id: string;
    name: string | null;
    is_active: boolean;
    events: string[];
    created_at: string;
}

export interface CheckoutSettings {
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

// ============ Products ============

export async function getProducts(): Promise<Product[]> {
    const { data: products, error } = await supabase
        .from('products')
        .select(`
            *,
            product_plans (*),
            product_deliverables (*),
            product_order_bumps (order_bump_id)
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching products:', error);
        return [];
    }

    return products.map(p => ({
        ...p,
        order_bump_ids: p.product_order_bumps?.map((pob: any) => pob.order_bump_id) || []
    }));
}

export async function getProduct(id: string): Promise<Product | null> {
    const { data: product, error } = await supabase
        .from('products')
        .select(`
            *,
            product_plans (*),
            product_deliverables (*),
            product_order_bumps (order_bump_id)
        `)
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching product:', error);
        return null;
    }

    return {
        ...product,
        order_bump_ids: product.product_order_bumps?.map((pob: any) => pob.order_bump_id) || []
    };
}

export async function createProduct(product: {
    name: string;
    description?: string;
    image_url?: string;
    cover_image_url?: string;
    order_bump_ids?: string[];
    product_plans?: Omit<ProductPlan, 'id' | 'product_id' | 'is_active'>[];
    product_deliverables?: Omit<Deliverable, 'id' | 'product_id'>[];
}): Promise<Product | null> {
    // 1. Create Product
    const { data: newProduct, error: productError } = await supabase
        .from('products')
        .insert({
            name: product.name,
            description: product.description,
            image_url: product.image_url,
            cover_image_url: product.cover_image_url
        })
        .select()
        .single();

    if (productError || !newProduct) {
        console.error('Error creating product:', productError);
        return null;
    }

    const productId = newProduct.id;

    // 2. Create Plans
    if (product.product_plans?.length) {
        const plansToInsert = product.product_plans.map(p => ({
            ...p,
            product_id: productId,
            is_active: true
        }));
        await supabase.from('product_plans').insert(plansToInsert);
    }

    // 3. Create Deliverables
    if (product.product_deliverables?.length) {
        const deliverablesToInsert = product.product_deliverables.map(d => ({
            ...d,
            product_id: productId
        }));
        await supabase.from('product_deliverables').insert(deliverablesToInsert);
    }

    // 4. Link Order Bumps
    if (product.order_bump_ids?.length) {
        const bumpsToInsert = product.order_bump_ids.map(bumpId => ({
            product_id: productId,
            order_bump_id: bumpId
        }));
        await supabase.from('product_order_bumps').insert(bumpsToInsert);
    }

    return getProduct(productId);
}

export async function updateProduct(id: string, updates: Partial<{
    name: string;
    description: string;
    image_url: string;
    cover_image_url: string;
    order_bump_ids: string[];
    product_plans: ProductPlan[]; // usually handled separately but kept for signature compat if needed
}>): Promise<Product | null> {

    // Update basic fields
    const { error } = await supabase
        .from('products')
        .update({
            name: updates.name,
            description: updates.description,
            image_url: updates.image_url,
            cover_image_url: updates.cover_image_url,
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (error) {
        throw new Error(error.message);
    }

    // Update Order Bumps Links if provided
    if (updates.order_bump_ids) {
        // Delete existing links
        await supabase.from('product_order_bumps').delete().eq('product_id', id);

        // Insert new links
        if (updates.order_bump_ids.length > 0) {
            const bumpsToInsert = updates.order_bump_ids.map(bumpId => ({
                product_id: id,
                order_bump_id: bumpId
            }));
            await supabase.from('product_order_bumps').insert(bumpsToInsert);
        }
    }

    return getProduct(id);
}

export async function deleteProduct(id: string): Promise<void> {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw new Error(error.message);
}

// ============ Product Plans ============

export async function createProductPlan(plan: {
    product_id: string;
    name: string;
    price: number;
    is_recurring?: boolean;
    recurring_interval?: 'monthly' | 'yearly' | null;
}): Promise<ProductPlan> {
    const { data, error } = await supabase
        .from('product_plans')
        .insert({
            product_id: plan.product_id,
            name: plan.name,
            price: plan.price,
            is_recurring: plan.is_recurring,
            recurring_interval: plan.recurring_interval,
            is_active: true
        })
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
}

export async function updateProductPlan(id: string, updates: Partial<ProductPlan>): Promise<ProductPlan> {
    const { data, error } = await supabase
        .from('product_plans')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
}

export async function deleteProductPlan(id: string): Promise<void> {
    const { error } = await supabase.from('product_plans').delete().eq('id', id);
    if (error) throw new Error(error.message);
}

// ============ Product Deliverables ============

export async function upsertDeliverable(deliverable: {
    product_id: string;
    file_url?: string;
    redirect_url?: string;
    type: 'file' | 'redirect';
}): Promise<Deliverable> {
    // Delete existing deliverables for this product (assuming 1 per product based on previous logic, 
    // or we can append. The previous logic seemed to replace the list with a single item array)
    await supabase.from('product_deliverables').delete().eq('product_id', deliverable.product_id);

    const { data, error } = await supabase
        .from('product_deliverables')
        .insert({
            product_id: deliverable.product_id,
            file_url: deliverable.file_url,
            redirect_url: deliverable.redirect_url,
            type: deliverable.type
        })
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
}

// ============ Order Bumps ============

export async function getOrderBumps(): Promise<OrderBump[]> {
    const { data, error } = await supabase
        .from('order_bumps')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return [];
    return data;
}

export async function getOrderBump(id: string): Promise<OrderBump | null> {
    const { data, error } = await supabase
        .from('order_bumps')
        .select('*')
        .eq('id', id)
        .single();

    if (error) return null;
    return data;
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
}): Promise<OrderBump> {
    const { data, error } = await supabase
        .from('order_bumps')
        .insert(bump)
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
}

export async function updateOrderBump(id: string, updates: Partial<OrderBump>): Promise<OrderBump> {
    const { data, error } = await supabase
        .from('order_bumps')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
}

export async function deleteOrderBump(id: string): Promise<void> {
    const { error } = await supabase.from('order_bumps').delete().eq('id', id);
    if (error) throw new Error(error.message);
}

export async function linkOrderBumpToProduct(productId: string, orderBumpId: string): Promise<void> {
    const { error } = await supabase
        .from('product_order_bumps')
        .insert({ product_id: productId, order_bump_id: orderBumpId });

    // Ignore error if already exists (unique constraint)
    if (error && error.code !== '23505') {
        throw new Error(error.message);
    }
}

export async function unlinkOrderBumpFromProduct(productId: string, orderBumpId: string): Promise<void> {
    const { error } = await supabase
        .from('product_order_bumps')
        .delete()
        .match({ product_id: productId, order_bump_id: orderBumpId });

    if (error) throw new Error(error.message);
}

// ============ Orders ============

export async function getOrders(filters?: {
    status?: string;
    productId?: string;
    startDate?: string;
    endDate?: string;
}): Promise<Order[]> {
    let query = supabase
        .from('orders')
        .select(`
            *,
            product:products(*),
            plan:product_plans(*),
            order_bump:order_bumps(*)
        `)
        .order('created_at', { ascending: false });

    if (filters?.status) {
        query = query.eq('status', filters.status);
    }
    if (filters?.productId) {
        query = query.eq('product_id', filters.productId);
    }
    if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate);
    }
    if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate);
    }

    const { data, error } = await query;
    if (error) {
        console.error('Error fetching orders:', error);
        return [];
    }
    return data;
}

export async function getOrder(id: string): Promise<Order | null> {
    const { data, error } = await supabase
        .from('orders')
        .select(`
            *,
            product:products(*),
            plan:product_plans(*),
            order_bump:order_bumps(*)
        `)
        .eq('id', id)
        .single();

    if (error) return null;
    return data;
}

export async function getOrderByCorrelationId(correlationId: string): Promise<Order | null> {
    const { data, error } = await supabase
        .from('orders')
        .select(`
            *,
            product:products(*),
            plan:product_plans(*),
            order_bump:order_bumps(*)
        `)
        .eq('correlation_id', correlationId)
        .single();

    if (error) return null;
    return data;
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
}): Promise<Order> {
    const { data, error } = await supabase
        .from('orders')
        .insert({
            ...order,
            status: 'PENDING'
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating order:', error);
        throw new Error(error.message);
    }
    return data;
}

export async function updateOrderStatus(correlationId: string, status: string, paidAt?: string): Promise<Order> {
    const updates: any = { status };
    if (paidAt) updates.paid_at = paidAt;

    const { data, error } = await supabase
        .from('orders')
        .update(updates)
        .eq('correlation_id', correlationId)
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
}

// ============ Facebook Pixels ============

export async function getPixels(): Promise<Pixel[]> {
    const { data, error } = await supabase
        .from('facebook_pixels')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    if (error) return [];
    return data;
}

export async function createPixel(pixel: {
    pixel_id: string;
    name?: string;
    events?: string[];
}): Promise<Pixel> {
    const { data, error } = await supabase
        .from('facebook_pixels')
        .insert(pixel)
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
}

export async function updatePixel(id: string, updates: Partial<Pixel>): Promise<Pixel> {
    const { data, error } = await supabase
        .from('facebook_pixels')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
}

export async function deletePixel(id: string): Promise<void> {
    const { error } = await supabase.from('facebook_pixels').delete().eq('id', id);
    if (error) throw new Error(error.message);
}

// ============ Checkout Settings ============

export async function getCheckoutSettings(): Promise<CheckoutSettings> {
    const { data, error } = await supabase
        .from('checkout_settings')
        .select('*')
        .single();

    if (error || !data) {
        // Return defaults if not found (or insert default if preferred, but let's just return default)
        return {
            id: 'default',
            timer_enabled: true,
            timer_text: 'Oferta por tempo limitado',
            timer_duration: 600,
            primary_color: '#059669',
            button_text: 'FINALIZAR COMPRA',
            logo_url: 'https://xyzgvsuttwrvbyyxdppq.supabase.co/storage/v1/object/public/logos/logo%20sellpay.png',
            cover_image_url: null,
            footer_text: '© 2026 SellPay. Todos os direitos reservados.',
            cpf_enabled: false,
            order_bump_title: 'Aproveite essa oferta especial!',
            order_bump_button_text: 'Adicionar oferta',
            updated_at: new Date().toISOString(),
        };
    }
    return data;
}

export async function updateCheckoutSettings(updates: Partial<CheckoutSettings>): Promise<CheckoutSettings> {
    // Check if settings exist
    const { data: existing } = await supabase.from('checkout_settings').select('id').single();

    if (existing) {
        const { data, error } = await supabase
            .from('checkout_settings')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', existing.id)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    } else {
        const { data, error } = await supabase
            .from('checkout_settings')
            .insert(updates)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }
}

// ============ Dashboard Stats ============

export async function getDashboardStats(startDate?: string, endDate?: string) {
    let query = supabase.from('orders').select('amount, status, created_at');

    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);

    const { data: orders, error } = await query;

    if (error) {
        return {
            totalOrders: 0,
            approvedOrders: 0,
            pendingOrders: 0,
            totalRevenue: 0,
            conversionRate: 0,
        };
    }

    const totalOrders = orders.length;
    const approvedOrders = orders.filter(o => o.status === 'APPROVED').length;
    const pendingOrders = orders.filter(o => o.status === 'PENDING').length;
    const totalRevenue = orders
        .filter(o => o.status === 'APPROVED')
        .reduce((acc, o) => acc + o.amount, 0);

    const conversionRate = totalOrders > 0 ? (approvedOrders / totalOrders) * 100 : 0;

    return {
        totalOrders,
        approvedOrders,
        pendingOrders,
        totalRevenue,
        conversionRate
    };
}

// ============ File Upload ============

export async function uploadFile(bucket: string, _path: string, file: File): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

    if (error) {
        throw new Error(error.message);
    }

    const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

    return data.publicUrl;
}
