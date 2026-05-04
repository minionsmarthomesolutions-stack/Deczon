'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { getServiceImageUrl } from '@/lib/serviceImageUtils'
import styles from '../products/products.module.css'

interface Service {
    id: string
    name?: string
    title?: string
    primaryImageUrl?: string
    imageUrl?: string
    startingPrice?: number
    minPrice?: number
    mainCategory?: string
    category?: string
    description?: string
    packages?: any
}

interface Category {
    name: string
    subcategories: Record<string, { items?: string[] }>
}

function ServicesContent() {
    const searchParams = useSearchParams()
    const [allServices, setAllServices] = useState<Service[]>([])
    const [filteredServices, setFilteredServices] = useState<Service[]>([])
    const [categories, setCategories] = useState<Record<string, Category>>({})
    const [loading, setLoading] = useState(true)
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
    const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null)
    const [selectedItem, setSelectedItem] = useState<string | null>(null)
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
    const [expandedSubcategories, setExpandedSubcategories] = useState<Set<string>>(new Set())
    const [sortBy, setSortBy] = useState('default')
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

    // Load initial data
    useEffect(() => {
        loadAllData()
    }, [])

    // Watch for URL parameter changes
    useEffect(() => {
        const mainCategory = searchParams.get('mainCategory')
        const category = searchParams.get('category')
        const subcategory = searchParams.get('subcategory')

        if (!mainCategory && !category && !subcategory) {
            setSelectedCategory(null)
            setSelectedSubcategory(null)
            setSelectedItem(null)
            return
        }

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

    // Build categories from services if categories are empty
    useEffect(() => {
        if (allServices.length > 0 && Object.keys(categories).length === 0) {
            const categoriesData: Record<string, Category> = {}

            allServices.forEach(service => {
                const mainCat = service.mainCategory || service.category
                const subCat = service.category

                if (mainCat) {
                    if (!categoriesData[mainCat]) {
                        categoriesData[mainCat] = {
                            name: mainCat,
                            subcategories: {}
                        }
                    }
                    if (subCat && subCat !== mainCat) {
                        if (!categoriesData[mainCat].subcategories[subCat]) {
                            categoriesData[mainCat].subcategories[subCat] = { items: [] }
                        }
                    }
                }
            })

            if (Object.keys(categoriesData).length > 0) {
                console.log('Built categories from services:', Object.keys(categoriesData))
                setCategories(categoriesData)
            }
        }
    }, [allServices, categories])

    useEffect(() => {
        filterServices()
    }, [allServices, selectedCategory, selectedSubcategory, selectedItem, sortBy])

    const loadAllData = async () => {
        try {
            await Promise.all([
                loadAllServices(),
                loadCategories()
            ])
        } catch (error) {
            console.error('Error loading data:', error)
        } finally {
            setLoading(false)
        }
    }

    const loadAllServices = async () => {
        try {
            const res = await fetch('/api/services')
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const data: any[] = await res.json()
            const services: Service[] = data.map((doc: any) => {
                const imageUrl = getServiceImageUrl(doc)
                return {
                    ...doc,
                    id: doc.id,
                    name: doc.name || doc.title,
                    primaryImageUrl: imageUrl,
                    imageUrl: imageUrl,
                    startingPrice: getServiceMinPrice(doc)
                } as Service
            })
            setAllServices(services)
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

    const filterServices = () => {
        let filtered = [...allServices]

        if (selectedSubcategory) {
            filtered = filtered.filter(service => {
                const serviceSubcategory = service.category?.toLowerCase() || ''
                const searchTerm = selectedSubcategory.toLowerCase()
                return serviceSubcategory === searchTerm
            })

            if (selectedCategory) {
                filtered = filtered.filter(service =>
                    service.mainCategory?.toLowerCase() === selectedCategory.toLowerCase() ||
                    service.category?.toLowerCase() === selectedCategory.toLowerCase()
                )
            }
        } else if (selectedCategory) {
            filtered = filtered.filter(service =>
                service.mainCategory?.toLowerCase() === selectedCategory.toLowerCase() ||
                service.category?.toLowerCase() === selectedCategory.toLowerCase()
            )
        }

        // Apply sorting
        if (sortBy === 'price-low') {
            filtered.sort((a, b) => (a.startingPrice || 0) - (b.startingPrice || 0))
        } else if (sortBy === 'price-high') {
            filtered.sort((a, b) => (b.startingPrice || 0) - (a.startingPrice || 0))
        } else if (sortBy === 'name') {
            filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        }

        setFilteredServices(filtered)
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

    const selectAllServices = () => {
        setSelectedCategory(null)
        setSelectedSubcategory(null)
        setSelectedItem(null)
    }

    const selectCategory = (mainCategory: string, subcategoryName: string, item?: string) => {
        setSelectedCategory(mainCategory)
        setSelectedSubcategory(subcategoryName)
        if (item) {
            setSelectedItem(item)
        } else {
            setSelectedItem(null)
        }
    }

    const renderFilters = () => (
        <>
            <h3>Categories</h3>

            <div className={styles.categoryTree} id="category-tree">
                <div className={styles.mainCategoryGroup}>
                    <div
                        className={`${styles.mainCategoryHeader} ${!selectedCategory ? styles.active : ''}`}
                        onClick={selectAllServices}
                    >
                        <span>All Services</span>
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
                            {Object.keys(categories[mainCategory].subcategories).map(subcategoryName => {
                                const subcategoryItems = categories[mainCategory].subcategories[subcategoryName]
                                const items = Array.isArray(subcategoryItems)
                                    ? subcategoryItems
                                    : (subcategoryItems?.items && Array.isArray(subcategoryItems.items))
                                        ? subcategoryItems.items
                                        : typeof subcategoryItems === 'object' && subcategoryItems !== null
                                            ? Object.keys(subcategoryItems).filter(key => key !== 'items')
                                            : []

                                return (
                                    <div key={subcategoryName} className={`${styles.categoryGroup} ${expandedSubcategories.has(subcategoryName) ? styles.expanded : ''}`}>
                                        <div
                                            className={`${styles.categoryHeader} ${expandedSubcategories.has(subcategoryName) ? styles.active : ''}`}
                                            onClick={() => toggleSubcategory(subcategoryName)}
                                        >
                                            {subcategoryName}
                                            <span className={styles.categoryArrow}>▼</span>
                                        </div>
                                        <div className={`${styles.subcategories} ${expandedSubcategories.has(subcategoryName) ? styles.expanded : ''}`}>
                                            {items.slice(0, 6).map((item: string, idx: number) => (
                                                <div
                                                    key={idx}
                                                    className={`${styles.subcategoryItem} ${selectedItem === item ? styles.active : ''}`}
                                                    onClick={() => selectCategory(mainCategory, subcategoryName, item)}
                                                >
                                                    {item}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>

            <button className={styles.clearFiltersBtn} onClick={selectAllServices}>
                Clear All Filters
            </button>
        </>
    )

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className={styles.loadingSpinner}>
                    <div className={styles.spinner}></div>
                    <p>Loading services...</p>
                </div>
            </div>
        )
    }

    return (
        <div className={styles.productsPage}>
            <div className={styles.container}>
                <div className={styles.pageHeader}>
                    <h1>Our Services</h1>
                    <p>Professional smart home and interior services</p>
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
                            {renderFilters()}
                        </div>
                    </div>

                    {/* Main Services Area */}
                    <div className={styles.productsMain}>
                        <div className={styles.productsHeader}>
                            <div className={styles.productsCount}>
                                {filteredServices.length} {filteredServices.length === 1 ? 'service' : 'services'} found
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
                            {filteredServices.map(service => {
                                const imageUrl = service.primaryImageUrl || service.imageUrl || '/placeholder.svg?height=280&width=280'
                                const startingPrice = service.startingPrice || service.minPrice || 0

                                return (
                                    <div
                                        key={service.id}
                                        className={styles.mixedItem}
                                    >
                                        <div className={styles.mixedItemImage}>
                                            <Link
                                                href={`/services/${service.id}`}
                                                style={{ display: 'block', width: '100%', height: '100%' }}
                                            >
                                                <Image
                                                    src={imageUrl}
                                                    alt={service.name || 'Service'}
                                                    width={280}
                                                    height={280}
                                                    unoptimized
                                                />
                                            </Link>
                                        </div>

                                        <div className={styles.mixedItemInfo}>
                                            <Link
                                                href={`/services/${service.id}`}
                                                style={{ textDecoration: 'none', color: 'inherit' }}
                                            >
                                                <h3 className={styles.mixedItemName}>{service.name}</h3>
                                            </Link>
                                            <div className={`${styles.mixedItemPrice} ${styles.servicesItemPrice}`}>
                                                <div className={styles.priceSection}>
                                                    <span className={styles.currentPrice}>
                                                        {startingPrice > 0 ? `Starting from ₹${startingPrice.toLocaleString('en-IN')}` : 'Contact for Price'}
                                                    </span>
                                                </div>
                                                <Link
                                                    href={`/services/${service.id}`}
                                                    className={styles.slideAddToCart}
                                                >
                                                    View Details
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Filter Overlay */}
            {mobileFiltersOpen && (
                <div className={styles.mobileFilterOverlay} onClick={() => setMobileFiltersOpen(false)}>
                    <div className={styles.mobileFilterSidebar} onClick={(e) => e.stopPropagation()}>
                        <button className={styles.mobileFilterClose} onClick={() => setMobileFiltersOpen(false)}>×</button>
                        <div className={styles.filtersContent}>
                            {renderFilters()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default function ServicesPage() {
    return (
        <Suspense fallback={
            <div className={styles.loading}>
                <div className={styles.loadingSpinner}>
                    <div className={styles.spinner}></div>
                    <p>Loading services...</p>
                </div>
            </div>
        }>
            <ServicesContent />
        </Suspense>
    )
}
