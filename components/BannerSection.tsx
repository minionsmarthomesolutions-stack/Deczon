'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import styles from './BannerSection.module.css'

interface BannerImage {
    url: string
    alt?: string
    cta?: string
    linkType: 'product' | 'category' | 'custom'
    linkData?: {
        productId?: string
        productName?: string
        main?: string
        sub?: string
        subSub?: string
        url?: string
    }
}

interface Banner {
    id: string
    type: 'single' | 'double'
    categoryId: string
    banners: {
        a: BannerImage
        b?: BannerImage
    }
}

interface BannerSectionProps {
    mainCategory: string
    banners: Banner[]
}

export default function BannerSection({ mainCategory, banners }: BannerSectionProps) {
    const router = useRouter()
    const [currentSlide, setCurrentSlide] = useState(0)

    // Filter banners to only show those matching this category
    const categoryBanners = banners.filter(b => b.categoryId === mainCategory)

    // Separate single and double banners
    const singleBanners = categoryBanners.filter(b => b.type === 'single')
    const doubleBanners = categoryBanners.filter(b => b.type === 'double')

    // Auto-slide for single banners only
    useEffect(() => {
        if (singleBanners.length <= 1) return

        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % singleBanners.length)
        }, 5000) // 5 seconds per slide

        return () => clearInterval(interval)
    }, [singleBanners.length])

    const handleBannerClick = useCallback((bannerImage: BannerImage) => {
        if (!bannerImage.linkType || !bannerImage.linkData) return

        const { linkType, linkData } = bannerImage

        if (linkType === 'product' && linkData.productId) {
            router.push(`/product/${linkData.productId}`)
        } else if (linkType === 'category') {
            const params = new URLSearchParams()
            if (linkData.main) params.set('main', linkData.main)
            if (linkData.sub) params.set('sub', linkData.sub)
            if (linkData.subSub) params.set('subSub', linkData.subSub)
            router.push(`/products?${params.toString()}`)
        } else if (linkType === 'custom' && linkData.url) {
            window.open(linkData.url, '_blank', 'noopener,noreferrer')
        }
    }, [router])

    const renderBannerImage = (bannerImage: BannerImage, isSingle: boolean = false) => {
        if (!bannerImage || !bannerImage.url) return null

        return (
            <div
                className={isSingle ? styles.singleBannerWrapper : styles.doubleBannerWrapper}
                onClick={() => handleBannerClick(bannerImage)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        handleBannerClick(bannerImage)
                    }
                }}
            >
                <div className={styles.bannerImageContainer}>
                    <Image
                        src={bannerImage.url}
                        alt={bannerImage.alt || 'Banner'}
                        fill
                        sizes={isSingle ? '100vw' : '50vw'}
                        style={{ objectFit: 'cover' }}
                        priority={isSingle}
                        quality={90}
                    />
                    {bannerImage.cta && (
                        <div className={styles.ctaOverlay}>
                            <span className={styles.ctaText}>{bannerImage.cta}</span>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    // Don't render if no banners for this category
    if (categoryBanners.length === 0) return null

    return (
        <section className={styles.bannerSection}>
            {/* Single Banners - Slider */}
            {singleBanners.length > 0 && (
                <div className={styles.singleBannerContainer}>
                    <div
                        className={styles.sliderTrack}
                        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                    >
                        {singleBanners.map((banner) => (
                            <div key={banner.id} className={styles.slide}>
                                {renderBannerImage(banner.banners.a, true)}
                            </div>
                        ))}
                    </div>

                    {/* Slider Indicators */}
                    {singleBanners.length > 1 && (
                        <div className={styles.sliderIndicators}>
                            {singleBanners.map((_, index) => (
                                <button
                                    key={index}
                                    className={`${styles.indicator} ${index === currentSlide ? styles.active : ''}`}
                                    onClick={() => setCurrentSlide(index)}
                                    aria-label={`Go to slide ${index + 1}`}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Double Banners - Static Grid */}
            {doubleBanners.map((banner) => (
                <div key={banner.id} className={styles.doubleBannerContainer}>
                    {renderBannerImage(banner.banners.a, false)}
                    {banner.banners.b && renderBannerImage(banner.banners.b, false)}
                </div>
            ))}
        </section>
    )
}
