/**
 * Shared utility functions for extracting service images
 * Matches the HTML version's comprehensive image extraction logic
 */

export interface ServiceImageData {
  imageUrl?: string
  primaryImageUrl?: string
  imageUrls?: string[]
  galleryImages?: string[] | { main?: string } | Record<string, any>
  images?: string[]
  secondaryImages?: string[]
  additionalImages?: string[]
  photoUrls?: string[]
  gallery?: string[] | Record<string, any>
  [key: string]: any
}

/**
 * Format Firebase Storage URL to include alt=media parameter
 */
function formatFirebaseUrl(url: string): string {
  if (!url || !url.includes('firebasestorage.googleapis.com')) {
    return url
  }
  
  if (!url.includes('?')) {
    return `${url}?alt=media`
  }
  
  if (!url.includes('alt=media')) {
    return `${url}&alt=media`
  }
  
  return url
}

/**
 * Extract all images from service data (matching HTML version)
 * Collects all possible images into a flat string array (no duplicates)
 */
export function extractAllImages(service: ServiceImageData): string[] {
  const images: string[] = []
  
  // Helper to add image if it's a valid string
  const addImage = (img: any) => {
    if (typeof img === 'string' && img.trim()) {
      images.push(formatFirebaseUrl(img.trim()))
    }
  }
  
  // primaryImageUrl
  if (service.primaryImageUrl) {
    addImage(service.primaryImageUrl)
  }
  
  // imageUrl
  if (service.imageUrl) {
    addImage(service.imageUrl)
  }
  
  // imageUrls[] (can be array or object)
  if (Array.isArray(service.imageUrls)) {
    service.imageUrls.forEach(addImage)
  } else if (service.imageUrls && typeof service.imageUrls === 'object') {
    Object.values(service.imageUrls).forEach(addImage)
  }
  
  // galleryImages (support both array and object)
  if (service.galleryImages) {
    if (Array.isArray(service.galleryImages)) {
      service.galleryImages.forEach(addImage)
    } else if (typeof service.galleryImages === 'object') {
      // Include .main if it exists
      if ('main' in service.galleryImages && service.galleryImages.main) {
        addImage(service.galleryImages.main)
      }
      // Include any other string values
      Object.values(service.galleryImages).forEach(addImage)
    }
  }
  
  // images[]
  if (Array.isArray(service.images)) {
    service.images.forEach(addImage)
  }
  
  // secondaryImages[]
  if (Array.isArray(service.secondaryImages)) {
    service.secondaryImages.forEach(addImage)
  }
  
  // additionalImages[]
  if (Array.isArray(service.additionalImages)) {
    service.additionalImages.forEach(addImage)
  }
  
  // photoUrls[]
  if (Array.isArray(service.photoUrls)) {
    service.photoUrls.forEach(addImage)
  }
  
  // gallery (if it exists, as array or object)
  if (service.gallery) {
    if (Array.isArray(service.gallery)) {
      service.gallery.forEach(addImage)
    } else if (typeof service.gallery === 'object') {
      Object.values(service.gallery).forEach(addImage)
    }
  }
  
  // Remove duplicates and empty strings
  return Array.from(new Set(images.filter(img => img && img.trim())))
}

/**
 * Get the primary image URL for a service
 * Matches the exact logic from HTML getServicePrimaryImage function
 */
export function getServiceImageUrl(service: ServiceImageData, placeholder: string = '/placeholder.svg?height=200&width=200&text=Service'): string {
  if (!service) return placeholder
  
  let url: string | undefined = undefined
  
  // 1. service.primaryImageUrl (matches HTML)
  if (service.primaryImageUrl && typeof service.primaryImageUrl === 'string' && service.primaryImageUrl.trim()) {
    url = service.primaryImageUrl.trim()
  }
  
  // 2. service.imageUrl (matches HTML)
  if (!url && service.imageUrl && typeof service.imageUrl === 'string' && service.imageUrl.trim()) {
    url = service.imageUrl.trim()
  }
  
  // 3. Check galleryImages array first (matches HTML order)
  if (!url && service.galleryImages && Array.isArray(service.galleryImages) && service.galleryImages.length > 0) {
    const first = service.galleryImages[0]
    if (typeof first === 'string' && first.trim()) {
      url = first.trim()
    }
  }
  
  // 4. imageUrls can be an array or an object (matches HTML)
  if (!url && Array.isArray(service.imageUrls) && service.imageUrls.length > 0) {
    const first = service.imageUrls[0]
    if (typeof first === 'string' && first.trim()) {
      url = first.trim()
    }
  }
  if (!url && service.imageUrls && typeof service.imageUrls === 'object' && !Array.isArray(service.imageUrls)) {
    const arr = Object.values(service.imageUrls).filter((v: any) => v && typeof v === 'string' && v.trim())
    if (arr.length > 0) {
      url = (arr[0] as string).trim()
    }
  }
  
  // 5. generic images array (matches HTML)
  if (!url && Array.isArray(service.images) && service.images.length > 0) {
    const first = service.images[0]
    if (typeof first === 'string' && first.trim()) {
      url = first.trim()
    }
  }
  
  // 6. Check galleryImages object format (legacy format - matches HTML)
  if (!url && service.galleryImages && typeof service.galleryImages === 'object' && !Array.isArray(service.galleryImages)) {
    const candidates = [
      (service.galleryImages as any).main,
      (service.galleryImages as any).medium,
      (service.galleryImages as any).firstChild,
      (service.galleryImages as any).lastChild,
      (service.galleryImages as any).floating
    ]
    const found = candidates.find((v: any) => v && typeof v === 'string' && v.trim())
    if (found) {
      url = found.trim()
    }
  }
  
  // 7. secondaryImages (additional fallback)
  if (!url && Array.isArray(service.secondaryImages) && service.secondaryImages.length > 0) {
    const first = service.secondaryImages[0]
    if (typeof first === 'string' && first.trim()) {
      url = first.trim()
    }
  }
  
  // 8. additionalImages (additional fallback)
  if (!url && Array.isArray(service.additionalImages) && service.additionalImages.length > 0) {
    const first = service.additionalImages[0]
    if (typeof first === 'string' && first.trim()) {
      url = first.trim()
    }
  }
  
  // 9. photoUrls (additional fallback)
  if (!url && Array.isArray(service.photoUrls) && service.photoUrls.length > 0) {
    const first = service.photoUrls[0]
    if (typeof first === 'string' && first.trim()) {
      url = first.trim()
    }
  }
  
  // If nothing found, return placeholder
  if (!url) {
    return placeholder
  }
  
  // Format Firebase Storage URLs (add ?alt=media or &alt=media)
  return formatFirebaseUrl(url)
}

