import type { Metadata } from 'next'
import { Nunito, Jost } from 'next/font/google'
import './globals.css'
import ConditionalLayout from '@/components/ConditionalLayout'
import { HMRErrorHandler } from './hmr-error-handler'
import { SpeedInsights } from "@vercel/speed-insights/next"

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-nunito',
})

const jost = Jost({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jost',
})

export const metadata: Metadata = {
  title: 'DECZON - Smart Home Solutions',
  description: 'Discover smart home solutions with DECZON. Advanced automation, security, and comfort for modern living.',
  icons: {
    icon: '/LOGO/Screenshot_2025-12-14_000134-removebg-preview.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes" />
        <link rel="dns-prefetch" href="https://firebasestorage.googleapis.com" />
        <link rel="preconnect" href="https://firebasestorage.googleapis.com" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
      </head>
      <body className={`${nunito.variable} ${jost.variable}`}>
        <HMRErrorHandler />
        <ConditionalLayout>
          {children}
        </ConditionalLayout>
        <SpeedInsights />
      </body>
    </html>
  )
}

