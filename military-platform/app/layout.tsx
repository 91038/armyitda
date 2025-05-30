import type { Metadata } from 'next'
import './globals.css'
import ClientLayout from '@/components/ClientLayout'
import { Toaster } from "@/components/ui/toaster"

export const metadata: Metadata = {
  title: '군대 관리 시스템',
  description: '군대 관리를 위한 통합 플랫폼',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <ClientLayout>{children}</ClientLayout>
        <Toaster />
      </body>
    </html>
  )
}
