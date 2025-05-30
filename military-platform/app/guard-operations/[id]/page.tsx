"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { format, isValid, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import {
  Calendar,
  Clock,
  FileText,
  AlertCircle,
  ArrowLeft,
  UserRound,
  Edit,
  Printer,
  RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getGuardOperationOrder, switchGuardDuty } from "@/lib/api/guardOperations";
import { GuardOperationOrder, GuardDutyAssignment } from "@/types";
import { toast } from "@/components/ui/use-toast";

export default function GuardOperationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<GuardOperationOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("calendar");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  
  // 교대 관련 상태
  const [isReplaceDialogOpen, setIsReplaceDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<GuardDutyAssignment | null>(null);
  const [targetAssignment, setTargetAssignment] = useState<GuardDutyAssignment | null>(null);

  // 명령서 데이터 로드
  useEffect(() => {
    const fetchOrderData = async () => {
      setLoading(true);
      try {
        const response = await getGuardOperationOrder(params.id as string);
        
        if (response.success && response.data) {
          setOrder(response.data);
          
          // 첫 번째 날짜 선택
          if (response.data.dutyAssignments.length > 0) {
            const dates = [...new Set(response.data.dutyAssignments.map(d => d.date))];
            dates.sort();
            setSelectedDate(dates[0]);
          }
        } else {
          setError("경계작전 명령서를 찾을 수 없습니다.");
        }
      } catch (error) {
        console.error("명령서 로드 오류:", error);
        setError("경계작전 명령서를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchOrderData();
    }
  }, [params.id]);

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return "";
      const date = parseISO(dateString);
      if (!isValid(date)) return dateString;
      return format(date, "yyyy년 MM월 dd일");
    } catch (error) {
      return dateString;
    }
  };
  
  // 날짜와 요일 포맷팅
  const formatDateWithDay = (dateString: string) => {
    try {
      if (!dateString) return "";
      const date = parseISO(dateString);
      if (!isValid(date)) return dateString;
      return format(date, "yyyy년 MM월 dd일 (EEEE)", { locale: ko });
    } catch (error) {
      return dateString;
    }
  };

  // 시간 포맷팅
  const formatTime = (timeString: string) => {
    return timeString;
  };
  
  // 일자별로 근무 데이터 그룹화
  const groupByDate = () => {
    if (!order) return {};
    
    const grouped: { [date: string]: GuardDutyAssignment[] } = {};
    
    order.dutyAssignments.forEach(assignment => {
      if (!grouped[assignment.date]) {
        grouped[assignment.date] = [];
      }
      grouped[assignment.date].push(assignment);
    });
    
    // 각 날짜별로 시간순 정렬
    Object.keys(grouped).forEach(date => {
      grouped[date].sort((a, b) => {
        if (a.startTime < b.startTime) return -1;
        if (a.startTime > b.startTime) return 1;
        return 0;
      });
    });
    
    return grouped;
  };
  
  // 근무자별로 근무 데이터 그룹화
  const groupBySoldier = () => {
    if (!order) return {};
    
    const grouped: { [soldierId: string]: { 
      soldier: { id: string; name: string; rank: string; unit: string };
      assignments: GuardDutyAssignment[];
    } } = {};
    
    order.dutyAssignments.forEach(assignment => {
      if (!grouped[assignment.soldierId]) {
        grouped[assignment.soldierId] = {
          soldier: { 
            id: assignment.soldierId, 
            name: assignment.soldierName, 
            rank: assignment.soldierRank,
            unit: assignment.unit 
          },
          assignments: []
        };
      }
      grouped[assignment.soldierId].assignments.push(assignment);
    });
    
    // 각 병사별 날짜순 정렬
    Object.keys(grouped).forEach(soldierId => {
      grouped[soldierId].assignments.sort((a, b) => {
        if (a.date < b.date) return -1;
        if (a.date > b.date) return 1;
        if (a.startTime < b.startTime) return -1;
        if (a.startTime > b.startTime) return 1;
        return 0;
      });
    });
    
    return grouped;
  };
  
  // 교대 번초에 따른 배경 색상
  const getShiftBackgroundColor = (shift: string) => {
    switch(shift) {
      case "1번초": return "bg-blue-100";
      case "2번초": return "bg-green-100";
      case "3번초": return "bg-yellow-100";
      case "4번초": return "bg-orange-100";
      case "5번초": return "bg-purple-100";
      default: return "bg-gray-100";
    }
  };
  
  // 교대 번초에 따른 배지
  const getShiftBadge = (shift: string) => {
    let bgColor = "";
    
    switch(shift) {
      case "1번초": bgColor = "bg-blue-500"; break;
      case "2번초": bgColor = "bg-green-500"; break;
      case "3번초": bgColor = "bg-yellow-500"; break;
      case "4번초": bgColor = "bg-orange-500"; break;
      case "5번초": bgColor = "bg-purple-500"; break;
      default: bgColor = "bg-gray-500"; break;
    }
    
    return <Badge className={bgColor}>{shift}</Badge>;
  };
  
  // 근무 교대 처리
  const handleSwitchDuty = async () => {
    if (!selectedAssignment || !targetAssignment || !order) {
      toast({
        variant: "destructive",
        title: "오류",
        description: "근무 교대에 필요한 정보가 없습니다.",
      });
      return;
    }
    
    try {
      const response = await switchGuardDuty(
        order.id, 
        selectedAssignment.id, 
        targetAssignment.id
      );
      
      if (response.success) {
        toast({
          title: "근무 교대 완료",
          description: "근무 교대가 성공적으로 처리되었습니다.",
        });
        
        // 새로고침하여 최신 데이터 로드
        const updatedOrderResponse = await getGuardOperationOrder(params.id as string);
        if (updatedOrderResponse.success && updatedOrderResponse.data) {
          setOrder(updatedOrderResponse.data);
        }
        
        setIsReplaceDialogOpen(false);
        setSelectedAssignment(null);
        setTargetAssignment(null);
      } else {
        toast({
          variant: "destructive",
          title: "오류",
          description: response.error || "근무 교대 처리에 실패했습니다.",
        });
      }
    } catch (error) {
      console.error("근무 교대 오류:", error);
      toast({
        variant: "destructive",
        title: "오류",
        description: "근무 교대 처리 중 오류가 발생했습니다.",
      });
    }
  };
  
  // 교대 다이얼로그 오픈
  const openReplaceDialog = (assignment: GuardDutyAssignment) => {
    setSelectedAssignment(assignment);
    setIsReplaceDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <p>경계작전 명령서를 불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Button onClick={() => router.push("/guard-operations")} variant="ghost" className="flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> 경계작전 명령서 목록으로 돌아가기
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="space-y-6">
        <Button onClick={() => router.push("/guard-operations")} variant="ghost" className="flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> 경계작전 명령서 목록으로 돌아가기
        </Button>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>찾을 수 없음</AlertTitle>
          <AlertDescription>요청하신 경계작전 명령서를 찾을 수 없습니다.</AlertDescription>
        </Alert>
      </div>
    );
  }
  
  const dateGroups = groupByDate();
  const soldierGroups = groupBySoldier();
  const availableDates = Object.keys(dateGroups).sort();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button onClick={() => router.push("/guard-operations")} variant="ghost" className="flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> 경계작전 명령서 목록으로 돌아가기
        </Button>
        <div className="flex items-center gap-2">
          {order.status !== "완료" && (
            <Button variant="outline" onClick={() => router.push(`/guard-operations/edit/${order.id}`)}>
              <Edit className="mr-2 h-4 w-4" />
              수정하기
            </Button>
          )}
          <Button variant="outline">
            <Printer className="mr-2 h-4 w-4" />
            인쇄
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-2xl font-bold">{order.title}</CardTitle>
            <CardDescription>
              문서번호: {order.documentNumber} | 작성일: {formatDate(order.createdAt)}
            </CardDescription>
          </div>
          <Badge className={order.status === "초안" ? "bg-gray-500" : order.status === "승인" ? "bg-green-500" : "bg-blue-500"}>
            {order.status}
          </Badge>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500">해당 월</p>
                <p className="text-lg">{order.year}년 {order.month}월</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">작성자</p>
                <p className="text-lg">{order.createdBy}</p>
              </div>
              
              {order.approvedBy && (
                <div>
                  <p className="text-sm font-medium text-gray-500">승인자</p>
                  <p className="text-lg">{order.approvedBy}</p>
                </div>
              )}
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500">총 근무일수</p>
                <p className="text-lg">{availableDates.length}일</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">총 근무 투입 인원</p>
                <p className="text-lg">{Object.keys(soldierGroups).length}명</p>
              </div>
              
              {order.notes && (
                <div>
                  <p className="text-sm font-medium text-gray-500">비고</p>
                  <p className="text-base">{order.notes}</p>
                </div>
              )}
            </div>
          </div>
          
          <Separator className="my-6" />
          
          <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="calendar">일자별 근무표</TabsTrigger>
              <TabsTrigger value="personnel">인원별 근무표</TabsTrigger>
            </TabsList>
            
            <TabsContent value="calendar" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-1">
                  <div className="flex flex-col space-y-2">
                    {availableDates.map(date => (
                      <Button
                        key={date}
                        variant={selectedDate === date ? "default" : "outline"}
                        className="justify-start"
                        onClick={() => setSelectedDate(date)}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {formatDate(date).split('년')[1]}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <div className="md:col-span-3">
                  {selectedDate && (
                    <Card>
                      <CardHeader>
                        <CardTitle>{formatDateWithDay(selectedDate)}</CardTitle>
                        <CardDescription>불침번 근무표</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>번초</TableHead>
                              <TableHead>시간</TableHead>
                              <TableHead>계급</TableHead>
                              <TableHead>이름</TableHead>
                              <TableHead className="text-right">교대</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {dateGroups[selectedDate]?.map((assignment) => (
                              <TableRow key={assignment.id} className={getShiftBackgroundColor(assignment.shift)}>
                                <TableCell>{getShiftBadge(assignment.shift)}</TableCell>
                                <TableCell>
                                  {formatTime(assignment.startTime)} ~ {formatTime(assignment.endTime)}
                                </TableCell>
                                <TableCell>{assignment.soldierRank}</TableCell>
                                <TableCell>
                                  {assignment.soldierName}
                                  {assignment.isReplacement && (
                                    <Badge variant="outline" className="ml-2 text-xs">
                                      교대
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openReplaceDialog(assignment)}
                                  >
                                    <RotateCcw className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="personnel" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.values(soldierGroups).map(({ soldier, assignments }) => (
                  <Card key={soldier.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <UserRound className="h-5 w-5 text-gray-500" />
                          <CardTitle className="text-lg">{soldier.name}</CardTitle>
                        </div>
                        <Badge variant="outline">
                          {soldier.rank} | {soldier.unit}
                        </Badge>
                      </div>
                      <CardDescription>총 {assignments.length}회 근무</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>날짜</TableHead>
                            <TableHead>번초</TableHead>
                            <TableHead>시간</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {assignments.map((assignment) => (
                            <TableRow key={assignment.id} className={getShiftBackgroundColor(assignment.shift)}>
                              <TableCell>
                                {formatDate(assignment.date).split('년')[1]}
                              </TableCell>
                              <TableCell>{getShiftBadge(assignment.shift)}</TableCell>
                              <TableCell>
                                {formatTime(assignment.startTime)} ~ {formatTime(assignment.endTime)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* 근무 교대 다이얼로그 */}
      <Dialog open={isReplaceDialogOpen} onOpenChange={setIsReplaceDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>근무 교대</DialogTitle>
            <DialogDescription>
              선택한 근무자와 교대할 다른 근무자를 선택해주세요.
            </DialogDescription>
          </DialogHeader>
          
          {selectedAssignment && (
            <div className="py-4">
              <div className="mb-4 p-3 border rounded-md bg-muted">
                <h4 className="font-medium mb-2">선택한 근무</h4>
                <p><strong>날짜:</strong> {formatDate(selectedAssignment.date)}</p>
                <p><strong>시간:</strong> {formatTime(selectedAssignment.startTime)} ~ {formatTime(selectedAssignment.endTime)}</p>
                <p><strong>번초:</strong> {selectedAssignment.shift}</p>
                <p><strong>근무자:</strong> {selectedAssignment.soldierRank} {selectedAssignment.soldierName}</p>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-medium">교대 대상 근무자 선택</h4>
                <div className="max-h-[300px] overflow-auto border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>계급</TableHead>
                        <TableHead>이름</TableHead>
                        <TableHead>소속</TableHead>
                        <TableHead className="text-right">선택</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.values(soldierGroups)
                        .filter(group => group.soldier.id !== selectedAssignment.soldierId)
                        .map(({ soldier }) => (
                          <TableRow 
                            key={soldier.id}
                            className={targetAssignment?.soldierId === soldier.id ? "bg-muted" : ""}
                          >
                            <TableCell>{soldier.rank}</TableCell>
                            <TableCell>{soldier.name}</TableCell>
                            <TableCell>{soldier.unit}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant={targetAssignment?.soldierId === soldier.id ? "default" : "outline"}
                                size="sm"
                                onClick={() => {
                                  // 해당 날짜의 해당 병사의 근무 찾기
                                  const assignment = order.dutyAssignments.find(a => 
                                    a.soldierId === soldier.id && a.date === selectedAssignment.date
                                  );
                                  if (assignment) {
                                    setTargetAssignment(assignment);
                                  } else {
                                    // 같은 날짜에 근무가 없다면 새 교대 근무 생성
                                    const newAssignment: GuardDutyAssignment = {
                                      ...selectedAssignment,
                                      id: `temp-${soldier.id}`,
                                      soldierId: soldier.id,
                                      soldierName: soldier.name,
                                      soldierRank: soldier.rank,
                                      unit: soldier.unit,
                                      isReplacement: true,
                                      originalSoldierId: selectedAssignment.soldierId,
                                      replacementDate: new Date().toISOString()
                                    };
                                    setTargetAssignment(newAssignment);
                                  }
                                }}
                              >
                                선택
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReplaceDialogOpen(false)}>
              취소
            </Button>
            <Button 
              onClick={handleSwitchDuty}
              disabled={!selectedAssignment || !targetAssignment}
            >
              교대 확정
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 