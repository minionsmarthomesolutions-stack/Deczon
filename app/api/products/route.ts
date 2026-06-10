import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export async function GET() {
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json([], { status: 200 })
  }
  try {
    const db = createClient(supabaseUrl, supabaseKey, {
      global: {
        fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' })
      }
    })
    const { data, error } = await db.from('products').select('*')
    if (error) throw error
    const products = (data || []).map((row: any) => {
      const doc = row.document || {}
      const id = row.id || doc.id || ''
      const { id: _ignored, ...rest } = doc
      return { id, ...rest }
    }).filter((p: any) => {
      const str = JSON.stringify(p);
      return !str.includes('firebasestorage.googleapis.com') && !str.includes('storage.googleapis.com');
    })
    
    // IF products length is 0, return debug info so we can see what's wrong from the curl output
    if (products.length === 0) {
      return NextResponse.json({ 
        debug: true, 
        dataLength: data?.length, 
        supabaseUrl: supabaseUrl, 
        error: error 
      })
    }
    
    console.log(`[Products API] Fetched ${data?.length || 0} from DB, returning ${products.length} after filter`);
    return NextResponse.json(products)
  } catch (err: any) {
    console.error('[/api/products]', err?.message || err)
    return NextResponse.json({ error: err?.message || err.toString() }, { status: 500 })
  }
}
