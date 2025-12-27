'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
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
    const [currentSlide, setCurrentSlide] = useState(0)

    // Filter banners to only show those matching this category relative to the passed prop
    const categoryBanners = banners.filter(b => b.categoryId === mainCategory)

    // Don't render if no banners for this category
    if (categoryBanners.length === 0) return null

    // Determine the primary display mode based on the latest banner (banners[0])
    const latestBanner = categoryBanners[0]
    const displayType = latestBanner.type

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

    const getBannerLink = (bannerImage: BannerImage): string | null => {
        if (!bannerImage.linkType || !bannerImage.linkData) return null

        const { linkType, linkData } = bannerImage

        if (linkType === 'product' && linkData.productId) {
            return `/product/${linkData.productId}`
        } else if (linkType === 'category') {
            const params = new URLSearchParams()
            if (linkData.main) params.set('main', linkData.main)
            if (linkData.sub) params.set('sub', linkData.sub)
            if (linkData.subSub) params.set('subSub', linkData.subSub)
            return `/products?${params.toString()}`
        } else if (linkType === 'custom' && linkData.url) {
            return linkData.url
        }
        return null
    }

    const renderBannerImage = (bannerImage: BannerImage, isSingle: boolean = false) => {
        if (!bannerImage || !bannerImage.url) return null

        const href = getBannerLink(bannerImage)
        const isExternal = bannerImage.linkType === 'custom'

        const content = (
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
        )

        if (href) {
            if (isExternal) {
                return (
                    <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={isSingle ? styles.singleBannerWrapper : styles.doubleBannerWrapper}
                        aria-label={bannerImage.alt || 'Banner'}
                    >
                        {content}
                    </a>
                )
            }
            return (
                <Link
                    href={href}
                    className={isSingle ? styles.singleBannerWrapper : styles.doubleBannerWrapper}
                    aria-label={bannerImage.alt || 'Banner'}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    {content}
                </Link>
            )
        }

        return (
            <div className={isSingle ? styles.singleBannerWrapper : styles.doubleBannerWrapper}>
                {content}
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
