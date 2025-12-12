'use client'

import Link from 'next/link'
import styles from './CategoryBanners.module.css'

interface CategoryBanner {
  id: string
  imageUrl?: string
  imageUrl2?: string
  title?: string
  description?: string
  desc?: string
  tag?: string
  categoryTag?: string
  price?: string
  productLink?: string
  productId2?: string
  link?: string
  bannerType?: 'single' | 'double'
  textAlignment?: string
  textAlignment2?: string
  textAlign?: string
  showCategoryTag?: boolean
  imagePosition?: {
    x?: number
    y?: number
    scale?: number
    rotation?: number
  }
  imagePosition2?: {
    x?: number
    y?: number
    scale?: number
    rotation?: number
  }
}

interface CategoryBannersProps {
  categoryName: string
  banners: CategoryBanner[]
}

export default function CategoryBanners({ categoryName, banners }: CategoryBannersProps) {
  if (!banners || banners.length === 0) {
    console.log(`CategoryBanners: No banners for ${categoryName}`)
    return null
  }

  console.log(`CategoryBanners: Rendering ${banners.length} banners for ${categoryName}`, banners)

  const getTextAlignment = (alignment?: string) => {
    if (!alignment) return 'center'
    return alignment.toLowerCase()
  }

  const renderSingleBanner = (banner: CategoryBanner, index: number) => {
    const image = banner.imageUrl || '/placeholder.svg?height=320&width=320&text=Banner'
    const link = banner.productLink || banner.link || '#'
    const tag = banner.categoryTag || banner.tag || categoryName
    const title = banner.title || ''
    const desc = banner.description || banner.desc || ''
    const price = banner.price || ''
    const textAlignment = getTextAlignment(banner.textAlignment || banner.textAlign)
    const showCategoryTag = banner.showCategoryTag !== false
    const imagePosition = banner.imagePosition || { x: 50, y: 50, scale: 100, rotation: 0 }

    const bannerContent = (
      <div
        className={styles.categoryBanner}
        style={{
          backgroundImage: `url('${image}')`,
          backgroundSize: 'cover',
          backgroundPosition: `${imagePosition.x}% ${imagePosition.y}%`,
        }}
        aria-label={`${categoryName} - ${title || 'Featured Solution'}`}
      >
        <div 
          className={`${styles.bannerContent} ${styles[`textAlign${textAlignment.charAt(0).toUpperCase() + textAlignment.slice(1)}`] || styles.textAlignCenter}`}
          aria-label={`${categoryName} - ${title || 'Featured Solution'}`}
        >
          {/* Category tag hidden visually but kept for SEO */}
          {showCategoryTag && tag && (
            <div className={styles.bannerTag} aria-hidden="true" style={{ display: 'none' }}>{tag}</div>
          )}
          {title && (
            <div className={styles.bannerTitle}>{title}</div>
          )}
          {desc && (
            <div className={styles.bannerDesc}>{desc}</div>
          )}
          {price && (
            <div className={styles.bannerPrice}>{price}</div>
          )}
        </div>
      </div>
    )

    if (link && link !== '#') {
      return (
        <Link key={index} href={link} className={styles.bannerLink}>
          {bannerContent}
        </Link>
      )
    }

    return <div key={index}>{bannerContent}</div>
  }

  const renderDoubleBanner = (banner: CategoryBanner, index: number) => {
    const image1 = banner.imageUrl || '/placeholder.svg?height=320&width=320&text=Banner'
    const image2 = banner.imageUrl2 || '/placeholder.svg?height=320&width=320&text=Banner'
    const link1 = banner.productLink || banner.link || '#'
    const link2 = banner.productId2 ? `/products/${banner.productId2}` : '#'
    const tag = banner.categoryTag || banner.tag || categoryName
    const title1 = banner.title || ''
    const desc1 = banner.description || banner.desc || ''
    const price1 = banner.price || ''
    const textAlignment1 = getTextAlignment(banner.textAlignment || banner.textAlign)
    const textAlignment2 = getTextAlignment(banner.textAlignment2)
    const showCategoryTag = banner.showCategoryTag !== false
    const imagePosition1 = banner.imagePosition || { x: 50, y: 50, scale: 100, rotation: 0 }
    const imagePosition2 = banner.imagePosition2 || { x: 50, y: 50, scale: 100, rotation: 0 }

    return (
      <div key={index} className={styles.doubleBannerContainer}>
        {link1 && link1 !== '#' ? (
          <Link href={link1} className={styles.bannerLink}>
            <div
              className={`${styles.categoryBanner} ${styles.doubleBannerLeft}`}
              style={{
                backgroundImage: `url('${image1}')`,
                backgroundSize: `${imagePosition1.scale}%`,
                backgroundPosition: `${imagePosition1.x}% ${imagePosition1.y}%`,
              }}
            >
              <div 
                className={`${styles.bannerContent} ${styles[`textAlign${textAlignment1.charAt(0).toUpperCase() + textAlignment1.slice(1)}`] || styles.textAlignCenter}`}
                aria-label={`${categoryName} - ${title1 || 'Featured Solution'}`}
              >
                {/* Category tag hidden visually but kept for SEO */}
                {showCategoryTag && tag && (
                  <div className={styles.bannerTag} aria-hidden="true" style={{ display: 'none' }}>{tag}</div>
                )}
                {title1 && (
                  <div className={styles.bannerTitle}>{title1}</div>
                )}
                {desc1 && (
                  <div className={styles.bannerDesc}>{desc1}</div>
                )}
                {price1 && (
                  <div className={styles.bannerPrice}>{price1}</div>
                )}
              </div>
            </div>
          </Link>
        ) : (
            <div
              className={`${styles.categoryBanner} ${styles.doubleBannerLeft}`}
              style={{
                backgroundImage: `url('${image1}')`,
                backgroundSize: `${imagePosition1.scale}%`,
                backgroundPosition: `${imagePosition1.x}% ${imagePosition1.y}%`,
              }}
              aria-label={`${categoryName} - ${title1 || 'Featured Solution'}`}
            >
              <div 
                className={`${styles.bannerContent} ${styles[`textAlign${textAlignment1.charAt(0).toUpperCase() + textAlignment1.slice(1)}`] || styles.textAlignCenter}`}
              >
                {/* Category tag hidden visually but kept for SEO */}
                {showCategoryTag && tag && (
                  <div className={styles.bannerTag} aria-hidden="true" style={{ display: 'none' }}>{tag}</div>
                )}
                {title1 && (
                  <div className={styles.bannerTitle}>{title1}</div>
                )}
                {desc1 && (
                  <div className={styles.bannerDesc}>{desc1}</div>
                )}
                {price1 && (
                  <div className={styles.bannerPrice}>{price1}</div>
                )}
              </div>
            </div>
        )}

        {link2 && link2 !== '#' ? (
          <Link href={link2} className={styles.bannerLink}>
            <div
              className={`${styles.categoryBanner} ${styles.doubleBannerRight}`}
              style={{
                backgroundImage: `url('${image2}')`,
                backgroundSize: `${imagePosition2.scale}%`,
                backgroundPosition: `${imagePosition2.x}% ${imagePosition2.y}%`,
              }}
            >
              <div 
                className={`${styles.bannerContent} ${styles[`textAlign${textAlignment2.charAt(0).toUpperCase() + textAlignment2.slice(1)}`] || styles.textAlignCenter}`}
                aria-label={`${categoryName} - ${title1 || 'Featured Solution'}`}
              >
                {/* Category tag hidden visually but kept for SEO */}
                {showCategoryTag && tag && (
                  <div className={styles.bannerTag} aria-hidden="true" style={{ display: 'none' }}>{tag}</div>
                )}
                {title1 && (
                  <div className={styles.bannerTitle}>{title1}</div>
                )}
                {desc1 && (
                  <div className={styles.bannerDesc}>{desc1}</div>
                )}
                {price1 && (
                  <div className={styles.bannerPrice}>{price1}</div>
                )}
              </div>
            </div>
          </Link>
        ) : (
            <div
              className={`${styles.categoryBanner} ${styles.doubleBannerRight}`}
              style={{
                backgroundImage: `url('${image2}')`,
                backgroundSize: `${imagePosition2.scale}%`,
                backgroundPosition: `${imagePosition2.x}% ${imagePosition2.y}%`,
              }}
              aria-label={`${categoryName} - ${title1 || 'Featured Solution'}`}
            >
              <div 
                className={`${styles.bannerContent} ${styles[`textAlign${textAlignment2.charAt(0).toUpperCase() + textAlignment2.slice(1)}`] || styles.textAlignCenter}`}
              >
                {/* Category tag hidden visually but kept for SEO */}
                {showCategoryTag && tag && (
                  <div className={styles.bannerTag} aria-hidden="true" style={{ display: 'none' }}>{tag}</div>
                )}
                {title1 && (
                  <div className={styles.bannerTitle}>{title1}</div>
                )}
                {desc1 && (
                  <div className={styles.bannerDesc}>{desc1}</div>
                )}
                {price1 && (
                  <div className={styles.bannerPrice}>{price1}</div>
                )}
              </div>
            </div>
        )}
      </div>
    )
  }

  return (
    <section 
      className={styles.categoryBanners} 
      id={`${categoryName.toLowerCase().replace(/\s+/g, '-')}-banners`}
      aria-label={`Featured ${categoryName} Solutions`}
    >
      {/* SEO-only heading - visually hidden but accessible to screen readers and search engines */}
      <h2 className={styles.seoHeading}>Featured {categoryName} Solutions</h2>
      <p className={styles.seoDescription}>Discover our top picks and special offers for {categoryName}</p>
      
      <div className={`${styles.categoryBannerGrid} ${banners.length === 2 ? styles.two : ''}`}>
        {banners.map((banner, index) => {
          if (banner.bannerType === 'double') {
            return renderDoubleBanner(banner, index)
          } else {
            return renderSingleBanner(banner, index)
          }
        })}
      </div>
    </section>
  )
}

