"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { useRouter } from "next/navigation"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter 
} from "@/components/ui/card"
import { 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from "recharts"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { 
  BarChart3, 
  Users, 
  Calendar, 
  AlertCircle, 
  TrendingUp, 
  Clock,
  Download,
  Printer,
  Filter,
  UserCog,
  Car,
  Bell,
  CheckCircle2,
  Clock3,
  XCircle,
  ChevronRight,
  ExternalLink
} from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getSoldiers } from "@/lib/api/soldiers"
import { getOfficers } from "@/lib/api/officers"
import { getDispatchesByDate, getDispatchesWithDetails } from "@/lib/api/dispatches"
import { getArmyNotices, NoticeItem } from "@/lib/api/notices"
import { getCurrentLeaves } from "@/lib/api/leaves"
import { Soldier, Officer, Dispatch, ExtendedDispatch, Leave } from "@/types"

export default function DashboardPage() {
  const router = useRouter()
  const [soldiers, setSoldiers] = useState<Soldier[]>([])
  const [officers, setOfficers] = useState<Officer[]>([])
  const [dispatches, setDispatches] = useState<ExtendedDispatch[]>([])
  const [notices, setNotices] = useState<NoticeItem[]>([])
  const [currentLeaves, setCurrentLeaves] = useState<Leave[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [noticesLoading, setNoticesLoading] = useState(true)

  // 실제 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        // 병사 데이터 로드
        const soldiersResponse = await getSoldiers()
        if (soldiersResponse.success && soldiersResponse.data) {
          setSoldiers(soldiersResponse.data)
        }

        // 간부 데이터 로드
        const officersResponse = await getOfficers()
        if (officersResponse.success && officersResponse.data) {
          setOfficers(officersResponse.data)
        }

        // 오늘 날짜 배차 로드 (상세 정보 포함)
        const today = format(new Date(), "yyyy-MM-dd")
        const dispatchesResponse = await getDispatchesWithDetails(today)
        if (dispatchesResponse.success && dispatchesResponse.data) {
          // 시간순으로 정렬
          const sortedDispatches = dispatchesResponse.data.sort((a, b) => {
            return a.startTime.localeCompare(b.startTime)
          })
          setDispatches(sortedDispatches)
        }
        
        // 현재 휴가 중인 인원 로드
        const leavesResponse = await getCurrentLeaves()
        if (leavesResponse.success && leavesResponse.data) {
          console.log("현재 휴가 중인 인원 로드 성공:", leavesResponse.data.length)
          setCurrentLeaves(leavesResponse.data)
        } else {
          console.error("현재 휴가 중인 인원 로드 실패:", leavesResponse.error)
        }
      } catch (error) {
        console.error("대시보드 데이터 로드 오류:", error)
      } finally {
        setIsLoading(false)
      }
    }

    // 육군 공지사항 로드
    const loadNotices = async () => {
      setNoticesLoading(true)
      try {
        const response = await getArmyNotices()
        if (response.success && response.data) {
          setNotices(response.data)
        }
      } catch (error) {
        console.error("육군 공지사항 로드 오류:", error)
      } finally {
        setNoticesLoading(false)
      }
    }

    loadData()
    loadNotices()
  }, [])

  // 배차/임무 상태에 따른 뱃지 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case "운행 중":
      case "진행중":
        return "warning"
      case "대기 중":
      case "예정":
        return "secondary"
      case "정상":
      case "완료":
        return "success"
      case "점검 중":
        return "outline"
      case "취소":
        return "destructive"
      default:
        return "default"
    }
  }

  // 실시간 업데이트된 날짜/시간 표시
  const currentDate = format(new Date(), "yyyy년 MM월 dd일")

  // 현재 휴가 중인 인원 수 계산
  const soldierOnLeave = currentLeaves.filter(leave => leave.personType === "soldier").length
  const officerOnLeave = currentLeaves.filter(leave => leave.personType === "officer").length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">부대 현황 대시보드</h1>
          <p className="text-muted-foreground">부대 현황 및 주요 정보를 한눈에 확인할 수 있습니다.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" /> 필터
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" /> 내보내기
          </Button>
          <Button variant="outline" size="sm">
            <Printer className="mr-2 h-4 w-4" /> 인쇄
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {/* 인원 현황 - 실제 데이터 사용 */}
        <Card className="col-span-2">
          <CardHeader className="pb-2">
            <CardTitle>인원 현황</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-2">
                  <div className="text-3xl font-bold">{soldiers.length}</div>
                  <p className="text-sm text-muted-foreground">병사 총인원</p>
                  {soldierOnLeave > 0 ? (
                    <Badge variant="outline" className="bg-blue-100 text-blue-800">
                      휴가 중: {soldierOnLeave}명
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-gray-100 text-gray-800">
                      휴가자 없음
                    </Badge>
                  )}
                </div>
                <div className="rounded-full p-2 bg-blue-100 text-blue-700">
                  <Users className="h-6 w-6" />
                </div>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-2">
                  <div className="text-3xl font-bold">{officers.length}</div>
                  <p className="text-sm text-muted-foreground">간부 총인원</p>
                  {officerOnLeave > 0 ? (
                    <Badge variant="outline" className="bg-blue-100 text-blue-800">
                      휴가 중: {officerOnLeave}명
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-gray-100 text-gray-800">
                      휴가자 없음
                    </Badge>
                  )}
                </div>
                <div className="rounded-full p-2 bg-green-100 text-green-700">
                  <UserCog className="h-6 w-6" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 휴가 인원 카드 추가 */}
        <Card className="col-span-1">
          <CardHeader className="pb-2">
            <CardTitle>휴가 현황</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-2">
                <div className="text-3xl font-bold">{currentLeaves.length}</div>
                <p className="text-sm text-muted-foreground">현재 휴가 인원</p>
                <div className="flex gap-2">
                  <Badge variant="outline" className="bg-blue-100 text-blue-800">
                    병사: {soldierOnLeave}명
                  </Badge>
                  <Badge variant="outline" className="bg-green-100 text-green-800">
                    간부: {officerOnLeave}명
                  </Badge>
                </div>
              </div>
              <div className="rounded-full p-2 bg-yellow-100 text-yellow-700">
                <Calendar className="h-6 w-6" />
              </div>
            </div>
            <Button variant="link" size="sm" className="mt-2 w-full" onClick={() => router.push("/leaves")}>
              휴가 관리 바로가기 <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </CardContent>
        </Card>

        {/* 정신건강 관심 병사 인원 */}
        <Card className="col-span-1">
          <CardHeader className="pb-2">
            <CardTitle>건강 관심 인원</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-2">
                <div className="text-3xl font-bold">
                  {(() => {
                    // 건강상태 미실시 인원 계산
                    const untestedCount = soldiers.filter(s => 
                      (!s.physicalHealthStatus && !s.latestPhysicalTestDate) ||
                      (!s.mentalHealthStatus && !s.latestTestDate)
                    ).length;
                    
                    // 이상 상태 인원 계산
                    const abnormalCount = soldiers.filter(s => 
                      s.physicalHealthStatus === "이상" || s.mentalHealthStatus === "이상"
                    ).length;
                    
                    return untestedCount + abnormalCount;
                  })()}
                </div>
                <p className="text-sm text-muted-foreground">관심 필요 인원</p>
                <div className="flex flex-col gap-1">
                  {(() => {
                    const untestedCount = soldiers.filter(s => 
                      (!s.physicalHealthStatus && !s.latestPhysicalTestDate) ||
                      (!s.mentalHealthStatus && !s.latestTestDate)
                    ).length;
                    
                    const abnormalCount = soldiers.filter(s => 
                      s.physicalHealthStatus === "이상" || s.mentalHealthStatus === "이상"
                    ).length;
                    
                    return (
                      <>
                        {untestedCount > 0 && (
                          <Badge variant="outline" className="bg-gray-100 text-gray-600">
                            건강상태 미실시: {untestedCount}명
                          </Badge>
                        )}
                        {abnormalCount > 0 && (
                          <Badge variant="outline" className="bg-red-100 text-red-800">
                            건강상태 이상: {abnormalCount}명
                          </Badge>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
              <div className="rounded-full p-2 bg-red-100 text-red-700">
                <AlertCircle className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 오늘의 배차 현황 - 실제 데이터 사용 */}
        <Card className="col-span-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>오늘의 배차 현황</CardTitle>
              <CardDescription>{currentDate} 기준</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="gap-1">
              전체보기 <ChevronRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">데이터를 불러오는 중...</div>
            ) : dispatches.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                오늘 예정된 배차 정보가 없습니다.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>시간</TableHead>
                    <TableHead>차량</TableHead>
                    <TableHead>운전병</TableHead>
                    <TableHead>선탑자</TableHead>
                    <TableHead>목적지</TableHead>
                    <TableHead>목적</TableHead>
                    <TableHead>상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dispatches.map((dispatch) => (
                    <TableRow key={dispatch.id}>
                      <TableCell className="font-medium">{dispatch.startTime} ~ {dispatch.endTime}</TableCell>
                      <TableCell>
                        {dispatch.vehicleInfo 
                          ? `${dispatch.vehicleInfo.type} ${dispatch.vehicleInfo.number}` 
                          : "군용차량"}
                      </TableCell>
                      <TableCell>
                        {dispatch.driverInfo 
                          ? `${dispatch.driverInfo.rank} ${dispatch.driverInfo.name}` 
                          : "운전병"}
                      </TableCell>
                      <TableCell>
                        {dispatch.officerInfo 
                          ? `${dispatch.officerInfo.rank} ${dispatch.officerInfo.name}` 
                          : "선탑자"}
                      </TableCell>
                      <TableCell>{dispatch.destination}</TableCell>
                      <TableCell>{dispatch.purpose}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(dispatch.status)}>
                          {dispatch.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* 육군 공지사항 카드 추가 */}
        <Card className="col-span-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>육군 공지사항</CardTitle>
              <CardDescription>육군 홈페이지에서 제공하는 공지사항</CardDescription>
            </div>
            <a 
              href="https://www.army.mil.kr/army/24/subview.do" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center text-sm text-blue-600 hover:underline"
            >
              전체보기 <ExternalLink className="ml-1 h-4 w-4" />
            </a>
          </CardHeader>
          <CardContent>
            {noticesLoading ? (
              <div className="text-center py-8">공지사항을 불러오는 중...</div>
            ) : notices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                공지사항이 없습니다.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>분류</TableHead>
                    <TableHead className="w-[400px]">제목</TableHead>
                    <TableHead>작성자</TableHead>
                    <TableHead>작성일</TableHead>
                    <TableHead>조회</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notices.map((notice) => (
                    <TableRow key={notice.id}>
                      <TableCell>
                        <Badge variant="outline">{notice.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <a 
                          href={notice.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="font-medium hover:underline flex items-center"
                        >
                          {notice.title}
                          {notice.isNew && (
                            <Badge className="ml-2" variant="secondary">New</Badge>
                          )}
                          {notice.hasAttachment && (
                            <span className="text-xs bg-gray-100 px-1 py-0.5 rounded ml-2">첨부</span>
                          )}
                        </a>
                      </TableCell>
                      <TableCell>{notice.author}</TableCell>
                      <TableCell>{notice.date}</TableCell>
                      <TableCell>{notice.views}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 
 