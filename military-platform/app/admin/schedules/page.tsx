'use client'; // 클라이언트 컴포넌트로 전환

import React, { useState, useEffect } from 'react'; // useState, useEffect import
import { getAllSchedules, updateScheduleStatus } from '@/lib/api/schedules';
import { ScheduleEvent } from '@/types';
import { Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"; // Dialog 컴포넌트 import
import { revalidatePath } from 'next/cache'; // Server Action에서만 유효, 클라이언트에서는 다른 방식 필요
import { toast } from "@/components/ui/use-toast";
import { Loader2 } from 'lucide-react'; // 로딩 아이콘

// 타입 변환 (일정 타입 한글 이름)
const typeMap: { [key: string]: string } = {
  leave: '연가',
  medical: '병가',
  outing: '외출',
  stayOut: '외박',
  rewardLeave: '포상휴가',
  other: '기타 휴가',
  personal: '개인 일정',
  duty: '당직'
};

// 상태 한글 변환 및 스타일
const statusMap: { [key: string]: { text: string; variant: "default" | "destructive" | "outline" | "secondary" } } = {
  approved: { text: '승인됨', variant: 'default' },
  rejected: { text: '반려됨', variant: 'destructive' },
  pending: { text: '대기중', variant: 'secondary' },
  personal: { text: '개인', variant: 'outline' },
  default: { text: '알수없음', variant: 'outline' },
};

// Timestamp를 날짜 문자열로 변환하는 헬퍼 함수
const formatTimestamp = (timestamp: Timestamp | string | undefined | null, dateFormat: string = 'yyyy-MM-dd'): string => {
  if (!timestamp) return '-';
  try {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp?.toDate?.();
    return date ? format(date, dateFormat) : '날짜 오류';
  } catch (e) {
    console.error("Error formatting timestamp:", e);
    return '날짜 오류';
  }
};

// Server Action 대신 사용할 클라이언트 측 상태 업데이트 함수
async function handleStatusUpdateClient(scheduleId: string, newStatus: 'approved' | 'rejected', setLoading: React.Dispatch<React.SetStateAction<string | null>>, refreshData: () => void) {
  setLoading(scheduleId + newStatus); // 특정 버튼 로딩 상태 설정
  const adminUserId = 'admin_placeholder'; // TODO: 실제 관리자 ID

  try {
    const result = await updateScheduleStatus(scheduleId, newStatus, adminUserId);
    if (!result.success) {
      console.error("Failed to update status:", result.error);
      toast({ title: "오류", description: result.error || "상태 업데이트 실패", variant: "destructive" });
    } else {
      toast({ title: "성공", description: `상태가 ${statusMap[newStatus]?.text || newStatus}(으)로 변경되었습니다.` });
      refreshData(); // 데이터 새로고침 함수 호출
      // revalidatePath는 Server Action에서 사용되므로 여기서는 제거
    }
  } catch (error: any) {
    console.error("Error updating status client-side:", error);
    toast({ title: "오류", description: error.message || "상태 업데이트 중 오류 발생", variant: "destructive" });
  } finally {
    setLoading(null); // 로딩 상태 해제
  }
}

export default function AdminSchedulesPage() {
  const [schedules, setSchedules] = useState<ScheduleEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleEvent | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null); // 승인/반려 로딩 상태 (scheduleId + status)

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // TODO: 페이지네이션 구현 시 lastVisibleMarker 관리 필요
      const response = await getAllSchedules(50); // 더 많은 데이터 로드
      if (!response.success) {
        throw new Error(response.error || "Failed to load schedules");
      }
      setSchedules(response.data?.items || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []); // 컴포넌트 마운트 시 데이터 로드

  const handleRowClick = (schedule: ScheduleEvent) => {
    setSelectedSchedule(schedule);
    setIsModalOpen(true);
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">Error loading schedules: {error}</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">출타 관리</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>신청자</TableHead>
            <TableHead>종류</TableHead>
            <TableHead>기간</TableHead>
            <TableHead>상태</TableHead>
            <TableHead>신청일</TableHead>
            <TableHead className="text-right">처리</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {schedules.map((schedule) => {
            const statusInfo = statusMap[schedule.status] || statusMap.default;
            const startDateStr = formatTimestamp(schedule.startDate);
            const endDateStr = formatTimestamp(schedule.endDate);
            const requestedAtStr = formatTimestamp(schedule.requestedAt, 'yyyy-MM-dd HH:mm');
            const duration = schedule.days ? `(${schedule.days}일)` : '';
            const period = startDateStr === endDateStr
                             ? startDateStr
                             : `${startDateStr} ~ ${endDateStr} ${duration}`;

            return (
              <TableRow
                key={schedule.id}
                onClick={() => handleRowClick(schedule)}
                className="cursor-pointer hover:bg-muted/50"
              >
                <TableCell>{schedule.requesterRank || ''} {schedule.requesterName || '-'}</TableCell>
                <TableCell>{typeMap[schedule.type] || schedule.type}</TableCell>
                <TableCell>{period}</TableCell>
                <TableCell>
                  <Badge variant={statusInfo.variant}>{statusInfo.text}</Badge>
                </TableCell>
                <TableCell>{requestedAtStr}</TableCell>
                <TableCell className="text-right space-x-2">
                  {schedule.status === 'pending' && (
                    <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600 border-green-600 hover:bg-green-50"
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          handleStatusUpdateClient(schedule.id, 'approved', setUpdatingStatus, fetchData); 
                        }}
                      disabled={updatingStatus === schedule.id + 'approved'}
                    >
                        {updatingStatus === schedule.id + 'approved' ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : null}
                      승인
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          handleStatusUpdateClient(schedule.id, 'rejected', setUpdatingStatus, fetchData); 
                        }}
                      disabled={updatingStatus === schedule.id + 'rejected'}
                    >
                        {updatingStatus === schedule.id + 'rejected' ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : null}
                      반려
                    </Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {schedules.length === 0 && (
          <div className="text-center py-10 text-gray-500">대기 중인 신청 내역이 없습니다.</div>
      )}

      {/* 상세 정보 모달 */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>출타 신청 상세 정보</DialogTitle>
            <DialogDescription>
              {selectedSchedule?.requesterRank} {selectedSchedule?.requesterName}의 신청 내역입니다.
            </DialogDescription>
          </DialogHeader>
          {selectedSchedule && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="text-right font-semibold col-span-1">신청자:</span>
                <span className="col-span-3">{selectedSchedule.requesterRank} {selectedSchedule.requesterName}</span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="text-right font-semibold col-span-1">종류:</span>
                <span className="col-span-3">{typeMap[selectedSchedule.type] || selectedSchedule.type}</span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="text-right font-semibold col-span-1">기간:</span>
                <span className="col-span-3">
                    {formatTimestamp(selectedSchedule.startDate)} ~
                    {formatTimestamp(selectedSchedule.endDate)}
                    {selectedSchedule.days ? ` (${selectedSchedule.days}일)` : ''}
                 </span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                  <span className="text-right font-semibold col-span-1">제목:</span>
                  <span className="col-span-3">{selectedSchedule.title}</span>
              </div>
              {selectedSchedule.reason && (
                <div className="grid grid-cols-4 items-start gap-4">
                  <span className="text-right font-semibold col-span-1">사유:</span>
                  <span className="col-span-3 whitespace-pre-wrap">{selectedSchedule.reason}</span>
                </div>
              )}
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="text-right font-semibold col-span-1">검토자:</span>
                <span className="col-span-3">{selectedSchedule.reviewerName || '-'}</span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="text-right font-semibold col-span-1">승인자:</span>
                <span className="col-span-3">{selectedSchedule.approverName || '-'}</span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="text-right font-semibold col-span-1">상태:</span>
                <span className="col-span-3">
                    <Badge variant={statusMap[selectedSchedule.status]?.variant || 'outline'}>
                      {statusMap[selectedSchedule.status]?.text || selectedSchedule.status}
                    </Badge>
                </span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="text-right font-semibold col-span-1">신청일시:</span>
                <span className="col-span-3">{formatTimestamp(selectedSchedule.requestedAt, 'yyyy-MM-dd HH:mm:ss')}</span>
              </div>
              {selectedSchedule.status !== 'pending' && selectedSchedule.processedAt && (
                 <div className="grid grid-cols-4 items-center gap-4">
                    <span className="text-right font-semibold col-span-1">처리일시:</span>
                    <span className="col-span-3">{formatTimestamp(selectedSchedule.processedAt, 'yyyy-MM-dd HH:mm:ss')}</span>
                 </div>
              )}
               {selectedSchedule.status !== 'pending' && selectedSchedule.processedBy && (
                 <div className="grid grid-cols-4 items-center gap-4">
                    <span className="text-right font-semibold col-span-1">처리자:</span>
                  <span className="col-span-3">{selectedSchedule.processedBy}</span>
                 </div>
              )}
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">닫기</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
} 