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
import { Pencil, Plus, Trash2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Vehicle } from "@/types"
import { getVehicles, addVehicle, updateVehicle, deleteVehicle } from "@/lib/api/vehicles"

export default function VehiclesPage() {
  const { toast } = useToast()
  
  // 상태 관리
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [currentVehicle, setCurrentVehicle] = useState<Vehicle | null>(null)
  
  // 폼 상태
  const [vehicleNumber, setVehicleNumber] = useState("")
  const [vehicleType, setVehicleType] = useState("")
  const [vehicleName, setVehicleName] = useState("")
  const [capacity, setCapacity] = useState("1")
  const [status, setStatus] = useState<"운행가능" | "정비중" | "운행중">("운행가능")
  
  // 차량 목록 불러오기
  const loadVehicles = async () => {
    try {
      setLoading(true)
      const response = await getVehicles()
      if (response.success && response.data) {
        setVehicles(response.data)
      } else {
        toast({
          title: "오류",
          description: response.error || "차량 목록을 불러오는데 실패했습니다.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "차량 목록을 불러오는데 실패했습니다.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }
  
  // 초기 데이터 로드
  useEffect(() => {
    loadVehicles()
  }, [])
  
  // 폼 초기화
  const resetForm = () => {
    setVehicleNumber("")
    setVehicleType("")
    setVehicleName("")
    setCapacity("1")
    setStatus("운행가능")
    setCurrentVehicle(null)
  }
  
  // 차량 추가
  const handleAddVehicle = async () => {
    if (!vehicleNumber || !vehicleType || !vehicleName) {
      toast({
        title: "알림",
        description: "모든 필수 항목을 입력해주세요.",
        variant: "destructive",
      })
      return
    }
    
    try {
      const newVehicle: Omit<Vehicle, "id"> = {
        vehicleNumber,
        vehicleType,
        vehicleName,
        capacity: parseInt(capacity, 10),
        status
      }
      
      const response = await addVehicle(newVehicle)
      
      if (response.success) {
        toast({
          title: "성공",
          description: "차량이 추가되었습니다.",
        })
        setAddDialogOpen(false)
        resetForm()
        loadVehicles()
      } else {
        toast({
          title: "오류",
          description: response.error || "차량 추가에 실패했습니다.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "차량 추가 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }
  
  // 차량 수정
  const handleEditVehicle = async () => {
    if (!currentVehicle) return
    
    if (!vehicleNumber || !vehicleType || !vehicleName) {
      toast({
        title: "알림",
        description: "모든 필수 항목을 입력해주세요.",
        variant: "destructive",
      })
      return
    }
    
    try {
      const updatedVehicle: Partial<Omit<Vehicle, "id">> = {
        vehicleNumber,
        vehicleType,
        vehicleName,
        capacity: parseInt(capacity, 10),
        status
      }
      
      const response = await updateVehicle(currentVehicle.id, updatedVehicle)
      
      if (response.success) {
        toast({
          title: "성공",
          description: "차량 정보가 수정되었습니다.",
        })
        setEditDialogOpen(false)
        resetForm()
        loadVehicles()
      } else {
        toast({
          title: "오류",
          description: response.error || "차량 수정에 실패했습니다.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "차량 수정 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }
  
  // 차량 삭제
  const handleDeleteVehicle = async () => {
    if (!currentVehicle) return
    
    try {
      const response = await deleteVehicle(currentVehicle.id)
      
      if (response.success) {
        toast({
          title: "성공",
          description: "차량이 삭제되었습니다.",
        })
        setDeleteDialogOpen(false)
        loadVehicles()
      } else {
        toast({
          title: "오류",
          description: response.error || "차량 삭제에 실패했습니다.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "차량 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }
  
  // 차량 편집 대화상자 열기
  const openEditDialog = (vehicle: Vehicle) => {
    setCurrentVehicle(vehicle)
    setVehicleNumber(vehicle.vehicleNumber)
    setVehicleType(vehicle.vehicleType)
    setVehicleName(vehicle.vehicleName)
    setCapacity(vehicle.capacity.toString())
    setStatus(vehicle.status)
    setEditDialogOpen(true)
  }
  
  // 차량 삭제 대화상자 열기
  const openDeleteDialog = (vehicle: Vehicle) => {
    setCurrentVehicle(vehicle)
    setDeleteDialogOpen(true)
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">차량 관리</h1>
          <p className="text-muted-foreground">
            부대 내 보유 차량을 등록하고 관리할 수 있습니다.
          </p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" /> 차량 추가
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>새 차량 등록</DialogTitle>
              <DialogDescription>
                새로운 차량 정보를 입력하여 등록하세요.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="vehicleNumber">차량번호</Label>
                <Input
                  id="vehicleNumber"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  placeholder="예: 12가1234"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="vehicleType">차종</Label>
                <Input
                  id="vehicleType"
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  placeholder="예: 승합차, 트럭"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="vehicleName">차량명</Label>
                <Input
                  id="vehicleName"
                  value={vehicleName}
                  onChange={(e) => setVehicleName(e.target.value)}
                  placeholder="예: 스타렉스, 포터"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="capacity">정원</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">상태</Label>
                <Select
                  value={status}
                  onValueChange={(value) => setStatus(value as "운행가능" | "정비중" | "운행중")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="상태 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="운행가능">운행가능</SelectItem>
                    <SelectItem value="정비중">정비중</SelectItem>
                    <SelectItem value="운행중">운행중</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleAddVehicle}>등록</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>차량 목록</CardTitle>
          <CardDescription>
            총 {vehicles.length}대의 차량이 등록되어 있습니다.
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
                    <TableHead>차량번호</TableHead>
                    <TableHead>차종</TableHead>
                    <TableHead>차량명</TableHead>
                    <TableHead>정원</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4">
                        등록된 차량이 없습니다
                      </TableCell>
                    </TableRow>
                  ) : (
                    vehicles.map((vehicle) => (
                      <TableRow key={vehicle.id}>
                        <TableCell className="font-medium">{vehicle.vehicleNumber}</TableCell>
                        <TableCell>{vehicle.vehicleType}</TableCell>
                        <TableCell>{vehicle.vehicleName}</TableCell>
                        <TableCell>{vehicle.capacity}명</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            vehicle.status === "운행가능" 
                              ? "bg-green-100 text-green-800" 
                              : vehicle.status === "정비중"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }>
                            {vehicle.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(vehicle)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDeleteDialog(vehicle)}
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
      
      {/* 차량 수정 대화상자 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>차량 정보 수정</DialogTitle>
            <DialogDescription>
              차량 정보를 수정할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-vehicleNumber">차량번호</Label>
              <Input
                id="edit-vehicleNumber"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                placeholder="예: 12가1234"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-vehicleType">차종</Label>
              <Input
                id="edit-vehicleType"
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                placeholder="예: 승합차, 트럭"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-vehicleName">차량명</Label>
              <Input
                id="edit-vehicleName"
                value={vehicleName}
                onChange={(e) => setVehicleName(e.target.value)}
                placeholder="예: 스타렉스, 포터"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-capacity">정원</Label>
              <Input
                id="edit-capacity"
                type="number"
                min="1"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-status">상태</Label>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as "운행가능" | "정비중" | "운행중")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="상태 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="운행가능">운행가능</SelectItem>
                  <SelectItem value="정비중">정비중</SelectItem>
                  <SelectItem value="운행중">운행중</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleEditVehicle}>수정</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 차량 삭제 대화상자 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>차량 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 차량을 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteVehicle}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 