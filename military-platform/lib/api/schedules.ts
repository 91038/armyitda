import {
  collection,
  doc,
  getDocs,
  getDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  startAfter,
  getCountFromServer,
  serverTimestamp,
  Timestamp,
  DocumentData
} from 'firebase/firestore';
import { db } from '@/lib/firebase'; // firebase 초기화 경로는 실제 프로젝트에 맞게 조정
import { ApiResponse, PaginatedResponse, ScheduleEvent } from '@/types'; // 필요한 타입 import
import { getSoldier } from './soldiers'; // 사용자 정보 조회 함수 import

// --- 모든 일정 조회 함수 (관리자용, 페이지네이션) ---
export const getAllSchedules = async (
  itemsPerPage: number = 10,
  lastVisibleMarker?: DocumentData | undefined
): Promise<ApiResponse<PaginatedResponse<ScheduleEvent>>> => {
  try {
    const schedulesRef = collection(db, 'schedules');
    let q = query(
      schedulesRef,
      orderBy('requestedAt', 'desc'),
      limit(itemsPerPage)
    );

    if (lastVisibleMarker) {
      q = query(q, startAfter(lastVisibleMarker));
    }

    const snapshot = await getDocs(q);

    // 전체 문서 수 계산
    const countQuery = query(schedulesRef);
    const countSnapshot = await getCountFromServer(countQuery);
    const totalItems = countSnapshot.data().count;

    const schedulesPromises = snapshot.docs.map(async (doc) => {
      const scheduleData = doc.data();
      const schedule: ScheduleEvent = {
        id: doc.id,
        userId: scheduleData.userId,
        type: scheduleData.type,
        title: scheduleData.title,
        startDate: scheduleData.startDate, // Timestamp 유지
        endDate: scheduleData.endDate,
        status: scheduleData.status,
        reason: scheduleData.reason,
        days: scheduleData.days,
        requestedAt: scheduleData.requestedAt, // Timestamp 유지
        reviewerName: scheduleData.reviewerName,
        approverName: scheduleData.approverName,
        processedBy: scheduleData.processedBy, // 처리자 ID 추가
        processedAt: scheduleData.processedAt, // 처리 시각 추가
      };

      // 사용자 정보 가져오기 (이름, 계급)
      try {
        const soldierResponse = await getSoldier(schedule.userId);
        if (soldierResponse.success && soldierResponse.data) {
          schedule.requesterName = soldierResponse.data.name;
          schedule.requesterRank = soldierResponse.data.rank;
        } else {
           // 정보 없을 시 ID 표시 (디버깅용)
           schedule.requesterName = `정보 없음 (ID: ${schedule.userId})`;
           schedule.requesterRank = '-'; // 계급 필드 추가
        }
      } catch (userError) {
        console.error(`Error fetching user ${schedule.userId}:`, userError);
        // 오류 발생 시 ID 표시
        schedule.requesterName = `오류 (ID: ${schedule.userId})`;
        schedule.requesterRank = '-'; // 계급 필드 추가
      }
      return schedule;
    });

    const schedules = await Promise.all(schedulesPromises);
    const lastDoc = snapshot.docs[snapshot.docs.length - 1]; // 다음 페이지 마커

    // PaginatedResponse 구조에 맞춰 데이터 구성
    const page = 1; // 페이지 번호는 클라이언트 또는 추가 로직에서 계산 필요
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    return {
      success: true,
      data: {
        items: schedules,
        total: totalItems, // totalItems -> total
        page: page, // 임시 페이지 번호
        limit: itemsPerPage,
        totalPages: totalPages,
        // lastVisibleDoc은 PaginatedResponse 타입에 없으므로 제거 또는 타입 수정 필요
        // 필요하다면 data 객체 바깥에 별도로 반환하거나, PaginatedResponse 타입 수정
      },
    };
  } catch (error: any) {
    console.error("Error getting all schedules:", error);
    // ApiResponse의 오류 메시지 속성 'error' 사용
    return { success: false, error: error.message || "Failed to get schedules" };
  }
};

// --- 일정 상태 업데이트 함수 ---
export const updateScheduleStatus = async (
  scheduleId: string,
  newStatus: 'approved' | 'rejected',
  processedById: string
): Promise<ApiResponse<null>> => {
  try {
    const scheduleRef = doc(db, 'schedules', scheduleId);
    const scheduleDoc = await getDoc(scheduleRef);

    if (!scheduleDoc.exists()) {
      return { success: false, error: "Schedule not found" };
    }

    await updateDoc(scheduleRef, {
      status: newStatus,
      processedBy: processedById,
      processedAt: serverTimestamp()
    });

    // TODO: 알림 로직 추가

    return { success: true, data: null }; // 성공 시 data 포함 가능
  } catch (error: any) {
    console.error(`Error updating schedule ${scheduleId} status:`, error);
    // ApiResponse의 오류 메시지 속성 'error' 사용
    return { success: false, error: error.message || "Failed to update schedule status" };
  }
}; 