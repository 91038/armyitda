"use client"

import { useState, useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { getDispatch, getDispatchDocument } from "@/lib/api/dispatches"
import { getVehicle } from "@/lib/api/vehicles"
import { getSoldier } from "@/lib/api/soldiers"
import { getOfficer } from "@/lib/api/officers"
import { getDispatches, getDispatchesWithDetails } from "@/lib/api/dispatches"
import { Dispatch, Vehicle, Soldier, Officer, ExtendedDispatch, DispatchDocument } from "@/types"
import { Button } from "@/components/ui/button"
import { Printer, Download, ArrowLeft, Edit, Save, Check } from "lucide-react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

export default function PrintDispatchPage() {
  const searchParams = useSearchParams()
  const date = searchParams.get('date')
  const dispatchId = searchParams.get('id')
  const documentId = searchParams.get('documentId')
  const download = searchParams.get('download') === 'true'
  const view = searchParams.get('view') || 'all' // 'all' 또는 'single'
  const { toast } = useToast()

  const printRef = useRef<HTMLDivElement>(null)
  const [document, setDocument] = useState<DispatchDocument | null>(null)
  const [dispatches, setDispatches] = useState<ExtendedDispatch[]>([])
  const [fixedDispatches, setFixedDispatches] = useState<ExtendedDispatch[]>([])
  const [regularDispatches, setRegularDispatches] = useState<ExtendedDispatch[]>([])
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  
  // 편집 가능한 배차지시서 메타데이터
  const [documentNumber, setDocumentNumber] = useState("")
  const [unitName, setUnitName] = useState("제00부대")
  const [creator, setCreator] = useState("상병 홍길동")
  const [commanderName, setCommanderName] = useState("대대장")
  const [additionalNotes, setAdditionalNotes] = useState("")

  // PDF 자동 다운로드
  useEffect(() => {
    if (download && !loading) {
      // 잠시 대기 후 자동으로 PDF 다운로드
      const timer = setTimeout(() => {
        handleDirectPdfDownload()
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [download, loading])

  // 데이터 로딩 함수 수정
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        // 문서 번호 생성 (현재 날짜 기반)
        const today = new Date()
        const docNumber = `제 ${format(today, 'yyyy')} - ${format(today, 'MM')}${format(today, 'dd')} 호`
        setDocumentNumber(docNumber)
        
        let allDispatches: ExtendedDispatch[] = []
        
        // 배차지시서 문서 ID로 조회
        if (documentId) {
          const docResponse = await getDispatchDocument(documentId)
          
          if (docResponse.success && docResponse.data) {
            const dispatchDoc = docResponse.data
            
            // 문서 정보 설정
            setDocument(dispatchDoc)
            setDocumentNumber(dispatchDoc.documentNumber)
            setUnitName(dispatchDoc.unitName)
            setCreator(dispatchDoc.creator)
            setCommanderName(dispatchDoc.commanderName)
            setAdditionalNotes(dispatchDoc.additionalNotes || "")
            
            // 문서에 포함된 배차 정보 가져오기
            for (const dispatchId of dispatchDoc.dispatchIds) {
              const dispatchResponse = await getDispatch(dispatchId)
              
              if (dispatchResponse.success && dispatchResponse.data) {
                const dispatch = dispatchResponse.data
                
                // 관련 정보 가져오기
                const vehicleRes = await getVehicle(dispatch.vehicleId)
                const driverRes = await getSoldier(dispatch.driverId)
                const officerRes = await getOfficer(dispatch.officerId)
                
                const extendedDispatch: ExtendedDispatch = {
                  ...dispatch,
                  vehicleInfo: vehicleRes.success && vehicleRes.data ? {
                    id: vehicleRes.data.id,
                    number: vehicleRes.data.vehicleNumber,
                    type: vehicleRes.data.vehicleType,
                    name: vehicleRes.data.vehicleName
                  } : null,
                  driverInfo: driverRes.success && driverRes.data ? {
                    id: driverRes.data.id,
                    name: driverRes.data.name,
                    rank: driverRes.data.rank
                  } : null,
                  officerInfo: officerRes.success && officerRes.data ? {
                    id: officerRes.data.id,
                    name: officerRes.data.name,
                    rank: officerRes.data.rank
                  } : null
                }
                
                allDispatches.push(extendedDispatch)
              }
            }
            
            // 시작 시간 기준으로 정렬
            allDispatches.sort((a, b) => a.startTime.localeCompare(b.startTime))
            
            const fixed = allDispatches.filter(d => d.isFixedRoute)
            const regular = allDispatches.filter(d => !d.isFixedRoute)
            
            setFixedDispatches(fixed)
            setRegularDispatches(regular)
            setDispatches(allDispatches)
          } else {
            toast({
              title: "문서 로드 오류",
              description: "배차지시서 문서를 불러올 수 없습니다.",
              variant: "destructive",
            })
          }
        }
        // 단일 배차 조회
        else if (dispatchId && view === 'single') {
          const response = await getDispatch(dispatchId)
          if (response.success && response.data) {
            // 단일 배차에 대한 상세 정보 로드
            const singleDispatch = response.data
            const vehicleRes = await getVehicle(singleDispatch.vehicleId)
            const driverRes = await getSoldier(singleDispatch.driverId)
            const officerRes = await getOfficer(singleDispatch.officerId)
            
            const extendedDispatch: ExtendedDispatch = {
              ...singleDispatch,
              vehicleInfo: vehicleRes.success && vehicleRes.data ? {
                id: vehicleRes.data.id,
                number: vehicleRes.data.vehicleNumber,
                type: vehicleRes.data.vehicleType,
                name: vehicleRes.data.vehicleName
              } : null,
              driverInfo: driverRes.success && driverRes.data ? {
                id: driverRes.data.id,
                name: driverRes.data.name,
                rank: driverRes.data.rank
              } : null,
              officerInfo: officerRes.success && officerRes.data ? {
                id: officerRes.data.id,
                name: officerRes.data.name,
                rank: officerRes.data.rank
              } : null
            }
            
            allDispatches = [extendedDispatch]
            setFixedDispatches([])
            setRegularDispatches([extendedDispatch])
            setDispatches(allDispatches)
          }
        }
        // 특정 날짜 모든 배차 조회 (상세 정보 포함)
        else if (date) {
          const response = await getDispatchesWithDetails(date)
          if (response.success && response.data) {
            allDispatches = response.data
            const fixed = allDispatches.filter(d => d.isFixedRoute)
            const regular = allDispatches.filter(d => !d.isFixedRoute)
            
            setFixedDispatches(fixed)
            setRegularDispatches(regular)
            setDispatches(allDispatches)
          }
        }
      } catch (error) {
        console.error("데이터 로드 오류:", error)
        toast({
          title: "데이터 로드 오류",
          description: "배차 정보를 불러오는데 실패했습니다.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
    
    if (date || dispatchId || documentId) {
      loadData()
    }
  }, [date, dispatchId, documentId, view, toast])
  
  // 배차지시서만 인쇄하는 함수
  const handlePrintContent = () => {
    if (!printRef.current) return

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
  }

  // PDF 직접 다운로드 함수
  const handleDirectPdfDownload = async () => {
    if (!printRef.current) return
    
    try {
      // 로딩 표시
      toast({
        title: "PDF 생성 중",
        description: "잠시만 기다려주세요...",
      });
      
      // 폰트 스타일을 유지하기 위한 준비
      const scale = 2; // 해상도 향상을 위한 스케일 증가
      
      const element = printRef.current;
      const canvas = await html2canvas(element, {
        scale: scale,
        useCORS: true,
        logging: false,
        backgroundColor: '#FFFFFF'
      });
      
      const imgData = canvas.toDataURL('image/png');
      
      // A4 사이즈: 210 x 297 mm
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // 이미지 비율 유지하며 PDF 페이지에 맞추기
      const imgWidth = pdfWidth - 20; // 양쪽 10mm 여백 추가
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // 여러 페이지가 필요한 경우 처리
      let heightLeft = imgHeight;
      let position = 0;
      
      // 첫 페이지 추가 (여백 고려)
      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight); // x, y 좌표에 10mm 여백 추가
      heightLeft -= (pdfHeight - 20); // 상하 여백 20mm 고려
      
      // 필요시 추가 페이지 생성
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + 10; // 상단 여백 10mm 추가
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= (pdfHeight - 20);
      }
      
      // 문서번호나 날짜를 파일명에 사용
      const fileName = `배차지시서_${documentNumber.replace(/[\s:\/]+/g, '_') || 'document'}.pdf`;
      pdf.save(fileName);
      
      toast({
        title: "PDF 저장 완료",
        description: "배차지시서 PDF가 저장되었습니다.",
      });
    } catch (error) {
      console.error('PDF 생성 오류:', error);
      toast({
        title: "PDF 생성 실패",
        description: "PDF 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  }

  const handlePrint = () => {
    handlePrintContent()
  }
  
  const handleDownloadPDF = () => {
    handleDirectPdfDownload()
  }
  
  // 날짜를 형식화하는 함수
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return format(date, 'yyyy년 MM월 dd일', { locale: ko })
  }
  
  const handleMetadataEdit = () => {
    setDialogOpen(false)
    // 저장 확인 메시지
    toast({
      title: "저장 완료",
      description: "배차지시서 정보가 수정되었습니다.",
    })
  }
  
  if (loading) {
    return <div className="flex justify-center items-center h-screen">데이터를 불러오는 중...</div>
  }
  
  return (
    <div>
      {/* 인쇄 시 숨겨지는 상단 컨트롤 */}
      <div className="bg-gray-100 p-4 flex items-center justify-between">
        <Link href="/dispatch" className="flex items-center text-blue-600 hover:underline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          배차 관리로 돌아가기
        </Link>
        <div className="flex items-center space-x-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center"
              >
                <Edit className="h-4 w-4 mr-2" />
                배차지시서 편집
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>배차지시서 정보 편집</DialogTitle>
                <DialogDescription>
                  배차지시서의 메타데이터를 수정합니다.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="docNumber" className="text-right">문서번호</Label>
                  <Input
                    id="docNumber"
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="unitName" className="text-right">부대명</Label>
                  <Input
                    id="unitName"
                    value={unitName}
                    onChange={(e) => setUnitName(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="creator" className="text-right">작성자</Label>
                  <Input
                    id="creator"
                    value={creator}
                    onChange={(e) => setCreator(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="commander" className="text-right">결재권자</Label>
                  <Input
                    id="commander"
                    value={commanderName}
                    onChange={(e) => setCommanderName(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="notes" className="text-right">추가 특이사항</Label>
                  <Textarea
                    id="notes"
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
                    rows={4}
                    placeholder="배차지시서에 추가할 특이사항을 입력하세요."
                    className="col-span-3"
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>취소</Button>
                <Button onClick={handleMetadataEdit}>저장</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handlePrint} 
            className="flex items-center"
          >
            <Printer className="h-4 w-4 mr-2" />
            인쇄하기
          </Button>
          <Button 
            variant="default" 
            size="sm" 
            onClick={handleDownloadPDF} 
            className="flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            PDF 저장
          </Button>
        </div>
      </div>
      
      {/* 인쇄 및 PDF 변환될 때 사용될 실제 콘텐츠 영역 */}
      <div className="p-8 bg-white shadow-lg max-w-4xl mx-auto my-8 border border-gray-200 rounded-lg">
        <div ref={printRef}>
          <div className="text-center mb-8 border-b-2 border-gray-800 pb-4">
            <h1 className="text-3xl font-bold tracking-wider mb-2">배 차 지 시 서</h1>
            <div className="text-sm text-gray-600">문서번호: {documentNumber}</div>
          </div>

          <div className="flex justify-between items-center bg-gray-50 border p-3 mb-8 text-sm">
            <div className="flex items-center">
              <div className="font-semibold mr-2">부대명:</div>
              <div>{unitName}</div>
            </div>
            <div className="flex items-center">
              <div className="font-semibold mr-2">작성일자:</div>
              <div>{document?.date || format(new Date(), 'yyyy년 MM월 dd일')}</div>
            </div>
            <div className="flex items-center">
              <div className="font-semibold mr-2">작성자:</div>
              <div>{creator}</div>
            </div>
          </div>

          {fixedDispatches.length > 0 && (
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
                  {fixedDispatches.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="border px-3 py-4 text-center text-gray-500">
                        고정 배차 정보가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    fixedDispatches.map((dispatch) => (
                      <tr key={dispatch.id}>
                        <td className="border px-3 py-2 text-center">
                          {dispatch.startTime}~{dispatch.endTime}
                        </td>
                        <td className="border px-3 py-2 text-center">
                          {dispatch.vehicleInfo?.number || '미지정'}
                        </td>
                        <td className="border px-3 py-2 text-center">
                          {dispatch.vehicleInfo?.type || '미지정'}
                        </td>
                        <td className="border px-3 py-2 text-center">
                          {dispatch.driverInfo 
                            ? `${dispatch.driverInfo.rank} ${dispatch.driverInfo.name}` 
                            : '미지정'}
                        </td>
                        <td className="border px-3 py-2 text-center">
                          {dispatch.destination}
                        </td>
                        <td className="border px-3 py-2 text-center">
                          {dispatch.purpose}
                        </td>
                        <td className="border px-3 py-2 text-center">
                          {dispatch.officerInfo 
                            ? `${dispatch.officerInfo.rank} ${dispatch.officerInfo.name}` 
                            : '미지정'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </>
          )}

          <h2 className="text-lg font-bold mb-3 pb-2 border-b">배차 현황</h2>
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
              {regularDispatches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="border px-3 py-4 text-center text-gray-500">
                    배차 정보가 없습니다.
                  </td>
                </tr>
              ) : (
                regularDispatches.map((dispatch) => (
                  <tr key={dispatch.id}>
                    <td className="border px-3 py-2 text-center">
                      {dispatch.startTime}~{dispatch.endTime}
                    </td>
                    <td className="border px-3 py-2 text-center">
                      {dispatch.vehicleInfo?.number || '미지정'}
                    </td>
                    <td className="border px-3 py-2 text-center">
                      {dispatch.vehicleInfo?.type || '미지정'}
                    </td>
                    <td className="border px-3 py-2 text-center">
                      {dispatch.driverInfo 
                        ? `${dispatch.driverInfo.rank} ${dispatch.driverInfo.name}` 
                        : '미지정'}
                    </td>
                    <td className="border px-3 py-2 text-center">
                      {dispatch.destination}
                    </td>
                    <td className="border px-3 py-2 text-center">
                      {dispatch.purpose}
                    </td>
                    <td className="border px-3 py-2 text-center">
                      {dispatch.officerInfo 
                        ? `${dispatch.officerInfo.rank} ${dispatch.officerInfo.name}` 
                        : '미지정'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="mb-8">
            <h2 className="text-lg font-bold mb-3 pb-2 border-b">특이사항</h2>
            <div className="border p-4 min-h-24">
              {additionalNotes ? (
                <div className="mb-4">
                  <div dangerouslySetInnerHTML={{ __html: additionalNotes.replace(/\n/g, '<br/>') }} />
                </div>
              ) : null}
              
              {dispatches.some(d => d.notes) ? (
                <ul className="list-disc pl-5">
                  {dispatches
                    .filter(d => d.notes)
                    .map((d, idx) => (
                      <li key={idx}>{d.notes}</li>
                    ))}
                </ul>
              ) : !additionalNotes ? (
                <p className="text-gray-500">특이사항이 없습니다.</p>
              ) : null}
            </div>
          </div>

          <div className="text-right mt-10">
            <div>위와 같이 배차를 지시함.</div>
            <div className="mt-2">{format(new Date(), 'yyyy년 MM월 dd일')}</div>
            
            <div className="mt-8">
              <div>{unitName}장 {commanderName}</div>
              <div className="inline-block w-20 h-20 border-2 border-gray-800 rounded-full mt-2 leading-[4.5rem] text-center">
                결재
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 