import './globals.css'
import type { Metadata } from 'next'
import { NavigationArray } from './components/ui/NavigationArray'
import { MainframeHeader } from './components/ui/MainframeHeader'
export const metadata: Metadata = {
  title: 'NYC Events & Communities',
  description: 'A futuristic directory of NYC events, communities, and locations',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <div className="container">
          <MainframeHeader />
          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
