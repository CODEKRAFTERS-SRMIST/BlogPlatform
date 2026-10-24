import './globals.css'
import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'Blog Platform - Share Your Stories',
  description: 'A modern blogging platform to share your stories with the world',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
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