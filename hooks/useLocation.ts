'use client'

import { useState, useEffect } from 'react'
import { auth, db } from '@/lib/firebase'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { onAuthStateChanged, User } from 'firebase/auth'

export interface LocationData {
    doorNo?: string
    street?: string
    area?: string
    city: string
    state: string
    pincode: string
    formatted_address: string
    lat?: number
    lng?: number
    id?: string // For Firestore document ID if needed, though we usually store one per user
}

const STORAGE_KEY = 'user_location_v2'

export const useLocation = () => {
    const [location, setLocation] = useState<LocationData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [user, setUser] = useState<User | null>(null)

    useEffect(() => {
        // 1. Load from LocalStorage immediately
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(STORAGE_KEY)
            if (saved) {
                try {
                    setLocation(JSON.parse(saved))
                } catch (e) {
                    console.error('Error parsing saved location', e)
                }
            }
            setLoading(false)
        }

        // 2. Listen for Auth State
        let unsubscribeAuth = () => { }

        if (auth && db) {
            unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
                setUser(currentUser)
                if (currentUser && db) {
                    // Fetch from Firestore
                    try {
                        const docRef = doc(db, 'users', currentUser.uid, 'settings', 'location')
                        const snap = await getDoc(docRef)
                        if (snap.exists()) {
                            const remoteLoc = snap.data() as LocationData
                            setLocation(remoteLoc)
                            // Update local storage to match
                            localStorage.setItem(STORAGE_KEY, JSON.stringify(remoteLoc))
                            window.dispatchEvent(new Event('locationUpdated'))
                        }
                    } catch (err) {
                        console.warn('Failed to fetch location from Firestore', err)
                    }
                }
            })
        }

        // 3. Listen for Storage/Event Updates (Cross-component sync)
        const handleLocationUpdate = () => {
            const saved = localStorage.getItem(STORAGE_KEY)
            if (saved) {
                try {
                    setLocation(JSON.parse(saved))
                } catch (e) {
                    // ignore
                }
            }
        }
        window.addEventListener('locationUpdated', handleLocationUpdate)

        return () => {
            unsubscribeAuth()
            window.removeEventListener('locationUpdated', handleLocationUpdate)
        }
    }, [])

    const saveLocation = async (newLocation: LocationData) => {
        try {
            // 1. Update State
            setLocation(newLocation)

            // 2. Update LocalStorage
            if (typeof window !== 'undefined') {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(newLocation))
                // Dispatch event for other components to react immediately if they aren't using this hook
                window.dispatchEvent(new Event('locationUpdated')) // Keep compatibility with existing event structure if possible
            }

            // 3. Update Firestore if logged in
            if (user && db) {
                const docRef = doc(db, 'users', user.uid, 'settings', 'location')
                await setDoc(docRef, newLocation, { merge: true })
            }
        } catch (err: any) {
            console.error('Error saving location', err)
            setError(err.message || 'Failed to save location')
        }
    }

    // Geocoding function using Internal API Proxy (avoids exposing key and CORS/Referer issues)
    const reverseGeocodeGoogle = async (lat: number, lng: number): Promise<LocationData> => {
        const url = `/api/geocode?lat=${lat}&lng=${lng}`

        try {
            const res = await fetch(url)
            const data = await res.json()

            if (data.error) {
                throw new Error(data.error)
            }

            if (!data.results || data.results.length === 0) {
                throw new Error('No address found for this location')
            }

            const result = data.results[0]
            const addressComponents = result.address_components

            let street = ''
            let area = ''
            let city = ''
            let state = ''
            let pincode = ''

            // Extract address components
            addressComponents.forEach((comp: any) => {
                const types = comp.types
                if (types.includes('street_number')) {
                    street += comp.long_name
                }
                if (types.includes('route')) {
                    street += (street ? ' ' : '') + comp.long_name
                }
                if (types.includes('sublocality') || types.includes('sublocality_level_1')) {
                    area = comp.long_name
                }
                if (types.includes('locality')) {
                    city = comp.long_name
                }
                if (types.includes('administrative_area_level_1')) {
                    state = comp.long_name
                }
                if (types.includes('postal_code')) {
                    pincode = comp.long_name
                }
            })

            return {
                formatted_address: result.formatted_address,
                street,
                area,
                city,
                state,
                pincode,
                lat,
                lng
            }
        } catch (err) {
            console.error('Geocoding error:', err)
            throw err
        }
    }

    const detectLocation = async (): Promise<LocationData> => {
        const getPosition = (options: PositionOptions): Promise<GeolocationPosition> => {
            return new Promise((resolve, reject) => {
                if (!navigator.geolocation) {
                    reject(new Error('Geolocation is not supported by your browser'))
                    return
                }
                navigator.geolocation.getCurrentPosition(resolve, reject, options)
            })
        }

        try {
            // Attempt 1: High Accuracy with 15s timeout
            try {
                const position = await getPosition({
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 0
                })
                const { latitude, longitude } = position.coords
                return await reverseGeocodeGoogle(latitude, longitude)
            } catch (err: any) {
                // If permission denied, don't retry. Otherwise, retry with low accuracy.
                if (err.code === 1) { // 1 is PERMISSION_DENIED
                    throw new Error('Location permission denied')
                }

                // Attempt 2: Low Accuracy (fallback)
                console.warn('High accuracy location failed, retrying with low accuracy...', err)
                const position = await getPosition({
                    enableHighAccuracy: false,
                    timeout: 20000,
                    maximumAge: 0
                })
                const { latitude, longitude } = position.coords
                return await reverseGeocodeGoogle(latitude, longitude)
            }
        } catch (err: any) {
            console.error("Geolocation error final catch:", err)
            let msg = 'Failed to retrieve location'

            // Check if it's the specific Google API error and pass it through
            if (err.message && err.message.includes('API keys with referer restrictions')) {
                throw new Error('Server Config Error: Google Maps API Key has incompatible restrictions. Please use an IP-restricted key.')
            }

            if (err.code === 1) msg = 'Location permission denied. Please enable location access.'
            if (err.code === 2) msg = 'Location unavailable. Please try manual entry.'
            if (err.code === 3) msg = 'Location request timed out. Please try manual entry.'
            if (err.message) msg = err.message

            throw new Error(msg)
        }
    }

    return {
        location,
        loading,
        error,
        saveLocation,
        detectLocation
    }
}
