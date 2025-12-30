'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

import ServicesSection from '@/components/ServicesSection'
import BlogSection from '@/components/BlogSection'
import { db } from '@/lib/firebase'
import { doc, getDoc, collection, getDocs, query, where, limit, orderBy } from 'firebase/firestore'
import { getServiceImageUrl, extractAllImages } from '@/lib/serviceImageUtils'
import styles from './service-detail.module.css'

interface Service {
    id: string
    slug?: string
    name?: string
    category?: string
    description?: string
    imageUrl?: string
    primaryImageUrl?: string
    imageUrls?: string[]
    galleryImages?: string[] | { main?: string } | Record<string, any>
    images?: string[]
    secondaryImages?: string[]
    additionalImages?: string[]
    photoUrls?: string[]
    gallery?: string[] | Record<string, any>
    packages?: {
        [key: string]: {
            price?: number
            priceFrom?: number
            priceTo?: number
            priceInfo?: string
            includedFeatures?: Array<{ text: string }>
            features?: string[]
            description?: string
        }
    }
    status?: string
    [key: string]: any // Allow additional fields from Firebase
}

interface Package {
    type: string
    price: number
    priceInfo: string
    features: string[]
}

export default function ServiceDetailPage() {
    const params = useParams()
    const router = useRouter()
    const slug = params?.slug as string

    const [service, setService] = useState<Service | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)
    const [selectedPackage, setSelectedPackage] = useState<string | null>(null)
    const [squareFeet, setSquareFeet] = useState<number>(0)
    const [relatedServices, setRelatedServices] = useState<Service[]>([])
    const [relatedProducts, setRelatedProducts] = useState<any[]>([])

    // Modal states
    const [addToCartModalOpen, setAddToCartModalOpen] = useState(false)
    const [buyNowModalOpen, setBuyNowModalOpen] = useState(false)
    const [enquiryModalOpen, setEnquiryModalOpen] = useState(false)

    // Enquiry form state
    const [enquiryForm, setEnquiryForm] = useState({
        name: '',
        phone: '',
        location: '',
        message: '',
        email: ''
    })

    // Gallery state
    const [mainImage, setMainImage] = useState<string>('')
    const [galleryImages, setGalleryImages] = useState<string[]>([])

    useEffect(() => {
        if (slug) {
            loadServiceDetail()
        }
    }, [slug])

    // Initialize first package as selected when packages are loaded
    useEffect(() => {
        if (service && service.packages) {
            const packageOrder = ['basic', 'premium', 'elite']
            const firstAvailablePackage = packageOrder.find(type => service.packages![type])
            if (firstAvailablePackage && !selectedPackage) {
                setSelectedPackage(firstAvailablePackage)
            }
        }
    }, [service, selectedPackage, squareFeet])


    const loadServiceDetail = async () => {
        if (!slug || !db) {
            setError(true)
            setLoading(false)
            return
        }

        try {
            let serviceData: Service | null = null;

            // Try fetching by slug first
            try {
                const q = query(collection(db, 'services'), where('slug', '==', slug), limit(1));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    const doc = querySnapshot.docs[0];
                    serviceData = { id: doc.id, ...doc.data() } as Service;
                }
            } catch (err) {
                console.error('Error fetching by slug:', err);
            }

            // Fallback: Try identifying as ID if slug fetch failed or returned empty
            if (!serviceData) {
                try {
                    const serviceDoc = await getDoc(doc(db, 'services', slug));
                    if (serviceDoc.exists()) {
                        serviceData = { id: serviceDoc.id, ...serviceDoc.data() } as Service;
                    }
                } catch (err) {
                    console.error('Error fetching by ID:', err);
                }
            }

            if (!serviceData) {
                setError(true)
                setLoading(false)
                return
            }

            setService(serviceData)

            // Setup gallery images with proper Firebase URL formatting
            const mainImg = getServiceImageUrl(serviceData, '/placeholder.svg?height=400&width=600&text=Service')
            const allImages = extractAllImages(serviceData)

            // Remove duplicates and ensure main image is first
            const uniqueImages = Array.from(new Set(allImages))
            const otherImages = uniqueImages.filter(img => img !== mainImg)

            const finalMainImage = mainImg || otherImages[0] || '/placeholder.svg?height=400&width=600&text=Service'
            const galleryImages = otherImages.filter(img => img && img !== finalMainImage).slice(0, 4)

            // Debug logging for troubleshooting - compare HTML vs Next.js
            if (serviceData.name?.toLowerCase().includes('saloon')) {
                console.debug('Service detail page', {
                    id: serviceData.id,
                    name: serviceData.name,
                    slug: serviceData.slug,
                    resolvedMainImage: finalMainImage,
                    allImagesCount: allImages.length,
                    allImages: allImages,
                    fields: {
                        primaryImageUrl: serviceData.primaryImageUrl,
                        imageUrl: serviceData.imageUrl,
                        imageUrls: serviceData.imageUrls,
                        galleryImages: serviceData.galleryImages,
                        images: serviceData.images,
                        secondaryImages: serviceData.secondaryImages,
                        additionalImages: serviceData.additionalImages,
                        photoUrls: serviceData.photoUrls
                    }
                })
            }

            setMainImage(finalMainImage)
            setGalleryImages(galleryImages)

            // Load related items
            await loadRelatedItems(serviceData)

        } catch (error) {
            console.error('Error loading service:', error)
            setError(true)
        } finally {
            setLoading(false)
        }
    }

    const loadRelatedItems = async (currentService: Service) => {
        if (!db) return

        try {
            // Load related services (same category, exclude current)
            if (currentService.category) {
                const servicesQuery = query(
                    collection(db, 'services'),
                    where('category', '==', currentService.category),
                    where('status', '==', 'active'),
                    limit(4)
                )
                const servicesSnapshot = await getDocs(servicesQuery)
                const services = servicesSnapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() } as Service))
                    .filter(s => s.id !== currentService.id)
                setRelatedServices(services.slice(0, 4))
            }

            // Load related products (same category)
            if (currentService.category) {
                try {
                    const productsQuery = query(
                        collection(db, 'products'),
                        where('category', '==', currentService.category),
                        limit(4)
                    )
                    const productsSnapshot = await getDocs(productsQuery)
                    const products = productsSnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }))
                    console.log('Related products loaded:', products.length)
                    setRelatedProducts(products.slice(0, 4))
                } catch (productError) {
                    console.error('Error loading related products:', productError)
                    setRelatedProducts([])
                }
            } else {
                setRelatedProducts([])
            }
        } catch (error) {
            console.error('Error loading related items:', error)
        }
    }

    const changeMainImage = (imageUrl: string) => {
        setMainImage(imageUrl)
    }

    const getPackages = (): Package[] => {
        if (!service?.packages) return []

        const packageOrder = ['basic', 'premium', 'elite']
        const packages: Package[] = []

        packageOrder.forEach(type => {
            const pkg = service.packages![type]
            if (pkg) {
                const price = pkg.price || pkg.priceFrom || 0
                const priceInfo = pkg.priceInfo || `Starting from ₹${price.toLocaleString('en-IN')}`
                const features = pkg.includedFeatures?.map(f => f.text) || pkg.features || []

                packages.push({
                    type,
                    price,
                    priceInfo,
                    features
                })
            }
        })

        return packages
    }

    const calculatePrice = (pkg: Package, area: number = squareFeet): number => {
        if (!area || area < 100) return 0
        const basePrice = pkg.price || 0
        if (basePrice === 0) return 0
        // Calculate price per sq ft (assuming base price is for 1 sq ft)
        const pricePerSqFt = basePrice / 1
        const totalPrice = pricePerSqFt * area
        return totalPrice
    }

    const addServiceToCart = () => {
        if (!service || !selectedPackage || !squareFeet) return

        const pkg = getPackages().find(p => p.type === selectedPackage)
        if (!pkg) return

        const calculatedPrice = calculatePrice(pkg)
        const advanceAmount = Math.round(calculatedPrice * 0.1) // 10% advance

        try {
            const cart = JSON.parse(localStorage.getItem('cart') || '[]')

            const cartItem = {
                id: `${service.id}-${selectedPackage}`,
                name: `${service.name} - ${selectedPackage.charAt(0).toUpperCase() + selectedPackage.slice(1)} Package`,
                price: advanceAmount,
                originalPrice: calculatedPrice,
                imageUrl: mainImage || service.primaryImageUrl || '/placeholder.svg',
                quantity: 1,
                type: 'service',
                squareFeet: squareFeet,
                packageType: selectedPackage,
                serviceId: service.id
            }

            // Check if item already exists
            const existingIndex = cart.findIndex((item: any) =>
                item.serviceId === service.id &&
                item.packageType === selectedPackage &&
                item.squareFeet === squareFeet
            )

            if (existingIndex >= 0) {
                // Update specific item? Or just overwrite?
                // For services with different square feet, maybe treat as different items or update.
                // Here we just replace or update.
                cart[existingIndex] = cartItem
            } else {
                cart.push(cartItem)
            }

            localStorage.setItem('cart', JSON.stringify(cart))
            window.dispatchEvent(new Event('cartUpdated'))
            return true
        } catch (error) {
            console.error('Error adding to cart:', error)
            alert('Failed to add to cart')
            return false
        }
    }

    const handleAddToCart = async (e: React.FormEvent) => {
        e.preventDefault()
        if (addServiceToCart()) {
            setAddToCartModalOpen(false)
            alert('Service added to cart successfully!')
        }
    }

    const handleBuyNow = async (e: React.FormEvent) => {
        e.preventDefault()

        // Exact logic from addServiceToCart but saves to 'buyNowItem'
        if (!service || !selectedPackage || !squareFeet) return

        const pkg = getPackages().find(p => p.type === selectedPackage)
        if (!pkg) return

        const calculatedPrice = calculatePrice(pkg)
        const advanceAmount = Math.round(calculatedPrice * 0.1) // 10% advance

        const cartItem = {
            id: `${service.id}-${selectedPackage}`,
            name: `${service.name} - ${selectedPackage.charAt(0).toUpperCase() + selectedPackage.slice(1)} Package`,
            price: advanceAmount,
            originalPrice: calculatedPrice,
            imageUrl: mainImage || service.primaryImageUrl || '/placeholder.svg',
            quantity: 1,
            type: 'service',
            squareFeet: squareFeet,
            packageType: selectedPackage,
            serviceId: service.id
        }

        localStorage.setItem('buyNowItem', JSON.stringify([cartItem]))
        router.push('/checkout?source=buyNow')
    }

    const handleEnquiry = async (e: React.FormEvent) => {
        e.preventDefault()

        // Submit enquiry logic here
        console.log('Enquiry submitted:', enquiryForm)

        // Close modal and reset form
        setEnquiryModalOpen(false)
        setEnquiryForm({ name: '', phone: '', location: '', message: '', email: '' })
    }

    if (loading) {
        return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>Loading...</div>
    }

    if (error || !service) {
        return (
            <div className={styles.error}>
                <h2>Service Not Found</h2>
                <p>The service you&apos;re looking for doesn&apos;t exist.</p>
                <Link href="/services" className={styles.btnPrimary}>
                    Back to Services
                </Link>
            </div>
        )
    }

    const packages = getPackages()

    return (
        <div className={styles.serviceContainer}>
            {/* Category Tag */}
            <div className={styles.categoryTag}>{service.category || 'Service'}</div>

            {/* Breadcrumb */}
            <div className={styles.breadcrumb}>
                <Link href="/">Home</Link>
                <span>/</span>
                <Link href="/services">Services</Link>
                <span>/</span>
                <span>{service.name || 'Service'}</span>
            </div>

            {/* Service Hero Section */}
            <div className={styles.serviceHero}>
                <div className={styles.serviceInfo}>
                    <h1 className={styles.serviceTitle}>{service.name || 'Service'}</h1>
                    <div
                        className={styles.serviceDescription}
                        dangerouslySetInnerHTML={{ __html: service.description || 'No description available' }}
                    />
                    <div className={styles.actionButtonsContainer}>
                        <div className={styles.primaryActions}>
                            <button
                                className={styles.btnCart}
                                onClick={() => setAddToCartModalOpen(true)}
                            >
                                🛒 Add to Cart
                            </button>
                            <button
                                className={styles.btnBuy}
                                onClick={() => setBuyNowModalOpen(true)}
                            >
                                💳 Buy Now
                            </button>
                            <button
                                className={styles.btnEnquiry}
                                onClick={() => setEnquiryModalOpen(true)}
                            >
                                📩 Enquiry
                            </button>
                        </div>
                    </div>
                </div>

                <div className={styles.serviceVisual}>
                    <div className={styles.photoGallery} id="photo-gallery">
                        {/* Dark Panel - Column 1, spans all rows (first in DOM for proper stacking) */}
                        <div className={styles.galleryDarkPanel}></div>

                        {/* Large Featured Image - div1 */}
                        <div
                            className={styles.galleryMain}
                            onClick={() => changeMainImage(mainImage)}
                        >
                            <img
                                src={mainImage}
                                alt={service.name || 'Service'}
                                id="main-gallery-image"
                                className={styles.mainGalleryImage}
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement
                                    if (!target.src.includes('placeholder.svg')) {
                                        target.src = '/placeholder.svg?height=400&width=600&text=Service'
                                    }
                                    target.onerror = null
                                }}
                            />
                        </div>

                        {/* Vertical Text Panel */}
                        <div className={styles.galleryTextPanel}>
                            <div className={styles.verticalText}>
                                <div className={styles.year}>2024 - 2025</div>
                                <div className={styles.catalogue}>Smart Solutions</div>
                            </div>
                        </div>

                        {/* Small Gallery Images - direct children of photoGallery */}
                        {/* gallerySmall1 = grid-item-4, gallerySmall2 = grid-item-5, gallerySmall3 = grid-item-6, gallerySmall4 = grid-item-2 */}
                        {galleryImages.slice(0, 4).map((image, index) => {
                            // Map indices: 0->item4, 1->item5, 2->item6, 3->item2
                            const itemMapping = ['gallerySmall1', 'gallerySmall2', 'gallerySmall3', 'gallerySmall4']
                            return (
                                <div
                                    key={index}
                                    className={`${styles.gallerySmall} ${styles[itemMapping[index]]}`}
                                    onClick={() => changeMainImage(image)}
                                >
                                    <img
                                        src={image}
                                        alt={`${service.name} ${index + 1}`}
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement
                                            target.src = '/placeholder.svg?height=200&width=300'
                                        }}
                                    />
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Packages Section */}
            {packages.length > 0 && (
                <div className={styles.packagesSection} id="packages-section">
                    <div className={styles.packagesGrid}>
                        {packages.map((pkg) => {
                            // Package logos as base64 SVG (matching HTML) - yellow background
                            const packageLogos: Record<string, string> = {
                                basic: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#ffd700"/><path fill="#000000" d="M10,20V14H14V20H18V12H12V10H10V12H6V20H10Z"/></svg>'),
                                premium: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTIiIGZpbGw9IiNmZmQ3MDAiLz48cGF0aCBmaWxsPSIjMDAwMDAwIiBkPSJNMTIsMTcuMjdMMTguMTgsMjFMMTYuNTQsMTMuOTdMMjIsOS4yNEwxNC44MSw4LjYyTDEyLDJMMTAuMTksOC42MkwzLDkuMjQsOC40NiwxMy45N0w3LjEsMjFNMTIsMTUuNEwxMC4yNCwxOS42TDExLjEsMTQuNDYsNy41LDExLjgxTDEyLjEyLDExLjJMMTIsNkwxMS44OCwxMS4yTDE2LjUsMTEuODFMMTIuOSwxNC40NkwxMy43NiwxOS42IiAvPjwvc3ZnPg==',
                                elite: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTIiIGZpbGw9IiNmZmQ3MDAiLz48cGF0aCBmaWxsPSIjMDAwMDAwIiBkPSJNMTIsMkwxNSw2SDE5TDE2LDEwTDIwLDEyTDE3LDE1TDE1LDE2TDEyLDE0TDksMTZMNywxMkg1TDgsMTBMNSw2SDlNMTIsOEwxMCwxMEgxNEwxMiwxMloiLz48L3N2Zz4='
                            }

                            return (
                                <div
                                    key={pkg.type}
                                    className={styles.packageCard}
                                    onClick={() => router.push(`/package-details?service=${service?.id}&package=${pkg.type}`)}
                                >
                                    <div className={styles.packageLogo}>
                                        <img
                                            src={packageLogos[pkg.type] || packageLogos.basic}
                                            alt={`${pkg.type} Package Logo`}
                                        />
                                    </div>
                                    <div className={styles.packageName}>
                                        {pkg.type.charAt(0).toUpperCase() + pkg.type.slice(1)}
                                    </div>
                                    <div className={styles.packagePrice}>{pkg.priceInfo}</div>
                                    <a
                                        href={`/package-details?service=${service?.id}&package=${pkg.type}`}
                                        className={styles.btnEnquiryPackage}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        Enquire Now
                                    </a>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Related Services/Products Section */}
            {(relatedServices.length > 0 || relatedProducts.length > 0) && (
                <div className={styles.relatedSection}>
                    {relatedServices.length > 0 && (
                        <>
                            <h2 className={styles.sectionTitle}>Related Services</h2>
                            <div className={styles.servicesSectionWrapper}>
                                <ServicesSection
                                    services={relatedServices.map(s => ({ ...s, name: s.name || 'Service', slug: s.slug }))}
                                    title=""
                                    subtitle=""
                                    showSeeAll={false}
                                />
                            </div>
                        </>
                    )}

                    {relatedProducts.length > 0 && (
                        <>
                            <h2 className={styles.sectionTitle} style={{ marginTop: relatedServices.length > 0 ? '60px' : '0' }}>
                                Related Products
                            </h2>
                            <div className={`${styles.relatedGrid} ${styles.productsGrid}`}>
                                {relatedProducts.map((product) => (
                                    <Link
                                        key={product.id}
                                        href={`/products/${product.slug || product.id}`}
                                        className={styles.relatedCard}
                                    >
                                        <div className={styles.relatedImage}>
                                            <Image
                                                src={product.primaryImageUrl || product.imageUrl || '/placeholder.svg'}
                                                alt={product.name || 'Product'}
                                                width={280}
                                                height={280}
                                                unoptimized
                                            />
                                        </div>
                                        <div className={styles.relatedInfo}>
                                            <h3>{product.name}</h3>
                                            <p className={styles.relatedPrice}>
                                                ₹{(product.currentPrice || 0).toLocaleString('en-IN')}
                                            </p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Add to Cart Modal */}
            {addToCartModalOpen && (
                <div className={`${styles.modalOverlay} ${styles.active}`} onClick={() => setAddToCartModalOpen(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>Add to Cart</h3>
                            <button
                                className={styles.closeModal}
                                onClick={() => setAddToCartModalOpen(false)}
                            >
                                &times;
                            </button>
                        </div>

                        <div className={styles.paymentNote}>
                            <div className={styles.noteIcon}>ℹ️</div>
                            <div className={styles.noteText}>
                                <strong>Payment Note:</strong> This payment is only 10% of the tentative total amount. Final cost will vary based on design, package, and selected services.
                            </div>
                        </div>

                        <form onSubmit={handleAddToCart} id="addToCartForm">
                            <div className={styles.formSection}>
                                <div className={styles.formGroup}>
                                    <label className={`${styles.formLabel} ${styles.required}`} htmlFor="cartSquareFeet">
                                        Approximate Total squareFeet
                                    </label>
                                    <div className={styles.areaInputContainer}>
                                        <input
                                            type="number"
                                            className={styles.formControl}
                                            id="cartSquareFeet"
                                            required
                                            min="100"
                                            step="50"
                                            placeholder="Enter area"
                                            value={squareFeet || ''}
                                            onChange={(e) => setSquareFeet(Number(e.target.value))}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className={styles.formSection}>
                                <div className={styles.sectionTitle}>
                                    <span>📦</span>
                                    Select Package
                                </div>
                                <div className={styles.packagesSelectionGrid} id="cartPackageOptions">
                                    {packages.map((pkg) => {
                                        const packageLogos: Record<string, string> = {
                                            basic: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#ffd700"/><path fill="#000000" d="M10,20V14H14V20H18V12H12V10H10V12H6V20H10Z"/></svg>'),
                                            premium: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTIiIGZpbGw9IiNmZmQ3MDAiLz48cGF0aCBmaWxsPSIjMDAwMDAwIiBkPSJNMTIsMTcuMjdMMTguMTgsMjFMMTYuNTQsMTMuOTdMMjIsOS4yNEwxNC44MSw4LjYyTDEyLDJMMTAuMTksOC42MkwzLDkuMjQsOC40NiwxMy45N0w3LjEsMjFNMTIsMTUuNEwxMC4yNCwxOS42TDExLjEsMTQuNDYsNy41LDExLjgxTDEyLjEyLDExLjJMMTIsNkwxMS44OCwxMS4yTDE2LjUsMTEuODFMMTIuOSwxNC40NkwxMy43NiwxOS42IiAvPjwvc3ZnPg==',
                                            elite: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTIiIGZpbGw9IiNmZmQ3MDAiLz48cGF0aCBmaWxsPSIjMDAwMDAwIiBkPSJNMTIsMkwxNSw2SDE5TDE2LDEwTDIwLDEyTDE3LDE1TDE1LDE2TDEyLDE0TDksMTZMNywxMkg1TDgsMTBMNSw2SDlNMTIsOEwxMCwxMEgxNEwxMiwxMloiLz48L3N2Zz4='
                                        }

                                        return (
                                            <div
                                                key={pkg.type}
                                                className={`${styles.packageOption} ${selectedPackage === pkg.type ? styles.selected : ''}`}
                                                onClick={() => setSelectedPackage(pkg.type)}
                                                data-type={pkg.type}
                                                data-price={pkg.price || 0}
                                            >
                                                <div className={styles.packageSelectionLogo}>
                                                    <img
                                                        src={packageLogos[pkg.type] || packageLogos.basic}
                                                        alt={`${pkg.type} Package Logo`}
                                                    />
                                                </div>
                                                <div className={styles.packageSelectionName}>
                                                    {pkg.type.charAt(0).toUpperCase() + pkg.type.slice(1)}
                                                </div>
                                                <div className={styles.packageSelectionPrice}>{pkg.priceInfo}</div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {selectedPackage && (
                                <div className={styles.calculationDisplay} id="cartCalculation">
                                    <div className={styles.calculationHeader}>
                                        <div className={styles.calculationIcon}>💰</div>
                                        <h4>Price Calculation</h4>
                                    </div>
                                    {(() => {
                                        const selectedPkg = packages.find(p => p.type === selectedPackage)!
                                        const basePrice = selectedPkg.price || 0
                                        const currentArea = squareFeet || 0

                                        if (!currentArea || currentArea < 100) {
                                            return (
                                                <>
                                                    <div className={styles.calculationRow}>
                                                        <span className={styles.calculationLabel}>Package:</span>
                                                        <span className={styles.calculationValue}>{selectedPackage.charAt(0).toUpperCase() + selectedPackage.slice(1)}</span>
                                                    </div>
                                                    <div className={styles.calculationRow}>
                                                        <span className={styles.calculationLabel}>Area:</span>
                                                        <span className={styles.calculationValue}>Enter area above</span>
                                                    </div>
                                                </>
                                            )
                                        }

                                        const pricePerSqFt = basePrice > 0 ? basePrice / 1 : 0
                                        const totalPrice = pricePerSqFt * currentArea
                                        const advanceAmount = totalPrice * 0.1

                                        if (basePrice === 0) {
                                            return (
                                                <>
                                                    <div className={styles.calculationRow}>
                                                        <span className={styles.calculationLabel}>Package:</span>
                                                        <span className={styles.calculationValue}>{selectedPackage.charAt(0).toUpperCase() + selectedPackage.slice(1)}</span>
                                                    </div>
                                                    <div className={styles.calculationRow}>
                                                        <span className={styles.calculationLabel}>Area:</span>
                                                        <span className={styles.calculationValue}>{currentArea.toLocaleString('en-IN')} sq ft</span>
                                                    </div>
                                                    <div className={styles.calculationTotal}>
                                                        <div style={{ textAlign: 'center' }}>
                                                            <span>Price on Enquiry</span><br />
                                                            <small style={{ fontSize: '14px', opacity: 0.8 }}>Contact us for detailed pricing</small>
                                                        </div>
                                                    </div>
                                                </>
                                            )
                                        }

                                        return (
                                            <>
                                                <div className={styles.calculationRow}>
                                                    <span className={styles.calculationLabel}>Package:</span>
                                                    <span className={styles.calculationValue}>{selectedPackage.charAt(0).toUpperCase() + selectedPackage.slice(1)}</span>
                                                </div>
                                                <div className={styles.calculationRow}>
                                                    <span className={styles.calculationLabel}>Rate per sq ft:</span>
                                                    <span className={styles.calculationValue}>₹{pricePerSqFt.toFixed(2)}</span>
                                                </div>
                                                <div className={styles.calculationRow}>
                                                    <span className={styles.calculationLabel}>Area:</span>
                                                    <span className={styles.calculationValue}>{currentArea.toLocaleString('en-IN')} sq ft</span>
                                                </div>
                                                <div className={styles.calculationTotal}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span>Total Price:</span>
                                                        <span>₹{totalPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                                    </div>
                                                </div>
                                                <div className={styles.advanceHighlight}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                        <span>Advance (10%):</span>
                                                        <span>₹{advanceAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                                    </div>
                                                </div>
                                            </>
                                        )
                                    })()}
                                </div>
                            )}

                            <div className={styles.formActions}>
                                <button
                                    type="button"
                                    className={styles.btnCancel}
                                    onClick={() => setAddToCartModalOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className={styles.btnSubmit}
                                    disabled={!selectedPackage || !squareFeet || squareFeet < 100}
                                >
                                    🛒 Add to Cart
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Buy Now Modal */}
            {buyNowModalOpen && (
                <div className={`${styles.modalOverlay} ${styles.active}`} onClick={() => setBuyNowModalOpen(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>Buy Now</h3>
                            <button
                                className={styles.closeModal}
                                onClick={() => setBuyNowModalOpen(false)}
                            >
                                &times;
                            </button>
                        </div>

                        <div className={styles.paymentNote}>
                            <div className={styles.noteIcon}>ℹ️</div>
                            <div className={styles.noteText}>
                                <strong>Payment Note:</strong> This payment is only 10% of the tentative total amount. Final cost will vary based on design, package, and selected services.
                            </div>
                        </div>

                        <form onSubmit={handleBuyNow} id="buyNowForm">
                            <div className={styles.formSection}>
                                <div className={styles.formGroup}>
                                    <label className={`${styles.formLabel} ${styles.required}`} htmlFor="buySquareFeet">
                                        Approximate Total squareFeet
                                    </label>
                                    <div className={styles.areaInputContainer}>
                                        <input
                                            type="number"
                                            className={styles.formControl}
                                            id="buySquareFeet"
                                            required
                                            min="100"
                                            step="50"
                                            placeholder="Enter area"
                                            value={squareFeet || ''}
                                            onChange={(e) => setSquareFeet(Number(e.target.value))}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className={styles.formSection}>
                                <div className={styles.sectionTitle}>
                                    <span>📦</span>
                                    Select Package
                                </div>
                                <div className={styles.packagesSelectionGrid} id="buyPackageOptions">
                                    {packages.map((pkg) => {
                                        const packageLogos: Record<string, string> = {
                                            basic: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#ffd700"/><path fill="#000000" d="M10,20V14H14V20H18V12H12V10H10V12H6V20H10Z"/></svg>'),
                                            premium: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTIiIGZpbGw9IiNmZmQ3MDAiLz48cGF0aCBmaWxsPSIjMDAwMDAwIiBkPSJNMTIsMTcuMjdMMTguMTgsMjFMMTYuNTQsMTMuOTdMMjIsOS4yNEwxNC44MSw4LjYyTDEyLDJMMTAuMTksOC42MkwzLDkuMjQsOC40NiwxMy45N0w3LjEsMjFNMTIsMTUuNEwxMC4yNCwxOS42TDExLjEsMTQuNDYsNy41LDExLjgxTDEyLjEyLDExLjJMMTIsNkwxMS44OCwxMS4yTDE2LjUsMTEuODFMMTIuOSwxNC40NkwxMy43NiwxOS42IiAvPjwvc3ZnPg==',
                                            elite: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTIiIGZpbGw9IiNmZmQ3MDAiLz48cGF0aCBmaWxsPSIjMDAwMDAwIiBkPSJNMTIsMkwxNSw2SDE5TDE2LDEwTDIwLDEyTDE3LDE1TDE1LDE2TDEyLDE0TDksMTZMNywxMkg1TDgsMTBMNSw2SDlNMTIsOEwxMCwxMEgxNEwxMiwxMloiLz48L3N2Zz4='
                                        }

                                        return (
                                            <div
                                                key={pkg.type}
                                                className={`${styles.packageOption} ${selectedPackage === pkg.type ? styles.selected : ''}`}
                                                onClick={() => setSelectedPackage(pkg.type)}
                                                data-type={pkg.type}
                                                data-price={pkg.price || 0}
                                            >
                                                <div className={styles.packageSelectionLogo}>
                                                    <img
                                                        src={packageLogos[pkg.type] || packageLogos.basic}
                                                        alt={`${pkg.type} Package Logo`}
                                                    />
                                                </div>
                                                <div className={styles.packageSelectionName}>
                                                    {pkg.type.charAt(0).toUpperCase() + pkg.type.slice(1)}
                                                </div>
                                                <div className={styles.packageSelectionPrice}>{pkg.priceInfo}</div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {selectedPackage && (
                                <div className={styles.calculationDisplay} id="buyCalculation">
                                    <div className={styles.calculationHeader}>
                                        <div className={styles.calculationIcon}>💰</div>
                                        <h4>Price Calculation</h4>
                                    </div>
                                    {(() => {
                                        const selectedPkg = packages.find(p => p.type === selectedPackage)!
                                        const basePrice = selectedPkg.price || 0
                                        const currentArea = squareFeet || 0

                                        if (!currentArea || currentArea < 100) {
                                            return (
                                                <>
                                                    <div className={styles.calculationRow}>
                                                        <span className={styles.calculationLabel}>Package:</span>
                                                        <span className={styles.calculationValue}>{selectedPackage.charAt(0).toUpperCase() + selectedPackage.slice(1)}</span>
                                                    </div>
                                                    <div className={styles.calculationRow}>
                                                        <span className={styles.calculationLabel}>Area:</span>
                                                        <span className={styles.calculationValue}>Enter area above</span>
                                                    </div>
                                                </>
                                            )
                                        }

                                        const pricePerSqFt = basePrice > 0 ? basePrice / 1 : 0
                                        const totalPrice = pricePerSqFt * currentArea
                                        const advanceAmount = Math.round(totalPrice * 0.1)

                                        if (basePrice === 0) {
                                            return (
                                                <>
                                                    <div className={styles.calculationRow}>
                                                        <span className={styles.calculationLabel}>Package:</span>
                                                        <span className={styles.calculationValue}>{selectedPackage.charAt(0).toUpperCase() + selectedPackage.slice(1)}</span>
                                                    </div>
                                                    <div className={styles.calculationRow}>
                                                        <span className={styles.calculationLabel}>Area:</span>
                                                        <span className={styles.calculationValue}>{currentArea.toLocaleString('en-IN')} sq ft</span>
                                                    </div>
                                                    <div className={styles.calculationTotal}>
                                                        <div style={{ textAlign: 'center' }}>
                                                            <span>Price on Enquiry</span><br />
                                                            <small style={{ fontSize: '14px', opacity: 0.8 }}>Contact us for detailed pricing</small>
                                                        </div>
                                                    </div>
                                                </>
                                            )
                                        }

                                        return (
                                            <>
                                                <div className={styles.calculationRow}>
                                                    <span className={styles.calculationLabel}>Package:</span>
                                                    <span className={styles.calculationValue}>{selectedPackage.charAt(0).toUpperCase() + selectedPackage.slice(1)}</span>
                                                </div>
                                                <div className={styles.calculationRow}>
                                                    <span className={styles.calculationLabel}>Rate per sq ft:</span>
                                                    <span className={styles.calculationValue}>₹{pricePerSqFt.toFixed(2)}</span>
                                                </div>
                                                <div className={styles.calculationRow}>
                                                    <span className={styles.calculationLabel}>Area:</span>
                                                    <span className={styles.calculationValue}>{currentArea.toLocaleString('en-IN')} sq ft</span>
                                                </div>
                                                <div className={styles.calculationTotal}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span>Total Price:</span>
                                                        <span>₹{totalPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                                    </div>
                                                </div>
                                                <div className={styles.advanceHighlight}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                        <span>Advance (10%):</span>
                                                        <span>₹{advanceAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                                    </div>
                                                </div>
                                            </>
                                        )
                                    })()}
                                </div>
                            )}

                            <div className={styles.formActions}>
                                <button
                                    type="button"
                                    className={styles.btnCancel}
                                    onClick={() => setBuyNowModalOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className={styles.btnSubmit}
                                    disabled={!selectedPackage || !squareFeet || squareFeet < 100}
                                >
                                    💳 Buy Now
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Enquiry Modal */}
            {enquiryModalOpen && (
                <div className={`${styles.modalOverlay} ${styles.active}`} onClick={() => setEnquiryModalOpen(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>Service Enquiry</h3>
                            <button
                                className={styles.closeModal}
                                onClick={() => setEnquiryModalOpen(false)}
                            >
                                &times;
                            </button>
                        </div>

                        <form onSubmit={handleEnquiry}>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Name</label>
                                <input
                                    type="text"
                                    className={styles.formControl}
                                    required
                                    value={enquiryForm.name}
                                    onChange={e => setEnquiryForm({ ...enquiryForm, name: e.target.value })}
                                    placeholder="Your Name"
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Phone Number</label>
                                <input
                                    type="tel"
                                    className={styles.formControl}
                                    required
                                    value={enquiryForm.phone}
                                    onChange={e => setEnquiryForm({ ...enquiryForm, phone: e.target.value })}
                                    placeholder="Your Phone Number"
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Location</label>
                                <input
                                    type="text"
                                    className={styles.formControl}
                                    required
                                    value={enquiryForm.location}
                                    onChange={e => setEnquiryForm({ ...enquiryForm, location: e.target.value })}
                                    placeholder="City / Area"
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Message (Optional)</label>
                                <textarea
                                    className={styles.formControl}
                                    rows={4}
                                    value={enquiryForm.message}
                                    onChange={e => setEnquiryForm({ ...enquiryForm, message: e.target.value })}
                                    placeholder="Describe your requirements..."
                                />
                            </div>

                            <div className={styles.formActions}>
                                <button
                                    type="button"
                                    className={styles.btnCancel}
                                    onClick={() => setEnquiryModalOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className={styles.btnSubmit}
                                >
                                    Send Enquiry
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    )
}
