import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export async function GET() {
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json([], { status: 200 })
  }
  try {
    const db = createClient(supabaseUrl, supabaseKey)
    const { data, error } = await db.from('blogs').select('*')
    if (error) throw error
    const blogs = (data || []).map((row: any) => ({ id: row.id, ...(row.document || {}) }))
    return NextResponse.json(blogs)
  } catch (err: any) {
    console.error('[/api/blogs]', err?.message || err)
    return NextResponse.json([])
  }
}
