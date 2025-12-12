'use client';

import React, { useState, useEffect, useRef } from 'react';
import { getBrowserLocation } from '../lib/geolocation';
import { reverseGeocodeNominatim, searchByPostalCode, GeocodeResult } from '../lib/geocode';
import '../styles/location-selector.css';

interface UserLocation {
    lat: number;
    lon: number;
    address: string;
    city: string;
    state: string;
    pincode: string;
    display_name: string;
    detectedAt?: string;
}

export default function LocationSelector() {
    const [open, setOpen] = useState(false);
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');
    const [location, setLocation] = useState<UserLocation | null>(null);
    const [manualQuery, setManualQuery] = useState('');
    const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const modalRef = useRef<HTMLDivElement>(null);
    const firstInputRef = useRef<HTMLButtonElement>(null);

    // Load saved location on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('user_location_v1');
            if (saved) {
                try {
                    setLocation(JSON.parse(saved));
                } catch (e) {
                    console.error('Failed to parse saved location', e);
                }
            }
        }
    }, []);

    // Save location to localStorage and optionally server
    const saveLocation = async (loc: UserLocation) => {
        setLocation(loc);
        localStorage.setItem('user_location_v1', JSON.stringify({ ...loc, detectedAt: new Date().toISOString() }));

        // Dispatch event for other components (like Header) to react
        window.dispatchEvent(new Event('locationUpdated'));

        // Optional server sync
        try {
            await fetch('/api/user-location', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(loc),
            });
        } catch (e) {
            // Ignore server error, not critical
        }

        setOpen(false);
        setStatus('idle');
        setSuggestions([]);
        setManualQuery('');
    };

    const handleDetect = async () => {
        setStatus('loading');
        setErrorMsg('');
        try {
            const { lat, lon } = await getBrowserLocation();
            const data = await reverseGeocodeNominatim(lat, lon);

            const loc: UserLocation = {
                lat,
                lon,
                display_name: data.display_name,
                address: data.address?.road || '',
                city: data.address?.city || data.address?.town || data.address?.village || '',
                state: data.address?.state || '',
                pincode: data.address?.postcode || '',
            };

            await saveLocation(loc);
            setStatus('success');
        } catch (err: any) {
            console.error(err);
            setStatus('error');
            if (err.message === 'Geolocation not supported') {
                setErrorMsg('Browser location not supported. Please enter manually.');
            } else if (err.code === 1) { // PERMISSION_DENIED
                setErrorMsg('Permission denied. Please enable location or search manually.');
            } else if (err.code === 3) { // TIMEOUT
                setErrorMsg('Location timed out. Please try again or search manually.');
            } else {
                setErrorMsg('Failed to detect location. Please try searching manually.');
            }
        }
    };

    const handleManualSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualQuery.trim()) return;

        setIsSearching(true);
        setErrorMsg('');
        setSuggestions([]);

        try {
            const results = await searchByPostalCode(manualQuery);
            if (results && results.length > 0) {
                setSuggestions(results);
            } else {
                setErrorMsg('No results found. Try a different pincode or city.');
            }
        } catch (e) {
            setErrorMsg('Search failed. Please try again.');
        } finally {
            setIsSearching(false);
        }
    };

    const selectSuggestion = async (item: GeocodeResult) => {
        const loc: UserLocation = {
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
            display_name: item.display_name,
            address: item.address?.road || '',
            city: item.address?.city || item.address?.town || item.address?.village || '',
            state: item.address?.state || '',
            pincode: item.address?.postcode || '',
        };
        await saveLocation(loc);
    };

    // Keyboard trap for accessibility
    useEffect(() => {
        if (open && firstInputRef.current) {
            firstInputRef.current.focus();
        }
    }, [open]);

    // Close on Escape or click outside
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    return (
        <>
            <button
                className="lg-loc-trigger-btn"
                onClick={() => setOpen(true)}
                aria-label="Change Location"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                </svg>
                <div className="lg-loc-trigger-text">
                    <span className="lg-loc-trigger-label">Delivering to</span>
                    <span className="lg-loc-trigger-value">
                        {location ? (location.pincode || location.city || 'Combined Address') : 'Select Location'}
                    </span>
                </div>
            </button>

            {open && (
                <div className="lg-loc-overlay" onClick={() => setOpen(false)}>
                    <div
                        className="lg-loc-modal"
                        role="dialog"
                        aria-modal="true"
                        ref={modalRef}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="lg-loc-header">
                            <h3 className="lg-loc-title">Select Location</h3>
                            <button className="lg-loc-close-btn" onClick={() => setOpen(false)} aria-label="Close">
                                &times;
                            </button>
                        </div>

                        <div className="lg-loc-body">
                            {/* Detect Button */}
                            <div className="lg-loc-detect-section">
                                <button
                                    ref={firstInputRef}
                                    className="lg-loc-detect-btn"
                                    onClick={handleDetect}
                                    disabled={status === 'loading'}
                                >
                                    {status === 'loading' ? (
                                        <>
                                            <div className="lg-loc-spinner" aria-hidden="true" />
                                            <span>Detecting...</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" />
                                                <circle cx="12" cy="10" r="3" />
                                            </svg>
                                            <span>Detect my location</span>
                                        </>
                                    )}
                                </button>
                                <div role="status" aria-live="polite">
                                    {status === 'error' && <div className="lg-loc-status error">{errorMsg}</div>}
                                    {status === 'success' && <div className="lg-loc-status success">Location detected successfully!</div>}
                                </div>
                            </div>

                            <div className="lg-loc-divider">
                                <span>OR</span>
                            </div>

                            {/* Manual Search */}
                            <form onSubmit={handleManualSearch} className="lg-loc-search-box">
                                <input
                                    type="text"
                                    className="lg-loc-input"
                                    placeholder="Enter Pincode or City"
                                    value={manualQuery}
                                    onChange={(e) => setManualQuery(e.target.value)}
                                    aria-label="Enter pincode or city to search"
                                />
                                <button type="button" className="lg-loc-search-btn" onClick={handleManualSearch} disabled={isSearching}>
                                    {isSearching ? '...' : 'Check'}
                                </button>
                            </form>

                            {/* Search Results */}
                            {suggestions.length > 0 && (
                                <div className="lg-loc-results">
                                    {suggestions.map((item, idx) => (
                                        <div
                                            key={idx}
                                            className="lg-loc-result-item"
                                            onClick={() => selectSuggestion(item)}
                                        >
                                            <div className="lg-loc-result-title">
                                                {item.address?.postcode || item.address?.city}
                                            </div>
                                            <div className="lg-loc-result-desc">{item.display_name}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
