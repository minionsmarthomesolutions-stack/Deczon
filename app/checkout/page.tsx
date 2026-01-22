'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { auth, db } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore'
import styles from './checkout.module.css'

interface CartItem {
    name: string
    price: number | string
    imageUrl?: string
    quantity: number
    type?: string
}

interface Address {
    id?: string
    doorNo?: string
    street?: string
    area?: string
    city: string
    state: string
    pincode: string
    type?: string
    isDefault?: boolean
}

function CheckoutContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const source = searchParams.get('source') // 'cart' or 'buyNow'

    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    // Data State
    const [cartItems, setCartItems] = useState<CartItem[]>([])
    const [savedAddresses, setSavedAddresses] = useState<Address[]>([])

    // Form State
    const [contactInfo, setContactInfo] = useState({
        name: '',
        email: '',
        phone: ''
    })

    const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
    const [showAddressForm, setShowAddressForm] = useState(false)
    const [newAddress, setNewAddress] = useState<Address>({
        doorNo: '', street: '', area: '', city: '', state: '', pincode: '', type: 'home'
    })

    const [isPlacingOrder, setIsPlacingOrder] = useState(false)

    // Load Cart or Buy Now Item
    useEffect(() => {
        if (source === 'buyNow') {
            const buyNowData = localStorage.getItem('buyNowItem')
            if (buyNowData) {
                setCartItems(JSON.parse(buyNowData))
            }
        } else {
            const cartData = localStorage.getItem('cart')
            if (cartData) {
                setCartItems(JSON.parse(cartData))
            }
        }
    }, [source])

    // Auth & User Data
    useEffect(() => {
        if (!auth) return
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser)
                const phone = currentUser.phoneNumber?.replace('+91', '') || ''

                // Pre-fill contact info
                setContactInfo({
                    name: currentUser.displayName || '',
                    email: currentUser.email || '',
                    phone: currentUser.phoneNumber || ''
                })

                if (phone && db) {
                    try {
                        // 1. Get Profile extension if exists
                        const userDoc = await getDoc(doc(db, 'users', phone))
                        if (userDoc.exists()) {
                            const data = userDoc.data()
                            setContactInfo(prev => ({
                                ...prev,
                                name: data.name || prev.name,
                                email: data.email || prev.email
                            }))
                        }

                        // 2. Get Addresses
                        const addrRef = collection(db, 'users', phone, 'addresses')
                        const snapshot = await getDocs(addrRef)
                        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Address))
                        setSavedAddresses(list)

                        // Select default if exists
                        const defaultAddr = list.find(a => a.isDefault)
                        if (defaultAddr) setSelectedAddressId(defaultAddr.id || null)
                        else if (list.length > 0) setSelectedAddressId(list[0].id || null)

                    } catch (e) {
                        console.error("Error fetching user details", e)
                    }
                }
            } else {
                // Not logged in -> Redirect check
                // We'll redirect to login, preserving return URL
                // router.push(`/login?redirect=${encodeURIComponent('/checkout')}`)
                // For now, simple redirect
                if (typeof window !== 'undefined') {
                    localStorage.setItem('redirectAfterLogin', '/checkout');
                    router.push('/login');
                }
            }
            setLoading(false)
        })
        return () => unsubscribe()
    }, [router])

    // Load Razorpay Script
    useEffect(() => {
        const script = document.createElement('script')
        script.src = 'https://checkout.razorpay.com/v1/checkout.js'
        script.async = true
        document.body.appendChild(script)
        return () => {
            if (document.body.contains(script)) {
                document.body.removeChild(script)
            }
        }
    }, [])

    // Totals Calculation
    const getPrice = (item: CartItem) => {
        if (typeof item.price === 'number') return item.price
        return parseFloat((item.price as string).replace(/[₹,]/g, '')) || 0
    }

    const subtotal = cartItems.reduce((sum, item) => sum + (getPrice(item) * (item.quantity || 1)), 0)
    const deliveryCharge = 0 // Free
    const total = subtotal + deliveryCharge

    // Handlers
    const handleAddressSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user || !db) return

        try {
            const phone = user.phoneNumber?.replace('+91', '')
            if (phone) {
                const docRef = await addDoc(collection(db, 'users', phone, 'addresses'), newAddress)
                const savedAddr = { ...newAddress, id: docRef.id }
                setSavedAddresses(prev => [...prev, savedAddr])
                setSelectedAddressId(docRef.id)
                setShowAddressForm(false)
                // Clear form
                setNewAddress({ doorNo: '', street: '', area: '', city: '', state: '', pincode: '', type: 'home' })
            }
        } catch (e) {
            console.error("Failed to save address", e)
            alert("Failed to save address details.")
        }
    }

    const saveOrder = async (paymentDetails: any) => {
        if (!user || !selectedAddressId || !db) return

        try {
            const phone = user.phoneNumber?.replace('+91', '')
            const address = savedAddresses.find(a => a.id === selectedAddressId)

            const orderData = {
                items: cartItems,
                userDetails: contactInfo,
                userId: user.uid,
                userPhone: phone,
                shippingAddress: address,
                subtotal,
                deliveryCharge,
                total,
                status: 'paid', // Mark as paid since this is called after Razorpay success
                paymentMethod: 'ONLINE',
                paymentDetails, // Save all Razorpay details
                razorpayOrderId: paymentDetails.razorpay_order_id,
                razorpayPaymentId: paymentDetails.razorpay_payment_id,
                createdAt: serverTimestamp()
            }

            // Save Order
            const orderRef = await addDoc(collection(db, 'orders'), orderData)

            // Clear Cart or Buy Now Data
            if (source === 'buyNow') {
                localStorage.removeItem('buyNowItem')
            } else {
                localStorage.removeItem('cart')
                window.dispatchEvent(new Event('cartUpdated'))
            }

            router.push(`/order-confirmation?orderId=${orderRef.id}`)
        } catch (e) {
            console.error("Error saving order", e)
            alert("Payment successful but failed to save order. Please contact support.")
        } finally {
            setIsPlacingOrder(false)
        }
    }

    const handlePlaceOrder = async () => {
        if (!user || !selectedAddressId || !db) return

        setIsPlacingOrder(true)

        try {
            // 1. Create Order on Server
            const response = await fetch('/api/razorpay', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: total })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create order');
            }

            const order = await response.json();

            // 2. Open Razorpay
            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_YOUR_KEY_HERE', // Fallback for dev/demo if env missing
                amount: order.amount,
                currency: order.currency,
                name: "Deczon",
                description: "Purchase Payment",
                order_id: order.id,
                handler: async function (response: any) {
                    await saveOrder(response);
                },
                prefill: {
                    name: contactInfo.name,
                    email: contactInfo.email,
                    contact: contactInfo.phone,
                },
                theme: {
                    color: "#3399cc",
                },
            };

            const paymentObject = new (window as any).Razorpay(options);
            paymentObject.on('payment.failed', function (response: any) {
                alert("Payment Failed: " + response.error.description);
                setIsPlacingOrder(false);
            });
            paymentObject.open();

        } catch (e: any) {
            console.error("Payment initialization error", e)
            alert("Failed to initialize payment: " + (e.message || "Unknown error"));
            setIsPlacingOrder(false);
        }
    }

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>Loading Checkout...</div>

    return (
        <div className={styles.checkoutPage}>
            <div className={styles.container}>
                <h1 className={styles.sectionTitle}>{source === 'buyNow' ? 'Buy Now Checkout' : 'Checkout'}</h1>

                {cartItems.length === 0 ? (
                    <div className={styles.section} style={{ textAlign: 'center', padding: '3rem' }}>
                        <h2>{source === 'buyNow' ? 'Item not found' : 'Your cart is empty'}</h2>
                        <Link href="/products" style={{ color: 'var(--primary-color)', textDecoration: 'underline', marginTop: '1rem', display: 'inline-block' }}>
                            Continue Shopping
                        </Link>
                    </div>
                ) : (
                    <div className={styles.checkoutLayout}>
                        {/* LEFT COLUMN */}
                        <div>
                            {/* 1. Contact Info */}
                            <section className={styles.section}>
                                <div className={styles.sectionTitle}>
                                    <span>1. Contact Information</span>
                                </div>
                                <div className={styles.formGrid}>
                                    <div className={styles.inputGroup}>
                                        <label className={styles.label}>Name</label>
                                        <input
                                            className={styles.input}
                                            value={contactInfo.name}
                                            onChange={e => setContactInfo({ ...contactInfo, name: e.target.value })}
                                            placeholder="Name"
                                        />
                                    </div>
                                    <div className={styles.inputGroup}>
                                        <label className={styles.label}>Phone Number</label>
                                        <input
                                            className={styles.input}
                                            value={contactInfo.phone}
                                            placeholder="Phone"
                                            disabled // Usually phone is fixed from Auth
                                        />
                                    </div>
                                    <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                                        <label className={styles.label}>Email Address</label>
                                        <input
                                            className={styles.input}
                                            value={contactInfo.email}
                                            onChange={e => setContactInfo({ ...contactInfo, email: e.target.value })}
                                            placeholder="Email"
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* 2. Delivery Address */}
                            <section className={styles.section}>
                                <div className={styles.sectionTitle}>
                                    <span>2. Delivery Address</span>
                                </div>

                                <div className={styles.addressList}>
                                    {savedAddresses.map(addr => (
                                        <div
                                            key={addr.id}
                                            className={`${styles.addressCard} ${selectedAddressId === addr.id ? styles.selected : ''}`}
                                            onClick={() => setSelectedAddressId(addr.id || null)}
                                        >
                                            <div className={styles.radioCircle}></div>
                                            <div className={styles.addressDetails}>
                                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                                    {addr.type && <span className={styles.addressType}>{addr.type}</span>}
                                                    <span style={{ fontWeight: 600 }}>{contactInfo.name}</span>
                                                </div>
                                                <div className={styles.addressText}>
                                                    {[addr.doorNo, addr.street, addr.area, addr.city].filter(Boolean).join(', ')}<br />
                                                    {addr.state} - {addr.pincode}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {!showAddressForm ? (
                                    <button className={styles.addNewBtn} onClick={() => setShowAddressForm(true)}>
                                        + Add New Address
                                    </button>
                                ) : (
                                    <div style={{ marginTop: '1.5rem', border: '1px solid #eee', padding: '1rem', borderRadius: '8px' }}>
                                        <h4 style={{ marginBottom: '1rem' }}>New Address Details</h4>
                                        <form onSubmit={handleAddressSave}>
                                            <div className={styles.formGrid}>
                                                <div className={styles.inputGroup}>
                                                    <label className={styles.label}>Door No / Flat</label>
                                                    <input
                                                        className={styles.input} required
                                                        value={newAddress.doorNo}
                                                        onChange={e => setNewAddress({ ...newAddress, doorNo: e.target.value })}
                                                    />
                                                </div>
                                                <div className={styles.inputGroup}>
                                                    <label className={styles.label}>Street / Road</label>
                                                    <input
                                                        className={styles.input} required
                                                        value={newAddress.street}
                                                        onChange={e => setNewAddress({ ...newAddress, street: e.target.value })}
                                                    />
                                                </div>
                                                <div className={styles.inputGroup}>
                                                    <label className={styles.label}>Area / Locality</label>
                                                    <input
                                                        className={styles.input}
                                                        value={newAddress.area}
                                                        onChange={e => setNewAddress({ ...newAddress, area: e.target.value })}
                                                    />
                                                </div>
                                                <div className={styles.inputGroup}>
                                                    <label className={styles.label}>City</label>
                                                    <input
                                                        className={styles.input} required
                                                        value={newAddress.city}
                                                        onChange={e => setNewAddress({ ...newAddress, city: e.target.value })}
                                                    />
                                                </div>
                                                <div className={styles.inputGroup}>
                                                    <label className={styles.label}>State</label>
                                                    <input
                                                        className={styles.input} required
                                                        value={newAddress.state}
                                                        onChange={e => setNewAddress({ ...newAddress, state: e.target.value })}
                                                    />
                                                </div>
                                                <div className={styles.inputGroup}>
                                                    <label className={styles.label}>Pincode</label>
                                                    <input
                                                        className={styles.input} required
                                                        value={newAddress.pincode}
                                                        onChange={e => setNewAddress({ ...newAddress, pincode: e.target.value })}
                                                    />
                                                </div>
                                                <div className={styles.fullWidth}>
                                                    <label className={styles.label}>Address Type</label>
                                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                                        {['home', 'work', 'other'].map(type => (
                                                            <label key={type} style={{ cursor: 'pointer', display: 'flex', gap: '0.5rem' }}>
                                                                <input
                                                                    type="radio"
                                                                    name="newAddrType"
                                                                    checked={newAddress.type === type}
                                                                    onChange={() => setNewAddress({ ...newAddress, type: type as any })}
                                                                /> {type.charAt(0).toUpperCase() + type.slice(1)}
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                                <button type="submit" className={styles.confirmBtn} style={{ marginTop: 0, width: 'auto', padding: '0.75rem 1.5rem' }}>Save & Deliver Here</button>
                                                <button type="button" onClick={() => setShowAddressForm(false)} style={{ background: 'none', border: '1px solid #ddd', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                                            </div>
                                        </form>
                                    </div>
                                )}
                            </section>

                            {/* 3. Payment Method */}
                            <section className={styles.section}>
                                <div className={styles.sectionTitle}>
                                    <span>3. Payment Method</span>
                                </div>
                                <div style={{ border: '1px solid var(--primary-color)', padding: '1rem', borderRadius: '8px', background: '#fffdf5', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div className={styles.radioCircle} style={{ borderColor: 'var(--primary-color)' }}>
                                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '10px', height: '10px', background: 'var(--primary-color)', borderRadius: '50%' }}></div>
                                    </div>
                                    <div>
                                        <strong>Online Payment (Razorpay)</strong>
                                        <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.25rem' }}>Secure payment via UPI, Credit/Debit Card, Netbanking</p>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* RIGHT COLUMN */}
                        <div className={styles.orderSummary}>
                            <div className={styles.section}>
                                <h3 style={{ marginBottom: '1rem' }}>Order Summary</h3>
                                <div>
                                    {cartItems.map((item, idx) => (
                                        <div key={idx} className={styles.summaryItem}>
                                            <img src={item.imageUrl || '/placeholder.svg'} className={styles.itemImage} alt={item.name} />
                                            <div className={styles.itemInfo}>
                                                <div className={styles.itemName}>{item.name}</div>
                                                <div className={styles.itemMeta}>Qty: {item.quantity || 1}</div>
                                                <div className={styles.itemInfo}>₹{getPrice(item).toLocaleString('en-IN')}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div style={{ marginTop: '1.5rem' }}>
                                    <div className={styles.priceRow}>
                                        <span>Subtotal</span>
                                        <span>₹{subtotal.toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className={styles.priceRow}>
                                        <span>Delivery Charges</span>
                                        <span style={{ color: 'var(--success-color)' }}>FREE</span>
                                    </div>
                                    <div className={styles.totalRow}>
                                        <span>Total Amount</span>
                                        <span>₹{total.toLocaleString('en-IN')}</span>
                                    </div>
                                </div>

                                <button
                                    className={styles.confirmBtn}
                                    disabled={isPlacingOrder || !selectedAddressId}
                                    onClick={handlePlaceOrder}
                                >
                                    {isPlacingOrder ? 'Processing...' : 'Pay Now'}
                                </button>
                                {!selectedAddressId && <p style={{ color: 'red', fontSize: '0.8rem', marginTop: '0.5rem', textAlign: 'center' }}>Please select a delivery address</p>}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default function CheckoutPage() {
    return (
        <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>Loading...</div>}>
            <CheckoutContent />
        </Suspense>
    )
}
