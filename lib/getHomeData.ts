import { supabase } from './supabase';

export interface HomePageData {
    categories: any[];
    products: any[];
    services: any[];
    categoryBanners: { [key: string]: any[] };
    mainCategorySections: any[];
    blogs: any[];
}

export async function getHomePageData(): Promise<HomePageData> {
    const result: HomePageData = {
        categories: [],
        products: [],
        services: [],
        categoryBanners: {},
        mainCategorySections: [],
        blogs: []
    };

    try {
        // 1. Load Categories
        let categoriesData: any = null;
        let mainCategorySections: string[] = [];
        let categoriesList: any[] = [];

        try {
            const { data: categoriesArray, error } = await supabase.from('categories').select('*');
            if (error) throw error;
            
            if (categoriesArray && categoriesArray.length > 0) {
                const transformed: any = {};
                categoriesArray.forEach((row: any) => {
                    const d = row.document || {};
                    const main = row.id;
                    if (main !== 'structure') {
                        transformed[main] = { subcategories: d.subcategories || {} };
                    }
                });
                if (Object.keys(transformed).length > 0) {
                    categoriesData = transformed;
                }
            }
        } catch (e) {
            console.warn('Error fetching categories table from Supabase:', e);
        }

        if (!categoriesData) {
            try {
                const { data: catStruct, error: structErr } = await supabase.from('categories').select('*').eq('id', 'structure').single();
                if (!structErr && catStruct && catStruct.document) {
                    categoriesData = catStruct.document.categories || {};
                }
            } catch (e) {
                console.warn('Error fetching fallback categories structure:', e);
            }
        }

        if (categoriesData) {
            const mainCategories = Object.keys(categoriesData);
            mainCategorySections = [...mainCategories].sort((a, b) => a.localeCompare(b));
            categoriesList = mainCategorySections.map(name => {
                const mainData = categoriesData[name] || {};
                const subs = mainData.subcategories ? mainData.subcategories : mainData;
                return {
                    name,
                    subcategories: subs
                };
            });
            console.log(`[Server] Loaded ${mainCategorySections.length} categories`);
        }

        // 2. Load Products
        let allProducts: any[] = [];
        try {
            const { data: productsArray, error } = await supabase.from('products').select('*').limit(100);
            if (error) throw error;
            
            if (productsArray) {
                allProducts = productsArray.map((row: any) => {
                    const doc = row.document || {};
                    const id = row.id || doc.id || '';
                    const { id: _ignored, ...rest } = doc;
                    return { id, ...rest };
                }).filter((p: any) => {
                    const str = JSON.stringify(p);
                    return !str.includes('firebasestorage.googleapis.com') && !str.includes('storage.googleapis.com');
                });
            }
        } catch (error) {
            console.warn('Error fetching products from Supabase:', error);
        }

        if (categoriesList.length === 0 && allProducts.length > 0) {
            const categorySet = new Set<string>();
            allProducts.forEach(p => {
                if (p.mainCategory) categorySet.add(p.mainCategory);
                if (p.category) categorySet.add(p.category);
            });
            const fallbackCategories = Array.from(categorySet).sort((a, b) => a.localeCompare(b));
            mainCategorySections = fallbackCategories;
            categoriesList = fallbackCategories.map(name => ({ name, subcategories: {} }));
            console.log(`[Server] Derived ${fallbackCategories.length} categories from products`);
        }

        // 3. Load Banners - fetch ALL active banners at once and group by categoryId
        const bannersMap: { [key: string]: any[] } = {};
        try {
            const { data: allBanners, error: bannersError } = await supabase
                .from('banners')
                .select('*');

            if (bannersError) {
                console.warn('Error loading banners:', bannersError.message);
            } else if (allBanners && allBanners.length > 0) {
                console.log(`[Server] Loaded ${allBanners.length} total banners`);
                allBanners.forEach((row: any) => {
                    const doc = row.document || {};
                    // Only show active banners (isActive: true or not set = default active)
                    if (doc.isActive === false) return;
                    const catId = doc.categoryId;
                    if (!catId) return;
                    if (!bannersMap[catId]) bannersMap[catId] = [];
                    bannersMap[catId].push({ id: row.id, ...doc });
                });
                console.log('[Server] Banner categories found:', Object.keys(bannersMap));
            }
        } catch (error: any) {
            console.warn('Error loading banners:', error?.message);
        }

        // 4. Load Services
        let allServices: any[] = [];
        try {
            const { data: servicesArray, error } = await supabase
                .from('services')
                .select('*')
                .eq('document->>status', 'active')
                .limit(100);
            
            if (error) throw error;

            if (servicesArray && servicesArray.length > 0) {
                allServices = servicesArray.map((row: any) => {
                    const doc = row.document || {};
                    const id = row.id || doc.id || '';
                    const { id: _ignored, ...rest } = doc;
                    return { id, ...rest };
                }).filter((s: any) => {
                    const str = JSON.stringify(s);
                    return !str.includes('firebasestorage.googleapis.com') && !str.includes('storage.googleapis.com');
                });
            } else {
                // fallback
                const { data: fallbackServices } = await supabase.from('services').select('*').limit(100);
                if (fallbackServices) {
                    allServices = fallbackServices.map((row: any) => {
                        const doc = row.document || {};
                        const id = row.id || doc.id || '';
                        const { id: _ignored, ...rest } = doc;
                        return { id, ...rest };
                    }).filter((s: any) => {
                        const str = JSON.stringify(s);
                        return !str.includes('firebasestorage.googleapis.com') && !str.includes('storage.googleapis.com');
                    });
                }
            }
        } catch (error) {
            console.warn('Error loading services:', error);
        }

        // 5. Load Blogs
        let allBlogs: any[] = [];
        try {
            const { data: blogsArray, error } = await supabase.from('blogs').select('*').limit(8);
            if (error) throw error;
            
            if (blogsArray) {
                allBlogs = blogsArray.map((row: any) => {
                    const doc = row.document || {};
                    const id = row.id || doc.id || '';
                    const { id: _ignored, ...rest } = doc;
                    return { id, ...rest };
                });
            }
        } catch (error) {
            console.warn('Error loading blogs:', error);
        }

        result.categories = categoriesList;
        result.mainCategorySections = mainCategorySections;
        result.products = allProducts.map(serializeData);
        result.services = allServices.map(serializeData);

        const serializedBanners: { [key: string]: any[] } = {};
        Object.keys(bannersMap).forEach(key => {
            serializedBanners[key] = bannersMap[key].map(serializeData);
        });
        result.categoryBanners = serializedBanners;

        result.blogs = allBlogs.map(serializeData);

    } catch (error) {
        console.error('Critical error in getHomePageData:', error);
    }

    return result;
}

function serializeData(item: any): any {
    if (!item) return item;
    const newItem = { ...item };

    // Handle timestamps extracted from JSONB (they lack Firebase's JS functions)
    ['createdAt', 'updatedAt', 'publishedAt'].forEach(field => {
        if (newItem[field] && typeof newItem[field] === 'object') {
            if ('_seconds' in newItem[field]) {
                newItem[field] = new Date(newItem[field]._seconds * 1000).toISOString();
            } else if ('seconds' in newItem[field]) {
                newItem[field] = new Date(newItem[field].seconds * 1000).toISOString();
            }
        }
    });

    return newItem;
}
