'use client'

import React from 'react'
import Link from 'next/link'
import { useWishlist } from '@/context/WishlistContext'
import ProductCard from '@/components/ProductCard'
import styles from './wishlist.module.css'

export default function WishlistPage() {
    const { wishlistItems } = useWishlist()

    if (wishlistItems.length === 0) {
        return (
            <div className={styles.wishlistPage}>
                <div className={styles.header}>
                    <h1 className={styles.title}>My Wishlist</h1>
                </div>
                <div className={styles.emptyState}>
                    <svg
                        className={styles.emptyIcon}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="1.5"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <h2 className={styles.emptyText}>Your wishlist is empty</h2>
                    <p className={styles.emptySubtext}>Start exploring our products and add your favorites here!</p>
                    <Link href="/products" className={styles.browseBtn}>
                        Browse Products
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className={styles.wishlistPage}>
            <div className={styles.header}>
                <h1 className={styles.title}>My Wishlist</h1>
                <p className={styles.subtitle}>{wishlistItems.length} items</p>
            </div>

            <div className={styles.grid}>
                {wishlistItems.map((item) => (
                    <ProductCard
                        key={item.id}
                        product={{
                            ...item,
                            // Ensure required props for ProductCard are present
                            images: item.imageUrl ? [item.imageUrl] : [],
                            primaryImageUrl: item.imageUrl || item.primaryImageUrl,
                        } as any}
                    />
                ))}
            </div>
        </div>
    )
}
