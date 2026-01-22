import { Metadata } from 'next'
import BlogDetailClient from './BlogDetailClient'
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
            title: 'Blog Post | Deczon'
        }
    }

    try {
        const blogDoc = await getDoc(doc(db, 'blogs', id))
        let blog = blogDoc.exists() ? { id: blogDoc.id, ...blogDoc.data() } : null

        // Fallback to static sample data for IDs 1, 2, 3 if not in DB (matching client logic)
        if (!blog && ['1', '2', '3'].includes(id)) {
            const samples: Record<string, any> = {
                '1': {
                    title: 'Revolutionary Smart Home Security System Launched',
                    excerpt: 'Discover the latest AI-powered security system that revolutionizes home protection...',
                    primaryImage: null
                },
                '2': {
                    title: 'Top Interior Design Trends to Refresh Your Home in 2025',
                    excerpt: 'From sustainable materials to bold colors, here are the top trends shaping homes in 2025.',
                    primaryImage: null
                },
                '3': {
                    title: 'Smart Lighting Solutions for Modern Homes',
                    excerpt: 'Control your ambiance with a tap. Smart lighting is more than just bulbs; it is a lifestyle.',
                    primaryImage: null
                }
            }
            blog = samples[id]
        }

        if (!blog) {
            return {
                title: 'Blog Post Not Found | Deczon'
            }
        }

        // @ts-ignore
        const title = blog.title || 'Blog Post'
        const siteName = ' | Deczon Blog'

        // Format: Blog Title | Deczon Blog
        const fullTitle = `${title}${siteName}`

        // @ts-ignore
        let description = blog.excerpt || blog.content || `Read ${title} on Deczon.`
        description = description.replace(/<[^>]*>?/gm, '').substring(0, 160)

        // @ts-ignore
        const image = blog.primaryImage || blog.imageUrl || blog.heroImage || '/placeholder.svg'

        return {
            title: fullTitle,
            description: description,
            openGraph: {
                title: fullTitle,
                description: description,
                images: [
                    {
                        url: image,
                        alt: title
                    }
                ],
                type: 'article',
            },
            twitter: {
                card: 'summary_large_image',
                title: fullTitle,
                description: description,
                images: [image],
            }
        }
    } catch (error) {
        console.error('Error generating blog metadata:', error)
        return {
            title: 'Blog Post | Deczon'
        }
    }
}

export default function BlogPage({ params }: Props) {
    return <BlogDetailClient />
}
