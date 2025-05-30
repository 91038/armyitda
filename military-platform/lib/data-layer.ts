import { db } from './firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  Timestamp, 
  startAfter,
  documentId
} from 'firebase/firestore';
import { ApiResponse, Leave, ScheduleEvent } from '@/types';
import { normalizeStatus, normalizeTimestamp, normalizeLeaveType } from './utils';

/**
 * 데이터 계층 - 통합 휴가 시스템을 위한 데이터 접근 레이어
 */

// 컬렉션 상수
const LEAVES_COLLECTION = 'leaves';
const SCHEDULES_COLLECTION = 'schedules';
const SOLDIERS_COLLECTION = 'soldiers';
const OFFICERS_COLLECTION = 'officers';

/**
 * Firestore 문서를 Leave 객체로 변환
 */
export const convertDocToLeave = (doc: any): Leave => {
  const data = doc.data();
  return {
    id: doc.id,
    personId: data.personId,
    personType: data.personType,
    personName: data.personName,
    personRank: data.personRank || "",
    leaveType: data.leaveType,
    startDate: normalizeTimestamp(data.startDate),
    endDate: normalizeTimestamp(data.endDate),
    destination: data.destination || "",
    contact: data.contact || "",
    reason: data.reason || "",
    status: normalizeStatus(data.status || "pending") as "pending" | "approved" | "rejected" | "personal",
    duration: data.duration || 0,
    createdAt: normalizeTimestamp(data.createdAt),
    updatedAt: normalizeTimestamp(data.updatedAt),
    approverName: data.approverName || ""
  };
};

/**
 * ScheduleEvent를 Leave 형식으로 변환
 */
export const convertScheduleToLeave = (schedule: ScheduleEvent): Leave => {
  // 시작일과 종료일 변환
  const startDate = normalizeTimestamp(schedule.startDate);
  const endDate = normalizeTimestamp(schedule.endDate || schedule.startDate);

  // 휴가 유형 결정
  const leaveType = normalizeLeaveType(
    schedule.leaveTypes || schedule.leaveType || schedule.title
  );

  // 상태 변환
  const normalizedStatus = normalizeStatus(schedule.status || "pending");
  // 유효한 상태값만 받아들이도록 타입 단언
  const status = (["pending", "approved", "rejected", "personal"].includes(normalizedStatus) 
    ? normalizedStatus 
    : "pending") as "pending" | "approved" | "rejected" | "personal";

  // 생성일 변환
  const createdAt = normalizeTimestamp(schedule.requestedAt || schedule.createdAt);

  return {
    id: schedule.id,
    personId: schedule.userId,
    personType: schedule.personType || "soldier", 
    personName: schedule.requesterName || schedule.personName || '이름 없음',
    personRank: schedule.requesterRank || schedule.personRank || '',
    leaveType: leaveType,
    startDate: startDate,
    endDate: endDate,
    destination: schedule.destination || schedule.reason || '불명',
    contact: schedule.contact || '',
    reason: schedule.reason || '',
    status: status,
    duration: schedule.days || schedule.duration || 1,
    createdAt: createdAt,
    updatedAt: normalizeTimestamp(schedule.updatedAt || schedule.processedAt || new Date()),
    approverName: schedule.approverName || ''
  };
};

/**
 * 통합 휴가 데이터 조회 (leaves와 schedules 컬렉션 모두 조회)
 * @param options 검색 옵션
 * @returns 통합된 휴가 목록
 */
export async function getIntegratedLeaves(options?: {
  personType?: "soldier" | "officer";
  personId?: string;
  status?: string;
  startAfter?: string;
  endBefore?: string;
  unit?: string;
  limit?: number;
  offset?: number;
}): Promise<ApiResponse<Leave[]>> {
  try {
    // 1. leaves 컬렉션에서 데이터 조회
    const leavesResponse = await getLeavesFromCollection(options);
    
    // 2. schedules 컬렉션에서 데이터 조회
    const schedulesResponse = await getSchedulesAsLeaves(options);
    
    // 3. 두 데이터 소스 병합
    const combinedLeaves: Leave[] = [];
    
    if (leavesResponse.success && leavesResponse.data) {
      combinedLeaves.push(...leavesResponse.data);
    }
    
    if (schedulesResponse.success && schedulesResponse.data) {
      combinedLeaves.push(...schedulesResponse.data);
    }
    
    // 4. 정렬 (최신순)
    combinedLeaves.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    
    return {
      success: true,
      data: combinedLeaves
    };
  } catch (error) {
    console.error("통합 휴가 정보 조회 오류:", error);
    return {
      success: false,
      error: "휴가 정보를 불러오는 중 오류가 발생했습니다."
    };
  }
}

/**
 * leaves 컬렉션에서 휴가 데이터 조회
 */
export async function getLeavesFromCollection(options?: {
  personType?: "soldier" | "officer";
  personId?: string;
  status?: string;
  startAfter?: string;
  endBefore?: string;
  unit?: string;
  limit?: number;
  offset?: number;
}): Promise<ApiResponse<Leave[]>> {
  try {
    const leavesRef = collection(db, LEAVES_COLLECTION);
    
    // 인덱스 오류 방지를 위해 복합 쿼리 대신 최소 필수 조건만 사용
    let q = query(leavesRef);
    
    // personId가 있는 경우 단일 쿼리로 사용
    if (options?.personId) {
      q = query(q, where("personId", "==", options.personId));
    } 
    // personType만 있는 경우
    else if (options?.personType) {
      q = query(q, where("personType", "==", options.personType));
    }
    
    // 상태 필터링은 클라이언트에서 처리
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return {
        success: true,
        data: []
      };
    }
    
    let leaves: Leave[] = [];
    
    snapshot.forEach(doc => {
      leaves.push(convertDocToLeave(doc));
    });
    
    // 클라이언트 측에서 추가 필터링 수행
    if (options) {
      // 상태 필터링
      if (options.status) {
        const normalizedStatus = normalizeStatus(options.status);
        leaves = leaves.filter(leave => normalizeStatus(leave.status) === normalizedStatus);
      }
      
      // 시작일 필터링
      if (options.startAfter) {
        leaves = leaves.filter(leave => leave.startDate >= options.startAfter!);
      }
      
      // 종료일 필터링
      if (options.endBefore) {
        leaves = leaves.filter(leave => leave.endDate <= options.endBefore!);
      }
      
      // 정렬 (기본: 시작일 내림차순)
      leaves.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
      
      // 제한
      if (options.limit) {
        leaves = leaves.slice(0, options.limit);
      }
    }
    
    return {
      success: true,
      data: leaves
    };
  } catch (error) {
    console.error("leaves 컬렉션 조회 오류:", error);
    return {
      success: false,
      error: "휴가 정보를 불러오는 중 오류가 발생했습니다."
    };
  }
}

/**
 * schedules 컬렉션에서 휴가 관련 데이터 조회 및 Leave 형식으로 변환
 */
export async function getSchedulesAsLeaves(options?: {
  personType?: "soldier" | "officer";
  personId?: string;
  status?: string;
  startAfter?: string;
  endBefore?: string;
  unit?: string;
  limit?: number;
  offset?: number;
}): Promise<ApiResponse<Leave[]>> {
  try {
    const schedulesRef = collection(db, SCHEDULES_COLLECTION);
    
    // 기본 쿼리 - 휴가 관련 일정만 필터링 (인덱스 에러 방지를 위해 orderBy 제거)
    let q = query(
      schedulesRef,
      where("type", "in", ["leave", "휴가", "grantedLeave"])
      // orderBy("startDate", "desc") 제거 - 인덱스 오류 방지
    );
    
    if (options?.personId) {
      q = query(q, where("userId", "==", options.personId));
    }
    
    if (options?.status) {
      // 상태값 정규화
      const normalizedStatus = normalizeStatus(options.status);
      q = query(q, where("status", "==", normalizedStatus));
    }
    
    if (options?.startAfter) {
      q = query(q, where("startDate", ">=", options.startAfter));
    }
    
    if (options?.endBefore) {
      q = query(q, where("endDate", "<=", options.endBefore));
    }
    
    // 향후 페이지네이션 지원
    if (options?.limit) {
      q = query(q, limit(options.limit));
    }
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return {
        success: true,
        data: []
      };
    }
    
    // ScheduleEvent 객체로 변환
    const schedules: ScheduleEvent[] = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      schedules.push({
        id: doc.id,
        ...data
      } as unknown as ScheduleEvent);
    });
    
    // ScheduleEvent를 Leave 형식으로 변환
    const leaves = schedules.map(convertScheduleToLeave);
    
    // 추가 필터링 - personType 필터 적용 (클라이언트 측)
    const filteredLeaves = options?.personType 
      ? leaves.filter(leave => leave.personType === options.personType)
      : leaves;
    
    // 클라이언트 측에서 정렬 (orderBy 대체)
    filteredLeaves.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    
    return {
      success: true,
      data: filteredLeaves
    };
  } catch (error) {
    console.error("schedules 컬렉션 조회 오류:", error);
    return {
      success: false,
      error: "일정 정보를 불러오는 중 오류가 발생했습니다."
    };
  }
}

/**
 * 휴가 상태 업데이트
 */
export async function updateLeaveStatus(
  id: string, 
  status: string, 
  collection = LEAVES_COLLECTION,
  approverName?: string
): Promise<ApiResponse<Leave>> {
  try {
    let docRef = doc(db, collection, id);
    let docExists = false;
    
    // 문서가 존재하는지 확인
    try {
      const docSnapshot = await getDoc(docRef);
      docExists = docSnapshot.exists();
    } catch (error) {
      console.log("문서 확인 중 오류:", error);
      docExists = false;
    }
    
    // 지정된 컬렉션에 문서가 없으면 다른 컬렉션에서 시도
    if (!docExists) {
      const alternativeCollection = collection === LEAVES_COLLECTION ? SCHEDULES_COLLECTION : LEAVES_COLLECTION;
      console.log(`${collection}에서 문서를 찾을 수 없어 ${alternativeCollection}에서 시도합니다.`);
      
      docRef = doc(db, alternativeCollection, id);
      
      // 대체 컬렉션에서도 문서 확인
      const altDocSnapshot = await getDoc(docRef);
      if (!altDocSnapshot.exists()) {
        throw new Error(`문서 ID ${id}를 어느 컬렉션에서도 찾을 수 없습니다.`);
      }
      
      // 컬렉션 변경
      collection = alternativeCollection;
    }
    
    // 상태값 정규화
    const normalizedStatus = normalizeStatus(status) as "pending" | "approved" | "rejected" | "personal";
    
    // 기존 문서 데이터 가져오기
    const docSnapshot = await getDoc(docRef);
    const leaveData = collection === LEAVES_COLLECTION ? 
      convertDocToLeave(docSnapshot) : 
      convertScheduleToLeave(docSnapshot.data() as ScheduleEvent);
    
    const updateData: any = {
      status: normalizedStatus,
      updatedAt: serverTimestamp()
    };
    
    if (approverName) {
      updateData.approverName = approverName;
    }
    
    // 승인 상태로 변경할 때 휴가 일수 차감
    if (normalizedStatus === "approved" && leaveData.personId) {
      try {
        // userLeaves 컬렉션에서 해당 사용자 문서 조회
        const userLeavesRef = doc(db, "userLeaves", leaveData.personId);
        const userLeavesDoc = await getDoc(userLeavesRef);
        
        if (userLeavesDoc.exists()) {
          const userData = userLeavesDoc.data();
          const leaveTypes = userData.leaveTypes || [];
          
          // 일치하는 휴가 유형 찾기
          const leaveTypeIndex = leaveTypes.findIndex((lt: any) => 
            lt.name === leaveData.leaveType || 
            lt.name.toLowerCase() === leaveData.leaveType.toLowerCase()
          );
          
          if (leaveTypeIndex >= 0) {
            const leaveType = leaveTypes[leaveTypeIndex];
            const duration = leaveData.duration || 0;
            
            // 잔여 일수 계산 (음수가 되지 않도록)
            const newRemainingDays = Math.max(0, leaveType.remainingDays - duration);
            
            // 휴가 일수 업데이트
            leaveTypes[leaveTypeIndex] = {
              ...leaveType,
              remainingDays: newRemainingDays,
              updatedAt: serverTimestamp()
            };
            
            // userLeaves 문서 업데이트
            await updateDoc(userLeavesRef, {
              leaveTypes: leaveTypes,
              updatedAt: serverTimestamp()
            });
            
            console.log(`휴가 승인: ${leaveData.personName}의 ${leaveData.leaveType} 일수 차감 (${duration}일), 남은 일수: ${newRemainingDays}일`);
          } else {
            console.log(`휴가 유형 "${leaveData.leaveType}"을(를) 찾을 수 없습니다. 일수 차감을 건너뜁니다.`);
          }
        } else {
          console.log(`사용자 ${leaveData.personId}의 휴가 정보가 없습니다. 일수 차감을 건너뜁니다.`);
        }
      } catch (error) {
        console.error("휴가 일수 차감 중 오류:", error);
        // 차감 실패해도 승인 처리는 계속 진행
      }
    }
    
    await updateDoc(docRef, updateData);
    
    // 업데이트된 데이터 가져오기
    const updatedDoc = await getDoc(docRef);
    
    // leave 컬렉션인 경우
    if (collection === LEAVES_COLLECTION) {
      const updatedLeave = convertDocToLeave(updatedDoc);
      return {
        success: true,
        data: updatedLeave
      };
    } 
    // schedule 컬렉션인 경우
    else if (collection === SCHEDULES_COLLECTION) {
      const data = updatedDoc.data() as ScheduleEvent;
      const updatedLeave = convertScheduleToLeave({
        ...data,
        id: updatedDoc.id  // id를 마지막에 명시하여 중복 지정 방지
      });
      return {
        success: true,
        data: updatedLeave
      };
    }
    
    throw new Error("지원되지 않는 컬렉션입니다.");
  } catch (error: any) {
    console.error("휴가 상태 업데이트 실패:", error);
    return {
      success: false,
      error: error.message || "휴가 상태 업데이트에 실패했습니다."
    };
  }
}

/**
 * 휴가 문서 삭제 (leaves와 schedules 컬렉션 모두 확인)
 */
export async function deleteLeavesDocument(
  id: string,
  initialCollection = LEAVES_COLLECTION
): Promise<ApiResponse<void>> {
  try {
    let docRef = doc(db, initialCollection, id);
    let docExists = false;
    
    // 문서가 존재하는지 확인
    try {
      const docSnapshot = await getDoc(docRef);
      docExists = docSnapshot.exists();
    } catch (error) {
      console.log("문서 확인 중 오류:", error);
      docExists = false;
    }
    
    // 지정된 컬렉션에 문서가 없으면 다른 컬렉션에서 시도
    if (!docExists) {
      const alternativeCollection = initialCollection === LEAVES_COLLECTION 
        ? SCHEDULES_COLLECTION 
        : LEAVES_COLLECTION;
        
      console.log(`${initialCollection}에서 문서를 찾을 수 없어 ${alternativeCollection}에서 시도합니다.`);
      
      docRef = doc(db, alternativeCollection, id);
      
      // 대체 컬렉션에서도 문서 확인
      const altDocSnapshot = await getDoc(docRef);
      if (!altDocSnapshot.exists()) {
        throw new Error(`문서 ID ${id}를 어느 컬렉션에서도 찾을 수 없습니다.`);
      }
    }
    
    // 문서 삭제
    await deleteDoc(docRef);
    
    return {
      success: true
    };
  } catch (error: any) {
    console.error("휴가 문서 삭제 실패:", error);
    return {
      success: false,
      error: error.message || "휴가 문서 삭제에 실패했습니다."
    };
  }
} 