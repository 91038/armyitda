import { ApiResponse, Leave, LeaveStats } from "@/types";
import { db } from "@/lib/firebase";
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  Timestamp, 
  serverTimestamp,
  DocumentData,
  startAfter,
  limit,
  getCountFromServer
} from "firebase/firestore";
import { getSoldier, updateSoldier } from "./soldiers";
import { getOfficer, updateOfficer } from "./officers";
import { normalizeStatus, normalizeTimestamp, normalizeLeaveType } from "../utils";
import { 
  getIntegratedLeaves,
  getLeavesFromCollection,
  updateLeaveStatus as updateLeaveStatusInternal,
  deleteLeavesDocument
} from "../data-layer";

const COLLECTION_NAME = "leaves";

/**
 * Firestore 문서를 Leave 객체로 변환
 */
const convertDocToLeave = (doc: any): Leave => {
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
 * 모든 휴가 정보를 조회합니다.
 * 필터링 옵션을 지원합니다.
 */
export async function getLeaves(options?: {
  personType?: "soldier" | "officer";
  status?: string;
  startAfter?: string;
  endBefore?: string;
  unit?: string;
  limit?: number;
  offset?: number;
}): Promise<ApiResponse<Leave[]>> {
  return getIntegratedLeaves(options);
}

/**
 * 특정 ID의 휴가 정보를 조회합니다.
 */
export async function getLeave(id: string): Promise<ApiResponse<Leave>> {
  try {
    const leaveDoc = await getDoc(doc(db, COLLECTION_NAME, id));
    
    if (!leaveDoc.exists()) {
      return {
        success: false,
        error: "해당 휴가 정보를 찾을 수 없습니다."
      };
    }
    
    return {
      success: true,
      data: convertDocToLeave(leaveDoc)
    };
  } catch (error) {
    console.error("휴가 정보 조회 오류:", error);
    return {
      success: false,
      error: "휴가 정보를 불러오는 중 오류가 발생했습니다."
    };
  }
}

/**
 * 특정 인원(병사/간부)의 휴가 정보를 조회합니다.
 */
export async function getPersonLeaves(personType: "soldier" | "officer", personId: string): Promise<ApiResponse<Leave[]>> {
  return getIntegratedLeaves({ personType, personId });
}

/**
 * 현재 휴가 중인 인원 목록을 조회합니다.
 */
export async function getCurrentLeaves(): Promise<ApiResponse<Leave[]>> {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD 형식
    console.log("오늘 날짜:", today);
    
    const leavesRef = collection(db, COLLECTION_NAME);
    
    // 쿼리 수정: 복합 인덱스 오류 방지를 위해 2단계로 쿼리 실행
    // 첫 번째 단계: 승인된 휴가 중 종료일이 오늘 이후인 것만 가져옴
    const q = query(
      leavesRef,
      where("status", "==", "승인"),
      where("endDate", ">=", today)
    );
    
    const snapshot = await getDocs(q);
    console.log("1차 휴가 조회 결과:", snapshot.size, "건");
    
    if (snapshot.empty) {
      console.log("현재 휴가 중인 인원이 없습니다.");
      return {
        success: true,
        data: []
      };
    }
    
    // 두 번째 단계: 클라이언트 측에서 시작일 필터링 (시작일이 오늘 이전이거나 같은 경우)
    const leaves: Leave[] = [];
    
    snapshot.forEach(doc => {
      const leaveData = convertDocToLeave(doc);
      
      // 시작일이 오늘 이전이거나 같은 경우만 포함
      if (leaveData.startDate <= today) {
        leaves.push(leaveData);
        console.log("휴가 정보:", leaveData.personName, leaveData.personType, leaveData.startDate, "~", leaveData.endDate);
        
        // 휴가 기간에 해당하면 해당 인원의 상태를 즉시 업데이트
        // Promise<void>를 반환하는 호출을 무시하고 오류만 로깅
        updatePersonLeaveStatus(leaveData, "휴가중")
          .then(() => console.log(`${leaveData.personName} 상태 업데이트 완료`))
          .catch(error => console.error("휴가 상태 즉시 업데이트 실패:", error));
      }
    });
    
    console.log("현재 휴가 중인 인원 최종 결과:", leaves.length, "명");
    
    return {
      success: true,
      data: leaves
    };
  } catch (error) {
    console.error("현재 휴가자 조회 오류:", error);
    return {
      success: false,
      error: "현재 휴가 중인 인원을 불러오는 중 오류가 발생했습니다."
    };
  }
}

/**
 * 새 휴가를 신청합니다.
 */
export async function addLeave(leaveData: Omit<Leave, "id" | "createdAt" | "updatedAt">): Promise<ApiResponse<Leave>> {
  try {
    const startDate = leaveData.startDate;
    const endDate = leaveData.endDate;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const now = serverTimestamp(); // 생성/수정 시각

    // 중복 생성 방지를 위한 검사 추가 (동일한 personId, startDate, endDate, leaveType에 대해)
    if (leaveData.personId) {
      const leavesRef = collection(db, COLLECTION_NAME);
      const q = query(
        leavesRef,
        where("personId", "==", leaveData.personId),
        where("startDate", "==", startDate),
        where("endDate", "==", endDate)
      );
      
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        // 이미 동일한 기간에 대한 휴가가 존재함
        return { 
          success: false, 
          error: "동일한 기간에 대한 휴가가 이미 등록되어 있습니다." 
        };
      }
    }

    const data = {
      ...leaveData,
      duration: diffDays,
      createdAt: now,
      updatedAt: now
    };

    const docRef = await addDoc(collection(db, COLLECTION_NAME), data);

    const newLeave: Leave = {
      id: docRef.id,
      ...leaveData,
      duration: diffDays,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return { success: true, data: newLeave };
  } catch (error: any) {
    console.error("휴가 추가 실패:", error);
    return { success: false, error: error.message || "휴가 추가에 실패했습니다." };
  }
}

/**
 * 휴가 상태를 업데이트합니다.
 */
export async function updateLeaveStatus(id: string, status: string, approverName?: string): Promise<ApiResponse<Leave>> {
  return updateLeaveStatusInternal(id, status, COLLECTION_NAME, approverName);
}

/**
 * 휴가 정보를 업데이트합니다.
 */
export async function updateLeave(
  id: string, 
  leaveData: Partial<Omit<Leave, "id" | "createdAt" | "updatedAt">>
): Promise<ApiResponse<Leave>> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    
    // 날짜가 변경된 경우 휴가 일수 재계산
    let updateData: any = {
      ...leaveData,
      updatedAt: serverTimestamp()
    };
    
    if (leaveData.startDate && leaveData.endDate) {
      const start = new Date(leaveData.startDate);
      const end = new Date(leaveData.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      
      updateData.duration = diffDays;
    }
    
    await updateDoc(docRef, updateData);
    
    // 업데이트된 데이터 가져오기
    const updatedDoc = await getDoc(docRef);
    const updatedLeave = convertDocToLeave(updatedDoc);
    
    return {
      success: true,
      data: updatedLeave
    };
  } catch (error: any) {
    console.error("휴가 정보 업데이트 실패:", error);
    return {
      success: false,
      error: error.message || "휴가 정보 업데이트에 실패했습니다."
    };
  }
}

/**
 * 휴가 정보를 삭제합니다.
 */
export async function deleteLeave(id: string): Promise<ApiResponse<void>> {
  try {
    // data-layer에서 두 컬렉션 모두 확인하여 삭제 시도
    const response = await deleteLeavesDocument(id, COLLECTION_NAME);
    return response;
  } catch (error: any) {
    console.error("휴가 삭제 실패:", error);
    return {
      success: false,
      error: error.message || "휴가 삭제에 실패했습니다."
    };
  }
}

/**
 * 휴가 통계 정보를 조회합니다.
 */
export async function getLeaveStats(year: number, month?: number): Promise<ApiResponse<LeaveStats>> {
  try {
    // 필터링 시작일, 종료일 설정
    let startDate: string;
    let endDate: string;
    let monthLabel: string;
    
    if (month) {
      // 특정 월 데이터 요청
      startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      
      // 다음 달 첫째날 계산
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      endDate = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`;
      
      monthLabel = `${year}-${month.toString().padStart(2, '0')}`;
    } else {
      // 연간 데이터 요청
      startDate = `${year}-01-01`;
      endDate = `${year + 1}-01-01`;
      monthLabel = `${year}`;
    }
    
    const leavesRef = collection(db, COLLECTION_NAME);
    const q = query(
      leavesRef,
      where("startDate", ">=", startDate),
      where("startDate", "<", endDate)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return {
        success: true,
        data: {
          totalLeaves: 0,
          personnelStats: {
            soldiers: 0,
            officers: 0
          },
          typeStats: {},
          unitStats: {},
          statusStats: {}
        }
      };
    }
    
    // 통계 데이터 초기화
    const typeStats: { [key: string]: number } = {};
    const unitStats: { [key: string]: number } = {};
    const statusStats: { [key: string]: number } = {};
    let soldierCount = 0;
    let officerCount = 0;
    
    // 통계 데이터 계산
    snapshot.forEach(doc => {
      const data = doc.data();
      
      // 유형별 통계
      const leaveType = data.leaveType;
      typeStats[leaveType] = (typeStats[leaveType] || 0) + 1;
      
      // 유닛별 통계
      if (data.unit) {
        unitStats[data.unit] = (unitStats[data.unit] || 0) + 1;
      }
      
      // 인원 유형별 통계
      if (data.personType === "soldier") {
        soldierCount++;
      } else if (data.personType === "officer") {
        officerCount++;
      }
      
      // 상태별 통계
      const status = data.status;
      statusStats[status] = (statusStats[status] || 0) + 1;
    });
    
    return {
      success: true,
      data: {
        totalLeaves: snapshot.size,
        personnelStats: {
          soldiers: soldierCount,
          officers: officerCount
        },
        typeStats,
        unitStats,
        statusStats
      }
    };
  } catch (error) {
    console.error("휴가 통계 조회 오류:", error);
    return {
      success: false,
      error: "휴가 통계 정보를 불러오는 중 오류가 발생했습니다."
    };
  }
}

/**
 * 휴가가 승인되었을 때 병사나 간부의 휴가 상태 업데이트
 */
async function updatePersonLeaveStatus(leave: Leave, newStatus: string): Promise<ApiResponse<void>> {
  try {
    if (leave.personType === "soldier") {
      const soldierResponse = await getSoldier(leave.personId);
      if (soldierResponse.success && soldierResponse.data) {
        const soldier = soldierResponse.data;
        
        // 필요한 필드만 업데이트하여 undefined 오류 방지
        const updateData: any = {
          leaveStatus: newStatus === "휴가중" ? "휴가중" : "재대기"
        };
        
        // 휴가 중일 때만 currentLeaveId 설정, 재대기 상태일 때는 제거
        if (newStatus === "휴가중") {
          updateData.currentLeaveId = leave.id;
        } else {
          updateData.currentLeaveId = null;
        }
        
        await updateSoldier(leave.personId, updateData);
        
        // 승인된 휴가 알림 생성 (모바일 앱 히스토리에 표시)
        if (leave.status === "approved" && newStatus === "휴가중") {
          try {
            // 알림 컬렉션에 추가
            await addDoc(collection(db, "notifications"), {
              userId: leave.personId,
              personType: leave.personType,
              personName: leave.personName,
              personRank: leave.personRank,
              title: "휴가 승인 완료",
              message: `${leave.startDate}부터 ${leave.endDate}까지 ${leave.leaveType} ${leave.duration}일이 승인되었습니다.`,
              type: "leave_approved",
              referenceId: leave.id,
              leaveType: leave.leaveType,
              read: false,
              createdAt: serverTimestamp()
            });
            
            console.log(`휴가 승인 알림 생성: ${leave.personName}의 ${leave.leaveType} 휴가`);
          } catch (notifyError) {
            console.error("휴가 승인 알림 생성 실패:", notifyError);
            // 알림 생성 실패해도 상태 업데이트는 성공으로 처리
          }
        }
      }
    } else if (leave.personType === "officer") {
      const officerResponse = await getOfficer(leave.personId);
      if (officerResponse.success && officerResponse.data) {
        const officer = officerResponse.data;
        
        // 필요한 필드만 업데이트하여 undefined 오류 방지
        const updateData: any = {
          status: newStatus === "휴가중" ? "휴가" : "재직"
        };
        
        // 휴가 중일 때만 currentLeaveId 설정, 재직 상태일 때는 제거
        if (newStatus === "휴가중") {
          updateData.currentLeaveId = leave.id;
        } else {
          updateData.currentLeaveId = null;
        }
        
        await updateOfficer(leave.personId, updateData);
        
        // 승인된 휴가 알림 생성 (모바일 앱 히스토리에 표시)
        if (leave.status === "approved" && newStatus === "휴가중") {
          try {
            // 알림 컬렉션에 추가
            await addDoc(collection(db, "notifications"), {
              userId: leave.personId,
              personType: leave.personType,
              personName: leave.personName,
              personRank: leave.personRank,
              title: "휴가 승인 완료",
              message: `${leave.startDate}부터 ${leave.endDate}까지 ${leave.leaveType} ${leave.duration}일이 승인되었습니다.`,
              type: "leave_approved",
              referenceId: leave.id,
              leaveType: leave.leaveType,
              read: false,
              createdAt: serverTimestamp()
            });
            
            console.log(`휴가 승인 알림 생성: ${leave.personName}의 ${leave.leaveType} 휴가`);
          } catch (notifyError) {
            console.error("휴가 승인 알림 생성 실패:", notifyError);
            // 알림 생성 실패해도 상태 업데이트는 성공으로 처리
          }
        }
      }
    }
    return { success: true };
  } catch (error) {
    console.error("휴가 상태 업데이트 중 오류:", error);
    return { 
      success: false, 
      error: "휴가 상태 업데이트 중 오류가 발생했습니다."
    };
  }
}

/**
 * 휴가 시작일과 종료일 기준으로 상태를 자동으로 업데이트합니다.
 * - 시작일에 도달하면 해당 인원의 상태를 '휴가중'으로 변경
 * - 종료일 이후에는 상태를 정상 상태로 복귀
 */
export async function updateLeavesAutomatically(): Promise<ApiResponse<void>> {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD 형식
    console.log("휴가 자동 업데이트 실행, 기준일:", today);
    
    // 1. 오늘 시작되는 휴가 조회
    const startingTodayRef = collection(db, COLLECTION_NAME);
    const startingTodayQuery = query(
      startingTodayRef,
      where("status", "==", "승인"),
      where("startDate", "==", today)
    );
    
    const startingSnapshot = await getDocs(startingTodayQuery);
    console.log("오늘 시작되는 휴가:", startingSnapshot.size, "건");
    
    // 시작되는 휴가 처리
    const startingPromises: Promise<ApiResponse<void>>[] = [];
    startingSnapshot.forEach(doc => {
      const leaveData = convertDocToLeave(doc);
      console.log("휴가 시작:", leaveData.personName, leaveData.personType, leaveData.startDate, "~", leaveData.endDate);
      startingPromises.push(updatePersonLeaveStatus(leaveData, "휴가중"));
    });
    
    // 2. 어제 종료된 휴가 조회 (오늘 - 1일)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    const endingYesterdayRef = collection(db, COLLECTION_NAME);
    const endingYesterdayQuery = query(
      endingYesterdayRef,
      where("status", "==", "승인"),
      where("endDate", "==", yesterdayStr)
    );
    
    const endingSnapshot = await getDocs(endingYesterdayQuery);
    console.log("어제 종료된 휴가:", endingSnapshot.size, "건");
    
    // 종료된 휴가 처리
    const endingPromises: Promise<ApiResponse<void>>[] = [];
    endingSnapshot.forEach(doc => {
      const leaveData = convertDocToLeave(doc);
      console.log("휴가 종료:", leaveData.personName, leaveData.personType, leaveData.startDate, "~", leaveData.endDate);
      
      const returnStatus = leaveData.personType === "soldier" ? "재대기" : "재직";
      endingPromises.push(updatePersonLeaveStatus(leaveData, returnStatus));
    });
    
    // 모든 업데이트 작업 완료 대기
    await Promise.all([...startingPromises, ...endingPromises]);
    
    console.log("휴가 자동 업데이트 완료");
    return {
      success: true
    };
  } catch (error) {
    console.error("휴가 자동 업데이트 오류:", error);
    return {
      success: false,
      error: "휴가 상태 자동 업데이트 중 오류가 발생했습니다."
    };
  }
} 