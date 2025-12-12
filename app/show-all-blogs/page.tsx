import Link from 'next/link'
import styles from './show-all-blogs.module.css'

export default function ShowAllBlogs() {
    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-6">All Blogs</h1>
            <p>Blog listing content will go here.</p>
            <Link href="/" className="text-blue-500 hover:underline">Back to Home</Link>
        </div>
    )
}
