import { NextResponse } from 'next/server';
import { Timestamp, Transaction } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';
import admin, { db } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    // 요청 본문 파싱
    const body = await request.json();
    
    const { 
      personType, 
      personId, 
      personName,
      personRank,
      leaveTypeName, 
      days, 
      reason = "정기 부여", 
      grantedAt 
    } = body;
    
    // 필수 파라미터 검증
    if (!personId || !personType || !leaveTypeName || !days || days < 1) {
      return NextResponse.json(
        { success: false, error: "필수 항목이 누락되었습니다." },
        { status: 400 }
      );
    }
    
    try {
      // 부여 날짜 생성 (입력값 또는 현재 날짜)
      const currentDate = new Date(grantedAt || new Date());
      
      // 동일한 날짜에 동일한 휴가 종류가 이미 부여되었는지 확인
      const existingGrantRef = db.collection("schedules");
      const existingGrantQuery = existingGrantRef
        .where("userId", "==", personId)
        .where("type", "==", "grantedLeave")
        .where("leaveType", "==", leaveTypeName);
      
      const existingGrants = await existingGrantQuery.get();
      
      // 동일 날짜 중복 부여 확인
      let isDuplicate = false;
      existingGrants.forEach(doc => {
        const data = doc.data();
        const grantDate = data.grantedAt?.toDate ? data.grantedAt.toDate() : null;
        
        if (grantDate) {
          const existingGrantDate = grantDate.toISOString().split('T')[0];
          const newGrantDate = currentDate.toISOString().split('T')[0];
          
          // 동일 날짜에 동일 종류 부여 확인
          if (existingGrantDate === newGrantDate) {
            isDuplicate = true;
          }
        }
      });
      
      if (isDuplicate) {
        return NextResponse.json(
          { success: false, error: "동일한 날짜에 이미 같은 종류의 휴가가 부여되었습니다." },
          { status: 400 }
        );
      }
      
      // Firestore에서 필요한 정보 조회
      const userRef = db.collection('userLeaves').doc(personId);
      const userDoc = await userRef.get();
      
      // 트랜잭션으로 처리
      await db.runTransaction(async (transaction: Transaction) => {
        // 사용자 휴가 데이터 가져오기 또는 생성
        let leaveTypes: any[] = [];
        let updatedLeaveTypes: any[] = [];
        
        if (userDoc.exists) {
          // 기존 데이터가 있는 경우
          const userData = userDoc.data() || {};
          leaveTypes = userData.leaveTypes || [];
          
          // 동일한 휴가 종류가 있는지 확인
          const existingLeaveTypeIndex = leaveTypes.findIndex((lt: any) => lt.name === leaveTypeName);
          
          if (existingLeaveTypeIndex >= 0) {
            // 기존 휴가 종류에 일수 추가
            updatedLeaveTypes = [...leaveTypes];
            updatedLeaveTypes[existingLeaveTypeIndex] = {
              ...updatedLeaveTypes[existingLeaveTypeIndex],
              days: updatedLeaveTypes[existingLeaveTypeIndex].days + days,
              remainingDays: updatedLeaveTypes[existingLeaveTypeIndex].remainingDays + days,
              updatedAt: Timestamp.now()
            };
          } else {
            // 새 휴가 종류 추가
            const newLeaveType = {
              id: uuidv4(),
              name: leaveTypeName,
              days: days,
              remainingDays: days,
              isDefault: false,
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now()
            };
            updatedLeaveTypes = [...leaveTypes, newLeaveType];
          }
        } else {
          // 새 데이터 생성
          const newLeaveType = {
            id: uuidv4(),
            name: leaveTypeName,
            days: days,
            remainingDays: days,
            isDefault: false,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          };
          updatedLeaveTypes = [newLeaveType];
        }
        
        // 휴가 데이터 업데이트
        transaction.set(userRef, {
          userId: personId,
          personType, // 인원 구분 추가
          personName, // 인원 이름 추가
          personRank, // 인원 계급 추가
          leaveTypes: updatedLeaveTypes,
          updatedAt: Timestamp.now()
        }, { merge: true });
        
        // 휴가 부여 이력 생성
        const grantRef = db.collection("schedules").doc();
        const grantId = grantRef.id;
        transaction.set(grantRef, {
          id: grantId,
          userId: personId,
          personName: personName || "이름 없음",
          personRank: personRank || "계급 미상",
          personType: personType,
          type: "grantedLeave",
          leaveType: leaveTypeName,
          leaveTypes: [{ id: uuidv4(), name: leaveTypeName, days: days }],
          days: days,
          description: reason || "정기 부여",
          reason: reason || "정기 부여",
          date: currentDate,
          grantedAt: currentDate,
          createdAt: Timestamp.now(),
          status: "승인"
        });
      });
      
      console.log(`휴가 부여 성공: ${personName}(${personRank})에게 ${leaveTypeName} ${days}일`);
      
      return NextResponse.json({
        success: true, 
        message: "휴가가 성공적으로 부여되었습니다."
      });
    } catch (error: any) {
      console.error("휴가 부여 중 오류:", error);
      return NextResponse.json(
        { success: false, error: error.message || "휴가 부여 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }
    
  } catch (error: any) {
    console.error("휴가 부여 처리 오류:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "휴가 부여 처리 중 오류가 발생했습니다." 
      },
      { status: 500 }
    );
  }
}

// 휴가 부여 내역 가져오기
export async function GET() {
  try {
    // Firebase에서 휴가 부여 내역 가져오기
    const leaveGrantsRef = db.collection("schedules");
    const query = leaveGrantsRef
      .where("type", "==", "grantedLeave")
      .orderBy("grantedAt", "desc")
      .limit(50);
      
    const snapshot = await query.get();
    
    const grants: any[] = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      grants.push({
        id: doc.id,
        personId: data.userId,
        personName: data.personName || "이름 없음",
        personRank: data.personRank || "계급 미상",
        personType: data.personType || "soldier",
        leaveTypeName: data.leaveType || "미지정",
        days: data.days || 0,
        reason: data.reason || "",
        grantedAt: data.grantedAt?.toDate ? data.grantedAt.toDate().toISOString() : new Date().toISOString(),
        grantedBy: data.grantedBy || "",
        grantedByName: data.grantedByName || ""
      });
    });
    
    return NextResponse.json({
      success: true,
      grantedLeaves: grants
    });
  } catch (error: any) {
    console.error("휴가 부여 내역 조회 오류:", error);
    return NextResponse.json(
      { success: false, error: error.message || "휴가 부여 내역 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
} 