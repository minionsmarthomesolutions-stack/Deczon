'use client'

import { useEffect, useState } from 'react'
import styles from './ProductDetailPopup.module.css'

interface Product {
  id: string
  name: string
  currentPrice?: number | string
  originalPrice?: number | string
  price?: number | string
  oldPrice?: number | string
  description?: string
  primaryImageUrl?: string
  secondaryImageUrl?: string
  imageUrl?: string
  images?: string[]
  productDetails?: Array<{ name: string; value: string }>
  mainCategory?: string
  category?: string
}

interface ProductDetailPopupProps {
  product: Product | null
  isOpen: boolean
  onClose: () => void
  onAddToCart: (product: Product) => void
}

export default function ProductDetailPopup({
  product,
  isOpen,
  onClose,
  onAddToCart
}: ProductDetailPopupProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      setCurrentImageIndex(0)
    } else {
      document.body.style.overflow = ''
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen || !product) {
    return null
  }

  // Get images
  const primaryImage = product.primaryImageUrl || product.imageUrl || (product.images && product.images[0]) || '/placeholder.svg?height=400&width=400&text=Product'
  const secondaryImage = product.secondaryImageUrl || (product.images && product.images[1])
  const allImages = [primaryImage, secondaryImage].filter(Boolean)
  const uniqueImages = Array.from(new Set(allImages))
  if (uniqueImages.length === 0) uniqueImages.push(primaryImage)

  // Get prices
  const currentPrice = typeof product.currentPrice === 'string'
    ? parseFloat(product.currentPrice.replace(/[₹,]/g, ''))
    : (product.currentPrice as number) || (typeof product.price === 'string'
      ? parseFloat(product.price.replace(/[₹,]/g, ''))
      : (product.price as number)) || 0

  const originalPrice = typeof product.originalPrice === 'string'
    ? parseFloat(product.originalPrice.replace(/[₹,]/g, ''))
    : (product.originalPrice as number) || (typeof product.oldPrice === 'string'
      ? parseFloat(product.oldPrice.replace(/[₹,]/g, ''))
      : (product.oldPrice as number)) || 0

  const discountPercent = originalPrice > 0 && currentPrice > 0 && originalPrice > currentPrice
    ? Math.round((1 - currentPrice / originalPrice) * 100)
    : 0

  // Format price
  const formatPrice = (price: number): string => {
    return `₹${price.toLocaleString('en-IN')}`
  }

  // Truncate description
  const description = product.description || 'Product description not available.'
  const truncatedDescription = description.length > 200
    ? description.substring(0, 200) + '...'
    : description

  const handleThumbnailClick = (index: number) => {
    setCurrentImageIndex(index)
  }

  const handleAddToCart = () => {
    onAddToCart(product)
    onClose()
  }

  return (
    <div className={`${styles.popup} ${isOpen ? styles.show : ''}`}>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.content}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <div className={styles.productDetail}>
          <div className={styles.productImages}>
            <div className={styles.mainImageContainer}>
              <img
                src={uniqueImages[currentImageIndex] || primaryImage}
                alt={product.name}
                className={styles.mainImage}
              />
              {uniqueImages.length > 1 && (
                <>
                  <button
                    className={`${styles.imageNavBtn} ${styles.prev}`}
                    onClick={() => setCurrentImageIndex((prev) => (prev - 1 + uniqueImages.length) % uniqueImages.length)}
                    aria-label="Previous image"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                  </button>
                  <button
                    className={`${styles.imageNavBtn} ${styles.next}`}
                    onClick={() => setCurrentImageIndex((prev) => (prev + 1) % uniqueImages.length)}
                    aria-label="Next image"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </button>
                </>
              )}
            </div>
            {uniqueImages.length > 1 && (
              <div className={styles.thumbnails}>
                {uniqueImages.map((image, index) => (
                  <div
                    key={index}
                    className={`${styles.thumbnail} ${index === currentImageIndex ? styles.active : ''}`}
                    onClick={() => handleThumbnailClick(index)}
                  >
                    <img src={image} alt={`${product.name} - Image ${index + 1}`} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={styles.productInfo}>
            <h2 className={styles.productTitle}>{product.name}</h2>
            <div className={styles.productPrice}>
              <span className={styles.currentPrice}>{formatPrice(currentPrice)}</span>
              {originalPrice > 0 && originalPrice > currentPrice && (
                <>
                  <span className={styles.originalPrice}>{formatPrice(originalPrice)}</span>
                  {discountPercent > 0 && (
                    <span className={styles.discountBadge}>{discountPercent}% OFF</span>
                  )}
                </>
              )}
            </div>

            <div className={styles.productDetails}>
              <h4 className={styles.detailsTitle}>Product Details</h4>
              <div className={styles.detailsContainer}>
                {product.productDetails && product.productDetails.length > 0 ? (
                  product.productDetails.map((detail, index) => (
                    <div key={index} className={styles.detailItem}>
                      <span className={styles.detailLabel}>{detail.name}</span>
                      <span className={styles.detailValue}>{detail.value}</span>
                    </div>
                  ))
                ) : (
                  <>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Product Type</span>
                      <span className={styles.detailValue}>{product.mainCategory || product.category || 'N/A'}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Brand</span>
                      <span className={styles.detailValue}>DECZON</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className={styles.productDescription}>
              <p title={description}>{truncatedDescription}</p>
            </div>

            <div className={styles.actionButtons}>
              <button className={styles.addToCartBtn} onClick={handleAddToCart}>
                Add To Cart
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

