"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  FileText, 
  Download, 
  Printer, 
  Plus, 
  Search,
  Filter,
  ChevronDown,
  Edit,
  Trash,
  Eye,
  File
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import type { Metadata } from "next"

// 샘플 데이터 - 보고서 목록
const REPORTS = [
  {
    id: 1,
    title: "주간 근무 현황 보고서",
    category: "근무",
    created: "2023-05-10",
    author: "김중사",
    status: "완료",
    type: "PDF"
  },
  {
    id: 2,
    title: "월간 정신건강 분석 보고서",
    category: "건강",
    created: "2023-05-05",
    author: "박대위",
    status: "완료",
    type: "EXCEL"
  },
  {
    id: 3,
    title: "부대 자기계발 현황 보고서",
    category: "교육",
    created: "2023-05-01",
    author: "김중사",
    status: "완료",
    type: "PDF"
  },
  {
    id: 4,
    title: "병영생활 만족도 조사 결과",
    category: "통계",
    created: "2023-04-25",
    author: "박대위",
    status: "완료",
    type: "PDF"
  },
  {
    id: 5,
    title: "신병 교육 결과 보고서",
    category: "교육",
    created: "2023-04-20",
    author: "이대위",
    status: "작성중",
    type: "WORD"
  }
]

// 샘플 데이터 - 템플릿 목록
const TEMPLATES = [
  {
    id: 1,
    title: "주간 근무 현황 템플릿",
    category: "근무",
    lastUsed: "2023-05-10",
    type: "PDF"
  },
  {
    id: 2,
    title: "월간 정신건강 분석 템플릿",
    category: "건강",
    lastUsed: "2023-05-05",
    type: "EXCEL"
  },
  {
    id: 3,
    title: "부대 자기계발 현황 템플릿",
    category: "교육",
    lastUsed: "2023-05-01",
    type: "PDF"
  },
  {
    id: 4,
    title: "병영생활 만족도 조사 템플릿",
    category: "통계",
    lastUsed: "2023-04-25",
    type: "PDF"
  },
  {
    id: 5,
    title: "신병 교육 결과 템플릿",
    category: "교육",
    lastUsed: "2023-04-20",
    type: "WORD"
  }
]

// 샘플 데이터 - 통계 항목
const STATS = [
  { label: "생성된 보고서", value: "125", change: "+12%", trend: "up" },
  { label: "보고서 템플릿", value: "24", change: "+3", trend: "up" },
  { label: "월간 생성량", value: "28", change: "-5%", trend: "down" },
  { label: "자동화율", value: "78%", change: "+15%", trend: "up" },
]

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("reports")
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")

  // 필터링된 보고서 목록
  const filteredReports = REPORTS.filter(report => {
    const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          report.author.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === "all" || report.category === categoryFilter
    
    return matchesSearch && matchesCategory
  })

  // 필터링된 템플릿 목록
  const filteredTemplates = TEMPLATES.filter(template => {
    const matchesSearch = template.title.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === "all" || template.category === categoryFilter
    
    return matchesSearch && matchesCategory
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">보고서</h1>
        <p className="text-muted-foreground">
          보고서를 생성하고 관리합니다.
        </p>
      </div>
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>보고서 관리</CardTitle>
            <CardDescription>보고서 생성 및 관리</CardDescription>
          </CardHeader>
          <CardContent>
            <p>보고서 관리 기능은 현재 개발 중입니다.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 
 