/**
 * Helper functions for geocoding using OpenStreetMap Nominatim.
 * 
 * > [!WARNING]
 * > Nominatim Usage Policy: https://operations.osmfoundation.org/policies/nominatim/
 * > - Maximum of 1 request per second.
 * > - Provide a valid User-Agent.
 * > - Do not use for bulk geocoding.
 * 
 * For production, consider switching to Google Maps Geocoding API or Mapbox.
 * 
 * To switch provider:
 * 1. Get an API Key from Google Cloud Platform or Mapbox.
 * 2. Update the fetch URL in reverseGeocodeNominatim and searchByPostalCode.
 */

// User-agent for Nominatim (required by their policy)
const USER_AGENT = 'DeczonECom/1.0 (contact@deczon.com)'; // Replace with real contact if possible

export interface Address {
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    postcode?: string;
    country?: string;
    display_name: string;
}

export interface GeocodeResult {
    lat: string;
    lon: string;
    display_name: string;
    address?: Address;
}

/**
 * Reverse geocode coordinates to address.
 * Uses local API proxy if available to avoid CORS/Rate-limiting from client,
 * or hits Nominatim directly if relative URL fails or configured to do so.
 */
export async function reverseGeocodeNominatim(lat: number, lon: number): Promise<any> {
    // Try using our own API route first to respect rate limits and keep logic server-side
    try {
        const res = await fetch(`/api/reverse-geocode?lat=${lat}&lon=${lon}`);
        if (res.ok) {
            return await res.json();
        }
    } catch (e) {
        // API route might not be ready, fall back to direct call
        console.warn('Backend geocode proxy failed, falling back to direct Nominatim call', e);
    }

    // Direct fallback (Client-side)
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`;
    const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT }
    });

    if (!res.ok) {
        throw new Error('Reverse geocode failed');
    }

    return await res.json();
}

/**
 * Search for a location by query (pincode, city, address).
 * @param query Search string
 */
export async function searchByPostalCode(query: string): Promise<GeocodeResult[]> {
    const q = encodeURIComponent(query);
    const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=8&q=${q}&countrycodes=in`;

    const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT }
    });

    if (!res.ok) {
        throw new Error('Search failed');
    }

    return await res.json();
}
