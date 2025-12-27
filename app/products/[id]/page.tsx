import { Metadata } from 'next'
import ProductClient from './ProductDetailClient'
import { getDb } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'

interface Props {
    params: { id: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const db = getDb()
    const id = params.id

    if (!db) {
        return {
            title: 'Product Details | Deczon'
        }
    }

    try {
        const productDoc = await getDoc(doc(db, 'products', id))
        if (!productDoc.exists()) {
            return {
                title: 'Product Not Found | Deczon'
            }
        }

        const product = productDoc.data()
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
