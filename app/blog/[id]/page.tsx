import { Metadata } from 'next'
import BlogDetailClient from './BlogDetailClient'
import { supabase } from '@/lib/supabase'

interface Props {
    params: { id: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const id = params.id
    try {
        const { data: blogDoc } = await supabase.from('blogs').select('*').eq('id', id).maybeSingle()
        let blog = blogDoc ? { id: blogDoc.id, ...blogDoc.document } : null

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
