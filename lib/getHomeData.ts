import { getDb } from './firebase';
import { collection, getDocs, query, orderBy, limit, doc, getDoc, where, Firestore } from 'firebase/firestore';

export interface HomePageData {
    categories: any[];
    products: any[];
    services: any[];
    categoryBanners: { [key: string]: any[] };
    mainCategorySections: any[];
    blogs: any[];
}

export async function getHomePageData(): Promise<HomePageData> {
    const db = getDb();

    // Default empty state
    const result: HomePageData = {
        categories: [],
        products: [],
        services: [],
        categoryBanners: {},
        mainCategorySections: [],
        blogs: []
    };

    if (!db) {
        console.warn('Firestore instance not available on server');
        return result;
    }

    try {
        // 1. Load Categories
        // ---------------------------------------------------------
        let categoriesData: any = null;
        let mainCategorySections: string[] = [];
        let categoriesList: any[] = [];

        // Try loading from categories collection
        try {
            const categoriesSnapshot = await getDocs(collection(db, 'categories'));
            if (!categoriesSnapshot.empty) {
                const transformed: any = {};
                categoriesSnapshot.forEach((docSnapshot) => {
                    const d = docSnapshot.data() || {};
                    const main = docSnapshot.id;
                    if (d && d.subcategories) {
                        transformed[main] = { subcategories: d.subcategories };
                    }
                });
                if (Object.keys(transformed).length > 0) {
                    categoriesData = transformed;
                }
            }
        } catch (e) {
            console.warn('Error fetching categories collection:', e);
        }

        // If no categories from collection, try structure doc
        if (!categoriesData) {
            try {
                const categoriesDoc = await getDoc(doc(db, 'categories', 'structure'));
                if (categoriesDoc.exists()) {
                    const raw = categoriesDoc.data().categories || {};
                    categoriesData = raw;
                }
            } catch (e) {
                console.warn('Error fetching categories structure:', e);
            }
        }

        // Process categories if found
        if (categoriesData) {
            const mainCategories = Object.keys(categoriesData);
            // Sort categories alphabetically
            mainCategorySections = [...mainCategories].sort((a, b) => a.localeCompare(b));
            categoriesList = mainCategorySections.map(name => ({
                name,
                subcategories: categoriesData[name]?.subcategories || {}
            }));
            console.log(`[Server] Loaded ${mainCategorySections.length} categories`);
        } else {
            // Fallback: try to get categories from products (optimistic fallback on server might be slow if many products, but we limit fetching elsewhere)
            // We will fetch products anyway, so we can extract from there if needed, but let's try a separate limited query if possible or just wait for products.
            // For now, let's defer fallback logic until after fetching products if categories are still empty.
        }

        // 2. Load Products
        // ---------------------------------------------------------
        let allProducts: any[] = [];
        try {
            // Try to get products ordered by createdAt
            const productsQuery = query(collection(db, 'products'), orderBy('createdAt', 'desc'), limit(100));
            const productsSnapshot = await getDocs(productsQuery);
            allProducts = productsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error: any) {
            console.warn('Error fetching products with orderBy:', error?.message);
            // Fallback without sort
            try {
                const productsSnapshot = await getDocs(collection(db, 'products'));
                allProducts = productsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })).slice(0, 100);
            } catch (fallbackError) {
                console.warn('Error fetching products fallback:', fallbackError);
            }
        }

        // Fallback categories from products if needed
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

        // 3. Load Banners (Dependent on Categories)
        // ---------------------------------------------------------
        const bannersMap: { [key: string]: any[] } = {};
        if (mainCategorySections.length > 0) {
            // Fetch in parallel
            await Promise.all(mainCategorySections.map(async (mainCategory) => {
                try {
                    const bannersQuery = query(
                        collection(db, 'banners'),
                        where('categoryId', '==', mainCategory),
                        orderBy('createdAt', 'desc')
                    );
                    const bannersSnapshot = await getDocs(bannersQuery);
                    const categoryBannersList = bannersSnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));

                    if (categoryBannersList.length > 0) {
                        bannersMap[mainCategory] = categoryBannersList;
                    }
                } catch (error: any) {
                    // Try fallback without checking permissions strictly if it's just missing index
                    if (error?.code !== 'permission-denied') {
                        console.warn(`Error loading banners for ${mainCategory}:`, error?.message);
                    }
                }
            }));
        }

        // 4. Load Services
        // ---------------------------------------------------------
        let allServices: any[] = [];
        try {
            const servicesQuery = query(
                collection(db, 'services'),
                where('status', '==', 'active'),
                orderBy('createdAt', 'desc'),
                limit(6)
            );
            const servicesSnapshot = await getDocs(servicesQuery);
            allServices = servicesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.warn('Error loading services (formatted):', error);
            // Fallback
            try {
                const servicesQuery = query(collection(db, 'services'), orderBy('createdAt', 'desc'), limit(6));
                const servicesSnapshot = await getDocs(servicesQuery);
                allServices = servicesSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            } catch (fbError) {
                console.warn('Error loading services fallback:', fbError);
            }
        }

        // 5. Load Blogs
        // ---------------------------------------------------------
        let allBlogs: any[] = [];
        try {
            // Try to get main blog first if separate query needed, but simpler to just get recent and filter in component or here.
            // We'll fetch recent 8 posts.
            const blogsQuery = query(collection(db, 'blogs'), orderBy('createdAt', 'desc'), limit(8));
            const blogsSnapshot = await getDocs(blogsQuery);
            allBlogs = blogsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.warn('Error loading blogs:', error);
            try {
                // Fallback without sort
                const blogsSnapshot = await getDocs(collection(db, 'blogs'));
                allBlogs = blogsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })).slice(0, 8);
            } catch (fbError) {
                console.warn('Error loading blogs fallback:', fbError);
            }
        }

        result.categories = categoriesList;
        result.mainCategorySections = mainCategorySections;
        result.products = allProducts;
        result.services = allServices;
        result.categoryBanners = bannersMap;
        result.blogs = allBlogs; // Add blogs to result

    } catch (error) {
        console.error('Critical error in getHomePageData:', error);
    }

    return result;
}
