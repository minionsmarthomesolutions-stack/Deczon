'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import styles from './Header.module.css'
import { auth, db } from '@/lib/firebase'
import LocationSelector from './LocationSelector'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, collection, getDocs } from 'firebase/firestore'


interface Category {
  name: string
  subcategories: Record<string, string[] | { items?: string[] } | Record<string, any>>
}

interface Product {
  id: string
  name?: string
  productName?: string
  category?: string
  mainCategory?: string
  description?: string
  desc?: string
  longDescription?: string
  brand?: string
  subcategory?: string
  specifications?: any
  productDetails?: any[]
  tags?: string[]
  primaryImageUrl?: string
  imageUrl?: string
  image?: string
  relevance?: number
}

export default function Header() {
  const pathname = usePathname()
  const hideCategoryNav = (pathname?.startsWith('/products/') && pathname.split('/').length > 2) ||
    (pathname?.startsWith('/services/') && pathname.split('/').length > 2) ||
    pathname?.startsWith('/show-all-blogs') ||
    pathname?.startsWith('/blog/') ||
    pathname?.startsWith('/package-details') ||
    pathname === '/cart'
  const [user, setUser] = useState<any>(null)
  const [userLabel, setUserLabel] = useState('Login')
  const [cartCount, setCartCount] = useState(0)
  const [location, setLocation] = useState('Salem, Tamil Nadu')
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null)
  const [cameraModalOpen, setCameraModalOpen] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const searchResultsRef = useRef<HTMLDivElement>(null)

  const updateCartCount = () => {
    if (typeof window !== 'undefined') {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]')
      const totalItems = cart.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0)
      setCartCount(totalItems)
    }
  }

  useEffect(() => {
    // Load cart from localStorage
    updateCartCount()

    // Listen for cart updates
    const handleCartUpdate = () => {
      updateCartCount()
    }

    window.addEventListener('cartUpdated', handleCartUpdate)

    if (typeof window !== 'undefined') {
      // Load saved location
      const savedLocation = localStorage.getItem('userLocation')
      if (savedLocation) {
        try {
          const loc = JSON.parse(savedLocation)
          if (loc.city && loc.state) {
            setLocation(`${loc.city}, ${loc.state}`)
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }

    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate)
    }
  }, [])

  useEffect(() => {
    // Load categories
    loadCategories()
    // Load products for search
    loadProducts()

    // Auth state listener
    if (!auth || !db) {
      return
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser)
      if (currentUser) {
        try {
          const userPhone = currentUser.phoneNumber?.replace('+91', '') ||
            (typeof window !== 'undefined' ? localStorage.getItem('userPhone') : null)
          if (userPhone && db) {
            const userDoc = await getDoc(doc(db, 'users', userPhone))
            if (userDoc.exists()) {
              const userData = userDoc.data()
              setUserLabel(userData.name || 'My Account')
            } else {
              setUserLabel(currentUser.displayName || 'My Account')
            }
          } else {
            setUserLabel(currentUser.displayName || 'My Account')
          }
        } catch (error: any) {
          // Handle permission errors gracefully
          if (error?.code === 'permission-denied' || error?.code === 'missing-or-insufficient-permissions') {
            console.warn('Firebase permission denied. Using default user label.')
          } else {
            console.warn('Error loading user data:', error?.message || error)
          }
          setUserLabel(currentUser.displayName || 'My Account')
        }
      } else {
        setUserLabel(userLabel === 'Login' ? 'Login' : userLabel) // Conserve existing label if not auth related change? No, logic above sets it. Keep simple.
        if (!currentUser) setUserLabel('Login')
      }
    })

    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownOpen && !(event.target as Element).closest(`.${styles.threeDotMenu}`)) {
        setDropdownOpen(false)
      }
      // Close search results when clicking outside
      if (showSearchResults && searchResultsRef.current && !searchResultsRef.current.contains(event.target as Node)) {
        setShowSearchResults(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => {
      unsubscribe()
      document.removeEventListener('click', handleClickOutside)
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [dropdownOpen, showSearchResults])

  const loadCategories = async () => {
    if (!db) {
      // Fallback static categories
      setCategories([
        { name: 'Automation Solutions', subcategories: {} },
        { name: 'Ceiling Design & Ambient Lighting', subcategories: {} },
        { name: 'Textured Flooring & Surface Designs', subcategories: {} },
        { name: 'Interior Service', subcategories: {} },
        { name: 'Designer Walls & Claddings', subcategories: {} },
        { name: 'Exterior Services', subcategories: {} },
      ])
      return
    }

    try {
      // Try loading from categories collection
      const categoriesSnapshot = await getDocs(collection(db, 'categories'))
      if (!categoriesSnapshot.empty) {
        const cats: Category[] = []
        categoriesSnapshot.forEach((doc) => {
          const data = doc.data()
          if (data.subcategories) {
            // Normalize subcategories structure
            const normalizedSubs: Record<string, any> = {}
            Object.keys(data.subcategories).forEach(subKey => {
              const subValue = data.subcategories[subKey]
              if (Array.isArray(subValue)) {
                normalizedSubs[subKey] = subValue
              } else if (subValue && typeof subValue === 'object' && subValue.items) {
                normalizedSubs[subKey] = subValue.items
              } else if (subValue && typeof subValue === 'object') {
                normalizedSubs[subKey] = Object.keys(subValue)
              } else {
                normalizedSubs[subKey] = []
              }
            })
            cats.push({
              name: doc.id,
              subcategories: normalizedSubs
            })
          }
        })
        if (cats.length > 0) {
          setCategories(cats)
          return
        }
      }

      // Try loading from structure document
      const structureDoc = await getDoc(doc(db, 'categories', 'structure'))
      if (structureDoc.exists()) {
        const data = structureDoc.data()
        const catsData = data.categories || {}
        const cats: Category[] = Object.keys(catsData).map(name => {
          const mainData = catsData[name] || {}
          const subs = mainData.subcategories || {}
          // Normalize subcategories structure
          const normalizedSubs: Record<string, any> = {}
          Object.keys(subs).forEach(subKey => {
            const subValue = subs[subKey]
            if (Array.isArray(subValue)) {
              normalizedSubs[subKey] = subValue
            } else if (subValue && typeof subValue === 'object' && subValue.items) {
              normalizedSubs[subKey] = subValue.items
            } else if (subValue && typeof subValue === 'object') {
              normalizedSubs[subKey] = Object.keys(subValue)
            } else {
              normalizedSubs[subKey] = []
            }
          })
          return {
            name,
            subcategories: normalizedSubs
          }
        })
        if (cats.length > 0) {
          setCategories(cats)
          return
        }
      }
    } catch (error: any) {
      console.warn('Error loading categories:', error?.message || error)
    }

    // Fallback static categories
    setCategories([
      { name: 'Automation Solutions', subcategories: {} },
      { name: 'Ceiling Design & Ambient Lighting', subcategories: {} },
      { name: 'Textured Flooring & Surface Designs', subcategories: {} },
      { name: 'Interior Service', subcategories: {} },
      { name: 'Designer Walls & Claddings', subcategories: {} },
      { name: 'Exterior Services', subcategories: {} },
    ])
  }

  // Load products for search
  const loadProducts = async () => {
    try {
      if (db) {
        const snapshot = await getDocs(collection(db, 'products'))
        const productsData: Product[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Product))
        setProducts(productsData)
      }
    } catch (error) {
      console.error('Error loading products:', error)
    }
  }

  // Calculate relevance score for search (same logic as advanced-search.js)
  const calculateRelevance = (product: Product, searchTerm: string): number => {
    let relevance = 0
    const term = searchTerm.toLowerCase().trim()
    const searchWords = term.split(/\s+/).filter(w => w.length > 0)

    // Handle different product data structures
    const productName = (product.name || product.productName || '').toLowerCase()
    const productCategory = (product.category || product.mainCategory || '').toLowerCase()
    const productDescription = (product.description || product.desc || product.longDescription || '').toLowerCase()
    const productBrand = (product.brand || '').toLowerCase()
    const productSubcategory = (product.subcategory || '').toLowerCase()

    // PRIORITY 1: PRODUCT NAME MATCHES (Highest Priority)
    if (productName === term) {
      relevance += 1000
    } else if (productName.startsWith(term)) {
      relevance += 500
    } else if (productName.includes(term)) {
      relevance += 300
    } else if (searchWords.length > 0) {
      const nameWords = productName.split(/\s+/)
      const allWordsMatch = searchWords.every(searchWord =>
        nameWords.some(nameWord => nameWord.includes(searchWord) || searchWord.includes(nameWord))
      )
      if (allWordsMatch) {
        relevance += 250
      } else {
        const wordMatches = searchWords.filter(searchWord =>
          nameWords.some(nameWord => nameWord.includes(searchWord) || searchWord.includes(nameWord))
        ).length
        if (wordMatches > 0) {
          relevance += 150 + (wordMatches * 20)
        }
      }
      const nameLetters = productName.replace(/\s+/g, '')
      const termLetters = term.replace(/\s+/g, '')
      if (nameLetters.includes(termLetters)) {
        relevance += 100
      }
    }

    // PRIORITY 2: SPECIFICATIONS MATCHES
    let specMatchScore = 0
    if (product.specifications) {
      let specText = ''
      if (Array.isArray(product.specifications)) {
        specText = product.specifications
          .map((spec: any) => `${spec.name || ''} ${spec.value || ''}`)
          .join(' ')
          .toLowerCase()
      } else if (typeof product.specifications === 'object') {
        specText = Object.entries(product.specifications)
          .map(([key, value]) => `${key} ${value}`)
          .join(' ')
          .toLowerCase()
      }

      if (specText.includes(term)) {
        specMatchScore += 200
      }

      if (searchWords.length > 0) {
        const specWordMatches = searchWords.filter(word => specText.includes(word)).length
        if (specWordMatches > 0) {
          specMatchScore += 100 + (specWordMatches * 15)
        }
      }
    }

    // Also check productDetails array
    if (product.productDetails && Array.isArray(product.productDetails)) {
      const detailsText = product.productDetails
        .map((detail: any) => `${detail.name || ''} ${detail.value || ''}`)
        .join(' ')
        .toLowerCase()

      if (detailsText.includes(term)) {
        specMatchScore += 150
      }

      if (searchWords.length > 0) {
        const detailWordMatches = searchWords.filter(word => detailsText.includes(word)).length
        if (detailWordMatches > 0) {
          specMatchScore += 80 + (detailWordMatches * 10)
        }
      }
    }

    relevance += specMatchScore

    // PRIORITY 3: DESCRIPTION MATCHES
    if (productDescription) {
      if (productDescription.includes(term)) {
        relevance += 150
      }

      if (searchWords.length > 0) {
        const descWordMatches = searchWords.filter(word => productDescription.includes(word)).length
        if (descWordMatches > 0) {
          relevance += 80 + (descWordMatches * 10)
        }
      }
    }

    // PRIORITY 4: OTHER FIELDS
    if (productCategory && productCategory.includes(term)) {
      relevance += 100
    }

    if (productBrand && productBrand.includes(term)) {
      relevance += 90
    }

    if (productSubcategory && productSubcategory.includes(term)) {
      relevance += 85
    }

    // Tags matching
    if (product.tags && Array.isArray(product.tags)) {
      const tagMatches = product.tags.filter(tag =>
        tag.toLowerCase().includes(term)
      ).length
      if (tagMatches > 0) {
        relevance += 60 + (tagMatches * 10)
      }
    }

    // PRIORITY 5: ALL CONTENT COMBINED
    const allContent = [
      productName,
      productCategory,
      productDescription,
      productBrand,
      productSubcategory,
      product.specifications ? (Array.isArray(product.specifications)
        ? product.specifications.map((s: any) => `${s.name || ''} ${s.value || ''}`).join(' ')
        : Object.entries(product.specifications).map(([k, v]) => `${k} ${v}`).join(' ')) : '',
      product.tags ? product.tags.join(' ') : ''
    ].filter(Boolean).join(' ').toLowerCase()

    if (relevance < 100 && allContent.includes(term)) {
      relevance += 50
    }

    if (searchWords.length > 0 && relevance < 200) {
      const allContentWordMatches = searchWords.filter(word => allContent.includes(word)).length
      if (allContentWordMatches > 0) {
        relevance += 30 + (allContentWordMatches * 5)
      }
    }

    return relevance
  }

  // Search products with relevance calculation
  const searchProducts = async (query: string): Promise<Product[]> => {
    await new Promise(resolve => setTimeout(resolve, 500))

    const searchTerm = query.toLowerCase().trim()
    const results: Product[] = []

    for (const product of products) {
      const relevance = calculateRelevance(product, searchTerm)

      if (relevance > 0) {
        results.push({
          ...product,
          relevance
        })
      }
    }

    // Sort by relevance (highest first)
    results.sort((a, b) => (b.relevance || 0) - (a.relevance || 0))

    return results.slice(0, 10) // Limit to top 10 results
  }

  // Handle search input with debouncing
  const handleSearchInput = (value: string) => {
    setSearchQuery(value)

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Set new timeout for search (300ms delay like index.html)
    searchTimeoutRef.current = setTimeout(async () => {
      if (value.trim().length >= 2) {
        setIsSearching(true)
        setShowSearchResults(true)
        try {
          const results = await searchProducts(value.trim())
          setSearchResults(results)
        } catch (error) {
          console.error('Search error:', error)
        } finally {
          setIsSearching(false)
        }
      } else {
        setShowSearchResults(false)
        setSearchResults([])
      }
    }, 300)
  }

  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`
    }
  }

  // Handle search input focus
  const handleSearchFocus = () => {
    if (searchQuery.trim().length >= 2 && searchResults.length > 0) {
      setShowSearchResults(true)
    }
  }

  // Clear search
  const clearSearch = () => {
    setSearchQuery('')
    setSearchResults([])
    setShowSearchResults(false)
  }

  // Navigate to product
  const navigateToProduct = (product: Product) => {
    if (product.id) {
      window.location.href = `/products/${product.id}`
    } else {
      window.location.href = `/products?search=${encodeURIComponent(product.name || '')}`
    }
  }

  // Resolve image URL
  const resolveImageUrl = (url?: string) => {
    if (!url) return '/images/placeholder.png'
    if (/^https?:\/\//i.test(url)) return url
    return url.startsWith('/') ? url : `/${url}`
  }

  const handleCameraClick = () => {
    setCameraModalOpen(true)
  }

  return (
    <header className={styles.header}>
      <div className={styles.headerContent}>
        <div className={styles.headerTop}>
          {/* Left Section: Logo and Location */}
          <div className={styles.headerLeft}>
            <div className={styles.logo}>
              <Link href="/" className={styles.logoLink}>
                <Image
                  src="/LOGO/d__1_-removebg-preview.png"
                  alt="Deczon Logo"
                  width={300}
                  height={100}
                  priority
                  style={{ objectFit: 'contain', width: 'auto', height: 'auto', maxWidth: '300px', maxHeight: '100px', display: 'block', margin: 0, padding: 0 }}
                />
              </Link>
            </div>
            <div style={{ marginLeft: '16px' }}>
              <LocationSelector />
            </div>
          </div>

          {/* Center Section: Search Bar */}
          <div className={styles.headerSearch}>
            <div className={styles.searchInputGroup} ref={searchResultsRef}>
              <button type="button" className={styles.searchIconLeft} onClick={() => document.getElementById('searchInput')?.focus()}>
                {isSearching ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.spinning}>
                    <circle cx="12" cy="12" r="10" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                  </svg>
                )}
              </button>
              <form onSubmit={handleSearch} className={styles.searchForm}>
                <input
                  id="searchInput"
                  type="text"
                  placeholder="Search smart home products, services, or upload an image..."
                  value={searchQuery}
                  onChange={(e) => handleSearchInput(e.target.value)}
                  onFocus={handleSearchFocus}
                  className={styles.searchInput}
                />
              </form>
              <div className={styles.searchActions}>
                {searchQuery && (
                  <button
                    type="button"
                    className={styles.clearSearchBtn}
                    onClick={clearSearch}
                    title="Clear search"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                )}
                <button
                  type="button"
                  className={styles.cameraBtn}
                  onClick={handleCameraClick}
                  title="Take Photo or Upload Image"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                    <circle cx="12" cy="13" r="4"></circle>
                  </svg>
                </button>
              </div>

              {/* Search Results Dropdown */}
              {showSearchResults && (
                <div className={styles.searchResults}>
                  <div className={styles.searchResultsHeader}>
                    <span className={styles.resultsCount}>
                      {isSearching ? 'Searching...' : `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''} found`}
                    </span>
                    {searchQuery && (
                      <button className={styles.clearSearch} onClick={clearSearch}>
                        Clear
                      </button>
                    )}
                  </div>
                  <div className={styles.searchResultsList}>
                    {searchResults.length === 0 && !isSearching ? (
                      <div className={styles.searchResultItem}>
                        <div className={styles.searchResultInfo}>
                          <div className={styles.searchResultName}>No results found for "{searchQuery}"</div>
                          <div className={styles.searchResultCategory}>Try different keywords or use image search</div>
                        </div>
                      </div>
                    ) : (
                      searchResults.map((product) => (
                        <div
                          key={product.id}
                          className={styles.searchResultItem}
                          onClick={() => navigateToProduct(product)}
                        >
                          <img
                            src={resolveImageUrl(product.primaryImageUrl || product.imageUrl || product.image)}
                            alt={product.name || 'Product'}
                            className={styles.searchResultImage}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/images/placeholder.png'
                            }}
                          />
                          <div className={styles.searchResultInfo}>
                            <div className={styles.searchResultName}>{product.name || product.productName}</div>
                            <div className={styles.searchResultCategory}>
                              {product.category || product.mainCategory || 'General'}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Section: User Actions */}

          <div className={styles.headerRight}>
            <Link
              href={user ? "/account" : "/login"}
              className={styles.userSection}
              onClick={(e) => {
                if (!user && typeof window !== 'undefined') {
                  // Store current URL for redirect after login
                  const currentPath = window.location.pathname + window.location.search
                  if (currentPath !== '/login') {
                    localStorage.setItem('redirectAfterLogin', currentPath)
                  }
                }
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span>{userLabel}</span>
            </Link>
            <Link href="/cart" className={styles.cartSection}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
              <span>Cart</span>
              {cartCount > 0 && (
                <span className={styles.cartCount}>{cartCount}</span>
              )}
            </Link>
            <div className={styles.threeDotMenu} onClick={() => setDropdownOpen(!dropdownOpen)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="1"></circle>
                <circle cx="19" cy="12" r="1"></circle>
                <circle cx="5" cy="12" r="1"></circle>
              </svg>
              {dropdownOpen && (
                <div className={styles.dropdownMenu}>
                  <Link href="/wishlist">Wishlist</Link>
                  <Link href="/orders">Orders</Link>
                  <Link href="/account">Account</Link>
                  {user && auth && (
                    <a href="#" onClick={(e) => { e.preventDefault(); auth?.signOut(); }}>Logout</a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Camera Modal */}
        {cameraModalOpen && (
          <div className={styles.cameraModal} onClick={() => setCameraModalOpen(false)}>
            <div className={styles.cameraModalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.cameraModalHeader}>
                <h3>Image Search</h3>
                <button className={styles.closeBtn} onClick={() => setCameraModalOpen(false)}>×</button>
              </div>
              <div className={styles.cameraModalBody}>
                <p>Camera/Upload functionality will be implemented here.</p>
                <button onClick={() => setCameraModalOpen(false)}>Close</button>
              </div>
            </div>
          </div>
        )}

        {!hideCategoryNav && (
          <nav className={styles.mainNavbar}>
            <div className={styles.mobileMenuToggle} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
              </svg>
            </div>
            <ul className={`${styles.mainNavbarList} ${mobileMenuOpen ? styles.mobileOpen : ''}`} id="main-navbar-list">
              <li className={styles.mainNavbarItem}>
                <Link href="/products">All Categories</Link>
              </li>

              {categories.map((category) => (
                <li
                  key={category.name}
                  className={styles.mainNavbarItem}
                  onMouseEnter={() => setHoveredCategory(category.name)}
                  onMouseLeave={() => setHoveredCategory(null)}
                >
                  <Link href={`/products?mainCategory=${encodeURIComponent(category.name)}`}>
                    {category.name}
                  </Link>
                  {hoveredCategory === category.name && Object.keys(category.subcategories).length > 0 && (
                    <div className={styles.mainNavbarDropdown}>
                      <div className={styles.dropdownContent}>
                        <div className={styles.dropdownCategories}>
                          {Object.keys(category.subcategories).slice(0, 6).map((subcategory) => {
                            const subcategoryItems = category.subcategories[subcategory]
                            // Handle both array and object formats
                            const items = Array.isArray(subcategoryItems)
                              ? subcategoryItems
                              : (subcategoryItems?.items && Array.isArray(subcategoryItems.items))
                                ? subcategoryItems.items
                                : typeof subcategoryItems === 'object' && subcategoryItems !== null
                                  ? Object.keys(subcategoryItems)
                                  : []

                            return (
                              <div key={subcategory} className={styles.dropdownCategoryColumn}>
                                <h4>{subcategory}</h4>
                                <ul>
                                  {items.slice(0, 6).map((item: string, idx: number) => (
                                    <li key={idx}>
                                      <Link href={`/products?mainCategory=${encodeURIComponent(category.name)}&category=${encodeURIComponent(subcategory)}&subcategory=${encodeURIComponent(item)}`}>
                                        {item}
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </header>
  )
}

