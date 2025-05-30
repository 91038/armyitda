"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/AuthContext"
import {
  LayoutDashboard,
  Users,
  Calendar,
  LogOut,
  Shield,
  UserRound,
  Car,
  Palmtree,
  Award
} from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { auth } from "@/lib/firebase"
import { signOut } from "firebase/auth"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const navItems = [
  {
    title: "대시보드",
    href: "/dashboard",
    icon: <LayoutDashboard className="mr-2 h-4 w-4" />,
    description: "시스템 대시보드",
  },
  {
    title: "병사 관리",
    href: "/soldiers",
    icon: <Users className="mr-2 h-4 w-4" />,
    description: "사용자 정보 관리",
  },
  {
    title: "간부 관리",
    href: "/officers",
    icon: <UserRound className="mr-2 h-4 w-4" />,
    description: "간부 정보 관리",
  },
  {
    title: "포트폴리오 관리",
    href: "/admin/portfolio",
    icon: <Award className="mr-2 h-4 w-4" />,
    description: "병사 포트폴리오 관리",
  },
  {
    title: "출타 관리",
    href: "/admin/schedules",
    icon: <Calendar className="mr-2 h-4 w-4" />,
    description: "출타 신청 및 현황 관리",
  },
  {
    title: "휴가 관리",
    href: "/leaves",
    icon: <Palmtree className="mr-2 h-4 w-4" />,
    description: "휴가 신청 및 부여 관리",
  },
  {
    title: "경계작전 명령서",
    href: "/guard-operations",
    icon: <Shield className="mr-2 h-4 w-4" />,
    description: "불침번 및 CCTV 근무 관리",
  },
  {
    title: "배차 관리",
    href: "/dispatch",
    icon: <Car className="mr-2 h-4 w-4" />,
    description: "차량 배차 관리",
  },
]

export function MainSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { logout } = useAuth()

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push("/login")
    } catch (error) {
      console.error("로그아웃 중 오류가 발생했습니다:", error)
    }
  }

  return (
    <div className="group h-full flex flex-col transition-all duration-300 hover:w-64 bg-background z-30 border-r">
      <Link href="/dashboard">
        <div className="flex h-16 items-center justify-center md:justify-start border-b">
          <span className="font-bold text-lg hidden md:block group-hover:block">군대 플랫폼</span>
          <span className="font-bold text-lg block md:hidden group-hover:hidden">MP</span>
        </div>
      </Link>
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="flex flex-col gap-1 px-2">
          <TooltipProvider>
            {navItems.map((item) => (
              <li key={item.title}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      className={cn(
                        buttonVariants({ variant: "ghost" }),
                        "w-full justify-start text-sm text-muted-foreground hover:text-primary hover:bg-muted"
                      )}
                    >
                      {item.icon}
                      <span className="hidden md:block group-hover:block truncate">
                        {item.title}
                      </span>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="md:hidden group-hover:hidden">
                    <div className="font-medium">{item.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.description}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </li>
            ))}
          </TooltipProvider>
        </ul>
      </nav>
      <div className="mt-auto px-2 pb-4">
        <button
          onClick={handleLogout}
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "w-full justify-start text-sm text-muted-foreground hover:text-primary hover:bg-muted"
          )}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span className="hidden md:block group-hover:block">로그아웃</span>
        </button>
      </div>
    </div>
  )
}