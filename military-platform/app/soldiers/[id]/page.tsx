"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Edit, Trash2, ChevronDown, ChevronUp } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

import { getSoldier, deleteSoldier, getSoldierMentalHealthTests, getSoldierPhysicalHealthTests } from "@/lib/api/soldiers"
import { Soldier, MentalHealthTest, PhysicalHealthTest } from "@/types"
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function SoldierDetailPage({ params: paramsPromise }: PageProps) {
  const params = use(paramsPromise)
  const router = useRouter()
  const [soldier, setSoldier] = useState<Soldier | null>(null)
  const [mentalHealthTests, setMentalHealthTests] = useState<MentalHealthTest[]>([])
  const [physicalHealthTests, setPhysicalHealthTests] = useState<PhysicalHealthTest[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingTests, setLoadingTests] = useState(true)
  const [loadingPhysicalTests, setLoadingPhysicalTests] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isTestsOpen, setIsTestsOpen] = useState(false)
  const [isPhysicalTestsOpen, setIsPhysicalTestsOpen] = useState(false)
  
  // 병사 데이터 조회
  const fetchSoldierData = async () => {
    setLoading(true)
    setLoadingTests(true)
    setLoadingPhysicalTests(true)
    
    try {
      const soldierResponse = await getSoldier(params.id)
      
      if (soldierResponse.success && soldierResponse.data) {
        setSoldier(soldierResponse.data)
      } else {
        setError(soldierResponse.error || "병사 정보를 불러오는데 실패했습니다.")
      }

      const testsResponse = await getSoldierMentalHealthTests(params.id)
      
      if (testsResponse.success && testsResponse.data) {
        setMentalHealthTests(testsResponse.data)
      } else {
        console.warn("심리검사 기록을 불러오는데 실패했습니다:", testsResponse.error)
      }

      const physicalTestsResponse = await getSoldierPhysicalHealthTests(params.id)
      if (physicalTestsResponse.success && physicalTestsResponse.data) {
        setPhysicalHealthTests(physicalTestsResponse.data)
      } else {
        console.warn("신체건강 테스트 기록을 불러오는데 실패했습니다:", physicalTestsResponse.error)
      }
    } catch (err: any) {
      setError(err.message || "데이터를 불러오는데 실패했습니다.")
    } finally {
      setLoading(false)
      setLoadingTests(false)
      setLoadingPhysicalTests(false)
    }
  }
  
  // 병사 삭제 처리
  const handleDeleteSoldier = async () => {
    if (!soldier) return
    
    setIsDeleting(true)
    
    try {
      const response = await deleteSoldier(soldier.id)
      
      if (response.success) {
        router.push("/soldiers")
      } else {
        setError(response.error || "병사 삭제에 실패했습니다.")
      }
    } catch (err: any) {
      setError(err.message || "병사 삭제에 실패했습니다.")
    } finally {
      setIsDeleting(false)
    }
  }
  
  useEffect(() => {
    fetchSoldierData()
  }, [params.id])
  
  // 건강 상태에 따른 배지 색상
  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case "건강": return "bg-green-100 text-green-800"
      case "양호": return "bg-yellow-100 text-yellow-800"
      case "이상": return "bg-red-100 text-red-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }
  
  // 정신건강 상태에 따른 배지 색상
  const getMentalHealthStatusColor = (status?: string) => {
    switch (status) {
      case "건강": return "bg-green-100 text-green-800"
      case "양호": return "bg-yellow-100 text-yellow-800"
      case "이상": return "bg-red-100 text-red-800"
      default: return "bg-gray-100 text-gray-800"
    }
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
  
  // 로딩 상태 표시
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }
  
  // 오류 표시
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-red-500">{error}</div>
        <Button onClick={() => router.push("/soldiers")}>병사 목록으로 돌아가기</Button>
      </div>
    )
  }
  
  // 병사 데이터가 없는 경우
  if (!soldier) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div>병사 정보를 찾을 수 없습니다.</div>
        <Button onClick={() => router.push("/soldiers")}>병사 목록으로 돌아가기</Button>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button 
          variant="ghost" 
          className="flex items-center gap-1" 
          onClick={() => router.push("/soldiers")}
        >
          <ArrowLeft className="h-4 w-4" /> 병사 목록
        </Button>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/soldiers/${soldier.id}/edit`)}
          >
            <Edit className="mr-2 h-4 w-4" /> 정보 수정
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" /> 병사 삭제
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
                <AlertDialogDescription>
                  <strong>{soldier.name}</strong>({soldier.rank}) 병사의 정보를 삭제합니다. 이 작업은 되돌릴 수 없습니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction 
                  className="bg-red-500 hover:bg-red-600" 
                  onClick={handleDeleteSoldier}
                  disabled={isDeleting}
                >
                  {isDeleting ? "삭제 중..." : "삭제"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{soldier.name} <span className="text-lg text-muted-foreground">({soldier.rank})</span></CardTitle>
              <CardDescription>{soldier.serialNumber} - {soldier.position}</CardDescription>
            </div>
            <Avatar className="h-16 w-16">
              <AvatarImage src={soldier.avatar} alt={soldier.name} />
              <AvatarFallback className="text-xl">{soldier.name.substring(0, 1)}</AvatarFallback>
            </Avatar>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Table>
            <TableBody>
              <TableRow>
                <TableHead className="w-1/4">소속</TableHead>
                <TableCell>{soldier.unit}</TableCell>
              </TableRow>
              <TableRow>
                <TableHead>보직</TableHead>
                <TableCell>{soldier.position}</TableCell>
              </TableRow>
              <TableRow>
                <TableHead>입대일</TableHead>
                <TableCell>{new Date(soldier.enlistmentDate).toLocaleDateString()}</TableCell>
              </TableRow>
              <TableRow>
                <TableHead>전역예정일</TableHead>
                <TableCell>{new Date(soldier.dischargeDate).toLocaleDateString()}</TableCell>
              </TableRow>
              <TableRow>
                <TableHead>건강 상태</TableHead>
                <TableCell>
                  <div className="flex gap-2">
                    <Badge variant="outline" className={getHealthStatusColor(soldier.physicalHealthStatus)}>
                      신체건강: {soldier.physicalHealthStatus || '-'}
                    </Badge>
                    <Badge variant="outline" className={getMentalHealthStatusColor(soldier.mentalHealthStatus)}>
                      정신건강: {soldier.mentalHealthStatus || '정보 없음'}
                    </Badge>
                  </div>
                </TableCell>
              </TableRow>
              {soldier.drivingSkill && (
                <TableRow>
                  <TableHead>운전기량</TableHead>
                  <TableCell>
                    <Badge variant="outline" className={getDrivingSkillColor(soldier.drivingSkill)}>
                      {soldier.drivingSkill}
                    </Badge>
                  </TableCell>
                </TableRow>
              )}
              <TableRow>
                <TableHead>연락처</TableHead>
                <TableCell>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <div className="text-sm font-medium">전화번호</div>
                      <div>{soldier.contact.phone}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">이메일</div>
                      <div>{soldier.contact.email}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">주소</div>
                      <div>{soldier.contact.address}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">비상연락처</div>
                      <div>{soldier.contact.emergencyContact}</div>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableHead>특기</TableHead>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {soldier.specialSkills && soldier.specialSkills.length > 0 ? (
                      soldier.specialSkills.map((skill, index) => (
                        <Badge key={index} variant="secondary">{skill}</Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground">등록된 특기가 없습니다.</span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableHead>학력</TableHead>
                <TableCell>{soldier.education || "정보 없음"}</TableCell>
              </TableRow>
              <TableRow>
                <TableHead>특이사항</TableHead>
                <TableCell className="whitespace-pre-line">{soldier.note || "특이사항 없음"}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Collapsible open={isTestsOpen} onOpenChange={setIsTestsOpen}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-4">
            <div className="flex items-center gap-2">
              <CardTitle>정신건강 테스트 결과</CardTitle>
              {loadingTests && <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-primary"></div>}
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-9 p-0">
                {isTestsOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                <span className="sr-only">Toggle</span>
              </Button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              {mentalHealthTests.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>검사일</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead className="text-right">점수</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mentalHealthTests.map((test) => (
                      <TableRow key={test.id}>
                        <TableCell>{format(new Date(test.testDate), 'yyyy-MM-dd HH:mm', { locale: ko })}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            test.status === 'danger' ? "bg-red-100 text-red-800" :
                            test.status === 'caution' ? "bg-yellow-100 text-yellow-800" :
                            "bg-green-100 text-green-800"
                          }>
                            {test.status === 'danger' ? '위험' : test.status === 'caution' ? '주의' : '양호'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{test.score}점</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  실시한 정신건강 테스트 기록이 없습니다.
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Collapsible open={isPhysicalTestsOpen} onOpenChange={setIsPhysicalTestsOpen}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-4">
            <div className="flex items-center gap-2">
              <CardTitle>신체건강 테스트 결과</CardTitle>
              {loadingPhysicalTests && <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-primary"></div>}
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-9 p-0">
                {isPhysicalTestsOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                <span className="sr-only">Toggle</span>
              </Button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              {physicalHealthTests.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>검사일</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead className="text-right">점수</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {physicalHealthTests.map((test) => (
                      <TableRow key={test.id}>
                        <TableCell>{format(new Date(test.testDate), 'yyyy-MM-dd HH:mm', { locale: ko })}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            test.status === 'bad' ? "bg-red-100 text-red-800" :
                            test.status === 'normal' ? "bg-yellow-100 text-yellow-800" :
                            "bg-green-100 text-green-800"
                          }>
                            {test.status === 'bad' ? '이상' : test.status === 'normal' ? '양호' : '건강'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{test.score}점</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  실시한 신체건강 테스트 기록이 없습니다.
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  )
} 
 