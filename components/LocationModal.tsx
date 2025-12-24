'use client'
import React, { useState, useEffect } from 'react'
import { useLocation, LocationData } from '@/hooks/useLocation'
import styles from '@/styles/LocationModal.module.css'

interface LocationModalProps {
    onClose: () => void
    isOpen: boolean
}

export default function LocationModal({ onClose, isOpen }: LocationModalProps) {
    const { detectLocation, saveLocation } = useLocation()

    const [view, setView] = useState<'initial' | 'manual' | 'confirm' | 'loading'>('initial')
    const [tempLocation, setTempLocation] = useState<LocationData | null>(null)
    const [errorMsg, setErrorMsg] = useState('')

    // Manual Entry Form State
    const [formData, setFormData] = useState({
        doorNo: '',
        street: '',
        area: '',
        city: '',
        state: '',
        pincode: ''
    })

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setView('initial')
            setErrorMsg('')
        }
    }, [isOpen])

    const handleDetect = async () => {
        setView('loading')
        setErrorMsg('')
        try {
            const detected = await detectLocation()
            setTempLocation(detected)
            setFormData({
                doorNo: detected.doorNo || '',
                street: detected.street || '',
                area: detected.area || '',
                city: detected.city || '',
                state: detected.state || '',
                pincode: detected.pincode || ''
            })
            setView('confirm')
        } catch (err: any) {
            console.error(err)
            setErrorMsg(err.message || 'Failed to detect location')
            setView('initial')
        }
    }

    const handleManualEntry = () => {
        setView('manual')
        setErrorMsg('')
    }

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        })
    }

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.pincode || formData.pincode.length !== 6) {
            setErrorMsg('Please enter a valid 6-digit Pincode')
            return
        }
        // Construct location object
        const manualLoc: LocationData = {
            doorNo: formData.doorNo,
            street: formData.street,
            area: formData.area,
            city: formData.city,
            state: formData.state,
            pincode: formData.pincode,
            formatted_address: `${formData.doorNo ? formData.doorNo + ', ' : ''}${formData.street ? formData.street + ', ' : ''}${formData.area ? formData.area + ', ' : ''}${formData.city}, ${formData.state} - ${formData.pincode}`
        }
        setTempLocation(manualLoc)
        setView('confirm')
    }

    const handleConfirm = async () => {
        if (tempLocation) {
            await saveLocation(tempLocation)
            onClose()
        }
    }

    if (!isOpen) return null

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className={styles.header}>
                    <h3 className={styles.title}>
                        {view === 'confirm' ? 'Confirm Location' : 'Select Location'}
                    </h3>
                    <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
                        &times;
                    </button>
                </div>

                {/* Body */}
                <div className={styles.body}>

                    {/* Initial View */}
                    {view === 'initial' && (
                        <>
                            <div className={styles.detectSection}>
                                <button className={styles.detectBtn} onClick={handleDetect}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" />
                                        <circle cx="12" cy="10" r="3" />
                                    </svg>
                                    Use Current Location
                                </button>
                                {errorMsg && <p style={{ color: 'red', fontSize: '12px', marginTop: '8px', textAlign: 'center' }}>{errorMsg}</p>}
                            </div>

                            <div className={styles.orDivider}>
                                <span>OR</span>
                            </div>

                            <div className={styles.manualSection}>
                                <button
                                    className={styles.changeBtn}
                                    style={{ width: '100%', border: '1px solid #ddd' }}
                                    onClick={handleManualEntry}
                                >
                                    Enter Address Manually
                                </button>
                            </div>
                        </>
                    )}

                    {/* Loading View */}
                    {view === 'loading' && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0' }}>
                            <div className={styles.spinner}></div>
                            <p style={{ marginTop: '16px', color: '#666' }}>Fetching your location...</p>
                        </div>
                    )}

                    {/* Manual Entry Form */}
                    {view === 'manual' && (
                        <form onSubmit={handleManualSubmit}>
                            <div className={styles.inputRow}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Door No / Flat</label>
                                    <input
                                        name="doorNo"
                                        value={formData.doorNo}
                                        onChange={handleFormChange}
                                        className={styles.input}
                                        placeholder="e.g. 404"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Pincode *</label>
                                    <input
                                        name="pincode"
                                        value={formData.pincode}
                                        onChange={handleFormChange}
                                        className={styles.input}
                                        placeholder="600040"
                                        maxLength={6}
                                        required
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Street / Road</label>
                                <input
                                    name="street"
                                    value={formData.street}
                                    onChange={handleFormChange}
                                    className={styles.input}
                                    placeholder="e.g. Anna Salai"
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Area / Locality</label>
                                <input
                                    name="area"
                                    value={formData.area}
                                    onChange={handleFormChange}
                                    className={styles.input}
                                    placeholder="e.g. Anna Nagar"
                                />
                            </div>

                            <div className={styles.inputRow}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>City</label>
                                    <input
                                        name="city"
                                        value={formData.city}
                                        onChange={handleFormChange}
                                        className={styles.input}
                                        placeholder="Chennai"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>State</label>
                                    <input
                                        name="state"
                                        value={formData.state}
                                        onChange={handleFormChange}
                                        className={styles.input}
                                        placeholder="Tamil Nadu"
                                    />
                                </div>
                            </div>

                            {errorMsg && <p style={{ color: 'red', fontSize: '13px', marginBottom: '12px' }}>{errorMsg}</p>}

                            <button type="submit" className={styles.saveBtn}>Check Validity</button>
                            <button
                                type="button"
                                onClick={() => setView('initial')}
                                style={{ width: '100%', padding: '12px', background: 'none', border: 'none', color: '#666', marginTop: '8px', cursor: 'pointer', fontSize: '14px' }}
                            >
                                Back
                            </button>
                        </form>
                    )}

                    {/* Confirmation View */}
                    {view === 'confirm' && tempLocation && (
                        <div>
                            <div className={styles.addressCard}>
                                <span className={styles.addressLabel}>Delivering to:</span>
                                <div className={styles.addressText}>
                                    {tempLocation.doorNo ? tempLocation.doorNo + ', ' : ''}
                                    {tempLocation.street ? tempLocation.street + ', ' : ''}
                                    {tempLocation.area ? tempLocation.area + ', ' : ''}
                                    <br />
                                    {tempLocation.city}, {tempLocation.state} – {tempLocation.pincode}
                                </div>
                                <div className={styles.cardActions}>
                                    <button className={styles.changeBtn} onClick={() => setView('manual')}>Change</button>
                                    <button className={styles.confirmBtn} onClick={handleConfirm}>Confirm Location</button>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    )
}
