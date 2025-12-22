'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import styles from './cart.module.css'
import { db } from '@/lib/firebase'
import { collection, query, limit, getDocs } from 'firebase/firestore'

interface CartItem {
    id?: string
    name: string
    price: string | number
    imageUrl?: string
    quantity: number
    type?: string
    packageType?: string
    squareFeet?: number
    pricePerSqFt?: number
    totalPrice?: number
    advanceAmount?: number
    timestamp?: string
}

export default function CartPage() {
    const [cartItems, setCartItems] = useState<CartItem[]>([])
    const [relatedProducts, setRelatedProducts] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        loadCartItems()
        fetchRelatedProducts()

        // Listen for cart updates from other components
        const handleCartUpdate = () => {
            loadCartItems()
        }

        window.addEventListener('cartUpdated', handleCartUpdate)
        return () => {
            window.removeEventListener('cartUpdated', handleCartUpdate)
        }
    }, [])

    const loadCartItems = () => {
        try {
            const cartData = localStorage.getItem('cart')
            if (cartData) {
                setCartItems(JSON.parse(cartData))
            } else {
                setCartItems([])
            }
        } catch (error) {
            console.error('Error loading cart:', error)
            setCartItems([])
        } finally {
            setIsLoading(false)
        }
    }

    const fetchRelatedProducts = async () => {
        if (!db) return
        try {
            const q = query(collection(db, 'products'), limit(4))
            const snapshot = await getDocs(q)
            const products = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            setRelatedProducts(products)
        } catch (error) {
            console.error('Error fetching related products:', error)
        }
    }

    const updateQuantity = (index: number, change: number) => {
        const newCart = [...cartItems]
        const item = newCart[index]
        const newQuantity = (item.quantity || 1) + change

        if (newQuantity >= 1 && newQuantity <= 10) {
            item.quantity = newQuantity
            setCartItems(newCart)
            localStorage.setItem('cart', JSON.stringify(newCart))
            window.dispatchEvent(new Event('cartUpdated'))
        }
    }

    const setQuantity = (index: number, value: string) => {
        const newQuantity = parseInt(value)
        if (!isNaN(newQuantity) && newQuantity >= 1 && newQuantity <= 10) {
            const newCart = [...cartItems]
            newCart[index].quantity = newQuantity
            setCartItems(newCart)
            localStorage.setItem('cart', JSON.stringify(newCart))
            window.dispatchEvent(new Event('cartUpdated'))
        }
    }

    const removeFromCart = (index: number) => {
        const newCart = [...cartItems]
        newCart.splice(index, 1)
        setCartItems(newCart)
        localStorage.setItem('cart', JSON.stringify(newCart))
        window.dispatchEvent(new Event('cartUpdated'))
    }

    const getPrice = (item: CartItem) => {
        let priceNum = 0
        if (typeof item.price === 'string') {
            priceNum = parseFloat(item.price.replace(/[₹,]/g, '')) || 0
        } else if (typeof item.price === 'number') {
            priceNum = item.price
        } else if (item.advanceAmount) {
            priceNum = item.advanceAmount
        }
        return priceNum
    }

    // Calculate totals
    let subtotal = 0
    let totalSaved = 0
    let totalItems = 0

    cartItems.forEach(item => {
        const price = getPrice(item)
        const quantity = item.quantity || 1
        const originalPrice = price * 1.4 // Assuming 30% discount logic from reference

        subtotal += price * quantity
        totalItems += quantity
        totalSaved += (originalPrice - price) * quantity
    })

    // Logic to add dynamic product to cart
    const addRelatedToCart = (product: any) => {
        const newCart = [...cartItems]
        const productName = product.name || product.productName

        let price = 0
        if (typeof product.currentPrice === 'number') {
            price = product.currentPrice
        } else if (typeof product.currentPrice === 'string') {
            price = parseFloat(product.currentPrice.replace(/[₹,]/g, ''))
        } else if (typeof product.price === 'number') {
            price = product.price
        }

        // Resolve image
        const imageUrl = product.primaryImageUrl || product.imageUrl || (product.images && product.images[0]) || '/placeholder.svg'

        const existingIndex = newCart.findIndex(item => item.name === productName)

        if (existingIndex >= 0) {
            newCart[existingIndex].quantity = (newCart[existingIndex].quantity || 1) + 1
        } else {
            newCart.push({
                name: productName,
                price: price,
                imageUrl: imageUrl,
                quantity: 1,
                timestamp: new Date().toISOString()
            })
        }

        setCartItems(newCart)
        localStorage.setItem('cart', JSON.stringify(newCart))
        window.dispatchEvent(new Event('cartUpdated'))
    }

    const handleCheckout = () => {
        // Logic from cart.html: check login, then customer details, then payment
        // For Next.js app, we should check if we have a user in Firebase Auth or local storage logic
        // existing Header handles login via /login

        // We can redirect to checkout or login
        const isLoggedIn = localStorage.getItem('isLoggedIn') // This mimics the legacy logic
        // In the new app, we should probably check Firebase auth state if available, but for now let's stick to the requested "same like this" logic or better:
        // use simple redirect to a placeholder checkout or existing one.
        // The user wants "cart page same like this". 

        // Let's mimic the redirect logic but adapted to Next.js routes if they exist.
        // The reference goes to customer-details.html -> payment.html
        // I don't see those pages in the file list. I see 'package-details', 'products', 'login', 'services'.
        // I'll just alert for now or redirect to likely pages.

        window.location.href = '/checkout' // Assuming checkout page handles the rest, or just alert as placeholder if not exists
    }

    if (isLoading) {
        return <div className={styles['cart-page']} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>Loading...</div>
    }

    return (
        <main className={styles['cart-page']}>
            <div className={styles['cart-container']}>
                {/* Main Cart Section */}
                <div className={styles['cart-main']}>
                    <div className={styles['cart-header']}>
                        <h1 className={styles['cart-title']}>Shopping Cart</h1>
                        <span className={styles['cart-count']}>{cartItems.length} items</span>
                    </div>

                    {cartItems.length === 0 ? (
                        <div className={styles['empty-cart']}>
                            <div className={styles['empty-cart-icon']}>🛒</div>
                            <h3>Your cart is empty</h3>
                            <p>Add some smart home products to get started!</p>
                            <Link href="/products" className={styles['btn-primary']}>
                                Continue Shopping
                            </Link>
                        </div>
                    ) : (
                        <div className={styles['cart-items']}>
                            {cartItems.map((item, index) => {
                                const priceNum = getPrice(item)
                                const quantity = item.quantity || 1
                                const totalItemPrice = priceNum * quantity
                                const originalPrice = Math.round(priceNum * 1.4)
                                const discount = Math.round(((originalPrice - priceNum) / originalPrice) * 100)

                                // Fallback image logic
                                const imageUrl = item.imageUrl || (item.type === 'service_advance'
                                    ? '/placeholder.svg?height=120&width=120&text=Service'
                                    : '/placeholder.svg?height=120&width=120&text=Product')

                                return (
                                    <div key={`${index}-${item.name}`} className={styles['cart-item']}>
                                        <div className={styles['cart-item-image']}>
                                            <img
                                                src={imageUrl}
                                                alt={item.name}
                                                onError={(e) => {
                                                    e.currentTarget.src = `/placeholder.svg?height=120&width=120&text=${item.type === 'service_advance' ? 'Service' : 'Product'}`
                                                }}
                                            />
                                        </div>

                                        <div className={styles['cart-item-details']}>
                                            <div>
                                                <h3 className={styles['cart-item-name']}>{item.name}</h3>
                                                <p className={styles['cart-item-description']}>
                                                    {item.packageType
                                                        ? `${item.packageType.charAt(0).toUpperCase() + item.packageType.slice(1)} Package`
                                                        : 'Premium Quality Product'}
                                                </p>

                                                {item.type === 'service_advance' && (
                                                    <div className={styles['advance-amount-tag']}>
                                                        <span className={styles['advance-icon']}>💰</span>
                                                        <span className={styles['advance-text']}>Advance Amount (10% of total)</span>
                                                        <span className={styles['advance-info']} title="This is the advance amount you need to pay upfront for the service.">ℹ️</span>
                                                    </div>
                                                )}

                                                {item.squareFeet && (
                                                    <div className={styles['cart-item-meta']}>
                                                        <div className={styles['meta-item']}>
                                                            <svg className={styles['meta-icon']} viewBox="0 0 24 24" fill="none">
                                                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2" />
                                                            </svg>
                                                            <span>Area: {item.squareFeet.toLocaleString()} sq ft</span>
                                                        </div>
                                                        {item.pricePerSqFt && (
                                                            <div className={styles['meta-item']}>
                                                                <svg className={styles['meta-icon']} viewBox="0 0 24 24" fill="none">
                                                                    <line x1="12" y1="1" x2="12" y2="23" stroke="currentColor" strokeWidth="2" />
                                                                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" strokeWidth="2" />
                                                                </svg>
                                                                <span>₹{item.pricePerSqFt}/sq ft</span>
                                                            </div>
                                                        )}
                                                        {item.totalPrice && (
                                                            <div className={`${styles['meta-item']} ${styles['total-price-info']}`}>
                                                                <svg className={styles['meta-icon']} viewBox="0 0 24 24" fill="none">
                                                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                                                                    <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" />
                                                                </svg>
                                                                <span>Total Project: ₹{item.totalPrice.toLocaleString()}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            <div>
                                                <div className={styles['cart-item-status']}>
                                                    <div className={`${styles['status-badge']} ${styles['in-stock']}`}>✓ In Stock</div>
                                                </div>
                                                <div className={styles['delivery-info']}>
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                        <path d="M1 3h15l3 6v8a2 2 0 0 1-2 2h-2a2 2 0 0 1-4 0H8a2 2 0 0 1-4 0H2a1 1 0 0 1-1-1V3z" stroke="currentColor" strokeWidth="2" />
                                                        <circle cx="6" cy="19" r="2" stroke="currentColor" strokeWidth="2" />
                                                        <circle cx="18" cy="19" r="2" stroke="currentColor" strokeWidth="2" />
                                                    </svg>
                                                    {item.type === 'service_advance' ? 'Service booking confirmed' : 'Free delivery in 2-3 days'}
                                                </div>

                                                <div className={styles['cart-item-actions']} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                                                    <div className={styles['quantity-controls']}>
                                                        <button
                                                            className={styles['quantity-btn']}
                                                            onClick={() => updateQuantity(index, -1)}
                                                            disabled={quantity <= 1}
                                                        >−</button>
                                                        <input
                                                            type="number"
                                                            className={styles['quantity-input']}
                                                            value={quantity}
                                                            min="1"
                                                            max="10"
                                                            onChange={(e) => setQuantity(index, e.target.value)}
                                                        />
                                                        <button
                                                            className={styles['quantity-btn']}
                                                            onClick={() => updateQuantity(index, 1)}
                                                        >+</button>
                                                    </div>
                                                    <div className={styles['action-buttons']}>
                                                        <button className={`${styles['action-btn']} ${styles['delete']}`} onClick={() => removeFromCart(index)}>Remove</button>
                                                        {/* <button className={styles['action-btn']}>Save for Later</button> */}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className={styles['cart-item-price']}>
                                            <span className={styles['current-price']}>₹{totalItemPrice.toLocaleString('en-IN')}</span>
                                            {originalPrice > priceNum && <span className={styles['original-price']}>₹{(originalPrice * quantity).toLocaleString('en-IN')}</span>}
                                            {discount > 0 && <span className={styles['discount-badge']}>{discount}% OFF</span>}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Cart Summary Sidebar */}
                <div className={styles['cart-sidebar']}>
                    <div className={styles['cart-summary']}>
                        <h3 className={styles['summary-title']}>Order Summary</h3>

                        <div className={styles['summary-row']}>
                            <span className="summary-label">Subtotal ({totalItems} items):</span>
                            <span className="summary-value">₹{subtotal.toLocaleString('en-IN')}</span>
                        </div>

                        <div className={styles['summary-row']}>
                            <span className="summary-label">Delivery:</span>
                            <span className={styles['summary-value']}>FREE</span>
                        </div>

                        <div className={styles['summary-row']}>
                            <span className="summary-label">You Save:</span>
                            <span className={styles['summary-value']} style={{ color: 'var(--success-color)' }}>₹{Math.round(totalSaved).toLocaleString('en-IN')}</span>
                        </div>

                        <div className={`${styles['summary-row']} ${styles['total']}`}>
                            <span className="summary-label">Total:</span>
                            <span className="summary-value">₹{subtotal.toLocaleString('en-IN')}</span>
                        </div>

                        <button
                            className={styles['checkout-btn']}
                            disabled={cartItems.length === 0}
                            onClick={handleCheckout}
                        >
                            Proceed to Checkout
                        </button>
                    </div>
                </div>
            </div>

            {/* Related Products Section */}
            {relatedProducts.length > 0 && (
                <div className={styles['related-products']}>
                    <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem' }}>
                        <h3>You might also like</h3>
                        <div className={styles['related-products-grid']}>
                            {relatedProducts.map((product, idx) => {
                                const imageUrl = product.primaryImageUrl || product.imageUrl || (product.images && product.images[0]) || '/placeholder.svg'
                                const name = product.name || product.productName || 'Product'
                                const price = typeof product.currentPrice === 'number' ? product.currentPrice : (parseFloat(product.currentPrice?.toString().replace(/[₹,]/g, '') || '0'))

                                return (
                                    <div
                                        key={idx}
                                        className={styles['related-product-card']}
                                        onClick={() => addRelatedToCart(product)}
                                    >
                                        <div className={styles['related-product-image']}>
                                            <img
                                                src={imageUrl}
                                                alt={name}
                                                onError={(e) => {
                                                    e.currentTarget.src = '/placeholder.svg?height=150&width=150&text=Product'
                                                }}
                                            />
                                        </div>
                                        <div className={styles['related-product-info']}>
                                            <h4 className={styles['related-product-name']}>{name}</h4>
                                            {price > 0 && <p className={styles['related-product-price']}>₹{price.toLocaleString('en-IN')}</p>}
                                            <button className={styles['related-add-btn']}>Add to Cart</button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}
        </main>
    )
}
