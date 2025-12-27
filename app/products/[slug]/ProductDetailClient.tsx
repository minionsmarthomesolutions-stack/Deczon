'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

import BlogSection from '@/components/BlogSection'
import { db } from '@/lib/firebase'
import { doc, getDoc, collection, getDocs, query, where, limit, orderBy, addDoc, serverTimestamp, runTransaction } from 'firebase/firestore'
import { getServiceImageUrl as getServiceImageUrlUtil } from '@/lib/serviceImageUtils'
import styles from './product-detail.module.css'

interface Product {
  id: string
  slug?: string
  name?: string
  productName?: string
  primaryImageUrl?: string
  imageUrl?: string
  images?: string[]
  additionalImageUrls?: string[]
  currentPrice?: number
  originalPrice?: number
  price?: number
  mrp?: number
  discountPercent?: number
  description?: string
  longDescription?: string
  brand?: string
  category?: string
  mainCategory?: string
  subcategory?: string
  subsubcategory?: string
  productDetails?: Array<{ name: string; value: string }>
  specifications?: Record<string, string> | Array<{ name: string; value: string }>
  colorVariants?: Array<{
    productId: string
    slug?: string
    name: string
    colorName: string
    imageUrl: string
    currentPrice: number
    originalPrice: number
    discountPercent?: number
    priceUnit?: string
    productName?: string
    thumbnailUrls?: string[]
    description?: string
  }>
  productGroupId?: string
  priceUnit?: string
  estimatedDelivery?: string
  freeShippingThreshold?: number
  material?: string
  colorName?: string
  currentColorName?: string
  colorVariant?: {
    colorName: string
    material?: string
  }
  groupProducts?: Product[]
  thumbnailUrls?: string[]
  availableColors?: Array<{
    name?: string
    colorName?: string
    imageUrl?: string
    currentPrice?: number
    originalPrice?: number
    discountPercent?: number
    thumbnailUrls?: string[]
    description?: string
  }>
  moduleOptions?: Array<{
    gangType?: string
    productName?: string
    currentPrice?: number
    originalPrice?: number
    discountPrice?: number
    moduleImageUrl?: string
    imageUrl?: string
    description?: string
  }>
  services?: string[] | Array<{
    id?: string
    name?: string
    category?: string
  }>
  productCombinations?: Array<{
    products?: Array<{
      id?: string
      name?: string
      title?: string
      productName?: string
      imageUrl?: string
      imageurl?: string
      primaryImageUrl?: string
      thumbnailUrl?: string
      price?: number
      currentPrice?: number
      discountedPrice?: number
      originalPrice?: number
      mrp?: number
      category?: string
      productCategory?: string
      warrantyDescription?: string
      description?: string
      longDescription?: string
    }>
  }>
}

interface ColorOption {
  name: string
  colorName: string
  imageUrl?: string
  currentPrice: number
  originalPrice: number
  productId?: string
  slug?: string
  isVariant?: boolean
  description?: string
  discountPercent?: number
  thumbnailUrls?: string[]
  showViewTag?: boolean
}

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  // Retrieve ID from product state once loaded

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  // ... (keeping other state initializations same)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [selectedColorIndex, setSelectedColorIndex] = useState(-1)
  const [selectedColor, setSelectedColor] = useState<ColorOption | null>(null)
  const [selectedMaterialIndex, setSelectedMaterialIndex] = useState(-1)
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null)
  const [selectedModuleIndex, setSelectedModuleIndex] = useState(0)
  const [selectedModule, setSelectedModule] = useState<any>(null)
  const [fbtItems, setFbtItems] = useState<Array<{
    id: string
    name: string
    imageUrl: string
    price: number
    originalPrice: number
    isBase: boolean
    checked: boolean
    category?: string
    description?: string
  }>>([])
  const [fbtChecked, setFbtChecked] = useState<boolean[]>([])
  const [warrantyModalOpen, setWarrantyModalOpen] = useState(false)
  const [warrantyModalData, setWarrantyModalData] = useState<any>(null)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)
  const [modalImageUrl, setModalImageUrl] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [hasJustAdded, setHasJustAdded] = useState(false)
  const [availableServices, setAvailableServices] = useState<Array<{
    id: string
    name: string
    category?: string
    imageUrl?: string
    primaryImageUrl?: string
    imageUrls?: string[]
    galleryImages?: string[] | { main?: string } | Record<string, any>
    images?: string[]
    secondaryImages?: string[]
    additionalImages?: string[]
    photoUrls?: string[]
    gallery?: string[] | Record<string, any>
    startingPrice?: number
    basePrice?: number
    priceFrom?: number
    minPrice?: number
    minimumPrice?: number
    price?: number
    originalPrice?: number
    description?: string
    [key: string]: any
  }>>([])
  const [servicesLoading, setServicesLoading] = useState(false)
  const servicesGridRef = useRef<HTMLDivElement>(null)
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([])
  const [activeTab, setActiveTab] = useState('description')
  const [showFullSpecs, setShowFullSpecs] = useState(false)
  const [showFullDescription, setShowFullDescription] = useState(false)
  const [enquiryModalOpen, setEnquiryModalOpen] = useState(false)
  const [enquiryForm, setEnquiryForm] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    message: ''
  })

  const mainImageRef = useRef<HTMLImageElement>(null)
  const zoomContainerRef = useRef<HTMLDivElement>(null)
  const zoomLensRef = useRef<HTMLDivElement>(null)
  const zoomResultRef = useRef<HTMLDivElement>(null)
  const originalImageRef = useRef<string>('')
  const isThumbnailHoverActiveRef = useRef<boolean>(false)
  const stickyElementRef = useRef<HTMLDivElement>(null)
  const tabsSectionRef = useRef<HTMLElement>(null)
  const productDetailContainerRef = useRef<HTMLDivElement>(null)
  const relatedProductsSidebarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let isMounted = true

    if (slug) {
      loadProductDetail().then(() => {
        // Only update state if component is still mounted
        if (!isMounted) return
      }).catch((error) => {
        if (isMounted) {
          // Silently handle error
        }
      })
    }

    // Cleanup function to prevent memory leaks
    return () => {
      isMounted = false
    }
  }, [slug])

  // Simple sticky behavior - matching HTML exactly
  useEffect(() => {
    if (typeof window === 'undefined' || !product) return

    const stickyElement = stickyElementRef.current
    if (!stickyElement) return

    let observer: IntersectionObserver | null = null

    // Function to observe stop-sticky trigger - matching HTML observeSeeMoreSticky exactly
    const observeSeeMoreSticky = () => {
      const seeMoreBtn = document.querySelector(`.${styles.seeMoreLink}`) ||
        document.getElementById('see-more-btn') ||
        document.getElementById('see-more-container')

      if (!seeMoreBtn) {
        setTimeout(observeSeeMoreSticky, 200)
        return
      }

      // Create stop-sticky-trigger if it doesn't exist
      if (!document.getElementById('stop-sticky-trigger')) {
        const stopTrigger = document.createElement('div')
        stopTrigger.id = 'stop-sticky-trigger'
        if (seeMoreBtn.parentElement) {
          seeMoreBtn.parentElement.insertBefore(stopTrigger, seeMoreBtn)
        }
      }

      const trigger = document.getElementById('stop-sticky-trigger')
      if (!trigger || !stickyElement) return

      // Disconnect existing observer
      if (observer) observer.disconnect()

      // Create new observer - matching HTML exactly
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              stickyElement.classList.add('stop-sticky')
            } else {
              stickyElement.classList.remove('stop-sticky')
            }
          })
        },
        {
          root: null,
          threshold: 0,
        }
      )

      observer.observe(trigger)
    }

    // Start observing
    observeSeeMoreSticky()

    // Cleanup
    return () => {
      if (observer) observer.disconnect()
    }
  }, [product])

  // Handle image modal body scroll lock and ESC key
  useEffect(() => {
    if (isImageModalOpen) {
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'

      // Handle ESC key to close modal
      const handleEscKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setIsImageModalOpen(false)
          setModalImageUrl(null)
        }
      }

      document.addEventListener('keydown', handleEscKey)

      return () => {
        document.body.style.overflow = 'auto'
        document.removeEventListener('keydown', handleEscKey)
      }
    } else {
      document.body.style.overflow = 'auto'
    }
  }, [isImageModalOpen])

  // Sync originalImageRef with selected image to ensure hover restore works correctly
  useEffect(() => {
    if (!product) return

    const images = getProductImages()
    if (images.length > 0 && selectedImageIndex >= 0 && selectedImageIndex < images.length) {
      originalImageRef.current = images[selectedImageIndex]
    } else if (images.length > 0) {
      originalImageRef.current = images[0]
    }
  }, [selectedImageIndex, product, selectedColor])

  // Update images when selectedColor changes (like HTML updateProductDataFromColor)
  useEffect(() => {
    if (!product || !selectedColor) return

    // If selectedColor has thumbnailUrls, update thumbnails (like HTML updateThumbnailsForSelectedColor)
    if (selectedColor.thumbnailUrls && selectedColor.thumbnailUrls.length > 0) {
      // Images will be updated via getProductImages() which reads from selectedColor
      // Just ensure main image is set
      if (selectedColor.imageUrl && mainImageRef.current) {
        const colorImages: string[] = []
        if (selectedColor.imageUrl) colorImages.push(selectedColor.imageUrl)
        if (selectedColor.thumbnailUrls) {
          selectedColor.thumbnailUrls.forEach((url: string) => {
            if (url && !colorImages.includes(url)) colorImages.push(url)
          })
        }
        if (colorImages.length <= 1 && product.additionalImageUrls) {
          product.additionalImageUrls.forEach((url: string) => {
            if (url && !colorImages.includes(url)) colorImages.push(url)
          })
        }
        if (colorImages.length > 0 && colorImages[0]) {
          originalImageRef.current = colorImages[0]
          if (mainImageRef.current.src !== colorImages[0]) {
            switchMainImage(colorImages[0], 0)
            setSelectedImageIndex(0)
          }
        }
      }
    } else if (selectedColor.imageUrl && mainImageRef.current) {
      // Just update main image (like HTML)
      if (mainImageRef.current.src !== selectedColor.imageUrl) {
        switchMainImage(selectedColor.imageUrl)
        originalImageRef.current = selectedColor.imageUrl
      }
    }
  }, [selectedColor, product])


  const loadProductDetail = async () => {
    if (!slug) {
      setError(true)
      setLoading(false)
      return
    }

    try {
      if (!db) {
        setError(true)
        setLoading(false)
        return
      }

      let productData: Product | null = null

      // First try to query by slug
      const slugQuery = query(collection(db, 'products'), where('slug', '==', slug), limit(1))
      const slugSnapshot = await getDocs(slugQuery)

      if (!slugSnapshot.empty) {
        const doc = slugSnapshot.docs[0]
        productData = { id: doc.id, ...doc.data() } as Product
      } else {
        // Fallback: try to fetch by ID (legacy support for URLs using ID)
        try {
          // Verify if the slug looks like an ID (optional check, but good for skipping invalid IDs)
          // Simple check: if it has no hyphens or is 20 chars
          const productDoc = await getDoc(doc(db, 'products', slug))
          if (productDoc.exists()) {
            productData = { id: productDoc.id, ...productDoc.data() } as Product
          }
        } catch (e) {
          // Error fetching by ID, so it was probably a slug that wasn't found
        }
      }

      if (!productData) {
        setError(true)
        setLoading(false)
        return
      }

      // Check if component is still mounted before setting state
      if (typeof window === 'undefined') return

      setProduct(productData)

      // Load color variants (this will also initialize availableColors and selectedColor)
      await loadColorVariants(productData)

      // Load related products
      await loadRelatedProducts(productData.category || '')

      // Load FBT combinations
      await loadProductCombinations(productData)

      // Load available services
      await loadAvailableServices(productData)


      // Initialize selected image index
      setSelectedImageIndex(0)

      // Initialize module selection
      if (productData.moduleOptions && productData.moduleOptions.length > 0) {
        setSelectedModuleIndex(0)
        setSelectedModule(productData.moduleOptions[0])
      }

      // Initialize material selection
      const group = productData.groupProducts || []
      const baseMaterial = productData.material || ''
      const materials = Array.from(new Set([
        baseMaterial,
        ...group.map((p: any) => p.material).filter(Boolean)
      ].filter(Boolean)))

      if (materials.length > 0) {
        const baseMaterialIndex = Math.max(0, materials.indexOf(baseMaterial))
        setSelectedMaterialIndex(baseMaterialIndex)
        setSelectedMaterial(materials[baseMaterialIndex] || materials[0])
      }

    } catch (error) {
      console.error('Error loading product:', error)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  const loadColorVariants = async (product: Product) => {
    if (!product.productGroupId || !db) {
      // Even without group, initialize availableColors from current product
      if (product.currentColorName || product.colorVariant || product.name) {
        const currentColorName = product.colorVariant?.colorName ||
          product.colorName ||
          product.currentColorName ||
          extractColorFromName(product.name || '')

        const availableColors = [{
          name: currentColorName,
          colorName: currentColorName,
          currentPrice: product.currentPrice || 0,
          originalPrice: product.originalPrice || 0,
          discountPercent: product.discountPercent,
          imageUrl: product.primaryImageUrl || product.imageUrl || '',
          thumbnailUrls: product.thumbnailUrls || [],
          description: product.description || ''
        }]

        setProduct(prev => prev ? { ...prev, availableColors } : null)

        // Initialize selected color
        if (availableColors.length > 0) {
          setSelectedColorIndex(0)
          setSelectedColor(availableColors[0])
        }
      }
      return
    }

    try {
      const groupQuery = query(
        collection(db, 'products'),
        where('productGroupId', '==', product.productGroupId)
      )
      const groupSnapshot = await getDocs(groupQuery)

      const groupProducts: Product[] = []
      groupSnapshot.forEach(doc => {
        if (doc.id !== product.id) {
          const variantData = doc.data()
          // Extract colorName exactly like HTML
          const colorName = variantData.colorVariant?.colorName ||
            variantData.colorName ||
            variantData.currentColorName ||
            extractColorFromName(variantData.name || '')

          groupProducts.push({
            id: doc.id,
            ...variantData,
            slug: variantData.slug,
            colorName: colorName, // Use extracted color name
            material: variantData.material || variantData.colorVariant?.material || '',
            imageUrl: variantData.primaryImageUrl || variantData.imageUrl || '',
            description: variantData.description || ''
          } as Product)
        }
      })

      // Build colorVariants array exactly like HTML
      const colorVariants = groupProducts.length > 0 ? groupProducts.map((p) => ({
        productId: p.id,
        slug: p.slug,
        name: p.colorName || '', // Use the extracted color name
        colorName: p.colorName || '',
        imageUrl: p.imageUrl || '',
        currentPrice: p.currentPrice || 0,
        originalPrice: p.originalPrice || 0,
        discountPercent: p.discountPercent,
        priceUnit: p.priceUnit,
        productName: p.name,
        thumbnailUrls: p.thumbnailUrls || [],
        description: p.description || ''
      })) : []

      // Build availableColors array exactly like HTML
      let availableColors: Array<{
        name: string
        colorName: string
        currentPrice: number
        originalPrice: number
        discountPercent?: number
        imageUrl: string
        thumbnailUrls: string[]
        description: string
      }> = []

      if (product.currentColorName || product.colorVariant || product.name) {
        // Extract color name from current product
        const currentColorName = product.colorVariant?.colorName ||
          product.colorName ||
          product.currentColorName ||
          extractColorFromName(product.name || '')

        availableColors = [{
          name: currentColorName,
          colorName: currentColorName,
          currentPrice: product.currentPrice || 0,
          originalPrice: product.originalPrice || 0,
          discountPercent: product.discountPercent,
          imageUrl: product.primaryImageUrl || product.imageUrl || '',
          thumbnailUrls: product.thumbnailUrls || [],
          description: product.description || ''
        }]
      }

      setProduct(prev => {
        const updated = prev ? {
          ...prev,
          colorVariants,
          groupProducts,
          availableColors
        } : null

        // Initialize selected color after availableColors is set
        if (updated && availableColors.length > 0) {
          setSelectedColorIndex(0)
          setSelectedColor({
            name: availableColors[0].name,
            colorName: availableColors[0].colorName,
            imageUrl: availableColors[0].imageUrl || '',
            currentPrice: availableColors[0].currentPrice,
            originalPrice: availableColors[0].originalPrice,
            discountPercent: availableColors[0].discountPercent,
            thumbnailUrls: availableColors[0].thumbnailUrls || [],
            description: availableColors[0].description || '',
            isVariant: false
          })

          // Update main image and thumbnails to match selected color
          if (availableColors[0].thumbnailUrls && availableColors[0].thumbnailUrls.length > 0) {
            // Will be handled by useEffect watching selectedColor
          } else if (availableColors[0].imageUrl && mainImageRef.current) {
            mainImageRef.current.src = availableColors[0].imageUrl
            originalImageRef.current = availableColors[0].imageUrl
            setupZoomBackground(availableColors[0].imageUrl)
          }
        }

        // Initialize materials after groupProducts are set
        if (updated) {
          const materials = Array.from(new Set([
            updated.material || '',
            ...(groupProducts.map(p => p.material).filter(Boolean))
          ].filter(Boolean)))

          if (materials.length > 0) {
            const baseMaterialIndex = Math.max(0, materials.indexOf(updated.material || ''))
            setSelectedMaterialIndex(baseMaterialIndex)
            setSelectedMaterial(materials[baseMaterialIndex] || materials[0] || null)
          }
        }

        return updated
      })
    } catch (error) {
      console.error('Error loading color variants:', error)
    }
  }

  const extractColorFromName = (fullName: string): string => {
    if (!fullName) return 'Default'

    const patterns = [
      /\|\s*([^|]+)\s*\|/g,
      /\-\s*([^-]+)$/,
      /\s+([A-Za-z]+)$/
    ]

    for (const pattern of patterns) {
      const match = fullName.match(pattern)
      if (match && match[1]) {
        const extracted = match[1].trim()
        if (extracted.length < 20 && !/^\d+$/.test(extracted)) {
          return extracted
        }
      }
    }

    const words = fullName.split(/[\s||-]+/)
    return words[words.length - 1] || 'Default'
  }

  const loadRelatedProducts = async (category: string) => {
    if (!db || !category) return

    try {
      const relatedQuery = query(
        collection(db, 'products'),
        where('category', '==', category),
        limit(6)
      )
      const relatedSnapshot = await getDocs(relatedQuery)

      const related: Product[] = []
      relatedSnapshot.forEach(doc => {
        if (doc.id !== product?.id) {
          related.push({
            id: doc.id,
            ...doc.data()
          } as Product)
        }
      })

      setRelatedProducts(related)
    } catch (error) {
      // Silently handle error
    }
  }

  const selectColor = (index: number) => {
    if (!product) return

    const colors = getAvailableColors()
    if (!colors || index < 0 || index >= colors.length) return

    const selectedColorOption = colors[index]

    // If it's a variant, navigate to that product (like HTML)
    if (selectedColorOption.isVariant) {
      navigateToColorVariant(selectedColorOption.slug || selectedColorOption.productId || '')
      return
    }

    // Otherwise, select the color (like HTML selectColor function)
    setSelectedColorIndex(index)
    setSelectedColor(selectedColorOption)

    // Update product data from color (like HTML updateProductDataFromColor)
    if (selectedColorOption.thumbnailUrls && selectedColorOption.thumbnailUrls.length > 0) {
      // Update thumbnails for selected color (like HTML updateThumbnailsForSelectedColor)
      const colorImages: string[] = []

      if (selectedColorOption.imageUrl) {
        colorImages.push(selectedColorOption.imageUrl)
      }

      if (selectedColorOption.thumbnailUrls && selectedColorOption.thumbnailUrls.length > 0) {
        selectedColorOption.thumbnailUrls.forEach((url: string) => {
          if (url && !colorImages.includes(url)) {
            colorImages.push(url)
          }
        })
      }

      // If color has few images, add product additional images
      if (colorImages.length <= 1 && product.additionalImageUrls && product.additionalImageUrls.length > 0) {
        product.additionalImageUrls.forEach((url: string) => {
          if (url && !colorImages.includes(url)) {
            colorImages.push(url)
          }
        })
      }

      // Switch to first image
      if (colorImages.length > 0) {
        switchMainImage(colorImages[0], 0)
        setSelectedImageIndex(0)
        originalImageRef.current = colorImages[0]
      }
    } else if (selectedColorOption.imageUrl) {
      // Just switch main image (like HTML)
      switchMainImage(selectedColorOption.imageUrl)
      originalImageRef.current = selectedColorOption.imageUrl
    }
  }

  const getAvailableColors = (): ColorOption[] => {
    if (!product) return []

    const allColors: ColorOption[] = []

    // First, add availableColors (like HTML updateColorsSection)
    const colors = product.availableColors || []
    colors.forEach((color) => {
      allColors.push({
        name: color.colorName || color.name || 'Default', // Use colorName if available
        colorName: color.colorName || color.name || 'Default',
        imageUrl: color.imageUrl,
        currentPrice: color.currentPrice ?? 0,
        originalPrice: color.originalPrice ?? 0,
        discountPercent: color.discountPercent,
        thumbnailUrls: color.thumbnailUrls,
        description: color.description,
        isVariant: false,
      })
    })

    // Then merge in colorVariants that aren't already present (like HTML)
    const colorVariants = product.colorVariants || []
    colorVariants.forEach((variant, index) => {
      const exists = allColors.some((color) => color.name === (variant.colorName || variant.name))
      if (!exists) {
        allColors.push({
          name: variant.colorName || variant.name || 'Default',
          colorName: variant.colorName || variant.name || 'Default',
          currentPrice: variant.currentPrice || 0,
          originalPrice: variant.originalPrice || 0,
          discountPercent: variant.discountPercent,
          imageUrl: variant.imageUrl,
          thumbnailUrls: variant.thumbnailUrls,
          productId: variant.productId,
          slug: variant.slug,
          isVariant: true,
          // Show VIEW tag for the last couple of variants like HTML
          showViewTag: index >= Math.max(0, colorVariants.length - 2),
        })
      }
    })

    return allColors
  }

  const navigateToColorVariant = (slugOrId: string) => {
    if (slugOrId) {
      router.push(`/products/${slugOrId}`)
    }
  }

  const getAvailableMaterialsFromProduct = (productData: Product): string[] => {
    const group = productData.groupProducts || []
    const baseMaterial = productData.material || ''
    const materials = Array.from(new Set([
      baseMaterial,
      ...group.map((p: any) => p.material).filter(Boolean)
    ].filter(Boolean)))

    return materials
  }

  const getAvailableMaterials = (): string[] => {
    if (!product) return []
    return getAvailableMaterialsFromProduct(product)
  }

  const selectMaterial = (index: number) => {
    if (!product) return

    const materials = getAvailableMaterials()
    if (index < 0 || index >= materials.length) return

    setSelectedMaterialIndex(index)
    const material = materials[index]
    setSelectedMaterial(material)

    // Find matching product by current color and selected material
    const group = product.groupProducts || []
    const currentColorName = product.colorVariant?.colorName ||
      product.colorName ||
      product.currentColorName ||
      extractColorFromName(product.name || '')

    let target = group.find(p =>
      (p.material || '') === material &&
      (p.colorName || extractColorFromName(p.name || '')) === currentColorName
    )

    if (!target) {
      // Try any product with this material
      target = group.find(p => (p.material || '') === material)
    }

    if (target && target.id) {
      navigateToColorVariant(target.id)
    }
  }

  const selectModule = (index: number) => {
    if (!product || !product.moduleOptions) return

    if (index < 0 || index >= product.moduleOptions.length) return

    setSelectedModuleIndex(index)
    const module = product.moduleOptions[index]
    setSelectedModule(module)

    // Update product data with module data
    if (module.productName) {
      setProduct(prev => prev ? {
        ...prev,
        name: module.productName || prev.name
      } : null)
    }

    if (module.currentPrice || module.discountPrice) {
      setProduct(prev => prev ? {
        ...prev,
        currentPrice: module.discountPrice || module.currentPrice || prev.currentPrice
      } : null)
    }

    if (module.moduleImageUrl || module.imageUrl) {
      const moduleImageUrl = module.moduleImageUrl || module.imageUrl || ''
      if (mainImageRef.current && moduleImageUrl) {
        mainImageRef.current.src = moduleImageUrl
        setupZoomBackground(moduleImageUrl)
      }
    }
  }

  const handleQuantityChange = (change: number) => {
    setQuantity((prev) => {
      const newQuantity = prev + change
      return Math.max(1, Math.min(99, newQuantity))
    })
  }

  const addToCart = () => {
    if (!product) return

    if (typeof window !== 'undefined') {
      try {
        const cart = JSON.parse(localStorage.getItem('cart') || '[]')
        const price = selectedColor?.currentPrice || product.currentPrice || 0
        const imageUrl = selectedColor?.imageUrl || product.primaryImageUrl || product.imageUrl || ''
        const productName = selectedColor
          ? `${product.name || product.productName} - ${selectedColor.name}`
          : product.name || product.productName

        const cartItem = {
          id: product.id,
          name: productName,
          price,
          imageUrl,
          quantity,
          selectedColor: selectedColor?.name || null,
          selectedModule: selectedModule?.gangType || selectedModule?.productName || null,
          timestamp: new Date().toISOString(),
        }

        // Find existing item with same id, selectedColor, and selectedModule
        const existingIndex = cart.findIndex(
          (item: any) =>
            item.id === cartItem.id &&
            item.selectedColor === cartItem.selectedColor &&
            item.selectedModule === cartItem.selectedModule
        )

        if (existingIndex >= 0) {
          // Update quantity if already exists
          cart[existingIndex].quantity += quantity
        } else {
          // Add new item
          cart.push(cartItem)
        }

        localStorage.setItem('cart', JSON.stringify(cart))
        window.dispatchEvent(new Event('cartUpdated'))

        // Show visual feedback
        setHasJustAdded(true)
        setTimeout(() => {
          setHasJustAdded(false)
        }, 2000)
      } catch (error) {
        alert('Error adding product to cart')
      }
    }
  }

  const handleBuyNow = () => {
    if (!product) return

    if (typeof window !== 'undefined') {
      try {
        const price = selectedColor?.currentPrice || product.currentPrice || 0
        const imageUrl = selectedColor?.imageUrl || product.primaryImageUrl || product.imageUrl || ''
        const productName = selectedColor
          ? `${product.name || product.productName} - ${selectedColor.name}`
          : product.name || product.productName

        const buyNowProduct = {
          id: product.id,
          name: productName,
          price,
          imageUrl,
          quantity,
          selectedColor: selectedColor?.name || null,
          selectedModule: selectedModule?.gangType || selectedModule?.productName || null,
          timestamp: new Date().toISOString(),
        }

        // Store buy now product in localStorage and sessionStorage (matching HTML)
        localStorage.setItem('buyNowProduct', JSON.stringify(buyNowProduct))
        sessionStorage.setItem('buyNowProduct', JSON.stringify(buyNowProduct))
        sessionStorage.setItem('isBuyNowFlow', 'true')
        localStorage.setItem('isBuyNowFlow', 'true')

        // Navigate to checkout/cart
        router.push('/cart')
      } catch (error) {
        alert('Error processing buy now')
      }
    }
  }

  const handleWhatsAppEnquiry = () => {
    if (!product || typeof window === 'undefined') return

    try {
      const dynamicName = selectedColor
        ? `${product.name || product.productName} - ${selectedColor.name}`
        : product.name || product.productName

      let message = `Hi! I'm interested in ${dynamicName}.`

      if (selectedColor) {
        message += ` I'm particularly interested in the ${selectedColor.name} variant.`
        message += ` Price: ₹${(selectedColor.currentPrice || 0).toLocaleString('en-IN')}`
      } else if (product.currentPrice) {
        message += ` Price: ₹${product.currentPrice.toLocaleString('en-IN')}`
      }

      message += ` Could you please provide more details and pricing information?`

      // Add current page URL
      const currentUrl = window.location.href
      message += `\n\nProduct Link: ${currentUrl}`

      const encodedMessage = encodeURIComponent(message)
      const whatsappNumber = '7358101510' // WhatsApp business number from HTML
      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`

      // Open WhatsApp in new tab
      window.open(whatsappUrl, '_blank')
    } catch (error) {
      alert('Error opening WhatsApp. Please try again.')
    }
  }

  const handleAddRelatedToCart = (relatedProduct: Product, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent navigation when clicking the button

    if (typeof window === 'undefined') return

    try {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]')
      const productId = relatedProduct.id
      const productName = relatedProduct.name || relatedProduct.productName || 'Product'
      const productPrice = relatedProduct.currentPrice || relatedProduct.price || 0
      const productImage = relatedProduct.primaryImageUrl || relatedProduct.imageUrl || ''

      const existingIndex = cart.findIndex((item: any) => item.id === productId)

      if (existingIndex >= 0) {
        // Update quantity if already exists
        cart[existingIndex].quantity += 1
      } else {
        // Add new item
        cart.push({
          id: productId,
          name: productName,
          price: productPrice,
          imageUrl: productImage,
          quantity: 1,
          timestamp: new Date().toISOString(),
        })
      }

      localStorage.setItem('cart', JSON.stringify(cart))
      window.dispatchEvent(new Event('cartUpdated'))

      // Visual feedback
      const button = e.currentTarget as HTMLButtonElement
      const originalContent = button.innerHTML
      button.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 13l4 4L19 7"/></svg>'
      button.style.background = 'linear-gradient(135deg, #28a745, #20c997)'
      button.style.transform = 'scale(1.1)'

      setTimeout(() => {
        button.innerHTML = originalContent
        button.style.background = ''
        button.style.transform = 'scale(1)'
      }, 2000)
    } catch (error) {
      alert('Error adding product to cart')
    }
  }

  const generateLeadId = async (): Promise<string> => {
    if (!db) {
      // Fallback: use timestamp-based ID
      const now = new Date()
      const year = now.getFullYear().toString().slice(-2)
      const month = (now.getMonth() + 1).toString().padStart(2, '0')
      const timestamp = Date.now().toString().slice(-4)
      return `LEAD M/${year}-${(parseInt(year) + 1).toString().padStart(2, '0')}/${timestamp}`
    }

    try {
      const now = new Date()
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth()

      // Financial year: April (month 3) to March (month 2)
      const financialYearStart = currentMonth >= 3 ? currentYear : currentYear - 1
      const yearShort = financialYearStart.toString().slice(-2)
      const nextYearShort = (financialYearStart + 1).toString().slice(-2)

      const counterRef = doc(db, 'leadCounters', `FY-${yearShort}-${nextYearShort}`)

      return await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef)
        let currentCounter = 1

        if (counterDoc.exists()) {
          const existingCounter = counterDoc.data().counter || 0
          currentCounter = existingCounter + 1
        } else {
          // Find max from existing leads
          const yearPattern = `LEAD M/${yearShort}-${nextYearShort}/`
          if (!db) {
            currentCounter = 1
          } else {
            const leadsSnapshot = await getDocs(collection(db, 'leads'))

            let maxNumberFromLeads = 0
            leadsSnapshot.forEach((doc) => {
              const leadData = doc.data()
              const leadId = leadData.leadId || ''

              if (leadId.startsWith(yearPattern)) {
                const match = leadId.match(/^LEAD M\/\d{2}-\d{2}\/(\d+)/)
                if (match) {
                  const number = parseInt(match[1], 10)
                  if (number > maxNumberFromLeads) {
                    maxNumberFromLeads = number
                  }
                }
              }
            })

            currentCounter = maxNumberFromLeads > 0 ? maxNumberFromLeads + 1 : 1
          }
        }

        // Update counter
        transaction.set(counterRef, {
          counter: currentCounter,
          financialYear: `${yearShort}-${nextYearShort}`,
          lastUpdated: serverTimestamp()
        }, { merge: true })

        const paddedNumber = currentCounter.toString().padStart(4, '0')
        return `LEAD M/${yearShort}-${nextYearShort}/${paddedNumber}`
      })
    } catch (error) {
      console.error('Error generating Lead ID:', error)
      // Fallback
      const now = new Date()
      const year = now.getFullYear().toString().slice(-2)
      const timestamp = Date.now().toString().slice(-4)
      return `LEAD M/${year}-${(parseInt(year) + 1).toString().padStart(2, '0')}/${timestamp}`
    }
  }

  const leadIdExists = async (leadId: string): Promise<boolean> => {
    if (!db) return false
    try {
      const snapshot = await getDocs(
        query(collection(db, 'leads'), where('leadId', '==', leadId), limit(1))
      )
      return !snapshot.empty
    } catch (error) {
      return false
    }
  }

  const createLeadFromEnquiry = async (enquiryData: {
    productId?: string
    productName?: string
    productPrice?: number
    mainCategory?: string
    category?: string
    subcategory?: string
    subsubcategory?: string
    customerName: string
    customerPhone: string
    customerEmail?: string
    message?: string
    location?: string
  }) => {
    // Validation
    if (!enquiryData.customerName || !enquiryData.customerPhone) {
      throw new Error('Required fields missing: Name and Phone are required')
    }

    // Generate lead ID
    let leadId = await generateLeadId()

    // Add product prefix
    let prefixedLeadId = 'P-' + leadId

    // Check for uniqueness
    let finalLeadId = prefixedLeadId
    let suffixCounter = 1
    while (await leadIdExists(finalLeadId)) {
      finalLeadId = `${prefixedLeadId}-dup${suffixCounter > 1 ? suffixCounter : ''}`
      suffixCounter++
      if (suffixCounter > 100) {
        finalLeadId = `${prefixedLeadId}-${Date.now()}`
        break
      }
    }

    if (finalLeadId !== prefixedLeadId) {
      console.warn(`Lead ID ${prefixedLeadId} already exists, using ${finalLeadId}`)
    }

    // Get current timestamp
    const now = new Date()
    const createdAtISO = now.toISOString()
    const dateStr = createdAtISO.split('T')[0]
    const timeStr = createdAtISO.split('T')[1].split('.')[0].substring(0, 5)

    // Prepare category hierarchy
    const mainCategory = enquiryData.mainCategory || 'N/A'
    const category = enquiryData.category || 'N/A'
    const subcategory = enquiryData.subcategory || 'N/A'
    const subsubcategory = enquiryData.subsubcategory || 'N/A'

    // Build notes
    const enquiryMessage = enquiryData.message || 'N/A'
    const notes = enquiryMessage + (enquiryMessage !== 'N/A'
      ? `\n\n---\nProduct: ${enquiryData.productName || 'N/A'}${enquiryData.productId ? ` (ID: ${enquiryData.productId})` : ''}\nCategory: ${mainCategory} > ${category} > ${subcategory} > ${subsubcategory}`
      : '')

    // Create lead record
    const leadRecord = {
      leadId: finalLeadId,
      leadType: 'Product',
      createdAt: serverTimestamp(),
      createdAtTime: timeStr,
      datetimeISO: createdAtISO,
      date: dateStr,
      time: timeStr,
      customerName: enquiryData.customerName,
      contactNumber: enquiryData.customerPhone,
      email: enquiryData.customerEmail || '',
      requirements: enquiryData.productName || 'N/A',
      notes: notes,
      leadAmount: enquiryData.productPrice || 0,
      mainCategory,
      category,
      subcategory,
      subsubcategory,
      location: enquiryData.location || '',
      place: enquiryData.location || '',
      taskPerson: 'Deczon',
      leadPerson: 'Deczon',
      modeOfCustomer: 'Deczon',
      source: 'Deczon',
      leadStatus: 'Lead Assigned',
      leadStatusNew: 'Lead Assigned',
      createdBy: 'Product Detail Page',
      productId: enquiryData.productId || '',
      productName: enquiryData.productName || '',
      updatedAt: serverTimestamp()
    }

    // Save to Firebase
    if (db) {
      const docRef = await addDoc(collection(db, 'leads'), leadRecord)
      return { ...leadRecord, firestoreDocId: docRef.id, leadId: finalLeadId }
    } else {
      // Fallback to localStorage
      const leads = JSON.parse(localStorage.getItem('leads') || '[]')
      leads.push(leadRecord)
      localStorage.setItem('leads', JSON.stringify(leads))
      console.warn('Firebase not available, saved to localStorage')
      return { ...leadRecord, leadId: finalLeadId }
    }
  }

  const handleEnquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!enquiryForm.name || !enquiryForm.phone || !enquiryForm.location) {
      alert('Please fill all required fields (Name, Phone, Location)')
      return
    }

    if (!product) {
      alert('Product information not available')
      return
    }

    try {
      // Prepare product info
      const productName = selectedColor
        ? `${product.name || product.productName} - ${selectedColor.name}`
        : product.name || product.productName || 'Product'
      const productId = product.id || ''
      const productPrice = selectedColor?.currentPrice || product.currentPrice || 0

      // Extract category information
      const mainCategory = product.mainCategory || 'N/A'
      const category = product.category || 'N/A'
      const subcategory = product.subcategory || 'N/A'
      const subsubcategory = product.subsubcategory || 'N/A'

      // Create lead
      const enquiryData = {
        productId,
        productName,
        productPrice,
        mainCategory,
        category,
        subcategory,
        subsubcategory,
        customerName: enquiryForm.name,
        customerPhone: enquiryForm.phone,
        customerEmail: enquiryForm.email,
        message: enquiryForm.message,
        location: enquiryForm.location
      }

      const createdLead = await createLeadFromEnquiry(enquiryData)

      // Show success message
      alert(`✅ Thank you for your enquiry!\n\nLead Number: ${createdLead.leadId}\nProduct: ${productName}\n\nOur team will contact you within 24 hours.\nPlease save your lead number for reference.`)

      // Reset form and close modal
      setEnquiryForm({ name: '', email: '', phone: '', location: '', message: '' })
      setEnquiryModalOpen(false)
    } catch (error: any) {
      console.error('Error creating lead:', error)
      alert(`❌ Error: ${error.message || 'Failed to create lead'}\n\nPlease try again or contact us directly.`)
    }
  }

  const getProductImages = (): string[] => {
    if (!product) return ['/placeholder.svg?height=600&width=600']

    const images: string[] = []

    // Priority 1: Selected color image (if color is selected)
    if (selectedColor?.imageUrl) {
      images.push(selectedColor.imageUrl)
    }

    // Priority 2: Selected color thumbnail URLs (if available)
    if (selectedColor?.thumbnailUrls && selectedColor.thumbnailUrls.length > 0) {
      selectedColor.thumbnailUrls.forEach((url: string) => {
        if (url && !images.includes(url)) {
          images.push(url)
        }
      })
    }

    // Priority 3: If selectedColor has <= 1 image, add product additional images
    // Otherwise, use product primary/image as fallback
    if (selectedColor && images.length <= 1) {
      // Add product additional images when color has few images
      if (product.additionalImageUrls && product.additionalImageUrls.length > 0) {
        product.additionalImageUrls.forEach((url: string) => {
          if (url && !images.includes(url)) {
            images.push(url)
          }
        })
      }
    } else if (!selectedColor || images.length === 0) {
      // No color selected or no color images: use product primary/image
      const mainImage = product.primaryImageUrl || product.imageUrl
      if (mainImage && !images.includes(mainImage)) {
        images.push(mainImage)
      }

      // Add product additional images
      if (product.additionalImageUrls && product.additionalImageUrls.length > 0) {
        product.additionalImageUrls.forEach((url: string) => {
          if (url && !images.includes(url)) {
            images.push(url)
          }
        })
      }
    }

    // Priority 4: Fallback to product.images array if still no images
    if (images.length === 0 && product.images && product.images.length > 0) {
      product.images.forEach((img: string) => {
        if (img && !images.includes(img)) {
          images.push(img)
        }
      })
    }

    // Final fallback: placeholder
    if (images.length === 0) {
      images.push('/placeholder.svg?height=600&width=600')
    }

    // Debug output
    console.debug('getProductImages() result:', images)

    return images
  }

  const updateZoomBackground = (img: HTMLImageElement, result: HTMLDivElement, lens: HTMLDivElement) => {
    // Use img.width and img.height matching HTML implementation exactly
    const imgWidth = img.width || img.offsetWidth || 0
    const imgHeight = img.height || img.offsetHeight || 0

    if (imgWidth === 0 || imgHeight === 0) return

    const cx = result.offsetWidth / lens.offsetWidth
    const cy = result.offsetHeight / lens.offsetHeight

    result.style.backgroundImage = `url('${img.src}')`
    result.style.backgroundRepeat = 'no-repeat'
    result.style.backgroundSize = `${imgWidth * cx}px ${imgHeight * cy}px`
  }

  const setupZoomBackground = (imageUrl: string) => {
    if (!zoomResultRef.current || !mainImageRef.current || typeof window === 'undefined') return
    try {
      const img = mainImageRef.current
      const result = zoomResultRef.current
      const lens = zoomLensRef.current

      if (!lens || !result || !img) return

      // Wait for image to load to get natural dimensions
      if (img.complete) {
        // Check if refs are still valid before updating
        if (zoomResultRef.current && zoomLensRef.current && mainImageRef.current) {
          updateZoomBackground(img, result, lens)
        }
      } else {
        const handleLoad = () => {
          // Check if refs are still valid before updating
          if (zoomResultRef.current && zoomLensRef.current && mainImageRef.current) {
            updateZoomBackground(mainImageRef.current, zoomResultRef.current, zoomLensRef.current)
          }
          img.removeEventListener('load', handleLoad)
        }
        img.addEventListener('load', handleLoad)
      }
    } catch (error: any) {
      // Silently ignore errors during cleanup
    }
  }

  const handleZoomEnter = () => {
    if (!zoomLensRef.current || !zoomResultRef.current || typeof window === 'undefined') return
    try {
      zoomLensRef.current.style.display = 'block'
      zoomResultRef.current.style.display = 'block'
      zoomResultRef.current.style.opacity = '1'
    } catch (error) {
      // Silently handle error
    }
  }

  const handleZoomLeave = () => {
    if (!zoomLensRef.current || !zoomResultRef.current || typeof window === 'undefined') return
    try {
      zoomLensRef.current.style.display = 'none'
      zoomResultRef.current.style.display = 'none'
    } catch (error) {
      // Silently handle error
    }
  }

  const switchMainImage = (imageUrl: string, thumbnailIndex?: number) => {
    if (!mainImageRef.current || typeof window === 'undefined') return
    try {
      const img = mainImageRef.current

      // Store as original image (selected image) - this is what we restore to on hover end
      originalImageRef.current = imageUrl

      // Animated transition matching HTML
      img.style.opacity = '0.7'
      img.style.transform = 'scale(1.02)'

      setTimeout(() => {
        if (img && mainImageRef.current) {
          img.src = imageUrl
          img.style.transition = 'all 0.3s ease-out'
          img.style.opacity = '1'
          img.style.transform = 'scale(1)'
          // Update zoom background when image is clicked/selected
          setupZoomBackground(imageUrl)
        }
      }, 200)

      // Update selected image index if provided
      if (thumbnailIndex !== undefined) {
        setSelectedImageIndex(thumbnailIndex)
      }
    } catch (error) {
      // Silently handle error
    }
  }

  const switchMainImageOnHover = (imageUrl: string) => {
    if (!mainImageRef.current || typeof window === 'undefined') return
    try {
      const img = mainImageRef.current

      // Always keep original as the clicked/selected image, not last hovered
      // Get from active thumbnail element if available, otherwise use current selected index
      if (!originalImageRef.current) {
        const images = getProductImages()
        if (images[selectedImageIndex]) {
          originalImageRef.current = images[selectedImageIndex]
        } else if (img.src) {
          originalImageRef.current = img.src
        }
      }

      // Add class to prevent CSS hover transform during thumbnail hover
      img.classList.add('thumbnail-hover-active')

      // Smooth transition for hover effect - NO layout changes (opacity only, no transform)
      img.style.transition = 'opacity 0.2s ease-out'
      img.style.transform = 'none' // Ensure no transform during hover
      img.style.opacity = '0.8'

      setTimeout(() => {
        if (img && mainImageRef.current) {
          // Change image source without triggering layout shifts
          img.src = imageUrl
          img.style.opacity = '1'
          // Don't call setupZoomBackground during hover to prevent flicker
        }
      }, 100)
    } catch (error) {
      // Silently handle error
    }
  }

  const restoreOriginalImage = () => {
    if (!mainImageRef.current || !originalImageRef.current || typeof window === 'undefined') return
    try {
      const img = mainImageRef.current
      const originalImage = originalImageRef.current

      if (originalImage && originalImage !== img.src) {
        // Keep class to prevent CSS hover transform during restore
        img.classList.add('thumbnail-hover-active')

        // Smooth transition - opacity only, no transform
        img.style.transition = 'opacity 0.3s ease-out'
        img.style.transform = 'none' // Ensure no transform during restore
        img.style.opacity = '0.8'

        setTimeout(() => {
          if (img && mainImageRef.current) {
            img.src = originalImage
            img.style.opacity = '1'
            // Remove class after transition completes to allow normal hover again
            setTimeout(() => {
              if (img && mainImageRef.current) {
                img.classList.remove('thumbnail-hover-active')
              }
            }, 300)
            // Don't call setupZoomBackground during restore to prevent flicker
            // Zoom background will be updated when user interacts with zoom
          }
        }, 150)
      } else {
        // If already showing original, just remove the class
        img.classList.remove('thumbnail-hover-active')
      }
    } catch (error) {
      // Silently handle error
    }
  }

  const handleZoomMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!zoomContainerRef.current || !zoomLensRef.current || !zoomResultRef.current || !mainImageRef.current || typeof window === 'undefined') return

    try {
      const container = zoomContainerRef.current
      const lens = zoomLensRef.current
      const result = zoomResultRef.current
      const img = mainImageRef.current

      // Get container bounds for mouse position calculation (matching HTML exactly)
      const rect = container.getBoundingClientRect()

      // Calculate lens position (centered on cursor)
      let x = e.clientX - rect.left - lens.offsetWidth / 2
      let y = e.clientY - rect.top - lens.offsetHeight / 2

      // Constrain lens to image bounds (using img.width and img.height like HTML)
      x = Math.max(0, Math.min(x, img.width - lens.offsetWidth))
      y = Math.max(0, Math.min(y, img.height - lens.offsetHeight))

      // Position the lens
      lens.style.left = x + "px"
      lens.style.top = y + "px"

      // Calculate zoom ratios (matching HTML exactly)
      const cx = result.offsetWidth / lens.offsetWidth
      const cy = result.offsetHeight / lens.offsetHeight

      // Set background image and size (matching HTML exactly)
      result.style.backgroundImage = `url('${img.src}')`
      result.style.backgroundSize = `${img.width * cx}px ${img.height * cy}px`
      result.style.backgroundPosition = `-${x * cx}px -${y * cy}px`
    } catch (error) {
      // Silently handle error
    }
  }

  const getSpecifications = (): Array<[string, string]> => {
    if (!product || !product.specifications) return []

    if (Array.isArray(product.specifications)) {
      return product.specifications.map(spec => [spec.name, spec.value])
    } else if (typeof product.specifications === 'object') {
      return Object.entries(product.specifications)
    }

    return []
  }

  const loadProductCombinations = async (product: Product) => {
    if (!db || !product.id) return

    try {
      let combinations: any[] = []

      // Try to get productCombinations from the product document
      const productDoc = await getDoc(doc(db, 'products', product.id))
      if (productDoc.exists()) {
        const productData = productDoc.data()

        if (productData?.productCombinations && Array.isArray(productData.productCombinations)) {
          // Process each combination
          productData.productCombinations.forEach((combination: any, comboIndex: number) => {
            if (combination?.products && Array.isArray(combination.products)) {
              const comboProduct = combination.products[0]
              if (comboProduct?.id) {
                combinations.push({
                  id: comboProduct.id || `combo-${comboIndex}`,
                  name: comboProduct.name || comboProduct.title || comboProduct.productName || `Combination ${comboIndex + 1}`,
                  imageUrl: comboProduct.imageUrl || comboProduct.imageurl || comboProduct.primaryImageUrl || comboProduct.thumbnailUrl || '/placeholder.svg?height=150&width=150',
                  price: Number(comboProduct.price || comboProduct.currentPrice || comboProduct.discountedPrice || 0),
                  originalPrice: Number(comboProduct.originalPrice || comboProduct.mrp || comboProduct.price || comboProduct.currentPrice || 0),
                  isBase: comboIndex === 0,
                  checked: true,
                  category: comboProduct.category || comboProduct.productCategory || '',
                  description: comboProduct.warrantyDescription || comboProduct.description || comboProduct.longDescription || ''
                })
              }
            }
          })

          // Ensure base product is always first (matching HTML)
          const hasBase = combinations.some(c => c.isBase)
          if (!hasBase) {
            combinations.unshift({
              id: product.id,
              name: product.name || product.productName || '',
              imageUrl: product.primaryImageUrl || product.imageUrl || '/placeholder.svg?height=150&width=150',
              price: Number(product.currentPrice || product.price || 0),
              originalPrice: Number(product.originalPrice || product.mrp || product.price || product.currentPrice || 0),
              isBase: true,
              checked: true,
              category: product.category || '',
              description: product.description || product.longDescription || ''
            })
          }
        } else {
          // If no combinations, add base product
          combinations.unshift({
            id: product.id,
            name: product.name || product.productName || '',
            imageUrl: product.primaryImageUrl || product.imageUrl || '/placeholder.svg?height=150&width=150',
            price: Number(product.currentPrice || product.price || 0),
            originalPrice: Number(product.originalPrice || product.mrp || product.price || product.currentPrice || 0),
            isBase: true,
            checked: true,
            category: product.category || '',
            description: product.description || product.longDescription || ''
          })
        }
      } else {
        // If no productCombinations field, add base product
        combinations.unshift({
          id: product.id,
          name: product.name || product.productName || '',
          imageUrl: product.primaryImageUrl || product.imageUrl || '/placeholder.svg?height=150&width=150',
          price: Number(product.currentPrice || product.price || 0),
          originalPrice: Number(product.originalPrice || product.mrp || product.price || product.currentPrice || 0),
          isBase: true,
          checked: true,
          category: product.category || '',
          description: product.description || product.longDescription || ''
        })
      }

      // Filter valid items
      const validItems = combinations.filter(item =>
        item.name && item.name !== 'Accessory' && item.price > 0
      )

      // Only show if there are non-base items
      const hasNonBase = validItems.some(x => !x.isBase)
      if (validItems.length > 0 && hasNonBase) {
        setFbtItems(validItems)
        setFbtChecked(validItems.map((_, idx) => idx === 0 || validItems[idx].checked))
      }
    } catch (error) {
      // Silently handle error
    }
  }

  const handleFbtCheckboxChange = (index: number) => {
    setFbtChecked(prev => {
      const newChecked = [...prev]
      newChecked[index] = !newChecked[index]
      return newChecked
    })
  }

  const getFbtTotal = (): number => {
    return fbtItems.reduce((sum, item, idx) => {
      return sum + (fbtChecked[idx] ? item.price : 0)
    }, 0)
  }

  const getFbtSelectedCount = (): { base: number; addon: number } => {
    const selected = fbtItems.filter((_, idx) => fbtChecked[idx])
    return {
      base: selected.filter(x => x.isBase).length,
      addon: selected.filter(x => !x.isBase).length
    }
  }

  const addFbtToCart = () => {
    if (typeof window === 'undefined') return

    const selected = fbtItems.filter((_, idx) => fbtChecked[idx])
    if (selected.length === 0) return

    const cart = JSON.parse(localStorage.getItem('cart') || '[]')

    selected.forEach((item) => {
      const idKey = item.isBase ? (product?.id || '') : item.id
      const idx = cart.findIndex((ci: any) =>
        ci.id === idKey &&
        (ci.selectedColor || null) === (selectedColor?.name || null)
      )
      const price = item.price
      const name = item.isBase ? (product?.name || '') : item.name
      const imageUrl = item.isBase
        ? (product?.primaryImageUrl || product?.imageUrl || '')
        : item.imageUrl

      if (idx >= 0) {
        cart[idx].quantity += 1
      } else {
        cart.push({
          id: idKey,
          name,
          price,
          imageUrl,
          quantity: 1,
          timestamp: new Date().toISOString(),
          selectedColor: item.isBase ? (selectedColor?.name || null) : null
        })
      }
    })

    localStorage.setItem('cart', JSON.stringify(cart))
    window.dispatchEvent(new Event('cartUpdated'))

    // Show success feedback
    alert(`Added ${selected.length} item(s) to cart!`)
  }

  const loadAvailableServices = async (product: Product) => {
    if (!db) return

    setServicesLoading(true)
    try {
      let services: any[] = []

      // First check if product has direct services
      if (product.services && Array.isArray(product.services) && product.services.length > 0) {
        services = product.services.map((service, index) => {
          if (typeof service === 'string') {
            return {
              id: `service-${index}`,
              name: service,
              category: 'General Service',
              imageUrl: `https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=200&fit=crop`,
              startingPrice: 999 + (index * 200),
              originalPrice: 1499 + (index * 300),
              description: `Professional ${service} for your smart home setup`
            }
          }
          return { id: `service-${index}`, ...service }
        })
      } else {
        // Load services based on product category
        try {
          let q = query(collection(db, 'services'), where('status', '==', 'active'))

          if (product.mainCategory) {
            q = query(q, where('mainCategory', '==', product.mainCategory))
          } else if (product.category) {
            q = query(q, where('category', '==', product.category))
          }

          const snapshot = await getDocs(query(q, limit(6)))

          if (!snapshot.empty) {
            services = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }))
          } else {
            // Try general services
            const generalSnapshot = await getDocs(
              query(
                collection(db, 'services'),
                where('status', '==', 'active'),
                limit(4)
              )
            )

            if (!generalSnapshot.empty) {
              services = generalSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              }))
            }
          }
        } catch (error) {
          // Silently handle error
        }
      }

      // Fallback to sample services if none found
      if (services.length === 0) {
        services = [
          {
            id: 'sample-1',
            name: 'Smart Home Consultation',
            category: 'General Service',
            imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=200&fit=crop',
            startingPrice: 999,
            originalPrice: 1499,
            description: 'Expert consultation for your smart home setup'
          },
          {
            id: 'sample-2',
            name: 'Professional Installation',
            category: 'General Service',
            imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=200&fit=crop',
            startingPrice: 2499,
            originalPrice: 3499,
            description: 'Skilled technicians for perfect installation'
          },
          {
            id: 'sample-3',
            name: 'System Integration',
            category: 'General Service',
            imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=200&fit=crop',
            startingPrice: 3999,
            originalPrice: 5999,
            description: 'Seamless integration of all smart devices'
          },
          {
            id: 'sample-4',
            name: 'Maintenance & Support',
            category: 'General Service',
            imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=200&fit=crop',
            startingPrice: 799,
            originalPrice: 1199,
            description: 'Regular maintenance and 24/7 support'
          }
        ]
      }

      setAvailableServices(services)
    } catch (error) {
      // Silently handle error
    } finally {
      setServicesLoading(false)
    }
  }

  const scrollAvailableServicesLeft = () => {
    if (servicesGridRef.current) {
      servicesGridRef.current.scrollBy({ left: -300, behavior: 'smooth' })
    }
  }

  const scrollAvailableServicesRight = () => {
    if (servicesGridRef.current) {
      servicesGridRef.current.scrollBy({ left: 300, behavior: 'smooth' })
    }
  }


  const bookService = (serviceId: string) => {
    const service = availableServices.find(s => s.id === serviceId)
    if (service) {
      alert(`Booking request sent for ${service.name}! Our team will contact you within 2 hours.`)
    }
  }

  const scrollToProductInfoTabs = () => {
    if (typeof window === 'undefined') return

    const target = tabsSectionRef.current || document.querySelector('.productInfoTabsSection')
    if (target) {
      const headerHeight = 72 // Account for sticky header
      const targetPosition = (target as HTMLElement).offsetTop - headerHeight

      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      })
    }
  }

  const handleFbtCardClick = (item: typeof fbtItems[0], index: number, e?: React.MouseEvent) => {
    // Don't navigate if clicking on checkbox
    if (e?.target && (e.target as HTMLElement).classList.contains(styles.fbtCheckbox)) {
      return
    }

    // If warranty, show modal
    if ((item.category || '').toLowerCase() === 'warranty') {
      setWarrantyModalData({
        name: item.name,
        price: item.price,
        originalPrice: item.originalPrice,
        description: item.description || 'This is an extended protection add-on. It is applicable when bought with the main product and will be delivered via email after purchase.',
        imageUrl: item.imageUrl
      })
      setWarrantyModalOpen(true)
      return
    }

    // Navigate to product detail
    if (item.id && !item.isBase) {
      router.push(`/products/${item.id}`)
    }
  }

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>Loading product details...</div>
  }

  if (error || !product) {
    return (
      <div className={styles.error}>
        <h2>Product Not Found</h2>
        <p>The product you're looking for doesn't exist or has been removed.</p>
        <Link href="/products" className={styles.btnPrimary}>
          Browse All Products
        </Link>
      </div>
    )
  }

  const images = getProductImages()
  const currentPrice = selectedColor?.currentPrice || product.currentPrice || 0
  const originalPrice = selectedColor?.originalPrice || product.originalPrice || 0
  const discountPercent = originalPrice > currentPrice
    ? Math.round((1 - currentPrice / originalPrice) * 100)
    : 0
  const availableColors = getAvailableColors()
  const specifications = getSpecifications()

  // Extract bullet items from description (matching HTML implementation)
  const extractBulletItems = (descriptionHtmlOrText: string): string[] => {
    if (typeof document === 'undefined') {
      // Server-side: split by lines
      return (descriptionHtmlOrText || '')
        .split('\n')
        .map(l => l.replace(/^\s*[•\-*\u2022]?\s*/, ''))
        .map(l => l.trim())
        .filter(l => l.length > 0)
    }

    try {
      const tmp = document.createElement('div')
      tmp.innerHTML = descriptionHtmlOrText || ''
      const liNodes = Array.from(tmp.querySelectorAll('li'))
      if (liNodes.length > 0) {
        return liNodes
          .map(n => (n.textContent || '').replace(/^\s*[•\-*\u2022]?\s*/, '').trim())
          .filter(Boolean)
      }
    } catch (e) {
      // Ignore errors
    }

    // Fallback: split lines from plain text
    return (descriptionHtmlOrText || '')
      .split('\n')
      .map(l => l.replace(/^\s*[•\-*\u2022]?\s*/, ''))
      .map(l => l.trim())
      .filter(l => l.length > 0)
  }

  // Helper component for description preview with "See More" (match HTML: limit main section, full in tabs)
  const DescriptionPreview = ({ description, onSeeMore }: { description: string; onSeeMore: () => void }) => {
    if (!description) return null

    const bulletLines = extractBulletItems(description)
    const rawLines = description
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0)
    const totalLines = Math.max(bulletLines.length, rawLines.length)
    const sentences = description.split(/[.!?]+/).filter(sentence => sentence.trim().length > 10)
    const shouldTruncate = totalLines > 10 || description.length > 500 || sentences.length > 5

    const buildList = (arr: string[]) => `<ul class="${styles.descList}">${arr.map(it => `<li>${it}</li>`).join('')}</ul>`
    const buildParagraph = (text: string) =>
      `<div class="${styles.descriptionPreview}">${text.replace(/\n+/g, '<br>')}</div>`

    // Choose source lines for preview/full
    const sourceLines = bulletLines.length > 0 ? bulletLines : rawLines

    if (shouldTruncate && sourceLines.length > 0) {
      const first10 = sourceLines.slice(0, 10)
      const previewHtml = bulletLines.length > 0
        ? buildList(first10)
        : buildParagraph(first10.join('\n'))

      return (
        <>
          <div
            id="product-description"
            className={styles.descriptionContent}
            dangerouslySetInnerHTML={{
              __html: `<div class="${styles.descriptionPreview}">${previewHtml}</div>`
            }}
            data-full-description={JSON.stringify(sourceLines)}
          />
          <div className={styles.descriptionSeeMore} id="see-more-container">
            <button
              id="see-more-btn"
              className={styles.seeMoreLink}
              onClick={onSeeMore}
            >
              See More
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 13l5 5 5-5"></path>
              </svg>
            </button>
          </div>
        </>
      )
    }

    // Show full description if short
    const fullHtml = sourceLines.length > 0
      ? buildList(sourceLines)
      : buildParagraph(description)

    return (
      <div
        id="product-description"
        className={styles.descriptionContent}
        dangerouslySetInnerHTML={{ __html: fullHtml }}
      />
    )
  }

  return (
    <div className={styles.productDetailPage}>
      <div className={styles.container}>
        <div
          data-product-detail-container
          ref={productDetailContainerRef}
          className={styles.productDetailContainer}
        >
          <div className={styles.productDetailMain}>
            {/* Left: Product Images */}
            <div
              id="product-images-column"
              data-sticky-element
              className={styles.productImagesColumn}
              ref={stickyElementRef}
            >
              <div className={styles.stickyContainer}>
                <div
                  className={styles.mainImage}
                  id="zoom-container"
                  ref={zoomContainerRef}
                  onMouseEnter={() => {
                    handleZoomEnter()
                    setupZoomBackground(images[selectedImageIndex] || images[0])
                  }}
                  onMouseLeave={handleZoomLeave}
                  onMouseMove={handleZoomMove}
                >
                  <img
                    id="main-product-image"
                    ref={mainImageRef}
                    src={images[selectedImageIndex] || images[0]}
                    alt={product.name || 'Product'}
                    className={styles.mainImageImg}
                    onClick={() => {
                      const imageUrl = images[selectedImageIndex] || images[0]
                      setModalImageUrl(imageUrl)
                      setIsImageModalOpen(true)
                    }}
                    style={{ cursor: 'pointer' }}
                    onError={(e) => {
                      try {
                        const target = e.target as HTMLImageElement
                        if (target && target.src && !target.src.includes('placeholder')) {
                          target.src = '/placeholder.svg?height=600&width=600'
                        }
                      } catch (error) {
                        // Silently ignore errors during error handling
                      }
                    }}
                    onLoad={() => {
                      // Ensure zoom background is set up after image loads
                      if (mainImageRef.current && zoomResultRef.current) {
                        try {
                          setupZoomBackground(mainImageRef.current.src)
                        } catch (error) {
                          // Silently ignore errors
                        }
                      }
                    }}
                  />
                  <div ref={zoomLensRef} id="zoom-lens" className={styles.zoomLens} />
                  <div ref={zoomResultRef} id="zoom-result" className={styles.zoomResult} />
                </div>
                <div className={styles.thumbnailImages}>
                  {images.map((img, idx) => (
                    <div
                      key={idx}
                      className={`${styles.thumbnail} ${idx === selectedImageIndex ? styles.active : ''}`}
                      onMouseEnter={() => {
                        isThumbnailHoverActiveRef.current = true
                        switchMainImageOnHover(img)
                      }}
                      onMouseLeave={() => {
                        isThumbnailHoverActiveRef.current = false
                        setTimeout(() => {
                          if (!isThumbnailHoverActiveRef.current) {
                            restoreOriginalImage()
                          }
                        }, 60)
                      }}
                      onClick={() => {
                        switchMainImage(img, idx)
                      }}
                    >
                      <Image
                        src={img}
                        alt={`Thumbnail ${idx + 1}`}
                        width={80}
                        height={80}
                        unoptimized
                        onError={(e) => {
                          try {
                            const target = e.target as HTMLImageElement
                            if (target && target.src && !target.src.includes('placeholder')) {
                              target.src = '/placeholder.svg?height=80&width=80'
                            }
                          } catch (error) {
                            // Silently ignore errors
                          }
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Center: Product Information */}
            <div className={styles.productInfo}>
              <div className={styles.productHeader}>
                <div className={styles.breadcrumb}>
                  <Link href="/">Home</Link> &gt; <Link href="/products">Products</Link> &gt;{' '}
                  <span>{product.name?.split('|')[0].trim().substring(0, 50) || 'Product Details'}</span>
                </div>
                <h1>{product.name || product.productName}</h1>
                <div className={styles.productBrand}>{product.brand || 'DECZON'}</div>
              </div>

              {/* Secure Payment Logo */}
              <div className={styles.secure}>
                <Image
                  src="/LOGO/secure.png"
                  alt="Secure Payment"
                  width={200}
                  height={60}
                  unoptimized
                />
              </div>

              <div className={styles.productPricing}>
                <div className={styles.priceQuantityContainer}>
                  <div className={styles.priceSection}>
                    <div className={styles.priceMain}>
                      <span className={styles.currentPrice}>₹{currentPrice.toLocaleString('en-IN')}</span>
                      {originalPrice > currentPrice && (
                        <>
                          <span className={styles.originalPrice}>₹{originalPrice.toLocaleString('en-IN')}</span>
                          <span className={styles.discountBadge}>{discountPercent}% OFF</span>
                        </>
                      )}
                    </div>
                    <div className={styles.priceUnit}>{product.priceUnit?.replace('-', ' ') || 'per piece'}</div>
                  </div>
                </div>

                <div className={styles.productDescription}>
                  <h2 className={styles.descriptionTitle}>Description</h2>
                  <DescriptionPreview
                    description={selectedColor?.description || product.description || product.longDescription || ''}
                    onSeeMore={scrollToProductInfoTabs}
                  />
                </div>

                {/* Colors Section */}
                {availableColors.length > 0 && (
                  <div className={styles.productColorsSection}>
                    <h3 className={styles.colorsTitle}>Available Variants</h3>
                    <div className={styles.colorsGrid}>
                      {availableColors.map((color, index) => (
                        <div
                          key={index}
                          className={`${styles.colorOption} ${index === selectedColorIndex ? styles.colorOptionActive : ''}`}
                          onMouseEnter={() => {
                            if (color.imageUrl) switchMainImageOnHover(color.imageUrl)
                          }}
                          onMouseLeave={restoreOriginalImage}
                          onClick={() => color.isVariant ? navigateToColorVariant(color.productId!) : selectColor(index)}
                        >
                          <div className={styles.colorImageContainer}>
                            <Image
                              src={color.imageUrl || '/placeholder.svg'}
                              alt={color.name}
                              width={80}
                              height={80}
                              unoptimized
                            />
                          </div>
                          <div className={styles.colorName}>{color.name}</div>
                          {color.isVariant && color.showViewTag && (
                            <div className={styles.variantBadge}>View</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Modules Section (Material) */}
                {product.moduleOptions && product.moduleOptions.length > 0 && (
                  <div className={styles.productModulesSection}>
                    <h3 className={styles.modulesTitle}>Material</h3>
                    <div className={styles.modulesGrid}>
                      {product.moduleOptions.map((module, index) => {
                        const moduleImageUrl = module.moduleImageUrl || module.imageUrl
                        return (
                          <div
                            key={index}
                            className={`${styles.moduleOption} ${index === selectedModuleIndex ? styles.active : ''}`}
                            onMouseEnter={() => {
                              if (moduleImageUrl) switchMainImageOnHover(moduleImageUrl)
                            }}
                            onMouseLeave={restoreOriginalImage}
                            onClick={() => selectModule(index)}
                          >
                            <div className={styles.moduleInfo}>
                              <div className={styles.moduleGangType}>{module.gangType || 'Module'}</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Materials Section (from group products) */}
                {(() => {
                  const materials = getAvailableMaterials()
                  return materials.length > 0 && (
                    <div className={styles.productModulesSection}>
                      <h3 className={styles.modulesTitle}>Materials</h3>
                      <div className={styles.modulesGrid}>
                        {materials.map((material, index) => {
                          // Find product with this material for image
                          const group = product.groupProducts || []
                          const materialProduct = group.find(p => (p.material || '') === material)
                          const materialImageUrl = materialProduct?.primaryImageUrl || materialProduct?.imageUrl

                          return (
                            <div
                              key={index}
                              className={`${styles.moduleOption} ${index === selectedMaterialIndex ? styles.active : ''}`}
                              onMouseEnter={() => {
                                if (materialImageUrl) switchMainImageOnHover(materialImageUrl)
                              }}
                              onMouseLeave={restoreOriginalImage}
                              onClick={() => selectMaterial(index)}
                            >
                              <div className={styles.moduleInfo}>
                                <div className={styles.moduleGangType}>{material}</div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}

                {/* Action Buttons */}
                <div className={styles.actionButtons}>
                  <div
                    className={styles.wishlistLink}
                    onClick={addToCart}
                    style={hasJustAdded ? { color: '#28a745' } : {}}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill={hasJustAdded ? '#28a745' : 'none'}
                      stroke={hasJustAdded ? '#28a745' : '#666'}
                      strokeWidth="2"
                      style={{ marginRight: '8px' }}
                    >
                      <path d="M3 3h2l.4 2M7 13h10l4-8H5.4m1.6 8L5 3H3m4 10v6a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-6" />
                    </svg>
                    <span>{hasJustAdded ? 'Added to cart' : 'Add to cart'}</span>
                  </div>
                  <div className={styles.buttonContainer}>
                    <button
                      className={styles.enquireNowBtn}
                      onClick={() => setEnquiryModalOpen(true)}
                    >
                      ENQUIRE NOW
                    </button>
                    <button className={styles.buyNowBtn} onClick={handleBuyNow}>
                      BUY IT NOW
                    </button>
                  </div>
                </div>
              </div>

              {/* Product Details Table */}
              {product.productDetails && product.productDetails.length > 0 && (
                <div className={styles.productDetailsTableSection}>
                  <table className={styles.productDetailsTable}>
                    <tbody>
                      {product.productDetails.map((detail, idx) => (
                        <tr key={idx}>
                          <td className={styles.detailName}>{detail.name}:</td>
                          <td className={styles.detailValue}>{detail.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Delivery & Shipping */}
              {(product.estimatedDelivery || product.freeShippingThreshold) && (
                <div className={styles.deliveryShippingSection}>
                  <div className={styles.deliveryShippingItem}>
                    <i className="fa fa-truck"></i>
                    <span className={styles.deliveryText}>
                      <span className={styles.deliveryLabel}>Estimated Delivery:</span>
                      <span className={styles.deliveryValue}>
                        {product.estimatedDelivery || 'Contact for details'}
                      </span>
                    </span>
                  </div>
                  {product.freeShippingThreshold && (
                    <div className={styles.deliveryShippingItem}>
                      <i className="fa fa-box"></i>
                      <span className={styles.deliveryText}>
                        <span className={styles.deliveryLabel}>Free Shipping & Returns:</span>
                        <span className={styles.deliveryValue}>
                          On all orders over ₹{product.freeShippingThreshold.toLocaleString('en-IN')}
                        </span>
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Guaranteed SAFE Checkout Section */}
              <div className={styles.safeCheckoutSection}>
                <div className={styles.paymentSecurityLogos}>
                  <Image
                    src="/images/checkout.png"
                    alt="Payment and Security Logos"
                    className={styles.paymentLogosImage}
                    width={600}
                    height={200}
                    unoptimized
                  />
                </div>
              </div>
            </div>

            {/* Right: Related Products */}
            {relatedProducts.length > 0 && (
              <div className={styles.relatedProductsSidebar} ref={relatedProductsSidebarRef}>
                <h2>Related Products</h2>
                <div className={styles.relatedProductsVertical}>
                  {relatedProducts.map(related => (
                    <Link
                      key={related.id}
                      href={`/products/${related.id}`}
                      className={styles.relatedProductItem}
                    >
                      <div className={styles.relatedProductImage}>
                        <Image
                          src={related.primaryImageUrl || related.imageUrl || '/placeholder.svg'}
                          alt={related.name || 'Product'}
                          width={90}
                          height={90}
                          unoptimized
                        />
                      </div>
                      <div className={styles.relatedProductInfo}>
                        <div className={styles.relatedProductName}>{related.name}</div>
                        <div className={styles.relatedProductPrice}>
                          <span>₹{(related.currentPrice || 0).toLocaleString('en-IN')}</span>
                          <button
                            className={styles.relatedAddBtn}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAddRelatedToCart(related, e)
                            }}
                            aria-label="Add to cart"
                          >
                            <svg className={styles.relatedAddIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 3h2l.4 2M7 13h10l4-8H5.4m1.6 8L5 3H3m4 10v6a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-6" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Frequently Bought Together / Color Combination Section */}
        {fbtItems.length > 0 && fbtItems.some(x => !x.isBase) && (
          <section className={styles.fbtSection}>
            <div className={styles.fbtTitle}>Frequently bought together</div>
            <div className={styles.fbtContent}>
              <div className={styles.fbtGrid}>
                {fbtItems.map((item, index) => (
                  <React.Fragment key={item.id}>
                    <div
                      className={`${styles.fbtCard} ${item.isBase ? styles.baseItem : ''}`}
                      onClick={(e) => handleFbtCardClick(item, index, e)}
                    >
                      <input
                        type="checkbox"
                        className={styles.fbtCheckbox}
                        checked={fbtChecked[index]}
                        onChange={() => handleFbtCheckboxChange(index)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className={styles.fbtImage}>
                        <Image
                          src={item.imageUrl || '/placeholder.svg?height=150&width=150'}
                          alt={item.name}
                          width={260}
                          height={260}
                          unoptimized
                        />
                      </div>
                      <div className={styles.fbtName}>{item.name}</div>
                      <div className={styles.fbtPrice}>
                        ₹{item.price.toLocaleString('en-IN')}
                        {item.originalPrice > item.price && (
                          <del> ₹{item.originalPrice.toLocaleString('en-IN')}</del>
                        )}
                      </div>
                    </div>
                    {index < fbtItems.length - 1 && (
                      <div className={styles.fbtPlus}>+</div>
                    )}
                  </React.Fragment>
                ))}
              </div>
              <div className={styles.fbtSummary}>
                <div className={styles.meta}>
                  <span id="fbt-item-count">
                    {(() => {
                      const counts = getFbtSelectedCount()
                      return counts.base === 1 ? '' : `${counts.base} Items`
                    })()}
                  </span>
                  <span id="fbt-addon-count">
                    {(() => {
                      const counts = getFbtSelectedCount()
                      return counts.addon === 1 ? '' : `${counts.addon} `
                    })()}
                  </span>
                </div>
                <div className={styles.fbtTotal} id="fbt-total">
                  = ₹{getFbtTotal().toLocaleString('en-IN')}
                </div>
                <button
                  id="fbt-add-btn"
                  className={styles.fbtAddBtn}
                  onClick={addFbtToCart}
                >
                  {(() => {
                    const selectedCount = fbtItems.filter((_, idx) => fbtChecked[idx]).length
                    return selectedCount > 1
                      ? `Add ${selectedCount} items to cart`
                      : 'Add item to cart'
                  })()}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Product Information Tabs */}
        <section className={styles.productInfoTabsSection} ref={tabsSectionRef}>
          <div className={styles.productTabs}>
            <div className={styles.tabNav}>
              <button
                className={`${styles.tabBtn} ${activeTab === 'description' ? styles.active : ''}`}
                onClick={() => setActiveTab('description')}
              >
                Description
              </button>
              <button
                className={`${styles.tabBtn} ${activeTab === 'additional' ? styles.active : ''}`}
                onClick={() => setActiveTab('additional')}
              >
                Additional
              </button>
              <button
                className={`${styles.tabBtn} ${activeTab === 'shipping' ? styles.active : ''}`}
                onClick={() => setActiveTab('shipping')}
              >
                Shipping & Return
              </button>
            </div>

            <div className={styles.tabContent}>
              {/* Description Tab */}
              <div className={`${styles.tabPane} ${activeTab === 'description' ? styles.active : ''}`} id="description-tab">
                <div
                  className={styles.tabContentInner}
                  id="description-tab-content"
                  dangerouslySetInnerHTML={{
                    __html: selectedColor?.description || product.description || product.longDescription || 'No description available.'
                  }}
                />
              </div>

              {/* Additional Tab */}
              <div className={`${styles.tabPane} ${activeTab === 'additional' ? styles.active : ''}`} id="additional-tab">
                <div className={styles.tabContentInner}>
                  {specifications.length > 0 && (
                    <div className={styles.specificationsSection}>
                      <h3>Specifications</h3>
                      <table className={styles.specificationsTable}>
                        <tbody>
                          {(showFullSpecs ? specifications : specifications.slice(0, 4)).map(([key, value], idx) => (
                            <tr key={idx}>
                              <td className={styles.specName}>{key}</td>
                              <td className={styles.specValue}>{value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {specifications.length > 4 && (
                        <button
                          className={styles.seeMoreLink}
                          onClick={() => setShowFullSpecs(!showFullSpecs)}
                        >
                          {showFullSpecs ? 'Read Less' : 'Read More'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Shipping & Return Tab */}
              <div className={`${styles.tabPane} ${activeTab === 'shipping' ? styles.active : ''}`} id="shipping-tab">
                <div className={styles.tabContentInner}>
                  <h4>Shipping & Return Policy</h4>
                  <p>We offer fast and reliable shipping across India.</p>
                  <ul>
                    <li>Free shipping on orders above ₹20,000</li>
                    <li>Standard delivery: 5-7 business days</li>
                    <li>Express delivery: 2-3 business days</li>
                    <li>30-day return policy</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Available Services Section */}
        {availableServices.length > 0 && (
          <section className={styles.availableServicesSection}>
            <div className={styles.container}>
              <div className={styles.sectionHeader}>
                <h2>Related services</h2>
                <Link href="/services" className={styles.viewAllServicesBtn}>
                  View All Services
                </Link>
              </div>

              <div className={styles.productsSlider}>
                <button
                  className={`${styles.sliderBtn} ${styles.prev}`}
                  onClick={scrollAvailableServicesLeft}
                  aria-label="Previous available services"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M15 18l-6-6 6-6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                <div className={styles.productsGrid} ref={servicesGridRef}>
                  {servicesLoading ? (
                    <div className={styles.loadingProducts}>Loading available services...</div>
                  ) : (
                    availableServices.map((service) => {
                      const imageUrl = getServiceImageUrlUtil(service, '/placeholder.svg?height=200&width=200&text=Service')

                      // Debug logging for troubleshooting - compare HTML vs Next.js
                      if (service.name?.toLowerCase().includes('saloon')) {
                        console.debug('Product detail related services card', {
                          id: service.id,
                          name: service.name,
                          resolvedImageUrl: imageUrl,
                          fields: {
                            primaryImageUrl: service.primaryImageUrl,
                            imageUrl: service.imageUrl,
                            imageUrls: service.imageUrls,
                            galleryImages: service.galleryImages
                          }
                        })
                      }

                      const startingPrice =
                        service.startingPrice ||
                        service.basePrice ||
                        service.priceFrom ||
                        service.minPrice ||
                        service.minimumPrice ||
                        service.price ||
                        null
                      const originalPrice = service.originalPrice || null
                      const discountPercent =
                        originalPrice && startingPrice && originalPrice > startingPrice
                          ? Math.round((1 - startingPrice / originalPrice) * 100)
                          : 0

                      return (
                        <Link
                          key={service.id}
                          href={`/services/${service.id}`}
                          className={styles.productCard}
                        >
                          <div className={styles.productImage}>
                            <img
                              src={imageUrl}
                              alt={service.name || 'Service'}
                              className={styles.lazyImage}
                              loading="lazy"
                              decoding="async"
                              /* crossOrigin="anonymous" removed for CORS fix */
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                if (!target.src.includes('placeholder.svg')) {
                                  target.src = '/placeholder.svg?height=200&width=200&text=Service'
                                }
                                target.onerror = null
                              }}
                            />
                          </div>
                          <div className={styles.productInfo}>
                            <h3 className={styles.productTitle}>{service.name || 'Unnamed Service'}</h3>
                            <div className={styles.productPricing}>
                              <div className={styles.priceSection}>
                                <div className={styles.productPrice}>
                                  {startingPrice != null ? (
                                    <>
                                      <span className={styles.currentPrice}>
                                        Starts from ₹{startingPrice.toLocaleString('en-IN')}
                                      </span>
                                      {originalPrice && originalPrice > (startingPrice || 0) && (
                                        <>
                                          <span className={styles.originalPrice}>
                                            ₹{originalPrice.toLocaleString('en-IN')}
                                          </span>
                                          {discountPercent > 0 && (
                                            <span className={styles.discountBadge}>{discountPercent}% OFF</span>
                                          )}
                                        </>
                                      )}
                                    </>
                                  ) : (
                                    <span className={styles.currentPrice}>Contact for pricing</span>
                                  )}
                                </div>
                              </div>
                              <div className={styles.addToCartSection}>
                                <div
                                  className={styles.addToCartBtn}
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                  }}
                                >
                                  Book Now
                                </div>
                              </div>
                            </div>
                          </div>
                        </Link>
                      )
                    })
                  )}
                </div>

                <button
                  className={`${styles.sliderBtn} ${styles.next}`}
                  onClick={scrollAvailableServicesRight}
                  aria-label="Next available services"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M9 18l6-6-6-6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Enquiry Modal */}
      {enquiryModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setEnquiryModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeModal} onClick={() => setEnquiryModalOpen(false)}>
              ×
            </button>
            <h2>Product Enquiry</h2>
            <form onSubmit={handleEnquirySubmit}>
              <div className={styles.formSection}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Your Name <span style={{ color: 'red' }}>*</span></label>
                  <input
                    type="text"
                    className={styles.formControl}
                    required
                    value={enquiryForm.name}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, name: e.target.value })}
                    placeholder="Enter your full name"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Phone Number <span style={{ color: 'red' }}>*</span></label>
                  <input
                    type="tel"
                    className={styles.formControl}
                    required
                    value={enquiryForm.phone}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, phone: e.target.value })}
                    placeholder="Enter your phone number"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Location <span style={{ color: 'red' }}>*</span></label>
                  <input
                    type="text"
                    className={styles.formControl}
                    required
                    value={enquiryForm.location}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, location: e.target.value })}
                    placeholder="Enter your city/area"
                  />
                </div>
              </div>
              <div className={styles.formSection}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Requirements</label>
                  <textarea
                    className={styles.formControl}
                    value={enquiryForm.message}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, message: e.target.value })}
                    rows={4}
                    placeholder="Tell us about your requirements, budget, timeline, etc."
                  />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Email Address</label>
                <input
                  type="email"
                  className={styles.formControl}
                  value={enquiryForm.email}
                  onChange={(e) => setEnquiryForm({ ...enquiryForm, email: e.target.value })}
                  placeholder="Enter your email (optional)"
                />
              </div>
              <div className={styles.formActions}>
                <button type="button" className={styles.btnCancel} onClick={() => setEnquiryModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className={styles.btnSubmit}>
                  📩 Submit Enquiry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Blog Section */}
      <BlogSection />

      {/* Warranty Modal */}
      {warrantyModalOpen && warrantyModalData && (
        <div
          className={styles.warrantyModalOverlay}
          onClick={() => setWarrantyModalOpen(false)}
        >
          <div
            className={styles.warrantyModalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.warrantyModalHeader}>
              <div className={styles.warrantyModalTitle}></div>
              <button
                className={styles.warrantyModalClose}
                onClick={() => setWarrantyModalOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className={styles.warrantyModalBody}>
              <div>
                <img
                  src="/LOGO/DECZON.png"
                  alt="Protection"
                  className={styles.warrantyModalLogo}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
                <div className={styles.warrantyModalName}>
                  {warrantyModalData.name || 'Warranty'}
                </div>
                <div className={styles.warrantyModalPrice}>
                  {warrantyModalData.price ? `₹${Number(warrantyModalData.price).toLocaleString('en-IN')}` : ''}
                  {warrantyModalData.originalPrice && (
                    <del> ₹{Number(warrantyModalData.originalPrice).toLocaleString('en-IN')}</del>
                  )}
                </div>
                <div className={styles.warrantyModalDesc}>
                  {warrantyModalData.description || ''}
                </div>
              </div>
              <div className={styles.warrantyModalImageContainer}>
                {warrantyModalData.imageUrl && (
                  <img
                    src={warrantyModalData.imageUrl}
                    alt="Warranty"
                    className={styles.warrantyModalImage}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {isImageModalOpen && modalImageUrl && (
        <div
          className={styles.imageModal}
          role="dialog"
          aria-modal="true"
          aria-label="Product image modal"
          onClick={() => {
            setIsImageModalOpen(false)
            setModalImageUrl(null)
          }}
        >
          <div className={styles.imageModalBackdrop}>
            <div
              className={styles.imageModalContent}
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={modalImageUrl}
                alt="Product Image"
                className={styles.imageModalImage}
              />
              <button
                className={styles.imageModalClose}
                onClick={() => {
                  setIsImageModalOpen(false)
                  setModalImageUrl(null)
                }}
                aria-label="Close image modal"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

