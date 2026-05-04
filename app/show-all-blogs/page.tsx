'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import styles from './show-all-blogs.module.css';
import Link from 'next/link';

interface Blog {
    id: string;
    title: string;
    content: string;
    excerpt?: string;
    category?: string;
    author?: string;
    createdAt?: Date | string;
    publishedAt?: Date | string;
    likes?: number;
    views?: number;
    readingTime?: number;
    primaryImage?: string;
    imageUrl?: string;
}

const categoryIcons: Record<string, string> = {
    "Smart Home": "🏠",
    Security: "🔒",
    Automation: "🤖",
    Energy: "⚡",
    Lighting: "💡",
    Technology: "💻",
    Food: "🍰",
    News: "📰",
    Reviews: "⭐",
    Tutorials: "📚",
    "Tips & Tricks": "💡",
    General: "📄",
};

export default function ShowAllBlogs() {
    const [allBlogs, setAllBlogs] = useState<Blog[]>([]);
    const [filteredBlogs, setFilteredBlogs] = useState<Blog[]>([]);
    const [currentFilter, setCurrentFilter] = useState('all');
    const [currentSort, setCurrentSort] = useState('newest');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAllBlogs();
    }, []);

    useEffect(() => {
        applyFilterAndSort();
    }, [allBlogs, currentFilter, currentSort]);

    const loadAllBlogs = async () => {
        try {
            let blogs: Blog[] = [];

            // Try loading from Database
            try {
                const { data, error } = await supabase
                    .from('blogs')
                    .select('*')
                    .order('document->>createdAt', { ascending: false });
                
                if (!error && data) {
                    const dbBlogs: Blog[] = data.map((doc: any) => ({
                        id: doc.id,
                        ...doc.document
                    } as Blog));
                    if (dbBlogs.length > 0) {
                        blogs = dbBlogs;
                    }
                }
            } catch (error) {
                console.error("Error loading specific blogs:", error);
            }

            setAllBlogs(blogs);
        } catch (error) {
            console.error("Error loading blogs:", error);
        } finally {
            setLoading(false);
        }
    };



    const applyFilterAndSort = () => {
        let result = [...allBlogs];

        // Search Filter (from DOM input)
        const searchInput = document.getElementById('searchInput') as HTMLInputElement;
        const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';

        if (searchTerm) {
            result = result.filter(blog =>
                blog.title.toLowerCase().includes(searchTerm) ||
                (blog.content && blog.content.toLowerCase().includes(searchTerm)) ||
                (blog.excerpt && blog.excerpt?.toLowerCase().includes(searchTerm)) ||
                (blog.category && blog.category.toLowerCase().includes(searchTerm)) ||
                (blog.author && blog.author.toLowerCase().includes(searchTerm))
            );
        }

        // Category Filter
        if (currentFilter !== 'all') {
            result = result.filter(blog => (blog.category || 'General') === currentFilter);
        }

        // Sort
        result.sort((a, b) => {
            if (currentSort === 'newest') {
                const dateA = getDate(a);
                const dateB = getDate(b);
                return dateB.getTime() - dateA.getTime();
            } else if (currentSort === 'oldest') {
                const dateA = getDate(a);
                const dateB = getDate(b);
                return dateA.getTime() - dateB.getTime();
            } else if (currentSort === 'popular') {
                return (b.likes || 0) - (a.likes || 0);
            } else if (currentSort === 'title') {
                return a.title.localeCompare(b.title);
            }
            return 0;
        });

        setFilteredBlogs(result);
    };

    // Live search listener
    useEffect(() => {
        const searchInput = document.getElementById('searchInput');
        if (!searchInput) return;

        const handleSearch = () => {
            applyFilterAndSort();
        };

        const debouncedSearch = debounce(handleSearch, 300);
        searchInput.addEventListener('input', debouncedSearch);

        return () => {
            searchInput.removeEventListener('input', debouncedSearch);
        };
    }, [allBlogs, currentFilter, currentSort]); // Re-bind if dependencies change to ensure closure freshness

    function debounce(func: Function, wait: number) {
        let timeout: NodeJS.Timeout;
        return function executedFunction(...args: any[]) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    const getDate = (blog: Blog): Date => {
        const dateInput = blog.createdAt || blog.publishedAt;
        if (!dateInput) return new Date(0);
        if (typeof dateInput === 'string') return new Date(dateInput);
        if (dateInput instanceof Date) return dateInput;
        if ((dateInput as any).toDate && typeof (dateInput as any).toDate === 'function') return (dateInput as any).toDate();
        return new Date(0);
    };

    const formatDate = (blog: Blog) => {
        const date = getDate(blog);
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    const getUniqueCategories = () => {
        return Array.from(new Set(allBlogs.map(blog => blog.category || 'General')));
    };

    const getBlogsByCategory = () => {
        const grouped: Record<string, Blog[]> = {};
        filteredBlogs.forEach(blog => {
            const cat = blog.category || 'General';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(blog);
        });
        return grouped;
    };

    const blogsByCategory = getBlogsByCategory();
    const categoriesPresent = Object.keys(blogsByCategory);

    return (
        <div className={styles.blogsMain}>
            {/* Hero Section */}
            <section className={styles.blogsHero}>
                <div className={styles.container}>
                    <div className={styles.heroContent}>
                        <h1 className={styles.heroTitle}>All Blog Posts</h1>
                        <p className={styles.heroSubtitle}>Discover insights about smart home technology, automation, and more</p>
                        <div className={styles.heroStats}>
                            <div className={styles.stat}>
                                <span className={styles.statNumber}>{allBlogs.length}</span>
                                <span className={styles.statLabel}>Total Posts</span>
                            </div>
                            <div className={styles.stat}>
                                <span className={styles.statNumber}>{getUniqueCategories().length}</span>
                                <span className={styles.statLabel}>Categories</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Filter Section */}
            <section className={styles.filterSection}>
                <div className={styles.container}>
                    <div className={styles.filterControls}>
                        <div className={styles.categoryFilters}>
                            <button
                                className={`${styles.filterBtn} ${currentFilter === 'all' ? styles.filterBtnActive : ''}`}
                                onClick={() => setCurrentFilter('all')}
                            >
                                All Posts
                            </button>
                            {getUniqueCategories().map(cat => (
                                <button
                                    key={cat}
                                    className={`${styles.filterBtn} ${currentFilter === cat ? styles.filterBtnActive : ''}`}
                                    onClick={() => setCurrentFilter(cat)}
                                >
                                    {categoryIcons[cat] || "📄"} {cat}
                                </button>
                            ))}
                        </div>
                        <div className={styles.sortControls}>
                            <select
                                className={styles.sortSelect}
                                value={currentSort}
                                onChange={(e) => setCurrentSort(e.target.value)}
                            >
                                <option value="newest">Newest First</option>
                                <option value="oldest">Oldest First</option>
                                <option value="popular">Most Popular</option>
                                <option value="title">Title A-Z</option>
                            </select>
                        </div>
                    </div>
                </div>
            </section>

            {/* Content */}
            {loading ? (
                <div className={styles.blogsLoading}>
                    <div className={styles.loadingSpinner}></div>
                    <p>Loading blog posts...</p>
                </div>
            ) : (
                <section className={styles.blogsContent}>
                    <div className={styles.container}>
                        {filteredBlogs.length === 0 ? (
                            <div className={styles.noResults}>
                                <div className={styles.noResultsIcon}>📝</div>
                                <h3>No blog posts found</h3>
                                <p>Try adjusting your search or filter criteria</p>
                            </div>
                        ) : (
                            categoriesPresent.map(category => (
                                (currentFilter === 'all' || currentFilter === category) && (
                                    <div key={category} className={styles.categorySection}>
                                        <div className={styles.categoryHeader}>
                                            <div className={styles.categoryIcon}>{categoryIcons[category] || "📄"}</div>
                                            <h2 className={styles.categoryTitle}>{category}</h2>
                                            <div className={styles.categoryCount}>
                                                {blogsByCategory[category].length} post{blogsByCategory[category].length !== 1 ? "s" : ""}
                                            </div>
                                        </div>
                                        <div className={styles.blogsGrid}>
                                            {blogsByCategory[category].map(blog => (
                                                <Link href={`/blog/${blog.id}`} key={blog.id} style={{ textDecoration: 'none' }}>
                                                    <div className={styles.blogCard}>
                                                        <div className={styles.blogImage}>
                                                            {blog.primaryImage || blog.imageUrl ? (
                                                                <img
                                                                    src={blog.primaryImage || blog.imageUrl}
                                                                    alt={blog.title}
                                                                    onError={(e) => {
                                                                        (e.target as HTMLElement).parentElement!.innerHTML = categoryIcons[blog.category || 'General'] || "📄";
                                                                    }}
                                                                />
                                                            ) : (
                                                                categoryIcons[blog.category || 'General'] || "📄"
                                                            )}
                                                        </div>
                                                        <div className={styles.blogContent}>
                                                            <div className={styles.blogMeta}>
                                                                <span>{blog.category || "General"}</span>
                                                                <span>•</span>
                                                                <span>{formatDate(blog)}</span>
                                                                <span>•</span>
                                                                <span>{blog.readingTime || 5} min read</span>
                                                            </div>
                                                            <h3 className={styles.blogTitle}>{blog.title}</h3>
                                                            <p className={styles.blogExcerpt}>{blog.excerpt || "Read more about this topic..."}</p>
                                                            <div className={styles.blogFooter}>
                                                                <div className={styles.blogAuthor}>By {blog.author || "Author"}</div>
                                                                <div className={styles.blogStats}>
                                                                    <div className={styles.blogStat}>
                                                                        <span>❤️</span>
                                                                        <span>{blog.likes || 0}</span>
                                                                    </div>
                                                                    <div className={styles.blogStat}>
                                                                        <span>👁️</span>
                                                                        <span>{blog.views || 0}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )
                            ))
                        )}
                    </div>
                </section>
            )}
        </div>
    );
}
