import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

type NotificationType = 'new_order' | 'approved';

interface SaleNotification {
    type: NotificationType;
    customerName: string;
    productName: string;
    amount: number;
}

// Cash register sound using Web Audio API
function playCashRegisterSound() {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

        // Coin drop / cash register effect
        const now = ctx.currentTime;

        // --- Part 1: "Cha-ching" metallic hit ---
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'square';
        osc1.frequency.setValueAtTime(1800, now);
        osc1.frequency.exponentialRampToValueAtTime(800, now + 0.08);
        gain1.gain.setValueAtTime(0.3, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.15);

        // --- Part 2: Higher bell ring ---
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(3200, now + 0.06);
        osc2.frequency.exponentialRampToValueAtTime(2400, now + 0.25);
        gain2.gain.setValueAtTime(0, now);
        gain2.gain.linearRampToValueAtTime(0.25, now + 0.07);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.06);
        osc2.stop(now + 0.4);

        // --- Part 3: Coin jingle ---
        const osc3 = ctx.createOscillator();
        const gain3 = ctx.createGain();
        osc3.type = 'triangle';
        osc3.frequency.setValueAtTime(4000, now + 0.12);
        osc3.frequency.exponentialRampToValueAtTime(2800, now + 0.35);
        gain3.gain.setValueAtTime(0, now);
        gain3.gain.linearRampToValueAtTime(0.15, now + 0.13);
        gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc3.connect(gain3);
        gain3.connect(ctx.destination);
        osc3.start(now + 0.12);
        osc3.stop(now + 0.5);

        // Cleanup
        setTimeout(() => ctx.close(), 1000);
    } catch (e) {
        console.warn('Audio not supported:', e);
    }
}


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
