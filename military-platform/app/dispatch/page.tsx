"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon, CheckCircle2, Download, Pencil, Plus, Printer, Trash2, FileText, List, Save } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { Check } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { useRouter } from "next/navigation"

import { Vehicle, Soldier, Officer, Dispatch } from "@/types"
import { getVehicles, getAvailableVehicles, addVehicle, updateVehicle, deleteVehicle } from "@/lib/api/vehicles"
import { getDrivers } from "@/lib/api/soldiers"
import { getOfficers } from "@/lib/api/officers"
import { getDispatches, addDispatch, updateDispatch, deleteDispatch, updateDispatchStatus, addDispatchDocument } from "@/lib/api/dispatches"

export default function DispatchPage() {
  const { toast } = useToast()
  const router = useRouter()
  
  // 달력 및 폼 관련 상태
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [dispatchDate, setDispatchDate] = useState<Date | undefined>(new Date())
  const [startTime, setStartTime] = useState("09:00")
  const [endTime, setEndTime] = useState("17:00")
  const [selectedVehicle, setSelectedVehicle] = useState("")
  const [selectedDriver, setSelectedDriver] = useState("")
  const [selectedOfficer, setSelectedOfficer] = useState("")
  const [destination, setDestination] = useState("")
  const [purpose, setPurpose] = useState("")
  const [passengerCount, setPassengerCount] = useState("1")
  const [notes, setNotes] = useState("")
  
  // 탭 및 뷰 모드 상태
  const [selectedTab, setSelectedTab] = useState("all")
  const [viewMode, setViewMode] = useState("today")
  const [filterDate, setFilterDate] = useState<Date | undefined>(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  
  // 다이얼로그 상태
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [vehicleManageOpen, setVehicleManageOpen] = useState(false)
  const [isFixedRoute, setIsFixedRoute] = useState(false)
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false)
  const [documentNumber, setDocumentNumber] = useState("")
  const [unitName, setUnitName] = useState("제00부대")
  const [creator, setCreator] = useState("상병 홍길동")
  const [commanderName, setCommanderName] = useState("대대장")
  const [additionalNotes, setAdditionalNotes] = useState("")

  // 차량 관리 폼 상태
  const [newVehicle, setNewVehicle] = useState({
    vehicleNumber: "",
    vehicleType: "",
    vehicleName: "",
    capacity: "1",
    status: "운행가능" as "운행가능" | "정비중" | "운행중"
  })
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  
  // 데이터 상태
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([])
  const [drivers, setDrivers] = useState<Soldier[]>([])
  const [officers, setOfficers] = useState<Officer[]>([])
  const [dispatches, setDispatches] = useState<Dispatch[]>([])
  const [currentDispatch, setCurrentDispatch] = useState<Dispatch | null>(null)
  const [loading, setLoading] = useState(true)
  
  // 선택된 배차 정보 상태
  const [currentVehicle, setCurrentVehicle] = useState<Vehicle | null>(null)
  const [currentDriver, setCurrentDriver] = useState<Soldier | null>(null)
  const [currentOfficer, setCurrentOfficer] = useState<Officer | null>(null)
  
  // 배차 목록 필터링
  const filteredDispatches = dispatches.filter(dispatch => {
    if (viewMode === "today") {
      return dispatch.date === format(new Date(), "yyyy-MM-dd")
    } else if (viewMode === "week") {
      const today = new Date()
      const weekAgo = new Date()
      weekAgo.setDate(today.getDate() - 7)
      const dispatchDateObj = new Date(dispatch.date)
      return dispatchDateObj >= weekAgo && dispatchDateObj <= today
    } else if (viewMode === "month") {
      const today = new Date()
      const thisMonth = today.getMonth()
      const thisYear = today.getFullYear()
      const dispatchDateObj = new Date(dispatch.date)
      return dispatchDateObj.getMonth() === thisMonth && dispatchDateObj.getFullYear() === thisYear
    } else if (viewMode === "specific-date" && filterDate) {
      return dispatch.date === format(filterDate, "yyyy-MM-dd")
    } else if (viewMode === "scheduled") {
      return dispatch.status === "예정"
    } else if (viewMode === "completed") {
      return dispatch.status === "완료"
    }
    return true
  })

  // 데이터 로드 함수들
  const loadVehicles = async () => {
    try {
      const response = await getVehicles();
      if (response.success && response.data) {
        setVehicles(response.data);
      } else {
        toast({
          title: "오류",
          description: response.error || "차량 목록을 불러오는데 실패했습니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "차량 목록을 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const loadAvailableVehicles = async () => {
    try {
      const response = await getAvailableVehicles();
      if (response.success && response.data) {
        setAvailableVehicles(response.data);
      }
    } catch (error) {
      console.error("가용 차량 로드 실패:", error);
    }
  };

  const loadDrivers = async () => {
    try {
      const response = await getDrivers();
      if (response.success && response.data) {
        setDrivers(response.data);
      } else {
        toast({
          title: "오류",
          description: response.error || "운전병 목록을 불러오는데 실패했습니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "운전병 목록을 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const loadOfficers = async () => {
    try {
      const response = await getOfficers();
      if (response.success && response.data) {
        setOfficers(response.data);
      } else {
        toast({
          title: "오류",
          description: response.error || "간부 목록을 불러오는데 실패했습니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "간부 목록을 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const loadDispatches = async () => {
    try {
      setLoading(true);
      const response = await getDispatches();
      if (response.success && response.data) {
        setDispatches(response.data);
      } else {
        toast({
          title: "오류",
          description: response.error || "배차 지시서를 불러오는데 실패했습니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "배차 지시서를 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // 초기 데이터 로드
  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          loadVehicles(),
          loadAvailableVehicles(),
          loadDrivers(),
          loadOfficers(),
          loadDispatches()
        ]);
      } catch (error) {
        console.error("데이터 로드 실패:", error);
        toast({
          title: "오류",
          description: "데이터를 불러오는데 실패했습니다.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadAllData();
  }, []);

  // PDF 다운로드 함수 (실제로는 백엔드에 요청)
  const handleDownloadPDF = () => {
    // 현재 선택된 날짜나 필터에 맞는 배차지시서로 이동
    let url = "/dispatch/print";
    
    // 필터가 특정 날짜면 해당 날짜의 배차지시서 출력
    if (viewMode === "specific-date" && filterDate) {
      url += `?date=${format(filterDate, "yyyy-MM-dd")}`;
    } 
    // 필터가 오늘이면 오늘 날짜의 배차지시서 출력
    else if (viewMode === "today") {
      url += `?date=${format(new Date(), "yyyy-MM-dd")}`;
    }
    // 다른 경우는 일단 오늘 날짜로
    else {
      url += `?date=${format(new Date(), "yyyy-MM-dd")}`;
    }
    
    window.open(url, "_blank");
  }

  // 인쇄 함수
  const handlePrint = () => {
    handleDownloadPDF(); // PDF와 동일하게 처리 (새 창에서 인쇄용 페이지 열기)
  }

  // 배차 폼 초기화
  const resetDispatchForm = () => {
    setDispatchDate(new Date());
    setStartTime("09:00");
    setEndTime("17:00");
    setSelectedVehicle("");
    setSelectedDriver("");
    setSelectedOfficer("");
    setDestination("");
    setPurpose("");
    setPassengerCount("1");
    setNotes("");
    setIsFixedRoute(false);
    setCurrentDispatch(null);
  };

  // 배차 추가 함수
  const handleAddDispatch = async () => {
    if (!dispatchDate) {
      toast({
        title: "알림",
        description: "날짜를 선택해주세요.",
        variant: "destructive",
      });
      return;
    }
    
    if (!selectedVehicle || !selectedDriver || !selectedOfficer || !destination || !purpose) {
      toast({
        title: "알림",
        description: "모든 필수 항목을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const newDispatch: Omit<Dispatch, "id"> = {
        date: format(dispatchDate, "yyyy-MM-dd"),
        startTime,
        endTime,
        vehicleId: selectedVehicle,
        driverId: selectedDriver,
        officerId: selectedOfficer,
        destination,
        purpose,
        passengerCount: parseInt(passengerCount, 10),
        status: "예정",
        notes,
        isFixedRoute
      };
      
      const response = await addDispatch(newDispatch);
      
      if (response.success) {
        toast({
          title: "성공",
          description: "배차 지시가 추가되었습니다.",
        });
        setAddDialogOpen(false);
        resetDispatchForm();
        loadDispatches();
      } else {
        toast({
          title: "오류",
          description: response.error || "배차 지시 추가에 실패했습니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "배차 지시 추가 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  // 배차 수정 함수
  const handleEditDispatch = async () => {
    if (!currentDispatch || !dispatchDate) {
      return;
    }
    
    try {
      const updatedDispatch: Partial<Omit<Dispatch, "id">> = {
        date: format(dispatchDate, "yyyy-MM-dd"),
        startTime,
        endTime,
        vehicleId: selectedVehicle,
        driverId: selectedDriver,
        officerId: selectedOfficer,
        destination,
        purpose,
        passengerCount: parseInt(passengerCount, 10),
        notes,
        isFixedRoute
      };
      
      const response = await updateDispatch(currentDispatch.id, updatedDispatch);
      
      if (response.success) {
        toast({
          title: "성공",
          description: "배차 지시가 수정되었습니다.",
        });
        setEditDialogOpen(false);
        resetDispatchForm();
        loadDispatches();
      } else {
        toast({
          title: "오류",
          description: response.error || "배차 지시 수정에 실패했습니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "배차 지시 수정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  // 배차 삭제 함수
  const handleDeleteDispatch = async () => {
    if (!currentDispatch) {
      return;
    }
    
    try {
      const response = await deleteDispatch(currentDispatch.id);
      
      if (response.success) {
        toast({
          title: "성공",
          description: "배차 지시가 삭제되었습니다.",
        });
        setDeleteDialogOpen(false);
        loadDispatches();
      } else {
        toast({
          title: "오류",
          description: response.error || "배차 지시 삭제에 실패했습니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "배차 지시 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  // 배차 상태 변경 함수
  const handleUpdateStatus = async (id: string, status: "예정" | "진행중" | "완료" | "취소") => {
    try {
      const response = await updateDispatchStatus(id, status);
      
      if (response.success) {
        toast({
          title: "성공",
          description: `배차 상태가 '${status}'로 변경되었습니다.`,
        });
        loadDispatches();
      } else {
        toast({
          title: "오류",
          description: response.error || "배차 상태 변경에 실패했습니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "배차 상태 변경 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  // 배차 편집 대화상자 열기
  const openEditDialog = (dispatch: Dispatch) => {
    setCurrentDispatch(dispatch);
    setDispatchDate(new Date(dispatch.date));
    setStartTime(dispatch.startTime);
    setEndTime(dispatch.endTime);
    setSelectedVehicle(dispatch.vehicleId);
    setSelectedDriver(dispatch.driverId);
    setSelectedOfficer(dispatch.officerId);
    setDestination(dispatch.destination);
    setPurpose(dispatch.purpose);
    setPassengerCount(dispatch.passengerCount.toString());
    setNotes(dispatch.notes);
    setIsFixedRoute(dispatch.isFixedRoute || false);
    setEditDialogOpen(true);
  };

  // 배차 삭제 대화상자 열기
  const openDeleteDialog = (dispatch: Dispatch) => {
    setCurrentDispatch(dispatch);
    setDeleteDialogOpen(true);
  };

  // 특정 ID의 차량 정보 가져오기
  const getVehicleInfo = (id: string) => {
    return vehicles.find(vehicle => vehicle.id === id);
  };

  // 특정 ID의 운전병 정보 가져오기
  const getDriverInfo = (id: string) => {
    return drivers.find(driver => driver.id === id);
  };

  // 특정 ID의 간부 정보 가져오기
  const getOfficerInfo = (id: string) => {
    return officers.find(officer => officer.id === id);
  };

  // 차량 관리 함수들
  const handleAddVehicle = async () => {
    try {
      // 필수 필드 검증
      if (!newVehicle.vehicleNumber || !newVehicle.vehicleName || !newVehicle.vehicleType) {
        toast({
          title: "입력 오류",
          description: "차량 번호, 차종, 차량명은 필수 입력사항입니다.",
          variant: "destructive",
        });
        return;
      }

      if (editingVehicle) {
        // 기존 차량 정보 수정
        const response = await updateVehicle(editingVehicle.id, {
          vehicleNumber: newVehicle.vehicleNumber,
          vehicleName: newVehicle.vehicleName,
          vehicleType: newVehicle.vehicleType,
          capacity: parseInt(newVehicle.capacity) || 0,
          status: newVehicle.status as "운행가능" | "정비중" | "운행중"
        });

        if (response.success) {
          toast({
            title: "성공",
            description: "차량 정보가 수정되었습니다.",
          });
          setVehicleManageOpen(false);
          resetVehicleForm();
          loadVehicles();
          loadAvailableVehicles();
        } else {
          toast({
            title: "오류",
            description: response.error || "차량 정보 수정에 실패했습니다.",
            variant: "destructive",
          });
        }
      } else {
        // 새 차량 추가
        const response = await addVehicle({
          vehicleNumber: newVehicle.vehicleNumber,
          vehicleName: newVehicle.vehicleName,
          vehicleType: newVehicle.vehicleType,
          capacity: parseInt(newVehicle.capacity) || 0,
          status: newVehicle.status as "운행가능" | "정비중" | "운행중"
        });

        if (response.success) {
          toast({
            title: "성공",
            description: "새 차량이 등록되었습니다.",
          });
          setVehicleManageOpen(false);
          resetVehicleForm();
          loadVehicles();
          loadAvailableVehicles();
        } else {
          toast({
            title: "오류",
            description: response.error || "차량 등록에 실패했습니다.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("차량 관리 오류:", error);
      toast({
        title: "오류",
        description: "차량 정보 처리 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateVehicleStatus = async (vehicleId: string, status: "운행가능" | "정비중" | "운행중") => {
    try {
      // API로 차량 상태 업데이트
      const response = await updateVehicle(vehicleId, { status });
      
      if (response.success) {
        toast({
          title: "성공",
          description: `차량 상태가 '${status}'로 변경되었습니다.`,
        });
        
        loadVehicles();
        loadAvailableVehicles();
      } else {
        toast({
          title: "오류",
          description: response.error || "차량 상태 변경에 실패했습니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("차량 상태 변경 오류:", error);
      toast({
        title: "오류",
        description: "차량 상태 변경 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const resetVehicleForm = () => {
    setNewVehicle({
      vehicleNumber: "",
      vehicleType: "",
      vehicleName: "",
      capacity: "1",
      status: "운행가능"
    });
    setEditingVehicle(null);
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    try {
      const response = await deleteVehicle(vehicleId);
      
      if (response.success) {
        toast({
          title: "삭제 완료",
          description: "차량이 삭제되었습니다.",
        });
        loadVehicles();
        loadAvailableVehicles();
      } else {
        toast({
          title: "삭제 실패",
          description: response.error || "차량을 삭제하는 데 실패했습니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("차량 삭제 오류:", error);
      toast({
        title: "오류",
        description: "차량 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  // 특정 날짜 적용 함수
  const applySpecificDateFilter = () => {
    setViewMode("specific-date")
    setShowDatePicker(false)
  }

  // 배차지시서 게시 함수
  const openPublishDialog = () => {
    // 문서 번호 생성 (현재 날짜 기반)
    const today = new Date()
    const docNumber = `제 ${format(today, 'yyyy')} - ${format(today, 'MM')}${format(today, 'dd')} 호`
    setDocumentNumber(docNumber)
    
    // 현재 로그인한 사용자 정보 등을 활용하여 작성자 설정 (예시)
    // setCreator("홍길동 상병")
    
    setDocumentDialogOpen(true)
  }

  // 배차지시서 저장하는 함수
  const handlePublishDocument = async () => {
    // 날짜가 선택되지 않았으면 경고 표시하고 반환
    if (!filterDate) {
      toast({
        title: "날짜 선택 필요",
        description: "배차지시서를 생성하려면 날짜를 선택해야 합니다.",
        variant: "destructive",
      });
      return;
    }
    
    // 배차지시서 생성
    const filteredDispatchIds = filteredDispatches
      .filter(d => d.date === format(filterDate, "yyyy-MM-dd"))
      .map(d => d.id);
    
    // 배차가 없는 경우 알림
    if (filteredDispatchIds.length === 0) {
      toast({
        title: "배차 없음",
        description: "선택한 날짜에 배차 일정이 없습니다.",
        variant: "destructive",
      });
      return;
    }
    
    // 문서 생성 요청
    try {
      const document = {
        date: filterDate ? format(filterDate, "yyyy년 MM월 dd일") : format(new Date(), "yyyy년 MM월 dd일"),
        documentNumber: documentNumber || `제 ${format(new Date(), 'yyyy')} - ${format(new Date(), 'MM')}${format(new Date(), 'dd')} 호`,
        unitName: unitName || "제00부대",
        creator: creator || "작성자",
        commanderName: commanderName || "지휘관",
        additionalNotes: additionalNotes || "",
        dispatchIds: filteredDispatchIds
      };
      
      const response = await addDispatchDocument(document);
      
      if (response.success) {
        setDocumentDialogOpen(false);
        toast({
          title: "배차지시서 생성 완료",
          description: "배차지시서가 생성되었습니다.",
        });
        
        // 문서 목록으로 이동
        router.push("/dispatch/documents");
      } else {
        toast({
          title: "오류",
          description: response.error || "배차지시서 생성에 실패했습니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("배차지시서 생성 오류:", error);
      toast({
        title: "오류",
        description: "배차지시서 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  // 배차지시서 문서 목록 페이지로 이동하는 함수
  const navigateToDocumentList = () => {
    window.open('/dispatch/documents', '_blank')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">배차지시서 관리</h1>
          <p className="text-muted-foreground">
            차량 배차 일정을 관리하고 배차지시서를 생성합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> 인쇄
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
            <Download className="mr-2 h-4 w-4" /> PDF 저장
          </Button>
          <Button 
            variant="outline" 
            onClick={openPublishDialog}
            className="flex items-center"
          >
            <FileText className="mr-2 h-4 w-4" />
            배차지시서 게시
          </Button>
          <Button 
            variant="outline" 
            onClick={navigateToDocumentList}
            className="flex items-center"
          >
            <List className="mr-2 h-4 w-4" />
            배차지시서 목록
          </Button>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetDispatchForm()}>
                <Plus className="mr-2 h-4 w-4" /> 배차 추가
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>새 배차 지시 추가</DialogTitle>
                <DialogDescription>
                  배차 정보를 입력하여 새로운 배차 지시를 생성하세요.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="date">날짜</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dispatchDate ? format(dispatchDate, 'PPP', { locale: ko }) : "날짜 선택"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dispatchDate}
                          onSelect={setDispatchDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="startTime">시작 시간</Label>
                      <Input
                        id="startTime"
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="endTime">종료 시간</Label>
                      <Input
                        id="endTime"
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="vehicle">차량 선택</Label>
                    <Select
                      value={selectedVehicle}
                      onValueChange={(value) => {
                        setSelectedVehicle(value);
                        const selected = vehicles.find(v => v.id === value);
                        setCurrentVehicle(selected || null);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="차량을 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>사용 가능한 차량</SelectLabel>
                          {vehicles
                            .filter(vehicle => vehicle.status === "운행가능")
                            .map(vehicle => (
                              <SelectItem key={vehicle.id} value={vehicle.id}>
                                {vehicle.vehicleName} ({vehicle.vehicleType}) - {vehicle.vehicleNumber}
                              </SelectItem>
                            ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="driver">운전자 선택</Label>
                    <Select
                      value={selectedDriver}
                      onValueChange={(value) => {
                        setSelectedDriver(value);
                        const selected = drivers.find(d => d.id === value);
                        setCurrentDriver(selected || null);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="운전자를 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>운전 가능 인원</SelectLabel>
                          {drivers.map(driver => (
                            <SelectItem key={driver.id} value={driver.id}>
                              <div className="flex items-center space-x-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={driver.avatar} alt={driver.name} />
                                  <AvatarFallback>{driver.name.slice(0, 1)}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium">{driver.name}</div>
                                  <div className="text-xs text-muted-foreground">{driver.rank} - {driver.position}</div>
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="officer">간부 선택</Label>
                    <Select
                      value={selectedOfficer}
                      onValueChange={(value) => {
                        setSelectedOfficer(value);
                        const selected = officers.find(o => o.id === value);
                        setCurrentOfficer(selected || null);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="책임 간부를 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>간부</SelectLabel>
                          {officers.map(officer => (
                            <SelectItem key={officer.id} value={officer.id}>
                              {officer.rank} {officer.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {currentVehicle && (
                    <div className="rounded-md border p-3">
                      <h4 className="text-sm font-semibold mb-1">선택된 차량</h4>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="bg-blue-100 text-blue-800">
                          {currentVehicle.vehicleType}
                        </Badge>
                        <Badge variant="outline" className="bg-gray-100">
                          {currentVehicle.vehicleNumber}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        수용인원: {currentVehicle.capacity || "정보 없음"}
                      </p>
                    </div>
                  )}

                  {selectedDriver && drivers.find(d => d.id === selectedDriver) && (
                    <div className="rounded-md border p-3">
                      <h4 className="text-sm font-semibold mb-1">선택된 운전자</h4>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="bg-green-100 text-green-800">
                          {drivers.find(d => d.id === selectedDriver)?.rank}
                        </Badge>
                        <span className="text-sm font-medium">{drivers.find(d => d.id === selectedDriver)?.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        운전기량: {drivers.find(d => d.id === selectedDriver)?.drivingSkill || "정보 없음"}
                      </p>
                    </div>
                  )}

                  {selectedOfficer && officers.find(o => o.id === selectedOfficer) && (
                    <div className="rounded-md border p-3">
                      <h4 className="text-sm font-semibold mb-1">선탑자</h4>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="bg-purple-100 text-purple-800">
                          {officers.find(o => o.id === selectedOfficer)?.rank}
                        </Badge>
                        <span className="text-sm font-medium">{officers.find(o => o.id === selectedOfficer)?.name}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="grid gap-2 mt-4">
                <Label htmlFor="destination">목적지</Label>
                <Input
                  id="destination"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                />
              </div>
              
              <div className="grid gap-2 mt-2">
                <Label htmlFor="purpose">사용 목적</Label>
                <Input
                  id="purpose"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="grid gap-2">
                  <Label htmlFor="passengerCount">승객 수</Label>
                  <Input
                    id="passengerCount"
                    type="number"
                    min="1"
                    value={passengerCount}
                    onChange={(e) => setPassengerCount(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="notes">비고</Label>
                  <Input
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="isFixedRoute"
                    checked={isFixedRoute}
                    onCheckedChange={(checked) => setIsFixedRoute(checked as boolean)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label
                      htmlFor="isFixedRoute"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      고정 배차
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      매일 반복되는 고정 일정인 경우 체크하세요
                    </p>
                  </div>
                </div>
              </div>
              
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                  취소
                </Button>
                <Button onClick={handleAddDispatch}>추가</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">가용 차량</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {availableVehicles.length}대
            </div>
            <p className="text-xs text-muted-foreground">전체 {vehicles.length}대 중</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">운전병</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {drivers.length}명
            </div>
            <p className="text-xs text-muted-foreground">현재 가용 인원</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">오늘의 배차</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dispatches.filter(d => d.date === format(new Date(), "yyyy-MM-dd")).length}건
            </div>
            <p className="text-xs text-muted-foreground">
              {format(new Date(), "yyyy년 MM월 dd일", { locale: ko })}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="space-y-4" onValueChange={setSelectedTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all" onClick={() => setViewMode("all")}>모든 배차</TabsTrigger>
            <TabsTrigger value="today" onClick={() => setViewMode("today")}>오늘의 배차</TabsTrigger>
            <TabsTrigger value="week" onClick={() => setViewMode("week")}>일주일 내 배차</TabsTrigger>
            <TabsTrigger value="scheduled" onClick={() => setViewMode("scheduled")}>예정된 배차</TabsTrigger>
            <TabsTrigger value="completed" onClick={() => setViewMode("completed")}>완료된 배차</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {viewMode === "specific-date" && filterDate
                    ? format(filterDate, "yyyy-MM-dd")
                    : "날짜 선택"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={filterDate}
                  onSelect={setFilterDate}
                  initialFocus
                />
                <div className="p-2 border-t border-border">
                  <Button 
                    className="w-full" 
                    onClick={applySpecificDateFilter}
                  >
                    이 날짜로 조회
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex justify-center items-center h-40">
                <p>데이터를 불러오는 중...</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>날짜/시간</TableHead>
                      <TableHead>차량정보</TableHead>
                      <TableHead>운전병</TableHead>
                      <TableHead>선탑자</TableHead>
                      <TableHead>목적지</TableHead>
                      <TableHead>사용목적</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>관리</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDispatches.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-24 text-center">
                          {viewMode === "specific-date" && filterDate ? (
                            <>선택한 날짜({format(filterDate, 'yyyy년 MM월 dd일')})에 배차 정보가 없습니다.</>
                          ) : (
                            <>배차 정보가 없습니다.</>
                          )}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredDispatches.map((dispatch) => {
                        const vehicle = getVehicleInfo(dispatch.vehicleId);
                        const driver = getDriverInfo(dispatch.driverId);
                        const officer = getOfficerInfo(dispatch.officerId);
                        
                        return (
                          <TableRow key={dispatch.id}>
                            <TableCell className="font-medium">
                              {format(new Date(dispatch.date), "yyyy-MM-dd", { locale: ko })}
                            </TableCell>
                            <TableCell>
                              {dispatch.startTime} ~ {dispatch.endTime}
                            </TableCell>
                            <TableCell>
                              {vehicle ? (
                                <div className="flex flex-col">
                                  <div className="font-medium">{vehicle.vehicleType}</div>
                                  <div className="text-xs text-muted-foreground">{vehicle.vehicleNumber}</div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">정보 없음</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {driver ? (
                                <div className="flex items-center">
                                  <Avatar className="h-6 w-6 mr-2">
                                    <AvatarFallback>{driver.name[0]}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <div className="font-medium">{driver.name}</div>
                                    <div className="text-xs text-muted-foreground">{driver.rank}</div>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">정보 없음</span>
                              )}
                            </TableCell>
                            <TableCell>{dispatch.destination}</TableCell>
                            <TableCell>
                              <div className="flex space-x-1">
                                <Badge variant="outline">{dispatch.purpose}</Badge>
                                {dispatch.isFixedRoute && (
                                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">고정</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className={`inline-block rounded-md px-2 py-1 text-xs font-medium ${
                                dispatch.status === "예정"
                                  ? "bg-blue-100 text-blue-800"
                                  : dispatch.status === "진행중"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : dispatch.status === "완료"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}>
                                {dispatch.status}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditDialog(dispatch)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openDeleteDialog(dispatch)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>차량 현황</CardTitle>
          <CardDescription>
            현재 보유 중인 차량의 현황과 상태를 확인합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <div>
              <span className="text-sm text-muted-foreground">총 {vehicles.length}대의 차량이 등록되어 있습니다.</span>
            </div>
            <Button onClick={() => {
              resetVehicleForm();
              setVehicleManageOpen(true);
            }}>
              <Plus className="mr-2 h-4 w-4" />
              차량 관리
            </Button>
          </div>
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
                            onClick={() => {
                              setEditingVehicle(vehicle);
                              setNewVehicle({
                                vehicleNumber: vehicle.vehicleNumber,
                                vehicleType: vehicle.vehicleType,
                                vehicleName: vehicle.vehicleName,
                                capacity: vehicle.capacity.toString(),
                                status: vehicle.status
                              });
                              setVehicleManageOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {vehicle.status !== "운행가능" ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleUpdateVehicleStatus(vehicle.id, "운행가능")}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleUpdateVehicleStatus(vehicle.id, "정비중")}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 차량 관리 다이얼로그 */}
      <Dialog open={vehicleManageOpen} onOpenChange={setVehicleManageOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingVehicle ? "차량 정보 수정" : "새 차량 등록"}</DialogTitle>
            <DialogDescription>
              {editingVehicle ? "차량 정보를 수정합니다." : "새로운 차량을 등록합니다."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="vehicleNumber">차량번호</Label>
              <Input
                id="vehicleNumber"
                value={newVehicle.vehicleNumber}
                onChange={(e) => setNewVehicle({...newVehicle, vehicleNumber: e.target.value})}
                placeholder="예: 12소1234"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="vehicleType">차종</Label>
              <Input
                id="vehicleType"
                value={newVehicle.vehicleType}
                onChange={(e) => setNewVehicle({...newVehicle, vehicleType: e.target.value})}
                placeholder="예: 승합차"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="vehicleName">차량명</Label>
              <Input
                id="vehicleName"
                value={newVehicle.vehicleName}
                onChange={(e) => setNewVehicle({...newVehicle, vehicleName: e.target.value})}
                placeholder="예: 스타렉스"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="capacity">정원</Label>
              <Input
                id="capacity"
                type="number"
                min="1"
                value={newVehicle.capacity}
                onChange={(e) => setNewVehicle({...newVehicle, capacity: e.target.value})}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">상태</Label>
              <Select
                value={newVehicle.status}
                onValueChange={(value) => setNewVehicle({...newVehicle, status: value as "운행가능" | "정비중" | "운행중"})}
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
            <Button onClick={resetVehicleForm} variant="outline">취소</Button>
            <Button type="submit" onClick={handleAddVehicle}>
              {editingVehicle ? "수정" : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 배차 수정 다이얼로그 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>배차 지시 수정</DialogTitle>
            <DialogDescription>
              배차 정보를 수정할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-[1fr,250px] gap-6 py-4">
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-date">날짜</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dispatchDate ? format(dispatchDate, 'PPP', { locale: ko }) : "날짜 선택"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dispatchDate}
                      onSelect={setDispatchDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-startTime">시작 시간</Label>
                  <Input
                    id="edit-startTime"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-endTime">종료 시간</Label>
                  <Input
                    id="edit-endTime"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-vehicle">차량</Label>
                <Select
                  value={selectedVehicle}
                  onValueChange={setSelectedVehicle}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="차량 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((vehicle) => (
                      <SelectItem
                        key={vehicle.id}
                        value={vehicle.id}
                      >
                        {vehicle.vehicleName} ({vehicle.vehicleNumber})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-driver">운전병</Label>
                <Command className="rounded-lg border shadow-md">
                  <CommandInput placeholder="운전병 검색..." />
                  <CommandEmpty>해당하는 운전병이 없습니다.</CommandEmpty>
                  <CommandGroup className="max-h-40 overflow-auto">
                    {drivers.map((driver) => (
                      <CommandItem
                        key={driver.id}
                        value={driver.name}
                        onSelect={() => {
                          setSelectedDriver(driver.id);
                        }}
                        className={selectedDriver === driver.id ? "bg-accent" : ""}
                      >
                        <div className="flex items-center w-full">
                          <Avatar className="mr-2 h-6 w-6">
                            <AvatarFallback>{driver.name.slice(0, 1)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{driver.name}</p>
                            <p className="text-xs text-muted-foreground">{driver.rank} - {driver.position}</p>
                          </div>
                          {selectedDriver === driver.id && <Check className="ml-auto h-4 w-4" />}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-officer">선탑자</Label>
                <Command className="rounded-lg border shadow-md">
                  <CommandInput placeholder="선탑자 검색..." />
                  <CommandEmpty>해당하는 선탑자가 없습니다.</CommandEmpty>
                  <CommandGroup className="max-h-40 overflow-auto">
                    {officers.map((officer) => (
                      <CommandItem
                        key={officer.id}
                        value={officer.name}
                        onSelect={() => {
                          setSelectedOfficer(officer.id);
                        }}
                        className={selectedOfficer === officer.id ? "bg-accent" : ""}
                      >
                        <div className="flex items-center w-full">
                          <Avatar className="mr-2 h-6 w-6">
                            <AvatarFallback>{officer.name.slice(0, 1)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{officer.name}</p>
                            <p className="text-xs text-muted-foreground">{officer.rank} - {officer.position}</p>
                          </div>
                          {selectedOfficer === officer.id && <Check className="ml-auto h-4 w-4" />}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-destination">목적지</Label>
                <Input
                  id="edit-destination"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="목적지를 입력하세요"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-purpose">사용 목적</Label>
                <Input
                  id="edit-purpose"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="사용 목적을 입력하세요"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-passengerCount">탑승 인원</Label>
                <Input
                  id="edit-passengerCount"
                  type="number"
                  min="1"
                  value={passengerCount}
                  onChange={(e) => setPassengerCount(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-notes">비고</Label>
                <Input
                  id="edit-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="추가 정보를 입력하세요"
                />
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="editIsFixedRoute"
                    checked={isFixedRoute}
                    onCheckedChange={(checked) => setIsFixedRoute(checked as boolean)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label
                      htmlFor="editIsFixedRoute"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      고정 배차
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      매일 반복되는 고정 일정인 경우 체크하세요
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="border-l pl-6 space-y-4">
              <div>
                <h3 className="font-medium text-sm mb-2">선택된 정보</h3>
                
                <div className="space-y-4">
                  {selectedVehicle && (
                    <div className="rounded-md border p-3">
                      <h4 className="text-sm font-semibold mb-1">차량</h4>
                      {vehicles.find(v => v.id === selectedVehicle) && (
                        <>
                          <p className="text-sm">{vehicles.find(v => v.id === selectedVehicle)?.vehicleName}</p>
                          <p className="text-xs text-muted-foreground">{vehicles.find(v => v.id === selectedVehicle)?.vehicleNumber}</p>
                          <Badge variant="outline" className="mt-1 bg-green-100 text-green-800">
                            {vehicles.find(v => v.id === selectedVehicle)?.status}
                          </Badge>
                        </>
                      )}
                    </div>
                  )}
                  
                  {selectedDriver && drivers.find(d => d.id === selectedDriver) && (
                    <div className="rounded-md border p-3">
                      <h4 className="text-sm font-semibold mb-1">선택된 운전자</h4>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="bg-green-100 text-green-800">
                          {drivers.find(d => d.id === selectedDriver)?.rank}
                        </Badge>
                        <span className="text-sm font-medium">{drivers.find(d => d.id === selectedDriver)?.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        운전기량: {drivers.find(d => d.id === selectedDriver)?.drivingSkill || "정보 없음"}
                      </p>
                    </div>
                  )}
                  
                  {selectedOfficer && officers.find(o => o.id === selectedOfficer) && (
                    <div className="rounded-md border p-3">
                      <h4 className="text-sm font-semibold mb-1">선탑자</h4>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="bg-purple-100 text-purple-800">
                          {officers.find(o => o.id === selectedOfficer)?.rank}
                        </Badge>
                        <span className="text-sm font-medium">{officers.find(o => o.id === selectedOfficer)?.name}</span>
                      </div>
                    </div>
                  )}
                  
                  {currentDispatch && (
                    <div className="rounded-md border p-3 mt-4">
                      <h4 className="text-sm font-semibold mb-1">배차 정보</h4>
                      <Badge variant="outline" className={
                        currentDispatch.status === "완료" 
                          ? "bg-green-100 text-green-800" 
                          : currentDispatch.status === "취소"
                          ? "bg-red-100 text-red-800"
                          : currentDispatch.status === "진행중"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-blue-100 text-blue-800"
                      }>
                        {currentDispatch.status}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-2">
                        배차일자: {currentDispatch.date}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleEditDispatch}>수정</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 배차 삭제 대화상자 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>배차 지시 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 배차 지시를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDispatch}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 배차지시서 발행 다이얼로그 */}
      <Dialog open={documentDialogOpen} onOpenChange={setDocumentDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>배차지시서 생성</DialogTitle>
            <DialogDescription>
              선택한 날짜의 배차 일정으로 배차지시서를 생성합니다.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="dispatch-date">날짜 선택</Label>
                <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="justify-start text-left font-normal"
                      onClick={() => setShowDatePicker(true)}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filterDate ? (
                        format(filterDate, "PPP", { locale: ko })
                      ) : (
                        <span>날짜를 선택하세요</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filterDate}
                      onSelect={(date) => {
                        setFilterDate(date);
                        setViewMode("specific-date"); // 특정 날짜 모드로 변경
                        setShowDatePicker(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="doc-number">문서번호</Label>
                <Input 
                  id="doc-number" 
                  value={documentNumber} 
                  onChange={(e) => setDocumentNumber(e.target.value)} 
                  placeholder="예) 제 2023 - 0521 호" 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="unit-name">부대명</Label>
                <Input 
                  id="unit-name" 
                  value={unitName} 
                  onChange={(e) => setUnitName(e.target.value)} 
                  placeholder="예) 제00부대" 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="creator">작성자</Label>
                <Input 
                  id="creator" 
                  value={creator} 
                  onChange={(e) => setCreator(e.target.value)} 
                  placeholder="예) 상병 홍길동" 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="commander">지휘관</Label>
                <Input 
                  id="commander" 
                  value={commanderName} 
                  onChange={(e) => setCommanderName(e.target.value)} 
                  placeholder="예) 대대장" 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">참고사항</Label>
                <Textarea 
                  id="notes" 
                  value={additionalNotes} 
                  onChange={(e) => setAdditionalNotes(e.target.value)} 
                  placeholder="참고사항을 입력하세요" 
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDocumentDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handlePublishDocument} disabled={!filterDate}>
              배차지시서 생성
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 