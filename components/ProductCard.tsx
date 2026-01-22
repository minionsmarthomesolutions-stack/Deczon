'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import styles from './ProductCard.module.css'
import { useWishlist } from '@/context/WishlistContext'

interface Product {
  id: string
  slug?: string
  name: string
  imageUrl?: string
  primaryImageUrl?: string
  images?: string[]
  currentPrice?: number | string
  originalPrice?: number | string
  discountPercent?: number | string
  badge?: string
  mainCategory?: string
  category?: string
}

interface ProductCardProps {
  product: Product
  onQuickView?: (product: Product) => void
}

export default function ProductCard({ product, onQuickView }: ProductCardProps) {
  const [imageError, setImageError] = useState(false)
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist()

  // Get primary image URL
  let primaryImageUrl = product.primaryImageUrl
    || (product.images && product.images[0])
    || product.imageUrl
    || '/placeholder.svg?height=200&width=200&text=Product'

  // Ensure Firebase Storage URLs have proper format
  if (primaryImageUrl && primaryImageUrl.includes('firebasestorage.googleapis.com') && !primaryImageUrl.includes('?')) {
    primaryImageUrl = `${primaryImageUrl}?alt=media`
  }

  // Calculate discount percentage
  const currentPriceNum = typeof product.currentPrice === 'string'
    ? parseFloat(product.currentPrice.replace(/[₹,]/g, ''))
    : (product.currentPrice as number) || 0
  const originalPriceNum = typeof product.originalPrice === 'string'
    ? parseFloat(product.originalPrice.replace(/[₹,]/g, ''))
    : (product.originalPrice as number) || 0

  const discountPercent = originalPriceNum > 0 && currentPriceNum > 0
    ? Math.round((1 - currentPriceNum / originalPriceNum) * 100)
    : (typeof product.discountPercent === 'string'
      ? parseFloat(product.discountPercent)
      : (product.discountPercent as number)) || 0

  const isWishlisted = isInWishlist(product.id)

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (isWishlisted) {
      removeFromWishlist(product.id)
    } else {
      addToWishlist({
        id: product.id,
        name: product.name,
        slug: product.slug,
        imageUrl: primaryImageUrl,
        primaryImageUrl: primaryImageUrl,
        currentPrice: currentPriceNum,
        originalPrice: originalPriceNum,
        discountPercent: discountPercent,
        category: product.category || product.mainCategory,
      })
    }
  }

  // Generate badge text
  const badgeText = product.badge || (discountPercent >= 30 ? 'HOT DEAL' : discountPercent > 0 ? 'BEST SELLER' : null)

  // Format price
  const formatPrice = (price: number | string | undefined): string => {
    if (!price) return ''
    if (typeof price === 'string') return price
    return `₹${price.toLocaleString('en-IN')}`
  }

  const handleImageError = () => {
    setImageError(true)
  }

  const handleAddToCart = (e: React.MouseEvent) => {
    // ... existing handleAddToCart code ...
    e.preventDefault() // Prevent navigation if clicked within Link
    e.stopPropagation()

    // Get cart from localStorage
    const cart = JSON.parse(localStorage.getItem('cart') || '[]')

    // Check if product already in cart
    const existingItem = cart.find((item: any) => item.id === product.id)

    if (existingItem) {
      existingItem.quantity = (existingItem.quantity || 1) + 1
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: currentPriceNum,
        imageUrl: primaryImageUrl,
        quantity: 1
      })
    }

    // Save to localStorage
    localStorage.setItem('cart', JSON.stringify(cart))

    // Update cart count in header (trigger custom event)
    window.dispatchEvent(new Event('cartUpdated'))

    // Visual feedback
    const button = e.currentTarget
    const originalText = button.textContent
    button.textContent = 'ADDED'
    button.classList.add(styles.loading)

    setTimeout(() => {
      button.textContent = originalText
      button.classList.remove(styles.loading)
    }, 1500)
  }

  // Product URL logic
  const productUrl = `/products/${product.slug || product.id}`

  return (
    <div className={styles.productCard}>
      <Link href={productUrl} className={styles.linkWrapper} aria-label={product.name} target="_blank" rel="noopener noreferrer">
        {badgeText && (
          <div className={styles.productBadge}>{badgeText}</div>
        )}

        {discountPercent > 0 && (
          <div className={styles.discountTag}>-{discountPercent}%</div>
        )}

        <div className={styles.productImage}>
          {imageError ? (
            <div className={styles.placeholderImage}>
              <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
          ) : (
            <img
              src={primaryImageUrl}
              alt={product.name}
              className={styles.image}
              onError={handleImageError}
              loading="lazy"
              decoding="async"
            />
          )}

          {/* Action Buttons - Hidden by default, shown on hover */}
          <div className={styles.productActionButtons}>
            <button
              className={`${styles.wishlistBtn} ${isWishlisted ? styles.active : ''}`}
              onClick={handleWishlistToggle}
              title={isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
              aria-label={isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
              style={{ color: isWishlisted ? '#ef4444' : 'inherit' }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill={isWishlisted ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>

            {onQuickView && (
              <button
                className={styles.quickViewBtn}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onQuickView(product)
                }}
                title="Quick View"
                aria-label="Quick View"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className={styles.productInfo}>
          <h2 className={styles.productTitle}>{product.name}</h2>

          <div className={styles.productPricing}>
            <div className={styles.priceSection}>
              <div className={styles.productPrice}>
                {currentPriceNum > 0 && (
                  <span className={styles.currentPrice}>{formatPrice(currentPriceNum)}</span>
                )}
                {originalPriceNum > 0 && originalPriceNum > currentPriceNum && (
                  <span className={styles.originalPrice}>{formatPrice(originalPriceNum)}</span>
                )}
              </div>
            </div>
            <div className={styles.addToCartSection}>
              <button
                className={styles.addToCartBtn}
                onClick={handleAddToCart}
                aria-label={`Add ${product.name} to cart`}
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      </Link>
    </div>
  )
}

