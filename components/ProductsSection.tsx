'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import ProductCard from './ProductCard'
import ProductDetailPopup from './ProductDetailPopup'
import styles from './ProductsSection.module.css'

interface Product {
  id: string
  name: string
  imageUrl?: string
  currentPrice?: string
  originalPrice?: string
  discountPercent?: string
  badge?: string
  category?: string
  mainCategory?: string
}

interface Category {
  id: string
  name: string
  subcategories?: any
}

interface ProductsSectionProps {
  categories?: Category[]
  products?: Product[]
  categoryName?: string
  productsList?: Product[]
  showSeeAll?: boolean
}

export default function ProductsSection({ 
  categories, 
  products, 
  categoryName,
  productsList,
  showSeeAll = false
}: ProductsSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [isPopupOpen, setIsPopupOpen] = useState(false)

  const handleQuickView = (product: any) => {
    setSelectedProduct(product)
    setIsPopupOpen(true)
  }

  const handleClosePopup = () => {
    setIsPopupOpen(false)
    setSelectedProduct(null)
  }

  const handleAddToCart = (product: any) => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]')
    const existingItem = cart.find((item: any) => item.id === product.id)
    
    if (existingItem) {
      existingItem.quantity = (existingItem.quantity || 1) + 1
    } else {
      const currentPrice = typeof product.currentPrice === 'string'
        ? parseFloat(product.currentPrice.replace(/[₹,]/g, ''))
        : (product.currentPrice as number) || 0
      
      cart.push({
        id: product.id,
        name: product.name,
        price: currentPrice,
        imageUrl: product.primaryImageUrl || product.imageUrl,
        quantity: 1
      })
    }
    
    localStorage.setItem('cart', JSON.stringify(cart))
    window.dispatchEvent(new Event('cartUpdated'))
  }

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -300, behavior: 'smooth' })
    }
  }

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 300, behavior: 'smooth' })
    }
  }

  // If categoryName and productsList are provided, use them directly
  if (categoryName && productsList) {
    if (productsList.length === 0) return null

    return (
      <>
        <section className={styles.productsSection} data-category-section={categoryName}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <div>
                <h2>{categoryName}</h2>
                <p className={styles.sectionSubtitle}>Explore our {categoryName} collection</p>
              </div>
              {showSeeAll && (
                <Link href={`/products?mainCategory=${encodeURIComponent(categoryName)}`} className={styles.seeAllLink}>
                  See All
                </Link>
              )}
            </div>

            <div className={styles.productsSlider}>
              <button
                className={`${styles.sliderBtn} ${styles.prev}`}
                onClick={scrollLeft}
                aria-label="Previous products"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>

              <div className={styles.productsGrid} ref={scrollRef}>
                {productsList.map((product) => (
                  <ProductCard key={product.id} product={product} onQuickView={handleQuickView} />
                ))}
              </div>

              <button
                className={`${styles.sliderBtn} ${styles.next}`}
                onClick={scrollRight}
                aria-label="Next products"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>
          </div>
        </section>
        <ProductDetailPopup
          product={selectedProduct}
          isOpen={isPopupOpen}
          onClose={handleClosePopup}
          onAddToCart={handleAddToCart}
        />
      </>
    )
  }

  // Original logic for categories and products
  if (!categories || !products) {
    return null
  }

  // Group products by category
  const productsByCategory = categories.map(category => {
    const categoryProducts = products.filter(
      p => p.category === category.name || p.mainCategory === category.name
    ).slice(0, 10)
    return { category, products: categoryProducts }
  }).filter(item => item.products.length > 0)

  if (productsByCategory.length === 0) {
    return null
  }

  return (
    <>
      {productsByCategory.map(({ category, products: categoryProducts }) => (
        <section key={category.id} className={styles.productsSection}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <div>
                <h2>{category.name}</h2>
                <p className={styles.sectionSubtitle}>Explore our {category.name} collection</p>
              </div>
              <Link href={`/products?category=${category.name}`} className={styles.seeAllLink}>
                See All
              </Link>
            </div>

            <div className={styles.productsSlider}>
              <button
                className={`${styles.sliderBtn} ${styles.prev}`}
                onClick={scrollLeft}
                aria-label="Previous products"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>

              <div className={styles.productsGrid} ref={scrollRef}>
                {categoryProducts.map((product) => (
                  <ProductCard key={product.id} product={product} onQuickView={handleQuickView} />
                ))}
              </div>

              <button
                className={`${styles.sliderBtn} ${styles.next}`}
                onClick={scrollRight}
                aria-label="Next products"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>
          </div>
        </section>
      ))}
      <ProductDetailPopup
        product={selectedProduct}
        isOpen={isPopupOpen}
        onClose={handleClosePopup}
        onAddToCart={handleAddToCart}
      />
    </>
  )
}

