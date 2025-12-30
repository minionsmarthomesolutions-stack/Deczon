'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'


export interface WishlistItem {
    id: string
    name: string
    slug?: string
    imageUrl?: string
    primaryImageUrl?: string
    currentPrice?: number
    originalPrice?: number
    discountPercent?: number
    category?: string
    brand?: string
}

interface WishlistContextType {
    wishlistItems: WishlistItem[]
    addToWishlist: (item: WishlistItem) => void
    removeFromWishlist: (itemId: string) => void
    isInWishlist: (itemId: string) => boolean
    clearWishlist: () => void
    count: number
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined)

export const WishlistProvider = ({ children }: { children: ReactNode }) => {
    const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([])
    const [isLoaded, setIsLoaded] = useState(false)

    // Load from localStorage on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedWishlist = localStorage.getItem('wishlist')
            if (savedWishlist) {
                try {
                    setWishlistItems(JSON.parse(savedWishlist))
                } catch (error) {
                    console.error('Error parsing wishlist from localStorage', error)
                }
            }
            setIsLoaded(true)
        }
    }, [])

    // Save to localStorage whenever wishlistItems changes
    useEffect(() => {
        if (isLoaded && typeof window !== 'undefined') {
            localStorage.setItem('wishlist', JSON.stringify(wishlistItems))
        }
    }, [wishlistItems, isLoaded])

    const addToWishlist = (item: WishlistItem) => {
        if (!isInWishlist(item.id)) {
            setWishlistItems((prev) => [...prev, item])
            // Dispatch event for other components to listen if needed
            window.dispatchEvent(new Event('wishlistUpdated'))

            // Use toast if available, otherwise just console or silent
            // Assuming no global toast setup visible yet, but adding simple feedback
            // console.log('Added to wishlist:', item.name)
        }
    }

    const removeFromWishlist = (itemId: string) => {
        setWishlistItems((prev) => prev.filter((item) => item.id !== itemId))
        window.dispatchEvent(new Event('wishlistUpdated'))
    }

    const isInWishlist = (itemId: string) => {
        return wishlistItems.some((item) => item.id === itemId)
    }

    const clearWishlist = () => {
        setWishlistItems([])
        window.dispatchEvent(new Event('wishlistUpdated'))
    }

    return (
        <WishlistContext.Provider
            value={{
                wishlistItems,
                addToWishlist,
                removeFromWishlist,
                isInWishlist,
                clearWishlist,
                count: wishlistItems.length
            }}
        >
            {children}
        </WishlistContext.Provider>
    )
}

export const useWishlist = () => {
    const context = useContext(WishlistContext)
    if (context === undefined) {
        throw new Error('useWishlist must be used within a WishlistProvider')
    }
    return context
}
