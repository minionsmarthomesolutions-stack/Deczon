'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { db } from '@/lib/firebase'
import { doc, getDoc, collection, getDocs, orderBy, limit, query, updateDoc, increment, where } from 'firebase/firestore'
import styles from './blog-post.module.css'

interface Blog {
    id: string
    title: string
    content?: string
    excerpt?: string
    primaryImage?: string
    imageUrl?: string
    heroImage?: string
    author?: string
    createdAt?: any
    publishedAt?: any
    readingTime?: number
    likes?: number
    views?: number
    category?: string
}

export default function BlogPost() {
    const params = useParams()
    const id = params?.id as string
    const router = useRouter()

    const [blog, setBlog] = useState<Blog | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)
    const [relatedPosts, setRelatedPosts] = useState<Blog[]>([])

    const [isLiked, setIsLiked] = useState(false)
    const [likeCount, setLikeCount] = useState(0)
    const [isBookmarked, setIsBookmarked] = useState(false)

    // Notification State
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'info' | 'error' } | null>(null)

    useEffect(() => {
        if (id) {
            loadBlogPost(id)
            loadRelatedPosts(id)
            checkInteractions(id)
        }
    }, [id])

    // Clear notification after 3 seconds
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [notification])

    const loadBlogPost = async (blogId: string) => {
        setLoading(true)
        setError(false)

        try {
            let blogData: Blog | null = null

            // 1. Try Firebase
            if (db) {
                try {
                    const docRef = doc(db, 'blogs', blogId)
                    const docSnap = await getDoc(docRef)

                    if (docSnap.exists()) {
                        blogData = { id: docSnap.id, ...docSnap.data() } as Blog
                        // Increment view count
                        incrementViewCount(blogId)
                    }
                } catch (err) {
                    console.warn('Firebase error fetching blog:', err)
                }
            }

            // 2. Fallback to localStorage (sample data)
            if (!blogData) {
                const localBlogs = typeof window !== 'undefined' ?
                    JSON.parse(localStorage.getItem('minion-blogs') || '[]') : []
                blogData = localBlogs.find((b: any) => b.id === blogId)
            }

            // 3. Fallback static data if purely sample ID or testing
            if (!blogData && (blogId === '1' || blogId === '2' || blogId === '3')) {
                // Using sample data
                const samples: Record<string, any> = {
                    '1': {
                        id: '1',
                        title: 'Revolutionary Smart Home Security System Launched',
                        content: '<p>Discover the latest AI-powered security system that revolutionizes home protection with advanced AI technology and seamless integration.</p><p>Standard security systems are becoming a thing of the past. The future is AI-driven, proactive, and intelligent.</p>',
                        excerpt: 'Discover the latest AI-powered...',
                        author: 'DECZON Team',
                        createdAt: new Date(),
                        category: 'Security',
                        readingTime: 4
                    },
                    '2': {
                        id: '2',
                        title: 'Top Interior Design Trends to Refresh Your Home in 2025',
                        content: '<p>From sustainable materials to bold colors, here are the top trends shaping homes in 2025.</p>',
                        excerpt: 'Discover the latest interior design trends...',
                        author: 'DECZON Team',
                        createdAt: new Date(),
                        category: 'Design',
                        readingTime: 6
                    },
                    '3': {
                        id: '3',
                        title: 'Smart Lighting Solutions for Modern Homes',
                        content: '<p>Control your ambiance with a tap. Smart lighting is more than just bulbs; it is a lifestyle.</p>',
                        excerpt: 'Explore how smart lighting can transform...',
                        author: 'DECZON Team',
                        createdAt: new Date(),
                        category: 'Lighting',
                        readingTime: 3
                    }
                }
                blogData = samples[blogId]
            }

            if (blogData) {
                setBlog(blogData)
                setLikeCount(blogData.likes || 0)
            } else {
                setError(true)
            }

        } catch (err) {
            console.error('Error loading blog:', err)
            setError(true)
        } finally {
            setLoading(false)
        }
    }

    const loadRelatedPosts = async (currentId: string) => {
        try {
            let posts: Blog[] = []

            if (db) {
                try {
                    const q = query(
                        collection(db, 'blogs'),
                        orderBy('createdAt', 'desc'),
                        limit(6)
                    )
                    const querySnapshot = await getDocs(q)
                    posts = querySnapshot.docs
                        .map(d => ({ id: d.id, ...d.data() } as Blog))
                        .filter(b => b.id !== currentId)
                        .slice(0, 4)
                } catch (err: any) {
                    if (err?.code !== 'permission-denied') {
                        console.warn('Error loading related posts:', err)
                    }
                }
            }

            if (posts.length === 0 && typeof window !== 'undefined') {
                const localBlogs = JSON.parse(localStorage.getItem('minion-blogs') || '[]')
                posts = localBlogs
                    .filter((b: any) => b.id !== currentId)
                    .slice(0, 4)
            }

            setRelatedPosts(posts)
        } catch (err) {
            console.warn('Related posts load error', err)
        }
    }

    const incrementViewCount = async (blogId: string) => {
        if (!db) return
        const viewedKey = 'viewedPosts'
        const viewedPosts = JSON.parse(sessionStorage.getItem(viewedKey) || '[]')

        if (!viewedPosts.includes(blogId)) {
            viewedPosts.push(blogId)
            sessionStorage.setItem(viewedKey, JSON.stringify(viewedPosts))
            try {
                const r = doc(db, 'blogs', blogId)
                await updateDoc(r, {
                    views: increment(1)
                })
            } catch (e) { /* ignore */ }
        }
    }

    const checkInteractions = (blogId: string) => {
        const likedPosts = JSON.parse(localStorage.getItem('likedPosts') || '[]')
        setIsLiked(likedPosts.includes(blogId))

        const bookmarkedPosts = JSON.parse(localStorage.getItem('bookmarkedPosts') || '[]')
        setIsBookmarked(bookmarkedPosts.includes(blogId))
    }

    const handleLike = async () => {
        if (!blog) return

        const newLikedState = !isLiked
        setIsLiked(newLikedState)

        const likedPosts = JSON.parse(localStorage.getItem('likedPosts') || '[]')
        let newCount = likeCount

        if (newLikedState) {
            if (!likedPosts.includes(blog.id)) {
                likedPosts.push(blog.id)
                newCount++
                showNotification("Added to liked posts!", "success")
            }
        } else {
            const idx = likedPosts.indexOf(blog.id)
            if (idx > -1) {
                likedPosts.splice(idx, 1)
                newCount = Math.max(0, newCount - 1)
                showNotification("Removed from liked posts", "info")
            }
        }

        setLikeCount(newCount)
        localStorage.setItem('likedPosts', JSON.stringify(likedPosts))

        // Update Firebase
        if (db) {
            try {
                const r = doc(db, 'blogs', blog.id)
                await updateDoc(r, {
                    likes: newCount
                })
            } catch (e) { /* ignore */ }
        }
    }

    const handleBookmark = () => {
        if (!blog) return

        const newBookmarkedState = !isBookmarked
        setIsBookmarked(newBookmarkedState)

        const bookmarkedPosts = JSON.parse(localStorage.getItem('bookmarkedPosts') || '[]')

        if (newBookmarkedState) {
            if (!bookmarkedPosts.includes(blog.id)) {
                bookmarkedPosts.push(blog.id)
                showNotification("Added to bookmarks!", "success")
            }
        } else {
            const idx = bookmarkedPosts.indexOf(blog.id)
            if (idx > -1) {
                bookmarkedPosts.splice(idx, 1)
                showNotification("Removed from bookmarks", "info")
            }
        }

        localStorage.setItem('bookmarkedPosts', JSON.stringify(bookmarkedPosts))
    }

    const handleShare = async () => {
        const url = window.location.href
        const title = blog?.title || 'Check out this blog!'

        if (navigator.share) {
            try {
                await navigator.share({
                    title,
                    url
                })
            } catch (e) {
                console.log('Share canceled')
            }
        } else {
            await navigator.clipboard.writeText(url)
            showNotification("Link copied to clipboard!", "success")
        }
    }

    const showNotification = (message: string, type: 'success' | 'info' | 'error') => {
        setNotification({ message, type })
    }

    const formatDate = (dateInput: any) => {
        if (!dateInput) return 'Recently'
        try {
            let date
            if (dateInput.toDate && typeof dateInput.toDate === 'function') {
                date = dateInput.toDate()
            } else if (typeof dateInput === 'string') {
                date = new Date(dateInput)
            } else {
                date = dateInput
            }
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
        } catch (error) {
            return 'Recently'
        }
    }

    const resolveImageUrl = (url?: string) => {
        if (!url) return '/placeholder.svg'
        if (url.startsWith('http')) return url
        return url
    }

    if (loading) {
        return (
            <main className={styles.blogDetailMain}>
                <div className={styles.blogLoading}>
                    <div className={styles.loadingSpinner}></div>
                    <p>Loading blog post...</p>
                </div>
            </main>
        )
    }

    if (error || !blog) {
        return (
            <main className={styles.blogDetailMain}>
                <div className={styles.blogError}>
                    <div className={styles.errorIcon}>⚠️</div>
                    <h2>Blog Post Not Found</h2>
                    <p>The blog post you're looking for doesn't exist or has been removed.</p>
                    <Link href="/" className={styles.btnPrimary}>Back to Home</Link>
                </div>
            </main>
        )
    }

    return (
        <main className={styles.blogDetailMain}>
            {/* Toast Notification */}
            {notification && (
                <div className={`${styles.notification} ${styles[notification.type]}`}>
                    {notification.message}
                </div>
            )}

            <div className={styles.blogContainer}>
                <div className={styles.blogContentWrapper}>
                    {/* Hero Image */}
                    <section className={styles.blogHeroImage}>
                        <img
                            src={resolveImageUrl(blog.primaryImage || blog.imageUrl || blog.heroImage)}
                            alt={blog.title}
                        />
                    </section>

                    <div className={styles.blogContentContainer}>
                        {/* Header */}
                        <header className={styles.blogHeader}>
                            <div className={styles.blogMeta}>
                                <span className={styles.blogAuthor}>{blog.author || 'DECZON Team'}</span>
                                <span className={styles.metaSeparator}>•</span>
                                <span className={styles.blogDate}>{formatDate(blog.createdAt)}</span>
                                <span className={styles.metaSeparator}>•</span>
                                <span className={styles.blogReadingTime}>{blog.readingTime || 5} min read</span>
                            </div>
                            <h1 className={styles.blogTitle}>{blog.title}</h1>
                        </header>

                        {/* Content */}
                        <article className={styles.blogArticle}>
                            <div
                                className={styles.blogContentText}
                                dangerouslySetInnerHTML={{ __html: blog.content || '<p>No content available.</p>' }}
                            />

                            {/* Actions */}
                            <div className={styles.articleActions}>
                                <div className={styles.actionButtons}>
                                    <button
                                        className={`${styles.actionBtn} ${isLiked ? styles.liked : ''}`}
                                        onClick={handleLike}
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" strokeWidth="2" fill={isLiked ? 'currentColor' : 'none'} />
                                        </svg>
                                        <span>{likeCount}</span>
                                    </button>

                                    <button className={styles.actionBtn} onClick={handleShare}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" stroke="currentColor" strokeWidth="2" />
                                            <polyline points="16,6 12,2 8,6" stroke="currentColor" strokeWidth="2" />
                                            <line x1="12" y1="2" x2="12" y2="15" stroke="currentColor" strokeWidth="2" />
                                        </svg>
                                        <span>Share</span>
                                    </button>

                                    <button
                                        className={`${styles.actionBtn} ${isBookmarked ? styles.liked : ''}`}
                                        onClick={handleBookmark}
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" fill={isBookmarked ? 'currentColor' : 'none'} />
                                        </svg>
                                        <span>Save</span>
                                    </button>
                                </div>
                            </div>
                        </article>
                    </div>

                    {/* Related Posts */}
                    {relatedPosts.length > 0 && (
                        <section className={styles.relatedPostsSection}>
                            <div className={styles.relatedContainer}>
                                <div className={styles.relatedHeader}>
                                    <h2>More stories for you</h2>
                                </div>
                                <div className={styles.relatedPostsGrid}>
                                    {relatedPosts.map(post => (
                                        <Link href={`/blog/${post.id}`} key={post.id} className={styles.relatedPostCard}>
                                            <div className={styles.relatedPostImage}>
                                                {post.primaryImage || post.imageUrl ? (
                                                    <img src={post.primaryImage || post.imageUrl} alt={post.title} />
                                                ) : (
                                                    <span>📄</span>
                                                )}
                                            </div>
                                            <div className={styles.relatedPostContent}>
                                                <div className={styles.relatedPostMeta}>
                                                    <span>{post.category || 'General'}</span>
                                                    <span>•</span>
                                                    <span>{formatDate(post.createdAt)}</span>
                                                </div>
                                                <h3 className={styles.relatedPostTitle}>{post.title}</h3>
                                                <p className={styles.relatedPostExcerpt}>{post.excerpt || 'Read more...'}</p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </section>
                    )}

                </div>
            </div>
        </main>
    )
}
