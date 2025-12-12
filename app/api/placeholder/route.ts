import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const height = parseInt(searchParams.get('height') || '200', 10)
  const width = parseInt(searchParams.get('width') || '200', 10)
  const text = decodeURIComponent(searchParams.get('text') || 'Image')

  // Generate SVG placeholder
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#f3f4f6"/>
  <text 
    x="50%" 
    y="50%" 
    font-family="Arial, sans-serif" 
    font-size="${Math.min(width, height) / 8}" 
    fill="#9ca3af" 
    text-anchor="middle" 
    dominant-baseline="middle"
  >${text}</text>
</svg>`

  return new NextResponse(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}

