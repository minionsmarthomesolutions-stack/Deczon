'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { db } from '@/lib/firebase'
import { collection, getDocs, doc, getDoc } from 'firebase/firestore'
import { getServiceImageUrl } from '@/lib/serviceImageUtils'
import styles from './products.module.css'

interface Product {
  id: string
  slug?: string
  name?: string
  productName?: string
  primaryImageUrl?: string
  imageUrl?: string
  currentPrice?: number
  originalPrice?: number
  price?: number
  itemType?: 'product' | 'service'
  mainCategory?: string
  subcategory?: string
  category?: string
  description?: string
  images?: string[]
  productDetails?: Array<{ name: string; value: string }>
}

interface Category {
  name: string
  subcategories: Record<string, { items?: string[] }>
}

export default function ProductsPage() {
  const [allItems, setAllItems] = useState<Product[]>([])
  const [filteredItems, setFilteredItems] = useState<Product[]>([])
  const [categories, setCategories] = useState<Record<string, Category>>({})
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<string | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [expandedSubcategories, setExpandedSubcategories] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState('default')
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [quickViewItem, setQuickViewItem] = useState<Product | null>(null)
  const [currentModalImageIndex, setCurrentModalImageIndex] = useState(0)
  const [wishlist, setWishlist] = useState<string[]>([])

  useEffect(() => {
    loadAllData()
    loadWishlist()
  }, [])

  useEffect(() => {
    filterItems()
  }, [allItems, selectedCategory, selectedSubcategory, selectedItem, sortBy])

  const loadAllData = async () => {
    try {
      await Promise.all([
        loadAllProducts(),
        loadAllServices(),
        loadCategories()
      ])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAllProducts = async () => {
    if (!db) return
    try {
      const snapshot = await getDocs(collection(db, 'products'))
      const products: Product[] = snapshot.docs.map(doc => ({
        id: doc.id,
        itemType: 'product',
        ...doc.data()
      } as Product))
      setAllItems(prev => [...prev, ...products])
    } catch (error) {
      console.error('Error loading products:', error)
    }
  }

  const loadAllServices = async () => {
    if (!db) return
    try {
      const snapshot = await getDocs(collection(db, 'services'))
      const services: Product[] = snapshot.docs.map(doc => {
        const data = doc.data()
        // Use comprehensive image extraction utility
        const imageUrl = getServiceImageUrl(data)
        return {
          id: doc.id,
          itemType: 'service',
          name: data.name || data.title,
          primaryImageUrl: imageUrl,
          imageUrl: imageUrl, // Also set imageUrl for consistency
          currentPrice: getServiceMinPrice(data),
          ...data
        } as Product
      })
      setAllItems(prev => [...prev, ...services])
    } catch (error) {
      console.error('Error loading services:', error)
    }
  }

  const getServiceMinPrice = (service: any): number => {
    if (!service.packages) return 0
    const prices: number[] = []
    Object.values(service.packages).forEach((pkg: any) => {
      if (pkg.priceFrom) prices.push(pkg.priceFrom)
      if (pkg.priceTo) prices.push(pkg.priceTo)
    })
    return prices.length > 0 ? Math.min(...prices) : 0
  }

  const loadCategories = async () => {
    if (!db) return
    try {
      const snapshot = await getDocs(collection(db, 'categories'))
      const categoriesData: Record<string, Category> = {}

      snapshot.forEach(docSnapshot => {
        const data = docSnapshot.data()
        const mainCategory = docSnapshot.id
        if (data.subcategories) {
          categoriesData[mainCategory] = {
            name: mainCategory,
            subcategories: {}
          }
          Object.keys(data.subcategories).forEach(subCatName => {
            const subCatData = data.subcategories[subCatName]
            categoriesData[mainCategory].subcategories[subCatName] = {
              items: subCatData.items || []
            }
          })
        }
      })

      // Try structure document if no categories found
      if (Object.keys(categoriesData).length === 0) {
        const structureDoc = await getDoc(doc(db, 'categories', 'structure'))
        if (structureDoc.exists()) {
          const raw = structureDoc.data().categories || {}
          Object.keys(raw).forEach(mainCategory => {
            const mainCatData = raw[mainCategory]
            categoriesData[mainCategory] = {
              name: mainCategory,
              subcategories: {}
            }
            if (mainCatData.subcategories) {
              Object.keys(mainCatData.subcategories).forEach(subCatName => {
                const subCatData = mainCatData.subcategories[subCatName]
                categoriesData[mainCategory].subcategories[subCatName] = {
                  items: subCatData.items || []
                }
              })
            }
          })
        }
      }

      setCategories(categoriesData)
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const loadWishlist = () => {
    if (typeof window !== 'undefined') {
      try {
        const wishlistData = localStorage.getItem('wishlist')
        if (wishlistData) {
          setWishlist(JSON.parse(wishlistData))
        }
      } catch (error) {
        console.error('Error loading wishlist:', error)
      }
    }
  }

  const filterItems = () => {
    let filtered = [...allItems]

    // Apply category filters
    if (selectedItem) {
      filtered = filtered.filter(item =>
        item.name?.toLowerCase().includes(selectedItem.toLowerCase()) ||
        item.subcategory?.toLowerCase().includes(selectedItem.toLowerCase())
      )
    } else if (selectedSubcategory) {
      filtered = filtered.filter(item =>
        item.subcategory?.toLowerCase() === selectedSubcategory.toLowerCase()
      )
    } else if (selectedCategory) {
      filtered = filtered.filter(item =>
        item.mainCategory?.toLowerCase() === selectedCategory.toLowerCase() ||
        item.category?.toLowerCase() === selectedCategory.toLowerCase()
      )
    }

    // Apply sorting
    if (sortBy === 'price-low') {
      filtered.sort((a, b) => (a.currentPrice || 0) - (b.currentPrice || 0))
    } else if (sortBy === 'price-high') {
      filtered.sort((a, b) => (b.currentPrice || 0) - (a.currentPrice || 0))
    } else if (sortBy === 'name') {
      filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    }

    setFilteredItems(filtered)
  }

  const toggleMainCategory = (categoryName: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(categoryName)) {
        newSet.delete(categoryName)
      } else {
        newSet.add(categoryName)
      }
      return newSet
    })
  }

  const toggleSubcategory = (subcategoryName: string) => {
    setExpandedSubcategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(subcategoryName)) {
        newSet.delete(subcategoryName)
      } else {
        newSet.add(subcategoryName)
      }
      return newSet
    })
  }

  const selectAllItems = () => {
    setSelectedCategory(null)
    setSelectedSubcategory(null)
    setSelectedItem(null)
  }

  const selectSubcategory = (mainCategory: string, subcategoryName: string, item: string) => {
    setSelectedCategory(mainCategory)
    setSelectedSubcategory(subcategoryName)
    setSelectedItem(item)
  }

  const toggleWishlist = (itemId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    setWishlist(prev => {
      const newWishlist = prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]

      if (typeof window !== 'undefined') {
        localStorage.setItem('wishlist', JSON.stringify(newWishlist))
      }
      return newWishlist
    })
  }

  const openQuickView = (item: Product, event: React.MouseEvent) => {
    event.stopPropagation()
    setQuickViewItem(item)
    setCurrentModalImageIndex(0)
  }

  const closeQuickView = () => {
    setQuickViewItem(null)
    setCurrentModalImageIndex(0)
  }

  const changeModalImage = (direction: number) => {
    if (!quickViewItem) return
    const images = [
      quickViewItem.primaryImageUrl || quickViewItem.imageUrl,
      ...(quickViewItem.images || [])
    ].filter(Boolean)

    if (direction === -1) {
      setCurrentModalImageIndex(prev => prev > 0 ? prev - 1 : images.length - 1)
    } else {
      setCurrentModalImageIndex(prev => prev < images.length - 1 ? prev + 1 : 0)
    }
  }

  const addToCart = (item: Product, event: React.MouseEvent) => {
    event.stopPropagation()
    if (typeof window !== 'undefined') {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]')
      const existingItem = cart.findIndex((ci: any) => ci.id === item.id)
      const price = item.currentPrice || item.price || 0
      const imageUrl = item.primaryImageUrl || item.imageUrl || '/placeholder.svg'

      if (existingItem >= 0) {
        cart[existingItem].quantity += 1
      } else {
        cart.push({
          id: item.id,
          name: item.name || item.productName,
          price,
          imageUrl,
          quantity: 1,
          timestamp: new Date().toISOString()
        })
      }
      localStorage.setItem('cart', JSON.stringify(cart))
      // Trigger cart update event
      window.dispatchEvent(new Event('cartUpdated'))
    }
  }

  const enquireService = (itemId: string) => {
    // Navigate to service detail or show enquiry modal
    if (typeof window !== 'undefined') {
      window.location.href = `/services/${itemId}`
    }
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingSpinner}>
          <div className={styles.spinner}></div>
          <p>Loading products...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.productsPage}>
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <h1>Products & Services</h1>
          <p>Browse our complete catalog of smart home solutions</p>
        </div>

        <div className={styles.productsContent}>
          {/* Left Sidebar - Filters */}
          <div className={styles.productsFilters}>
            <button
              className={styles.filterToggleBtn}
              onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
            >
              Filters
            </button>

            <div className={styles.filtersContent}>
              <h3>Categories</h3>

              <div className={styles.categoryTree} id="category-tree">
                <div className={styles.mainCategoryGroup}>
                  <div
                    className={`${styles.mainCategoryHeader} ${!selectedCategory ? styles.active : ''}`}
                    onClick={selectAllItems}
                  >
                    <span>All Items</span>
                  </div>
                </div>

                {Object.keys(categories).map(mainCategory => (
                  <div
                    key={mainCategory}
                    className={`${styles.mainCategoryGroup} ${expandedCategories.has(mainCategory) ? styles.expanded : ''}`}
                  >
                    <div
                      className={`${styles.mainCategoryHeader} ${selectedCategory === mainCategory ? styles.active : ''}`}
                      onClick={() => toggleMainCategory(mainCategory)}
                    >
                      <span>{mainCategory}</span>
                      <span className={styles.categoryArrow}>▼</span>
                    </div>
                    <div className={styles.mainCategoryContent}>
                      {Object.keys(categories[mainCategory].subcategories).map(subcategoryName => (
                        <div key={subcategoryName} className={styles.categoryGroup}>
                          <div
                            className={`${styles.categoryHeader} ${expandedSubcategories.has(subcategoryName) ? styles.active : ''}`}
                            onClick={() => toggleSubcategory(subcategoryName)}
                          >
                            {subcategoryName}
                            <span className={styles.categoryArrow}>▼</span>
                          </div>
                          <div className={`${styles.subcategories} ${expandedSubcategories.has(subcategoryName) ? styles.expanded : ''}`}>
                            {categories[mainCategory].subcategories[subcategoryName].items?.map((item: string) => (
                              <div
                                key={item}
                                className={`${styles.subcategoryItem} ${selectedItem === item ? styles.active : ''}`}
                                onClick={() => selectSubcategory(mainCategory, subcategoryName, item)}
                              >
                                {item}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <button className={styles.clearFiltersBtn} onClick={selectAllItems}>
                Clear All Filters
              </button>
            </div>
          </div>

          {/* Main Products Area */}
          <div className={styles.productsMain}>
            <div className={styles.productsHeader}>
              <div className={styles.productsCount}>
                {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'} found
              </div>
              <select
                className={styles.sortDropdown}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="default">Default</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="name">Name: A to Z</option>
              </select>
            </div>

            <div className={styles.productsGridFull}>
              {filteredItems.map(item => {
                const imageUrl = item.primaryImageUrl || item.imageUrl || '/placeholder.svg?height=280&width=280'
                const currentPrice = item.currentPrice || item.price || 0
                const originalPrice = item.originalPrice || 0
                const discountPercent = originalPrice > currentPrice
                  ? Math.round((1 - currentPrice / originalPrice) * 100)
                  : 0
                const isInWishlist = wishlist.includes(item.id)

                const href = item.itemType === 'product'
                  ? `/products/${item.slug || item.id}`
                  : `/services/${item.id}`

                return (
                  <Link
                    key={item.id}
                    href={href}
                    className={styles.mixedItem}
                    target={item.itemType === 'product' ? "_blank" : undefined}
                    rel={item.itemType === 'product' ? "noopener noreferrer" : undefined}
                  >
                    <div className={styles.mixedItemImage}>
                      <Image
                        src={imageUrl}
                        alt={item.name || 'Product'}
                        width={280}
                        height={280}
                        unoptimized
                      />
                      {discountPercent > 0 && (
                        <div className={styles.discountTag}>
                          {discountPercent}% OFF
                        </div>
                      )}

                      <div className={styles.mixedItemActionButtons}>
                        <button
                          className={styles.mixedItemWishlistBtn}
                          onClick={(e) => toggleWishlist(item.id, e)}
                          title="Add to Wishlist"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill={isInWishlist ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                          </svg>
                        </button>
                        <button
                          className={styles.mixedItemQuickViewBtn}
                          onClick={(e) => openQuickView(item, e)}
                          title="Quick View"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className={styles.mixedItemInfo}>
                      <h3 className={styles.mixedItemName}>{item.name || item.productName}</h3>
                      <div className={styles.mixedItemPrice}>
                        <div className={styles.priceSection}>
                          <span className={styles.currentPrice}>₹{currentPrice.toLocaleString('en-IN')}</span>
                          {originalPrice > currentPrice && (
                            <span className={styles.originalPrice}>₹{originalPrice.toLocaleString('en-IN')}</span>
                          )}
                        </div>
                        <button
                          className={styles.slideAddToCart}
                          onClick={(e) => item.itemType === 'product' ? addToCart(item, e) : enquireService(item.id)}
                        >
                          {item.itemType === 'product' ? 'Add to Cart' : 'Enquire'}
                        </button>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Quick View Modal */}
      {quickViewItem && (
        <div className={styles.quickViewModal} onClick={closeQuickView}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalCloseBtn} onClick={closeQuickView}>×</button>

            <div className={styles.modalMain}>
              <div className={styles.modalImageSection}>
                <div className={styles.modalMainImage}>
                  <Image
                    src={[
                      quickViewItem.primaryImageUrl || quickViewItem.imageUrl,
                      ...(quickViewItem.images || [])
                    ].filter(Boolean)[currentModalImageIndex] || '/placeholder.svg'}
                    alt={quickViewItem.name || 'Product'}
                    width={400}
                    height={400}
                    unoptimized
                  />
                </div>
                <div className={styles.modalThumbnails}>
                  {[
                    quickViewItem.primaryImageUrl || quickViewItem.imageUrl,
                    ...(quickViewItem.images || [])
                  ].filter(Boolean).map((img, idx) => (
                    <div
                      key={idx}
                      className={`${styles.modalThumbnail} ${idx === currentModalImageIndex ? styles.active : ''}`}
                      onClick={() => setCurrentModalImageIndex(idx)}
                    >
                      <Image src={img || '/placeholder.svg'} alt={`Thumbnail ${idx + 1}`} width={60} height={60} unoptimized />
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.modalInfoSection}>
                <h2 id="modal-product-title">{quickViewItem.name || quickViewItem.productName}</h2>
                <div className={styles.modalPricing}>
                  <span className={styles.modalCurrentPrice} id="modal-current-price">
                    ₹{(quickViewItem.currentPrice || quickViewItem.price || 0).toLocaleString('en-IN')}
                  </span>
                  {quickViewItem.originalPrice && quickViewItem.originalPrice > (quickViewItem.currentPrice || 0) && (
                    <>
                      <span className={styles.modalOriginalPrice} id="modal-original-price">
                        ₹{quickViewItem.originalPrice.toLocaleString('en-IN')}
                      </span>
                      <span className={styles.modalDiscountBadge} id="modal-discount-badge">
                        {Math.round((1 - (quickViewItem.currentPrice || 0) / quickViewItem.originalPrice) * 100)}% OFF
                      </span>
                    </>
                  )}
                </div>
                <div className={styles.modalDescription} id="modal-description-text">
                  {quickViewItem.description || 'Product description not available.'}
                </div>
                <div className={styles.modalDetailsContainer} id="modal-details-container">
                  {quickViewItem.productDetails?.map((detail, idx) => (
                    <div key={idx} className={styles.modalDetailItem}>
                      <span className={styles.modalDetailLabel}>{detail.name}</span>
                      <span className={styles.modalDetailValue}>{detail.value}</span>
                    </div>
                  ))}
                </div>
                <button
                  className={styles.modalAddToCartBtn}
                  onClick={() => {
                    if (quickViewItem.itemType === 'product') {
                      addToCart(quickViewItem, {} as React.MouseEvent)
                    } else {
                      enquireService(quickViewItem.id)
                    }
                    closeQuickView()
                  }}
                >
                  {quickViewItem.itemType === 'product' ? 'Add to Cart' : 'Enquire Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Filter Overlay */}
      {mobileFiltersOpen && (
        <div className={styles.mobileFilterOverlay} onClick={() => setMobileFiltersOpen(false)}>
          <div className={styles.mobileFilterSidebar} onClick={(e) => e.stopPropagation()}>
            <button className={styles.mobileFilterClose} onClick={() => setMobileFiltersOpen(false)}>×</button>
            <div className={styles.filtersContent}>
              {/* Same filter content as desktop */}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

