"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/components/ui/use-toast"
import { ArrowLeft, Calendar, Gift, Plus, Search, BarChart3, AlertCircle, Trash2 } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { getSoldiers } from "@/lib/api/soldiers"
import { getOfficers } from "@/lib/api/officers"
import { getPersonLeaves, addLeave, deleteLeave } from "@/lib/api/leaves"
import { collection, query, where, orderBy, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Leave } from "@/types"

// 임시 타입 정의
interface Person {
  id: string
  name: string
  rank: string
  unitName?: string
  isActive?: boolean
}

interface LeaveGrant {
  id: string
  personId: string
  personName: string
  personRank: string
  personType: "soldier" | "officer"
  leaveTypeName: string
  days: number
  reason: string
  grantedAt: string
  grantedBy: string
  grantedByName: string
}

export default function LeaveGrantPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  // 상태 관리
  const [soldiers, setSoldiers] = useState<Person[]>([])
  const [officers, setOfficers] = useState<Person[]>([])
  const [leaveGrants, setLeaveGrants] = useState<LeaveGrant[]>([])
  const [personLeaves, setPersonLeaves] = useState<Leave[]>([]) // 개인 휴가 목록
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null) // 선택된 인원
  const [isPersonSelected, setIsPersonSelected] = useState(false) // 인원 선택 여부
  const [leaveTypes, setLeaveTypes] = useState([
    { id: "annual", name: "연가" },
    { id: "reward", name: "포상휴가" },
    { id: "special", name: "특별휴가" },
    { id: "medical", name: "병가" },
    { id: "condolence", name: "청원휴가" }
  ])
  
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("soldier")
  const [isGrantDialogOpen, setIsGrantDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false) // 삭제 다이얼로그
  const [leaveToDelete, setLeaveToDelete] = useState<Leave | null>(null) // 삭제할 휴가
  const [customLeaveType, setCustomLeaveType] = useState("")
  
  // 휴가 부여 양식
  const [grantForm, setGrantForm] = useState({
    personType: "soldier",
    personId: "",
    personName: "",
    personRank: "",
    leaveType: "annual",
    leaveTypeName: "연가",
    days: 1,
    reason: "정기 부여",
    grantedAt: format(new Date(), 'yyyy-MM-dd')
  })
  
  // 데이터 로드
  useEffect(() => {
    loadSoldiers()
    loadOfficers()
    loadLeaveGrants()
  }, [])
  
  // 병사 목록 로드
  const loadSoldiers = async () => {
    try {
      // 실제 API 호출로 교체
      const response = await getSoldiers();
      if (response.success && response.data) {
        setSoldiers(response.data);
      } else {
        toast({
          title: "오류",
          description: response.error || "병사 목록을 불러오는데 실패했습니다.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("병사 목록 로드 실패:", error);
      toast({
        title: "오류",
        description: "병사 목록을 불러오는데 실패했습니다.",
        variant: "destructive"
      });
    }
  };
  
  // 간부 목록 로드
  const loadOfficers = async () => {
    try {
      // 실제 API 호출로 교체
      const response = await getOfficers();
      if (response.success && response.data) {
        setOfficers(response.data);
      } else {
        toast({
          title: "오류",
          description: response.error || "간부 목록을 불러오는데 실패했습니다.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("간부 목록 로드 실패:", error);
      toast({
        title: "오류",
        description: "간부 목록을 불러오는데 실패했습니다.",
        variant: "destructive"
      });
    }
  };
  
  // 휴가 부여 내역 로드
  const loadLeaveGrants = async () => {
    setLoading(true);
    try {
      // API를 통해 휴가 부여 내역 가져오기
      const response = await fetch('/api/grant-leave');
      
      if (response.ok) {
        const data = await response.json();
        if (data.grantedLeaves && Array.isArray(data.grantedLeaves)) {
          setLeaveGrants(data.grantedLeaves);
        } else {
          setLeaveGrants([]);
        }
      } else {
        // 기존 Firebase 쿼리 사용 (현재 API가 실패했을 경우)
        // Firebase에서 휴가 부여 내역 가져오기
        const leaveGrantsRef = collection(db, "schedules");
        const q = query(
          leaveGrantsRef,
          where("type", "==", "grantedLeave"),
          orderBy("grantedAt", "desc")
        );
        
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          setLeaveGrants([]);
          setLoading(false);
          return;
        }
        
        const grants: LeaveGrant[] = [];
        
        snapshot.forEach(doc => {
          const data = doc.data();
          grants.push({
            id: doc.id,
            personId: data.userId,
            personName: data.personName || "이름 없음",
            personRank: data.personRank || "계급 미상",
            personType: data.personType || "soldier",
            leaveTypeName: data.leaveType || "미지정",
            days: data.days || 0,
            reason: data.reason || "",
            grantedAt: data.grantedAt?.toDate ? format(data.grantedAt.toDate(), 'yyyy-MM-dd') : "날짜 미상",
            grantedBy: data.grantedBy || "",
            grantedByName: data.grantedByName || ""
          });
        });
        
        setLeaveGrants(grants);
      }
    } catch (error) {
      console.error("휴가 부여 내역 로드 실패:", error);
      toast({
        title: "오류",
        description: "휴가 부여 내역을 불러오는데 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // 개인별 휴가 목록 로드
  const loadPersonLeaves = async (personType: "soldier" | "officer", personId: string) => {
    setLoading(true);
    try {
      const response = await getPersonLeaves(personType, personId);
      if (response.success && response.data) {
        // 날짜순 정렬
        const sortedLeaves = response.data.sort((a, b) => 
          new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
        );
        setPersonLeaves(sortedLeaves);
      } else {
        setPersonLeaves([]);
        toast({
          title: "알림",
          description: "해당 인원의 휴가 정보가 없습니다.",
        });
      }
    } catch (error) {
      console.error("개인 휴가 조회 실패:", error);
      toast({
        title: "오류",
        description: "휴가 정보를 불러오는데 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // 검색된 인원 목록
  const filteredPeople = activeTab === "soldier" 
    ? soldiers.filter(s => 
        s.name.includes(searchQuery) || 
        s.rank.includes(searchQuery) ||
        (s.unitName && s.unitName.includes(searchQuery))
      )
    : officers.filter(o => 
        o.name.includes(searchQuery) || 
        o.rank.includes(searchQuery) ||
        (o.unitName && o.unitName.includes(searchQuery))
      )
  
  // 검색된 휴가 부여 내역
  const filteredGrants = leaveGrants.filter(grant => 
    (activeTab === "all" || grant.personType === activeTab) &&
    (grant.personName.includes(searchQuery) ||
     grant.personRank.includes(searchQuery) ||
     grant.leaveTypeName.includes(searchQuery) ||
     grant.reason.includes(searchQuery))
  )
  
  // 인원 선택 처리
  const handleSelectPerson = (person: Person) => {
    setSelectedPerson(person);
    setIsPersonSelected(true);
    
    // 선택된 인원의 휴가 목록 로드
    loadPersonLeaves(activeTab as "soldier" | "officer", person.id);
    
    // 휴가 부여 폼 초기화
    setGrantForm({
      ...grantForm,
      personId: person.id,
      personName: person.name,
      personRank: person.rank,
      personType: activeTab as "soldier" | "officer"
    });
  }
  
  // 휴가 부여 다이얼로그 열기
  const handleOpenGrantDialog = () => {
    if (!selectedPerson) {
      toast({
        title: "인원 미선택",
        description: "먼저 인원을 선택해주세요.",
        variant: "destructive"
      });
      return;
    }
    
    setIsGrantDialogOpen(true);
  }
  
  // 휴가 종류 변경 처리
  const handleLeaveTypeChange = (value: string) => {
    if (value === "custom") {
      setGrantForm({
        ...grantForm,
        leaveType: "custom",
        leaveTypeName: customLeaveType
      })
    } else {
      const selectedType = leaveTypes.find(t => t.id === value)
      if (selectedType) {
        setGrantForm({
          ...grantForm,
          leaveType: value,
          leaveTypeName: selectedType.name
        })
      }
    }
  }
  
  // 휴가 부여 처리
  const handleGrantLeave = async () => {
    if (!grantForm.personId || !grantForm.leaveTypeName || grantForm.days < 1) {
      toast({
        title: "입력 오류",
        description: "모든 필수 항목을 입력해주세요.",
        variant: "destructive"
      })
      return
    }
    
    try {
      // API 호출
      const response = await fetch('/api/grant-leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personType: grantForm.personType,
          personId: grantForm.personId,
          leaveTypeName: grantForm.leaveTypeName,
          days: grantForm.days,
          reason: grantForm.reason || "정기 부여",
          grantedAt: grantForm.grantedAt,
          personName: grantForm.personName,
          personRank: grantForm.personRank
        }),
      })
      
      if (response.ok) {
        toast({
          title: "휴가 부여 완료",
          description: `${grantForm.personName}에게 ${grantForm.leaveTypeName} ${grantForm.days}일이 부여되었습니다.`,
        })
        setIsGrantDialogOpen(false)
        // 양식 초기화
        resetForm()
        // 데이터 갱신
        loadLeaveGrants()
        
        // 선택된 인원이 있으면 그 인원의 휴가 목록도 갱신
        if (selectedPerson) {
          loadPersonLeaves(grantForm.personType as "soldier" | "officer", grantForm.personId);
        }
      } else {
        const errorData = await response.json()
        toast({
          title: "오류",
          description: errorData.error || "휴가 부여에 실패했습니다.",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("휴가 부여 오류:", error)
      toast({
        title: "오류",
        description: "휴가 부여 처리 중 오류가 발생했습니다.",
        variant: "destructive"
      })
    }
  }
  
  // 휴가 삭제 처리
  const handleDeleteLeave = (leave: Leave) => {
    setLeaveToDelete(leave);
    setIsDeleteDialogOpen(true);
  }
  
  // 휴가 삭제 확인
  const handleConfirmDelete = async () => {
    if (!leaveToDelete) return;
    
    try {
      const response = await deleteLeave(leaveToDelete.id);
      
      if (response.success) {
        toast({
          title: "삭제 완료",
          description: "휴가가 삭제되었습니다."
        });
        setIsDeleteDialogOpen(false);
        
        // 선택된 인원이 있으면 그 인원의 휴가 목록 갱신
        if (selectedPerson) {
          loadPersonLeaves(selectedPerson.id === leaveToDelete.personId ? 
            activeTab as "soldier" | "officer" : 
            leaveToDelete.personType as "soldier" | "officer", 
            leaveToDelete.personId);
        }
      } else {
        toast({
          title: "오류",
          description: response.error || "휴가 삭제에 실패했습니다.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("휴가 삭제 오류:", error);
      toast({
        title: "오류",
        description: "휴가 삭제에 실패했습니다.",
        variant: "destructive"
      });
    }
  }
  
  // 양식 초기화
  const resetForm = () => {
    if (selectedPerson) {
      // 선택된 인원이 있으면 그 정보만 유지
      setGrantForm({
        personType: activeTab as "soldier" | "officer",
        personId: selectedPerson.id,
        personName: selectedPerson.name,
        personRank: selectedPerson.rank,
        leaveType: "annual",
        leaveTypeName: "연가",
        days: 1,
        reason: "정기 부여",
        grantedAt: format(new Date(), 'yyyy-MM-dd')
      });
    } else {
      // 전체 초기화
      setGrantForm({
        personType: "soldier",
        personId: "",
        personName: "",
        personRank: "",
        leaveType: "annual",
        leaveTypeName: "연가",
        days: 1,
        reason: "정기 부여",
        grantedAt: format(new Date(), 'yyyy-MM-dd')
      });
    }
    setCustomLeaveType("");
  }
  
  // 부여일 선택 변경
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGrantForm({
      ...grantForm,
      grantedAt: e.target.value
    })
  }
  
  // 날짜 형식 변환 함수 추가
  const formatDateString = (dateString: string) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return format(date, 'yyyy-MM-dd');
    } catch (error) {
      return dateString;
    }
  };
  
  // 탭 변경시 선택 초기화
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setIsPersonSelected(false);
    setSelectedPerson(null);
    setPersonLeaves([]);
  }
  
  // 상태에 따른 배지 색상
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
      case "승인":
        return <Badge className="bg-green-500">승인</Badge>;
      case "rejected":
      case "거절":
        return <Badge className="bg-red-500">거절</Badge>;
      case "pending":
      case "신청":
        return <Badge className="bg-yellow-500">신청</Badge>;
      case "personal":
        return <Badge className="bg-blue-500">개인</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">휴가 부여 관리</h1>
          <p className="text-muted-foreground">병사 및 간부에게 휴가를 부여하고 휴가 내역을 관리합니다.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/leaves">
              <ArrowLeft className="mr-2 h-4 w-4" />
              휴가 관리로 돌아가기
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/leaves/statistics">
              <BarChart3 className="mr-2 h-4 w-4" />
              휴가 통계
            </Link>
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 왼쪽: 인원 선택 */}
        <Card>
          <CardHeader>
            <CardTitle>인원 선택</CardTitle>
            <CardDescription>휴가를 부여할 인원을 선택하세요</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <Tabs defaultValue="soldier" value={activeTab} onValueChange={handleTabChange}>
                  <TabsList>
                    <TabsTrigger value="soldier">병사</TabsTrigger>
                    <TabsTrigger value="officer">간부</TabsTrigger>
                  </TabsList>
                </Tabs>
                
                <div className="flex w-full max-w-sm items-center space-x-2">
                  <Input
                    placeholder="이름, 계급, 부대 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Button type="submit" size="icon" variant="ghost">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>성명</TableHead>
                      <TableHead>계급</TableHead>
                      <TableHead>소속</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPeople.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6">
                          검색 결과가 없습니다
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPeople.map((person) => (
                        <TableRow 
                          key={person.id} 
                          className={selectedPerson?.id === person.id ? "bg-muted" : ""}
                        >
                          <TableCell>{person.name}</TableCell>
                          <TableCell>{person.rank}</TableCell>
                          <TableCell>{person.unitName || '-'}</TableCell>
                          <TableCell>
                            <Button 
                              variant={selectedPerson?.id === person.id ? "default" : "outline"} 
                              size="sm" 
                              onClick={() => handleSelectPerson(person)}
                            >
                              선택
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
        
        {/* 오른쪽: 선택된 인원의 휴가 목록 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>
                {selectedPerson ? `${selectedPerson.name} ${selectedPerson.rank}의 휴가 목록` : '인원을 선택하세요'}
              </CardTitle>
              <CardDescription>
                {selectedPerson ? '선택된 인원의 휴가 내역을 확인하고 관리합니다' : '왼쪽에서 인원을 선택하면 휴가 내역이 여기에 표시됩니다'}
              </CardDescription>
            </div>
            {selectedPerson && (
              <Button onClick={handleOpenGrantDialog}>
                <Gift className="mr-2 h-4 w-4" />
                휴가 부여
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {!selectedPerson ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>인원을 선택하세요</AlertTitle>
                <AlertDescription>
                  왼쪽에서 인원을 선택하면 해당 인원의 휴가 목록이 표시됩니다.
                </AlertDescription>
              </Alert>
            ) : loading ? (
              <div className="text-center py-10">
                <p className="text-muted-foreground">로딩 중...</p>
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>유형</TableHead>
                      <TableHead>기간</TableHead>
                      <TableHead>일수</TableHead>
                      <TableHead>목적지</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>신청일</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {personLeaves.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-6">
                          휴가 내역이 없습니다
                        </TableCell>
                      </TableRow>
                    ) : (
                      personLeaves.map((leave) => (
                        <TableRow key={leave.id}>
                          <TableCell>{leave.leaveType}</TableCell>
                          <TableCell>
                            {formatDateString(leave.startDate)} ~ {formatDateString(leave.endDate)}
                          </TableCell>
                          <TableCell>{leave.duration}일</TableCell>
                          <TableCell>{leave.destination}</TableCell>
                          <TableCell>{getStatusBadge(leave.status)}</TableCell>
                          <TableCell>{formatDateString(leave.createdAt)}</TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleDeleteLeave(leave)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* 휴가 부여 다이얼로그 */}
      <Dialog open={isGrantDialogOpen} onOpenChange={setIsGrantDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>휴가 부여</DialogTitle>
            <DialogDescription>
              {grantForm.personName} {grantForm.personRank}에게 휴가를 부여합니다.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="leaveType" className="text-right">
                휴가 종류
              </Label>
              <div className="col-span-3">
                <Select value={grantForm.leaveType} onValueChange={handleLeaveTypeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="휴가 종류 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {leaveTypes.map(type => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">직접 입력</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {grantForm.leaveType === "custom" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="customLeaveType" className="text-right">
                  휴가명
                </Label>
                <Input
                  id="customLeaveType"
                  value={customLeaveType}
                  onChange={(e) => {
                    setCustomLeaveType(e.target.value)
                    setGrantForm({
                      ...grantForm,
                      leaveTypeName: e.target.value
                    })
                  }}
                  placeholder="예: 위로 휴가"
                  className="col-span-3"
                />
              </div>
            )}
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="days" className="text-right">
                휴가 일수
              </Label>
              <Input
                id="days"
                type="number"
                value={grantForm.days}
                onChange={(e) => setGrantForm({...grantForm, days: parseInt(e.target.value) || 0})}
                min={1}
                max={30}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="reason" className="text-right">
                부여 사유
              </Label>
              <Input
                id="reason"
                value={grantForm.reason}
                onChange={(e) => setGrantForm({...grantForm, reason: e.target.value})}
                placeholder="예: 정기 부여, 포상"
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="grantedAt" className="text-right">
                부여일
              </Label>
              <Input
                id="grantedAt"
                type="date"
                value={grantForm.grantedAt}
                onChange={handleDateChange}
                className="col-span-3"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsGrantDialogOpen(false)}>
              취소
            </Button>
            <Button type="submit" onClick={handleGrantLeave}>
              휴가 부여
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 휴가 삭제 확인 다이얼로그 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>휴가 삭제</DialogTitle>
            <DialogDescription>
              정말로 이 휴가를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          
          {leaveToDelete && (
            <div className="py-4">
              <p><strong>휴가자:</strong> {leaveToDelete.personName} ({leaveToDelete.personRank})</p>
              <p><strong>기간:</strong> {formatDateString(leaveToDelete.startDate)} ~ {formatDateString(leaveToDelete.endDate)} ({leaveToDelete.duration}일)</p>
              <p><strong>유형:</strong> {leaveToDelete.leaveType}</p>
              <p><strong>상태:</strong> {leaveToDelete.status}</p>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 