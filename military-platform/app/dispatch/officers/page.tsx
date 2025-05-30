"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Officer } from "@/types"
import { getOfficers, addOfficer, updateOfficer, deleteOfficer } from "@/lib/api/officers"

export default function OfficersPage() {
  const { toast } = useToast()
  
  // 상태 관리
  const [officers, setOfficers] = useState<Officer[]>([])
  const [loading, setLoading] = useState(true)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [currentOfficer, setCurrentOfficer] = useState<Officer | null>(null)
  
  // 폼 상태
  const [name, setName] = useState("")
  const [rank, setRank] = useState("")
  const [unit, setUnit] = useState("")
  const [position, setPosition] = useState("")
  const [contact, setContact] = useState("")
  const [status, setStatus] = useState<"재직" | "휴가" | "출장" | "교육">("재직")
  const [available, setAvailable] = useState(true)
  
  // 계급 목록
  const ranks = [
    "이등병", "일병", "상병", "병장",
    "하사", "중사", "상사", "원사", "준위",
    "소위", "중위", "대위", "소령", "중령", "대령"
  ]
  
  // 간부 목록 불러오기
  const loadOfficers = async () => {
    try {
      setLoading(true)
      const response = await getOfficers()
      if (response.success && response.data) {
        setOfficers(response.data)
      } else {
        toast({
          title: "오류",
          description: response.error || "간부 목록을 불러오는데 실패했습니다.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "간부 목록을 불러오는데 실패했습니다.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }
  
  // 초기 데이터 로드
  useEffect(() => {
    loadOfficers()
  }, [])
  
  // 폼 초기화
  const resetForm = () => {
    setName("")
    setRank("")
    setUnit("")
    setPosition("")
    setContact("")
    setStatus("재직")
    setAvailable(true)
    setCurrentOfficer(null)
  }
  
  // 간부 추가
  const handleAddOfficer = async () => {
    if (!name || !rank || !unit || !position || !contact) {
      toast({
        title: "알림",
        description: "모든 필수 항목을 입력해주세요.",
        variant: "destructive",
      })
      return
    }
    
    try {
      const newOfficer: Omit<Officer, "id"> = {
        name,
        rank,
        unit,
        position,
        contact,
        status,
        available
      }
      
      const response = await addOfficer(newOfficer)
      
      if (response.success) {
        toast({
          title: "성공",
          description: "간부가 추가되었습니다.",
        })
        setAddDialogOpen(false)
        resetForm()
        loadOfficers()
      } else {
        toast({
          title: "오류",
          description: response.error || "간부 추가에 실패했습니다.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "간부 추가 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }
  
  // 간부 수정
  const handleEditOfficer = async () => {
    if (!currentOfficer) return
    
    if (!name || !rank || !unit || !position || !contact) {
      toast({
        title: "알림",
        description: "모든 필수 항목을 입력해주세요.",
        variant: "destructive",
      })
      return
    }
    
    try {
      const updatedOfficer: Partial<Omit<Officer, "id">> = {
        name,
        rank,
        unit,
        position,
        contact,
        status,
        available
      }
      
      const response = await updateOfficer(currentOfficer.id, updatedOfficer)
      
      if (response.success) {
        toast({
          title: "성공",
          description: "간부 정보가 수정되었습니다.",
        })
        setEditDialogOpen(false)
        resetForm()
        loadOfficers()
      } else {
        toast({
          title: "오류",
          description: response.error || "간부 수정에 실패했습니다.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "간부 수정 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }
  
  // 간부 삭제
  const handleDeleteOfficer = async () => {
    if (!currentOfficer) return
    
    try {
      const response = await deleteOfficer(currentOfficer.id)
      
      if (response.success) {
        toast({
          title: "성공",
          description: "간부가 삭제되었습니다.",
        })
        setDeleteDialogOpen(false)
        loadOfficers()
      } else {
        toast({
          title: "오류",
          description: response.error || "간부 삭제에 실패했습니다.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "간부 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }
  
  // 간부 편집 대화상자 열기
  const openEditDialog = (officer: Officer) => {
    setCurrentOfficer(officer)
    setName(officer.name)
    setRank(officer.rank)
    setUnit(officer.unit)
    setPosition(officer.position)
    setContact(officer.contact)
    setStatus(officer.status)
    setAvailable(officer.available)
    setEditDialogOpen(true)
  }
  
  // 간부 삭제 대화상자 열기
  const openDeleteDialog = (officer: Officer) => {
    setCurrentOfficer(officer)
    setDeleteDialogOpen(true)
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">간부 관리</h1>
          <p className="text-muted-foreground">
            배차 시 선탑자로 지정할 간부를 등록하고 관리할 수 있습니다.
          </p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" /> 간부 추가
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>새 간부 등록</DialogTitle>
              <DialogDescription>
                새로운 간부 정보를 입력하여 등록하세요.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">이름</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 홍길동"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rank">계급</Label>
                <Select
                  value={rank}
                  onValueChange={setRank}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="계급 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {ranks.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="unit">소속</Label>
                <Input
                  id="unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="예: 1중대, 본부중대"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="position">직책</Label>
                <Input
                  id="position"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="예: 중대장, 소대장"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contact">연락처</Label>
                <Input
                  id="contact"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="예: 010-1234-5678"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">상태</Label>
                <Select
                  value={status}
                  onValueChange={(value) => setStatus(value as "재직" | "휴가" | "출장" | "교육")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="상태 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="재직">재직</SelectItem>
                    <SelectItem value="휴가">휴가</SelectItem>
                    <SelectItem value="출장">출장</SelectItem>
                    <SelectItem value="교육">교육</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="available"
                  checked={available}
                  onCheckedChange={setAvailable}
                />
                <Label htmlFor="available">선탑자 가용 여부</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleAddOfficer}>등록</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>간부 목록</CardTitle>
          <CardDescription>
            총 {officers.length}명의 간부가 등록되어 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <p>데이터를 불러오는 중...</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>이름</TableHead>
                    <TableHead>계급</TableHead>
                    <TableHead>소속</TableHead>
                    <TableHead>직책</TableHead>
                    <TableHead>연락처</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>가용여부</TableHead>
                    <TableHead>관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {officers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-4">
                        등록된 간부가 없습니다
                      </TableCell>
                    </TableRow>
                  ) : (
                    officers.map((officer) => (
                      <TableRow key={officer.id}>
                        <TableCell className="font-medium">{officer.name}</TableCell>
                        <TableCell>{officer.rank}</TableCell>
                        <TableCell>{officer.unit}</TableCell>
                        <TableCell>{officer.position}</TableCell>
                        <TableCell>{officer.contact}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            officer.status === "재직" 
                              ? "bg-green-100 text-green-800" 
                              : officer.status === "휴가"
                              ? "bg-blue-100 text-blue-800"
                              : officer.status === "출장"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-purple-100 text-purple-800"
                          }>
                            {officer.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={officer.available ? "default" : "secondary"}>
                            {officer.available ? "가능" : "불가"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(officer)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDeleteDialog(officer)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* 간부 수정 대화상자 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>간부 정보 수정</DialogTitle>
            <DialogDescription>
              간부 정보를 수정할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">이름</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 홍길동"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-rank">계급</Label>
              <Select
                value={rank}
                onValueChange={setRank}
              >
                <SelectTrigger>
                  <SelectValue placeholder="계급 선택" />
                </SelectTrigger>
                <SelectContent>
                  {ranks.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-unit">소속</Label>
              <Input
                id="edit-unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="예: 1중대, 본부중대"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-position">직책</Label>
              <Input
                id="edit-position"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="예: 중대장, 소대장"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-contact">연락처</Label>
              <Input
                id="edit-contact"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="예: 010-1234-5678"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-status">상태</Label>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as "재직" | "휴가" | "출장" | "교육")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="상태 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="재직">재직</SelectItem>
                  <SelectItem value="휴가">휴가</SelectItem>
                  <SelectItem value="출장">출장</SelectItem>
                  <SelectItem value="교육">교육</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-available"
                checked={available}
                onCheckedChange={setAvailable}
              />
              <Label htmlFor="edit-available">선탑자 가용 여부</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleEditOfficer}>수정</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 간부 삭제 대화상자 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>간부 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 간부를 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteOfficer}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 
 