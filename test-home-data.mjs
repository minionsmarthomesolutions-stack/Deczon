import { createClient } from '@supabase/supabase-js';


const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function test() {
  const { data: productsArray } = await supabase.from('products').select('*').limit(10);
  console.log('Products returned:', productsArray?.length || 0);
  
  if (productsArray && productsArray.length > 0) {
    const allProducts = productsArray.map(row => {
        const doc = row.document || {};
        const id = row.id || doc.id || '';
        const { id: _ignored, ...rest } = doc;
        return { id, ...rest };
    });
    console.log('First mapped product:', JSON.stringify(allProducts[0], null, 2));
    
    // Check derivation
    const categorySet = new Set();
    allProducts.forEach(p => {
        if (p.mainCategory) categorySet.add(p.mainCategory);
        if (p.category) categorySet.add(p.category);
    });
    console.log('Derived categories:', Array.from(categorySet));
  }
}
test();

