'use client'

import { useEffect, useState, useRef } from 'react'
import PromoSection from '@/components/PromoSection'
import ProductsSection from '@/components/ProductsSection'
import ServicesSection from '@/components/ServicesSection'
import BlogSection from '@/components/BlogSection'
import BannerSection from '@/components/BannerSection'

import BackToTop from '@/components/BackToTop'

import { db } from '@/lib/firebase'
import { collection, getDocs, query, orderBy, limit, doc, getDoc, where } from 'firebase/firestore'

export default function Home() {
  const [categories, setCategories] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [categoryBanners, setCategoryBanners] = useState<{ [key: string]: any[] }>({})

  const [mainCategorySections, setMainCategorySections] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const loadStartTime = useRef<number | null>(null)
  const MIN_LOAD_TIME = 1500 // Minimum 1.5 seconds

  useEffect(() => {
    loadData()
  }, [])

  // Fetch banners for each category after categories are loaded
  useEffect(() => {
    if (mainCategorySections.length === 0 || !db) return

    const fetchCategoryBanners = async () => {
      if (!db) return // Type guard for TypeScript

      try {
        const bannersMap: { [key: string]: any[] } = {}

        // Fetch banners for each main category
        for (const mainCategory of mainCategorySections) {
          try {
            const bannersQuery = query(
              collection(db, 'banners'),
              where('categoryId', '==', mainCategory),
              orderBy('createdAt', 'desc')
            )
            const bannersSnapshot = await getDocs(bannersQuery)
            const categoryBannersList = bannersSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }))

            if (categoryBannersList.length > 0) {
              bannersMap[mainCategory] = categoryBannersList
              console.log(`Loaded ${categoryBannersList.length} banners for category: ${mainCategory}`)
            }
          } catch (error: any) {
            // Handle permission errors or missing index gracefully
            if (error?.code === 'permission-denied' || error?.code === 'missing-or-insufficient-permissions') {
              console.warn(`Firebase permission denied for banners in category: ${mainCategory}`)
            } else if (error?.code === 'failed-precondition') {
              console.warn(`Missing index for banners query in category: ${mainCategory}. Banners will not be displayed.`)
            } else {
              console.warn(`Error loading banners for ${mainCategory}:`, error)
            }
          }
        }

        setCategoryBanners(bannersMap)
      } catch (error) {
        console.warn('Error fetching category banners:', error)
      }
    }

    fetchCategoryBanners()
  }, [mainCategorySections])

  const loadData = async () => {
    loadStartTime.current = Date.now()
    if (!db) {
      setTimeout(() => {
        setLoading(false)
      }, MIN_LOAD_TIME)
      return
    }

    try {
      // Load categories structure
      let categoriesData: any = null

      // Try loading from categories collection
      const categoriesSnapshot = await getDocs(collection(db, 'categories'))
      if (!categoriesSnapshot.empty) {
        const transformed: any = {}
        categoriesSnapshot.forEach((docSnapshot) => {
          const d = docSnapshot.data() || {}
          const main = docSnapshot.id
          if (d && d.subcategories) {
            transformed[main] = { subcategories: d.subcategories }
          }
        })
        if (Object.keys(transformed).length > 0) {
          categoriesData = transformed
        }
      }

      // If no categories from collection, try structure doc
      if (!categoriesData) {
        const categoriesDoc = await getDoc(doc(db, 'categories', 'structure'))
        if (categoriesDoc.exists()) {
          const raw = categoriesDoc.data().categories || {}
          categoriesData = raw
        }
      }

      if (categoriesData) {
        const mainCategories = Object.keys(categoriesData)

        // CRITICAL FIX: Sort categories alphabetically for stable order
        // Object.keys() does not guarantee order, causing banners to appear under different categories on refresh
        const sortedCategories = [...mainCategories].sort((a, b) => a.localeCompare(b))

        setCategories(sortedCategories.map(name => ({
          name,
          subcategories: categoriesData[name]?.subcategories || {}
        })))
        setMainCategorySections(sortedCategories)
        console.log(`Loaded ${sortedCategories.length} categories (sorted):`, sortedCategories)
      } else {
        // Fallback: try to get categories from products
        try {
          const productsSnapshot = await getDocs(collection(db, 'products'))
          const categorySet = new Set<string>()
          productsSnapshot.docs.forEach(doc => {
            const data = doc.data()
            if (data.mainCategory) categorySet.add(data.mainCategory)
            if (data.category) categorySet.add(data.category)
          })
          const fallbackCategories = Array.from(categorySet)

          // CRITICAL FIX: Sort categories alphabetically for stable order
          // Set -> Array does not guarantee order
          const sortedFallback = [...fallbackCategories].sort((a, b) => a.localeCompare(b))

          if (sortedFallback.length > 0) {
            setCategories(sortedFallback.map(name => ({ name, subcategories: {} })))
            setMainCategorySections(sortedFallback)
            console.log(`Using fallback categories from products (sorted): ${sortedFallback.length} categories`)
          }
        } catch (error) {
          console.warn('Error getting fallback categories:', error)
        }
      }

      // Load products - try multiple queries to get all products
      try {
        let allProducts: any[] = []

        // Try to get products ordered by createdAt
        try {
          const productsQuery = query(collection(db, 'products'), orderBy('createdAt', 'desc'), limit(100))
          const productsSnapshot = await getDocs(productsQuery)
          allProducts = productsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
        } catch (orderError: any) {
          // Check if it's a permission error
          if (orderError?.code === 'permission-denied' || orderError?.code === 'missing-or-insufficient-permissions') {
            // Permission denied - skip trying without order
            console.warn('Firebase permission denied for products. Skipping product load.')
            allProducts = []
          } else {
            // If orderBy fails for other reasons, try without ordering
            console.warn('OrderBy failed, trying without order:', orderError)
            try {
              const productsSnapshot = await getDocs(collection(db, 'products'))
              allProducts = productsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              })).slice(0, 100)
            } catch (fallbackError: any) {
              // If fallback also fails due to permissions, handle gracefully
              if (fallbackError?.code === 'permission-denied' || fallbackError?.code === 'missing-or-insufficient-permissions') {
                console.warn('Firebase permission denied for products. Skipping product load.')
                allProducts = []
              } else {
                throw fallbackError
              }
            }
          }
        }

        setProducts(allProducts)
        if (allProducts.length > 0) {
          console.log(`Loaded ${allProducts.length} products`)
        }
      } catch (error: any) {
        // Handle permission errors gracefully without showing error messages
        if (error?.code === 'permission-denied' || error?.code === 'missing-or-insufficient-permissions') {
          console.warn('Firebase permission denied for products. The app will continue without products.')
          setProducts([])
        } else {
          console.warn('Error loading products:', error)
          setProducts([])
        }
      }

      // ❌ REMOVED: Global banner loading pipeline (duplicate of category-based pipeline)
      // This was causing state pollution and race conditions with categoryBanners
      // Banners are now loaded ONLY in the category-based useEffect

      // Load services - try with status filter first (like HTML version)
      try {
        let allServices: any[] = []

        // Try with status filter first (like HTML version)
        try {
          const servicesQuery = query(
            collection(db, 'services'),
            where('status', '==', 'active'),
            orderBy('createdAt', 'desc'),
            limit(6)
          )
          const servicesSnapshot = await getDocs(servicesQuery)
          allServices = servicesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
        } catch (statusError: any) {
          // If status filter fails, try without status filter
          if (statusError?.code === 'permission-denied' || statusError?.code === 'missing-or-insufficient-permissions') {
            console.warn('Firebase permission denied for services. Skipping service load.')
            allServices = []
          } else {
            console.warn('Services status filter failed, trying without status:', statusError)
            try {
              // Try with orderBy but without status filter
              const servicesQuery = query(collection(db, 'services'), orderBy('createdAt', 'desc'), limit(6))
              const servicesSnapshot = await getDocs(servicesQuery)
              allServices = servicesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              }))
            } catch (orderError: any) {
              // If orderBy fails, try without ordering
              if (orderError?.code === 'permission-denied' || orderError?.code === 'missing-or-insufficient-permissions') {
                console.warn('Firebase permission denied for services. Skipping service load.')
                allServices = []
              } else {
                console.warn('Services orderBy failed, trying without order:', orderError)
                try {
                  const servicesSnapshot = await getDocs(collection(db, 'services'))
                  allServices = servicesSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                  })).slice(0, 6)
                } catch (fallbackError: any) {
                  if (fallbackError?.code === 'permission-denied' || fallbackError?.code === 'missing-or-insufficient-permissions') {
                    console.warn('Firebase permission denied for services. Skipping service load.')
                    allServices = []
                  } else {
                    throw fallbackError
                  }
                }
              }
            }
          }
        }

        setServices(allServices)
        if (allServices.length > 0) {
          console.log(`Loaded ${allServices.length} services`)
        }
      } catch (error: any) {
        // Handle permission errors gracefully without showing error messages
        if (error?.code === 'permission-denied' || error?.code === 'missing-or-insufficient-permissions') {
          console.warn('Firebase permission denied for services. The app will continue without services.')
          setServices([])
        } else {
          console.warn('Error loading services:', error)
          setServices([])
        }
      }
    } catch (error: any) {
      // Handle permission errors gracefully
      if (error?.code === 'permission-denied' || error?.code === 'missing-or-insufficient-permissions') {
        console.warn('Firebase permission denied. The app will work with static/fallback data.')
      } else {
        console.warn('Error loading data:', error?.message || error)
      }
      // Fallback to static data if Firebase fails
      setCategories([])
      setProducts([])
      setServices([])
      // ❌ REMOVED: setBanners([]) - no longer using global banners state
      setMainCategorySections([])
    } finally {
      // Ensure loader shows for minimum time
      const elapsed = loadStartTime.current ? Date.now() - loadStartTime.current : 0
      const remainingTime = Math.max(0, MIN_LOAD_TIME - elapsed)

      setTimeout(() => {
        setLoading(false)
      }, remainingTime)
    }
  }

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>Getting your smart home experience ready...</div>
  }

  return (
    <>
      {/* Banner Section */}
      {/* Banner Section - GLOBAL REMOVED per requirement (category based only) */}
      {/* <BannerSection banners={banners} /> */}

      {/* Smart Home Categories Promo Section */}
      <PromoSection categories={categories} />

      {/* Dynamic Main Category Sections */}
      {mainCategorySections.length > 0 && (
        <div id="main-category-sections">
          {mainCategorySections.map((mainCategory) => {
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
      <BlogSection />

      {/* Back to Top Button */}
      <BackToTop />
    </>
  )
}
