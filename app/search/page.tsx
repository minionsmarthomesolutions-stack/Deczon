import { Suspense } from 'react'
import SearchClient from './SearchClient'

export const metadata = {
    title: 'Search | Deczon',
    description: 'Search for products, services, and more on Deczon.',
}

export default function SearchPage() {
    return (
        <Suspense fallback={
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                padding: '100px',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '20px'
            }}>
                <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray="50"
                    strokeDashoffset="50"
                    style={{ animation: 'spin 1s linear infinite' }}
                >
                    <circle cx="12" cy="12" r="10"></circle>
                </svg>
                <span>Loading search...</span>
                <style>{`
          @keyframes spin { 100% { transform: rotate(360deg); } }
        `}</style>
            </div>
        }>
            <SearchClient />
        </Suspense>
    )
}
