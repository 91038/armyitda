/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onCall, HttpsError} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { Timestamp } = require("firebase-admin/firestore");
const { v4: uuidv4 } = require("uuid");

admin.initializeApp();
const db = admin.firestore();

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

// --- 사용자 일정 정보 조회 (ScheduleScreen용) ---
exports.getUserScheduleInfo = onCall({ region: 'asia-northeast3' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
  }
  const userId = request.auth.uid;

  try {
    // 1. 사용자 정보 및 총 부여 휴가 가져오기 (users 컬렉션 예시)
    const userDocRef = db.collection("users").doc(userId);
    const userDoc = await userDocRef.get();
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "User data not found.");
    }
    const userData = userDoc.data();
    // TODO: totalLeaveGranted 계산 로직 확인 및 수정 (예: 정책 기반 또는 DB 값)
    const totalLeaveGranted = userData.totalLeaveGranted || 27; // 임시: 연가 24 + 신병 3 가정

    // 2. 사용한 휴가 일수 계산 (schedules 컬렉션에서 type='leave', status='approved' 예시)
    const usedLeaveSnapshot = await db.collection("schedules")
      .where("userId", "==", userId)
      .where("type", "==", "leave") // 'usedLeave' 타입 사용 시 변경
      .where("status", "==", "approved")
      .get();
    let usedLeaveDays = 0;
    usedLeaveSnapshot.forEach(doc => {
      usedLeaveDays += doc.data().days || 0;
    });

    const remainingLeave = totalLeaveGranted - usedLeaveDays;

    // 3. 다가오는 일정 조회 (예: 오늘부터 30일)
    const today = new Date();
    // 시간을 00:00:00 으로 설정하여 오늘 시작된 일정도 포함
    today.setHours(0, 0, 0, 0);
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + 30);

    const upcomingEventsSnapshot = await db.collection("schedules")
      .where("userId", "==", userId)
      // 시작일이 오늘 이후 이거나, 종료일이 오늘 이후인 경우 조회
      // Firestore는 OR 쿼리가 제한적이므로 클라이언트에서 추가 필터링이 필요할 수 있음
      // 또는 데이터 모델 변경 (예: 활성 일정 플래그)
      .where("startDate", ">=", admin.firestore.Timestamp.fromDate(today))
      // .where("status", "in", ["approved", "pending", "personal"]) // 개인일정 포함 여부 결정
      .orderBy("startDate", "asc")
      .get();

    const upcomingEvents = upcomingEventsSnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        startDate: doc.data().startDate.toDate().toISOString(), // ISO 문자열로 변환
        endDate: doc.data().endDate ? doc.data().endDate.toDate().toISOString() : undefined,
      }))
      // Function 결과가 너무 커지는 것을 방지하기 위해 필요한 필드만 선택하는 것이 좋음
      .filter(event => new Date(event.startDate) <= futureDate); // 종료일 기준 필터링은 클라이언트에서?

    return {
      totalLeave: totalLeaveGranted,
      usedLeave: usedLeaveDays,
      remainingLeave: remainingLeave,
      upcomingEvents: upcomingEvents,
    };

  } catch (error) {
    console.error("Error getting user schedule info:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Could not get user schedule info.", error.message);
  }
});

// --- 일정 신청 처리 (LeaveRequestScreen, MedicalRequestScreen용) ---
exports.requestScheduleEvent = onCall({ region: 'asia-northeast3' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
  }
  const userId = request.auth.uid;
  const { type, startDate, endDate, reason, title, days, reviewerName, approverName } = request.data;

  // TODO: 입력 데이터 유효성 검사 강화 (날짜 형식, 타입 종류, 필수 필드 등)
  if (!type || !startDate || !title || (type === 'leave' && !days)) {
       throw new HttpsError("invalid-argument", "Missing required schedule information.");
  }
  if (type === 'leave' && (!Number.isInteger(days) || days <= 0)) {
    throw new HttpsError("invalid-argument", "Invalid number of leave days.");
  }

  try {
    const newScheduleRef = db.collection("schedules").doc();
    await newScheduleRef.set({
      userId: userId,
      type: type, // 'leave', 'outing', 'stayOut', 'medical' 등
      title: title, // 신청 시 입력받거나 type에 따라 자동 생성
      startDate: admin.firestore.Timestamp.fromDate(new Date(startDate)),
      endDate: endDate ? admin.firestore.Timestamp.fromDate(new Date(endDate)) : null,
      days: type === 'leave' ? days : null, // 휴가(leave) 타입일 때만 일수 저장
      reason: reason || null,
      status: "pending", // 관리자 승인 필요
      requestedAt: admin.firestore.FieldValue.serverTimestamp(),
      reviewerName: reviewerName || null, // 검토자 이름 저장
      approverName: approverName || null, // 승인자 이름 저장
      // TODO: 사용자 이름, 계급 등 필요한 정보 추가
      // requesterName: request.auth.token.name || null, // request.auth 사용
    });

    // TODO: 관리자에게 알림 전송 로직 추가 (예: FCM)

    return { success: true, scheduleId: newScheduleRef.id };

  } catch (error) {
    console.error("Error requesting schedule event:", error);
    throw new HttpsError("internal", "Could not request schedule event.", error.message);
  }
});

// --- 개인 일정 추가 (AddPersonalEventScreen용) ---
exports.addPersonalScheduleEvent = onCall({ region: 'asia-northeast3' }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
    const userId = request.auth.uid;
    const { title, startDate, endDate, description } = request.data; // request.data 사용

    if (!title || !startDate) {
        throw new HttpsError("invalid-argument", "Missing required personal event information.");
    }

    try {
        const newScheduleRef = db.collection("schedules").doc();
        await newScheduleRef.set({
            userId: userId,
            type: "personal",
            title: title,
            startDate: admin.firestore.Timestamp.fromDate(new Date(startDate)),
            endDate: endDate ? admin.firestore.Timestamp.fromDate(new Date(endDate)) : null,
            description: description || null,
            status: "personal", // 개인 일정은 별도 상태 또는 즉시 approved
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return { success: true, scheduleId: newScheduleRef.id };
    } catch (error) {
        console.error("Error adding personal schedule event:", error);
        throw new HttpsError("internal", "Could not add personal event.", error.message);
    }
});


// --- 휴가 내역 조회 함수 ---
exports.getUserLeaveHistory = onCall({ region: 'asia-northeast3' }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
    const userId = request.auth.uid;

    try {
        // 휴가 부여/사용 내역 조회
        const historySnapshot = await db.collection("schedules")
            .where("userId", "==", userId)
            .where("type", "in", ["grantedLeave", "leave"])
            .orderBy("createdAt", "desc")
            .get();

        const leaveHistory = [];
        
        historySnapshot.forEach(doc => {
            const data = doc.data();
            if (!data) return;
            
            // 승인된 휴가만 포함
            if (data.type === "leave" && data.status !== "approved") return;
            
            if (data.type === "grantedLeave") {
                // 휴가 부여 내역
                const leaveTypes = data.leaveTypes || [];
                leaveTypes.forEach(leaveType => {
                    leaveHistory.push({
                        id: `${doc.id}-${leaveType.id || 'unknown'}`,
                        date: data.grantedAt ? data.grantedAt.toDate().toISOString().split('T')[0] : (data.createdAt ? data.createdAt.toDate().toISOString().split('T')[0] : "날짜 없음"),
                        type: 'granted',
                        description: `${leaveType.name || '휴가'} ${leaveType.days || 0}일 부여: ${data.description || data.reason || '정기 부여'}`,
                        reason: data.reason || data.description || '정기 부여',
                        days: leaveType.days || 0,
                        leaveType: leaveType.name || '휴가'
                    });
                });
            } else if (data.type === "leave" && data.status === "approved") {
                // 휴가 사용 내역
                const leaveTypes = data.leaveTypes || [];
                if (leaveTypes.length === 0) {
                    // 레거시 데이터 처리: 이전 포맷에서는 leaveTypes가 없을 수 있음
                    leaveHistory.push({
                        id: doc.id,
                        date: data.startDate ? data.startDate.toDate().toISOString().split('T')[0] : "날짜 없음",
                        type: 'used',
                        description: data.title || "휴가 사용",
                        reason: data.reason || '',
                        days: data.duration || 1,
                        leaveType: '휴가'
                    });
                } else {
                    // 새 포맷: 각 휴가 타입별 사용량 추가
                    leaveTypes.forEach(leaveType => {
                        leaveHistory.push({
                            id: `${doc.id}-${leaveType.id || 'unknown'}`,
                            date: data.startDate ? data.startDate.toDate().toISOString().split('T')[0] : "날짜 없음",
                            type: 'used',
                            description: `${data.reason || ''} (${leaveType.name || '휴가'})`,
                            reason: data.reason || '',
                            days: leaveType.usedDays || 0,
                            leaveType: leaveType.name || '휴가'
                        });
                    });
                }
            }
        });

        // 데이터가 없는 경우에도 빈 배열 반환 (오류 발생 대신)
        return { leaveHistory };
        
    } catch (error) {
        console.error("Error getting leave history:", error);
        
        // 어떤 경우라도 빈 배열 반환 (클라이언트가 처리하기 쉽게)
        return { leaveHistory: [] };
    }
});

// --- 휴가 종류별 조회 ---
exports.getUserLeaveTypes = onCall({ region: 'asia-northeast3' }, async (request) => {
    console.log("getUserLeaveTypes 함수 호출됨");
    
    try {
        // 인증 확인
        if (!request.auth) {
            console.log("인증되지 않은 요청");
            throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
        }
        
        const userId = request.auth.uid;
        console.log(`사용자 ID: ${userId}에 대한 휴가 정보 조회 시작`);

        try {
            // 사용자의 휴가 종류별 정보 조회
            const leaveTypesRef = db.collection("userLeaves").doc(userId);
            console.log(`userLeaves/${userId} 문서 조회 시도`);
            
            const doc = await leaveTypesRef.get();
            console.log(`문서 조회 결과, 존재 여부: ${doc.exists}`);
            
            // 기본값 설정 (처음 사용시)
            if (!doc.exists) {
                console.log("휴가 데이터가 없음, 기본 데이터 생성 시작");
                
                // 사용자 정보 조회 시도
                let isNewSoldier = true; // 기본값으로 신병 가정 (데이터 없으면)
                let enrollmentDate = null; // 입대일 정보
                
                try {
                    console.log(`사용자 정보 조회 시도: users/${userId}`);
                    const userDoc = await db.collection("users").doc(userId).get();
                    
                    if (userDoc.exists) {
                        console.log("사용자 정보 조회 성공");
                        const userData = userDoc.data() || {};
                        isNewSoldier = userData.isNewSoldier !== undefined ? userData.isNewSoldier : true;
                        enrollmentDate = userData.enrollmentDate || Timestamp.now(); // 입대일 정보 가져오기
                        console.log(`사용자 isNewSoldier 값: ${isNewSoldier}, 입대일: ${enrollmentDate}`);
                    } else {
                        console.log(`사용자 정보가 없습니다(${userId}). 기본 사용자 정보를 생성합니다.`);
                        // 현재 시간을 입대일로 설정
                        enrollmentDate = Timestamp.now();
                        // 사용자 정보가 없을 경우 기본 사용자 정보 생성 (선택적)
                        try {
                            await db.collection("users").doc(userId).set({
                                id: userId,
                                name: request.auth.token.name || "알 수 없음",
                                isNewSoldier: true,
                                enrollmentDate: enrollmentDate, // 입대일 추가
                                createdAt: Timestamp.now()
                            });
                            console.log("기본 사용자 정보 생성 완료");
                        } catch (userCreateError) {
                            console.error("사용자 정보 생성 실패:", userCreateError);
                            // 사용자 생성 실패해도 계속 진행
                        }
                    }
                } catch (userError) {
                    console.error("사용자 정보 조회 중 오류:", userError);
                    // 오류 발생해도 기본 휴가 데이터는 제공
                    enrollmentDate = Timestamp.now(); // 기본값으로 현재 시간 설정
                }
                
                // 기본 휴가 타입 설정
                console.log("기본 휴가 타입 생성");
                const defaultLeaveTypes = [
                    { 
                        id: "annual", 
                        name: "연가", 
                        days: 24, 
                        remainingDays: 24, 
                        isDefault: true, 
                        createdAt: Timestamp.now() 
                    },
                    { 
                        id: "reward", 
                        name: "포상휴가", 
                        days: 0, 
                        remainingDays: 0, 
                        isDefault: true, 
                        createdAt: Timestamp.now() 
                    },
                    { 
                        id: "medical", 
                        name: "병가", 
                        days: 0, 
                        remainingDays: 0, 
                        isDefault: true, 
                        createdAt: Timestamp.now() 
                    }
                ];
                
                // 기본 데이터 저장
                try {
                    console.log("기본 휴가 데이터 저장 시도");
                    await leaveTypesRef.set({
                        userId: userId,
                        leaveTypes: defaultLeaveTypes,
                        updatedAt: Timestamp.now()
                    });
                    
                    // 입대 시 기본 연가 부여 이력 생성
                    const grantRef = db.collection("schedules").doc();
                    await grantRef.set({
                        id: grantRef.id,
                        userId: userId,
                        personType: "soldier", // 기본적으로 병사로 가정
                        type: "grantedLeave",
                        leaveType: "연가",
                        leaveTypes: [{ id: "annual", name: "연가", days: 24 }],
                        days: 24,
                        description: "입대 기본 연가 부여",
                        reason: "입대 기본 연가 부여",
                        date: enrollmentDate,
                        grantedAt: enrollmentDate,
                        createdAt: Timestamp.now(),
                        status: "승인"
                    });
                    
                    console.log(`사용자(${userId})의 기본 휴가 데이터가 생성되었습니다.`);
                    return { 
                        leaveTypes: defaultLeaveTypes,
                        message: "새 휴가 데이터가 생성되었습니다."
                    };
                } catch (saveError) {
                    console.error("휴가 데이터 저장 중 오류:", saveError);
                    // 저장 실패해도 클라이언트에 기본 데이터 반환
                    return { 
                        leaveTypes: defaultLeaveTypes,
                        error: "데이터 저장 실패 (임시 데이터 반환)"
                    };
                }
            }
            
            console.log("기존 휴가 데이터 반환");
            const leaveData = doc.data();
            
            if (!leaveData || !leaveData.leaveTypes) {
                console.error("휴가 데이터 형식 오류: leaveTypes 필드 없음");
                // 데이터 형식 오류 시 기본 데이터 반환
                const fallbackTypes = [
                    { id: "annual", name: "연가", days: 24, remainingDays: 24, isDefault: true }
                ];
                return { 
                    leaveTypes: fallbackTypes,
                    error: "데이터 형식 오류 (임시 데이터 반환)"
                };
            }
            
            return { 
                leaveTypes: leaveData.leaveTypes,
                message: "기존 휴가 데이터 조회 성공"
            };

        } catch (dbError) {
            console.error("Firestore 데이터베이스 조회 오류:", dbError);
            throw new HttpsError("internal", "데이터베이스 조회 실패", dbError.message);
        }
    } catch (error) {
        console.error("휴가 유형 조회 최종 오류:", error);
        
        // 어떤 오류가 발생해도 항상 클라이언트에 기본 데이터 제공
        const fallbackLeaveTypes = [
            { id: "annual", name: "연가", days: 24, remainingDays: 24, isDefault: true },
            { id: "reward", name: "포상휴가", days: 0, remainingDays: 0, isDefault: true }
        ];
        
        // 오류를 발생시키지 않고 기본 데이터 반환 
        return { 
            leaveTypes: fallbackLeaveTypes,
            error: error.message || "알 수 없는 오류",
            errorCode: error.code || "unknown"
        };
    }
});

// --- 휴가 부여 함수 ---
exports.grantLeave = onCall({ region: 'asia-northeast3' }, async (request) => {
    // 관리자 권한 확인
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
    
    const adminId = request.auth.uid;
    const adminDoc = await db.collection("users").doc(adminId).get();
    const adminData = adminDoc.data() || {};
    
    if (!adminData.isAdmin && !adminData.isOfficer) {
        throw new HttpsError("permission-denied", "Only admins and officers can grant leaves.");
    }
    
    const { personId, personType, leaveTypeName, days, reason } = request.data;
    
    if (!personId || !leaveTypeName || !days || days < 1) {
        throw new HttpsError("invalid-argument", "Invalid leave grant data provided.");
    }
    
    try {
        // 트랜잭션으로 처리하여 데이터 일관성 유지
        await db.runTransaction(async (transaction) => {
            // 사용자 휴가 데이터 가져오기
            const userLeavesRef = db.collection("userLeaves").doc(personId);
            const userLeavesDoc = await transaction.get(userLeavesRef);
            
            let leaveTypes = [];
            let updatedLeaveTypes = [];
            
            if (userLeavesDoc.exists) {
                // 기존 데이터가 있는 경우
                const userData = userLeavesDoc.data();
                leaveTypes = userData.leaveTypes || [];
                
                // 동일한 휴가 종류가 있는지 확인
                const existingLeaveTypeIndex = leaveTypes.findIndex(lt => lt.name === leaveTypeName);
                
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
            transaction.set(userLeavesRef, {
                userId: personId,
                leaveTypes: updatedLeaveTypes,
                updatedAt: Timestamp.now()
            }, { merge: true });
            
            // 휴가 부여 이력 생성
            const grantRef = db.collection("schedules").doc();
            transaction.set(grantRef, {
                id: grantRef.id,
                userId: personId,
                personType: personType,
                type: "grantedLeave",
                leaveType: leaveTypeName,
                days: days,
                reason: reason || "정기 부여",
                grantedBy: adminId,
                grantedAt: Timestamp.now(),
                createdAt: Timestamp.now()
            });
        });
        
        return { success: true, message: "휴가가 성공적으로 부여되었습니다." };
    } catch (error) {
        console.error("Error granting leave:", error);
        throw new HttpsError("internal", "휴가 부여 중 오류가 발생했습니다.", error.message);
    }
});

// --- 휴가 사용 (승인 시 차감) ---
exports.useLeave = onCall({ region: 'asia-northeast3' }, async (request) => {
    // 관리자 권한 확인
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
    
    const { leaveId, userId, leaveTypes } = request.data;
    
    if (!leaveId || !userId || !leaveTypes || !Array.isArray(leaveTypes) || leaveTypes.length === 0) {
        throw new HttpsError("invalid-argument", "Invalid leave usage data.");
    }
    
    try {
        // 트랜잭션으로 처리하여 데이터 일관성 유지
        await db.runTransaction(async (transaction) => {
            // 휴가 문서 확인
            const leaveRef = db.collection("schedules").doc(leaveId);
            const leaveDoc = await transaction.get(leaveRef);
            
            if (!leaveDoc.exists) {
                throw new HttpsError("not-found", "Leave record not found.");
            }
            
            const leaveData = leaveDoc.data();
            
            // 이미 처리된 휴가인지 확인
            if (leaveData.status === "approved" && leaveData.leaveUsed) {
                throw new HttpsError("already-exists", "Leave already processed.");
            }
            
            // 사용자 휴가 데이터 가져오기
            const userLeavesRef = db.collection("userLeaves").doc(userId);
            const userLeavesDoc = await transaction.get(userLeavesRef);
            
            if (!userLeavesDoc.exists) {
                throw new HttpsError("not-found", "User leave data not found.");
            }
            
            const userData = userLeavesDoc.data();
            const userLeaveTypes = userData.leaveTypes || [];
            
            // 각 휴가 종류별 처리
            const updatedLeaveTypes = [...userLeaveTypes];
            
            // 요청된 휴가 종류별 차감 계산
            for (const requestedLeave of leaveTypes) {
                const { leaveTypeId, daysUsed } = requestedLeave;
                
                const leaveTypeIndex = updatedLeaveTypes.findIndex(lt => lt.id === leaveTypeId);
                
                if (leaveTypeIndex === -1) {
                    throw new HttpsError("not-found", `Leave type with ID ${leaveTypeId} not found.`);
                }
                
                const currentLeaveType = updatedLeaveTypes[leaveTypeIndex];
                
                // 남은 휴가일수 확인
                if (currentLeaveType.remainingDays < daysUsed) {
                    throw new HttpsError("out-of-range", 
                        `Not enough days remaining for ${currentLeaveType.name}. ` +
                        `Requested: ${daysUsed}, Available: ${currentLeaveType.remainingDays}`);
                }
                
                // 휴가일수 차감
                updatedLeaveTypes[leaveTypeIndex] = {
                    ...currentLeaveType,
                    remainingDays: currentLeaveType.remainingDays - daysUsed,
                    updatedAt: Timestamp.now()
                };
            }
            
            // 휴가 데이터 업데이트
            transaction.update(userLeavesRef, {
                leaveTypes: updatedLeaveTypes,
                updatedAt: Timestamp.now()
            });
            
            // 휴가 상태 업데이트
            transaction.update(leaveRef, {
                status: "approved",
                leaveUsed: true,
                leaveUsageDetails: leaveTypes,
                approvedAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            });
        });
        
        return { success: true, message: "휴가가 승인되고 사용 처리되었습니다." };
    } catch (error) {
        console.error("Error using leave:", error);
        throw new HttpsError("internal", "휴가 사용 처리 중 오류가 발생했습니다.", error.message);
    }
});

// --- 휴가 신청 함수 ---
exports.requestLeave = onCall({ region: 'asia-northeast3' }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
    const userId = request.auth.uid;
    
    const { startDate, endDate, duration, leaveTypes, destination, contact, reason } = request.data;
    
    if (!startDate || !endDate || !duration || !leaveTypes || !Array.isArray(leaveTypes) || 
        leaveTypes.length === 0 || !destination || !contact) {
        throw new HttpsError("invalid-argument", "필수 정보가 누락되었습니다.");
    }
    
    try {
        console.log(`휴가 신청 처리 시작: userId=${userId}, 시작일=${startDate}, 종료일=${endDate}, 기간=${duration}일`);
        
        // 사용자 정보 조회
        let userName = "알 수 없음";
        let userRank = "군인";
        
        try {
            console.log(`사용자 정보 조회 시작: userId=${userId}`);
            const userDoc = await db.collection("users").doc(userId).get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                userName = userData.name || userName;
                userRank = userData.rank || userRank;
                console.log(`사용자 정보 조회 성공: ${userName}, ${userRank}`);
            } else {
                console.log(`사용자 문서가 없습니다: ${userId}. 사용자 문서를 새로 생성합니다.`);
                
                // 사용자 문서가 없는 경우 생성
                await db.collection("users").doc(userId).set({
                    id: userId,
                    name: request.auth.token.name || "사용자",
                    rank: "이병", // 기본값
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                console.log(`사용자 문서를 생성했습니다: ${userId}`);
                
                userName = request.auth.token.name || "사용자";
                userRank = "이병";
            }
        } catch (userError) {
            console.error(`사용자 정보 조회/생성 중 오류: ${userError.message}`);
            // 사용자 정보 오류가 있어도 계속 진행
        }
        
        // 휴가 정보 조회 - 사용자가 충분한 휴가를 가지고 있는지 확인
        try {
            console.log(`사용자 휴가 정보 조회: ${userId}`);
            const userLeavesDoc = await db.collection("userLeaves").doc(userId).get();
            
            if (!userLeavesDoc.exists) {
                console.log(`휴가 정보가 없습니다. 기본 휴가 정보를 생성합니다: ${userId}`);
                // 기본 휴가 정보 생성
                const defaultLeaveTypes = [
                    { 
                        id: "annual", 
                        name: "연가", 
                        days: 24, 
                        remainingDays: 24, 
                        isDefault: true, 
                        createdAt: admin.firestore.Timestamp.now() 
                    },
                    { 
                        id: "reward", 
                        name: "포상휴가", 
                        days: 0, 
                        remainingDays: 0, 
                        isDefault: true, 
                        createdAt: admin.firestore.Timestamp.now() 
                    }
                ];
                
                await db.collection("userLeaves").doc(userId).set({
                    userId: userId,
                    leaveTypes: defaultLeaveTypes,
                    updatedAt: admin.firestore.Timestamp.now()
                });
                console.log(`기본 휴가 정보 생성 완료: ${userId}`);
            } else {
                console.log(`기존 휴가 정보 확인됨: ${userId}`);
            }
        } catch (leaveError) {
            console.error(`휴가 정보 처리 중 오류: ${leaveError.message}`);
            // 오류가 있어도 계속 진행
        }
        
        // 휴가 신청 정보 생성
        const leaveRef = db.collection("schedules").doc();
        const leaveData = {
            id: leaveRef.id,
            userId: userId,
            personName: userName,
            personRank: userRank,
            personType: "soldier", // 기본값
            type: "leave",
            title: `${leaveTypes.map(l => l.name).join('+')} 신청`,
            startDate: admin.firestore.Timestamp.fromDate(new Date(startDate)),
            endDate: admin.firestore.Timestamp.fromDate(new Date(endDate)),
            duration: duration,
            destination: destination,
            contact: contact,
            reason: reason || "",
            leaveTypes: leaveTypes, // 사용할 휴가 종류 정보
            status: "pending", // 대기 상태로 시작
            createdAt: admin.firestore.Timestamp.now(),
            updatedAt: admin.firestore.Timestamp.now()
        };
        
        // 휴가 신청 정보 저장
        try {
            await leaveRef.set(leaveData);
            console.log(`휴가 신청이 등록되었습니다. ID: ${leaveRef.id}`);
            
            return { 
                success: true, 
                leaveId: leaveRef.id,
                message: "휴가 신청이 완료되었습니다." 
            };
        } catch (saveError) {
            console.error(`휴가 신청 저장 오류: ${saveError.message}`);
            throw new HttpsError("internal", "휴가 신청 저장에 실패했습니다.", saveError.message);
        }
    } catch (error) {
        console.error(`휴가 신청 중 오류: ${error.code || 'unknown'} - ${error.message}`);
        
        if (error instanceof HttpsError) {
            throw error;
        } else {
            throw new HttpsError("internal", "휴가 신청 처리 중 오류가 발생했습니다.", error.message);
        }
    }
});

// --- 전체 일정 조회 (FullScheduleScreen용) ---
exports.getUserFullSchedule = onCall({ region: 'asia-northeast3' }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
    const userId = request.auth.uid;
    // TODO: 페이지네이션 또는 날짜 범위 필터링 추가 고려 (일정 많을 경우)

    try {
        const scheduleSnapshot = await db.collection("schedules")
            .where("userId", "==", userId)
            .orderBy("startDate", "desc") // 최신 순 정렬 예시
            .limit(100) // 성능을 위해 개수 제한 (필요시 조정)
            .get();

        // 사용자 정보 조회를 위한 userId 목록 준비 (중복 제거)
        const userIds = [...new Set(scheduleSnapshot.docs.map(doc => doc.data().userId))];
        // console.log('Fetching user data for IDs:', userIds); // 디버깅 로그
        // Firestore 'in' 쿼리는 최대 30개의 비교를 지원합니다. userIds가 이보다 많으면 분할 처리 필요.
        let usersMap = new Map();
        if (userIds.length > 0) {
            // 'in' 쿼리 제약 조건(최대 30개) 확인
            const MAX_IN_FILTER_VALUES = 30;
            const userPromises = [];
            for (let i = 0; i < userIds.length; i += MAX_IN_FILTER_VALUES) {
                const chunk = userIds.slice(i, i + MAX_IN_FILTER_VALUES);
                userPromises.push(db.collection('users').where(admin.firestore.FieldPath.documentId(), 'in', chunk).get());
            }
            const userDocsSnapshots = await Promise.all(userPromises);
            userDocsSnapshots.forEach(snapshot => {
                snapshot.forEach(doc => {
                    usersMap.set(doc.id, doc.data());
                });
            });
        }
        // console.log('Users map:', usersMap); // 디버깅 로그

        // const fullSchedule = scheduleSnapshot.docs.map(doc => ({
        const fullSchedule = scheduleSnapshot.docs.map(doc => {
            const scheduleData = doc.data();
            const userData = usersMap.get(scheduleData.userId); // 맵에서 사용자 정보 조회
            // console.log(`Processing schedule ${doc.id}, User data for ${scheduleData.userId}:`, userData); // 디버깅 로그
            // 추가 로그: userData 객체 전체 내용 확인
            logger.info(`User data fetched for schedule ${doc.id} (userId: ${scheduleData.userId}):`, userData);

            return {
                id: doc.id,
                ...scheduleData,
                // Timestamp는 클라이언트에서 new Date(isoString)으로 변환
                startDate: scheduleData.startDate.toDate().toISOString(),
                endDate: scheduleData.endDate ? scheduleData.endDate.toDate().toISOString() : undefined,
                requestedAt: scheduleData.requestedAt ? scheduleData.requestedAt.toDate().toISOString() : undefined,
                processedAt: scheduleData.processedAt ? scheduleData.processedAt.toDate().toISOString() : undefined, // processedAt 추가 및 변환
                // 기타 필드도 필요에 따라 추가
                // 사용자 정보 추가
                requesterName: userData ? userData.name : undefined,
                requesterRank: userData ? userData.rank : undefined,
                requesterUnit: userData ? userData.unitName : undefined,
            };
        });

         return { fullSchedule: fullSchedule };

    } catch (error) {
        console.error("Error getting full schedule:", error);
        throw new HttpsError("internal", "Could not get full schedule.", error.message);
    }
});
