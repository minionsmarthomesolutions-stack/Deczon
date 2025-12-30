'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import Header from './Header'
import Footer from './Footer'
import { WishlistProvider } from '@/context/WishlistContext'

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/login'
  const [isInitialLoad, setIsInitialLoad] = useState(pathname === '/')

  // On home page, wait a bit before showing header/footer to let loader appear first
  useEffect(() => {
    if (pathname === '/') {
      const timer = setTimeout(() => {
        setIsInitialLoad(false)
      }, 100)
      return () => clearTimeout(timer)
    } else {
      setIsInitialLoad(false)
    }
  }, [pathname])

  if (isLoginPage) {
    return (
      <WishlistProvider>
        {children}
      </WishlistProvider>
    )
  }

  // On initial home page load, render children only (loader will be shown)
  if (isInitialLoad && pathname === '/') {
    return (
      <WishlistProvider>
        {children}
      </WishlistProvider>
    )
  }

  const hideCategoryNav = (pathname?.startsWith('/products/') && pathname.split('/').length > 2) ||
    (pathname?.startsWith('/services/') && pathname.split('/').length > 2) ||
    pathname?.startsWith('/show-all-blogs') ||
    pathname?.startsWith('/blog/') ||
    pathname?.startsWith('/package-details') ||
    pathname === '/cart'
  // Calculate header height: 80px base + 56px category nav (when visible)
  const headerHeight = hideCategoryNav ? 'var(--header-height)' : 'calc(var(--header-height) + var(--category-nav-height))'

  return (
    <WishlistProvider>
      <div className="page-wrapper" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header />
        <main style={{ flex: 1, paddingTop: headerHeight }}>
          {children}
        </main>
        <Footer />
      </div>
    </WishlistProvider>
  )
}

