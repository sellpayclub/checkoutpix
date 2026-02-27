import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

type NotificationType = 'new_order' | 'approved';

interface SaleNotification {
    type: NotificationType;
    customerName: string;
    productName: string;
    amount: number;
}

// Cash register sound using a high-quality MP3
const playCashRegisterSound = () => {
    try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2012/2012-preview.mp3');
        audio.volume = 0.5;
        audio.play().catch(err => console.warn('[Audio] Autoplay blocked:', err));
    } catch (error) {
        console.error('[Audio] Error playing sound:', error);
    }
};


export function useSalesNotifications(onNotification: (notification: SaleNotification) => void) {
    const callbackRef = useRef(onNotification);
    callbackRef.current = onNotification;

    useEffect(() => {
        const channel = supabase
            .channel('sales-notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'orders',
                },
                async (payload) => {
                    const order = payload.new as any;
                    // Fetch the product name
                    let productName = 'Produto';
                    try {
                        const { data } = await supabase
                            .from('products')
                            .select('name')
                            .eq('id', order.product_id)
                            .single();
                        if (data) productName = data.name;
                    } catch { }

                    playCashRegisterSound();
                    callbackRef.current({
                        type: 'new_order',
                        customerName: order.customer_name || 'Cliente',
                        productName,
                        amount: order.amount || 0,
                    });
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'orders',
                    filter: 'status=eq.APPROVED',
                },
                async (payload) => {
                    const order = payload.new as any;
                    const oldOrder = payload.old as any;

                    // Only fire if status changed TO approved
                    if (oldOrder.status === 'APPROVED') return;

                    let productName = 'Produto';
                    try {
                        const { data } = await supabase
                            .from('products')
                            .select('name')
                            .eq('id', order.product_id)
                            .single();
                        if (data) productName = data.name;
                    } catch { }

                    playCashRegisterSound();
                    callbackRef.current({
                        type: 'approved',
                        customerName: order.customer_name || 'Cliente',
                        productName,
                        amount: order.amount || 0,
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);
}
