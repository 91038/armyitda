"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  PlusCircle, 
  Search, 
  Filter, 
  RefreshCcw, 
  Edit, 
  Trash2, 
  Eye,
  Download,
  Printer
} from "lucide-react"

import { getSoldiers } from "@/lib/api/soldiers"
import { getCurrentLeaves } from "@/lib/api/leaves"
import { Soldier } from "@/types"

export default function SoldiersPage() {
  const [soldiers, setSoldiers] = useState<Soldier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [searchTerm, setSearchTerm] = useState("")
  const [unitFilter, setUnitFilter] = useState("all")
  const [rankFilter, setRankFilter] = useState("all")
  
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  
  const [soldierToDelete, setSoldierToDelete] = useState<Soldier | null>(null)
  
  const router = useRouter()
  
  // 병사 목록 불러오기
  const fetchSoldiers = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await getSoldiers()
      
      if (response.success && response.data) {
        const soldiers = response.data;
        
        // 현재 휴가 중인 인원 목록 불러오기
        const leavesResponse = await getCurrentLeaves();
        
        if (leavesResponse.success && leavesResponse.data) {
          const currentSoldiersOnLeave = leavesResponse.data
            .filter(leave => leave.personType === "soldier")
            .map(leave => leave.personId);
          
          console.log("현재 휴가 중인 병사 ID 목록:", currentSoldiersOnLeave);
          
          // 병사 데이터에 휴가 상태 업데이트
          const soldiersWithUpdatedLeaveStatus = soldiers.map(soldier => {
            // 현재 휴가 중인 병사인지 확인하고 상태 업데이트
            if (currentSoldiersOnLeave.includes(soldier.id)) {
              return {
                ...soldier,
                leaveStatus: "휴가중" as const
              };
            }
            return soldier;
          });
          
          setSoldiers(soldiersWithUpdatedLeaveStatus);
        } else {
          setSoldiers(soldiers);
        }
        
        setTotalPages(Math.ceil(soldiers.length / pageSize));
      } else {
        setError(response.error || "병사 목록을 불러오는데 실패했습니다.")
      }
    } catch (err: any) {
      setError(err.message || "병사 목록을 불러오는데 실패했습니다.")
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    fetchSoldiers()
  }, [])
  
  // 검색 및 필터링된 병사 목록
  const filteredSoldiers = soldiers.filter(soldier => {
    const matchesSearch = !searchTerm || 
      soldier.name.includes(searchTerm) || 
      soldier.serialNumber.includes(searchTerm) || 
      soldier.position.includes(searchTerm)
    
    const matchesUnit = unitFilter === "all" || soldier.unit === unitFilter
    const matchesRank = rankFilter === "all" || soldier.rank === rankFilter
    
    return matchesSearch && matchesUnit && matchesRank
  })
  
  // 페이지네이션 적용
  const paginatedSoldiers = filteredSoldiers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )
  
  // 병사 삭제 처리
  const handleDeleteSoldier = (soldier: Soldier) => {
    setSoldierToDelete(soldier)
  }
  
  const confirmDeleteSoldier = async () => {
    if (!soldierToDelete) return
    
    // 실제 삭제 API 호출 코드는 구현 필요
    console.log(`병사 삭제 요청: ${soldierToDelete.id}`)
    
    // 임시로 UI에서만 삭제된 것처럼 처리
    setSoldiers(soldiers.filter(s => s.id !== soldierToDelete.id))
    setSoldierToDelete(null)
  }
  
  // 고유한 부대 및 계급 목록 가져오기
  const uniqueUnits = Array.from(new Set(soldiers.map(s => s.unit)))
  const uniqueRanks = Array.from(new Set(soldiers.map(s => s.rank)))
  
  // 건강 상태에 따른 배지 색상
  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case "건강": return "bg-green-100 text-green-800"
      case "양호": return "bg-yellow-100 text-yellow-800"
      case "이상": return "bg-red-100 text-red-800"
      case "건강상태 미실시": return "bg-gray-100 text-gray-600"
      default: return "bg-gray-100 text-gray-800"
    }
  }
  
  // 정신건강 위험도에 따른 배지 색상
  const getMentalHealthRiskColor = (risk: string) => {
    switch (risk) {
      case "낮음": return "bg-green-100 text-green-800";
      case "중간": return "bg-yellow-100 text-yellow-800";
      case "높음": return "bg-red-100 text-red-800";
      default: return "bg-green-100 text-green-800"; // 기본값을 '낮음' 상태 색상으로 설정
    }
  }
  
  // 정신건강 상태에 따른 배지 색상
  const getMentalHealthStatusColor = (status: string) => {
    switch (status) {
      case "건강": return "bg-green-100 text-green-800";
      case "양호": return "bg-yellow-100 text-yellow-800";
      case "이상": return "bg-red-100 text-red-800";
      case "건강상태 미실시": return "bg-gray-100 text-gray-600";
      default: return "bg-gray-100 text-gray-800";
    }
  }
  
  // 건강상태 표시 함수 (검사 여부 확인)
  const getHealthStatusDisplay = (soldier: Soldier) => {
    // 신체건강 상태 확인
    const physicalStatus = soldier.physicalHealthStatus || 
      (soldier.latestPhysicalTestDate ? "건강" : "건강상태 미실시");
    
    // 정신건강 상태 확인  
    const mentalStatus = soldier.mentalHealthStatus || 
      (soldier.latestTestDate ? "건강" : "건강상태 미실시");

    return { physicalStatus, mentalStatus };
  }
  
  // 운전기량에 따른 배지 색상
  const getDrivingSkillColor = (skill: string) => {
    switch (skill) {
      case "요숙련": return "bg-red-100 text-red-800"
      case "준숙련": return "bg-yellow-100 text-yellow-800"
      case "숙련": return "bg-green-100 text-green-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }
  
  // 휴가 상태에 따른 배지 색상
  const getLeaveStatusColor = (status: string) => {
    switch (status) {
      case "휴가중": return "bg-blue-100 text-blue-800"
      case "재대기": return "bg-green-100 text-green-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }
  
  // 필터 초기화 버튼 클릭 핸들러
  const resetFilters = () => {
    setSearchTerm("")
    setUnitFilter("all")
    setRankFilter("all")
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">병사 관리</h1>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchSoldiers()}>
            <RefreshCcw className="mr-2 h-4 w-4" /> 새로고침
          </Button>
          <Button variant="outline" size="sm">
            <Printer className="mr-2 h-4 w-4" /> 인쇄
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" /> 내보내기
          </Button>
          <Button onClick={() => router.push("/soldiers/new")}>
            <PlusCircle className="mr-2 h-4 w-4" /> 병사 추가
          </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>병사 목록</CardTitle>
          <CardDescription>
            부대에 소속된 병사 목록입니다. 병사를 추가, 수정, 삭제할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* 검색 및 필터 */}
          <div className="mb-6 flex items-center gap-4 flex-wrap">
            <div className="flex items-center space-x-2 flex-1 min-w-[300px]">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="이름, 군번, 보직으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>
            
            <div className="flex items-center space-x-2 flex-wrap">
              <Select value={unitFilter} onValueChange={setUnitFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="소속 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 소속</SelectItem>
                  {uniqueUnits.map(unit => (
                    <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={rankFilter} onValueChange={setRankFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="계급 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 계급</SelectItem>
                  {uniqueRanks.map(rank => (
                    <SelectItem key={rank} value={rank}>{rank}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                필터 초기화
              </Button>
            </div>
          </div>
          
          {/* 병사 테이블 */}
          {loading ? (
            <div className="text-center py-4">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" role="status">
                <span className="sr-only">로딩 중...</span>
              </div>
              <p className="mt-2">병사 목록을 불러오는 중...</p>
            </div>
          ) : error ? (
            <div className="text-center py-4 text-red-500">
              <p>{error}</p>
              <Button variant="outline" className="mt-2" onClick={fetchSoldiers}>
                다시 시도
              </Button>
            </div>
          ) : paginatedSoldiers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>표시할 병사가 없습니다.</p>
              {filteredSoldiers.length === 0 && soldiers.length > 0 ? (
                <p className="mt-2">필터 조건에 맞는 병사가 없습니다. 필터를 초기화해보세요.</p>
              ) : (
                <Button className="mt-4" onClick={() => router.push("/soldiers/new")}>
                  <PlusCircle className="mr-2 h-4 w-4" /> 병사 추가하기
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>병사 정보</TableHead>
                    <TableHead>소속</TableHead>
                    <TableHead>보직</TableHead>
                    <TableHead>건강 상태</TableHead>
                    <TableHead>입대일</TableHead>
                    <TableHead>전역 예정일</TableHead>
                    <TableHead>휴가 상태</TableHead>
                    <TableHead className="text-right">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedSoldiers.map((soldier) => (
                    <TableRow key={soldier.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={soldier.avatar} alt={soldier.name} />
                            <AvatarFallback>{soldier.name.substring(0, 1)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-semibold">{soldier.name}</div>
                            <div className="text-sm text-muted-foreground">{soldier.serialNumber}</div>
                            <div className="text-xs font-medium">{soldier.rank}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{soldier.unit}</TableCell>
                      <TableCell>{soldier.position}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {(() => {
                            const { physicalStatus, mentalStatus } = getHealthStatusDisplay(soldier);
                            return (
                              <>
                                <Badge variant="outline" className={getHealthStatusColor(physicalStatus)}>
                                  신체: {physicalStatus}
                                </Badge>
                                <Badge variant="outline" className={getMentalHealthStatusColor(mentalStatus)}>
                                  정신: {mentalStatus}
                                </Badge>
                              </>
                            );
                          })()}
                          {soldier.drivingSkill && (
                            <Badge variant="outline" className={getDrivingSkillColor(soldier.drivingSkill)}>
                              운전기량: {soldier.drivingSkill}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {soldier.enlistmentDate && !isNaN(Date.parse(soldier.enlistmentDate)) 
                          ? new Date(soldier.enlistmentDate).toLocaleDateString()
                          : "-"
                        }
                      </TableCell>
                      <TableCell>
                        {soldier.dischargeDate && !isNaN(Date.parse(soldier.dischargeDate))
                          ? new Date(soldier.dischargeDate).toLocaleDateString()
                          : "-"
                        }
                      </TableCell>
                      <TableCell>
                        {soldier.leaveStatus ? (
                          <Badge variant="outline" className={getLeaveStatusColor(soldier.leaveStatus)}>
                            {soldier.leaveStatus}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className={getLeaveStatusColor("재대기")}>
                            재대기
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push(`/soldiers/${soldier.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push(`/soldiers/${soldier.id}/edit`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteSoldier(soldier)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          
          {/* 페이지네이션 */}
          {!loading && !error && filteredSoldiers.length > 0 && (
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      // 현재 페이지 주변의 페이지만 표시
                      return page === 1 || page === totalPages || 
                        Math.abs(page - currentPage) <= 1
                    })
                    .map((page, i, arr) => {
                      // 이전 페이지와 현재 페이지 사이에 간격이 있으면 줄임표 추가
                      const showEllipsisBefore = i > 0 && arr[i - 1] !== page - 1
                      
                      return (
                        <PaginationItem key={page}>
                          {showEllipsisBefore && (
                            <PaginationEllipsis />
                          )}
                          <PaginationLink
                            isActive={page === currentPage}
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    })}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* 삭제 확인 대화상자 */}
      <AlertDialog open={soldierToDelete !== null} onOpenChange={() => setSoldierToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              {soldierToDelete && (
                <>
                  <strong>{soldierToDelete.name}</strong>({soldierToDelete.rank}) 병사의 정보를 삭제합니다. 이 작업은 되돌릴 수 없습니다.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSoldier} className="bg-red-500 hover:bg-red-600">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}