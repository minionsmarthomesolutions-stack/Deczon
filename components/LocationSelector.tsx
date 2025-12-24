'use client'

import React, { useState } from 'react';
import { useLocation } from '@/hooks/useLocation';
import LocationModal from './LocationModal';
import '../styles/location-selector.css';

export default function LocationSelector() {
    const [open, setOpen] = useState(false);
    const { location } = useLocation();

    // Format display text
    const getDisplayText = () => {
        if (!location) return 'Chennai 600040'; // Default placeholder as requested

        // Prefer City + Pincode, fallback to State + Pincode, or just Pincode
        if (location.city && location.pincode) return `${location.city} ${location.pincode}`;
        if (location.area && location.pincode) return `${location.area} ${location.pincode}`;
        if (location.pincode) return `India ${location.pincode}`;

        return 'Select Location';
    }

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
                        {getDisplayText()}
                    </span>
                </div>
            </button>

            <LocationModal isOpen={open} onClose={() => setOpen(false)} />
        </>
    );
}
