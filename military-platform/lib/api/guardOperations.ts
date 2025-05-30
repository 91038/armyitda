import { db } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { 
  GuardOperationOrder, 
  GuardDutyAssignment, 
  GuardDutyStats,
  ApiResponse
} from '@/types';

const GUARD_ORDERS_COLLECTION = 'guardOperationOrders';
const GUARD_ASSIGNMENTS_COLLECTION = 'guardDutyAssignments';

// 근무 시간 계산 헬퍼 함수
const getDutyTimes = (
  shift: string, 
  date: string, 
  dayType: "평일" | "토요일" | "공휴일"
): { startTime: string; endTime: string } => {
  const dateObj = new Date(date);
  
  // 시작 시간은 항상 22:00
  let startHour = 22;
  
  // 종료 시간 설정 (다음날)
  let endHour = dayType === "평일" ? 6 : dayType === "토요일" ? 8 : 7;
  let endMinute = dayType === "평일" ? 30 : 0;
  
  // 전체 근무 시간 (분)
  const totalMinutes = (endHour * 60 + endMinute) + (24 - startHour) * 60;
  
  // 교대 시간 계산
  // 공휴일: 2시간(120분), 그 외: 1시간 40분(100분)
  const shiftDuration = dayType === "공휴일" ? 120 : 100;
  
  let shiftIndex = 0;
  switch (shift) {
    case "1번초": shiftIndex = 0; break;
    case "2번초": shiftIndex = 1; break;
    case "3번초": shiftIndex = 2; break;
    case "4번초": shiftIndex = 3; break;
    case "5번초": shiftIndex = 4; break;
    default: shiftIndex = 0;
  }
  
  // 시작 시간 계산
  const shiftStartMinutes = (startHour * 60) + (shiftIndex * shiftDuration);
  const startTimeHour = Math.floor(shiftStartMinutes / 60) % 24;
  const startTimeMinute = shiftStartMinutes % 60;
  
  // 종료 시간 계산
  const shiftEndMinutes = shiftStartMinutes + shiftDuration;
  const endTimeHour = Math.floor(shiftEndMinutes / 60) % 24;
  const endTimeMinute = shiftEndMinutes % 60;
  
  // 포맷팅
  const formatTime = (hour: number, minute: number) => 
    `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  
  return {
    startTime: formatTime(startTimeHour, startTimeMinute),
    endTime: formatTime(endTimeHour, endTimeMinute)
  };
};

/**
 * 특정 월의 경계작전 명령서 목록을 가져옵니다.
 */
export async function getGuardOperationOrders(
  year?: number, 
  month?: number
): Promise<ApiResponse<GuardOperationOrder[]>> {
  try {
    let ordersQuery = collection(db, GUARD_ORDERS_COLLECTION);
    
    if (year !== undefined && month !== undefined) {
      ordersQuery = query(
        ordersQuery,
        where('year', '==', year),
        where('month', '==', month),
        orderBy('createdAt', 'desc')
      );
    } else {
      ordersQuery = query(
        ordersQuery,
        orderBy('createdAt', 'desc')
      );
    }
    
    const snapshot = await getDocs(ordersQuery);
    const orders: GuardOperationOrder[] = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      orders.push({
        id: doc.id,
        documentNumber: data.documentNumber,
        month: data.month,
        year: data.year,
        title: data.title,
        createdBy: data.createdBy,
        approvedBy: data.approvedBy,
        status: data.status,
        dutyAssignments: data.dutyAssignments || [],
        notes: data.notes,
        createdAt: data.createdAt.toDate().toISOString(),
        updatedAt: data.updatedAt.toDate().toISOString()
      });
    });
    
    return {
      success: true,
      data: orders
    };
  } catch (error) {
    console.error("경계작전 명령서 조회 오류:", error);
    return {
      success: false,
      error: "경계작전 명령서를 불러오는 중 오류가 발생했습니다."
    };
  }
}

/**
 * 특정 경계작전 명령서의 상세 정보를 가져옵니다.
 */
export async function getGuardOperationOrder(id: string): Promise<ApiResponse<GuardOperationOrder>> {
  try {
    const orderDoc = await getDoc(doc(db, GUARD_ORDERS_COLLECTION, id));
    
    if (!orderDoc.exists()) {
      return {
        success: false,
        error: "해당 경계작전 명령서를 찾을 수 없습니다."
      };
    }
    
    const data = orderDoc.data();
    
    // 근무 배정 정보 가져오기
    const assignmentsQuery = query(
      collection(db, GUARD_ASSIGNMENTS_COLLECTION),
      where('guardOperationOrderId', '==', id),
      orderBy('date', 'asc'),
      orderBy('startTime', 'asc')
    );
    
    const assignmentsSnapshot = await getDocs(assignmentsQuery);
    const assignments: GuardDutyAssignment[] = [];
    
    assignmentsSnapshot.forEach(doc => {
      const assignmentData = doc.data();
      assignments.push({
        id: doc.id,
        soldierId: assignmentData.soldierId,
        soldierName: assignmentData.soldierName,
        soldierRank: assignmentData.soldierRank,
        unit: assignmentData.unit,
        date: assignmentData.date,
        dutyType: assignmentData.dutyType,
        shift: assignmentData.shift,
        startTime: assignmentData.startTime,
        endTime: assignmentData.endTime,
        isCompleted: assignmentData.isCompleted,
        isReplacement: assignmentData.isReplacement || false,
        originalSoldierId: assignmentData.originalSoldierId,
        replacementDate: assignmentData.replacementDate,
        createdAt: assignmentData.createdAt.toDate().toISOString(),
        updatedAt: assignmentData.updatedAt.toDate().toISOString()
      });
    });
    
    return {
      success: true,
      data: {
        id: orderDoc.id,
        documentNumber: data.documentNumber,
        month: data.month,
        year: data.year,
        title: data.title,
        createdBy: data.createdBy,
        approvedBy: data.approvedBy,
        status: data.status,
        dutyAssignments: assignments,
        notes: data.notes,
        createdAt: data.createdAt.toDate().toISOString(),
        updatedAt: data.updatedAt.toDate().toISOString()
      }
    };
  } catch (error) {
    console.error("경계작전 명령서 상세 조회 오류:", error);
    return {
      success: false,
      error: "경계작전 명령서 상세 정보를 불러오는 중 오류가 발생했습니다."
    };
  }
}

/**
 * 근무 배정 자동 생성 함수
 */
export async function generateGuardDutyAssignments(
  year: number,
  month: number,
  soldiers: { id: string; name: string; rank: string; unit: string }[],
  dayTypes: { [date: string]: "평일" | "토요일" | "공휴일" } // 날짜별 요일 타입
): Promise<ApiResponse<GuardDutyAssignment[]>> {
  try {
    if (!soldiers.length) {
      return {
        success: false,
        error: "근무 배정할 용사가 없습니다."
      };
    }
    
    const assignments: GuardDutyAssignment[] = [];
    const shifts: GuardDutyShift[] = ["1번초", "2번초", "3번초", "4번초", "5번초"];
    
    // 각 병사별 배정 현황 추적
    const soldierAssignments: {
      [soldierId: string]: {
        total: number;
        byShift: { [shift: string]: number }
      }
    } = {};
    
    // 병사별 배정 현황 초기화
    soldiers.forEach(soldier => {
      soldierAssignments[soldier.id] = {
        total: 0,
        byShift: {
          "1번초": 0,
          "2번초": 0,
          "3번초": 0,
          "4번초": 0,
          "5번초": 0
        }
      };
    });
    
    // 해당 월의 일수 계산
    const daysInMonth = new Date(year, month, 0).getDate();
    
    // 각 날짜별로 불침번 근무 생성
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      const dateObj = new Date(date);
      
      // 날짜에 해당하는 요일 타입 결정
      let dayType: "평일" | "토요일" | "공휴일" = "평일";
      if (dayTypes[date]) {
        dayType = dayTypes[date];
      } else if (dateObj.getDay() === 6) { // 토요일
        dayType = "토요일";
      } else if (dateObj.getDay() === 0) { // 일요일
        dayType = "공휴일";
      }
      
      // 각 교대별로 근무자 배정
      for (const shift of shifts) {
        // 교대별 시간 계산
        const { startTime, endTime } = getDutyTimes(shift, date, dayType);
        
        // 가장 적게 배정된 병사 선택
        let selectedSoldier = soldiers[0];
        let minTotal = Infinity;
        let minShiftCount = Infinity;
        
        // 1. 해당 교대를 가장 적게 한 병사 우선
        // 2. 전체 근무를 가장 적게 한 병사 우선
        for (const soldier of soldiers) {
          const soldierStats = soldierAssignments[soldier.id];
          const shiftCount = soldierStats.byShift[shift];
          
          if (shiftCount < minShiftCount || 
              (shiftCount === minShiftCount && soldierStats.total < minTotal)) {
            minShiftCount = shiftCount;
            minTotal = soldierStats.total;
            selectedSoldier = soldier;
          }
        }
        
        // 근무 배정 추가
        const assignment: GuardDutyAssignment = {
          id: `${date}-${shift}-${selectedSoldier.id}`,
          soldierId: selectedSoldier.id,
          soldierName: selectedSoldier.name,
          soldierRank: selectedSoldier.rank,
          unit: selectedSoldier.unit,
          date: date,
          dutyType: "불침번",
          shift: shift,
          startTime: startTime,
          endTime: endTime,
          isCompleted: false,
          isReplacement: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        assignments.push(assignment);
        
        // 병사 배정 현황 업데이트
        soldierAssignments[selectedSoldier.id].total++;
        soldierAssignments[selectedSoldier.id].byShift[shift]++;
      }
    }
    
    return {
      success: true,
      data: assignments
    };
  } catch (error) {
    console.error("근무 배정 자동 생성 오류:", error);
    return {
      success: false,
      error: "근무 배정을 자동 생성하는 중 오류가 발생했습니다."
    };
  }
}

/**
 * 새 경계작전 명령서를 생성합니다.
 */
export async function createGuardOperationOrder(
  orderData: Omit<GuardOperationOrder, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ApiResponse<string>> {
  try {
    // 문서 기본 데이터 저장
    const orderRef = await addDoc(collection(db, GUARD_ORDERS_COLLECTION), {
      documentNumber: orderData.documentNumber,
      month: orderData.month,
      year: orderData.year,
      title: orderData.title,
      createdBy: orderData.createdBy,
      approvedBy: orderData.approvedBy,
      status: orderData.status,
      notes: orderData.notes,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    // 근무 배정 데이터 저장
    const batchPromises = orderData.dutyAssignments.map(assignment =>
      addDoc(collection(db, GUARD_ASSIGNMENTS_COLLECTION), {
        guardOperationOrderId: orderRef.id,
        soldierId: assignment.soldierId,
        soldierName: assignment.soldierName,
        soldierRank: assignment.soldierRank,
        unit: assignment.unit,
        date: assignment.date,
        dutyType: assignment.dutyType,
        shift: assignment.shift,
        startTime: assignment.startTime,
        endTime: assignment.endTime,
        isCompleted: assignment.isCompleted,
        isReplacement: assignment.isReplacement,
        originalSoldierId: assignment.originalSoldierId,
        replacementDate: assignment.replacementDate,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
    );
    
    await Promise.all(batchPromises);
    
    return {
      success: true,
      data: orderRef.id
    };
  } catch (error) {
    console.error("경계작전 명령서 생성 오류:", error);
    return {
      success: false,
      error: "경계작전 명령서를 생성하는 중 오류가 발생했습니다."
    };
  }
}

/**
 * 경계작전 명령서를 수정합니다.
 */
export async function updateGuardOperationOrder(
  id: string, 
  updateData: Partial<Omit<GuardOperationOrder, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<ApiResponse<void>> {
  try {
    const orderRef = doc(db, GUARD_ORDERS_COLLECTION, id);
    
    // 기본 문서 정보 업데이트
    const updateFields: any = {
      ...updateData,
      updatedAt: serverTimestamp()
    };
    
    // dutyAssignments는 별도로 처리하므로 제외
    delete updateFields.dutyAssignments;
    
    await updateDoc(orderRef, updateFields);
    
    // 근무 배정 정보가 있으면 업데이트
    if (updateData.dutyAssignments && updateData.dutyAssignments.length > 0) {
      // 기존 배정 정보 삭제
      const assignmentsQuery = query(
        collection(db, GUARD_ASSIGNMENTS_COLLECTION),
        where('guardOperationOrderId', '==', id)
      );
      
      const snapshot = await getDocs(assignmentsQuery);
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      // 새 배정 정보 추가
      const createPromises = updateData.dutyAssignments.map(assignment =>
        addDoc(collection(db, GUARD_ASSIGNMENTS_COLLECTION), {
          guardOperationOrderId: id,
          soldierId: assignment.soldierId,
          soldierName: assignment.soldierName,
          soldierRank: assignment.soldierRank,
          unit: assignment.unit,
          date: assignment.date,
          dutyType: assignment.dutyType,
          shift: assignment.shift,
          startTime: assignment.startTime,
          endTime: assignment.endTime,
          isCompleted: assignment.isCompleted,
          isReplacement: assignment.isReplacement,
          originalSoldierId: assignment.originalSoldierId,
          replacementDate: assignment.replacementDate,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        })
      );
      
      await Promise.all(createPromises);
    }
    
    return {
      success: true
    };
  } catch (error) {
    console.error("경계작전 명령서 수정 오류:", error);
    return {
      success: false,
      error: "경계작전 명령서를 수정하는 중 오류가 발생했습니다."
    };
  }
}

/**
 * 근무 교대를 처리합니다.
 */
export async function switchGuardDuty(
  orderDocId: string,
  assignment1Id: string, 
  assignment2Id: string
): Promise<ApiResponse<void>> {
  try {
    // 두 배정 정보 가져오기
    const assignment1Doc = await getDoc(doc(db, GUARD_ASSIGNMENTS_COLLECTION, assignment1Id));
    const assignment2Doc = await getDoc(doc(db, GUARD_ASSIGNMENTS_COLLECTION, assignment2Id));
    
    if (!assignment1Doc.exists() || !assignment2Doc.exists()) {
      return {
        success: false,
        error: "근무 배정 정보를 찾을 수 없습니다."
      };
    }
    
    const assignment1 = assignment1Doc.data();
    const assignment2 = assignment2Doc.data();
    
    // 교대 처리 - 병사 정보 교환
    await updateDoc(doc(db, GUARD_ASSIGNMENTS_COLLECTION, assignment1Id), {
      soldierId: assignment2.soldierId,
      soldierName: assignment2.soldierName,
      soldierRank: assignment2.soldierRank,
      unit: assignment2.unit,
      isReplacement: true,
      originalSoldierId: assignment1.soldierId,
      replacementDate: new Date().toISOString(),
      updatedAt: serverTimestamp()
    });
    
    await updateDoc(doc(db, GUARD_ASSIGNMENTS_COLLECTION, assignment2Id), {
      soldierId: assignment1.soldierId,
      soldierName: assignment1.soldierName,
      soldierRank: assignment1.soldierRank,
      unit: assignment1.unit,
      isReplacement: true,
      originalSoldierId: assignment2.soldierId,
      replacementDate: new Date().toISOString(),
      updatedAt: serverTimestamp()
    });
    
    return {
      success: true
    };
  } catch (error) {
    console.error("근무 교대 처리 오류:", error);
    return {
      success: false,
      error: "근무 교대를 처리하는 중 오류가 발생했습니다."
    };
  }
}

/**
 * 병사별 근무 통계를 가져옵니다.
 */
export async function getGuardDutyStats(
  year: number,
  month: number
): Promise<ApiResponse<GuardDutyStats[]>> {
  try {
    // 해당 월의 모든 경계작전 명령서 ID 가져오기
    const ordersQuery = query(
      collection(db, GUARD_ORDERS_COLLECTION),
      where('year', '==', year),
      where('month', '==', month)
    );
    
    const ordersSnapshot = await getDocs(ordersQuery);
    const orderIds = ordersSnapshot.docs.map(doc => doc.id);
    
    if (orderIds.length === 0) {
      return {
        success: true,
        data: []
      };
    }
    
    // 해당 명령서들의 모든 근무 배정 가져오기
    const assignments: any[] = [];
    
    for (const orderId of orderIds) {
      const assignmentsQuery = query(
        collection(db, GUARD_ASSIGNMENTS_COLLECTION),
        where('guardOperationOrderId', '==', orderId)
      );
      
      const snapshot = await getDocs(assignmentsQuery);
      snapshot.forEach(doc => {
        assignments.push(doc.data());
      });
    }
    
    // 병사별 통계 계산
    const statsBySoldier: {[soldierId: string]: GuardDutyStats} = {};
    
    assignments.forEach(assignment => {
      const soldierId = assignment.soldierId;
      
      if (!statsBySoldier[soldierId]) {
        statsBySoldier[soldierId] = {
          soldierId,
          soldierName: assignment.soldierName,
          soldierRank: assignment.soldierRank,
          totalDuties: 0,
          dutyByType: {
            불침번: 0,
            CCTV: 0
          },
          dutyByShift: {
            "1번초": 0,
            "2번초": 0,
            "3번초": 0,
            "4번초": 0,
            "5번초": 0
          }
        };
      }
      
      statsBySoldier[soldierId].totalDuties++;
      statsBySoldier[soldierId].dutyByType[assignment.dutyType]++;
      statsBySoldier[soldierId].dutyByShift[assignment.shift]++;
    });
    
    return {
      success: true,
      data: Object.values(statsBySoldier)
    };
  } catch (error) {
    console.error("근무 통계 조회 오류:", error);
    return {
      success: false,
      error: "근무 통계를 조회하는 중 오류가 발생했습니다."
    };
  }
} 