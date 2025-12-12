'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import styles from './BannerSection.module.css'

interface Banner {
  id: string
  imageUrl?: string
  title?: string
  description?: string
  desc?: string
  tag?: string
  price?: string
  textAlignment?: string
  textAlign?: string
  link?: string
  productLink?: string
  status?: string
  order?: number
}

interface BannerSectionProps {
  banners: Banner[]
}

export default function BannerSection({ banners }: BannerSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Filter active banners and sort by order
  const activeBanners = banners
    .filter(banner => !banner.status || banner.status === 'active')
    .sort((a, b) => (a.order || 0) - (b.order || 0))

  useEffect(() => {
    if (activeBanners.length > 1 && isAutoPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % activeBanners.length)
      }, 5000) // Auto-slide every 5 seconds
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
    }
  }, [activeBanners.length, isAutoPlaying])

  // Pause auto-play on hover
  const handleMouseEnter = () => {
    setIsAutoPlaying(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
  }

  const handleMouseLeave = () => {
    setIsAutoPlaying(true)
  }

  const goToSlide = (index: number) => {
    setCurrentIndex(index)
    setIsAutoPlaying(false)
    // Resume auto-play after 10 seconds
    setTimeout(() => setIsAutoPlaying(true), 10000)
  }

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + activeBanners.length) % activeBanners.length)
    setIsAutoPlaying(false)
    setTimeout(() => setIsAutoPlaying(true), 10000)
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % activeBanners.length)
    setIsAutoPlaying(false)
    setTimeout(() => setIsAutoPlaying(true), 10000)
  }

  if (!activeBanners || activeBanners.length === 0) {
    return null
  }

  const currentBanner = activeBanners[currentIndex]
  const bannerLink = currentBanner.productLink || currentBanner.link
  const textAlignment = currentBanner.textAlignment || currentBanner.textAlign || 'center'
  const description = currentBanner.description || currentBanner.desc

  const getAlignmentClass = (alignment: string) => {
    const align = alignment.toLowerCase()
    if (align === 'left') return styles.textAlignLeft
    if (align === 'right') return styles.textAlignRight
    return styles.textAlignCenter
  }

  const BannerContent = (
    <div
      className={styles.banner}
      style={{
        backgroundImage: currentBanner.imageUrl
          ? `url(${currentBanner.imageUrl})`
          : 'linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%)',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={`${styles.bannerContent} ${getAlignmentClass(textAlignment)}`}>
        {currentBanner.tag && (
          <span className={styles.bannerTag}>{currentBanner.tag}</span>
        )}
        {currentBanner.title && (
          <h2 className={styles.bannerTitle}>{currentBanner.title}</h2>
        )}
        {description && (
          <p className={styles.bannerDesc}>{description}</p>
        )}
        {currentBanner.price && (
          <div className={styles.bannerPrice}>{currentBanner.price}</div>
        )}
      </div>
    </div>
  )

  return (
    <section className={styles.bannerSection} id="banner-section">
      <div className={styles.container}>
        <div className={styles.bannersContainer} id="banners-container">
          {bannerLink && bannerLink !== '#' ? (
            <Link href={bannerLink} className={styles.bannerLink}>
              {BannerContent}
            </Link>
          ) : (
            BannerContent
          )}

          {activeBanners.length > 1 && (
            <>
              <button
                className={`${styles.sliderBtn} ${styles.prev}`}
                onClick={goToPrev}
                aria-label="Previous banner"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <button
                className={`${styles.sliderBtn} ${styles.next}`}
                onClick={goToNext}
                aria-label="Next banner"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>

              <div className={styles.bannerIndicators}>
                {activeBanners.map((_, index) => (
                  <button
                    key={index}
                    className={`${styles.indicator} ${index === currentIndex ? styles.active : ''}`}
                    onClick={() => goToSlide(index)}
                    aria-label={`Go to banner ${index + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

