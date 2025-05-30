"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatNumber } from "@/lib/utils"
import { Activity, ArrowRight, Clock, User, Users, Shield, FileText, Truck, Bell, UserCog, ExternalLink } from "lucide-react"
import { useState, useEffect } from "react"
import { format } from "date-fns"
import { getSoldiers } from "@/lib/api/soldiers"
import { getOfficers } from "@/lib/api/officers"
import { getDispatchesByDate, getDispatchesWithDetails } from "@/lib/api/dispatches"
import { getArmyNotices, NoticeItem } from "@/lib/api/notices"
import { Soldier, Officer, Dispatch, ExtendedDispatch } from "@/types"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

export default function DashboardPage() {
  const [soldiers, setSoldiers] = useState<Soldier[]>([])
  const [officers, setOfficers] = useState<Officer[]>([])
  const [dispatches, setDispatches] = useState<ExtendedDispatch[]>([])
  const [notices, setNotices] = useState<NoticeItem[]>([])
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
        return "bg-blue-100 text-blue-800"
      case "대기 중":
      case "예정":
        return "bg-green-100 text-green-800"
      case "정상":
      case "완료":
        return "bg-green-100 text-green-800"
      case "점검 중":
        return "bg-yellow-100 text-yellow-800"
      case "취소":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  // 실시간 업데이트된 날짜/시간 표시
  const currentDate = format(new Date(), "yyyy년 MM월 dd일")

  return (
    <div className="space-y-8">
      <div className="bg-gray-100 -mx-6 -mt-6 px-6 py-8 border-b">
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <Shield className="mr-3 h-8 w-8 text-green-700" />
          부대 현황 대시보드
        </h1>
        <p className="text-muted-foreground mt-2">
          부대 현황 및 주요 정보를 한눈에 확인할 수 있습니다.
        </p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center">
              <Users className="mr-2 h-4 w-4" />
              병사 총인원
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="text-3xl font-bold text-blue-600">{isLoading ? "로딩 중..." : formatNumber(soldiers.length)}</div>
              <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-md">병사</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center">
              <UserCog className="mr-2 h-4 w-4" />
              간부 총인원
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="text-3xl font-bold text-green-600">{isLoading ? "로딩 중..." : formatNumber(officers.length)}</div>
              <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-md">간부</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center">
              <Activity className="mr-2 h-4 w-4" />
              훈련 중
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="text-3xl font-bold text-yellow-600">10</div>
              <span className="ml-2 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-md">임무 중</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-3">
          <CardHeader className="bg-gray-50 border-b">
            <CardTitle className="flex items-center text-lg">
              <FileText className="mr-2 h-5 w-5 text-green-600" />
              부대 임무 현황
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">임무명</th>
                  <th className="px-4 py-3 text-left">담당</th>
                  <th className="px-4 py-3 text-left">진행상황</th>
                  <th className="px-4 py-3 text-left">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[
                  { id: 1, title: "경계 작전", personnel: "1소대", progress: "진행 중", status: "정상" },
                  { id: 2, title: "팀 훈련", personnel: "2소대", progress: "오늘 시작", status: "정상" },
                  { id: 3, title: "부대 점검", personnel: "3소대", progress: "내일 예정", status: "대기 중" },
                  { id: 4, title: "인사기록 정리", personnel: "행정과", progress: "80% 완료", status: "진행 중" },
                  { id: 5, title: "차량 정비", personnel: "수송과", progress: "금일 완료 예정", status: "진행 중" },
                ].map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{task.title}</td>
                    <td className="px-4 py-3 text-sm">{task.personnel}</td>
                    <td className="px-4 py-3 text-sm">{task.progress}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${
                          task.status === "정상"
                            ? "bg-green-100 text-green-800"
                            : task.status === "진행 중"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {task.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="bg-gray-50 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center text-lg">
              <Truck className="mr-2 h-5 w-5 text-purple-600" />
              오늘의 배차 현황
            </CardTitle>
            <Link href="/dispatch" className="flex items-center text-sm text-blue-600 hover:underline">
              전체보기 <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
          <CardDescription>{currentDate} 기준</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center p-8">
              <p>데이터를 불러오는 중...</p>
            </div>
          ) : dispatches.length === 0 ? (
            <div className="flex justify-center items-center p-8 text-gray-500">
              <p>오늘 예정된 배차 정보가 없습니다.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">시간</th>
                  <th className="px-4 py-3 text-left">차량</th>
                  <th className="px-4 py-3 text-left">운전병</th>
                  <th className="px-4 py-3 text-left">선탑자</th>
                  <th className="px-4 py-3 text-left">목적지</th>
                  <th className="px-4 py-3 text-left">목적</th>
                  <th className="px-4 py-3 text-left">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {dispatches.map((dispatch) => (
                  <tr key={dispatch.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{dispatch.startTime} ~ {dispatch.endTime}</td>
                    <td className="px-4 py-3 text-sm">
                      {dispatch.vehicleInfo 
                        ? `${dispatch.vehicleInfo.type} ${dispatch.vehicleInfo.number}` 
                        : "군용차량"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {dispatch.driverInfo 
                        ? `${dispatch.driverInfo.rank} ${dispatch.driverInfo.name}` 
                        : "운전병"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {dispatch.officerInfo 
                        ? `${dispatch.officerInfo.rank} ${dispatch.officerInfo.name}` 
                        : "선탑자"}
                    </td>
                    <td className="px-4 py-3 text-sm">{dispatch.destination}</td>
                    <td className="px-4 py-3 text-sm">{dispatch.purpose}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(dispatch.status)}`}>
                        {dispatch.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
        
      <Card>
        <CardHeader className="bg-gray-50 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center text-lg">
              <Bell className="mr-2 h-5 w-5 text-red-600" />
              육군 공지사항
            </CardTitle>
            <a 
              href="https://www.army.mil.kr/army/24/subview.do" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center text-sm text-blue-600 hover:underline"
            >
              전체보기 <ExternalLink className="ml-1 h-4 w-4" />
            </a>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {noticesLoading ? (
            <div className="flex justify-center items-center p-8">
              <p>공지사항을 불러오는 중...</p>
            </div>
          ) : notices.length === 0 ? (
            <div className="flex justify-center items-center p-8 text-gray-500">
              <p>공지사항이 없습니다.</p>
            </div>
          ) : (
            <div className="divide-y">
              {notices.map((notice) => (
                <a 
                  key={notice.id} 
                  href={notice.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex p-4 hover:bg-gray-50"
                >
                  <div className="w-full">
                    <div className="flex justify-between mb-2">
                      <div className="font-medium flex items-center">
                        <Badge className="mr-2" variant="outline">{notice.category}</Badge>
                        {notice.title}
                        {notice.isNew && (
                          <Badge className="ml-2" variant="secondary">새글</Badge>
                        )}
                      </div>
                      <span className="text-sm text-gray-500">{notice.date}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>{notice.author}</span>
                      <div className="flex items-center">
                        <span className="mr-2">조회: {notice.views}</span>
                        {notice.hasAttachment && (
                          <span className="text-xs bg-gray-100 px-1 py-0.5 rounded">첨부파일</span>
                        )}
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}