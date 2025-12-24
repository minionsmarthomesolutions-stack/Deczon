import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');

    if (!lat || !lng) {
        return NextResponse.json({ error: 'Latitude and longitude are required' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
        return NextResponse.json({ error: 'Server configuration error: API Key missing' }, { status: 500 });
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;

    try {
        const res = await fetch(url);
        const data = await res.json();

        if (data.status !== 'OK') {
            const errorMessage = data.error_message || data.status;
            console.error('Google Geocoding API Error:', errorMessage);

            // Handle specific case where "ZERO_RESULTS" is returned (not an error, just no address found)
            if (data.status === 'ZERO_RESULTS') {
                return NextResponse.json({ results: [] });
            }

            return NextResponse.json({ error: errorMessage }, { status: 400 });
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Geocoding fetch error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
