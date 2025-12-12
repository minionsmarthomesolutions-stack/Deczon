'use client'

import { useEffect, useState, useRef } from 'react'
import BannerSection from '@/components/BannerSection'
import PromoSection from '@/components/PromoSection'
import ProductsSection from '@/components/ProductsSection'
import ServicesSection from '@/components/ServicesSection'
import BlogSection from '@/components/BlogSection'

import BackToTop from '@/components/BackToTop'
import MinionLoader from '@/components/MinionLoader'
import { db } from '@/lib/firebase'
import { collection, getDocs, query, orderBy, limit, doc, getDoc, where } from 'firebase/firestore'

export default function Home() {
  const [categories, setCategories] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [banners, setBanners] = useState<any[]>([])

  const [mainCategorySections, setMainCategorySections] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const loadStartTime = useRef<number | null>(null)
  const MIN_LOAD_TIME = 1500 // Minimum 1.5 seconds

  useEffect(() => {
    loadData()
  }, [])

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
        setCategories(mainCategories.map(name => ({
          name,
          subcategories: categoriesData[name]?.subcategories || {}
        })))
        setMainCategorySections(mainCategories)
        console.log(`Loaded ${mainCategories.length} categories:`, mainCategories)
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
          if (fallbackCategories.length > 0) {
            setCategories(fallbackCategories.map(name => ({ name, subcategories: {} })))
            setMainCategorySections(fallbackCategories)
            console.log(`Using fallback categories from products: ${fallbackCategories.length} categories`)
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

      // Load banners - try multiple queries
      try {
        let allBanners: any[] = []

        // Try ordered query first
        try {
          const bannersQuery = query(collection(db, 'banners'), orderBy('order', 'asc'), limit(10))
          const bannersSnapshot = await getDocs(bannersQuery)
          allBanners = bannersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
        } catch (orderError: any) {
          // Check if it's a permission error
          if (orderError?.code === 'permission-denied' || orderError?.code === 'missing-or-insufficient-permissions') {
            // Permission denied - skip trying without order
            console.warn('Firebase permission denied for banners. Skipping banner load.')
            allBanners = []
          } else {
            // If orderBy fails for other reasons, try without ordering
            console.warn('Banner orderBy failed, trying without order:', orderError)
            try {
              const bannersSnapshot = await getDocs(collection(db, 'banners'))
              allBanners = bannersSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              })).slice(0, 10)
            } catch (fallbackError: any) {
              // If fallback also fails due to permissions, handle gracefully
              if (fallbackError?.code === 'permission-denied' || fallbackError?.code === 'missing-or-insufficient-permissions') {
                console.warn('Firebase permission denied for banners. Skipping banner load.')
                allBanners = []
              } else {
                throw fallbackError
              }
            }
          }
        }

        setBanners(allBanners)
        if (allBanners.length > 0) {
          console.log(`Loaded ${allBanners.length} banners`)
        }
      } catch (error: any) {
        // Handle permission errors gracefully without showing error messages
        if (error?.code === 'permission-denied' || error?.code === 'missing-or-insufficient-permissions') {
          console.warn('Firebase permission denied for banners. The app will continue without banners.')
          setBanners([])
        } else {
          console.warn('Error loading banners:', error)
          setBanners([])
        }
      }

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

      // Load category banners - will be called after mainCategorySections is set
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
      setBanners([])
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
    return <MinionLoader fullScreen message="Getting your smart home experience ready..." />
  }

  return (
    <>
      {/* Banner Section */}
      <BannerSection banners={banners} />

      {/* Smart Home Categories Promo Section */}
      <PromoSection categories={categories} />

      {/* Dynamic Main Category Sections */}
      {mainCategorySections.length > 0 && (
        <div id="main-category-sections">
          {mainCategorySections.map((mainCategory) => {
            const categoryProducts = products.filter(
              (p: any) => p.mainCategory === mainCategory || p.category === mainCategory
            ).slice(0, 10)

            if (categoryProducts.length === 0) return null


            return (
              <div key={mainCategory}>
                <ProductsSection
                  categoryName={mainCategory}
                  productsList={categoryProducts}
                  showSeeAll={true}
                />
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
