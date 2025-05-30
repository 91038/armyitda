"use client";

import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, addMonths, subMonths } from "date-fns";
import { Calendar as CalendarIcon, Plus, Search, Edit, Trash2, Gift, ChevronLeft, ChevronRight } from "lucide-react";
import { ko } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCaption,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { getSoldiers } from "@/lib/api/soldiers";
import { getOfficers } from "@/lib/api/officers";
import { addLeave, getLeaves, updateLeaveStatus, updateLeave, deleteLeave, getPersonLeaves } from "@/lib/api/leaves";
import { getAllSchedules } from "@/lib/api/schedules";
import { Soldier, Officer, Leave, ScheduleEvent } from "@/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { 
  normalizeStatus, 
  normalizeTimestamp, 
  normalizeLeaveType 
} from "@/lib/utils";
import { convertScheduleToLeave } from "@/lib/data-layer"; // 데이터 레이어 사용

export default function LeavesPage() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();
  
  // 캘린더 관련 상태 추가
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [calendarView, setCalendarView] = useState("month");
  const [showCalendar, setShowCalendar] = useState(false); // 캘린더 표시 여부
  
  // 선택 삭제 기능 관련 상태 추가
  const [selectedLeaves, setSelectedLeaves] = useState<string[]>([]);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  
  // 휴가 추가 다이얼로그 관련 상태
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedPersonType, setSelectedPersonType] = useState<"soldier" | "officer">("soldier");
  const [selectedPerson, setSelectedPerson] = useState("");
  const [selectedPersonName, setSelectedPersonName] = useState("");
  const [selectedPersonRank, setSelectedPersonRank] = useState("");
  const [searchPersonQuery, setSearchPersonQuery] = useState("");
  const [openPersonSearch, setOpenPersonSearch] = useState(false);
  const [personSearchTab, setPersonSearchTab] = useState<"soldiers" | "officers">("soldiers"); // 인원 검색 탭 상태 추가
  
  // 휴가 상세 다이얼로그 관련 상태
  const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  
  // 휴가 폼 관련 상태
  const [leaveForm, setLeaveForm] = useState({
    leaveType: "",
    startDate: new Date(),
    endDate: new Date(),
    destination: "",
    contact: "",
    reason: ""
  });
  
  // 휴가 수정 다이얼로그 관련 상태
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [leaveToEdit, setLeaveToEdit] = useState<Leave | null>(null);
  const [editForm, setEditForm] = useState({
    leaveType: "",
    startDate: new Date(),
    endDate: new Date(),
    destination: "",
    contact: "",
    reason: "",
    status: "신청" as "신청" | "승인" | "거절"
  });
  
  // 휴가 삭제 다이얼로그 관련 상태
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [leaveToDelete, setLeaveToDelete] = useState<Leave | null>(null);
  
  // 휴가 부여 다이얼로그 관련 상태 추가
  const [isGrantLeaveDialogOpen, setIsGrantLeaveDialogOpen] = useState(false);
  const [grantLeaveForm, setGrantLeaveForm] = useState({
    personType: "soldier" as "soldier" | "officer",
    personId: "",
    personName: "",
    personRank: "",
    leaveType: "",
    leaveTypeName: "",
    days: 1,
    reason: ""
  });
  const [customLeaveType, setCustomLeaveType] = useState("");
  
  // 휴가 종류 목록 (기본값)
  const [leaveTypes, setLeaveTypes] = useState([
    { id: "annual", name: "연가", isDefault: true },
    { id: "reward", name: "포상휴가", isDefault: true },
    { id: "medical", name: "병가", isDefault: true },
    { id: "special", name: "위로휴가", isDefault: true },
    { id: "other", name: "기타", isDefault: true }
  ]);
  
  const router = useRouter();
  
  useEffect(() => {
    loadLeaves();
    loadSoldiers();
    loadOfficers();
    fetchLeaveTypes();
  }, []);
  
  // 휴가 데이터 로드 (통합)
  const loadLeaves = async () => {
    setLoading(true);
    try {
      // 직접 통합 API 사용 (새로운 버전)
      const leavesResponse = await getLeaves();
      
      if (leavesResponse.success && leavesResponse.data) {
        // 신청 날짜(createdAt) 기준으로 내림차순 정렬
        const sortedLeaves = leavesResponse.data.sort((a, b) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        
        setLeaves(sortedLeaves);
      } else {
        toast({
          title: "오류",
          description: leavesResponse.error || "휴가 정보를 불러오는데 실패했습니다.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("휴가 로드 오류:", error);
      toast({
        title: "오류",
        description: "휴가 정보를 불러오는데 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // 병사 데이터 로드
  const loadSoldiers = async () => {
    try {
      const response = await getSoldiers();
      if (response.success && response.data) {
        setSoldiers(response.data);
      }
    } catch (error) {
      console.error("병사 데이터 로드 오류:", error);
    }
  };
  
  // 간부 데이터 로드
  const loadOfficers = async () => {
    try {
      const response = await getOfficers();
      if (response.success && response.data) {
        setOfficers(response.data);
      }
    } catch (error) {
      console.error("간부 데이터 로드 오류:", error);
    }
  };
  
  // 휴가 종류 목록 불러오기
  const fetchLeaveTypes = async () => {
    try {
      const response = await fetch('/api/leave-types');
      if (response.ok) {
        const data = await response.json();
        if (data.leaveTypes && Array.isArray(data.leaveTypes)) {
          setLeaveTypes(data.leaveTypes);
        }
      } else {
        console.error("휴가 종류 목록을 불러오는데 실패했습니다");
        // 실패해도 기본값은 유지됨
      }
    } catch (error) {
      console.error("휴가 종류 목록 불러오기 오류:", error);
    }
  };
  
  // 인원 선택 처리
  const handlePersonTypeChange = (value: "soldier" | "officer") => {
    setSelectedPersonType(value);
    setSelectedPerson("");
    setSelectedPersonName("");
    setSelectedPersonRank("");
    setSearchPersonQuery("");
  };
  
  // 인원 선택 처리
  const handlePersonSelect = (value: string, name: string, rank: string) => {
    setSelectedPerson(value);
    setSelectedPersonName(name);
    setSelectedPersonRank(rank);
    setOpenPersonSearch(false);
  };
  
  // 필터링된 인원 목록
  const filteredPersons = selectedPersonType === "soldier"
    ? soldiers.filter(soldier => 
        soldier.name.includes(searchPersonQuery) || 
        soldier.serialNumber.includes(searchPersonQuery) ||
        soldier.rank.includes(searchPersonQuery)
      )
    : officers.filter(officer => 
        officer.name.includes(searchPersonQuery) || 
        officer.rank.includes(searchPersonQuery)
      );
  
  // 휴가 추가 제출 처리
  const handleAddLeave = async () => {
    if (!selectedPerson || !leaveForm.leaveType || !leaveForm.destination || !leaveForm.contact) {
      toast({
        title: "입력 오류",
        description: "모든 필수 항목을 입력해주세요.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // 휴가 일수 계산
      const startDate = leaveForm.startDate;
      const endDate = leaveForm.endDate;
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      
      const leaveData = {
        personType: selectedPersonType,
        personId: selectedPerson,
        personName: selectedPersonName,
        personRank: selectedPersonRank,
        leaveType: leaveForm.leaveType,
        startDate: format(leaveForm.startDate, "yyyy-MM-dd"),
        endDate: format(leaveForm.endDate, "yyyy-MM-dd"),
        duration: diffDays,
        destination: leaveForm.destination,
        contact: leaveForm.contact,
        reason: leaveForm.reason,
        status: "pending" as "pending" | "approved" | "rejected" | "personal"
      };
      
      const response = await addLeave(leaveData);
      
      if (response.success) {
        toast({
          title: "성공",
          description: "휴가 정보가 등록되었습니다."
        });
        loadLeaves();
        resetForm();
        setIsAddDialogOpen(false);
      } else {
        toast({
          title: "오류",
          description: response.error || "휴가 등록에 실패했습니다.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("휴가 등록 오류:", error);
      toast({
        title: "오류",
        description: "휴가 등록에 실패했습니다.",
        variant: "destructive"
      });
    }
  };
  
  // 휴가 승인 처리
  const handleApproveLeave = async (id: string) => {
    try {
      const response = await updateLeaveStatus(id, "approved");
      if (response.success) {
        setLeaves(leaves.map(leave => 
          leave.id === id ? { ...leave, status: "approved" } : leave
        ));
        toast({
          title: "승인 완료",
          description: "휴가가 성공적으로 승인되었습니다.",
        });
        await loadLeaves();
        setIsViewDialogOpen(false);
      } else {
        toast({
          title: "오류",
          description: response.error || "휴가 승인 중 오류가 발생했습니다.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("휴가 승인 오류:", error);
      toast({
        title: "오류",
        description: "휴가 승인 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };
  
  // 휴가 거절 처리
  const handleRejectLeave = async (id: string) => {
    try {
      const response = await updateLeaveStatus(id, "rejected");
      if (response.success) {
        setLeaves(leaves.map(leave => 
          leave.id === id ? { ...leave, status: "rejected" } : leave
        ));
        toast({
          title: "거절 완료",
          description: "휴가가 거절 처리되었습니다.",
        });
        await loadLeaves();
        setIsViewDialogOpen(false);
      } else {
        toast({
          title: "오류",
          description: response.error || "휴가 거절 중 오류가 발생했습니다.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("휴가 거절 오류:", error);
      toast({
        title: "오류",
        description: "휴가 거절 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };
  
  // 휴가 상세 보기
  const handleViewLeave = (leave: Leave) => {
    setSelectedLeave(leave);
    setIsViewDialogOpen(true);
  };
  
  // 폼 초기화
  const resetForm = () => {
    setSelectedPersonType("soldier");
    setSelectedPerson("");
    setSelectedPersonName("");
    setSelectedPersonRank("");
    setSearchPersonQuery("");
    setLeaveForm({
      leaveType: "",
      startDate: new Date(),
      endDate: new Date(),
      destination: "",
      contact: "",
      reason: ""
    });
  };
  
  // 검색 및 필터링
  const filteredLeaves = leaves.filter(leave => {
    // 검색어 필터링
    if (searchQuery) {
      // status가 string인지 확인 (string이 아닐 경우 오류 방지)
      const statusText = typeof leave.status === 'string' ? leave.status : '';
      
      if (!(
        (leave.personName || '').includes(searchQuery) ||
        (leave.leaveType || '').includes(searchQuery) ||
        (leave.destination || '').includes(searchQuery) ||
        statusText.includes(searchQuery)
      )) {
        return false;
      }
    }
    
    return true;
  });
  
  // 캘린더 관련 함수들
  const getMonthLeaves = (month: Date) => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    
    return leaves.filter(leave => {
      // 날짜 문자열을 Date 객체로 변환 (시간대 고려)
      const leaveStart = new Date(leave.startDate);
      const leaveEnd = new Date(leave.endDate);
      
      // 날짜만 비교하기 위해 시간을 00:00:00으로 설정
      const leaveStartDay = new Date(leaveStart.getFullYear(), leaveStart.getMonth(), leaveStart.getDate());
      const leaveEndDay = new Date(leaveEnd.getFullYear(), leaveEnd.getMonth(), leaveEnd.getDate());
      
      // 휴가 기간이 선택한 월과 겹치는지 확인
      return (leaveStartDay <= monthEnd && leaveEndDay >= monthStart);
    });
  };
  
  const getDayLeaves = (day: Date) => {
    return leaves.filter(leave => {
      // 날짜 문자열을 Date 객체로 변환 (시간대 고려)
      const leaveStart = new Date(leave.startDate);
      const leaveEnd = new Date(leave.endDate);
      
      // 날짜만 비교하기 위해 시간을 00:00:00으로 설정
      const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
      const leaveStartDay = new Date(leaveStart.getFullYear(), leaveStart.getMonth(), leaveStart.getDate());
      const leaveEndDay = new Date(leaveEnd.getFullYear(), leaveEnd.getMonth(), leaveEnd.getDate());
      
      // 해당 날짜가 휴가 기간에 포함되는지 확인
      return dayStart >= leaveStartDay && dayStart <= leaveEndDay;
    });
  };
  
  const renderCalendarDay = (day: Date) => {
    const dayLeaves = getDayLeaves(day);
    const isToday = isSameDay(day, new Date());
    
    return (
      <div
        key={day.toISOString()}
        className={cn(
          "min-h-[100px] p-2 border border-gray-200",
          isToday && "bg-blue-50 border-blue-300"
        )}
      >
        <div className={cn(
          "text-sm font-medium mb-1",
          isToday && "text-blue-600"
        )}>
          {format(day, "d")}
        </div>
        <div className="space-y-1">
          {dayLeaves.slice(0, 3).map((leave, index) => (
            <div
              key={`${leave.id}-${index}`}
              className={cn(
                "text-xs p-1 rounded truncate cursor-pointer",
                normalizeStatus(leave.status) === "approved" ? "bg-blue-100 text-blue-800" :
                normalizeStatus(leave.status) === "pending" ? "bg-yellow-100 text-yellow-800" :
                normalizeStatus(leave.status) === "rejected" ? "bg-red-100 text-red-800" :
                "bg-gray-100 text-gray-800"
              )}
              onClick={() => handleViewLeave(leave)}
              title={`${leave.personRank} ${leave.personName} - ${leave.leaveType} (${leave.duration}일)`}
            >
              {leave.personRank} {leave.personName}
            </div>
          ))}
          {dayLeaves.length > 3 && (
            <div className="text-xs text-gray-500">
              +{dayLeaves.length - 3}명 더
            </div>
          )}
        </div>
      </div>
    );
  };
  
  const renderCalendarGrid = () => {
    const monthStart = startOfMonth(selectedMonth);
    const monthEnd = endOfMonth(selectedMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    // 월의 첫 번째 날이 무슨 요일인지 확인하여 빈 칸 추가
    const startDay = monthStart.getDay();
    const emptyDays = Array.from({ length: startDay }, (_, i) => (
      <div key={`empty-${i}`} className="min-h-[100px] p-2 border border-gray-200 bg-gray-50"></div>
    ));
    
    return (
      <div className="grid grid-cols-7 gap-0">
        {/* 요일 헤더 */}
        {['일', '월', '화', '수', '목', '금', '토'].map(day => (
          <div key={day} className="p-3 text-center font-medium bg-gray-100 border border-gray-200">
            {day}
          </div>
        ))}
        
        {/* 빈 칸 */}
        {emptyDays}
        
        {/* 실제 날짜들 */}
        {days.map(renderCalendarDay)}
      </div>
    );
  };
  
  console.log("필터링 후 휴가 목록 수:", filteredLeaves.length);

  // 선택 항목 삭제 처리
  const handleBulkDelete = async () => {
    if (selectedLeaves.length === 0) {
      toast({
        title: "선택 오류",
        description: "삭제할 휴가를 선택해주세요.",
        variant: "destructive"
      });
      return;
    }
    
    setIsBulkDeleteDialogOpen(true);
  };
  
  // 선택 항목 체크 처리
  const handleToggleSelect = (id: string) => {
    setSelectedLeaves(prev => {
      if (prev.includes(id)) {
        return prev.filter(leaveId => leaveId !== id);
      } else {
        return [...prev, id];
      }
    });
  };
  
  // 전체 선택/해제 처리
  const handleToggleSelectAll = () => {
    if (selectedLeaves.length === filteredLeaves.length) {
      setSelectedLeaves([]);
    } else {
      setSelectedLeaves(filteredLeaves.map(leave => leave.id));
    }
  };
  
  // 선택 항목 삭제 확정 처리
  const handleConfirmBulkDelete = async () => {
    try {
      setLoading(true);
      
      const deletePromises = selectedLeaves.map(id => deleteLeave(id));
      const results = await Promise.all(deletePromises);
      
      const successCount = results.filter(result => result.success).length;
      
      toast({
        title: "삭제 완료",
        description: `${successCount}개의 휴가가 삭제되었습니다.`
      });
      
      loadLeaves();
      setSelectedLeaves([]);
      setIsBulkDeleteDialogOpen(false);
    } catch (error) {
      console.error("일괄 삭제 오류:", error);
      toast({
        title: "오류",
        description: "휴가 삭제 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // 날짜 형식 변환
  const formatDateString = (dateString: string) => {
    try {
      return format(new Date(dateString), "yyyy-MM-dd");
    } catch (error) {
      return dateString;
    }
  };
  
  // 휴가 상태별 배지 스타일
  const getStatusBadge = (status: string) => {
    switch (normalizeStatus(status)) {
      case 'pending':
        return <Badge className="bg-yellow-500">신청</Badge>
      case 'approved':
        return <Badge className="bg-green-500">승인</Badge>
      case 'rejected':
        return <Badge className="bg-red-500">거절</Badge>
      case 'personal':
        return <Badge className="bg-blue-500">개인</Badge>
      default:
        return <Badge className="bg-gray-500">{status}</Badge>
    }
  };
  
  // 휴가 상태 표시 함수
  const getStatusColor = (status: string) => {
    switch(normalizeStatus(status)) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'personal':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 휴가 상태 표시 텍스트
  const getStatusText = (status: string) => {
    return normalizeStatus(status, true); // 한국어로 변환
  };
  
  // 휴가 기간 계산
  const calculateDuration = (startDate: Date, endDate: Date) => {
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };
  
  // 휴가 수정 처리
  const handleEditLeave = (leave: Leave) => {
    setLeaveToEdit(leave);
    setEditForm({
      leaveType: leave.leaveType,
      startDate: new Date(leave.startDate),
      endDate: new Date(leave.endDate),
      destination: leave.destination,
      contact: leave.contact,
      reason: leave.reason || "",
      status: normalizeStatus(leave.status) as "신청" | "승인" | "거절"
    });
    setIsViewDialogOpen(false);
    setIsEditDialogOpen(true);
  };
  
  // 휴가 수정 폼 제출 처리
  const handleSubmitEdit = async () => {
    if (!leaveToEdit || !editForm.leaveType || !editForm.destination || !editForm.contact) {
      toast({
        title: "입력 오류",
        description: "모든 필수 항목을 입력해주세요.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // 휴가 일수 계산
      const startDate = editForm.startDate;
      const endDate = editForm.endDate;
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      
      // 한글 상태값을 영문으로 변환
      const normalizedStatus = (() => {
        switch(editForm.status) {
          case "신청": return "pending";
          case "승인": return "approved";
          case "거절": return "rejected";
          default: return "pending";
        }
      })();
      
      const updateData = {
        leaveType: editForm.leaveType,
        startDate: format(editForm.startDate, "yyyy-MM-dd"),
        endDate: format(editForm.endDate, "yyyy-MM-dd"),
        duration: diffDays,
        destination: editForm.destination,
        contact: editForm.contact,
        reason: editForm.reason,
        status: normalizedStatus as "pending" | "approved" | "rejected" | "personal"
      };
      
      const response = await updateLeave(leaveToEdit.id, updateData);
      
      if (response.success) {
        toast({
          title: "성공",
          description: "휴가 정보가 수정되었습니다."
        });
        loadLeaves();
        setLeaveToEdit(null);
        setIsEditDialogOpen(false);
      } else {
        toast({
          title: "오류",
          description: response.error || "휴가 수정에 실패했습니다.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("휴가 수정 오류:", error);
      toast({
        title: "오류",
        description: "휴가 수정에 실패했습니다.",
        variant: "destructive"
      });
    }
  };
  
  // 휴가 삭제 처리
  const handleDeleteLeave = (leave: Leave) => {
    setLeaveToDelete(leave);
    setIsViewDialogOpen(false);
    setIsDeleteDialogOpen(true);
  };
  
  // 휴가 삭제 확정 처리
  const handleConfirmDelete = async () => {
    if (!leaveToDelete) return;
    
    try {
      const response = await deleteLeave(leaveToDelete.id);
      
      if (response.success) {
        toast({
          title: "성공",
          description: "휴가가 삭제되었습니다."
        });
        loadLeaves();
        setIsDeleteDialogOpen(false);
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
  };
  
  // 휴가 상태 변경 처리
  const handleChangeStatus = async (id: string, newStatus: string) => {
    try {
      setLoading(true);
      // 상태값을 타입에 맞게 변환
      const validStatus = newStatus as "신청" | "승인" | "거절" | "pending" | "approved" | "rejected" | "personal";
      const response = await updateLeaveStatus(id, validStatus);
      
      if (response.success) {
        toast({
          description: `휴가 상태가 "${newStatus}"(으)로 변경되었습니다.`
        });
        await loadLeaves();
        setIsViewDialogOpen(false);
      } else {
        toast({
          title: "오류",
          description: response.error || "휴가 상태 변경에 실패했습니다.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("휴가 상태 변경 오류:", error);
      toast({
        title: "오류",
        description: "휴가 상태 변경에 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // 휴가 부여 처리
  const handleGrantLeave = async () => {
    if (!grantLeaveForm.personId || !grantLeaveForm.leaveTypeName || grantLeaveForm.days < 1) {
      toast({
        title: "입력 오류",
        description: "모든 필수 항목을 입력해주세요.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const response = await fetch('/api/grant-leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personType: grantLeaveForm.personType,
          personId: grantLeaveForm.personId,
          leaveTypeName: grantLeaveForm.leaveTypeName,
          days: grantLeaveForm.days,
          reason: grantLeaveForm.reason || "정기 부여",
          grantedAt: new Date().toISOString()
        }),
      });
      
      if (response.ok) {
        toast({
          title: "휴가 부여 완료",
          description: `${grantLeaveForm.personName}에게 ${grantLeaveForm.leaveTypeName} ${grantLeaveForm.days}일이 부여되었습니다.`,
        });
        setIsGrantLeaveDialogOpen(false);
        // 양식 초기화
        setGrantLeaveForm({
          personType: "soldier",
          personId: "",
          personName: "",
          personRank: "",
          leaveType: "",
          leaveTypeName: "",
          days: 1,
          reason: ""
        });
        setCustomLeaveType("");
      } else {
        const errorData = await response.json();
        toast({
          title: "오류",
          description: errorData.error || "휴가 부여에 실패했습니다.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("휴가 부여 오류:", error);
      toast({
        title: "오류",
        description: "휴가 부여 처리 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };
  
  // 인원 선택 처리 (휴가 부여용)
  const handleSelectPersonForGrant = (person: any, type: "soldier" | "officer") => {
    setGrantLeaveForm({
      ...grantLeaveForm,
      personType: type,
      personId: person.id,
      personName: person.name,
      personRank: person.rank
    });
  };
  
  // 휴가 종류 선택 처리
  const handleLeaveTypeChange = (type: string) => {
    if (type === "custom") {
      setGrantLeaveForm({
        ...grantLeaveForm,
        leaveType: "custom",
        leaveTypeName: customLeaveType
      });
    } else {
      const selectedType = leaveTypes.find(t => t.id === type);
      if (selectedType) {
        setGrantLeaveForm({
          ...grantLeaveForm,
          leaveType: type,
          leaveTypeName: selectedType.name
        });
      }
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">휴가 관리</h1>
          <p className="text-muted-foreground">병사 및 간부 휴가를 관리합니다.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/leaves/grant">
              <Gift className="mr-2 h-4 w-4" />
              휴가 부여 관리
            </Link>
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            휴가 추가
          </Button>
          <Button variant="outline" onClick={() => setIsGrantLeaveDialogOpen(true)}>
            <Gift className="mr-2 h-4 w-4" />
            휴가 부여
          </Button>
        </div>
      </div>
      
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Button
            variant={!showCalendar ? "default" : "outline"}
            onClick={() => setShowCalendar(false)}
          >
            목록 보기
          </Button>
          <Button
            variant={showCalendar ? "default" : "outline"}
            onClick={() => setShowCalendar(true)}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            캘린더 보기
          </Button>
        </div>
        
        {showCalendar && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-lg font-medium min-w-[120px] text-center">
              {format(selectedMonth, "yyyy년 MM월", { locale: ko })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedMonth(new Date())}
            >
              오늘
            </Button>
          </div>
        )}
        
        {!showCalendar && (
          <div className="flex items-center space-x-2">
            <div className="flex w-full max-w-sm items-center space-x-2">
              <Input
                placeholder="이름, 유형, 목적지, 상태 검색..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              />
              <Button type="submit" size="icon" variant="ghost">
                <Search className="h-4 w-4" />
              </Button>
            </div>
            
            {selectedLeaves.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {selectedLeaves.length}개 삭제
              </Button>
            )}
          </div>
        )}
      </div>
      
      {/* 목록 또는 캘린더 표시 */}
      {!showCalendar ? (
        <Card>
          <CardHeader>
            <CardTitle>휴가 목록</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableCaption>휴가 관리 시스템</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300"
                      checked={selectedLeaves.length === filteredLeaves.length && filteredLeaves.length > 0}
                      onChange={handleToggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>성명</TableHead>
                  <TableHead>계급</TableHead>
                  <TableHead>구분</TableHead>
                  <TableHead>유형</TableHead>
                  <TableHead>기간</TableHead>
                  <TableHead>일수</TableHead>
                  <TableHead>목적지</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>신청일</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-6">
                      로딩 중...
                    </TableCell>
                  </TableRow>
                ) : filteredLeaves.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-6">
                      휴가 정보가 없습니다
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLeaves.map((leave) => (
                    <TableRow 
                      key={leave.id} 
                      className="cursor-pointer hover:bg-gray-50"
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300"
                          checked={selectedLeaves.includes(leave.id)}
                          onChange={() => handleToggleSelect(leave.id)}
                        />
                      </TableCell>
                      <TableCell onClick={() => handleViewLeave(leave)}>{leave.personName}</TableCell>
                      <TableCell onClick={() => handleViewLeave(leave)}>{leave.personRank}</TableCell>
                      <TableCell onClick={() => handleViewLeave(leave)}>
                        {leave.personType === "soldier" ? "병사" : "간부"}
                      </TableCell>
                      <TableCell onClick={() => handleViewLeave(leave)}>{leave.leaveType}</TableCell>
                      <TableCell onClick={() => handleViewLeave(leave)}>
                        {formatDateString(leave.startDate)} ~ {formatDateString(leave.endDate)}
                      </TableCell>
                      <TableCell onClick={() => handleViewLeave(leave)}>{leave.duration}일</TableCell>
                      <TableCell onClick={() => handleViewLeave(leave)}>{leave.destination}</TableCell>
                      <TableCell onClick={() => handleViewLeave(leave)}>{getStatusBadge(leave.status)}</TableCell>
                      <TableCell onClick={() => handleViewLeave(leave)}>{formatDateString(leave.createdAt)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>휴가 캘린더</CardTitle>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
                <span>병사</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
                <span>간부</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">로딩 중...</div>
            ) : (
              <div className="space-y-4">
                {/* 월별 휴가 통계 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {(() => {
                    const monthLeaves = getMonthLeaves(selectedMonth);
                    const soldierLeaves = monthLeaves.filter(l => l.personType === "soldier");
                    const officerLeaves = monthLeaves.filter(l => l.personType === "officer");
                    
                    return (
                      <>
                        <Card>
                          <CardContent className="p-4">
                            <div className="text-2xl font-bold">{monthLeaves.length}</div>
                            <p className="text-sm text-muted-foreground">총 휴가 건수</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4">
                            <div className="text-2xl font-bold text-blue-600">{soldierLeaves.length}</div>
                            <p className="text-sm text-muted-foreground">병사 휴가</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4">
                            <div className="text-2xl font-bold text-green-600">{officerLeaves.length}</div>
                            <p className="text-sm text-muted-foreground">간부 휴가</p>
                          </CardContent>
                        </Card>
                      </>
                    );
                  })()}
                </div>
                
                {/* 캘린더 그리드 */}
                {renderCalendarGrid()}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* 휴가 상세 보기 다이얼로그 */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>휴가 상세 정보</DialogTitle>
            <DialogDescription>
              휴가에 대한 자세한 정보를 확인합니다.
            </DialogDescription>
          </DialogHeader>
          
          {selectedLeave && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">성명</p>
                  <p>{selectedLeave.personName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">계급</p>
                  <p>{selectedLeave.personRank}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">구분</p>
                  <p>{selectedLeave.personType === "soldier" ? "병사" : "간부"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">휴가 유형</p>
                  <p>{selectedLeave.leaveType}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">상태</p>
                  <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedLeave.status)}`}>
                    {getStatusText(selectedLeave.status)}
                  </div>
                </div>
                {selectedLeave.approverName && (
                  <div>
                    <p className="text-sm font-medium">승인자</p>
                    <p>{selectedLeave.approverName}</p>
                  </div>
                )}
              </div>
              
              <div>
                <p className="text-sm font-medium">휴가 기간</p>
                <p>
                  {formatDateString(selectedLeave.startDate)} ~ {formatDateString(selectedLeave.endDate)} ({selectedLeave.duration}일)
                </p>
              </div>
              
              <div>
                <p className="text-sm font-medium">신청일</p>
                <p>{formatDateString(selectedLeave.createdAt)}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium">목적지</p>
                <p>{selectedLeave.destination}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium">연락처</p>
                <p>{selectedLeave.contact}</p>
              </div>
              
              {selectedLeave.reason && (
                <div>
                  <p className="text-sm font-medium">사유</p>
                  <p>{selectedLeave.reason}</p>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter className="gap-2">
            {/* 휴가 상태에 따라 버튼 표시 */}
            {normalizeStatus(selectedLeave?.status || "") === "pending" && (
              <div className="flex gap-2 w-full justify-end">
                <Button 
                  variant="outline"
                  onClick={() => selectedLeave && handleRejectLeave(selectedLeave.id)}
                >
                  거절
                </Button>
                <Button 
                  variant="default"
                  onClick={() => selectedLeave && handleApproveLeave(selectedLeave.id)}
                >
                  승인
                </Button>
              </div>
            )}
            
            {normalizeStatus(selectedLeave?.status || "") === "approved" && (
              <div className="flex gap-2 w-full justify-end">
                <Button 
                  variant="outline"
                  onClick={() => selectedLeave && handleChangeStatus(selectedLeave.id, "rejected")}
                >
                  승인 취소(거절)
                </Button>
              </div>
            )}
            
            {selectedLeave && (
              <div className="flex gap-2 w-full justify-end">
                <Button 
                  variant="destructive"
                  onClick={() => selectedLeave && handleDeleteLeave(selectedLeave)}
                >
                  삭제
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => selectedLeave && handleEditLeave(selectedLeave)}
                >
                  수정
                </Button>
              </div>
            )}
            
            <Button variant="secondary" onClick={() => setIsViewDialogOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 선택 삭제 확인 다이얼로그 */}
      <Dialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>휴가 일괄 삭제</DialogTitle>
            <DialogDescription>
              선택한 {selectedLeaves.length}개의 휴가를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkDeleteDialogOpen(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleConfirmBulkDelete} disabled={loading}>
              {loading ? "삭제 중..." : "삭제"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 휴가 추가 다이얼로그 */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>휴가 추가</DialogTitle>
            <DialogDescription>
              휴가 정보를 등록합니다. 모든 필수 항목을 입력해주세요.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="personType" className="text-right">
                인원 구분
              </Label>
              <Select
                value={selectedPersonType}
                onValueChange={(value: "soldier" | "officer") => handlePersonTypeChange(value)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="인원 구분 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="soldier">병사</SelectItem>
                  <SelectItem value="officer">간부</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="person" className="text-right">
                인원 선택
              </Label>
              <div className="col-span-3">
                <Popover open={openPersonSearch} onOpenChange={setOpenPersonSearch}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openPersonSearch}
                      className="w-full justify-between"
                    >
                      {selectedPersonName
                        ? `${selectedPersonName} (${selectedPersonRank})`
                        : "인원 검색..."}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <div className="p-2">
                      <Input
                        placeholder="이름 또는 군번으로 검색"
                        value={searchPersonQuery}
                        onChange={(e) => setSearchPersonQuery(e.target.value)}
                        className="mb-2"
                      />
                      
                      <div className="mt-2">
                        <div className="flex w-full border-b">
                          <button
                            className={`flex-1 py-2 text-center text-sm font-medium border-b-2 ${
                              personSearchTab === "soldiers" 
                                ? "border-blue-500 text-blue-600" 
                                : "border-transparent text-gray-500 hover:text-gray-700"
                            }`}
                            onClick={() => setPersonSearchTab("soldiers")}
                          >
                            병사
                          </button>
                          <button
                            className={`flex-1 py-2 text-center text-sm font-medium border-b-2 ${
                              personSearchTab === "officers" 
                                ? "border-blue-500 text-blue-600" 
                                : "border-transparent text-gray-500 hover:text-gray-700"
                            }`}
                            onClick={() => setPersonSearchTab("officers")}
                          >
                            간부
                          </button>
                        </div>
                        
                        <div className="max-h-[200px] overflow-y-auto mt-2">
                          {personSearchTab === "soldiers" ? (
                            <>
                              {soldiers
                                .filter(s => 
                                  s.name.includes(searchPersonQuery) || 
                                  (s.serialNumber && s.serialNumber.includes(searchPersonQuery))
                                )
                                .map(soldier => (
                                  <div 
                                    key={soldier.id} 
                                    className="p-2 hover:bg-gray-100 rounded cursor-pointer flex items-center"
                                    onClick={() => {
                                      handlePersonSelect(soldier.id, soldier.name, soldier.rank);
                                    }}
                                  >
                                    <div className="mr-2">
                                      <Avatar>
                                        <AvatarFallback>{soldier.name.charAt(0)}</AvatarFallback>
                                      </Avatar>
                                    </div>
                                    <div>
                                      <p className="font-medium">{soldier.name}</p>
                                      <p className="text-sm text-gray-500">{soldier.rank} | {soldier.unit || '소속 미상'}</p>
                                    </div>
                                  </div>
                                ))
                              }
                              {soldiers.filter(s => 
                                s.name.includes(searchPersonQuery) || 
                                (s.serialNumber && s.serialNumber.includes(searchPersonQuery))
                              ).length === 0 && (
                                <p className="text-center text-gray-500 py-4">검색 결과가 없습니다</p>
                              )}
                            </>
                          ) : (
                            <>
                              {officers
                                .filter(o => 
                                  o.name.includes(searchPersonQuery)
                                )
                                .map(officer => (
                                  <div 
                                    key={officer.id} 
                                    className="p-2 hover:bg-gray-100 rounded cursor-pointer flex items-center"
                                    onClick={() => {
                                      handlePersonSelect(officer.id, officer.name, officer.rank);
                                    }}
                                  >
                                    <div className="mr-2">
                                      <Avatar>
                                        <AvatarFallback>{officer.name.charAt(0)}</AvatarFallback>
                                      </Avatar>
                                    </div>
                                    <div>
                                      <p className="font-medium">{officer.name}</p>
                                      <p className="text-sm text-gray-500">{officer.rank} | {officer.unit || '소속 미상'}</p>
                                    </div>
                                  </div>
                                ))
                              }
                              {officers.filter(o => 
                                o.name.includes(searchPersonQuery)
                              ).length === 0 && (
                                <p className="text-center text-gray-500 py-4">검색 결과가 없습니다</p>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="leaveType" className="text-right">
                휴가 유형
              </Label>
              <Select
                value={leaveForm.leaveType}
                onValueChange={(value) => setLeaveForm({ ...leaveForm, leaveType: value })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="휴가 유형 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="정기휴가">정기휴가</SelectItem>
                  <SelectItem value="포상휴가">포상휴가</SelectItem>
                  <SelectItem value="청원휴가">청원휴가</SelectItem>
                  <SelectItem value="위로휴가">위로휴가</SelectItem>
                  <SelectItem value="특별휴가">특별휴가</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="startDate" className="text-right">
                시작일
              </Label>
              <div className="col-span-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {leaveForm.startDate ? (
                        format(leaveForm.startDate, "yyyy-MM-dd")
                      ) : (
                        <span>시작일 선택</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={leaveForm.startDate}
                      onSelect={(date) => setLeaveForm({ ...leaveForm, startDate: date || new Date() })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="endDate" className="text-right">
                종료일
              </Label>
              <div className="col-span-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {leaveForm.endDate ? (
                        format(leaveForm.endDate, "yyyy-MM-dd")
                      ) : (
                        <span>종료일 선택</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={leaveForm.endDate}
                      onSelect={(date) => setLeaveForm({ ...leaveForm, endDate: date || new Date() })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-gray-500 mt-1">
                  휴가 일수: {leaveForm.startDate && leaveForm.endDate 
                    ? calculateDuration(leaveForm.startDate, leaveForm.endDate) 
                    : 0}일
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="destination" className="text-right">
                목적지
              </Label>
              <Input
                id="destination"
                className="col-span-3"
                value={leaveForm.destination}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  setLeaveForm({ ...leaveForm, destination: e.target.value })
                }
                placeholder="휴가 목적지"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="contact" className="text-right">
                연락처
              </Label>
              <Input
                id="contact"
                className="col-span-3"
                value={leaveForm.contact}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  setLeaveForm({ ...leaveForm, contact: e.target.value })
                }
                placeholder="휴가 중 연락처"
              />
            </div>
            
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="reason" className="text-right pt-2">
                사유
              </Label>
              <Textarea
                id="reason"
                className="col-span-3"
                value={leaveForm.reason}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => 
                  setLeaveForm({ ...leaveForm, reason: e.target.value })
                }
                placeholder="휴가 사유 (선택사항)"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              취소
            </Button>
            <Button type="submit" onClick={handleAddLeave}>
              추가하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 휴가 수정 다이얼로그 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>휴가 수정</DialogTitle>
            <DialogDescription>
              휴가 정보를 수정합니다. 모든 필수 항목을 입력해주세요.
            </DialogDescription>
          </DialogHeader>
          
          {leaveToEdit && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="personInfo" className="text-right">
                  휴가자 정보
                </Label>
                <div className="col-span-3">
                  <p className="text-sm">
                    {leaveToEdit.personName} ({leaveToEdit.personRank})
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="leaveType" className="text-right">
                  휴가 유형
                </Label>
                <Select
                  value={editForm.leaveType}
                  onValueChange={(value) => setEditForm({ ...editForm, leaveType: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="휴가 유형 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="정기휴가">정기휴가</SelectItem>
                    <SelectItem value="포상휴가">포상휴가</SelectItem>
                    <SelectItem value="청원휴가">청원휴가</SelectItem>
                    <SelectItem value="위로휴가">위로휴가</SelectItem>
                    <SelectItem value="특별휴가">특별휴가</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right">
                  상태
                </Label>
                <Select
                  value={editForm.status}
                  onValueChange={(value) => {
                    // 문자열 값을 적절한 상태로 처리
                    setEditForm({ ...editForm, status: value as "신청" | "승인" | "거절" });
                  }}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="상태 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="신청">신청</SelectItem>
                    <SelectItem value="승인">승인</SelectItem>
                    <SelectItem value="거절">거절</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="startDate" className="text-right">
                  시작일
                </Label>
                <div className="col-span-3">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {editForm.startDate ? (
                          format(editForm.startDate, "yyyy-MM-dd")
                        ) : (
                          <span>시작일 선택</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={editForm.startDate}
                        onSelect={(date) => setEditForm({ ...editForm, startDate: date || new Date() })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="endDate" className="text-right">
                  종료일
                </Label>
                <div className="col-span-3">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {editForm.endDate ? (
                          format(editForm.endDate, "yyyy-MM-dd")
                        ) : (
                          <span>종료일 선택</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={editForm.endDate}
                        onSelect={(date) => setEditForm({ ...editForm, endDate: date || new Date() })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-gray-500 mt-1">
                    휴가 일수: {editForm.startDate && editForm.endDate 
                      ? calculateDuration(editForm.startDate, editForm.endDate) 
                      : 0}일
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="destination" className="text-right">
                  목적지
                </Label>
                <Input
                  id="destination"
                  className="col-span-3"
                  value={editForm.destination}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    setEditForm({ ...editForm, destination: e.target.value })
                  }
                  placeholder="휴가 목적지"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="contact" className="text-right">
                  연락처
                </Label>
                <Input
                  id="contact"
                  className="col-span-3"
                  value={editForm.contact}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    setEditForm({ ...editForm, contact: e.target.value })
                  }
                  placeholder="휴가 중 연락처"
                />
              </div>
              
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="reason" className="text-right pt-2">
                  사유
                </Label>
                <Textarea
                  id="reason"
                  className="col-span-3"
                  value={editForm.reason}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => 
                    setEditForm({ ...editForm, reason: e.target.value })
                  }
                  placeholder="휴가 사유 (선택사항)"
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              취소
            </Button>
            <Button type="submit" onClick={handleSubmitEdit}>
              수정하기
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
              <p><strong>상태:</strong> {getStatusText(leaveToDelete.status)}</p>
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
      
      {/* 휴가 부여 다이얼로그 */}
      <Dialog open={isGrantLeaveDialogOpen} onOpenChange={setIsGrantLeaveDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>휴가 부여</DialogTitle>
            <DialogDescription>
              병사나 간부에게 휴가 일수를 부여합니다. 입대일에 연가 24일은 기본 제공됩니다.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* 인원 선택 */}
            <div>
              <Label htmlFor="person-select">인원 선택</Label>
              <div className="flex gap-2 items-center mt-1">
                <div className="flex-1">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        {grantLeaveForm.personName
                          ? `${grantLeaveForm.personName} (${grantLeaveForm.personRank})`
                          : "인원을 선택하세요"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <div className="p-2">
                        <Input
                          placeholder="이름 또는 군번으로 검색"
                          value={searchPersonQuery}
                          onChange={(e) => setSearchPersonQuery(e.target.value)}
                          className="mb-2"
                        />
                        
                        <div className="mt-2">
                          <div className="flex w-full border-b">
                            <button
                              className={`flex-1 py-2 text-center text-sm font-medium border-b-2 ${
                                personSearchTab === "soldiers" 
                                  ? "border-blue-500 text-blue-600" 
                                  : "border-transparent text-gray-500 hover:text-gray-700"
                              }`}
                              onClick={() => setPersonSearchTab("soldiers")}
                            >
                              병사
                            </button>
                            <button
                              className={`flex-1 py-2 text-center text-sm font-medium border-b-2 ${
                                personSearchTab === "officers" 
                                  ? "border-blue-500 text-blue-600" 
                                  : "border-transparent text-gray-500 hover:text-gray-700"
                              }`}
                              onClick={() => setPersonSearchTab("officers")}
                            >
                              간부
                            </button>
                          </div>
                          
                          <div className="max-h-[200px] overflow-y-auto mt-2">
                            {personSearchTab === "soldiers" ? (
                              <>
                                {soldiers
                                  .filter(s => 
                                    s.name.includes(searchPersonQuery) || 
                                    (s.serialNumber && s.serialNumber.includes(searchPersonQuery))
                                  )
                                  .map(soldier => (
                                    <div 
                                      key={soldier.id} 
                                      className="p-2 hover:bg-gray-100 rounded cursor-pointer flex items-center"
                                      onClick={() => {
                                        handleSelectPersonForGrant(soldier, "soldier");
                                        setSearchPersonQuery("");
                                      }}
                                    >
                                      <div className="mr-2">
                                        <Avatar>
                                          <AvatarFallback>{soldier.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                      </div>
                                      <div>
                                        <p className="font-medium">{soldier.name}</p>
                                        <p className="text-sm text-gray-500">{soldier.rank} | {soldier.unit || '소속 미상'}</p>
                                      </div>
                                    </div>
                                  ))
                                }
                                {soldiers.filter(s => 
                                  s.name.includes(searchPersonQuery) || 
                                  (s.serialNumber && s.serialNumber.includes(searchPersonQuery))
                                ).length === 0 && (
                                  <p className="text-center text-gray-500 py-4">검색 결과가 없습니다</p>
                                )}
                              </>
                            ) : (
                              <>
                                {officers
                                  .filter(o => 
                                    o.name.includes(searchPersonQuery)
                                  )
                                  .map(officer => (
                                    <div 
                                      key={officer.id} 
                                      className="p-2 hover:bg-gray-100 rounded cursor-pointer flex items-center"
                                      onClick={() => {
                                        handleSelectPersonForGrant(officer, "officer");
                                        setSearchPersonQuery("");
                                      }}
                                    >
                                      <div className="mr-2">
                                        <Avatar>
                                          <AvatarFallback>{officer.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                      </div>
                                      <div>
                                        <p className="font-medium">{officer.name}</p>
                                        <p className="text-sm text-gray-500">{officer.rank} | {officer.unit || '소속 미상'}</p>
                                      </div>
                                    </div>
                                  ))
                                }
                                {officers.filter(o => 
                                  o.name.includes(searchPersonQuery)
                                ).length === 0 && (
                                  <p className="text-center text-gray-500 py-4">검색 결과가 없습니다</p>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              {grantLeaveForm.personName && (
                <div className="text-sm text-gray-500 mt-1">
                  {grantLeaveForm.personRank} | {grantLeaveForm.personType === "soldier" ? "병사" : "간부"}
                </div>
              )}
            </div>
            
            {/* 휴가 종류 */}
            <div>
              <Label htmlFor="leave-type">휴가 종류</Label>
              <Select 
                onValueChange={handleLeaveTypeChange}
                value={grantLeaveForm.leaveType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="휴가 종류를 선택하세요" />
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
              
              {grantLeaveForm.leaveType === "custom" && (
                <div className="mt-2">
                  <Input
                    placeholder="휴가 종류 직접 입력"
                    value={customLeaveType}
                    onChange={(e) => {
                      setCustomLeaveType(e.target.value);
                      setGrantLeaveForm({
                        ...grantLeaveForm,
                        leaveTypeName: e.target.value
                      });
                    }}
                  />
                </div>
              )}
            </div>
            
            {/* 부여 일수 */}
            <div>
              <Label htmlFor="leave-days">부여 일수</Label>
              <Input
                id="leave-days"
                type="number"
                min={1}
                value={grantLeaveForm.days}
                onChange={(e) => setGrantLeaveForm({
                  ...grantLeaveForm,
                  days: parseInt(e.target.value, 10) || 1
                })}
              />
            </div>
            
            {/* 사유 (선택사항) */}
            <div>
              <Label htmlFor="leave-reason">부여 사유 (선택사항)</Label>
              <Input
                id="leave-reason"
                value={grantLeaveForm.reason}
                onChange={(e) => setGrantLeaveForm({
                  ...grantLeaveForm,
                  reason: e.target.value
                })}
                placeholder="예) 정기 연가, 특별 포상 등"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGrantLeaveDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleGrantLeave}>
              휴가 부여
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 