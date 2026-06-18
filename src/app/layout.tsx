import type { Metadata } from 'next'
import { Source_Serif_4, Inter, Fira_Code } from 'next/font/google'
import './globals.css'

const sourceSerif4 = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-source-serif-4',
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['400', '500', '600'],
  display: 'swap',
})

const firaCode = Fira_Code({
  subsets: ['latin'],
  variable: '--font-fira-code',
  weight: ['400', '500'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'DocReader',
  description: 'Markdown document reader for developers',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="zh-TW"
      className={`${sourceSerif4.variable} ${inter.variable} ${firaCode.variable} h-full`}
    >
      <body className="h-full antialiased">{children}</body>
    </html>
  )
}
