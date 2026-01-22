'use client'

import React, { useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import styles from './confirmation.module.css'

function ConfirmationContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const orderId = searchParams.get('orderId')

    useEffect(() => {
        // Optional: Confetti effect or analytics tracking here
    }, [])

    return (
        <div style={{ minHeight: '80vh', background: '#f5f7fa', padding: '1px' }}>
            <div className={styles.pageContainer}>
                <div className={styles.successIcon}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </div>

                <h1 className={styles.title}>Order Placed Successfully!</h1>

                <p className={styles.message}>
                    Thank you for your purchase. We have received your order and are getting it ready for delivery.
                    You will receive an order confirmation email shortly.
                </p>

                {orderId && (
                    <div className={styles.orderId}>
                        Order ID: <strong>#{orderId}</strong>
                    </div>
                )}

                <div className={styles.actions}>
                    <button
                        className={styles.secondaryBtn}
                        onClick={() => router.push('/orders')}
                    >
                        View My Orders
                    </button>
                    <Link href="/products" className={styles.primaryBtn}>
                        Continue Shopping
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default function OrderConfirmationPage() {
    return (
        <Suspense fallback={<div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>}>
            <ConfirmationContent />
        </Suspense>
    )
}
