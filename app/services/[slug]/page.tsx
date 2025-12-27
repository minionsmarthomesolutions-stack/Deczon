import { Metadata } from 'next'
import ServiceDetailClient from './ServiceDetailClient'
import { getDb } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { getServiceImageUrl } from '@/lib/serviceImageUtils'

import { collection, query, where, limit, getDocs } from 'firebase/firestore'

interface Props {
  params: { slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const db = getDb()
  const slug = params.slug

  if (!db) {
    return {
      title: 'Service Details | Deczon'
    }
  }

  try {
    // Try to find service by slug
    const servicesRef = collection(db, 'services')
    const q = query(servicesRef, where('slug', '==', slug), limit(1))
    const querySnapshot = await getDocs(q)

    let service: any = null

    if (!querySnapshot.empty) {
      service = querySnapshot.docs[0].data()
    } else {
      // Fallback: Try to fetch by ID (in case the slug is actually an ID)
      const serviceDoc = await getDoc(doc(db, 'services', slug))
      if (serviceDoc.exists()) {
        service = serviceDoc.data()
      }
    }

    if (!service) {
      return {
        title: 'Service Not Found | Deczon'
      }
    }

    const name = service.name || 'Service'
    const category = service.category ? ` | ${service.category}` : ''

    // Format: Service Name | Category
    const title = `${name}${category}`

    // Extract plain text from description if it contains HTML
    let description = service.description || `Book ${name} services online at best price on Deczon. Professional and reliable services.`
    description = description.replace(/<[^>]*>?/gm, '').substring(0, 160)

    const image = service.primaryImageUrl || service.imageUrl || '/placeholder.svg'

    return {
      title: title,
      description: description,
      openGraph: {
        title: title,
        description: description,
        images: [
          {
            url: image,
            alt: name
          }
        ],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: title,
        description: description,
        images: [image],
      }
    }
  } catch (error) {
    console.error('Error generating service metadata:', error)
    return {
      title: 'Service Details | Deczon'
    }
  }
}

export default function ServicePage({ params }: Props) {
  return <ServiceDetailClient />
}
