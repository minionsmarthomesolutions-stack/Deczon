'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import styles from './search.module.css'
import { db } from '@/lib/firebase'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { getServiceImageUrl } from '@/lib/serviceImageUtils'

// Common types
type ResultType = 'service' | 'product' | 'blog' | 'specialized' | 'company'
type TabType = 'all' | 'services' | 'products' | 'blogs' | 'companies'

// Standardized Search Result Interface
interface SearchResult {
    id: string
    type: ResultType
    title: string
    description: string
    image: string
    rating: number
    reviewCount: number
    location?: string
    price?: string
    priceLabel?: string
    isVerified?: boolean
    isSponsored?: boolean
    tags?: string[]
    categories?: string[]
    sku?: string
    brand?: string
    author?: string
    date?: string
    slug?: string  // important for linking
    relevance: number // core for sorting
    rawPrice?: number // for budget filter
    currentPrice?: number
    primaryImageUrl?: string
}

export default function SearchPage() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const currentQuery = searchParams?.get('q') || ''

    // Core State
    const [isLoading, setIsLoading] = useState(true)
    const [allResults, setAllResults] = useState<SearchResult[]>([])
    const [filteredResults, setFilteredResults] = useState<SearchResult[]>([])

    // Filter State
    const [activeTab, setActiveTab] = useState<TabType>('all')
    const [selectedCategories, setSelectedCategories] = useState<string[]>([])
    const [priceRange, setPriceRange] = useState<{ min: number, max: number }>({ min: 0, max: 1000000 })
    const [userPriceMax, setUserPriceMax] = useState<number>(100000)
    const [minRating, setMinRating] = useState<number>(0)
    const [verifiedOnly, setVerifiedOnly] = useState(false)
    const [instantBooking, setInstantBooking] = useState(false) // mock filter for now

    // Derived Data for Filters
    const [availableCategories, setAvailableCategories] = useState<string[]>([])
    const [maxPriceInResults, setMaxPriceInResults] = useState(100000)

    // Load Data
    useEffect(() => {
        const fetchAllData = async () => {
            setIsLoading(true)
            if (!db) {
                console.warn("Firebase DB not initialized")
                setIsLoading(false)
                return
            }

            const results: SearchResult[] = []
            const term = currentQuery.toLowerCase().trim()

            try {
                // 1. Fetch Products
                const productsSnap = await getDocs(collection(db, 'products'))
                productsSnap.forEach(doc => {
                    const data = doc.data()
                    const rel = calculateRelevance(data, term, 'product')
                    if (rel > 0) {
                        results.push({
                            id: doc.id,
                            type: 'product',
                            title: data.name || data.productName || 'Untitled Product',
                            description: data.description || data.desc || data.longDescription || '',
                            image: resolveImageUrl(data.primaryImageUrl || data.imageUrl || data.image),
                            rating: data.rating || 4.5, // fallback rating
                            reviewCount: data.reviewCount || Math.floor(Math.random() * 50) + 5,
                            price: formatPrice(data.price || data.currentPrice),
                            rawPrice: data.price || data.currentPrice || 0,
                            currentPrice: data.price || data.currentPrice || 0,
                            primaryImageUrl: data.primaryImageUrl || data.imageUrl || data.image,
                            priceLabel: 'Price',
                            categories: [data.category, data.mainCategory, data.subcategory].filter(Boolean),
                            tags: data.tags || [],
                            slug: data.slug || doc.id,
                            isVerified: true, // most products are internal/verified
                            relevance: rel
                        })
                    }
                })

                // 2. Fetch Services
                const servicesSnap = await getDocs(collection(db, 'services'))
                servicesSnap.forEach(doc => {
                    const data = doc.data()
                    const rel = calculateRelevance(data, term, 'service')
                    if (rel > 0) {
                        const minPrice = getServiceMinPrice(data)
                        results.push({
                            id: doc.id,
                            type: 'service',
                            title: data.name || data.title || 'Untitled Service',
                            description: data.description || data.shortDescription || '',
                            image: getServiceImageUrl(data) || '/placeholder.svg?height=300&width=400&text=Service',
                            rating: data.rating || 4.8,
                            reviewCount: data.reviews?.length || Math.floor(Math.random() * 100) + 10,
                            location: data.location || data.serviceArea || 'Available Online',
                            price: minPrice > 0 ? `₹${minPrice.toLocaleString()}` : 'Custom Quote',
                            rawPrice: minPrice,
                            priceLabel: 'Starting from',
                            categories: [data.category, 'Services'].filter(Boolean),
                            tags: data.features || [], // features act like tags
                            slug: data.slug || doc.id,
                            isVerified: data.isVerified ?? true,
                            relevance: rel
                        })
                    }
                })

                // 3. Fetch Blogs (optional if collection exists)
                // Assuming 'blogs' collection might exist based on header
                try {
                    const blogsSnap = await getDocs(collection(db, 'blogs'))
                    blogsSnap.forEach(doc => {
                        const data = doc.data()
                        const rel = calculateRelevance(data, term, 'blog')
                        if (rel > 0) {
                            results.push({
                                id: doc.id,
                                type: 'blog',
                                title: data.title || 'Untitled Blog',
                                description: data.excerpt || data.summary || '',
                                image: data.image || data.coverImage || '/placeholder.svg?height=300&width=400&text=Blog',
                                rating: 5, // Blogs generally don't have ratings exposed in search
                                reviewCount: 0,
                                author: data.author,
                                date: data.date, // formatted date string
                                slug: data.slug || doc.id,
                                relevance: rel,
                                priceLabel: '',
                                categories: [data.category, 'Blog'].filter(Boolean)
                            })
                        }
                    })
                } catch (e) {
                    // Ignore if blog collection doesn't exist
                    console.log('Blogs collection not found or empty')
                }

                // Sort by relevance
                results.sort((a, b) => b.relevance - a.relevance)

                setAllResults(results)

                // Extract unique categories for filter
                const cats = new Set<string>()
                let maxP = 0
                results.forEach(r => {
                    r.categories?.forEach(c => cats.add(c))
                    if (r.rawPrice && r.rawPrice > maxP) maxP = r.rawPrice
                })
                setAvailableCategories(Array.from(cats))
                if (maxP > 0) {
                    setMaxPriceInResults(maxP)
                    setUserPriceMax(maxP)
                }

            } catch (error) {
                console.error("Error fetching search results:", error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchAllData()
    }, [currentQuery]) // Re-run when query param changes

    // Unified Filtering Logic
    useEffect(() => {
        let res = allResults

        // 1. Tab Filter
        if (activeTab !== 'all') {
            if (activeTab === 'companies') {
                // Map 'company' tab logic if needed, currently we might treat services/vendors as companies
                // For now, let's assume 'specialized' or specific types
                res = res.filter(r => r.type === 'company')
            } else {
                // Remove 's' from end (products -> product) for simple matching
                const typeMatch = activeTab.slice(0, -1)
                res = res.filter(r => r.type === typeMatch)
            }
        }

        // 2. Category Filter
        if (selectedCategories.length > 0) {
            res = res.filter(r => r.categories?.some(c => selectedCategories.includes(c)))
        }

        // 3. Price Filter
        // Filter out items that have a price (rawPrice > 0) efficiently
        // Items with 0 price (like blogs or inquiry-only services) usually shouldn't be hidden by price filter unless strict
        res = res.filter(r => {
            if (!r.rawPrice) return true // keep items without price unless we want strictly priced items
            return r.rawPrice <= userPriceMax
        })

        // 4. Rating Filter
        if (minRating > 0) {
            res = res.filter(r => r.rating >= minRating)
        }

        // 5. Verified Filter
        if (verifiedOnly) {
            res = res.filter(r => r.isVerified)
        }

        setFilteredResults(res)

    }, [allResults, activeTab, selectedCategories, userPriceMax, minRating, verifiedOnly])


    const handleAddToCart = (e: React.MouseEvent, item: SearchResult) => {
        e.preventDefault()
        e.stopPropagation()

        if (typeof window !== 'undefined') {
            try {
                const cart = JSON.parse(localStorage.getItem('cart') || '[]')
                const idx = cart.findIndex((ci: any) => ci.id === item.id)

                if (idx >= 0) {
                    cart[idx].quantity += 1
                } else {
                    cart.push({
                        id: item.id,
                        name: item.title,
                        price: item.currentPrice || item.rawPrice || 0,
                        imageUrl: item.primaryImageUrl || item.image || '',
                        quantity: 1,
                        timestamp: new Date().toISOString(),
                        selectedColor: null
                    })
                }

                localStorage.setItem('cart', JSON.stringify(cart))
                window.dispatchEvent(new Event('cartUpdated'))

                // Simple feedback
                const btn = e.currentTarget as HTMLButtonElement
                const originalText = btn.innerText
                btn.innerText = 'Added!'
                setTimeout(() => { btn.innerText = originalText }, 2000)
            } catch (error) {
                console.error('Error adding to cart:', error)
            }
        }
    }

    const handleBuyNow = (e: React.MouseEvent, item: SearchResult) => {
        e.preventDefault()
        e.stopPropagation()

        if (typeof window !== 'undefined') {
            try {
                const cartItem = {
                    id: item.id,
                    name: item.title,
                    price: item.currentPrice || item.rawPrice || 0,
                    imageUrl: item.primaryImageUrl || item.image || '',
                    quantity: 1,
                    selectedColor: null,
                    timestamp: new Date().toISOString(),
                }

                localStorage.setItem('buyNowItem', JSON.stringify([cartItem]))
                router.push('/checkout?source=buyNow')
            } catch (error) {
                console.error('Error processing buy now:', error)
            }
        }
    }


    /* --- Helpers --- */

    const calculateRelevance = (item: any, term: string, type: string): number => {
        let score = 0
        const searchWords = term.split(/\s+/)

        const title = (item.name || item.title || item.productName || '').toLowerCase()
        const desc = (item.description || item.desc || item.shortDescription || '').toLowerCase()
        const brand = (item.brand || '').toLowerCase()
        const category = (item.category || item.mainCategory || '').toLowerCase()
        const tags = Array.isArray(item.tags) ? item.tags.join(' ').toLowerCase() : ''

        // Exact Title Match (High)
        if (title.includes(term)) score += 100
        else if (searchWords.every(w => title.includes(w))) score += 80

        // Category/Tag Match
        if (category.includes(term)) score += 60
        if (tags.includes(term)) score += 50

        // Description Match (Lower)
        if (desc.includes(term)) score += 20

        // Partial matches
        if (score === 0) {
            const partialMatch = searchWords.some(w => title.includes(w) || category.includes(w))
            if (partialMatch) score += 10
        }

        return score
    }

    const resolveImageUrl = (url?: string) => {
        if (!url) return '/placeholder.svg?height=300&width=400&text=Image'
        if (url.startsWith('http')) return url
        return url.startsWith('/') ? url : `/${url}`
    }

    const formatPrice = (price?: any) => {
        if (!price) return undefined
        const num = Number(price)
        if (isNaN(num)) return typeof price === 'string' ? price : undefined
        return `₹${num.toLocaleString()}`
    }

    const getServiceMinPrice = (service: any): number => {
        if (!service.packages) return 0
        const prices: number[] = []
        // Check for packages object structure
        if (typeof service.packages === 'object' && service.packages !== null) {
            Object.values(service.packages).forEach((pkg: any) => {
                if (pkg?.priceFrom) prices.push(Number(pkg.priceFrom))
                if (pkg?.priceTo) prices.push(Number(pkg.priceTo))
                if (pkg?.price) prices.push(Number(pkg.price))
            })
        }
        return prices.length > 0 ? Math.min(...prices) : 0
    }

    const renderStars = (rating: number) => {
        return (
            <div className={styles.stars}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                        key={star}
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill={star <= Math.round(rating) ? "currentColor" : "none"}
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                ))}
            </div>
        )
    }

    // Filter Change Handlers
    const toggleCategory = (cat: string) => {
        setSelectedCategories(prev =>
            prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
        )
    }

    // Tab Mapping
    const tabs: string[] = ['All', 'Services', 'Products', 'Blogs'] // simplified based on likely data

    return (
        <div className={styles.searchPage}>
            {/* Sticky Header Section */}
            <header className={styles.searchHeader}>
                <div className={styles.searchHeaderContainer}>
                    <div className={styles.queryTitle}>
                        Search results for <span className={styles.queryHighlight}>&apos;{currentQuery}&apos;</span>
                        <span className={styles.resultCount}>
                            ({filteredResults.length} results found)
                        </span>
                    </div>

                    <div className={styles.tabsContainer}>
                        {tabs.map((tab) => {
                            const value = tab.toLowerCase() as TabType
                            return (
                                <button
                                    key={value}
                                    className={`${styles.tab} ${activeTab === value ? styles.active : ''}`}
                                    onClick={() => setActiveTab(value)}
                                >
                                    {tab}
                                </button>
                            )
                        })}
                    </div>
                </div>
            </header>

            {/* Main Layout Grid */}
            <div className={styles.mainContainer}>
                {/* Left Filter Sidebar */}
                <aside className={styles.filterPanel}>
                    <div className={styles.filterHeader}>
                        <span>Filters</span>
                        <button className={styles.clearFilter} onClick={() => {
                            setSelectedCategories([])
                            setUserPriceMax(maxPriceInResults)
                            setMinRating(0)
                        }}>Clear All</button>
                    </div>

                    {/* Dynamic Category Filter */}
                    {availableCategories.length > 0 && (
                        <div className={styles.filterGroup}>
                            <div className={styles.filterTitle}>Category</div>
                            {availableCategories.slice(0, 8).map((cat) => (
                                <label key={cat} className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        className={styles.checkbox}
                                        checked={selectedCategories.includes(cat)}
                                        onChange={() => toggleCategory(cat)}
                                    />
                                    {cat}
                                </label>
                            ))}
                        </div>
                    )}

                    {/* Price Filter (Only show if we have items with price) */}
                    {maxPriceInResults > 0 && (
                        <div className={styles.filterGroup}>
                            <div className={styles.filterTitle}>Budget</div>
                            <div className={styles.rangeSlider}>
                                <input
                                    type="range"
                                    min="0"
                                    max={maxPriceInResults}
                                    value={userPriceMax}
                                    onChange={(e) => setUserPriceMax(Number(e.target.value))}
                                    style={{ width: '100%', accentColor: 'var(--accent-color)' }}
                                />
                            </div>
                            <div className={styles.priceInputs}>
                                <span style={{ fontSize: '14px', color: '#666' }}>Max: ₹{userPriceMax.toLocaleString()}</span>
                            </div>
                        </div>
                    )}



                    <div className={styles.filterGroup}>
                        <div className={styles.filterTitle}>Verification</div>
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                className={styles.checkbox}
                                checked={verifiedOnly}
                                onChange={(e) => setVerifiedOnly(e.target.checked)}
                            />
                            Verified Vendors Only
                        </label>
                    </div>
                </aside>

                {/* Results Content */}
                <main>
                    {isLoading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="50" strokeDashoffset="50" style={{ animation: 'spin 1s linear infinite' }}>
                                <circle cx="12" cy="12" r="10"></circle>
                            </svg>
                            <span>Searching catalogs...</span>
                            <style jsx>{`
                                @keyframes spin { 100% { transform: rotate(360deg); } }
                            `}</style>
                        </div>
                    ) : filteredResults.length > 0 ? (
                        <div className={styles.resultsGrid}>
                            {filteredResults.map((item) => (
                                <Link
                                    key={`${item.type}-${item.id}`}
                                    href={item.type === 'product' ? `/products/${item.slug}` : item.type === 'service' ? `/services/${item.slug}` : `#`}
                                    style={{ textDecoration: 'none', color: 'inherit' }}
                                >
                                    <div className={styles.card}>
                                        <div className={styles.cardImageWrapper}>
                                            <span className={styles.cardBadge}>{item.type}</span>
                                            {item.isVerified && (
                                                <div className={styles.verifiedBadge} title="Verified Vendor">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                        <polyline points="20 6 9 17 4 12"></polyline>
                                                    </svg>
                                                </div>
                                            )}
                                            {item.isSponsored && <div className={styles.sponsoredLabel}>Sponsored</div>}
                                            <Image
                                                src={item.image}
                                                alt={item.title}
                                                className={styles.cardImage}
                                                width={400}
                                                height={300}
                                                unoptimized
                                            />
                                        </div>

                                        <div className={styles.cardContent}>
                                            <h3 className={styles.cardTitle}>{item.title}</h3>
                                            <p className={styles.cardDesc}>{item.description}</p>



                                            <div style={{ marginTop: 'auto' }}>
                                                {item.price && (
                                                    <div style={{ marginBottom: '12px' }}>
                                                        <div className={styles.priceLabel}>{item.priceLabel || 'Price'}</div>
                                                        <div className={styles.priceValue}>{item.price}</div>
                                                    </div>
                                                )}

                                                <div className={styles.cardActions}>
                                                    {item.type === 'product' ? (
                                                        <>
                                                            <button
                                                                className={styles.btnDetails}
                                                                onClick={(e) => handleAddToCart(e, item)}
                                                            >
                                                                Add to Cart
                                                            </button>
                                                            <button
                                                                className={styles.btnAction}
                                                                onClick={(e) => handleBuyNow(e, item)}
                                                            >
                                                                Buy Now
                                                            </button>
                                                        </>
                                                    ) : item.type === 'service' ? (
                                                        <>
                                                            <span className={styles.btnDetails}>
                                                                View Details
                                                            </span>
                                                            <button
                                                                className={styles.btnAction}
                                                                onClick={(e) => {
                                                                    e.preventDefault()
                                                                    e.stopPropagation()
                                                                    window.location.href = `/services/${item.slug}`
                                                                }}
                                                            >
                                                                Get Quote
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <span className={styles.btnDetails} style={{ width: '100%', gridColumn: '1 / -1' }}>
                                                            View Details
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className={styles.noResults}>
                            <div className={styles.noResultsIcon}>
                                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                </svg>
                            </div>
                            <h3 className={styles.noResultsTitle}>No results found for &apos;{currentQuery}&apos;</h3>
                            <p className={styles.noResultsText}>Try checking your spelling or use different keywords.</p>
                            <Link href="/" className={styles.backButton}>Back to Home</Link>
                        </div>
                    )}
                </main>
            </div>

            {/* SEO Section (Static for now, could be dynamic based on query) */}

        </div>
    )
}
