'use client'

import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore'
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
}

export default function BlogSection() {
  const [blogs, setBlogs] = useState<Blog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBlogs()
  }, [])

  const loadBlogs = async () => {
    if (!db) {
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
      setLoading(false)
      return
    }

    try {
      let blogsData: Blog[] = []
      
      // Try ordered query first
      try {
        const blogsQuery = query(
          collection(db, 'blogs'),
          orderBy('createdAt', 'desc'),
          limit(6)
        )
        const blogsSnapshot = await getDocs(blogsQuery)
        blogsData = blogsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Blog[]
      } catch (orderError: any) {
        // Check if it's a permission error
        if (orderError?.code === 'permission-denied' || orderError?.code === 'missing-or-insufficient-permissions') {
          console.warn('Firebase permission denied for blogs. Using fallback blog data.')
          blogsData = []
        } else {
          // If orderBy fails for other reasons, try without ordering
          console.warn('Blog orderBy failed, trying without order:', orderError)
          try {
            const blogsSnapshot = await getDocs(collection(db, 'blogs'))
            blogsData = blogsSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            })).slice(0, 6) as Blog[]
          } catch (fallbackError: any) {
            if (fallbackError?.code === 'permission-denied' || fallbackError?.code === 'missing-or-insufficient-permissions') {
              console.warn('Firebase permission denied for blogs. Using fallback blog data.')
              blogsData = []
            } else {
              throw fallbackError
            }
          }
        }
      }

      // If no blogs loaded, use fallback
      if (blogsData.length === 0) {
        blogsData = [
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
        ]
      }

      setBlogs(blogsData)
    } catch (error: any) {
      // Handle permission errors gracefully
      if (error?.code === 'permission-denied' || error?.code === 'missing-or-insufficient-permissions') {
        console.warn('Firebase permission denied for blogs. Using fallback blog data.')
      } else {
        console.warn('Error loading blogs:', error?.message || error)
      }
      // Fallback static data
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
              <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>
      </div>
    </section>
  )
}

