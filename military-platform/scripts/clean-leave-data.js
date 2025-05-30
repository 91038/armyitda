/**
 * 휴가 데이터 정리 스크립트
 * 
 * 이 스크립트는 다음과 같은 작업을 수행합니다:
 * 1. 중복된 휴가 부여 내역 제거
 * 2. 잘못된 휴가 일수 데이터 수정
 * 3. userLeaves와 schedules 데이터 간 정합성 확보
 * 
 * 사용법: node clean-leave-data.js
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// 서비스 계정 키 경로
const keyPath = path.resolve(__dirname, '../roka-7a8eb-firebase-adminsdk-fbsvc-811b129ff8.json');

// Firebase 서비스 계정 초기화
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(fs.readFileSync(keyPath, 'utf8'))),
    });
  } catch (error) {
    console.error('Firebase 초기화 실패:', error);
    process.exit(1);
  }
}

const db = admin.firestore();

/**
 * 중복 휴가 부여 내역 제거
 */
async function removeDuplicateGrants() {
  console.log('중복 휴가 부여 내역 검사 중...');
  
  try {
    // 휴가 부여 내역 조회
    const grantsRef = db.collection('schedules');
    const grantsSnapshot = await grantsRef.where('type', '==', 'grantedLeave').get();
    
    // 사용자별, 휴가 종류별, 날짜별 그룹화
    const grantsMap = new Map();
    const duplicates = [];
    
    grantsSnapshot.forEach(doc => {
      const data = doc.data();
      const userId = data.userId;
      const leaveType = data.leaveType;
      const grantDate = data.grantedAt?.toDate ? 
        data.grantedAt.toDate().toISOString().split('T')[0] :
        data.date?.toDate ? 
          data.date.toDate().toISOString().split('T')[0] : 
          'unknown';
      
      const key = `${userId}-${leaveType}-${grantDate}`;
      
      if (!grantsMap.has(key)) {
        grantsMap.set(key, []);
      }
      
      grantsMap.get(key).push({
        docId: doc.id,
        data: data
      });
    });
    
    // 중복 항목 확인
    grantsMap.forEach((grants, key) => {
      if (grants.length > 1) {
        console.log(`중복 발견: ${key}, ${grants.length}개 항목`);
        // 첫 번째 항목을 유지하고 나머지는 삭제 대상으로 표시
        duplicates.push(...grants.slice(1).map(g => g.docId));
      }
    });
    
    // 중복 항목 삭제
    if (duplicates.length > 0) {
      console.log(`${duplicates.length}개의 중복 항목을 삭제합니다...`);
      
      // 트랜잭션으로 삭제 처리
      const batch = db.batch();
      
      for (const docId of duplicates) {
        batch.delete(db.collection('schedules').doc(docId));
      }
      
      await batch.commit();
      console.log('중복 항목 삭제 완료');
    } else {
      console.log('중복 항목이 없습니다.');
    }
    
    return duplicates.length;
  } catch (error) {
    console.error('중복 휴가 부여 내역 제거 오류:', error);
    throw error;
  }
}

/**
 * 사용자별 휴가 잔여일수 재계산
 */
async function recalculateUserLeaves() {
  console.log('사용자별 휴가 잔여일수 재계산 중...');
  
  try {
    // 사용자 휴가 정보 조회
    const userLeavesRef = db.collection('userLeaves');
    const userLeavesSnapshot = await userLeavesRef.get();
    
    // 휴가 부여 내역 및 사용 내역 조회용 Promise 배열
    const updatePromises = [];
    
    // 각 사용자에 대한 처리
    for (const userDoc of userLeavesSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      
      // 기존 휴가 종류 목록
      const leaveTypes = userData.leaveTypes || [];
      
      // 휴가 부여 내역 조회
      const grantsSnapshot = await db.collection('schedules')
        .where('userId', '==', userId)
        .where('type', '==', 'grantedLeave')
        .get();
      
      // 사용된 휴가 내역 조회
      const usedLeavesSnapshot = await db.collection('leaves')
        .where('personId', '==', userId)
        .where('status', '==', 'approved')
        .get();
      
      // 휴가 종류별 부여일수와 사용일수 계산
      const typeToTotalDays = new Map();
      const typeToUsedDays = new Map();
      
      // 부여된 휴가 집계
      grantsSnapshot.forEach(doc => {
        const data = doc.data();
        const leaveType = data.leaveType;
        const days = data.days || 0;
        
        if (!typeToTotalDays.has(leaveType)) {
          typeToTotalDays.set(leaveType, 0);
        }
        
        typeToTotalDays.set(leaveType, typeToTotalDays.get(leaveType) + days);
      });
      
      // 사용된 휴가 집계
      usedLeavesSnapshot.forEach(doc => {
        const data = doc.data();
        const leaveType = data.leaveType;
        const duration = data.duration || 0;
        
        if (!typeToUsedDays.has(leaveType)) {
          typeToUsedDays.set(leaveType, 0);
        }
        
        typeToUsedDays.set(leaveType, typeToUsedDays.get(leaveType) + duration);
      });
      
      // 업데이트할 휴가 종류 배열 생성
      const updatedLeaveTypes = [];
      
      // 기존 및 새로 발견된 모든 휴가 종류에 대해 처리
      const allLeaveTypes = new Set([
        ...leaveTypes.map(lt => lt.name),
        ...Array.from(typeToTotalDays.keys())
      ]);
      
      allLeaveTypes.forEach(leaveTypeName => {
        // 기존 휴가 종류 정보 찾기
        const existingLeaveType = leaveTypes.find(lt => lt.name === leaveTypeName);
        
        // 부여 및 사용 일수 계산
        const totalDays = typeToTotalDays.get(leaveTypeName) || 0;
        const usedDays = typeToUsedDays.get(leaveTypeName) || 0;
        const remainingDays = Math.max(0, totalDays - usedDays);
        
        updatedLeaveTypes.push({
          id: existingLeaveType?.id || userId + '-' + leaveTypeName,
          name: leaveTypeName,
          days: totalDays,
          remainingDays: remainingDays,
          isDefault: existingLeaveType?.isDefault || false,
          createdAt: existingLeaveType?.createdAt || admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now()
        });
      });
      
      // 사용자 데이터 업데이트
      updatePromises.push(
        userLeavesRef.doc(userId).set({
          ...userData,
          leaveTypes: updatedLeaveTypes,
          updatedAt: admin.firestore.Timestamp.now()
        })
      );
      
      console.log(`사용자 ${userId} 휴가 계산: ${updatedLeaveTypes.length}개 종류`);
    }
    
    // 모든 업데이트 작업 완료 대기
    await Promise.all(updatePromises);
    
    console.log('휴가 잔여일수 재계산 완료');
    return userLeavesSnapshot.size;
  } catch (error) {
    console.error('휴가 잔여일수 재계산 오류:', error);
    throw error;
  }
}

/**
 * 메인 스크립트 실행
 */
async function main() {
  try {
    console.log('휴가 데이터 정리 스크립트 시작');
    
    // 1. 중복 휴가 부여 내역 제거
    const duplicatesRemoved = await removeDuplicateGrants();
    console.log(`중복 제거 완료: ${duplicatesRemoved}개 항목`);
    
    // 2. 사용자별 휴가 잔여일수 재계산
    const usersUpdated = await recalculateUserLeaves();
    console.log(`잔여일수 재계산 완료: ${usersUpdated}명 사용자`);
    
    console.log('휴가 데이터 정리 완료');
  } catch (error) {
    console.error('오류 발생:', error);
    process.exit(1);
  }
}

// 스크립트 실행
main(); 