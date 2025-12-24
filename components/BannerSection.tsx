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

    // Filter banners to only show those matching this category relative to the passed prop
    // Note: page.tsx typically passes banners pre-filtered or we filter here to be safe.
    // The prop name is 'banners', usually containing all banners or relevant ones.
    // Based on previous code, it filtered by categoryId.
    const categoryBanners = banners.filter(b => b.categoryId === mainCategory)

    // Don't render if no banners for this category
    if (categoryBanners.length === 0) return null

    // Determine the primary display mode based on the latest banner (banners[0])
    // We assume banners are sorted by date desc as per page.tsx query
    const latestBanner = categoryBanners[0]
    const displayType = latestBanner.type

    // Logic:
    // 1. If latest is 'single', show Slider of available Single Banners
    // 2. If latest is 'double', show ONLY the latest Double Banner instance (no stacking)

    const singleBanners = displayType === 'single' ? categoryBanners.filter(b => b.type === 'single') : []
    const activeDoubleBanner = displayType === 'double' ? latestBanner : null

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
                </div>
            </div>
        )
    }

    return (
        <section className={styles.bannerSection}>
            {/* Single Banners - Slider */}
            {displayType === 'single' && singleBanners.length > 0 && (
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

            {/* Double Banner - Single Instance */}
            {displayType === 'double' && activeDoubleBanner && (
                <div key={activeDoubleBanner.id} className={styles.doubleBannerContainer}>
                    {renderBannerImage(activeDoubleBanner.banners.a, false)}
                    {activeDoubleBanner.banners.b && renderBannerImage(activeDoubleBanner.banners.b, false)}
                </div>
            )}
        </section>
    )
}
