import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

function normalizeSubcategory(value: any): { items: string[]; children: Record<string, string[]> } {
  if (!value) return { items: [], children: {} }

  if (Array.isArray(value)) {
    return { items: value.filter((v: any) => typeof v === 'string'), children: {} }
  }

  if (typeof value === 'object') {
    if (Array.isArray(value.items)) {
      const children: Record<string, string[]> = {}
      Object.keys(value).forEach((k) => {
        if (k === 'items') return
        const child = value[k]
        if (Array.isArray(child)) children[k] = child
        else if (child && Array.isArray(child.items)) children[k] = child.items
      })
      return { items: value.items.filter((v: any) => typeof v === 'string'), children }
    }

    const items: string[] = []
    const children: Record<string, string[]> = {}
    Object.keys(value).forEach((k) => {
      const child = value[k]
      if (Array.isArray(child)) {
        children[k] = child.filter((v: any) => typeof v === 'string')
      } else if (child && typeof child === 'object' && Array.isArray(child.items)) {
        children[k] = child.items.filter((v: any) => typeof v === 'string')
      } else if (typeof child === 'string') {
        items.push(child)
      }
    })
    return { items, children }
  }

  return { items: [], children: {} }
}

export interface NavCategory {
  name: string
  subcategories: Record<string, { items: string[]; children: Record<string, string[]> }>
}

const FALLBACK: NavCategory[] = [
  { name: 'Automation Solutions', subcategories: {} },
  { name: 'Ceiling Design & Ambient Lighting', subcategories: {} },
  { name: 'Textured Flooring & Surface Designs', subcategories: {} },
  { name: 'Interior Service', subcategories: {} },
  { name: 'Designer Walls & Claddings', subcategories: {} },
  { name: 'Exterior Services', subcategories: {} },
]

export async function GET() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(FALLBACK)
  }

  try {
    const db = createClient(supabaseUrl, supabaseAnonKey)
    const { data: rows, error } = await db.from('categories').select('*')

    if (!error && rows && rows.length > 0) {
      const catRows = rows.filter((r: any) => r.id !== 'structure' && r.document?.subcategories)

      if (catRows.length > 0) {
        const cats: NavCategory[] = catRows.map((row: any) => {
          const subcategories: NavCategory['subcategories'] = {}
          Object.keys(row.document.subcategories).forEach((subKey: string) => {
            subcategories[subKey] = normalizeSubcategory(row.document.subcategories[subKey])
          })
          return { name: row.id, subcategories }
        })
        return NextResponse.json(cats)
      }

      // Try structure document fallback
      const structureRow = rows.find((r: any) => r.id === 'structure')
      if (structureRow?.document?.categories) {
        const catsData = structureRow.document.categories
        const cats: NavCategory[] = Object.keys(catsData).map((name: string) => {
          const doc = catsData[name]
          const subcategories: NavCategory['subcategories'] = {}
          const subs = doc?.subcategories ?? doc ?? {}
          Object.keys(subs).forEach((subKey: string) => {
            subcategories[subKey] = normalizeSubcategory(subs[subKey])
          })
          return { name, subcategories }
        })
        return NextResponse.json(cats)
      }
    }

    return NextResponse.json(FALLBACK)
  } catch (err: any) {
    console.error('[/api/categories] error:', err?.message || err)
    return NextResponse.json(FALLBACK)
  }
}
