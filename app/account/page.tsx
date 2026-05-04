'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getAuthInstance } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import styles from './account.module.css'

interface LocationData {
    doorNo?: string
    street?: string
    area?: string
    city: string
    state: string
    pincode: string
    id?: string
    isDefault?: boolean
    type?: 'home' | 'work' | 'other'
}

export default function AccountPage() {
    const router = useRouter()
    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [userId, setUserId] = useState<string | null>(null) // Phone number as ID

    // Profile State
    const [profile, setProfile] = useState({
        name: '',
        email: '',
        phone: '',
    })
    const [savingProfile, setSavingProfile] = useState(false)

    // Address State
    const [addresses, setAddresses] = useState<LocationData[]>([])
    const [showAddressForm, setShowAddressForm] = useState(false)
    const [editingAddress, setEditingAddress] = useState<LocationData | null>(null)
    const [addressForm, setAddressForm] = useState<LocationData>({
        doorNo: '',
        street: '',
        area: '',
        city: '',
        state: '',
        pincode: '',
        type: 'home',
        isDefault: false
    })

    useEffect(() => {
        const auth = getAuthInstance()
        const unsubscribe = auth ? onAuthStateChanged(auth, async (currentUser: any) => {
            if (currentUser) {
                setUser(currentUser)

                // Determine User ID (Phone Number)
                const phone = currentUser.phoneNumber?.replace('+91', '') || 
                    (typeof window !== 'undefined' ? localStorage.getItem('userPhone') : '')
                setUserId(phone)
                setProfile(prev => ({ ...prev, phone: phone || '' }))

                if (phone) {
                    // Fetch User Data from Supabase
                    try {
                        const { data: userDoc } = await supabase.from('users').select('*').eq('id', phone).maybeSingle()

                        if (userDoc && userDoc.document) {
                            const data = userDoc.document
                            setProfile(prev => ({
                                ...prev,
                                name: data.name || currentUser.displayName || '',
                                email: data.email || currentUser.email || '',
                            }))
                        } else {
                            // Initialize user doc if not exists
                            setProfile(prev => ({
                                ...prev,
                                name: currentUser.displayName || '',
                                email: currentUser.email || '',
                            }))
                        }

                        // Fetch Addresses
                        fetchAddresses(phone)
                    } catch (err) {
                        console.error("Error fetching user data", err)
                    }
                }
            } else {
                router.push('/login')
            }
            setLoading(false)
        }) : () => {}

        return () => unsubscribe()
    }, [router])

    const fetchAddresses = async (phone: string) => {
        try {
            const { data: userDoc } = await supabase.from('users').select('*').eq('id', phone).maybeSingle()
            if (userDoc && userDoc.document && Array.isArray(userDoc.document.addresses)) {
                setAddresses(userDoc.document.addresses)
            } else {
                setAddresses([])
            }
        } catch (err) {
            console.error("Error fetching addresses", err)
        }
    }

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!userId) return

        setSavingProfile(true)
        try {
            const { data: userDoc } = await supabase.from('users').select('*').eq('id', userId).maybeSingle()
            const currentDoc = userDoc?.document || {}
            
            await supabase.from('users').upsert({
                id: userId,
                document: {
                    ...currentDoc,
                    name: profile.name,
                    email: profile.email,
                    phone: profile.phone,
                    updatedAt: new Date().toISOString()
                }
            })
            alert('Profile updated successfully!')
        } catch (err) {
            console.error("Error updating profile", err)
            alert('Failed to update profile.')
        } finally {
            setSavingProfile(false)
        }
    }

    const handleAddressSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!userId) return

        try {
            const addrData = { ...addressForm }
            const { id, ...dataToSave } = addrData as any

            const { data: userDoc } = await supabase.from('users').select('*').eq('id', userId).maybeSingle()
            const currentDoc = userDoc?.document || {}
            let currentAddresses: any[] = currentDoc.addresses || []

            if (editingAddress?.id) {
                // Update
                currentAddresses = currentAddresses.map(addr => addr.id === editingAddress.id ? { id: editingAddress.id, ...dataToSave } : addr)
            } else {
                // Create
                const newId = Date.now().toString()
                currentAddresses.push({ id: newId, ...dataToSave })
            }

            await supabase.from('users').upsert({
                id: userId,
                document: { ...currentDoc, addresses: currentAddresses }
            })

            setAddressForm({
                doorNo: '', street: '', area: '', city: '', state: '', pincode: '', type: 'home', isDefault: false
            })
            setShowAddressForm(false)
            setEditingAddress(null)
            fetchAddresses(userId)
        } catch (err) {
            console.error("Error saving address", err)
            alert("Failed to save address")
        }
    }

    const handleDeleteAddress = async (id: string) => {
        if (!userId || !confirm('Are you sure you want to delete this address?')) return
        try {
            const { data: userDoc } = await supabase.from('users').select('*').eq('id', userId).maybeSingle()
            const currentDoc = userDoc?.document || {}
            let currentAddresses: any[] = currentDoc.addresses || []
            currentAddresses = currentAddresses.filter(addr => addr.id !== id)

            await supabase.from('users').upsert({
                id: userId,
                document: { ...currentDoc, addresses: currentAddresses }
            })
            fetchAddresses(userId)
        } catch (err) {
            console.error("Failed to delete", err)
        }
    }

    const handleSetDefault = async (id: string) => {
        if (!userId) return;
        
        try {
            const { data: userDoc } = await supabase.from('users').select('*').eq('id', userId).maybeSingle()
            const currentDoc = userDoc?.document || {}
            let currentAddresses: any[] = currentDoc.addresses || []
            
            currentAddresses = currentAddresses.map(addr => ({
                ...addr,
                isDefault: addr.id === id
            }))

            await supabase.from('users').upsert({
                id: userId,
                document: { ...currentDoc, addresses: currentAddresses }
            })
            fetchAddresses(userId)
        } catch (err) {
            console.error("Failed to set default", err)
        }
    }

    const editAddr = (addr: LocationData) => {
        setEditingAddress(addr)
        setAddressForm(addr)
        setShowAddressForm(true)
    }

    if (loading) return <div className={styles.container}>Loading...</div>

    return (
        <div className={styles.accountPage}>
            <div className={styles.container}>
                <div className={styles.header}>
                    <h1>My Account</h1>
                    <p style={{ color: '#666' }}>Manage your profile and addresses</p>
                </div>

                <div className={styles.grid}>
                    {/* Profile Section */}
                    <div>
                        <div className={styles.card}>
                            <div className={styles.cardHeader}>
                                <h2 className={styles.cardTitle}>Profile Information</h2>
                            </div>
                            <form onSubmit={handleProfileUpdate}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Full Name</label>
                                    <input
                                        className={styles.input}
                                        value={profile.name}
                                        onChange={e => setProfile({ ...profile, name: e.target.value })}
                                        placeholder="Enter your name"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Email Address</label>
                                    <input
                                        className={styles.input}
                                        type="email"
                                        value={profile.email}
                                        onChange={e => setProfile({ ...profile, email: e.target.value })}
                                        placeholder="Enter your email"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Mobile Number</label>
                                    <input
                                        className={styles.input}
                                        value={profile.phone}
                                        disabled
                                        title="Mobile number cannot be changed"
                                    />
                                </div>
                                <button type="submit" className={styles.saveBtn} disabled={savingProfile}>
                                    {savingProfile ? 'Saving...' : 'Save Changes'}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Address Management Section */}
                    <div>
                        <div className={styles.card}>
                            <div className={styles.cardHeader}>
                                <h2 className={styles.cardTitle}>Saved Addresses</h2>
                                {!showAddressForm && (
                                    <button
                                        className={styles.saveBtn}
                                        style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                                        onClick={() => {
                                            setEditingAddress(null)
                                            setAddressForm({
                                                doorNo: '', street: '', area: '', city: '', state: '', pincode: '', type: 'home', isDefault: false
                                            })
                                            setShowAddressForm(true)
                                        }}
                                    >
                                        + Add Address
                                    </button>
                                )}
                            </div>

                            {showAddressForm ? (
                                <form onSubmit={handleAddressSubmit}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div className={styles.formGroup}>
                                            <label className={styles.label}>Details (Door/Flat)</label>
                                            <input
                                                className={styles.input}
                                                value={addressForm.doorNo}
                                                onChange={e => setAddressForm({ ...addressForm, doorNo: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label className={styles.label}>Street</label>
                                            <input
                                                className={styles.input}
                                                value={addressForm.street}
                                                onChange={e => setAddressForm({ ...addressForm, street: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>Area/Locality</label>
                                        <input
                                            className={styles.input}
                                            value={addressForm.area}
                                            onChange={e => setAddressForm({ ...addressForm, area: e.target.value })}
                                        />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                        <div className={styles.formGroup}>
                                            <label className={styles.label}>City</label>
                                            <input
                                                className={styles.input}
                                                value={addressForm.city}
                                                onChange={e => setAddressForm({ ...addressForm, city: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label className={styles.label}>State</label>
                                            <input
                                                className={styles.input}
                                                value={addressForm.state}
                                                onChange={e => setAddressForm({ ...addressForm, state: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label className={styles.label}>Pincode</label>
                                            <input
                                                className={styles.input}
                                                value={addressForm.pincode}
                                                onChange={e => setAddressForm({ ...addressForm, pincode: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>Address Type</label>
                                        <div style={{ display: 'flex', gap: '1rem' }}>
                                            {['home', 'work', 'other'].map(type => (
                                                <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                                    <input
                                                        type="radio"
                                                        name="type"
                                                        checked={addressForm.type === type}
                                                        onChange={() => setAddressForm({ ...addressForm, type: type as any })}
                                                    />
                                                    <span style={{ textTransform: 'capitalize' }}>{type}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={addressForm.isDefault}
                                                onChange={e => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                                            />
                                            <span>Set as Default Address</span>
                                        </label>
                                    </div>

                                    <div className={styles.btnGroup}>
                                        <button type="button" className={styles.cancelBtn} onClick={() => setShowAddressForm(false)}>Cancel</button>
                                        <button type="submit" className={styles.saveBtn}>Save Address</button>
                                    </div>
                                </form>
                            ) : (
                                <div className={styles.addressList}>
                                    {addresses.length === 0 ? (
                                        <div className={styles.emptyState}>No addresses saved yet.</div>
                                    ) : (
                                        addresses.map(addr => (
                                            <div key={addr.id} className={`${styles.addressItem} ${addr.isDefault ? styles.default : ''}`}>
                                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                                                    <span className={styles.addressType}>{addr.type}</span>
                                                    {addr.isDefault && <span className={styles.defaultBadge}>DEFAULT</span>}
                                                </div>
                                                <div className={styles.addressContent}>
                                                    {[addr.doorNo, addr.street, addr.area].filter(Boolean).join(', ')} <br />
                                                    {[addr.city, addr.state].filter(Boolean).join(', ')} - {addr.pincode}
                                                </div>
                                                <div className={styles.addressActions}>
                                                    <button className={styles.actionBtn} onClick={() => editAddr(addr)}>Edit</button>
                                                    <button className={styles.actionBtn} onClick={() => handleDeleteAddress(addr.id!)}>Delete</button>
                                                    {!addr.isDefault && <button className={styles.actionBtn} onClick={() => handleSetDefault(addr.id!)}>Set Default</button>}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
