"use client";

import React, { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  EyeIcon,
  FilePenLine,
  Pencil,
  Plus,
  Search,
  Trash2,
  Loader2,
  ArrowRight,
  CalendarIcon,
  UsersIcon,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { GuardOperationOrder, Soldier } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { getSoldiers } from "@/lib/api/soldiers";
import { generateGuardDutyAssignments, getGuardOperationOrders, createGuardOperationOrder, getGuardOperationOrder, getGuardDutyStats } from "@/lib/api/guardOperations";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const GuardOperationsPage = () => {
  const { toast: useToastToast } = useToast();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [guardOrders, setGuardOrders] = useState<GuardOperationOrder[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState<boolean>(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState<boolean>(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [selectedOrder, setSelectedOrder] = useState<GuardOperationOrder | null>(
    null
  );
  const [activeTab, setActiveTab] = useState<string>("all");
  const [formData, setFormData] = useState({
    title: "",
    documentNumber: "",
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    notes: "",
    status: "초안" as "초안" | "승인" | "완료",
  });
  
  // 근무표 자동 생성 관련 상태
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [isLoadingSoldiers, setIsLoadingSoldiers] = useState<boolean>(false);
  const [isGeneratingDuty, setIsGeneratingDuty] = useState<boolean>(false);
  const [previewDuties, setPreviewDuties] = useState<any[]>([]);
  const [showDutyPreview, setShowDutyPreview] = useState<boolean>(false);
  const [dayTypesPresets, setDayTypesPresets] = useState<{
    [date: string]: "평일" | "토요일" | "공휴일";
  }>({});
  const [guardStats, setGuardStats] = useState<any[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(false);

  useEffect(() => {
    loadGuardOrders();
    loadSoldiers();
  }, []);

  const loadSoldiers = async () => {
    setIsLoadingSoldiers(true);
    try {
      const response = await getSoldiers();
      if (response.success && response.data) {
        setSoldiers(response.data);
      } else {
        toast.error("병사 정보를 불러오는 데 실패했습니다.");
      }
    } catch (error) {
      console.error("병사 정보 로딩 오류:", error);
      toast.error("병사 정보를 불러오는 데 실패했습니다.");
    } finally {
      setIsLoadingSoldiers(false);
    }
  };

  const loadGuardOrders = async () => {
    try {
      const response = await getGuardOperationOrders();
      if (response.success && response.data) {
        setGuardOrders(response.data);
      } else {
        toast.error("경계작전명령서 로딩에 실패했습니다.");
      }
    } catch (error) {
      console.error("Failed to load guard operation orders:", error);
      toast.error("경계작전명령서 로딩에 실패했습니다.");
    }
  };

  // 특정 월의 공휴일을 설정하는 함수 (실제로는 API 또는 달력 라이브러리를 통해 가져올 수 있음)
  const generateDayTypes = (year: number, month: number) => {
    const dayTypes: { [date: string]: "평일" | "토요일" | "공휴일" } = {};
    
    // 해당 월의 모든 날짜를 생성
    const totalDays = new Date(year, month, 0).getDate();
    
    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(year, month - 1, day);
      const dateStr = format(date, "yyyy-MM-dd");
      
      // 주말 설정
      if (date.getDay() === 0) { // 일요일
        dayTypes[dateStr] = "공휴일";
      } else if (date.getDay() === 6) { // 토요일
        dayTypes[dateStr] = "토요일";
      } else {
        dayTypes[dateStr] = "평일";
      }
    }
    
    // 수정 가능한 presets 상태 업데이트
    setDayTypesPresets(dayTypes);
  };

  // 근무표 자동 생성
  const generateDutySchedule = async () => {
    if (soldiers.length === 0) {
      toast.error("병사 정보가 없습니다. 먼저 병사 정보를 로드해주세요.");
      return;
    }
    
    setIsGeneratingDuty(true);
    setShowDutyPreview(false);
    
    try {
      // 해당 월의 일자별 타입 생성 (평일/토요일/공휴일)
      generateDayTypes(formData.year, formData.month);
      
      // 불침번 근무표 자동 생성 API 호출
      const response = await generateGuardDutyAssignments(
        formData.year,
        formData.month,
        soldiers.map(s => ({ 
          id: s.id, 
          name: s.name, 
          rank: s.rank, 
          unit: s.unit 
        })),
        dayTypesPresets
      );
      
      if (response.success && response.data) {
        // 생성된 근무표 미리보기용으로 저장
        setPreviewDuties(response.data);
        setShowDutyPreview(true);
        toast.success("불침번 근무표가 생성되었습니다.");
      } else {
        toast.error(response.error || "근무표 생성에 실패했습니다.");
      }
    } catch (error) {
      console.error("근무표 생성 오류:", error);
      toast.error("근무표 생성 중 오류가 발생했습니다.");
    } finally {
      setIsGeneratingDuty(false);
    }
  };

  const handleAddOrder = async () => {
    try {
      if (!showDutyPreview || previewDuties.length === 0) {
        toast.error("먼저 불침번 근무표를 생성해주세요.");
        return;
      }
      
      // 실제 API 호출로 경계작전명령서 추가
      const orderData = {
        ...formData,
        createdBy: "현재 사용자", // 실제로는 로그인한 사용자 정보를 사용해야 함
        approvedBy: "", // 빈 문자열로 초기화하여 undefined 오류 방지
        dutyAssignments: previewDuties.map(duty => ({
          id: duty.id,
          soldierId: duty.soldierId,
          soldierName: duty.soldierName,
          soldierRank: duty.soldierRank,
          unit: duty.unit,
          date: duty.date,
          dutyType: duty.dutyType,
          shift: duty.shift,
          startTime: duty.startTime,
          endTime: duty.endTime,
          isCompleted: false,
          isReplacement: false,
          originalSoldierId: duty.originalSoldierId || null, // null로 초기화
          replacementDate: duty.replacementDate || null, // null로 초기화
          position: duty.position || "" // 빈 문자열로 초기화
        }))
      };
      
      const response = await createGuardOperationOrder(orderData);
      
      if (response.success) {
        toast.success("경계작전명령서가 추가되었습니다.");
        resetForm();
        setIsAddDialogOpen(false);
        loadGuardOrders(); // 목록 다시 로드
      } else {
        toast.error(response.error || "경계작전명령서 추가에 실패했습니다.");
      }
    } catch (error) {
      console.error("Failed to add guard operation order:", error);
      toast.error("경계작전명령서 추가에 실패했습니다.");
    }
  };

  const handleEditOrder = async () => {
    if (!selectedOrder) return;

    try {
      // 실제 구현에서는 API 호출로 교체
      const updatedOrders = guardOrders.map((order) =>
        order.id === selectedOrder.id
          ? { ...selectedOrder, ...formData }
          : order
      );

      setGuardOrders(updatedOrders);
      setIsEditDialogOpen(false);
      toast.success("경계작전명령서가 수정되었습니다.");
    } catch (error) {
      console.error("Failed to edit guard operation order:", error);
      toast.error("경계작전명령서 수정에 실패했습니다.");
    }
  };

  const handleDeleteOrder = async () => {
    if (!selectedOrder) return;

    try {
      // Firebase Firestore에서 문서 삭제
      await deleteDoc(doc(db, 'guardOperationOrders', selectedOrder.id));
      
      // UI 업데이트
      setGuardOrders(guardOrders.filter(order => order.id !== selectedOrder.id));
      setIsDeleteDialogOpen(false);
      toast.success("경계작전명령서가 삭제되었습니다.");
      
    } catch (error) {
      console.error("Failed to delete guard operation order:", error);
      toast.error("경계작전명령서 삭제에 실패했습니다.");
    }
  };

  const handleViewOrder = async (order: GuardOperationOrder) => {
    try {
      // 상세 정보 불러오기
      const response = await getGuardOperationOrder(order.id);
      
      if (response.success && response.data) {
        // 불침번 근무표 데이터가 포함된 상세 정보로 설정
        setSelectedOrder(response.data);
        
        // 불침번 공정표 데이터 가져오기
        setIsLoadingStats(true);
        const statsResponse = await getGuardDutyStats(order.year, order.month);
        if (statsResponse.success && statsResponse.data) {
          setGuardStats(statsResponse.data);
        } else {
          toast.error("근무 통계를 불러오는데 실패했습니다.");
        }
        setIsLoadingStats(false);
      } else {
        // 실패 시 기본 정보만 표시
        setSelectedOrder(order);
        toast.error("상세 불침번 근무표를 불러오는데 실패했습니다.");
      }
      
      // 다이얼로그 열기
      setIsViewDialogOpen(true);
    } catch (error) {
      console.error("Error loading guard operation details:", error);
      setSelectedOrder(order);
      toast.error("상세 정보를 불러오는데 실패했습니다.");
      setIsViewDialogOpen(true);
    }
  };

  const handleOpenEditDialog = (order: GuardOperationOrder) => {
    setSelectedOrder(order);
    setFormData({
      title: order.title,
      documentNumber: order.documentNumber,
      year: order.year,
      month: order.month,
      notes: order.notes || "",
      status: order.status,
    });
    setIsEditDialogOpen(true);
  };

  const handleOpenDeleteDialog = (order: GuardOperationOrder) => {
    setSelectedOrder(order);
    setIsDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      documentNumber: "",
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      notes: "",
      status: "초안",
    });
    setShowDutyPreview(false);
    setPreviewDuties([]);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "초안":
        return <Badge variant="outline">초안</Badge>;
      case "승인":
        return <Badge variant="secondary">승인</Badge>;
      case "완료":
        return <Badge variant="default">완료</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">경계작전명령서 관리</h1>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> 새 경계작전명령서
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">전체</TabsTrigger>
          <TabsTrigger value="draft">초안</TabsTrigger>
          <TabsTrigger value="approved">승인</TabsTrigger>
          <TabsTrigger value="completed">완료</TabsTrigger>
        </TabsList>

        <div className="flex mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="검색..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>문서번호</TableHead>
              <TableHead>제목</TableHead>
              <TableHead>작성일</TableHead>
              <TableHead>작성자</TableHead>
              <TableHead>상태</TableHead>
              <TableHead className="text-right">작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {guardOrders
              .filter(
                (order) =>
                  (activeTab === "all" ||
                    (activeTab === "draft" && order.status === "초안") ||
                    (activeTab === "approved" && order.status === "승인") ||
                    (activeTab === "completed" && order.status === "완료")) &&
                  (searchQuery === "" ||
                    order.title
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase()) ||
                    order.documentNumber
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase()))
              )
              .map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">
                    {order.documentNumber}
                  </TableCell>
                  <TableCell>{order.title}</TableCell>
                  <TableCell>
                    {new Date(order.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{order.createdBy}</TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleViewOrder(order)}
                    >
                      <EyeIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleOpenEditDialog(order)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleOpenDeleteDialog(order)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </Tabs>

      {/* 경계작전명령서 추가 다이얼로그 */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>경계작전명령서 추가</DialogTitle>
            <DialogDescription>
              경계작전명령서 정보를 입력하고 불침번 근무표를 생성하세요.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>기본 정보</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">제목</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      placeholder="예: 2024년 3월 경계작전명령서"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="documentNumber">문서번호</Label>
                    <Input
                      id="documentNumber"
                      value={formData.documentNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, documentNumber: e.target.value })
                      }
                      placeholder="예: GO-2024-003"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="year">년도</Label>
                      <Input
                        id="year"
                        type="number"
                        value={formData.year}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            year: parseInt(e.target.value, 10),
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="month">월</Label>
                      <Input
                        id="month"
                        type="number"
                        min="1"
                        max="12"
                        value={formData.month}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            month: parseInt(e.target.value, 10),
                          })
                        }
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="notes">비고</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={generateDutySchedule}
                    disabled={isGeneratingDuty || isLoadingSoldiers}
                    className="w-full"
                  >
                    {isGeneratingDuty ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        불침번 근무표 생성 중...
                      </>
                    ) : (
                      <>
                        <UsersIcon className="mr-2 h-4 w-4" />
                        불침번 근무표 자동 생성
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </div>
            
            <div className="space-y-4">
              {showDutyPreview && (
                <Card>
                  <CardHeader>
                    <CardTitle>생성된 불침번 근무표</CardTitle>
                    <CardDescription>
                      {formData.year}년 {formData.month}월의 불침번 근무표 미리보기 (처음 7일)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>날짜</TableHead>
                            <TableHead>번초</TableHead>
                            <TableHead>시간</TableHead>
                            <TableHead>병사</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {previewDuties.slice(0, 35).map((duty, index) => (
                            <TableRow key={duty.id || index}>
                              <TableCell>
                                {index % 5 === 0 && (
                                  format(new Date(duty.date), "M/d (EEE)", { locale: ko })
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{duty.shift}</Badge>
                              </TableCell>
                              <TableCell>
                                {duty.startTime}~{duty.endTime}
                              </TableCell>
                              <TableCell>
                                {duty.soldierRank} {duty.soldierName}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              취소
            </Button>
            <Button 
              onClick={handleAddOrder}
              disabled={!showDutyPreview || isGeneratingDuty}
            >
              {showDutyPreview ? "추가" : "먼저 근무표를 생성하세요"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 경계작전명령서 상세 보기 다이얼로그 */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>경계작전명령서 상세 정보</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <Tabs defaultValue="details">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">기본 정보</TabsTrigger>
                <TabsTrigger value="stats">불침번 공정표</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details">
                <ScrollArea className="max-h-[70vh]">
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">
                          제목
                        </Label>
                        <p className="font-medium">{selectedOrder.title}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">
                          문서번호
                        </Label>
                        <p className="font-medium">{selectedOrder.documentNumber}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">
                          년월
                        </Label>
                        <p className="font-medium">
                          {selectedOrder.year}년 {selectedOrder.month}월
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">
                          상태
                        </Label>
                        <p>{getStatusBadge(selectedOrder.status)}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">
                          작성자
                        </Label>
                        <p className="font-medium">{selectedOrder.createdBy}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">
                          작성일
                        </Label>
                        <p className="font-medium">
                          {new Date(selectedOrder.createdAt).toLocaleDateString(
                            "ko-KR"
                          )}
                        </p>
                      </div>
                    </div>
                    {selectedOrder.approvedBy && (
                      <div>
                        <Label className="text-sm text-muted-foreground">
                          승인자
                        </Label>
                        <p className="font-medium">{selectedOrder.approvedBy}</p>
                      </div>
                    )}
                    {selectedOrder.notes && (
                      <div>
                        <Label className="text-sm text-muted-foreground">
                          비고
                        </Label>
                        <p className="font-medium">{selectedOrder.notes}</p>
                      </div>
                    )}

                    <div className="mt-6">
                      <h3 className="text-lg font-semibold mb-3">불침번 근무 배정 목록</h3>
                      {selectedOrder?.dutyAssignments && selectedOrder.dutyAssignments.length > 0 ? (
                        <div className="border rounded-md overflow-auto max-h-[400px]">
                          <Table>
                            <TableHeader className="sticky top-0 bg-background z-10">
                              <TableRow>
                                <TableHead>날짜</TableHead>
                                <TableHead>요일</TableHead>
                                <TableHead>번초</TableHead>
                                <TableHead>시간</TableHead>
                                <TableHead>인원</TableHead>
                                <TableHead>계급</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {/* 날짜별로 그룹화하여 표시 */}
                              {(() => {
                                // 날짜별로 그룹화
                                const groupedByDate = selectedOrder.dutyAssignments.reduce((acc, duty) => {
                                  const date = duty.date || "";
                                  if (!acc[date]) {
                                    acc[date] = [];
                                  }
                                  acc[date].push(duty);
                                  return acc;
                                }, {} as Record<string, typeof selectedOrder.dutyAssignments>);
                                
                                // 날짜 순으로 정렬하여 표시
                                return Object.entries(groupedByDate)
                                  .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
                                  .map(([date, duties]) => {
                                    const dateObj = new Date(date);
                                    const weekday = ['일', '월', '화', '수', '목', '금', '토'][dateObj.getDay()];
                                    const formattedDate = dateObj.toLocaleDateString("ko-KR");
                                    
                                    // 요일별 스타일 설정
                                    const weekdayStyle = {
                                      color: dateObj.getDay() === 0 ? 'red' : dateObj.getDay() === 6 ? 'blue' : 'inherit'
                                    };
                                    
                                    // 번초 순으로 정렬
                                    const sortedDuties = [...duties].sort((a, b) => {
                                      const shiftA = a.shift || "";
                                      const shiftB = b.shift || "";
                                      
                                      // 번초 순서에 따라 정렬
                                      if (shiftA === "1번초") return -1;
                                      if (shiftB === "1번초") return 1;
                                      if (shiftA === "2번초") return -1;
                                      if (shiftB === "2번초") return 1;
                                      if (shiftA === "3번초") return -1;
                                      if (shiftB === "3번초") return 1;
                                      if (shiftA === "4번초") return -1;
                                      if (shiftB === "4번초") return 1;
                                      if (shiftA === "5번초") return -1;
                                      if (shiftB === "5번초") return 1;
                                      return 0;
                                    });
                                    
                                    return sortedDuties.map((duty, dutyIndex) => (
                                      <TableRow key={duty.id || `${date}-${dutyIndex}`}>
                                        {dutyIndex === 0 ? (
                                          <>
                                            <TableCell rowSpan={duties.length}>{formattedDate}</TableCell>
                                            <TableCell rowSpan={duties.length} className="font-medium" style={weekdayStyle}>{weekday}</TableCell>
                                          </>
                                        ) : null}
                                        <TableCell>{duty.shift || "-"}</TableCell>
                                        <TableCell>
                                          {duty.startTime || "-"} - {duty.endTime || "-"}
                                        </TableCell>
                                        <TableCell>{duty.soldierName || "-"}</TableCell>
                                        <TableCell>{duty.soldierRank || "-"}</TableCell>
                                      </TableRow>
                                    ));
                                  }).flat();
                              })()}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">
                          배정된 근무가 없습니다.
                        </p>
                      )}
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="stats">
                <ScrollArea className="max-h-[70vh]">
                  <div className="space-y-6 py-4">
                    <h3 className="text-lg font-semibold">
                      {selectedOrder.year}년 {selectedOrder.month}월 불침번 공정표
                    </h3>
                    
                    {isLoadingStats ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <>
                        {/* 번초별 통계 */}
                        <div className="space-y-4">
                          <h4 className="text-md font-medium">번초별 배정 현황</h4>
                          <div className="grid grid-cols-5 gap-4">
                            {["1번초", "2번초", "3번초", "4번초", "5번초"].map((shift) => {
                              // 번초별 총 배정 횟수 계산 - 현재 명령서에 대해서만
                              const totalShiftCount = selectedOrder.dutyAssignments.filter(
                                duty => duty.shift === shift
                              ).length;
                              
                              return (
                                <Card key={shift}>
                                  <CardHeader className="pb-2">
                                    <CardTitle className="text-center text-lg">{shift}</CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="text-center text-3xl font-bold">
                                      {totalShiftCount}회
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        </div>
                        
                        {/* 병사별 불침번 배정표 */}
                        <div className="space-y-4 mt-6">
                          <h4 className="text-md font-medium">병사별 배정 현황</h4>
                          <div className="border rounded-md overflow-auto max-h-[400px]">
                            <Table>
                              <TableHeader className="sticky top-0 bg-background z-10">
                                <TableRow>
                                  <TableHead>계급</TableHead>
                                  <TableHead>이름</TableHead>
                                  <TableHead>총 배정</TableHead>
                                  <TableHead>1번초</TableHead>
                                  <TableHead>2번초</TableHead>
                                  <TableHead>3번초</TableHead>
                                  <TableHead>4번초</TableHead>
                                  <TableHead>5번초</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {(() => {
                                  // 양쪽 데이터 소스에서 병사 정보 수집
                                  const combinedStats = new Map<string, {
                                    name: string;
                                    rank: string;
                                    total: number;
                                    shifts: Record<string, number>;
                                  }>();
                                  
                                  // 1. API에서 가져온 guardStats 데이터 처리
                                  guardStats.forEach(stat => {
                                    const key = `${stat.soldierRank}-${stat.soldierName}`;
                                    
                                    combinedStats.set(key, {
                                      name: stat.soldierName,
                                      rank: stat.soldierRank,
                                      total: stat.totalDuties,
                                      shifts: {
                                        "1번초": stat.dutyByShift["1번초"] || 0,
                                        "2번초": stat.dutyByShift["2번초"] || 0,
                                        "3번초": stat.dutyByShift["3번초"] || 0,
                                        "4번초": stat.dutyByShift["4번초"] || 0,
                                        "5번초": stat.dutyByShift["5번초"] || 0
                                      }
                                    });
                                  });
                                  
                                  // 2. 현재 경계작전명령서의 dutyAssignments 데이터 처리
                                  selectedOrder.dutyAssignments.forEach(duty => {
                                    // 유효한 이름과 계급이 있는지 확인
                                    if (!duty.soldierName || !duty.soldierRank) return;
                                    
                                    const key = `${duty.soldierRank}-${duty.soldierName}`;
                                    
                                    if (!combinedStats.has(key)) {
                                      combinedStats.set(key, {
                                        name: duty.soldierName,
                                        rank: duty.soldierRank,
                                        total: 0,
                                        shifts: {
                                          "1번초": 0,
                                          "2번초": 0,
                                          "3번초": 0,
                                          "4번초": 0,
                                          "5번초": 0
                                        }
                                      });
                                    }
                                    
                                    const stats = combinedStats.get(key)!;
                                    
                                    // 이미 API 통계에 포함되어 있으면 중복 카운트하지 않음
                                    if (guardStats.some(s => 
                                      s.soldierName === duty.soldierName && s.soldierRank === duty.soldierRank
                                    )) {
                                      return;
                                    }
                                    
                                    // API 통계에 없는 경우에만 카운트
                                    stats.total++;
                                    
                                    if (duty.shift && ["1번초", "2번초", "3번초", "4번초", "5번초"].includes(duty.shift)) {
                                      stats.shifts[duty.shift] = (stats.shifts[duty.shift] || 0) + 1;
                                    }
                                  });
                                  
                                  // 3. 병사별 통계를 배열로 변환하고 총 배정 수 기준으로 정렬
                                  return Array.from(combinedStats.entries())
                                    .map(([key, stats]) => ({
                                      key,
                                      ...stats
                                    }))
                                    .sort((a, b) => b.total - a.total)
                                    .map(stat => (
                                      <TableRow key={stat.key}>
                                        <TableCell>{stat.rank}</TableCell>
                                        <TableCell>{stat.name}</TableCell>
                                        <TableCell className="font-medium">{stat.total}회</TableCell>
                                        <TableCell>{stat.shifts["1번초"]}회</TableCell>
                                        <TableCell>{stat.shifts["2번초"]}회</TableCell>
                                        <TableCell>{stat.shifts["3번초"]}회</TableCell>
                                        <TableCell>{stat.shifts["4번초"]}회</TableCell>
                                        <TableCell>{stat.shifts["5번초"]}회</TableCell>
                                      </TableRow>
                                    ));
                                })()}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* 경계작전명령서 수정 다이얼로그 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>경계작전명령서 수정</DialogTitle>
            <DialogDescription>
              경계작전명령서 정보를 수정하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">제목</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-documentNumber">문서번호</Label>
              <Input
                id="edit-documentNumber"
                value={formData.documentNumber}
                onChange={(e) =>
                  setFormData({ ...formData, documentNumber: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-year">년도</Label>
                <Input
                  id="edit-year"
                  type="number"
                  value={formData.year}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      year: parseInt(e.target.value, 10),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-month">월</Label>
                <Input
                  id="edit-month"
                  type="number"
                  min="1"
                  max="12"
                  value={formData.month}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      month: parseInt(e.target.value, 10),
                    })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">상태</Label>
              <select
                id="edit-status"
                className="w-full rounded-md border border-input bg-transparent px-3 py-2"
                value={formData.status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as "초안" | "승인" | "완료",
                  })
                }
              >
                <option value="초안">초안</option>
                <option value="승인">승인</option>
                <option value="완료">완료</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">비고</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleEditOrder}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 경계작전명령서 삭제 확인 다이얼로그 */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>경계작전명령서 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 이 경계작전명령서를 삭제하시겠습니까? 이 작업은 되돌릴 수
              없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {selectedOrder && (
            <div className="py-4">
              <p>
                <span className="font-semibold">제목:</span>{" "}
                {selectedOrder.title}
              </p>
              <p>
                <span className="font-semibold">문서번호:</span>{" "}
                {selectedOrder.documentNumber}
              </p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteOrder}>
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GuardOperationsPage; 