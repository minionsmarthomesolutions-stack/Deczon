'use client'

import React, { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import MinionLoader from '@/components/MinionLoader'
import ServicesSection from '@/components/ServicesSection'
import BlogSection from '@/components/BlogSection'
import { db } from '@/lib/firebase'
import { doc, getDoc, collection, getDocs, query, where, limit } from 'firebase/firestore'
import styles from './package-detail.module.css'

interface Service {
  id: string
  name?: string
  category?: string
  mainCategory?: string
  description?: string
  imageUrl?: string
  primaryImageUrl?: string
  imageUrls?: string[]
  galleryImages?: string[] | { main?: string; medium?: string; firstChild?: string; lastChild?: string; floating?: string }
  packages?: {
    [key: string]: {
      price?: number
      priceFrom?: number
      priceInfo?: string
      description?: string
      includedFeatures?: Array<{ text: string; description?: string; imageUrl?: string }>
      excludedFeatures?: Array<{ text: string; description?: string; imageUrl?: string }>
      complimentaryFeatures?: Array<{ text?: string; title?: string; description?: string; imageUrl?: string }>
      inclusionDetails?: Array<{ title: string; description: string; imageUrl?: string }>
      exclusionDetails?: Array<{ title: string; description: string; imageUrl?: string }>
      complimentaryDetails?: Array<{ title: string; description: string; imageUrl?: string }>
      galleryImages?: string[] | { main?: string; medium?: string; firstChild?: string; lastChild?: string; floating?: string }
    }
  }
  status?: string
}

interface PackageData {
  price?: number
  priceFrom?: number
  priceInfo?: string
  description?: string
  includedFeatures?: Array<{ text: string; description?: string; imageUrl?: string }>
  excludedFeatures?: Array<{ text: string; description?: string; imageUrl?: string }>
  complimentaryFeatures?: Array<{ text?: string; title?: string; description?: string; imageUrl?: string }>
  inclusionDetails?: Array<{ title: string; description: string; imageUrl?: string }>
  exclusionDetails?: Array<{ title: string; description: string; imageUrl?: string }>
  complimentaryDetails?: Array<{ title: string; description: string; imageUrl?: string }>
  galleryImages?: string[] | { main?: string; medium?: string; firstChild?: string; lastChild?: string; floating?: string }
}

function PackageDetailContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const serviceId = searchParams?.get('service')
  const packageType = searchParams?.get('package')

  const [service, setService] = useState<Service | null>(null)
  const [packageData, setPackageData] = useState<PackageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
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
  const [galleryImages, setGalleryImages] = useState<Array<{ url: string; title: string; type: string }>>([])

  // Details section state
  const [activeDetailSection, setActiveDetailSection] = useState<'inclusion' | 'exclusion' | 'complimentary'>('inclusion')
  const [highlightedDetailIndex, setHighlightedDetailIndex] = useState<number | null>(null)

  useEffect(() => {
    if (serviceId && packageType) {
      loadPackageDetails()
    } else {
      router.push('/services')
    }
  }, [serviceId, packageType])

  const loadPackageDetails = async () => {
    if (!serviceId || !packageType || !db) {
      setError(true)
      setLoading(false)
      return
    }

    try {
      const serviceDoc = await getDoc(doc(db, 'services', serviceId))
      
      if (!serviceDoc.exists()) {
        router.push('/services')
        return
      }

      const serviceData = { id: serviceDoc.id, ...serviceDoc.data() } as Service
      const pkgData = serviceData.packages?.[packageType]

      if (!pkgData) {
        router.push(`/services/${serviceId}`)
        return
      }

      setService(serviceData)
      setPackageData(pkgData)

      // Setup gallery images
      setupGalleryImages(serviceData, pkgData)

      // Load related items
      await loadRelatedItems(serviceData)

    } catch (error) {
      console.error('Error loading package details:', error)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  const setupGalleryImages = (service: Service, pkg: PackageData) => {
    const allImages: Array<{ url: string; title: string; type: string }> = []

    // Add package gallery images first
    if (pkg.galleryImages) {
      if (Array.isArray(pkg.galleryImages)) {
        pkg.galleryImages.forEach(url => {
          if (url && url.trim()) {
            allImages.push({ url, title: service.name || 'Package', type: 'package' })
          }
        })
      } else if (typeof pkg.galleryImages === 'object') {
        if (pkg.galleryImages.main) allImages.push({ url: pkg.galleryImages.main, title: service.name || 'Package', type: 'package' })
        if (pkg.galleryImages.medium) allImages.push({ url: pkg.galleryImages.medium, title: service.name || 'Package', type: 'package' })
        if (pkg.galleryImages.firstChild) allImages.push({ url: pkg.galleryImages.firstChild, title: service.name || 'Package', type: 'package' })
        if (pkg.galleryImages.lastChild) allImages.push({ url: pkg.galleryImages.lastChild, title: service.name || 'Package', type: 'package' })
        if (pkg.galleryImages.floating) allImages.push({ url: pkg.galleryImages.floating, title: service.name || 'Package', type: 'package' })
      }
    }

    // Fallback to service gallery images
    if (allImages.length === 0 && service.galleryImages) {
      if (Array.isArray(service.galleryImages)) {
        service.galleryImages.forEach(url => {
          if (url && url.trim()) {
            allImages.push({ url, title: service.name || 'Service', type: 'service' })
          }
        })
      } else if (typeof service.galleryImages === 'object') {
        if (service.galleryImages.main) allImages.push({ url: service.galleryImages.main, title: service.name || 'Service', type: 'service' })
        if (service.galleryImages.medium) allImages.push({ url: service.galleryImages.medium, title: service.name || 'Service', type: 'service' })
        if (service.galleryImages.firstChild) allImages.push({ url: service.galleryImages.firstChild, title: service.name || 'Service', type: 'service' })
        if (service.galleryImages.lastChild) allImages.push({ url: service.galleryImages.lastChild, title: service.name || 'Service', type: 'service' })
        if (service.galleryImages.floating) allImages.push({ url: service.galleryImages.floating, title: service.name || 'Service', type: 'service' })
      }
    }

    // Fallback to service imageUrls
    if (allImages.length === 0 && service.imageUrls && service.imageUrls.length > 0) {
      service.imageUrls.forEach(url => {
        allImages.push({ url, title: service.name || 'Service', type: 'service' })
      })
    }

    // Default placeholders if no images
    if (allImages.length === 0) {
      allImages.push(
        { url: '/placeholder.svg?height=400&width=600&text=Package+Main+Image', title: service.name || 'Package', type: 'default' },
        { url: '/placeholder.svg?height=300&width=400&text=Package+Medium+Image', title: service.name || 'Package', type: 'default' },
        { url: '/placeholder.svg?height=200&width=300&text=Package+Small+1', title: service.name || 'Package', type: 'default' },
        { url: '/placeholder.svg?height=200&width=300&text=Package+Small+2', title: service.name || 'Package', type: 'default' },
        { url: '/placeholder.svg?height=150&width=250&text=Package+Floating', title: service.name || 'Package', type: 'default' }
      )
    }

    setGalleryImages(allImages)
    if (allImages.length > 0) {
      setMainImage(allImages[0].url)
    }
  }

  const changeMainImage = (imageUrl: string) => {
    setMainImage(imageUrl)
  }

  const loadRelatedItems = async (currentService: Service) => {
    if (!db) return

    try {
      // Load related services
      if (currentService.category || currentService.mainCategory) {
        const category = currentService.mainCategory || currentService.category
        const servicesQuery = query(
          collection(db, 'services'),
          where('mainCategory', '==', category),
          where('status', '==', 'active'),
          limit(6)
        )
        const servicesSnapshot = await getDocs(servicesQuery)
        const services = servicesSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Service))
          .filter(s => s.id !== currentService.id)
        setRelatedServices(services.slice(0, 6))
      }

      // Load related products
      if (currentService.category || currentService.mainCategory) {
        const category = currentService.mainCategory || currentService.category
        const productsQuery = query(
          collection(db, 'products'),
          where('mainCategory', '==', category),
          limit(6)
        )
        const productsSnapshot = await getDocs(productsQuery)
        const products = productsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        setRelatedProducts(products.slice(0, 6))
      }
    } catch (error) {
      console.error('Error loading related items:', error)
    }
  }

  const getFeatureImage = (feature: { imageUrl?: string }, service: Service | null): string => {
    if (feature.imageUrl) return feature.imageUrl
    if (galleryImages.length > 0) return galleryImages[0].url
    if (service?.imageUrls && service.imageUrls.length > 0) return service.imageUrls[0]
    return '/placeholder.svg?height=200&width=300&text=Feature'
  }

  const scrollToDetail = (section: 'inclusion' | 'exclusion' | 'complimentary', index: number) => {
    setActiveDetailSection(section)
    setHighlightedDetailIndex(index)
    setTimeout(() => {
      const element = document.getElementById(`${section}-detail-${index}`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setTimeout(() => setHighlightedDetailIndex(null), 2000)
      }
    }, 100)
  }

  const switchDetailSection = (section: 'inclusion' | 'exclusion' | 'complimentary') => {
    setActiveDetailSection(section)
  }

  const calculatePrice = (pkg: PackageData, area: number = squareFeet): number => {
    if (!area || area < 100) return 0
    const basePrice = pkg.price || 0
    if (basePrice === 0) return 0
    const pricePerSqFt = basePrice / 1
    return pricePerSqFt * area
  }

  const handleAddToCart = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!packageData || !squareFeet || squareFeet < 100) return

    const calculatedPrice = calculatePrice(packageData)
    const advanceAmount = Math.round(calculatedPrice * 0.1)

    console.log('Add to cart:', { serviceId, packageType, squareFeet, advanceAmount })
    setAddToCartModalOpen(false)
  }

  const handleBuyNow = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!packageData || !squareFeet || squareFeet < 100) return

    const calculatedPrice = calculatePrice(packageData)
    const advanceAmount = Math.round(calculatedPrice * 0.1)

    router.push(`/checkout?serviceId=${serviceId}&package=${packageType}&squareFeet=${squareFeet}&amount=${advanceAmount}`)
  }

  const handleEnquiry = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Enquiry submitted:', enquiryForm)
    setEnquiryModalOpen(false)
    setEnquiryForm({ name: '', phone: '', location: '', message: '', email: '' })
  }

  if (loading) {
    return <MinionLoader />
  }

  if (error || !service || !packageData) {
    return (
      <div className={styles.error}>
        <h2>Package Not Found</h2>
        <p>The package you're looking for doesn't exist.</p>
        <Link href="/services" className={styles.btnPrimary}>
          Back to Services
        </Link>
      </div>
    )
  }

  const priceDisplay = packageData.priceInfo || 
    (packageData.price ? `₹${packageData.price.toLocaleString('en-IN')}` : 'Price on enquiry')

  return (
    <div className={styles.packageDetailsContainer}>
      {/* Category Tag */}
      <div className={styles.categoryTag}>{service.category || 'Category'}</div>

      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link href="/">Home</Link>
        <span>/</span>
        <Link href="/services">Services</Link>
        <span>/</span>
        <span>{service.category || 'Category'}</span>
        <span>/</span>
        <Link href={`/services/${serviceId}`}>{service.name || 'Service'}</Link>
        <span>/</span>
        <span>{packageType ? packageType.charAt(0).toUpperCase() + packageType.slice(1) : 'Package'} Package</span>
      </div>

      {/* Package Hero Section */}
      <div className={styles.packageHero}>
        <div className={styles.packageInfo}>
          <h1 className={styles.packageTitle}>{service.name || 'Package'}</h1>
          <p className={styles.packageSubtitle}>{service.category || 'Smart Home Service'}</p>
          {packageData.description && (
            <div 
              className={styles.packageDescription}
              dangerouslySetInnerHTML={{ __html: packageData.description }}
            />
          )}
          <div className={styles.packagePrice}>
            <span className={styles.pricePrefix}>Starting from</span>
            {priceDisplay}
          </div>
          
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
          <div className={styles.gridContainer}>
            {galleryImages.length > 0 && (
              <div 
                className={styles.gridItem1} 
                onClick={() => changeMainImage(galleryImages[0].url)}
              >
                <img 
                  src={galleryImages[0].url} 
                  alt={galleryImages[0].title || service.name || 'Package Image 1'} 
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder.svg?height=400&width=600&text=Package+Image+1'
                  }}
                />
              </div>
            )}
            {galleryImages.length > 1 && (
              <div 
                className={styles.gridItem2} 
                onClick={() => changeMainImage(galleryImages[1].url)}
              >
                <img 
                  src={galleryImages[1].url} 
                  alt={galleryImages[1].title || service.name || 'Package Image 2'}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder.svg?height=300&width=400&text=Package+Image+2'
                  }}
                />
              </div>
            )}
            {galleryImages.length > 2 && (
              <div 
                className={styles.gridItem3} 
                onClick={() => changeMainImage(galleryImages[2].url)}
              >
                <img 
                  src={galleryImages[2].url} 
                  alt={galleryImages[2].title || service.name || 'Package Image 3'}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder.svg?height=200&width=300&text=Package+Image+3'
                  }}
                />
              </div>
            )}
            {galleryImages.length > 3 && (
              <div 
                className={styles.gridItem4} 
                onClick={() => changeMainImage(galleryImages[3].url)}
              >
                <img 
                  src={galleryImages[3].url} 
                  alt={galleryImages[3].title || service.name || 'Package Image 4'}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder.svg?height=200&width=300&text=Package+Image+4'
                  }}
                />
              </div>
            )}
            {galleryImages.length > 4 && (
              <div 
                className={styles.gridItem5} 
                onClick={() => changeMainImage(galleryImages[4].url)}
              >
                <img 
                  src={galleryImages[4].url} 
                  alt={galleryImages[4].title || service.name || 'Package Image 5'}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder.svg?height=150&width=250&text=Package+Image+5'
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className={styles.featuresSection}>
        <h2 className={styles.sectionTitle}>Package Features</h2>
        <div className={styles.featuresGrid}>
          <div className={`${styles.featureGroup} ${styles.includedFeatures}`}>
            <h3 className={styles.featureGroupTitle}>What's Included</h3>
            <div className={styles.featureList}>
              {(packageData.includedFeatures || []).map((feature, index) => (
                <div 
                  key={index}
                  className={`${styles.featureItem} ${styles.clickable}`}
                  onClick={() => scrollToDetail('inclusion', index)}
                >
                  {feature.text}
                  <div className={styles.featureImagePopup}>
                    <img
                      src={getFeatureImage(feature, service)}
                      alt={feature.text}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder.svg?height=200&width=300&text=Feature+Image'
                      }}
                    />
                    <h4>{feature.text}</h4>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className={`${styles.featureGroup} ${styles.excludedFeatures}`}>
            <h3 className={styles.featureGroupTitle}>What's Not Included</h3>
            <div className={styles.featureList}>
              {(packageData.excludedFeatures || []).map((feature, index) => (
                <div 
                  key={index}
                  className={`${styles.featureItem} ${styles.clickable}`}
                  onClick={() => scrollToDetail('exclusion', index)}
                >
                  {feature.text}
                  <div className={styles.featureImagePopup}>
                    <img
                      src={getFeatureImage(feature, service)}
                      alt={feature.text}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder.svg?height=200&width=300&text=Feature+Image'
                      }}
                    />
                    <h4>{feature.text}</h4>
                  </div>
                </div>
              ))}
              
              {packageData.complimentaryFeatures && packageData.complimentaryFeatures.length > 0 && (
                <div className={styles.complimentaryWorksSection}>
                  <div className={styles.complimentaryWorksHeader}>
                    <h4 className={styles.complimentaryWorksTitle}> Complimentary Works</h4>
                  </div>
                  <div className={styles.complimentaryWorksList}>
                    {packageData.complimentaryFeatures.map((feature, index) => (
                      <div 
                        key={index}
                        className={`${styles.featureItem} ${styles.complimentaryItem} ${styles.clickable}`}
                        onClick={() => scrollToDetail('complimentary', index)}
                      >
                        {feature.text || feature.title}
                        <div className={styles.featureImagePopup}>
                          <img
                            src={getFeatureImage(feature, service)}
                            alt={feature.text || feature.title || 'Complimentary Work'}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/placeholder.svg?height=200&width=300&text=Complimentary+Work'
                            }}
                          />
                          <h4>{feature.text || feature.title}</h4>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Details Section with Switch Options */}
      <div className={styles.detailsSection}>
        <h2 className={styles.sectionTitle}>Package Details</h2>
        
        {/* Switch Options */}
        <div className={styles.detailsSwitchContainer}>
          <div className={styles.switchOptions}>
            <button 
              className={`${styles.switchBtn} ${activeDetailSection === 'inclusion' ? styles.active : ''}`}
              onClick={() => switchDetailSection('inclusion')}
            >
              <i className="fas fa-check-circle"></i>
              Inclusion Details
            </button>
            <button 
              className={`${styles.switchBtn} ${activeDetailSection === 'exclusion' ? styles.active : ''}`}
              onClick={() => switchDetailSection('exclusion')}
            >
              <i className="fas fa-times-circle"></i>
              Exclusion Details
            </button>
            <button 
              className={`${styles.switchBtn} ${activeDetailSection === 'complimentary' ? styles.active : ''}`}
              onClick={() => switchDetailSection('complimentary')}
            >
              <i className="fas fa-gift"></i>
              Complimentary Works
            </button>
          </div>
        </div>
        
        {/* Inclusion Details */}
        <div className={`${styles.detailSection} ${activeDetailSection === 'inclusion' ? styles.active : ''}`}>
          <div className={styles.detailSectionHeader}>
            <h3 className={styles.detailSectionTitle}>
              <i className="fas fa-check-circle"></i>
              What's Included
            </h3>
          </div>
          <div className={styles.detailItemsGrid}>
            {(() => {
              // Use includedFeatures first (matching HTML logic), fallback to inclusionDetails
              const inclusionData = (packageData.includedFeatures && packageData.includedFeatures.length > 0) 
                ? packageData.includedFeatures 
                : (packageData.inclusionDetails || [])
              
              if (inclusionData.length === 0) {
                return (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                    <i className="fas fa-info-circle" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}></i>
                    <p>No inclusion details available for this package.</p>
                  </div>
                )
              }
              
              return inclusionData.map((feature: any, index: number) => {
                // Handle both formats: includedFeatures (has 'text') and inclusionDetails (has 'title')
                const title = feature.text || feature.title || 'Included Feature'
                const description = feature.description || 'This feature is included in your package and provides enhanced functionality for your smart home system.'
                const imageUrl = feature.imageUrl || getFeatureImage(feature, service)
                
                return (
                  <div 
                    key={index}
                    id={`inclusion-detail-${index}`}
                    className={`${styles.detailItem} ${highlightedDetailIndex === index && activeDetailSection === 'inclusion' ? styles.highlighted : ''}`}
                  >
                    <div className={styles.detailContent}>
                      <h3>{title}</h3>
                      <p>{description}</p>
                    </div>
                    <div className={styles.detailImage}>
                      <img
                        src={imageUrl}
                        alt={title}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/placeholder.svg?height=250&width=400&text=Service+Detail'
                        }}
                      />
                    </div>
                  </div>
                )
              })
            })()}
          </div>
        </div>
        
        {/* Exclusion Details */}
        <div className={`${styles.detailSection} ${activeDetailSection === 'exclusion' ? styles.active : ''}`}>
          <div className={styles.detailSectionHeader}>
            <h3 className={styles.detailSectionTitle}>
              <i className="fas fa-times-circle"></i>
              What's Not Included
            </h3>
          </div>
          <div className={styles.detailItemsGrid}>
            {(() => {
              // Use excludedFeatures first (matching HTML logic), fallback to exclusionDetails
              const exclusionData = (packageData.excludedFeatures && packageData.excludedFeatures.length > 0) 
                ? packageData.excludedFeatures 
                : (packageData.exclusionDetails || [])
              
              if (exclusionData.length === 0) {
                return (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                    <i className="fas fa-info-circle" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}></i>
                    <p>No exclusion details available for this package.</p>
                  </div>
                )
              }
              
              return exclusionData.map((feature: any, index: number) => {
                // Handle both formats: excludedFeatures (has 'text') and exclusionDetails (has 'title')
                const title = feature.text || feature.title || 'Excluded Feature'
                const description = feature.description || 'This feature is not included in your package and may require additional purchase or separate service.'
                const imageUrl = feature.imageUrl || getFeatureImage(feature, service)
                
                return (
                  <div 
                    key={index}
                    id={`exclusion-detail-${index}`}
                    className={`${styles.detailItem} ${highlightedDetailIndex === index && activeDetailSection === 'exclusion' ? styles.highlighted : ''}`}
                  >
                    <div className={styles.detailContent}>
                      <h3>{title}</h3>
                      <p>{description}</p>
                    </div>
                    <div className={styles.detailImage}>
                      <img
                        src={imageUrl}
                        alt={title}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/placeholder.svg?height=250&width=400&text=Service+Detail'
                        }}
                      />
                    </div>
                  </div>
                )
              })
            })()}
          </div>
        </div>
        
        {/* Complimentary Details */}
        <div className={`${styles.detailSection} ${activeDetailSection === 'complimentary' ? styles.active : ''}`}>
          <div className={styles.detailSectionHeader}>
            <h3 className={styles.detailSectionTitle}>
              <i className="fas fa-gift"></i>
              Complimentary Works
            </h3>
          </div>
          <div className={styles.detailItemsGrid}>
            {(() => {
              // Use complimentaryFeatures first (matching HTML logic), fallback to complimentaryDetails
              const complimentaryData = (packageData.complimentaryFeatures && packageData.complimentaryFeatures.length > 0) 
                ? packageData.complimentaryFeatures 
                : (packageData.complimentaryDetails || [])
              
              if (complimentaryData.length === 0) {
                return (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                    <i className="fas fa-gift" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}></i>
                    <p>No complimentary works available for this package.</p>
                  </div>
                )
              }
              
              return complimentaryData.map((feature: any, index: number) => {
                // Handle both formats: complimentaryFeatures (has 'text' or 'title') and complimentaryDetails (has 'title')
                const title = feature.text || feature.title || 'Complimentary Work'
                const description = feature.description || 'This complimentary work is included as a bonus with your package at no additional cost.'
                const imageUrl = feature.imageUrl || getFeatureImage(feature, service)
                
                return (
                  <div 
                    key={index}
                    id={`complimentary-detail-${index}`}
                    className={`${styles.detailItem} ${highlightedDetailIndex === index && activeDetailSection === 'complimentary' ? styles.highlighted : ''}`}
                  >
                    <div className={styles.detailContent}>
                      <h3>{title}</h3>
                      <p>{description}</p>
                    </div>
                    <div className={styles.detailImage}>
                      <img
                        src={imageUrl}
                        alt={title}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/placeholder.svg?height=250&width=400&text=Service+Detail'
                        }}
                      />
                    </div>
                  </div>
                )
              })
            })()}
          </div>
        </div>
      </div>

      {/* Related Services Section */}
      {relatedServices.length > 0 && (
        <div className={styles.relatedServicesSection}>
          <h2 className={styles.sectionTitle}>Related Services</h2>
          <ServicesSection 
            services={relatedServices.map(s => ({ ...s, name: s.name || 'Service' }))}
            title=""
            subtitle=""
            showSeeAll={false}
          />
        </div>
      )}

      {/* Related Products Section */}
      {relatedProducts.length > 0 && (
        <div className={styles.relatedProductsSection}>
          <h2 className={styles.sectionTitle}>Related Products</h2>
          <div className={styles.relatedGrid}>
            {relatedProducts.map((product) => (
              <Link 
                key={product.id}
                href={`/products/${product.id}`}
                className={styles.relatedItem}
              >
                <div className={styles.relatedItemImage}>
                  <Image
                    src={product.primaryImageUrl || product.imageUrl || '/placeholder.svg'}
                    alt={product.name || 'Product'}
                    width={280}
                    height={200}
                    unoptimized
                  />
                  <div className={`${styles.itemTypeBadge} ${styles.product}`}>Product</div>
                </div>
                <div className={styles.relatedItemInfo}>
                  <h3 className={styles.relatedItemName}>{product.name}</h3>
                  <p className={styles.relatedItemCategory}>{product.category || product.quantity}</p>
                  <div className={styles.relatedItemPrice}>
                    <span className={styles.relatedPrice}>₹{(product.currentPrice || 0).toLocaleString('en-IN')}</span>
                    <button 
                      className={`${styles.relatedBtn} ${styles.relatedAddBtn}`}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        // Add to cart logic
                      }}
                    >
                      ADD
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Blog Section */}
      <BlogSection />

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
                    Approximate Total Square Feet
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
                <div className={styles.sectionTitleModal}>
                  <span>📦</span>
                  Selected Package
                </div>
                <div className={styles.packagesSelectionGrid} id="cartPackageOptions">
                  <div
                    className={`${styles.packageOption} ${styles.selected}`}
                    data-type={packageType}
                    data-price={packageData.price || 0}
                  >
                    <div className={styles.packageSelectionLogo}>
                      <img 
                        src={packageType === 'basic' ? 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#ffd700"/><path fill="#000000" d="M10,20V14H14V20H18V12H12V10H10V12H6V20H10Z"/></svg>') :
                             packageType === 'premium' ? 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#ffd700"/><path fill="#000000" d="M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L10.19,8.62L3,9.24,8.46,13.97L7.1,21M12,15.4L10.24,19.6L11.1,14.46,7.5,11.81L12.12,11.2L12,6L11.88,11.2L16.5,11.81L12.9,14.46L13.76,19.6"/></svg>') :
                             'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#ffd700"/><path fill="#000000" d="M12,2L15,6H19L16,10L20,12L17,15L15,16L12,14L9,16L7,12H5L8,10L5,6H9M12,8L10,10H14L12,12Z"/></svg>')}
                        alt={`${packageType} Package Logo`}
                      />
                    </div>
                    <div className={styles.packageSelectionName}>
                      {packageType ? packageType.charAt(0).toUpperCase() + packageType.slice(1) : 'Package'}
                    </div>
                    <div className={styles.packageSelectionPrice}>{priceDisplay}</div>
                  </div>
                </div>
              </div>
              
              {squareFeet >= 100 && (
                <div className={styles.calculationDisplay} id="cartCalculation">
                  <div className={styles.calculationHeader}>
                    <div className={styles.calculationIcon}>💰</div>
                    <h4>Price Calculation</h4>
                  </div>
                  {(() => {
                    const basePrice = packageData.price || 0
                    const currentArea = squareFeet || 0
                    
                    if (!currentArea || currentArea < 100) {
                      return (
                        <>
                          <div className={styles.calculationRow}>
                            <span className={styles.calculationLabel}>Package:</span>
                            <span className={styles.calculationValue}>{packageType ? packageType.charAt(0).toUpperCase() + packageType.slice(1) : 'Package'}</span>
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
                            <span className={styles.calculationValue}>{packageType ? packageType.charAt(0).toUpperCase() + packageType.slice(1) : 'Package'}</span>
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
                          <span className={styles.calculationValue}>{packageType ? packageType.charAt(0).toUpperCase() + packageType.slice(1) : 'Package'}</span>
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
                  disabled={!squareFeet || squareFeet < 100}
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
                    Approximate Total Square Feet
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
                <div className={styles.sectionTitleModal}>
                  <span>📦</span>
                  Selected Package
                </div>
                <div className={styles.packagesSelectionGrid} id="buyPackageOptions">
                  <div
                    className={`${styles.packageOption} ${styles.selected}`}
                    data-type={packageType}
                    data-price={packageData.price || 0}
                  >
                    <div className={styles.packageSelectionLogo}>
                      <img 
                        src={packageType === 'basic' ? 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#ffd700"/><path fill="#000000" d="M10,20V14H14V20H18V12H12V10H10V12H6V20H10Z"/></svg>') :
                             packageType === 'premium' ? 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#ffd700"/><path fill="#000000" d="M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L10.19,8.62L3,9.24,8.46,13.97L7.1,21M12,15.4L10.24,19.6L11.1,14.46,7.5,11.81L12.12,11.2L12,6L11.88,11.2L16.5,11.81L12.9,14.46L13.76,19.6"/></svg>') :
                             'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#ffd700"/><path fill="#000000" d="M12,2L15,6H19L16,10L20,12L17,15L15,16L12,14L9,16L7,12H5L8,10L5,6H9M12,8L10,10H14L12,12Z"/></svg>')}
                        alt={`${packageType} Package Logo`}
                      />
                    </div>
                    <div className={styles.packageSelectionName}>
                      {packageType ? packageType.charAt(0).toUpperCase() + packageType.slice(1) : 'Package'}
                    </div>
                    <div className={styles.packageSelectionPrice}>{priceDisplay}</div>
                  </div>
                </div>
              </div>
              
              {squareFeet >= 100 && (
                <div className={styles.calculationDisplay} id="buyCalculation">
                  <div className={styles.calculationHeader}>
                    <div className={styles.calculationIcon}>💰</div>
                    <h4>Price Calculation</h4>
                  </div>
                  {(() => {
                    const basePrice = packageData.price || 0
                    const currentArea = squareFeet || 0
                    
                    if (!currentArea || currentArea < 100) {
                      return (
                        <>
                          <div className={styles.calculationRow}>
                            <span className={styles.calculationLabel}>Package:</span>
                            <span className={styles.calculationValue}>{packageType ? packageType.charAt(0).toUpperCase() + packageType.slice(1) : 'Package'}</span>
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
                            <span className={styles.calculationValue}>{packageType ? packageType.charAt(0).toUpperCase() + packageType.slice(1) : 'Package'}</span>
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
                          <span className={styles.calculationValue}>{packageType ? packageType.charAt(0).toUpperCase() + packageType.slice(1) : 'Package'}</span>
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
                  disabled={!squareFeet || squareFeet < 100}
                >
                  💳 Proceed to Payment
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
            <form onSubmit={handleEnquiry} id="enquiryForm">
              <div className={styles.formSection}>
                <div className={styles.formGroup}>
                  <label className={`${styles.formLabel} ${styles.required}`} htmlFor="enquiryName">
                    Your Name
                  </label>
                  <input 
                    type="text" 
                    className={styles.formControl} 
                    id="enquiryName" 
                    required 
                    placeholder="Enter your full name"
                    value={enquiryForm.name}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, name: e.target.value })}
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label className={`${styles.formLabel} ${styles.required}`} htmlFor="enquiryPhone">
                    Phone Number
                  </label>
                  <input 
                    type="tel" 
                    className={styles.formControl} 
                    id="enquiryPhone" 
                    required 
                    placeholder="Enter your phone number"
                    value={enquiryForm.phone}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, phone: e.target.value })}
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label className={`${styles.formLabel} ${styles.required}`} htmlFor="enquiryLocation">
                    Location
                  </label>
                  <input 
                    type="text" 
                    className={styles.formControl} 
                    id="enquiryLocation" 
                    required 
                    placeholder="Enter your city/area"
                    value={enquiryForm.location}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, location: e.target.value })}
                  />
                </div>
              </div>

              <div className={styles.formSection}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor="enquiryMessage">
                    Requirements
                  </label>
                  <textarea 
                    className={styles.formControl} 
                    id="enquiryMessage" 
                    rows={4} 
                    placeholder="Tell us about your requirements, budget, timeline, etc."
                    value={enquiryForm.message}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, message: e.target.value })}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="enquiryEmail">
                  Email Address
                </label>
                <input 
                  type="email" 
                  className={styles.formControl} 
                  id="enquiryEmail" 
                  placeholder="Enter your email (optional)"
                  value={enquiryForm.email}
                  onChange={(e) => setEnquiryForm({ ...enquiryForm, email: e.target.value })}
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
                <button type="submit" className={styles.btnSubmit}>
                  📩 Submit Enquiry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default function PackageDetailPage() {
  return (
    <Suspense fallback={<MinionLoader />}>
      <PackageDetailContent />
    </Suspense>
  )
}
