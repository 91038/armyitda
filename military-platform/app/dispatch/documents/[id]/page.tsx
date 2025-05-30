"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { getDispatchDocument, getDispatch } from "@/lib/api/dispatches"
import { getVehicle } from "@/lib/api/vehicles"
import { getSoldier } from "@/lib/api/soldiers"
import { getOfficer } from "@/lib/api/officers"
import { DispatchDocument, Dispatch, Vehicle, Soldier, Officer } from "@/types"
import { toast } from "@/components/ui/use-toast"
import { ArrowLeft, Printer, Loader2 } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, 
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter, 
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger 
} from "@/components/ui/alert-dialog"

export default function DispatchDocumentDetailPage() {
  const router = useRouter()
  const params = useParams()
  
  const documentId = params.id as string
  
  const [document, setDocument] = useState<DispatchDocument | null>(null)
  const [dispatches, setDispatches] = useState<Array<{
    dispatch: Dispatch
    vehicle: Vehicle | null
    driver: Soldier | null
    officer: Officer | null
  }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const printRef = useRef<HTMLDivElement>(null)
  
  // 문서 상세 정보 로드
  const loadDocument = async () => {
    setIsLoading(true)
    try {
      // 문서 정보 가져오기
      const docResponse = await getDispatchDocument(documentId)
      
      if (!docResponse.success || !docResponse.data) {
        toast({
          title: "오류",
          description: docResponse.error || "배차지시서를 불러올 수 없습니다.",
          variant: "destructive",
        })
        router.push("/dispatch/documents")
        return
      }
      
      setDocument(docResponse.data)
      
      // 문서에 포함된 배차 정보 가져오기
      const dispatchesData = []
      
      for (const dispatchId of docResponse.data.dispatchIds) {
        const dispatchResponse = await getDispatch(dispatchId)
        
        if (dispatchResponse.success && dispatchResponse.data) {
          const dispatch = dispatchResponse.data
          
          // 차량 정보 가져오기
          let vehicle = null
          const vehicleResponse = await getVehicle(dispatch.vehicleId)
          if (vehicleResponse.success && vehicleResponse.data) {
            vehicle = vehicleResponse.data
          }
          
          // 운전병 정보 가져오기
          let driver = null
          const driverResponse = await getSoldier(dispatch.driverId)
          if (driverResponse.success && driverResponse.data) {
            driver = driverResponse.data
          }
          
          // 간부 정보 가져오기
          let officer = null
          const officerResponse = await getOfficer(dispatch.officerId)
          if (officerResponse.success && officerResponse.data) {
            officer = officerResponse.data
          }
          
          dispatchesData.push({
            dispatch,
            vehicle,
            driver,
            officer
          })
        }
      }
      
      // 시작 시간 기준으로 정렬
      dispatchesData.sort((a, b) => {
        return a.dispatch.startTime.localeCompare(b.dispatch.startTime)
      })
      
      setDispatches(dispatchesData)
      
    } catch (error) {
      console.error("배차지시서 상세 정보 로드 오류:", error)
      toast({
        title: "오류",
        description: "배차지시서 상세 정보를 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  // 초기 데이터 로드
  useEffect(() => {
    if (documentId) {
      loadDocument()
    }
  }, [documentId])
  
  // 인쇄 미리보기로 이동
  const handlePrint = () => {
    if (!printRef.current) {
      toast({
        title: "인쇄 오류",
        description: "인쇄할 내용을 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
      return
    }
    
    try {
      // 인쇄용 스타일 적용 및 내용 변경
      const printFrame = window.document.createElement('iframe')
      printFrame.style.position = 'absolute'
      printFrame.style.top = '-9999px'
      printFrame.style.left = '-9999px'
      window.document.body.appendChild(printFrame)
      
      const printDocument = printFrame.contentDocument || printFrame.contentWindow?.document
      
      if (printDocument) {
        printDocument.open()
        printDocument.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>배차지시서 인쇄</title>
              <style>
                @page {
                  size: A4;
                  margin: 1cm;
                }
                body {
                  font-family: 'Malgun Gothic', sans-serif;
                  margin: 0;
                  padding: 0;
                  color: #000;
                  background: #fff;
                }
                .container {
                  padding: 20px;
                  max-width: 190mm;
                  margin: 0 auto;
                  box-sizing: border-box;
                }
                table {
                  width: 100%;
                  border-collapse: collapse;
                  margin-bottom: 20px;
                  page-break-inside: auto;
                }
                tr {
                  page-break-inside: avoid;
                  page-break-after: auto;
                }
                th, td {
                  border: 1px solid #000;
                  padding: 6px;
                  text-align: center;
                  font-size: 11px;
                }
                th {
                  background-color: #f0f0f0;
                  font-weight: bold;
                }
                h1 {
                  text-align: center;
                  font-size: 24px;
                  font-weight: bold;
                  margin-bottom: 10px;
                  letter-spacing: 5px;
                }
                h2 {
                  font-size: 16px;
                  margin-top: 20px;
                  margin-bottom: 10px;
                  padding-bottom: 5px;
                  border-bottom: 1px solid #000;
                  font-weight: bold;
                }
                .header {
                  text-align: center;
                  margin-bottom: 30px;
                  padding-bottom: 15px;
                  border-bottom: 2px solid #000;
                }
                .document-info {
                  display: flex;
                  justify-content: space-between;
                  background-color: #f9f9f9;
                  border: 1px solid #000;
                  padding: 10px;
                  margin-bottom: 20px;
                  font-size: 12px;
                }
                .footer {
                  text-align: right;
                  margin-top: 40px;
                }
                .signature {
                  margin-top: 30px;
                }
                .stamp {
                  display: inline-block;
                  width: 80px;
                  height: 80px;
                  border: 2px solid #000;
                  border-radius: 50%;
                  text-align: center;
                  line-height: 80px;
                  margin-top: 10px;
                }
                .notes {
                  border: 1px solid #000;
                  padding: 15px;
                  min-height: 100px;
                }
                /* 추가 스타일 */
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .text-3xl { font-size: 24px; }
                .text-lg { font-size: 16px; }
                .text-sm { font-size: 12px; }
                .font-bold { font-weight: bold; }
                .tracking-wider { letter-spacing: 2px; }
                .mb-2 { margin-bottom: 8px; }
                .mb-3 { margin-bottom: 12px; }
                .mb-8 { margin-bottom: 32px; }
                .mt-2 { margin-top: 8px; }
                .mt-8 { margin-top: 32px; }
                .mt-10 { margin-top: 40px; }
                .pb-2 { padding-bottom: 8px; }
                .pb-4 { padding-bottom: 16px; }
                .p-3 { padding: 12px; }
                .p-4 { padding: 16px; }
                .border-b { border-bottom: 1px solid #000; }
                .border-b-2 { border-bottom: 2px solid #000; }
                .border { border: 1px solid #000; }
                .min-h-24 { min-height: 96px; }
                .flex { display: flex; }
                .items-center { align-items: center; }
                .justify-between { justify-content: space-between; }
                .bg-gray-50 { background-color: #f9f9f9; }
                .mr-2 { margin-right: 8px; }
                .font-semibold { font-weight: 600; }
                .inline-block { display: inline-block; }
                .w-20 { width: 80px; }
                .h-20 { height: 80px; }
                .leading-\\[4\\.5rem\\] { line-height: 4.5rem; }
                .border-2 { border-width: 2px; }
                .border-gray-800 { border-color: #2d3748; }
                .rounded-full { border-radius: 9999px; }
                .list-disc { list-style-type: disc; }
                .pl-5 { padding-left: 20px; }
                .text-gray-500 { color: #718096; }
                .text-gray-600 { color: #4a5568; }
              </style>
            </head>
            <body>
              <div class="container">
                ${printRef.current.innerHTML}
              </div>
            </body>
          </html>
        `)
        printDocument.close()
        
        // 인쇄
        printFrame.contentWindow?.focus()
        setTimeout(() => {
          printFrame.contentWindow?.print()
          
          // 인쇄 후 프레임 제거
          setTimeout(() => {
            window.document.body.removeChild(printFrame)
          }, 100)
        }, 500)
      }
    } catch (error) {
      console.error('인쇄 오류:', error)
      toast({
        title: "인쇄 실패",
        description: "인쇄를 준비하는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }
  
  // 상태에 따른 뱃지 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case "예정":
        return "secondary"
      case "진행중":
        return "warning"
      case "완료":
        return "success"
      case "취소":
        return "destructive"
      default:
        return "default"
    }
  }
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin mb-2" />
          <p>배차지시서 정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">배차지시서 상세</h1>
          <p className="text-muted-foreground">
            배차지시서 상세 정보를 확인합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => router.push("/dispatch/documents")} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> 목록으로 돌아가기
          </Button>
          <Button onClick={handlePrint} variant="secondary">
            <Printer className="mr-2 h-4 w-4" /> 인쇄 미리보기
          </Button>
        </div>
      </div>
      
      {document && (
        <Card>
          <CardHeader>
            <CardTitle>배차지시서 #{document.documentNumber}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-sm font-medium">부대명</p>
                <p>{document.unitName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">날짜</p>
                <p>{document.date}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">작성자</p>
                <p>{document.creator}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">지휘관</p>
                <p>{document.commanderName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">생성일시</p>
                <p>
                  {document.createdAt instanceof Date
                    ? format(document.createdAt, 'yyyy-MM-dd HH:mm:ss')
                    : format(new Date(document.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">포함된 배차</p>
                <p>{document.dispatchIds.length}건</p>
              </div>
            </div>
            
            {document.additionalNotes && (
              <div className="pt-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">참고사항</p>
                  <p className="whitespace-pre-line">{document.additionalNotes}</p>
                </div>
              </div>
            )}
            
            <Separator className="my-4" />
            
            <h3 className="text-lg font-semibold px-6">배차 목록</h3>
            
            {dispatches.length === 0 ? (
              <div className="p-4 border rounded-md text-center text-muted-foreground">
                포함된 배차 정보가 없습니다.
              </div>
            ) : (
              <CardContent>
                {/* 고정 배차 섹션 */}
                {dispatches.some(item => item.dispatch.isFixedRoute) && (
                  <>
                    <h4 className="text-base font-medium mb-3">고정 배차</h4>
                    <Table className="border mb-6">
                      <TableHeader>
                        <TableRow>
                          <TableHead>시간</TableHead>
                          <TableHead>차량</TableHead>
                          <TableHead>운전병</TableHead>
                          <TableHead>선탑자</TableHead>
                          <TableHead>목적지</TableHead>
                          <TableHead>목적</TableHead>
                          <TableHead>인원</TableHead>
                          <TableHead>상태</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dispatches
                          .filter(item => item.dispatch.isFixedRoute)
                          .map(({ dispatch, vehicle, driver, officer }) => (
                            <TableRow key={dispatch.id}>
                              <TableCell>
                                {dispatch.startTime} ~ {dispatch.endTime}
                              </TableCell>
                              <TableCell>
                                {vehicle ? (
                                  <div>
                                    <div>{vehicle.vehicleName}</div>
                                    <div className="text-xs text-muted-foreground">{vehicle.vehicleNumber}</div>
                                  </div>
                                ) : (
                                  "데이터 없음"
                                )}
                              </TableCell>
                              <TableCell>
                                {driver ? (
                                  <div>
                                    <div>{driver.name}</div>
                                    <div className="text-xs text-muted-foreground">{driver.rank}</div>
                                  </div>
                                ) : (
                                  "데이터 없음"
                                )}
                              </TableCell>
                              <TableCell>
                                {officer ? (
                                  <div>
                                    <div>{officer.name}</div>
                                    <div className="text-xs text-muted-foreground">{officer.rank}</div>
                                  </div>
                                ) : (
                                  "데이터 없음"
                                )}
                              </TableCell>
                              <TableCell>{dispatch.destination}</TableCell>
                              <TableCell>{dispatch.purpose}</TableCell>
                              <TableCell className="text-center">{dispatch.passengerCount}명</TableCell>
                              <TableCell>
                                <Badge variant={getStatusColor(dispatch.status)}>
                                  {dispatch.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </>
                )}
                
                {/* 일반 배차 섹션 */}
                {dispatches.some(item => !item.dispatch.isFixedRoute) && (
                  <>
                    <h4 className="text-base font-medium mb-3">일반 배차</h4>
                    <Table className="border">
                      <TableHeader>
                        <TableRow>
                          <TableHead>시간</TableHead>
                          <TableHead>차량</TableHead>
                          <TableHead>운전병</TableHead>
                          <TableHead>선탑자</TableHead>
                          <TableHead>목적지</TableHead>
                          <TableHead>목적</TableHead>
                          <TableHead>인원</TableHead>
                          <TableHead>상태</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dispatches
                          .filter(item => !item.dispatch.isFixedRoute)
                          .map(({ dispatch, vehicle, driver, officer }) => (
                            <TableRow key={dispatch.id}>
                              <TableCell>
                                {dispatch.startTime} ~ {dispatch.endTime}
                              </TableCell>
                              <TableCell>
                                {vehicle ? (
                                  <div>
                                    <div>{vehicle.vehicleName}</div>
                                    <div className="text-xs text-muted-foreground">{vehicle.vehicleNumber}</div>
                                  </div>
                                ) : (
                                  "데이터 없음"
                                )}
                              </TableCell>
                              <TableCell>
                                {driver ? (
                                  <div>
                                    <div>{driver.name}</div>
                                    <div className="text-xs text-muted-foreground">{driver.rank}</div>
                                  </div>
                                ) : (
                                  "데이터 없음"
                                )}
                              </TableCell>
                              <TableCell>
                                {officer ? (
                                  <div>
                                    <div>{officer.name}</div>
                                    <div className="text-xs text-muted-foreground">{officer.rank}</div>
                                  </div>
                                ) : (
                                  "데이터 없음"
                                )}
                              </TableCell>
                              <TableCell>{dispatch.destination}</TableCell>
                              <TableCell>{dispatch.purpose}</TableCell>
                              <TableCell className="text-center">{dispatch.passengerCount}명</TableCell>
                              <TableCell>
                                <Badge variant={getStatusColor(dispatch.status)}>
                                  {dispatch.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </>
                )}
              </CardContent>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* 인쇄/PDF용 숨겨진 컨텐츠 영역 추가 */}
      <div className="hidden">
        <div ref={printRef} id="print-content" className="p-8">
          {/* 인쇄용 배차지시서 컨텐츠 */}
          {document && (
            <>
              <div className="text-center mb-8 border-b-2 border-gray-800 pb-4">
                <h1 className="text-3xl font-bold tracking-wider mb-2">배 차 지 시 서</h1>
                <div className="text-sm text-gray-600">문서번호: {document.documentNumber}</div>
              </div>

              <div className="flex justify-between items-center bg-gray-50 border p-3 mb-8 text-sm">
                <div className="flex items-center">
                  <div className="font-semibold mr-2">부대명:</div>
                  <div>{document.unitName}</div>
                </div>
                <div className="flex items-center">
                  <div className="font-semibold mr-2">작성일자:</div>
                  <div>{document.date || format(new Date(), 'yyyy년 MM월 dd일')}</div>
                </div>
                <div className="flex items-center">
                  <div className="font-semibold mr-2">작성자:</div>
                  <div>{document.creator}</div>
                </div>
              </div>

              {/* 고정 배차 테이블 */}
              {dispatches.some(item => item.dispatch.isFixedRoute) && (
                <>
                  <h2 className="text-lg font-bold mb-3 pb-2 border-b">고정 배차</h2>
                  <table className="w-full border-collapse mb-8">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border px-3 py-2 text-sm">시간</th>
                        <th className="border px-3 py-2 text-sm">차량번호</th>
                        <th className="border px-3 py-2 text-sm">차종</th>
                        <th className="border px-3 py-2 text-sm">운전병</th>
                        <th className="border px-3 py-2 text-sm">목적지</th>
                        <th className="border px-3 py-2 text-sm">용도</th>
                        <th className="border px-3 py-2 text-sm">선탑자</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dispatches
                        .filter(item => item.dispatch.isFixedRoute)
                        .map(({dispatch, vehicle, driver, officer}) => (
                          <tr key={dispatch.id}>
                            <td className="border px-3 py-2 text-center">
                              {dispatch.startTime}~{dispatch.endTime}
                            </td>
                            <td className="border px-3 py-2 text-center">
                              {vehicle?.vehicleNumber || '미지정'}
                            </td>
                            <td className="border px-3 py-2 text-center">
                              {vehicle?.vehicleType || '미지정'}
                            </td>
                            <td className="border px-3 py-2 text-center">
                              {driver ? `${driver.rank} ${driver.name}` : '미지정'}
                            </td>
                            <td className="border px-3 py-2 text-center">
                              {dispatch.destination}
                            </td>
                            <td className="border px-3 py-2 text-center">
                              {dispatch.purpose}
                            </td>
                            <td className="border px-3 py-2 text-center">
                              {officer ? `${officer.rank} ${officer.name}` : '미지정'}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </>
              )}

              {/* 일반 배차 테이블 */}
              <h2 className="text-lg font-bold mb-3 pb-2 border-b">일반 배차</h2>
              <table className="w-full border-collapse mb-8">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border px-3 py-2 text-sm">시간</th>
                    <th className="border px-3 py-2 text-sm">차량번호</th>
                    <th className="border px-3 py-2 text-sm">차종</th>
                    <th className="border px-3 py-2 text-sm">운전병</th>
                    <th className="border px-3 py-2 text-sm">목적지</th>
                    <th className="border px-3 py-2 text-sm">용도</th>
                    <th className="border px-3 py-2 text-sm">선탑자</th>
                  </tr>
                </thead>
                <tbody>
                  {dispatches.filter(item => !item.dispatch.isFixedRoute).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="border px-3 py-4 text-center text-gray-500">
                        일반 배차 정보가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    dispatches
                      .filter(item => !item.dispatch.isFixedRoute)
                      .map(({dispatch, vehicle, driver, officer}) => (
                        <tr key={dispatch.id}>
                          <td className="border px-3 py-2 text-center">
                            {dispatch.startTime}~{dispatch.endTime}
                          </td>
                          <td className="border px-3 py-2 text-center">
                            {vehicle?.vehicleNumber || '미지정'}
                          </td>
                          <td className="border px-3 py-2 text-center">
                            {vehicle?.vehicleType || '미지정'}
                          </td>
                          <td className="border px-3 py-2 text-center">
                            {driver ? `${driver.rank} ${driver.name}` : '미지정'}
                          </td>
                          <td className="border px-3 py-2 text-center">
                            {dispatch.destination}
                          </td>
                          <td className="border px-3 py-2 text-center">
                            {dispatch.purpose}
                          </td>
                          <td className="border px-3 py-2 text-center">
                            {officer ? `${officer.rank} ${officer.name}` : '미지정'}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>

              <div className="mb-8">
                <h2 className="text-lg font-bold mb-3 pb-2 border-b">특이사항</h2>
                <div className="border p-4 min-h-24">
                  {document.additionalNotes ? (
                    <div dangerouslySetInnerHTML={{ __html: document.additionalNotes.replace(/\n/g, '<br/>') }} />
                  ) : (
                    <p className="text-gray-500">특이사항이 없습니다.</p>
                  )}
                </div>
              </div>

              <div className="text-right mt-10">
                <div>위와 같이 배차를 지시함.</div>
                <div className="mt-2">{format(new Date(), 'yyyy년 MM월 dd일')}</div>
                
                <div className="mt-8">
                  <div>{document.unitName}장 {document.commanderName}</div>
                  <div className="inline-block w-20 h-20 border-2 border-gray-800 rounded-full mt-2 leading-[4.5rem] text-center">
                    결재
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
} 