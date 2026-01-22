'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { auth, db } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore'
import styles from './orders.module.css'

interface OrderItem {
    name: string
    price: number | string
    quantity: number
    imageUrl?: string
    selectedColor?: string
    selectedModule?: string
}

interface Order {
    id: string
    createdAt: any
    total: number
    status: string
    items: OrderItem[]
    paymentMethod?: string
    razorpayOrderId?: string
}

export default function OrdersPage() {
    const router = useRouter()
    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [orders, setOrders] = useState<Order[]>([])
    const [expandedTracking, setExpandedTracking] = useState<string | null>(null)

    useEffect(() => {
        if (!auth) return

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser)
                await fetchOrders(currentUser.uid)
            } else {
                if (typeof window !== 'undefined') {
                    localStorage.setItem('redirectAfterLogin', '/orders')
                    router.push('/login')
                }
            }
            setLoading(false)
        })

        return () => unsubscribe()
    }, [router])

    const fetchOrders = async (userId: string) => {
        if (!db) return
        try {
            const ordersRef = collection(db, 'orders')
            let q = query(ordersRef, where('userId', '==', userId), orderBy('createdAt', 'desc'))

            try {
                const snapshot = await getDocs(q)
                const ordersList = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Order[]
                setOrders(ordersList)
            } catch (err: any) {
                if (err.code === 'failed-precondition') {
                    const simpleQ = query(ordersRef, where('userId', '==', userId))
                    const snapshot = await getDocs(simpleQ)
                    const ordersList = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    })) as Order[]

                    ordersList.sort((a, b) => {
                        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0
                        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0
                        return timeB - timeA
                    })
                    setOrders(ordersList)
                } else {
                    throw err
                }
            }
        } catch (error) {
            console.error("Error fetching orders:", error)
        }
    }

    const formatDate = (timestamp: any) => {
        if (!timestamp) return ''
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
        return new Intl.DateTimeFormat('en-IN', {
            day: 'numeric', month: 'long', year: 'numeric'
        }).format(date)
    }

    const getPrice = (price: string | number) => {
        if (typeof price === 'number') return price
        return parseFloat(price.replace(/[₹,]/g, '')) || 0
    }

    const getStepStatus = (orderStatus: string, step: string) => {
        const statuses = ['paid', 'processing', 'shipped', 'delivered']
        const currentIdx = statuses.indexOf(orderStatus.toLowerCase())
        const stepIdx = statuses.indexOf(step.toLowerCase())

        if (currentIdx === -1) {
            // Handle 'pending' or other unknown statuses as being at step 0 or not started
            if (orderStatus.toLowerCase() === 'pending' && step === 'paid') return 'active'
            return 'pending'
        }

        if (stepIdx < currentIdx) return 'completed'
        if (stepIdx === currentIdx) return 'active'
        return 'pending'
    }

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>Loading orders...</div>

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Your Orders</h1>

            {orders.length === 0 ? (
                <div className={styles.emptyState}>
                    <h2>No orders yet</h2>
                    <p style={{ color: '#666', margin: '1rem 0' }}>Looks like you haven't bought anything yet.</p>
                    <Link href="/products" className={styles.shopBtn}>
                        Start Shopping
                    </Link>
                </div>
            ) : (
                <div className={styles.ordersList}>
                    {orders.map(order => (
                        <div key={order.id} className={styles.orderCard}>
                            <div className={styles.orderHeader}>
                                <div className={styles.orderMeta}>
                                    <div className={styles.metaGroup}>
                                        <span className={styles.metaLabel}>Order Placed</span>
                                        <span className={styles.metaValue}>{formatDate(order.createdAt)}</span>
                                    </div>
                                    <div className={styles.metaGroup}>
                                        <span className={styles.metaLabel}>Order ID</span>
                                        <span className={styles.metaValue}>#{order.id.slice(0, 8).toUpperCase()}</span>
                                    </div>
                                    <div className={styles.metaGroup}>
                                        <span className={styles.metaLabel}>Total</span>
                                        <span className={styles.metaValue}>₹{order.total.toLocaleString('en-IN')}</span>
                                    </div>
                                </div>
                                <div className={`${styles.statusBadge} ${styles[`status_${order.status.toLowerCase()}`] || ''}`}>
                                    {order.status || 'Pending'}
                                </div>
                            </div>
                            <div className={styles.orderBody}>
                                {order.items.map((item, idx) => (
                                    <div key={idx} className={styles.item}>
                                        <img
                                            src={item.imageUrl || '/placeholder.svg'}
                                            alt={item.name}
                                            className={styles.itemImage}
                                            onError={(e) => (e.target as HTMLImageElement).src = '/placeholder.svg'}
                                        />
                                        <div className={styles.itemDetails}>
                                            <div className={styles.itemName}>{item.name}</div>
                                            {(item.selectedColor || item.selectedModule) && (
                                                <div className={styles.itemVariant}>
                                                    {item.selectedColor && <span>Color: {item.selectedColor}</span>}
                                                    {item.selectedColor && item.selectedModule && <span> | </span>}
                                                    {item.selectedModule && <span>Type: {item.selectedModule}</span>}
                                                </div>
                                            )}
                                            <div className={styles.itemPrice}>
                                                Qty: {item.quantity} × ₹{getPrice(item.price).toLocaleString('en-IN')}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {expandedTracking === order.id && (
                                    <div className={styles.trackingContainer}>
                                        <div className={styles.trackingTitle}>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
                                            </svg>
                                            Track Order Status
                                        </div>
                                        <div className={styles.stepper}>
                                            {['Paid', 'Processing', 'Shipped', 'Delivered'].map((step, idx) => {
                                                const status = getStepStatus(order.status, step)
                                                return (
                                                    <div key={step} className={`${styles.step} ${styles[status]}`}>
                                                        <div className={styles.stepCircle}>
                                                            {status === 'completed' ? '✓' : idx + 1}
                                                        </div>
                                                        <span className={styles.stepLabel}>{step}</span>
                                                        <div className={styles.progressLine}></div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className={styles.orderFooter}>
                                <button
                                    className={`${styles.trackBtn} ${expandedTracking === order.id ? styles.active : ''}`}
                                    onClick={() => setExpandedTracking(expandedTracking === order.id ? null : order.id)}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <polyline points="12 6 12 12 16 14"></polyline>
                                    </svg>
                                    {expandedTracking === order.id ? 'Hide Tracking' : 'Track Order'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

