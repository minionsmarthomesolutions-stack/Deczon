'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { db } from '@/lib/firebase'
import { collection, getDocs, query, limit, orderBy } from 'firebase/firestore'
import { getServiceImageUrl } from '@/lib/serviceImageUtils'
import styles from './ServicesSection.module.css'

interface Service {
  id: string
  name: string
  imageUrl?: string
  primaryImageUrl?: string
  imageUrls?: string[]
  galleryImages?: string[] | { main?: string } | Record<string, any>
  images?: string[]
  secondaryImages?: string[]
  additionalImages?: string[]
  photoUrls?: string[]
  gallery?: string[] | Record<string, any>
  description?: string
  startingPrice?: number
  basePrice?: number
  priceFrom?: number
  minPrice?: number
  minimumPrice?: number
  price?: number
  originalPrice?: number
  currentPrice?: number
  [key: string]: any // Allow additional fields from Firebase
}

interface ServicesSectionProps {
  services?: Service[]
  title?: string
  subtitle?: string
  showSeeAll?: boolean
}

export default function ServicesSection({ 
  services: propServices, 
  title = 'Our Services',
  subtitle = 'Professional solutions for your smart home delivered in 8 minutes',
  showSeeAll = true
}: ServicesSectionProps = {} as ServicesSectionProps) {
  const [services, setServices] = useState<Service[]>(propServices || [])
  const [loading, setLoading] = useState(!propServices)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (propServices) {
      setServices(propServices)
      setLoading(false)
    } else {
      loadServices()
    }
  }, [propServices])

  const loadServices = async () => {
    if (!db) {
      setServices([
        { id: '1', name: 'Smart Home Setup', startingPrice: 2999 },
        { id: '2', name: 'Security Installation', startingPrice: 4999 },
        { id: '3', name: 'Automation Setup', startingPrice: 3999 },
      ])
      setLoading(false)
      return
    }

    try {
      let servicesData: Service[] = []
      
      // Try with orderBy first
      try {
        const servicesQuery = query(collection(db, 'services'), orderBy('createdAt', 'desc'), limit(6))
        const servicesSnapshot = await getDocs(servicesQuery)
        servicesData = servicesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Service[]
      } catch (orderError) {
        // If orderBy fails, try without ordering
        console.warn('Services orderBy failed, trying without order:', orderError)
        const servicesSnapshot = await getDocs(collection(db, 'services'))
        servicesData = servicesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })).slice(0, 6) as Service[]
      }
      
      setServices(servicesData)
      console.log(`Loaded ${servicesData.length} services`)
    } catch (error: any) {
      // Handle permission errors gracefully
      if (error?.code === 'permission-denied' || error?.code === 'missing-or-insufficient-permissions') {
        console.warn('Firebase permission denied. Using fallback services data.')
      } else {
        console.warn('Error loading services:', error?.message || error)
      }
      // Fallback static data
      setServices([
        { id: '1', name: 'Smart Home Setup', startingPrice: 2999 },
        { id: '2', name: 'Security Installation', startingPrice: 4999 },
        { id: '3', name: 'Automation Setup', startingPrice: 3999 },
      ])
    } finally {
      setLoading(false)
    }
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


  const getStartingPrice = (service: Service): number | null => {
    if (typeof service.startingPrice === 'number') return service.startingPrice
    if (typeof service.basePrice === 'number') return service.basePrice
    if (typeof service.priceFrom === 'number') return service.priceFrom
    if (typeof service.minPrice === 'number') return service.minPrice
    if (typeof service.minimumPrice === 'number') return service.minimumPrice
    if (typeof service.price === 'number') return service.price
    if (typeof service.currentPrice === 'number') return service.currentPrice
    return null
  }

  const handleBookService = (e: React.MouseEvent, serviceId: string) => {
    e.stopPropagation()
    // Navigation will be handled by Link component
  }

  if (loading) {
    return (
      <section className={styles.servicesSection}>
        <div className={styles.container}>
          <div className={styles.loading}>Loading professional services...</div>
        </div>
      </section>
    )
  }

  return (
    <section className={styles.servicesSection}>
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <div>
            <h2>{title}</h2>
            <p className={styles.sectionSubtitle}>
              {subtitle}
            </p>
          </div>
          {showSeeAll && (
            <Link href="/services" className={styles.seeAllLink}>See All</Link>
          )}
        </div>

        <div className={styles.productsSlider}>
          <button
            className={`${styles.sliderBtn} ${styles.prev}`}
            onClick={scrollLeft}
            aria-label="Previous services"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          <div className={styles.productsGrid} ref={scrollRef} id="services-grid">
            {services.map((service) => {
              const imageUrl = getServiceImageUrl(service, '/placeholder.svg?height=200&width=200&text=Service')
              
              // Debug logging for troubleshooting - compare HTML vs Next.js
              if (service.name?.toLowerCase().includes('saloon')) {
                console.debug('ServicesSection card', {
                  id: service.id,
                  name: service.name,
                  resolvedImageUrl: imageUrl,
                  fields: {
                    primaryImageUrl: service.primaryImageUrl,
                    imageUrl: service.imageUrl,
                    imageUrls: service.imageUrls,
                    galleryImages: service.galleryImages
                  }
                })
              }
              
              const startingPrice = getStartingPrice(service)
              const originalPrice = typeof service.originalPrice === 'number' ? service.originalPrice : null
              const discountPercent = originalPrice && startingPrice && originalPrice > startingPrice
                ? Math.round((1 - startingPrice / originalPrice) * 100)
                : 0

              return (
                <Link
                  key={service.id}
                  href={`/services/${service.id}`}
                  className={styles.productCard}
                >
                  <div className={styles.productImage}>
                    <img
                      src={imageUrl}
                      alt={service.name || 'Service'}
                      className={styles.lazyImage}
                      loading="lazy"
                      decoding="async"
                      crossOrigin="anonymous"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        // Only set placeholder if it's not already a placeholder
                        if (!target.src.includes('placeholder.svg')) {
                          console.warn(`Failed to load service image for ${service.name}:`, imageUrl)
                          target.src = '/placeholder.svg?height=200&width=200&text=Service'
                        }
                        target.onerror = null
                      }}
                    />
                  </div>
                  <div className={styles.productInfo}>
                    <h3 className={styles.productTitle}>{service.name || 'Unnamed Service'}</h3>
                    <div className={styles.productPricing}>
                      <div className={styles.priceSection}>
                        <div className={styles.productPrice}>
                          {startingPrice !== null ? (
                            <span className={styles.currentPrice}>Starts from ₹{startingPrice.toLocaleString('en-IN')}</span>
                          ) : (
                            <span className={styles.currentPrice}>Contact for pricing</span>
                          )}
                          {originalPrice && originalPrice > (startingPrice || 0) && (
                            <>
                              <span className={styles.originalPrice}>₹{originalPrice.toLocaleString('en-IN')}</span>
                              {discountPercent > 0 && (
                                <span className={styles.discountBadge}>{discountPercent}% OFF</span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      <div className={styles.addToCartSection}>
                        <div
                          className={styles.addToCartBtn}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                          }}
                        >
                          Book Now
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>

          <button
            className={`${styles.sliderBtn} ${styles.next}`}
            onClick={scrollRight}
            aria-label="Next services"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  )
}
