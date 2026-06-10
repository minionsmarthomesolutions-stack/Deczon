'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getServiceImageUrl } from '@/lib/serviceImageUtils'
import ProductDetailPopup from '@/components/ProductDetailPopup'
import ProductCard from '@/components/ProductCard'
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

function ProductsContent() {
  const searchParams = useSearchParams()
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

    // Read URL parameters and set filters
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const mainCategory = params.get('mainCategory')
      const category = params.get('category')
      const subcategory = params.get('subcategory')

      if (mainCategory) {
        setSelectedCategory(mainCategory)
        setExpandedCategories(prev => new Set(prev).add(mainCategory))
      }
      if (category) {
        setSelectedSubcategory(category)
        setExpandedSubcategories(prev => new Set(prev).add(category))
      }
      if (subcategory) {
        setSelectedItem(subcategory)
      }
    }
  }, [])

  // Watch for URL parameter changes (for navigation within the same page)
  useEffect(() => {
    const mainCategory = searchParams.get('mainCategory')
    const category = searchParams.get('category')
    const subcategory = searchParams.get('subcategory')

    // Reset filters if no params
    if (!mainCategory && !category && !subcategory) {
      setSelectedCategory(null)
      setSelectedSubcategory(null)
      setSelectedItem(null)
      return
    }

    // Update filters based on URL params
    if (mainCategory) {
      setSelectedCategory(mainCategory)
      setExpandedCategories(prev => new Set(prev).add(mainCategory))
    } else {
      setSelectedCategory(null)
    }

    if (category) {
      setSelectedSubcategory(category)
      setExpandedSubcategories(prev => new Set(prev).add(category))
    } else {
      setSelectedSubcategory(null)
    }

    if (subcategory) {
      setSelectedItem(subcategory)
    } else {
      setSelectedItem(null)
    }
  }, [searchParams])

  useEffect(() => {
    filterItems()
  }, [allItems, selectedCategory, selectedSubcategory, selectedItem, sortBy])

  const loadAllData = async () => {
    try {
      const [products, services] = await Promise.all([
        loadAllProducts(),
        loadAllServices(),
        loadCategories()
      ])

      if (products || services) {
        setAllItems([...(products || []), ...(services || [])])
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAllProducts = async (): Promise<Product[] | undefined> => {
    try {
      const res = await fetch(`/api/products?t=${Date.now()}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: any[] = await res.json()
      return data.map((doc: any) => ({ ...doc, id: doc.id, itemType: 'product' as const }))
    } catch (error) {
      console.error('Error loading products:', error)
      return []
    }
  }

  const loadAllServices = async (): Promise<Product[] | undefined> => {
    try {
      const res = await fetch(`/api/services?t=${Date.now()}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: any[] = await res.json()
      return data.map((doc: any) => {
        const imageUrl = getServiceImageUrl(doc)
        return {
          ...doc,
          id: doc.id,
          itemType: 'service' as const,
          name: doc.name || doc.title,
          primaryImageUrl: imageUrl,
          imageUrl: imageUrl,
          currentPrice: getServiceMinPrice(doc),
        } as Product
      })
    } catch (error) {
      console.error('Error loading services:', error)
      return []
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
    try {
      const res = await fetch('/api/categories')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const navCategories: any[] = await res.json()

      const categoriesData: Record<string, Category> = {}
      navCategories.forEach((cat: any) => {
        categoriesData[cat.name] = {
          name: cat.name,
          subcategories: Object.fromEntries(
            Object.entries(cat.subcategories || {}).map(([k, v]: [string, any]) => [
              k,
              { items: [...(v.items || []), ...Object.keys(v.children || {})] }
            ])
          )
        }
      })
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

    // Apply category filters with improved logic
    if (selectedItem) {
      // When a specific item (sub-subcategory) is selected
      filtered = filtered.filter(item => {
        const itemName = item.name?.toLowerCase() || item.productName?.toLowerCase() || ''
        const itemSubcategory = item.subcategory?.toLowerCase() || ''
        const itemCategory = item.category?.toLowerCase() || ''
        const searchTerm = selectedItem.toLowerCase()

        // Match against name, subcategory, or category fields
        return itemName.includes(searchTerm) ||
          itemSubcategory.includes(searchTerm) ||
          itemCategory.includes(searchTerm) ||
          (itemCategory && searchTerm.includes(itemCategory)) ||
          (itemSubcategory && searchTerm.includes(itemSubcategory))
      })

      // Also filter by main category and subcategory if they are set
      if (selectedCategory) {
        filtered = filtered.filter(item =>
          item.mainCategory?.toLowerCase() === selectedCategory.toLowerCase() ||
          item.category?.toLowerCase() === selectedCategory.toLowerCase() ||
          (item.category && selectedCategory.toLowerCase().includes(item.category.toLowerCase())) ||
          (item.mainCategory && selectedCategory.toLowerCase().includes(item.mainCategory.toLowerCase()))
        )
      }
    } else if (selectedSubcategory) {
      // When a subcategory is selected (but no specific item)
      filtered = filtered.filter(item => {
        const itemSubcategory = item.subcategory?.toLowerCase() || ''
        const itemCategory = item.category?.toLowerCase() || ''
        const searchTerm = selectedSubcategory.toLowerCase()

        return itemSubcategory === searchTerm || itemCategory === searchTerm ||
               itemSubcategory.includes(searchTerm) || itemCategory.includes(searchTerm) ||
               (itemCategory && searchTerm.includes(itemCategory)) || 
               (itemSubcategory && searchTerm.includes(itemSubcategory))
      })

      // Also filter by main category if set
      if (selectedCategory) {
        filtered = filtered.filter(item =>
          item.mainCategory?.toLowerCase() === selectedCategory.toLowerCase() ||
          item.category?.toLowerCase() === selectedCategory.toLowerCase() ||
          (item.category && selectedCategory.toLowerCase().includes(item.category.toLowerCase())) ||
          (item.mainCategory && selectedCategory.toLowerCase().includes(item.mainCategory.toLowerCase()))
        )
      }
    } else if (selectedCategory) {
      // When only main category is selected
      filtered = filtered.filter(item =>
        item.mainCategory?.toLowerCase() === selectedCategory.toLowerCase() ||
        item.category?.toLowerCase() === selectedCategory.toLowerCase() ||
        (item.category && selectedCategory.toLowerCase().includes(item.category.toLowerCase())) ||
        (item.mainCategory && selectedCategory.toLowerCase().includes(item.mainCategory.toLowerCase()))
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
    
    if (selectedCategory === categoryName && !selectedSubcategory && !selectedItem) {
      // Deselect if already selected as the sole filter
      setSelectedCategory(null)
    } else {
      setSelectedCategory(categoryName)
    }
    setSelectedSubcategory(null)
    setSelectedItem(null)
    setMobileFiltersOpen(false)
  }

  const toggleSubcategory = (mainCategory: string, subcategoryName: string) => {
    setExpandedSubcategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(subcategoryName)) {
        newSet.delete(subcategoryName)
      } else {
        newSet.add(subcategoryName)
      }
      return newSet
    })
    
    if (selectedCategory === mainCategory && selectedSubcategory === subcategoryName && !selectedItem) {
      // Deselect subcategory if already selected as the sole filter under this main category
      setSelectedSubcategory(null)
    } else {
      setSelectedCategory(mainCategory)
      setSelectedSubcategory(subcategoryName)
    }
    setSelectedItem(null)
    setMobileFiltersOpen(false)
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
    setMobileFiltersOpen(false)
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

  const openQuickView = (item: Product, event?: React.MouseEvent) => {
    event?.stopPropagation()
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

  const handlePopupAddToCart = (product: any) => {
    // Adapter for ProductDetailPopup to use the local addToCart
    if (product.itemType === 'service') {
      enquireService(product.id)
      return
    }

    // Create a mock event or just call logic directly
    addToCart(product as Product, { stopPropagation: () => { } } as React.MouseEvent)
  }

  const enquireService = (itemId: string) => {
    // Navigate to service detail or show enquiry modal
    if (typeof window !== 'undefined') {
      window.location.href = `/services/${itemId}`
    }
  }

  // Helper function to strip HTML tags and get plain text
  const stripHtmlTags = (html: string): string => {
    if (!html) return ''
    // Remove HTML tags
    let text = html.replace(/<[^>]*>/g, '')
    // Decode common HTML entities
    text = text.replace(/&nbsp;/g, ' ')
    text = text.replace(/&amp;/g, '&')
    text = text.replace(/&lt;/g, '<')
    text = text.replace(/&gt;/g, '>')
    text = text.replace(/&quot;/g, '"')
    text = text.replace(/&#39;/g, "'")
    // Remove extra whitespace
    text = text.replace(/\s+/g, ' ').trim()
    return text
  }

  const formatCategoryName = (name: string): string => {
    // Split by common separators like &, -, or space
    return name.toLowerCase().split(' ').map(word => {
      // Handle special characters like &
      if (word === '&') return '&'
      return word.charAt(0).toUpperCase() + word.slice(1)
    }).join(' ')
  }

  const renderFiltersContent = () => (
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
              <span>{formatCategoryName(mainCategory)}</span>
              <span className={styles.categoryArrow}>▼</span>
            </div>
            <div className={styles.mainCategoryContent}>
              {Object.keys(categories[mainCategory].subcategories).map(subcategoryName => (
                <div key={subcategoryName} className={`${styles.categoryGroup} ${expandedSubcategories.has(subcategoryName) ? styles.expanded : ''}`}>
                  <div
                    className={`${styles.categoryHeader} ${expandedSubcategories.has(subcategoryName) ? styles.active : ''} ${selectedSubcategory === subcategoryName && !selectedItem ? styles.active : ''}`}
                    onClick={() => toggleSubcategory(mainCategory, subcategoryName)}
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
  )

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
        {/* Left Sidebar - Filters (desktop) + Mobile filter row */}
          <div className={styles.productsFilters}>
            {/* Mobile: filter button + active chips row */}
            <div className={styles.mobileFilterRow}>
              <button
                className={styles.filterToggleBtn}
                onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="4" y1="6" x2="20" y2="6" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                  <line x1="11" y1="18" x2="13" y2="18" />
                </svg>
                Filters
              </button>
              <div className={styles.activeFiltersBar}>
                {selectedCategory && (
                  <span
                    className={styles.filterChip}
                    onClick={() => { setSelectedCategory(null); setSelectedSubcategory(null); setSelectedItem(null) }}
                  >
                    {formatCategoryName(selectedCategory)}
                    <span className={styles.filterChipClose}>×</span>
                  </span>
                )}
                {selectedSubcategory && (
                  <span
                    className={styles.filterChip}
                    onClick={() => { setSelectedSubcategory(null); setSelectedItem(null) }}
                  >
                    {selectedSubcategory}
                    <span className={styles.filterChipClose}>×</span>
                  </span>
                )}
                {selectedItem && (
                  <span
                    className={styles.filterChip}
                    onClick={() => setSelectedItem(null)}
                  >
                    {selectedItem}
                    <span className={styles.filterChipClose}>×</span>
                  </span>
                )}
              </div>
            </div>

            {/* Desktop sidebar filters */}
            {renderFiltersContent()}
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
              {filteredItems.map(item => (
                <div key={`${item.itemType}-${item.id}`} className={styles.productCardWrapper}>
                  <ProductCard
                    product={{
                      ...item,
                      name: item.name || item.productName || 'Product',
                      currentPrice: item.currentPrice || item.price,
                      originalPrice: item.originalPrice
                    } as any}
                    onQuickView={(prod) => openQuickView(prod as any, null as any)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick View Modal */}
      {/* Quick View Modal - Replaced with shared component */}
      <ProductDetailPopup
        product={quickViewItem ? {
          ...quickViewItem,
          name: quickViewItem.name || quickViewItem.productName || 'Product',
          currentPrice: quickViewItem.currentPrice || quickViewItem.price,
          originalPrice: quickViewItem.originalPrice
        } : null}
        isOpen={!!quickViewItem}
        onClose={closeQuickView}
        onAddToCart={handlePopupAddToCart}
      />

      {/* Mobile Filter Overlay */}
      {mobileFiltersOpen && (
        <div className={styles.mobileFilterOverlay} onClick={() => setMobileFiltersOpen(false)}>
          <div className={styles.mobileFilterSidebar} onClick={(e) => e.stopPropagation()}>
            <button className={styles.mobileFilterClose} onClick={() => setMobileFiltersOpen(false)}>×</button>
            {renderFiltersContent()}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className={styles.loading}>
        <div className={styles.loadingSpinner}>
          <div className={styles.spinner}></div>
          <p>Loading products...</p>
        </div>
      </div>
    }>
      <ProductsContent />
    </Suspense>
  )
}

