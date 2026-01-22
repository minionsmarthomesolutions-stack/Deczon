import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // In a real app, you might save this to a user's profile in your database
        // For now, we'll just log it and return success

        // Example: 
        // const { lat, lon, address } = body;
        // await db.collection('user_locations').add({ ...body, timestamp: new Date() });

        return NextResponse.json({ success: true, message: 'Location saved on server' });
    } catch (error) {
        console.error('Error saving location:', error);
        return NextResponse.json({ success: false, error: 'Failed to save location' }, { status: 500 });
    }
}
