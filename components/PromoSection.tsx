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
  products?: any[]
}

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

function getTopSubcategories(category: Category, limit = 3): Array<{ name: string; logo?: string }> {
  if (!category.subcategories) return []
  const allItems: Array<{ name: string; logo?: string }> = []

  Object.keys(category.subcategories).forEach((subName) => {
    const sub = category.subcategories[subName]
    const itemLogos = (sub && typeof sub === 'object' && 'itemLogos' in sub) ? sub.itemLogos : {}

    if (Array.isArray(sub)) {
      sub.forEach((itemName: string) => allItems.push({ name: itemName, logo: itemLogos[itemName] }))
    } else if (sub?.items && Array.isArray(sub.items)) {
      sub.items.forEach((itemName: string) => allItems.push({ name: itemName, logo: itemLogos[itemName] }))
    } else if (typeof sub === 'object' && sub !== null) {
      Object.keys(sub).forEach((itemName: string) => allItems.push({ name: itemName, logo: itemLogos[itemName] }))
    }
  })

  return allItems.slice(0, limit)
}

export default function PromoSection({ categories, products = [] }: PromoSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const autoScrollRef = useRef<NodeJS.Timeout | null>(null)

  const promoCards = categories.map(category => ({
    id: category.id || category.name,
    name: category.name,
    ...getCategoryInfo(category.name),
    subcategories: getTopSubcategories(category, 4).map(sub => {
      if (!sub.logo && products) {
        const product = products.find(p => 
          (p.mainCategory === category.name || p.category === category.name) && 
          p.subcategory === sub.name
        )
        if (product && (product.primaryImageUrl || product.imageUrl)) {
          sub.logo = product.primaryImageUrl || product.imageUrl
        }
      }
      return sub
    }),
  }))

  // Triple for infinite loop
  const duplicatedCards = [...promoCards, ...promoCards, ...promoCards]

  // The step is one card width + gap. 
  // Desktop: 4 cards visible. Container = 4 * card + 3 * gap => card = (Container - 3*gap) / 4. 
  // Step = card + gap = (Container + gap) / 4.
  const getStep = () => {
    if (!scrollRef.current) return 0
    const w = window.innerWidth
    const c = scrollRef.current.clientWidth
    if (w <= 768) return c // 1 card, 0 gap
    if (w <= 992) return (c + 16) / 2 // 2 cards, 16px gap
    return (c + 16) / 4 // 4 cards, 16px gap
  }

  useEffect(() => {
    setMounted(true)
    if (scrollRef.current && promoCards.length > 0) {
      // Start at the beginning of the second set of cards
      scrollRef.current.scrollLeft = getStep() * promoCards.length
    }
  }, [promoCards.length])

  useEffect(() => {
    const startAutoScroll = () => {
      if (autoScrollRef.current) clearInterval(autoScrollRef.current)
      autoScrollRef.current = setInterval(() => {
        const el = scrollRef.current
        if (!el || promoCards.length === 0) return
        const step = getStep()
        
        // If we have scrolled past the second set, jump back to the first set
        if (el.scrollLeft >= step * promoCards.length * 2) {
          el.style.scrollBehavior = 'auto'
          el.scrollLeft = el.scrollLeft - (step * promoCards.length)
          el.offsetHeight // reflow
          el.style.scrollBehavior = 'smooth'
        }
        el.scrollBy({ left: step, behavior: 'smooth' })
      }, 3000)
    }

    startAutoScroll()
    const el = scrollRef.current
    const pause = () => { if (autoScrollRef.current) clearInterval(autoScrollRef.current) }
    const resume = () => startAutoScroll()

    el?.addEventListener('mouseenter', pause)
    el?.addEventListener('mouseleave', resume)

    return () => {
      if (autoScrollRef.current) clearInterval(autoScrollRef.current)
      el?.removeEventListener('mouseenter', pause)
      el?.removeEventListener('mouseleave', resume)
    }
  }, [promoCards.length])

  const slide = (dir: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el || promoCards.length === 0) return
    const step = getStep()

    if (dir === 'right') {
      if (el.scrollLeft >= step * promoCards.length * 2) {
        el.style.scrollBehavior = 'auto'
        el.scrollLeft = el.scrollLeft - (step * promoCards.length)
        el.offsetHeight
        el.style.scrollBehavior = 'smooth'
      }
      el.scrollBy({ left: step, behavior: 'smooth' })
    } else {
      if (el.scrollLeft <= step * 0.5) {
        el.style.scrollBehavior = 'auto'
        el.scrollLeft = el.scrollLeft + (step * promoCards.length)
        el.offsetHeight
        el.style.scrollBehavior = 'smooth'
      }
      el.scrollBy({ left: -step, behavior: 'smooth' })
    }
  }

  if (promoCards.length === 0) return null

  return (
    <section className={styles.promoSection}>
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <h2>Smart Home Categories</h2>
          <p className={styles.sectionSubtitle}>Explore our most popular product categories</p>
        </div>

        <div className={styles.promoSlider}>
          <button className={`${styles.sliderBtn} ${styles.prev}`} onClick={() => slide('left')} aria-label="Previous">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          <div className={styles.promoGrid} ref={scrollRef}>
            {duplicatedCards.map((card, index) => (
              <div
                key={`${card.id}-${index}`}
                className={`${styles.promoCard} ${mounted ? styles.promoCardAnimate : ''}`}
                style={mounted ? { animationDelay: `${(index % promoCards.length) * 0.1}s` } : {}}
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
                          <img src={subcat.logo} alt={subcat.name} className={styles.dealItemLogo}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        ) : (
                          <img
                            src={`/placeholder.svg?height=32&width=32&text=${encodeURIComponent(subcat.name.substring(0, 1))}`}
                            alt={subcat.name} className={styles.dealItemLogo}
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

          <button className={`${styles.sliderBtn} ${styles.next}`} onClick={() => slide('right')} aria-label="Next">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  )
}
