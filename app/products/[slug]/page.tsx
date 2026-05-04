import { Metadata } from 'next'
import ProductClient from './ProductDetailClient'
import { supabase } from '@/lib/supabase'

interface Props {
    params: { slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const slug = params.slug

    try {
        let product: any = null

        // Try to fetch by slug from JSONB document
        const { data: bySlug, error: slugError } = await supabase
            .from('products')
            .select('*')
            .eq('document->>slug', slug)
            .limit(1)
            .maybeSingle()

        if (bySlug && bySlug.document) {
            product = bySlug.document
        } else {
            // Fallback: try by ID
            const { data: byId } = await supabase
                .from('products')
                .select('*')
                .eq('id', slug)
                .maybeSingle()
            
            if (byId && byId.document) {
                product = byId.document
            }
        }

        if (!product) {
            return {
                title: 'Product Not Found | Deczon'
            }
        }

        const name = product.name || 'Product'
        const brand = product.brand ? ` | ${product.brand}` : ''

        // Format: Product Name | Brand Name
        const title = `${name}${brand}`

        const description = product.description || product.shortDescription || `Buy ${name} online at best price on Deczon. Check reviews, specifications and more.`
        const image = product.primaryImageUrl || product.imageUrl || '/placeholder.svg'

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
        console.error('Error generating metadata:', error)
        return {
            title: 'Product Details | Deczon'
        }
    }
}

export default function ProductPage({ params }: Props) {
    return <ProductClient />
}
