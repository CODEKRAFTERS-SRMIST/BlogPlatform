import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'

/**
 * The font the design was drawn for, actually loaded.
 *
 * globals.css has always pointed --font-sans at --font-geist-sans, but
 * nothing anywhere defined that variable, so it resolved to nothing and the
 * whole site fell through to the Arial in body's fallback list. Every
 * font-black heading and every tracking-tighter wordmark was rendering in
 * Arial Bold.
 *
 * next/font downloads the file at build time and serves it from this origin,
 * so there is no request to Google at runtime and nothing to be blocked or
 * slow. display: swap means text paints immediately in the fallback and
 * swaps when the file lands, rather than holding the first paint hostage.
 */
const sans = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-app',
})

/**
 * Where this site lives, for turning relative paths into absolute URLs.
 *
 * Link previews need absolute URLs: when somebody pastes a story into
 * WhatsApp, WhatsApp fetches the page from the open internet and has no idea
 * what "/uploads/cover.jpg" is meant to point at. Without a base, Next leaves
 * those relative and the preview arrives with no picture.
 *
 * Set NEXT_PUBLIC_SITE_URL to the real origin in production. The fallback is
 * only right on a laptop.
 */
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Code Krafters — Stories from the club',
    template: '%s · Code Krafters',
  },
  description: 'Writing from the Code Krafters club: engineering, design and everything the members are building.',
  openGraph: {
    siteName: 'Code Krafters',
    type: 'website',
    locale: 'en_IN',
    url: siteUrl,
  },
  twitter: {
    card: 'summary_large_image',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={sans.variable}>
      <body>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              maxWidth: '92vw',
              borderRadius: '1rem',
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: 600,
            },
            success: { iconTheme: { primary: '#16a34a', secondary: '#fff' } },
            error: { duration: 6000, iconTheme: { primary: '#e11d48', secondary: '#fff' } },
          }}
        />
        {children}
      </body>
    </html>
  )
}
