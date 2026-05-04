import { Metadata } from 'next'
import ServiceDetailClient from './ServiceDetailClient'
import { supabase } from '@/lib/supabase'

interface Props {
  params: { slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = params.slug

  try {
    let service: any = null

    // Try to find service by slug
    const { data: bySlug } = await supabase.from('services').select('*').eq('document->>slug', slug).limit(1).maybeSingle();

    if (bySlug && bySlug.document) {
      service = bySlug.document
    } else {
      // Fallback: Try to fetch by ID
      const { data: byId } = await supabase.from('services').select('*').eq('id', slug).maybeSingle();
      if (byId && byId.document) {
        service = byId.document
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
