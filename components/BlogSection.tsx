'use client'

import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore'
import Link from 'next/link'
import styles from './BlogSection.module.css'

interface Blog {
  id: string
  title: string
  excerpt?: string
  primaryImage?: string
  imageUrl?: string
  author?: string
  createdAt?: any
  category?: string
  isMainBlog?: boolean
}

export default function BlogSection() {
  const [blogs, setBlogs] = useState<Blog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBlogs()
  }, [])

  const loadBlogs = async () => {
    if (!db) {
      // Fallback data
      setBlogs([
        {
          id: '1',
          title: 'Revolutionary Smart Home Security System Launched',
          excerpt: 'Discover the latest AI-powered security system that revolutionizes home protection with advanced AI technology and seamless integration.',
          author: 'DECZON Team',
          createdAt: new Date(),
          isMainBlog: true
        },
        {
          id: '2',
          title: 'Top Interior Design Trends to Refresh Your Home in 2025',
          excerpt: 'Discover the latest interior design trends, color palettes, and décor ideas shaping 2025. From modern minimalism to sustainable living.',
          author: 'DECZON Team',
          createdAt: new Date()
        },
        {
          id: '3',
          title: 'Smart Lighting Solutions for Modern Homes',
          excerpt: 'Explore how smart lighting can transform your living space with energy efficiency and customizable ambiance.',
          author: 'DECZON Team',
          createdAt: new Date()
        }
      ])
      setLoading(false)
      return
    }

    try {
      // 1. Query for the explicit "Main Blog"
      let mainBlogData: Blog | null = null
      try {
        const mainBlogQuery = query(
          collection(db, 'blogs'),
          where('isMainBlog', '==', true),
          limit(1)
        )
        const mainSnapshot = await getDocs(mainBlogQuery)
        if (!mainSnapshot.empty) {
          const d = mainSnapshot.docs[0]
          mainBlogData = { id: d.id, ...d.data() } as Blog
        }
      } catch (err) {
        console.warn('Error fetching main blog:', err)
      }

      // 2. Query for recent blogs
      let recentBlogsData: Blog[] = []
      try {
        const recentQuery = query(
          collection(db, 'blogs'),
          orderBy('createdAt', 'desc'),
          limit(7) // Fetch extra in case one of them is the main blog
        )
        const recentSnapshot = await getDocs(recentQuery)
        recentBlogsData = recentSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Blog[]
      } catch (err: any) {
        // Handle permissions or missing index
        if (err?.code === 'permission-denied' || err?.code === 'missing-or-insufficient-permissions') {
          console.warn('Firebase permission denied for blogs.')
        } else {
          console.warn('Error fetching recent blogs:', err)
          // Fallback: try fetching without order if index is missing
          try {
            const fallbackSnapshot = await getDocs(collection(db, 'blogs'))
            recentBlogsData = fallbackSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            })).slice(0, 7) as Blog[]
          } catch (fallbackErr) {
            console.warn('Fallback blog fetch failed:', fallbackErr)
          }
        }
      }

      // 3. Compose the final list
      // Rule: Index 0 is Featured. Index 1-2 Left. Index 3-5 Right.

      let featured: Blog | undefined
      let others: Blog[] = []

      // Determine Featured
      if (mainBlogData) {
        featured = mainBlogData
      } else if (recentBlogsData.length > 0) {
        featured = recentBlogsData[0]
      }

      // Determine Others (Recent excluding featured)
      if (featured) {
        others = recentBlogsData.filter(b => b.id !== featured!.id)
      } else {
        others = []
      }

      // ensure we have enough to fill the UI if possible
      const finalBlogs = []
      if (featured) finalBlogs.push(featured)
      finalBlogs.push(...others)

      // If absolutely no data from DB, use fallback static data
      if (finalBlogs.length === 0) {
        // use the static fallback defined at the start logic if db was null, 
        // but here we just reuse similar static data
        setBlogs([
          {
            id: '1',
            title: 'Revolutionary Smart Home Security System Launched',
            excerpt: 'Discover the latest AI-powered security system that revolutionizes home protection with advanced AI technology and seamless integration.',
            author: 'DECZON Team',
            createdAt: new Date()
          },
          {
            id: '2',
            title: 'Top Interior Design Trends to Refresh Your Home in 2025',
            excerpt: 'Discover the latest interior design trends, color palettes, and décor ideas shaping 2025. From modern minimalism to sustainable living.',
            author: 'DECZON Team',
            createdAt: new Date()
          },
          {
            id: '3',
            title: 'Smart Lighting Solutions for Modern Homes',
            excerpt: 'Explore how smart lighting can transform your living space with energy efficiency and customizable ambiance.',
            author: 'DECZON Team',
            createdAt: new Date()
          }
        ])
      } else {
        setBlogs(finalBlogs)
      }

    } catch (error: any) {
      console.warn('Error in loadBlogs:', error)
      setBlogs([])
    } finally {
      setLoading(false)
    }
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
        month: 'short',
        day: 'numeric'
      })
    } catch (error) {
      return 'Recently'
    }
  }

  if (loading) {
    return (
      <section className={styles.blogSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTag}>Latest News</span>
            <h2>Smart Home Blog & Insights</h2>
            <p className={styles.sectionSubtitle}>Stay updated with the latest trends, tips, and innovations in smart home technology</p>
          </div>
          <div className={styles.blogLayout}>
            <div className={styles.loading}>
              <div className={styles.loadingSpinner}></div>
              <p>Loading latest blog posts...</p>
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (blogs.length === 0) {
    return null
  }

  // Match HTML logic: first blog = featured, next 2 = left, next 3 = right
  const selectedBlogs = blogs.slice(0, 6)
  const featuredBlog = selectedBlogs[0]
  const leftBlogs = selectedBlogs.slice(1, 3)
  const rightBlogs = selectedBlogs.slice(3, 6)

  return (
    <section className={styles.blogSection}>
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}>Latest News</span>
          <h2>Smart Home Blog & Insights</h2>
          <p className={styles.sectionSubtitle}>Stay updated with the latest trends, tips, and innovations in smart home technology</p>
        </div>

        <div className={styles.blogLayout}>
          {/* Left Column - Top Stories */}
          <div className={styles.blogLeftColumn}>
            <h3>Top Stories</h3>
            {leftBlogs.map((blog) => (
              <div
                key={blog.id}
                className={styles.blogLeftCard}
                onClick={() => window.location.href = `/blog/${blog.id}`}
              >
                <div className={styles.blogLeftImage}>
                  <img
                    src={blog.primaryImage || blog.imageUrl || '/placeholder.svg?height=300&width=400&text=Blog'}
                    alt={blog.title}
                  />
                </div>
                <div className={styles.blogLeftContent}>
                  <h4 className={styles.blogLeftTitle}>{blog.title}</h4>
                  <p className={styles.blogLeftExcerpt}>{blog.excerpt}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Center Column - Featured Blog */}
          <div className={styles.blogCenterColumn}>
            <div
              className={styles.blogFeatured}
              onClick={() => window.location.href = `/blog/${featuredBlog.id}`}
            >
              <div className={styles.blogFeaturedImage}>
                <img
                  src={featuredBlog.primaryImage || featuredBlog.imageUrl || '/placeholder.svg?height=400&width=600&text=Featured'}
                  alt={featuredBlog.title}
                />
              </div>
              <div className={styles.blogFeaturedContent}>
                <h2 className={styles.blogFeaturedTitle}>{featuredBlog.title}</h2>
                <p className={styles.blogFeaturedExcerpt}>{featuredBlog.excerpt}</p>
                <div className={styles.blogFeaturedMeta}>
                  <span>By {featuredBlog.author || 'DECZON Team'}</span>
                  <span>•</span>
                  <span>{formatDate(featuredBlog.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Latest Updates */}
          <div className={styles.blogRightColumn}>
            <h3>Latest Updates</h3>
            {rightBlogs.map((blog) => (
              <div
                key={blog.id}
                className={styles.blogRightItem}
                onClick={() => window.location.href = `/blog/${blog.id}`}
              >
                <div className={styles.blogRightMeta}>
                  <div className={styles.blogRightAuthor}>
                    <div className={styles.blogRightAuthorIcon}>
                      {(blog.author || 'D').charAt(0).toUpperCase()}
                    </div>
                    <span>{blog.author || 'DECZON Team'}</span>
                  </div>
                  <span>•</span>
                  <span>{formatDate(blog.createdAt)}</span>
                </div>
                <h4 className={styles.blogRightTitle}>{blog.title}</h4>
                <p className={styles.blogRightExcerpt}>{blog.excerpt}</p>
                <Link href={`/blog/${blog.id}`} className={styles.blogReadMore}>
                  Read More
                </Link>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.viewAllBlogs}>
          <Link href="/show-all-blogs" className={styles.btnPrimary}>
            View All Blog Posts
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  )
}

