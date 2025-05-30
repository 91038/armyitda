"use client"

import React, { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { AlertCircle, Calendar, MapPin, Phone, Clock, ArrowLeft, Printer, CheckCircle, XCircle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { format } from "date-fns"

// 휴가 상태에 따른 배지 컴포넌트
const getStatusBadge = (status: string) => {
  switch (status) {
    case "승인":
      return <Badge className="bg-green-500">승인</Badge>
    case "거절":
      return <Badge className="bg-red-500">거절</Badge>
    case "대기":
      return <Badge className="bg-yellow-500">대기</Badge>
    default:
      return <Badge className="bg-gray-500">{status}</Badge>
  }
}

// 휴가 타입에 따른 배지 컴포넌트
const getTypeBadge = (type: string) => {
  switch (type) {
    case "정기휴가":
      return <Badge className="bg-blue-500">정기휴가</Badge>
    case "포상휴가":
      return <Badge className="bg-purple-500">포상휴가</Badge>
    case "청원휴가":
      return <Badge className="bg-orange-500">청원휴가</Badge>
    case "위로휴가":
      return <Badge className="bg-pink-500">위로휴가</Badge>
    default:
      return <Badge className="bg-gray-500">{type}</Badge>
  }
}

// 휴가 기간 계산 함수
const calculateDuration = (startDate: string, endDate: string) => {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffTime = Math.abs(end.getTime() - start.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
  return diffDays
}

export default function LeaveDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [leave, setLeave] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)

  // 휴가 데이터 로드
  useEffect(() => {
    const fetchLeaveData = async () => {
      setLoading(true)
      try {
        // 실제 API 호출을 대신하여 임시 데이터 사용
        setTimeout(() => {
          // Mock 데이터
          const mockLeaves = [
            {
              id: "1",
              personType: "soldier",
              person: { id: "s1", name: "김병장", rank: "병장", avatar: "/placeholder.svg", unit: "1소대" },
              type: "정기휴가",
              status: "승인",
              startDate: "2023-06-15",
              endDate: "2023-06-21",
              destination: "서울특별시 강남구",
              contact: "010-1234-5678",
              reason: "정기휴가 사용",
              approvedBy: "박대위",
              approvedAt: "2023-06-01T09:30:00",
              createdAt: "2023-05-28T14:22:00"
            },
            {
              id: "2",
              personType: "officer",
              person: { id: "o1", name: "이대위", rank: "대위", avatar: "/placeholder.svg", unit: "1중대" },
              type: "청원휴가",
              status: "대기",
              startDate: "2023-07-10",
              endDate: "2023-07-15",
              destination: "부산광역시 해운대구",
              contact: "010-9876-5432",
              reason: "가족 행사 참석",
              approvedBy: null,
              approvedAt: null,
              createdAt: "2023-06-28T10:15:00"
            },
            {
              id: "3",
              personType: "soldier",
              person: { id: "s2", name: "박일병", rank: "일병", avatar: "/placeholder.svg", unit: "2소대" },
              type: "포상휴가",
              status: "거절",
              startDate: "2023-08-05",
              endDate: "2023-08-07",
              destination: "경기도 수원시",
              contact: "010-2222-3333",
              reason: "포상휴가 사용",
              approvedBy: "최소령",
              approvedAt: "2023-07-25T16:45:00",
              rejectionReason: "부대 훈련 일정과 겹침",
              createdAt: "2023-07-20T09:10:00"
            }
          ]

          const leaveData = mockLeaves.find(item => item.id === params.id)
          
          if (leaveData) {
            setLeave(leaveData)
          } else {
            setError("휴가 정보를 찾을 수 없습니다.")
          }
          setLoading(false)
        }, 500)
      } catch (error) {
        setError("휴가 정보를 불러오는 중 오류가 발생했습니다.")
        setLoading(false)
      }
    }

    if (params.id) {
      fetchLeaveData()
    }
  }, [params.id])

  // 휴가 승인 처리
  const handleApproveLeave = () => {
    try {
      // API 호출 대신 상태 업데이트
      setLeave({
        ...leave,
        status: "승인",
        approvedBy: "현재 사용자",
        approvedAt: new Date().toISOString()
      })
      
      toast({
        title: "휴가가 승인되었습니다.",
        description: `${leave.person.name}의 휴가가 성공적으로 승인되었습니다.`,
      })
      
      setShowApproveDialog(false)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "오류 발생",
        description: "휴가 승인 중 오류가 발생했습니다.",
      })
    }
  }

  // 휴가 거절 처리
  const handleRejectLeave = () => {
    try {
      // API 호출 대신 상태 업데이트
      setLeave({
        ...leave,
        status: "거절",
        approvedBy: "현재 사용자",
        approvedAt: new Date().toISOString(),
        rejectionReason: "부대 상황에 따른 거절"
      })
      
      toast({
        title: "휴가가 거절되었습니다.",
        description: `${leave.person.name}의 휴가가 거절되었습니다.`,
      })
      
      setShowRejectDialog(false)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "오류 발생",
        description: "휴가 거절 중 오류가 발생했습니다.",
      })
    }
  }

  // 날짜 포맷팅 함수
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "yyyy년 MM월 dd일")
    } catch (error) {
      return dateString
    }
  }

  // 날짜시간 포맷팅 함수
  const formatDateTime = (dateString: string) => {
    if (!dateString) return "-"
    try {
      return format(new Date(dateString), "yyyy년 MM월 dd일 HH:mm")
    } catch (error) {
      return dateString
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <p>휴가 정보를 불러오는 중...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Button onClick={() => router.push("/leaves")} variant="ghost" className="flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> 휴가 목록으로 돌아가기
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!leave) {
    return (
      <div className="space-y-6">
        <Button onClick={() => router.push("/leaves")} variant="ghost" className="flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> 휴가 목록으로 돌아가기
        </Button>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>찾을 수 없음</AlertTitle>
          <AlertDescription>요청하신 휴가 정보를 찾을 수 없습니다.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button onClick={() => router.push("/leaves")} variant="ghost" className="flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> 휴가 목록으로 돌아가기
        </Button>
        <div className="flex items-center gap-2">
          {leave.status === "대기" && (
            <>
              <Button 
                onClick={() => setShowApproveDialog(true)} 
                variant="outline" 
                className="flex items-center gap-1 text-green-600 border-green-600 hover:bg-green-50"
              >
                <CheckCircle className="h-4 w-4" /> 휴가 승인
              </Button>
              <Button 
                onClick={() => setShowRejectDialog(true)} 
                variant="outline" 
                className="flex items-center gap-1 text-red-600 border-red-600 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4" /> 휴가 거절
              </Button>
            </>
          )}
          <Button variant="outline" className="flex items-center gap-1">
            <Printer className="h-4 w-4" /> 인쇄
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-2xl font-bold">휴가 상세 정보</CardTitle>
              <CardDescription>
                휴가 ID: {leave.id} | 생성일: {formatDateTime(leave.createdAt)}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {getTypeBadge(leave.type)}
              {getStatusBadge(leave.status)}
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={leave.person.avatar} alt={leave.person.name} />
                    <AvatarFallback>{leave.person.name.substring(0, 1)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-semibold">{leave.person.name}</h3>
                    <p className="text-gray-500">{leave.person.rank} | {leave.person.unit}</p>
                    <p className="text-sm text-gray-500">{leave.personType === "soldier" ? "병사" : "간부"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">휴가 유형</p>
                    <p className="text-base">{leave.type}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">휴가 상태</p>
                    <p className="text-base">{leave.status}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500">휴가 사유</p>
                  <p className="text-base">{leave.reason || "-"}</p>
                </div>

                {leave.status === "거절" && leave.rejectionReason && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>거절 사유</AlertTitle>
                    <AlertDescription>{leave.rejectionReason}</AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">휴가 기간</p>
                    <p className="text-base">
                      {formatDate(leave.startDate)} ~ {formatDate(leave.endDate)}
                    </p>
                    <p className="text-sm text-gray-500">
                      총 {calculateDuration(leave.startDate, leave.endDate)}일
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">휴가 장소</p>
                    <p className="text-base">{leave.destination || "-"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">연락처</p>
                    <p className="text-base">{leave.contact || "-"}</p>
                  </div>
                </div>

                {leave.status !== "대기" && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">{leave.status === "승인" ? "승인" : "거절"} 정보</p>
                      <p className="text-base">
                        처리자: {leave.approvedBy || "-"}
                      </p>
                      <p className="text-sm text-gray-500">
                        처리일시: {formatDateTime(leave.approvedAt) || "-"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 승인 확인 다이얼로그 */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>휴가 승인 확인</DialogTitle>
            <DialogDescription>
              {leave.person.name}의 휴가를 승인하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p><strong>휴가 유형:</strong> {leave.type}</p>
            <p><strong>휴가 기간:</strong> {formatDate(leave.startDate)} ~ {formatDate(leave.endDate)}</p>
            <p><strong>휴가 장소:</strong> {leave.destination}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>취소</Button>
            <Button onClick={handleApproveLeave}>승인</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 거절 확인 다이얼로그 */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>휴가 거절 확인</DialogTitle>
            <DialogDescription>
              {leave.person.name}의 휴가를 거절하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p><strong>휴가 유형:</strong> {leave.type}</p>
            <p><strong>휴가 기간:</strong> {formatDate(leave.startDate)} ~ {formatDate(leave.endDate)}</p>
            <p><strong>휴가 장소:</strong> {leave.destination}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>취소</Button>
            <Button variant="destructive" onClick={handleRejectLeave}>거절</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 