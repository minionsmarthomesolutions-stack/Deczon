import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

/**
 * Full category structure — migrated from Firebase.
 * Each key is the main category (stored as the row `id`).
 * Each value has `subcategories` → subcategoryName → array of items.
 */
const CATEGORY_SEED = {
  'Automation Solutions': {
    subcategories: {
      'Climate Control': [
        'Smart Thermostats',
        'Automated Fans',
        'Temperature Sensors',
        'Humidity Controllers',
        'HVAC Controllers',
      ],
      'Lighting Automation': [
        'Automated Light Controls',
        'Scene Controllers',
        'Timer Switches',
        'Motion Sensor Lights',
        'Dimmer Switches',
        'Smart Bulbs',
      ],
      'Security Automation': [
        'Smart Cameras',
        'Door Locks',
        'Alarm Systems',
        'Video Doorbells',
        'Access Controllers',
        'Motion Detectors',
      ],
      'Entertainment Automation': [
        'Smart TVs',
        'Multi-Room Audio',
        'Home Theatre',
        'Smart Speakers',
        'Universal Remotes',
      ],
      'Energy Management': [
        'Smart Meters',
        'Energy Monitors',
        'Solar Controllers',
        'EV Chargers',
      ],
    },
  },

  'Ceiling Design & Ambient Lighting': {
    subcategories: {
      'False Ceiling': [
        'Gypsum False Ceiling',
        'POP False Ceiling',
        'Wood False Ceiling',
        'Metal False Ceiling',
        'Glass False Ceiling',
      ],
      'Suspended Ceiling': [
        'Grid Ceiling',
        'Mineral Fibre Tiles',
        'Metal Tiles',
        'Wooden Panels',
      ],
      'Cove Lighting': [
        'LED Cove Strips',
        'Indirect Lighting',
        'Backlit Panels',
        'Colour-Changing LEDs',
      ],
      'Recessed Lighting': [
        'LED Downlights',
        'COB Spotlights',
        'Panel Lights',
        'Track Lighting',
      ],
      'Decorative Ceiling': [
        'Coffered Ceiling',
        'Tray Ceiling',
        'Vaulted Ceiling',
        'Beamed Ceiling',
      ],
      'Ceiling Fans': [
        'Smart Ceiling Fans',
        'Designer Fans',
        'BLDC Fans',
        'Chandelier Fans',
      ],
    },
  },

  'Textured Flooring & Surface Designs': {
    subcategories: {
      'Hardwood Flooring': [
        'Solid Hardwood',
        'Engineered Hardwood',
        'Parquet Flooring',
        'Bamboo Flooring',
      ],
      'Tile Flooring': [
        'Ceramic Tiles',
        'Porcelain Tiles',
        'Marble Tiles',
        'Granite Tiles',
        'Vitrified Tiles',
        'Mosaic Tiles',
      ],
      'Luxury Vinyl': [
        'SPC Flooring',
        'LVT Planks',
        'Click Vinyl',
        'Herringbone Vinyl',
      ],
      'Epoxy Flooring': [
        '3D Epoxy',
        'Metallic Epoxy',
        'Self-Levelling Epoxy',
        'Anti-Static Epoxy',
      ],
      'Wall Textures': [
        'Stucco Finish',
        'Venetian Plaster',
        'Sand Texture',
        'Brick Effect',
        'Concrete Look',
      ],
      'Surface Coatings': [
        'Anti-Skid Coating',
        'Waterproof Coating',
        'Heat-Resistant Coating',
        'Nano Coating',
      ],
    },
  },

  'Interior Service': {
    subcategories: {
      'Modular Kitchen': [
        'L-Shape Kitchen',
        'U-Shape Kitchen',
        'Parallel Kitchen',
        'Island Kitchen',
        'Straight Kitchen',
      ],
      'Modular Furniture': [
        'Wardrobes',
        'TV Units',
        'Study Tables',
        'Shoe Racks',
        'Crockery Units',
      ],
      'Interior Consultation': [
        'Space Planning',
        '3D Visualization',
        'Material Selection',
        'Colour Consultation',
        'Vastu Consultation',
      ],
      'Civil Works': [
        'False Ceiling',
        'Partition Walls',
        'Flooring',
        'Painting',
        'Plumbing',
        'Electrical',
      ],
      'Turnkey Projects': [
        'Full Home Interior',
        'Commercial Interior',
        'Office Interior',
        'Retail Store Interior',
      ],
    },
  },

  'Designer Walls & Claddings': {
    subcategories: {
      'Wall Panelling': [
        'WPC Wall Panels',
        'PVC Wall Panels',
        'Wooden Wall Panels',
        'Metal Wall Panels',
        'Fabric Wall Panels',
      ],
      'Stone Cladding': [
        'Natural Stone Cladding',
        'Slate Stone',
        'Sandstone Cladding',
        'Limestone Panels',
        'Quartzite Cladding',
      ],
      'Wallpaper & Murals': [
        'Non-Woven Wallpaper',
        '3D Wallpaper',
        'Textured Wallpaper',
        'Photo Murals',
        'Peel & Stick Wallpaper',
      ],
      'Decorative Paints': [
        'Metallic Paint',
        'Texture Paint',
        'Chalk Paint',
        'Limewash Paint',
        'Suede Effect Paint',
      ],
      'Brick & Concrete Effects': [
        'Exposed Brick Effect',
        'Concrete Overlay',
        'Industrial Loft Finish',
        'Raw Cement Look',
      ],
    },
  },

  'Exterior Services': {
    subcategories: {
      'Exterior Painting': [
        'Textured Exterior Paint',
        'Weather Shield Paint',
        'Elastomeric Paint',
        'Anti-Fungal Paint',
      ],
      'Facade Cladding': [
        'ACP Cladding',
        'Stone Facade',
        'Brick Facade',
        'Composite Panel',
        'Glass Facade',
      ],
      'Landscaping': [
        'Garden Design',
        'Lawn Installation',
        'Drip Irrigation',
        'Outdoor Lighting',
        'Water Features',
      ],
      'Waterproofing': [
        'Terrace Waterproofing',
        'Basement Waterproofing',
        'Bathroom Waterproofing',
        'External Wall Sealing',
      ],
      'Gate & Boundary': [
        'Automated Gates',
        'Compound Wall Design',
        'Boundary Fencing',
        'Security Bollards',
      ],
    },
  },
}

export async function GET() {
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Supabase credentials missing' }, { status: 500 })
  }

  try {
    const db = createClient(supabaseUrl, supabaseKey)
    const results: any[] = []

    for (const [categoryName, categoryData] of Object.entries(CATEGORY_SEED)) {
      // Build subcategories as { subName: { items: string[] } }
      const subcategories: Record<string, { items: string[] }> = {}
      for (const [subName, items] of Object.entries(categoryData.subcategories)) {
        subcategories[subName] = { items }
      }

      const document = { subcategories }

      // Delete existing row first (id may not have a unique constraint for ON CONFLICT)
      await db.from('categories').delete().eq('id', categoryName)

      // Insert fresh
      const { error } = await db.from('categories').insert({ id: categoryName, document })

      if (error) {
        results.push({ category: categoryName, status: 'error', error: error.message })
      } else {
        results.push({ category: categoryName, status: 'seeded ✅' })
      }
    }

    // Also update the 'structure' document with a summary
    const structureDoc = {
      categories: Object.fromEntries(
        Object.entries(CATEGORY_SEED).map(([name, data]) => [
          name,
          { subcategories: data.subcategories },
        ])
      ),
      updatedAt: new Date().toISOString(),
    }
    await db.from('categories').delete().eq('id', 'structure')
    await db.from('categories').insert({ id: 'structure', document: structureDoc })
    results.push({ category: 'structure', status: 'updated ✅' })

    const errors = results.filter((r) => r.status === 'error')
    return NextResponse.json({
      message: errors.length === 0 ? '✅ All categories seeded successfully!' : '⚠️ Some categories had errors',
      total: results.length,
      results,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 })
  }
}
