'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
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

interface BlogSectionProps {
  blogs?: Blog[]
}

export default function BlogSection({ blogs: propBlogs }: BlogSectionProps) {
  const [blogs, setBlogs] = useState<Blog[]>(propBlogs || [])
  const [loading, setLoading] = useState(!propBlogs || propBlogs.length === 0)

  useEffect(() => {
    // If props are provided (server-side fetched), use them and don't fetch.
    if (propBlogs && propBlogs.length > 0) {
      setBlogs(propBlogs)
      setLoading(false)
    } else {
      // Only fetch if no props provided (client-side fallback)
      loadBlogs()
    }
  }, [propBlogs])

  const loadBlogs = async () => {
    try {
      let fetchedBlogs: any[] = []
      try {
        const { data, error } = await supabase
          .from('blogs')
          .select('*')
          .order('document->>createdAt', { ascending: false })
          .limit(8)
        
        if (!error && data) {
          fetchedBlogs = data.map((doc: any) => ({ id: doc.id, ...doc.document }))
        }
      } catch (e) { console.warn(e) }

      if (fetchedBlogs.length > 0) {
        setBlogs(fetchedBlogs)
      }
    } catch (error) {
      console.warn('Error loading blogs:', error)
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

  if (loading && (!blogs || blogs.length === 0)) {
    // Return empty or loading state, but for SEO we prefer content. 
    // If server passed data, we shouldn't be here.
    return null
  }

  if (blogs.length === 0) {
    return null
  }

  // Layout Logic
  // Match HTML logic: first blog (or main blog) = featured
  // If propBlogs passed, we might need to find the "isMainBlog" one or just sort.
  // We'll assume the list passed is already good or we sort it here.

  let featuredBlog: Blog | undefined = blogs.find(b => b.isMainBlog)
  if (!featuredBlog && blogs.length > 0) featuredBlog = blogs[0]

  // Filter out featured from others
  const otherBlogs = blogs.filter(b => b.id !== featuredBlog?.id)

  const leftBlogs = otherBlogs.slice(0, 2)
  const rightBlogs = otherBlogs.slice(2, 5) // Take next 3

  if (!featuredBlog) return null

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
              <Link
                href={`/blog/${blog.id}`}
                key={blog.id}
                className={styles.blogLeftCard}
                aria-label={`Read ${blog.title}`}
                target="_blank"
                rel="noopener noreferrer"
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
              </Link>
            ))}
          </div>

          {/* Center Column - Featured Blog */}
          <div className={styles.blogCenterColumn}>
            <Link
              href={`/blog/${featuredBlog.id}`}
              className={styles.blogFeatured}
              aria-label={`Featured article: ${featuredBlog.title}`}
              target="_blank"
              rel="noopener noreferrer"
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
                  <meta itemProp="author" content={featuredBlog.author || 'DECZON Team'} />
                  <meta itemProp="datePublished" content={formatDate(featuredBlog.createdAt)} />
                  <span>By {featuredBlog.author || 'DECZON Team'}</span>
                  <span>•</span>
                  <span>{formatDate(featuredBlog.createdAt)}</span>
                </div>
              </div>
            </Link>
          </div>

          {/* Right Column - Latest Updates */}
          <div className={styles.blogRightColumn}>
            <h3>Latest Updates</h3>
            {rightBlogs.map((blog) => (
              <Link
                href={`/blog/${blog.id}`}
                key={blog.id}
                className={styles.blogRightItem}
                target="_blank"
                rel="noopener noreferrer"
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
                <span className={styles.blogReadMore}>
                  Read More
                </span>
              </Link>
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

