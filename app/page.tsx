import { Metadata } from 'next'
import PromoSection from '@/components/PromoSection'
import ProductsSection from '@/components/ProductsSection'
import ServicesSection from '@/components/ServicesSection'
import BlogSection from '@/components/BlogSection'
import BannerSection from '@/components/BannerSection'
import BackToTop from '@/components/BackToTop'
import { getHomePageData } from '@/lib/getHomeData'

export const metadata: Metadata = {
  title: 'Deczon - Smart Home Automation, Lighting & Interiors',
  description: 'Transform your home with Deczon. Premium smart tech, automation systems, lighting designs, and interior solutions. Fast delivery & professional installation available.',
  keywords: 'smart home, home automation, lighting, interior design, deczon, smart tech, flooring, cooling',
}

// Data revalidation - ISR (3600 seconds = 1 hour)
export const revalidate = 3600

export default async function Home() {
  // Fetch data on the server
  const {
    categories,
    products,
    services,
    categoryBanners,
    mainCategorySections,
    blogs
  } = await getHomePageData()

  // Generate structured data (JSON-LD)

  // 1. Product Schema (ItemList)
  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'numberOfItems': products.length,
    'itemListElement': products.slice(0, 20).map((product, index) => ({
      '@type': 'ListItem',
      'position': index + 1,
      'item': {
        '@type': 'Product',
        'name': product.name,
        'description': product.description || `Buy ${product.name} at Deczon`,
        'image': product.primaryImageUrl || product.imageUrl || product.images?.[0],
        'url': `https://deczon.com/products/${product.id}`,
        'offers': {
          '@type': 'Offer',
          'price': typeof product.currentPrice === 'string' ? parseFloat(product.currentPrice.replace(/[^\d.]/g, '')) : product.currentPrice,
          'priceCurrency': 'INR',
          'availability': 'https://schema.org/InStock'
        }
      }
    }))
  }

  // 2. Service Schema
  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'name': 'Our Services',
    'itemListElement': services.map((service, index) => ({
      '@type': 'ListItem',
      'position': index + 1,
      'item': {
        '@type': 'Service',
        'name': service.name,
        'description': service.description || service.name,
        'image': service.imageUrl || service.primaryImageUrl || service.imageUrls?.[0],
        'url': `https://deczon.com/services/${service.id}`,
        'offers': {
          '@type': 'Offer',
          'price': typeof service.startingPrice === 'number' ? service.startingPrice : undefined,
          'priceCurrency': 'INR'
        }
      }
    }))
  }

  // 3. Blog Schema
  // We can treat them as NewsArticle or BlogPosting
  const blogSchema = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    'blogPost': blogs.map(blog => ({
      '@type': 'BlogPosting',
      'headline': blog.title,
      'image': blog.primaryImage || blog.imageUrl,
      'datePublished': blog.createdAt?.toDate ? blog.createdAt.toDate().toISOString() : new Date().toISOString(),
      'author': {
        '@type': 'Person',
        'name': blog.author || 'Deczon Team'
      }
    }))
  }

  return (
    <>
      {/* JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([productSchema, serviceSchema, blogSchema]) }}
      />

      {/* Main H1 for SEO (Visually hidden or integrated if design allows, keeping it clean for now) */}
      <h1 style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>
        Deczon Smart Home & Interiors
      </h1>

      {/* Smart Home Categories Promo Section */}
      <PromoSection categories={categories} />

      {/* Dynamic Main Category Sections */}
      {mainCategorySections.length > 0 && (
        <div id="main-category-sections">
          {mainCategorySections.map((mainCategory) => {
            // Filter products for this category
            const categoryProducts = products.filter(
              (p: any) => p.mainCategory === mainCategory || p.category === mainCategory
            ).slice(0, 10)

            const hasProducts = categoryProducts.length > 0

            // Skip category entirely if it has NO PRODUCTS
            if (!hasProducts) return null

            // Get banners for this category
            const banners = categoryBanners[mainCategory] || []

            const bannerElement = banners.length > 0 ? (
              <BannerSection
                mainCategory={mainCategory}
                banners={banners}
              />
            ) : null

            return (
              <div key={mainCategory} style={{ marginTop: '3rem', clear: 'both', scrollMarginTop: '100px' }} id={`category-${mainCategory.replace(/\s+/g, '-').toLowerCase()}`}>

                {/* Products Section with embedded Banner */}
                {hasProducts && (
                  <ProductsSection
                    categoryName={mainCategory}
                    productsList={categoryProducts}
                    showSeeAll={true}
                    banner={bannerElement}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Services Section */}
      <ServicesSection services={services} />

      {/* Blog Section */}
      <BlogSection blogs={blogs} />

      {/* Back to Top Button */}
      <BackToTop />
    </>
  )
}
