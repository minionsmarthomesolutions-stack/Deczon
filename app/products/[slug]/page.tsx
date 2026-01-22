import { Metadata } from 'next'
import ProductClient from './ProductDetailClient'
import { getDb } from '@/lib/firebase'
import { doc, getDoc, collection, query, where, limit, getDocs } from 'firebase/firestore'

interface Props {
    params: { slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const db = getDb()
    const slug = params.slug

    if (!db) {
        return {
            title: 'Product Details | Deczon'
        }
    }

    try {
        const productsRef = collection(db, 'products')
        const q = query(productsRef, where('slug', '==', slug), limit(1))
        const querySnapshot = await getDocs(q)

        if (querySnapshot.empty) {
            return {
                title: 'Product Not Found | Deczon'
            }
        }

        const product = querySnapshot.docs[0].data()
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
