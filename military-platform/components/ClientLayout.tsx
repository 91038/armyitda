"use client"

import { MainSidebar } from "@/components/MainSidebar"
import { AuthProvider } from "@/context/AuthContext"
import { useAuth } from "@/context/AuthContext"

// 인증 상태에 따라 다른 레이아웃을 렌더링하는 컴포넌트
function LayoutContent({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  // 로그인하지 않은 경우 사이드바 없이 콘텐츠만 표시
  if (!user) {
    return <>{children}</>
  }

  // 로그인한 경우 사이드바와 함께 표시
  return (
    <div className="flex h-screen w-full">
      <div className="w-14 md:w-64 flex-shrink-0">
        <MainSidebar />
      </div>
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  )
}

// AuthProvider로 감싸서 인증 상태를 제공하는 컴포넌트
export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <LayoutContent>{children}</LayoutContent>
    </AuthProvider>
  )
} 
 