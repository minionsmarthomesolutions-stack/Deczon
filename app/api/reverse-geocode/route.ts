import { NextResponse } from 'next/server';

/**
 * Proxy for Nominatim Reverse Geocoding
 * 
 * Usage: GET /api/reverse-geocode?lat=12.9716&lon=77.5946
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');

    if (!lat || !lon) {
        return NextResponse.json({ error: 'Missing lat or lon parameters' }, { status: 400 });
    }

    try {
        // Forward request to Nominatim
        // In production, you could cache this response (e.g., Redis) to save API calls
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`;

        const res = await fetch(url, {
            headers: {
                'User-Agent': 'DeczonECom/1.0 (contact@deczon.com)' // Replace with real info
            }
        });

        if (!res.ok) {
            throw new Error(`Nominatim API replied with ${res.status}`);
        }

        const data = await res.json();

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Reverse geocode proxy error:', error);
        return NextResponse.json({ error: error.message }, { status: 502 });
    }
}
