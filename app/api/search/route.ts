import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export async function GET(request: Request) {
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ products: [], services: [], blogs: [] }, { status: 200 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query) {
      return NextResponse.json({ products: [], services: [], blogs: [] })
    }

    const db = createClient(supabaseUrl, supabaseKey, {
      global: {
        fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' })
      }
    })
    const searchTerm = `%${query}%`

    // Execute queries concurrently
    const [productsResult, servicesResult, blogsResult] = await Promise.all([
      db.from('products')
        .select('*')
        .or(`document->>name.ilike.${searchTerm},document->>description.ilike.${searchTerm},document->>category.ilike.${searchTerm},document->>mainCategory.ilike.${searchTerm}`)
        .limit(20),

      db.from('services')
        .select('*')
        .or(`document->>name.ilike.${searchTerm},document->>description.ilike.${searchTerm},document->>category.ilike.${searchTerm}`)
        .limit(20),

      db.from('blogs')
        .select('*')
        .or(`document->>title.ilike.${searchTerm},document->>excerpt.ilike.${searchTerm},document->>category.ilike.${searchTerm}`)
        .limit(10)
    ])

    const products = (productsResult.data || []).map((row: any) => {
      const doc = row.document || {}
      return { id: row.id, ...doc }
    }).filter((p: any) => {
      const str = JSON.stringify(p);
      return !str.includes('firebasestorage.googleapis.com') && !str.includes('storage.googleapis.com');
    })

    const services = (servicesResult.data || []).map((row: any) => {
      const doc = row.document || {}
      return { id: row.id, ...doc }
    }).filter((s: any) => {
      const str = JSON.stringify(s);
      return !str.includes('firebasestorage.googleapis.com') && !str.includes('storage.googleapis.com');
    })

    const blogs = (blogsResult.data || []).map((row: any) => {
      const doc = row.document || {}
      const id = row.id || doc.id || ''
      return { id, ...doc }
    })

    return NextResponse.json({ products, services, blogs })
  } catch (err: any) {
    console.error('[/api/search]', err?.message || err)
    return NextResponse.json({ products: [], services: [], blogs: [] }, { status: 500 })
  }
}
