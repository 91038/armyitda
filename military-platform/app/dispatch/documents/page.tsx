"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getDispatchDocuments, deleteDispatchDocument } from "@/lib/api/dispatches"
import { DispatchDocument } from "@/types"
import { toast } from "@/components/ui/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Loader2, Search, Eye, Printer, Trash2 } from "lucide-react"

export default function DispatchDocumentsPage() {
  const router = useRouter()
  
  const [documents, setDocuments] = useState<DispatchDocument[]>([])
  const [filteredDocuments, setFilteredDocuments] = useState<DispatchDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null)

  // 문서 목록 로드
  const loadDocuments = async () => {
    setIsLoading(true)
    try {
      const response = await getDispatchDocuments()
      if (response.success && response.data) {
        // 날짜 기준 내림차순 정렬 (최신순)
        const sortedDocs = response.data.sort((a, b) => {
          // createdAt이 Date 객체인지 문자열인지 확인하고 적절히 비교
          const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt)
          const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt)
          return dateB.getTime() - dateA.getTime()
        })
        
        setDocuments(sortedDocs)
        setFilteredDocuments(sortedDocs)
      } else {
        toast({
          title: "오류",
          description: response.error || "배차지시서 목록을 불러올 수 없습니다.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("배차지시서 목록 로드 오류:", error)
      toast({
        title: "오류",
        description: "배차지시서 목록을 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 초기 데이터 로드
  useEffect(() => {
    loadDocuments()
  }, [])

  // 검색어 변경 시 필터링
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredDocuments(documents)
      return
    }
    
    const query = searchQuery.toLowerCase()
    const filtered = documents.filter(doc => 
      doc.documentNumber.toLowerCase().includes(query) ||
      doc.unitName.toLowerCase().includes(query) ||
      doc.creator.toLowerCase().includes(query) ||
      doc.commanderName.toLowerCase().includes(query)
    )
    
    setFilteredDocuments(filtered)
  }, [searchQuery, documents])

  // 문서 상세 페이지로 이동
  const handleViewDocument = (documentId: string) => {
    router.push(`/dispatch/documents/${documentId}`)
  }
  
  // 문서 인쇄 페이지로 이동
  const handlePrintDocument = (documentId: string) => {
    router.push(`/dispatch/print?documentId=${documentId}`)
  }
  
  // 문서 삭제 처리
  const handleDeleteDocument = async () => {
    if (!documentToDelete) return
    
    try {
      const response = await deleteDispatchDocument(documentToDelete)
      
      if (response.success) {
        toast({
          title: "삭제 완료",
          description: "배차지시서가 삭제되었습니다.",
        })
        
        // 목록 다시 로드
        loadDocuments()
      } else {
        toast({
          title: "삭제 실패",
          description: response.error || "배차지시서 삭제 중 오류가 발생했습니다.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("배차지시서 삭제 오류:", error)
      toast({
        title: "삭제 실패",
        description: "배차지시서 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setDocumentToDelete(null)
    }
  }

  // 날짜 포맷팅 함수
  const formatDate = (date: Date | string) => {
    const dateObj = date instanceof Date ? date : new Date(date)
    return format(dateObj, 'yyyy-MM-dd HH:mm')
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">배차지시서 목록</h1>
        <p className="text-muted-foreground">
          생성된 배차지시서 목록을 관리합니다.
        </p>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="배차지시서 검색..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button onClick={() => router.push("/dispatch")}>
          배차 관리로 돌아가기
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>배차지시서</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? "검색 결과가 없습니다." : "생성된 배차지시서가 없습니다."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>문서번호</TableHead>
                  <TableHead>부대명</TableHead>
                  <TableHead>작성자</TableHead>
                  <TableHead>지휘관</TableHead>
                  <TableHead>작성일</TableHead>
                  <TableHead>배차 수</TableHead>
                  <TableHead className="text-right">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>{doc.documentNumber}</TableCell>
                    <TableCell>{doc.unitName}</TableCell>
                    <TableCell>{doc.creator}</TableCell>
                    <TableCell>{doc.commanderName}</TableCell>
                    <TableCell>{formatDate(doc.createdAt)}</TableCell>
                    <TableCell>{doc.dispatchIds.length}건</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleViewDocument(doc.id)}
                          title="상세 보기"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handlePrintDocument(doc.id)}
                          title="인쇄/PDF 저장"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setDocumentToDelete(doc.id)}
                              title="삭제"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>배차지시서 삭제</AlertDialogTitle>
                              <AlertDialogDescription>
                                이 배차지시서를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => setDocumentToDelete(null)}>
                                취소
                              </AlertDialogCancel>
                              <AlertDialogAction onClick={handleDeleteDocument}>
                                삭제
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 