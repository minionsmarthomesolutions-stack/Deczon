'use client'

import { useRef, useEffect, useState } from 'react'
import Link from 'next/link'
import styles from './PromoSection.module.css'

interface Category {
  id?: string
  name: string
  subcategories?: any
}

interface PromoSectionProps {
  categories: Category[]
}

// Helper function to get category info (matching index.html logic)
function getCategoryInfo(mainCategory: string) {
  const specificInfo: Record<string, { title: string; subtitle: string }> = {
    Tech: {
      title: "Smart Tech Solutions",
      subtitle: "Advanced smart home controllers and tech devices delivered in 8 minutes",
    },
    Automation: {
      title: "Automation Solutions",
      subtitle: "Complete automation solutions for modern smart homes delivered in 8 minutes",
    },
    Lighting: {
      title: "Ceiling Design & Ambient Lighting",
      subtitle: "Intelligent lighting systems and decorative lights delivered in 8 minutes",
    },
    Flooring: {
      title: "Textured Flooring & Surface Designs",
      subtitle: "Modern flooring options and smart floor systems delivered in 8 minutes",
    },
    Ceiling: {
      title: "Ceiling Design & Ambient Lighting",
      subtitle: "Premium wall panels, paints, and ceiling systems delivered in 8 minutes",
    },
    Cooling: {
      title: "Climate Control Systems",
      subtitle: "Smart cooling and ventilation solutions delivered in 8 minutes",
    },
    Interior: {
      title: "Interior Service",
      subtitle: "Professional interior design services delivered in 8 minutes",
    },
  }

  return specificInfo[mainCategory] || {
    title: mainCategory,
    subtitle: `Premium ${mainCategory.toLowerCase()} products and solutions delivered in 8 minutes`,
  }
}

// Helper function to get top subcategories with logos
function getTopSubcategories(category: Category, limit: number = 3): Array<{ name: string; logo?: string }> {
  if (!category.subcategories) return []
  
  const subcategories = category.subcategories
  const allItems: Array<{ name: string; logo?: string }> = []
  
  // Extract items from subcategories with logos (matching index.html logic)
  Object.keys(subcategories).forEach((subName) => {
    const sub = subcategories[subName]
    const itemLogos = (sub && typeof sub === 'object' && 'itemLogos' in sub) ? sub.itemLogos : {}
    
    if (Array.isArray(sub)) {
      sub.slice(0, limit).forEach((itemName: string) => {
        allItems.push({
          name: itemName,
          logo: itemLogos[itemName] || undefined
        })
      })
    } else if (sub && sub.items && Array.isArray(sub.items)) {
      sub.items.slice(0, limit).forEach((itemName: string) => {
        allItems.push({
          name: itemName,
          logo: itemLogos[itemName] || undefined
        })
      })
    } else if (typeof sub === 'object' && sub !== null) {
      // If it's an object with keys, use the keys
      Object.keys(sub).slice(0, limit).forEach((itemName: string) => {
        allItems.push({
          name: itemName,
          logo: itemLogos[itemName] || undefined
        })
      })
    }
  })
  
  return allItems.slice(0, limit)
}

export default function PromoSection({ categories }: PromoSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const autoScrollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isScrollingRef = useRef(false)

  // Create promo cards from categories
  const promoCards = categories.slice(0, 6).map(category => {
    const categoryInfo = getCategoryInfo(category.name)
    const topSubcategories = getTopSubcategories(category, 3)
    
    return {
      id: category.id || category.name,
      name: category.name,
      title: categoryInfo.title,
      subtitle: categoryInfo.subtitle,
      subcategories: topSubcategories
    }
  })

  // Duplicate cards for infinite loop
  const duplicatedCards = [...promoCards, ...promoCards, ...promoCards]

  // Card width including margin (300px + 16px = 316px)
  const cardWidth = 316

  useEffect(() => {
    // Trigger animation after component mounts
    setMounted(true)

    // Initialize scroll position to the middle set of cards
    if (scrollRef.current && promoCards.length > 0) {
      scrollRef.current.scrollLeft = cardWidth * promoCards.length
    }
  }, [])

  useEffect(() => {
    // Auto-scroll functionality
    const startAutoScroll = () => {
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current)
      }

      autoScrollIntervalRef.current = setInterval(() => {
        if (scrollRef.current && !isScrollingRef.current) {
          const container = scrollRef.current
          const currentScroll = container.scrollLeft
          const maxScroll = container.scrollWidth - container.clientWidth
          
          // Check if we're near the end (within one card width)
          if (currentScroll >= maxScroll - cardWidth) {
            // Reset to the beginning of the middle set without animation
            isScrollingRef.current = true
            container.style.scrollBehavior = 'auto'
            container.scrollLeft = cardWidth * promoCards.length
            // Force reflow
            container.offsetHeight
            container.style.scrollBehavior = 'smooth'
            isScrollingRef.current = false
          } else {
            // Normal scroll
            container.scrollBy({ left: cardWidth, behavior: 'smooth' })
          }
        }
      }, 3000) // Auto-scroll every 3 seconds
    }

    startAutoScroll()

    // Pause on hover
    const container = scrollRef.current
    const handleMouseEnter = () => {
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current)
      }
    }
    const handleMouseLeave = () => {
      startAutoScroll()
    }

    if (container) {
      container.addEventListener('mouseenter', handleMouseEnter)
      container.addEventListener('mouseleave', handleMouseLeave)
    }

    return () => {
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current)
      }
      if (container) {
        container.removeEventListener('mouseenter', handleMouseEnter)
        container.removeEventListener('mouseleave', handleMouseLeave)
      }
    }
  }, [promoCards.length, cardWidth])

  const scrollLeft = () => {
    if (scrollRef.current && !isScrollingRef.current) {
      const container = scrollRef.current
      const currentScroll = container.scrollLeft
      
      if (currentScroll <= cardWidth) {
        // Reset to the end of the middle set
        isScrollingRef.current = true
        container.style.scrollBehavior = 'auto'
        container.scrollLeft = cardWidth * promoCards.length * 2 - cardWidth
        container.offsetHeight
        container.style.scrollBehavior = 'smooth'
        isScrollingRef.current = false
      } else {
        container.scrollBy({ left: -cardWidth, behavior: 'smooth' })
      }
    }
  }

  const scrollRight = () => {
    if (scrollRef.current && !isScrollingRef.current) {
      const container = scrollRef.current
      const currentScroll = container.scrollLeft
      const maxScroll = container.scrollWidth - container.clientWidth
      
      if (currentScroll >= maxScroll - cardWidth) {
        // Reset to the beginning of the middle set
        isScrollingRef.current = true
        container.style.scrollBehavior = 'auto'
        container.scrollLeft = cardWidth * promoCards.length
        container.offsetHeight
        container.style.scrollBehavior = 'smooth'
        isScrollingRef.current = false
      } else {
        container.scrollBy({ left: cardWidth, behavior: 'smooth' })
      }
    }
  }

  if (promoCards.length === 0) {
    return null
  }

  return (
    <section className={styles.promoSection}>
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <h2>Smart Home Categories</h2>
          <p className={styles.sectionSubtitle}>Explore our most popular product categories</p>
        </div>
        
        <div className={styles.promoSlider}>
          <button
            className={`${styles.sliderBtn} ${styles.prev}`}
            onClick={scrollLeft}
            aria-label="Previous categories"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          <div className={styles.promoGrid} ref={scrollRef}>
            {duplicatedCards.map((card, index) => (
              <div 
                key={`${card.id}-${index}`} 
                className={`${styles.promoCard} ${mounted ? styles.promoCardAnimate : ''}`}
                style={mounted ? { 
                  animationDelay: `${(index % promoCards.length) * 0.1}s`
                } : {}}
              >
                <div className={styles.promoHeader}>
                  <div className={styles.brandPartners}>
                    <span className={styles.partnersLabel}>Top in Category</span>
                    <div className={styles.brandName}>{card.name.toUpperCase()}</div>
                  </div>
                </div>
                <div className={styles.promoContent}>
                  <h2>{card.title}</h2>
                  <p className={styles.discountText}>Most popular choices</p>
                  <div className={styles.dealCategories}>
                    {card.subcategories.map((subcat, idx) => (
                      <Link
                        key={idx}
                        href={`/products?mainCategory=${encodeURIComponent(card.name)}&subcategory=${encodeURIComponent(subcat.name)}`}
                        className={styles.dealItem}
                      >
                        {subcat.logo ? (
                          <img 
                            src={subcat.logo} 
                            alt={subcat.name}
                            className={styles.dealItemLogo}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                            }}
                          />
                        ) : (
                          <img 
                            src={`/placeholder.svg?height=32&width=32&text=${encodeURIComponent(subcat.name.substring(0, 1))}`}
                            alt={subcat.name}
                            className={styles.dealItemLogo}
                          />
                        )}
                        <span>{subcat.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            className={`${styles.sliderBtn} ${styles.next}`}
            onClick={scrollRight}
            aria-label="Next categories"
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

