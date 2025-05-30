"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { collection, addDoc, getDocs, query, where, orderBy, Timestamp, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { getSoldiers } from "@/lib/api/soldiers"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Search, Award, Loader2, Target, Medal, Trophy, Activity, School, User, Users, Brain, Cpu, FileCode, Code, Book, Pen } from "lucide-react"

// 배지 아이콘 설정
const badgeIcons = [
  { id: "trophy", name: "사격 전문가", icon: <Trophy className="h-6 w-6" /> },
  { id: "run", name: "체력왕", icon: <Activity className="h-6 w-6" /> },
  { id: "school", name: "학습열정", icon: <School className="h-6 w-6" /> },
  { id: "account-group", name: "팀워크", icon: <Users className="h-6 w-6" /> },
  { id: "brain", name: "문제해결", icon: <Brain className="h-6 w-6" /> },
  { id: "tool", name: "기술전문가", icon: <FileCode className="h-6 w-6" /> },
  { id: "cpu", name: "IT 전문가", icon: <Cpu className="h-6 w-6" /> },
  { id: "code", name: "코딩능력", icon: <Code className="h-6 w-6" /> },
  { id: "book", name: "독서왕", icon: <Book className="h-6 w-6" /> },
  { id: "pen", name: "창의력", icon: <Pen className="h-6 w-6" /> },
];

interface Soldier {
  id: string;
  name: string;
  rank: string;
  unit: string;
  serialNumber?: string;
  [key: string]: any;
}

interface SkillItem {
  id: string;
  userId: string;
  soldierName: string;
  soldierRank: string;
  title: string;
  description: string;
  date: string;
  awardedBy: string;
  awardedAt: Timestamp;
}

interface BadgeItem {
  id: string;
  userId: string;
  soldierName: string;
  soldierRank: string;
  title: string;
  icon: string;
  description: string;
  awardedBy: string;
  awardedAt: Timestamp;
}

export default function PortfolioManagementPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  // 상태 관리
  const [soldiers, setSoldiers] = useState<Soldier[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSoldier, setSelectedSoldier] = useState<Soldier | null>(null)
  
  // 기술 및 경험 상태
  const [skills, setSkills] = useState<SkillItem[]>([])
  const [newSkillTitle, setNewSkillTitle] = useState("")
  const [newSkillDescription, setNewSkillDescription] = useState("")
  const [skillDate, setSkillDate] = useState<Date>(new Date())
  const [isSkillDateOpen, setIsSkillDateOpen] = useState(false)
  const [isAddingSkill, setIsAddingSkill] = useState(false)
  
  // 배지 상태
  const [badges, setBadges] = useState<BadgeItem[]>([])
  const [newBadgeTitle, setNewBadgeTitle] = useState("")
  const [selectedBadgeIcon, setSelectedBadgeIcon] = useState("")
  const [newBadgeDescription, setNewBadgeDescription] = useState("")
  const [isAddingBadge, setIsAddingBadge] = useState(false)
  
  // 병사 목록 로드
  useEffect(() => {
    const loadSoldiers = async () => {
      setIsLoading(true)
      try {
        const response = await getSoldiers()
        if (response.success && response.data) {
          setSoldiers(response.data)
        } else {
          toast({
            title: "오류",
            description: "병사 정보를 불러오는데 실패했습니다.",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("병사 목록 로드 오류:", error)
        toast({
          title: "오류",
          description: "병사 정보를 불러오는데 실패했습니다.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    loadSoldiers()
  }, [toast])
  
  // 병사 검색 필터링
  const filteredSoldiers = soldiers.filter(soldier => 
    soldier.name.includes(searchTerm) || 
    soldier.rank.includes(searchTerm) ||
    soldier.unit.includes(searchTerm) ||
    (soldier.serialNumber && soldier.serialNumber.includes(searchTerm))
  )
  
  // 병사 선택 시 해당 병사의 기술/경험 및 배지 로드
  const handleSelectSoldier = async (soldier: Soldier) => {
    setSelectedSoldier(soldier)
    await Promise.all([
      loadSoldierSkills(soldier.id),
      loadSoldierBadges(soldier.id)
    ])
  }
  
  // 병사의 기술 및 경험 로드
  const loadSoldierSkills = async (soldierId: string) => {
    try {
      const skillsRef = collection(db, 'skills')
      const q = query(
        skillsRef,
        where('userId', '==', soldierId),
        orderBy('awardedAt', 'desc')
      )
      
      const querySnapshot = await getDocs(q)
      const skillsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SkillItem[]
      
      setSkills(skillsList)
    } catch (error) {
      console.error('기술/경험 로드 오류:', error)
      toast({
        title: "오류",
        description: "기술 및 경험 정보를 불러오는데 실패했습니다.",
        variant: "destructive",
      })
    }
  }
  
  // 병사의 배지 로드
  const loadSoldierBadges = async (soldierId: string) => {
    try {
      const badgesRef = collection(db, 'badges')
      const q = query(
        badgesRef,
        where('userId', '==', soldierId),
        orderBy('awardedAt', 'desc')
      )
      
      const querySnapshot = await getDocs(q)
      const badgesList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BadgeItem[]
      
      setBadges(badgesList)
    } catch (error) {
      console.error('배지 로드 오류:', error)
      toast({
        title: "오류",
        description: "배지 정보를 불러오는데 실패했습니다.",
        variant: "destructive",
      })
    }
  }
  
  // 기술 및 경험 추가
  const handleAddSkill = async () => {
    if (!selectedSoldier || !newSkillTitle.trim()) {
      toast({
        title: "입력 오류",
        description: "필수 정보를 모두 입력해주세요.",
        variant: "destructive",
      })
      return
    }
    
    setIsAddingSkill(true)
    
    try {
      // 현재 로그인한 관리자 정보 (예시, 실제로는 인증 정보 사용)
      const adminName = "관리자"
      
      // Firestore에 기술 정보 추가
      await addDoc(collection(db, 'skills'), {
        userId: selectedSoldier.id,
        soldierName: selectedSoldier.name,
        soldierRank: selectedSoldier.rank,
        title: newSkillTitle.trim(),
        description: newSkillDescription.trim(),
        date: format(skillDate, 'yyyy-MM-dd'),
        awardedBy: adminName,
        awardedAt: serverTimestamp()
      })
      
      // 입력 필드 초기화
      setNewSkillTitle("")
      setNewSkillDescription("")
      setSkillDate(new Date())
      
      // 성공 메시지
      toast({
        title: "완료",
        description: "기술 및 경험이 성공적으로 추가되었습니다.",
      })
      
      // 최신 데이터 다시 로드
      await loadSoldierSkills(selectedSoldier.id)
    } catch (error) {
      console.error('기술/경험 추가 오류:', error)
      toast({
        title: "오류",
        description: "기술 및 경험 추가에 실패했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsAddingSkill(false)
    }
  }
  
  // 배지 추가
  const handleAddBadge = async () => {
    if (!selectedSoldier || !selectedBadgeIcon || !newBadgeTitle.trim()) {
      toast({
        title: "입력 오류",
        description: "필수 정보를 모두 입력해주세요.",
        variant: "destructive",
      })
      return
    }
    
    setIsAddingBadge(true)
    
    try {
      // 현재 로그인한 관리자 정보 (예시, 실제로는 인증 정보 사용)
      const adminName = "관리자"
      
      // Firestore에 배지 정보 추가
      await addDoc(collection(db, 'badges'), {
        userId: selectedSoldier.id,
        soldierName: selectedSoldier.name,
        soldierRank: selectedSoldier.rank,
        title: newBadgeTitle.trim(),
        icon: selectedBadgeIcon,
        description: newBadgeDescription.trim(),
        awardedBy: adminName,
        awardedAt: serverTimestamp()
      })
      
      // 입력 필드 초기화
      setNewBadgeTitle("")
      setSelectedBadgeIcon("")
      setNewBadgeDescription("")
      
      // 성공 메시지
      toast({
        title: "완료",
        description: "배지가 성공적으로 추가되었습니다.",
      })
      
      // 최신 데이터 다시 로드
      await loadSoldierBadges(selectedSoldier.id)
    } catch (error) {
      console.error('배지 추가 오류:', error)
      toast({
        title: "오류",
        description: "배지 추가에 실패했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsAddingBadge(false)
    }
  }

  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">병사 포트폴리오 관리</h1>
          <p className="text-muted-foreground">병사들의 기술/경험 부여 및 성취 배지 관리</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 왼쪽: 병사 목록 */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>병사 목록</CardTitle>
            <CardDescription>관리할 병사를 선택하세요</CardDescription>
            <div className="flex">
              <Input
                placeholder="병사 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mr-2"
              />
              <Button variant="outline" size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>이름</TableHead>
                      <TableHead>계급</TableHead>
                      <TableHead>소속</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSoldiers.map((soldier) => (
                      <TableRow 
                        key={soldier.id}
                        className={`cursor-pointer ${selectedSoldier?.id === soldier.id ? 'bg-muted' : ''}`}
                        onClick={() => handleSelectSoldier(soldier)}
                      >
                        <TableCell>{soldier.name}</TableCell>
                        <TableCell>{soldier.rank}</TableCell>
                        <TableCell>{soldier.unit}</TableCell>
                      </TableRow>
                    ))}
                    {filteredSoldiers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-4">
                          {searchTerm ? "검색 결과가 없습니다" : "병사 정보가 없습니다"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* 오른쪽: 포트폴리오 관리 */}
        <Card className="md:col-span-2">
          {selectedSoldier ? (
            <>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>{selectedSoldier.name} {selectedSoldier.rank}</CardTitle>
                    <CardDescription>{selectedSoldier.unit}</CardDescription>
                  </div>
                  <Badge variant="outline">{selectedSoldier.serialNumber || '군번 정보 없음'}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="skills">
                  <TabsList className="mb-4">
                    <TabsTrigger value="skills">기술 및 경험</TabsTrigger>
                    <TabsTrigger value="badges">성취 배지</TabsTrigger>
                  </TabsList>
                  
                  {/* 기술 및 경험 탭 */}
                  <TabsContent value="skills">
                    <div className="space-y-4">
                      <div className="border rounded-md p-4">
                        <h3 className="text-lg font-medium mb-4">새 기술/경험 추가</h3>
                        <div className="grid gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="skill-title">제목 *</Label>
                            <Input
                              id="skill-title"
                              placeholder="예: 보안장비 운용 교육 수료"
                              value={newSkillTitle}
                              onChange={(e) => setNewSkillTitle(e.target.value)}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="skill-description">설명</Label>
                            <Textarea
                              id="skill-description"
                              placeholder="기술/경험에 대한 자세한 설명을 입력하세요"
                              rows={3}
                              value={newSkillDescription}
                              onChange={(e) => setNewSkillDescription(e.target.value)}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label>날짜</Label>
                            <Popover open={isSkillDateOpen} onOpenChange={setIsSkillDateOpen}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className="w-full justify-start text-left font-normal"
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {skillDate ? format(skillDate, 'yyyy-MM-dd') : "날짜 선택"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                <Calendar
                                  mode="single"
                                  selected={skillDate}
                                  onSelect={(date) => {
                                    if (date) {
                                      setSkillDate(date)
                                      setIsSkillDateOpen(false)
                                    }
                                  }}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                          
                          <Button 
                            className="w-full" 
                            onClick={handleAddSkill}
                            disabled={isAddingSkill || !newSkillTitle.trim()}
                          >
                            {isAddingSkill ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                처리 중...
                              </>
                            ) : (
                              <>
                                <Award className="mr-2 h-4 w-4" />
                                기술/경험 추가
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-medium mb-4">부여된 기술 및 경험</h3>
                        <div className="border rounded-md">
                          {skills.length > 0 ? (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>제목</TableHead>
                                  <TableHead>날짜</TableHead>
                                  <TableHead>부여자</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {skills.map((skill) => (
                                  <TableRow key={skill.id}>
                                    <TableCell>
                                      <div className="font-medium">{skill.title}</div>
                                      {skill.description && (
                                        <div className="text-sm text-muted-foreground">{skill.description}</div>
                                      )}
                                    </TableCell>
                                    <TableCell>{skill.date}</TableCell>
                                    <TableCell>{skill.awardedBy}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          ) : (
                            <div className="text-center py-6 text-muted-foreground">
                              부여된 기술 및 경험이 없습니다
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  {/* 성취 배지 탭 */}
                  <TabsContent value="badges">
                    <div className="space-y-4">
                      <div className="border rounded-md p-4">
                        <h3 className="text-lg font-medium mb-4">새 배지 추가</h3>
                        <div className="grid gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="badge-icon">아이콘 *</Label>
                            <div className="grid grid-cols-5 gap-2">
                              {badgeIcons.map((badgeIcon) => (
                                <div 
                                  key={badgeIcon.id}
                                  className={`
                                    cursor-pointer rounded-md p-2 flex flex-col items-center justify-center
                                    ${selectedBadgeIcon === badgeIcon.id 
                                      ? 'bg-primary text-primary-foreground' 
                                      : 'bg-muted hover:bg-muted/80'}
                                  `}
                                  onClick={() => setSelectedBadgeIcon(badgeIcon.id)}
                                >
                                  {badgeIcon.icon}
                                  <span className="text-xs mt-1">{badgeIcon.name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="badge-title">제목 *</Label>
                            <Input
                              id="badge-title"
                              placeholder="예: 사격 전문가"
                              value={newBadgeTitle}
                              onChange={(e) => setNewBadgeTitle(e.target.value)}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="badge-description">설명</Label>
                            <Textarea
                              id="badge-description"
                              placeholder="배지에 대한 설명을 입력하세요"
                              rows={3}
                              value={newBadgeDescription}
                              onChange={(e) => setNewBadgeDescription(e.target.value)}
                            />
                          </div>
                          
                          <Button 
                            className="w-full" 
                            onClick={handleAddBadge}
                            disabled={isAddingBadge || !selectedBadgeIcon || !newBadgeTitle.trim()}
                          >
                            {isAddingBadge ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                처리 중...
                              </>
                            ) : (
                              <>
                                <Medal className="mr-2 h-4 w-4" />
                                배지 추가
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-medium mb-4">부여된 배지</h3>
                        {badges.length > 0 ? (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {badges.map((badge) => (
                              <div key={badge.id} className="border rounded-md p-4 flex flex-col items-center">
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                                  {badgeIcons.find(bi => bi.id === badge.icon)?.icon || <Trophy className="h-6 w-6" />}
                                </div>
                                <h4 className="font-medium text-center">{badge.title}</h4>
                                {badge.description && (
                                  <p className="text-sm text-muted-foreground text-center mt-1">{badge.description}</p>
                                )}
                                <div className="text-xs text-muted-foreground mt-2">
                                  부여자: {badge.awardedBy}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-6 text-muted-foreground border rounded-md">
                            부여된 배지가 없습니다
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex flex-col items-center justify-center h-[600px] text-center">
              <Target className="h-12 w-12 text-muted-foreground mb-4" />
              <h2 className="text-xl font-medium mb-2">병사를 선택해주세요</h2>
              <p className="text-muted-foreground">
                왼쪽 목록에서 포트폴리오를 관리할 병사를 선택하세요
              </p>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  )
} 