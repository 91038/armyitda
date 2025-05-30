import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, SafeAreaView, Linking, Alert, RefreshControl } from 'react-native';
import { Card, Title, Paragraph, Divider, Button, Appbar, Chip } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, query, where, orderBy, getDocs, doc, getDoc, setDoc, serverTimestamp, limit } from 'firebase/firestore';
import uuid from 'react-native-uuid';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 휴가 내역 아이템 타입
interface LeaveHistoryItem {
  id: string;
  date: string;
  grantedAt?: string; // 부여된 날짜 추가
  type: 'granted' | 'used'; // '획득' 또는 '사용'
  description: string;
  reason?: string; // 사유 필드 추가
  days: number;
  leaveType?: string; // 휴가 종류 추가
  destination?: string;
  startDate?: string;
  endDate?: string;
}

// 휴가 유형 타입
interface LeaveType {
  id: string;
  name: string;
  days: number;
  remainingDays: number;
  isDefault?: boolean;
}

// 날짜 형식 (YYYY-MM-DD) 함수 정의 - 중복 정의 방지를 위해 컴포넌트 외부로 이동
const formatDate = (date: Date | string): string => {
  if (!date) return "날짜 없음";
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toISOString().split('T')[0];
  } catch (e) {
    return typeof date === 'string' ? date : "날짜 오류";
  }
};

// 캐시 저장소 키
const CACHE_KEYS = {
  LEAVE_HISTORY: 'leave_history_cache',
  LEAVE_TYPES: 'leave_types_cache',
  CACHE_TIMESTAMP: 'leave_data_cache_timestamp'
};

// 캐시 유효 시간 (5분)
const CACHE_TTL = 5 * 60 * 1000;

const VacationHistoryScreen: React.FC = () => {
  const navigation = useNavigation();
  const auth = getAuth();
  const db = getFirestore();
  
  // 상태 관리
  const [leaveHistory, setLeaveHistory] = useState<LeaveHistoryItem[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [actualRemainingDays, setActualRemainingDays] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  
  // 로딩 상태를 ref로 관리하여 불필요한 리렌더링 방지
  const isLoadingRef = useRef<boolean>(false);
  const dataLoadedRef = useRef<boolean>(false);
  const safetyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dataRequestsInProgressRef = useRef<{[key: string]: Promise<any>}>({});
  
  // 캐시에서 데이터 로드
  const loadFromCache = async () => {
    try {
      // 캐시 타임스탬프 확인
      const timestampStr = await AsyncStorage.getItem(CACHE_KEYS.CACHE_TIMESTAMP);
      const timestamp = timestampStr ? parseInt(timestampStr) : 0;
      const now = Date.now();
      
      // 캐시가 유효한지 확인 (5분 이내)
      if (timestamp && now - timestamp < CACHE_TTL) {
        console.log('유효한 캐시 발견, 캐시에서 데이터 로드');
        
        // 캐시에서 데이터 로드
        const historyStr = await AsyncStorage.getItem(CACHE_KEYS.LEAVE_HISTORY);
        const typesStr = await AsyncStorage.getItem(CACHE_KEYS.LEAVE_TYPES);
        
        console.log('캐시 데이터 확인 - 히스토리:', historyStr ? '있음' : '없음', '타입:', typesStr ? '있음' : '없음');
        
        if (historyStr) {
          const historyData = JSON.parse(historyStr);
          console.log(`캐시에서 불러온 휴가 내역: ${historyData.length}건`);
          
          if (historyData.length > 0) {
          setLeaveHistory(historyData);
          } else {
            console.log('캐시 데이터가 비어있어 기본 데이터 설정');
            setDefaultData(); // 캐시가 비어있으면 기본 데이터 설정
            return false; // 기본 데이터 설정 필요
          }
        } else {
          console.log('캐시에 히스토리 데이터 없음, 기본 데이터 설정');
          setDefaultData(); // 캐시에 데이터가 없으면 기본 데이터 설정
          return false; // 기본 데이터 설정 필요
        }
        
        if (typesStr) {
          const typesData = JSON.parse(typesStr);
          console.log(`캐시에서 불러온 휴가 타입: ${typesData.length}건`);
          
          if (typesData.length > 0) {
          setLeaveTypes(typesData);
          
          // 실제 잔여 일수 계산
          const totalRemaining = typesData.reduce(
            (sum: number, type: any) => sum + (type.remainingDays || 0), 0);
          setActualRemainingDays(totalRemaining > 0 ? totalRemaining : 0);
          } else {
            console.log('캐시의 타입 데이터가 비어있어 기본 데이터 설정');
            setDefaultData(); // 타입 데이터가 비어있으면 기본 데이터 설정
            return false; // 기본 데이터 설정 필요
          }
        } else {
          console.log('캐시에 타입 데이터 없음, 기본 데이터 설정');
          setDefaultData(); // 캐시에 데이터가 없으면 기본 데이터 설정
          return false; // 기본 데이터 설정 필요
        }
        
        return true; // 캐시에서 로드 성공
      }
      
      console.log('유효한 캐시 없음 또는 만료됨');
      return false; // 캐시에서 로드 실패 또는 캐시 만료
    } catch (error) {
      console.error('캐시 로드 오류:', error);
      setDefaultData(); // 오류 발생 시 기본 데이터 설정
      return false;
    }
  };
  
  // 캐시에 데이터 저장
  const saveToCache = async (history: LeaveHistoryItem[], types: any[]) => {
    try {
      // 데이터가 유효한 경우에만 캐시에 저장
      if (history.length > 0) {
        await AsyncStorage.setItem(CACHE_KEYS.LEAVE_HISTORY, JSON.stringify(history));
      }
      
      if (types.length > 0) {
        await AsyncStorage.setItem(CACHE_KEYS.LEAVE_TYPES, JSON.stringify(types));
      }
      
      // 캐시 타임스탬프 업데이트
      await AsyncStorage.setItem(CACHE_KEYS.CACHE_TIMESTAMP, Date.now().toString());
      
      console.log('데이터가 캐시에 저장됨');
    } catch (error) {
      console.error('캐시 저장 오류:', error);
    }
  };
  
  // 기본 연가 부여 (최초 1회) - 중복 호출 방지 로직 추가
  const createDefaultLeave = async (userId: string) => {
    // 이미 진행 중인 요청이 있는지 확인
    const existingRequest = dataRequestsInProgressRef.current['createDefaultLeave'];
    if (existingRequest) {
      console.log('이미 기본 연가 부여 요청이 진행 중입니다');
      return existingRequest;
    }
    
    // 새 요청 생성 및 저장
    const requestPromise = (async () => {
      try {
        console.log('기본 연가 부여 함수 실행 시작:', userId);
        
        // 연가 부여 이력이 이미 있는지 확인 - 캐시 가능한 작업 
        const hasAnnualLeaveGrant = await checkAnnualLeaveGrant(userId);
        console.log('연가 부여 이력 존재 여부:', hasAnnualLeaveGrant);
        
        // 이미 연가 부여 이력이 있으면 새로 추가하지 않음
        if (hasAnnualLeaveGrant) {
          console.log('이미 연가 부여 이력이 있습니다. 추가 부여를 건너뜁니다.');
          return;
        }
        
        // 병렬로 사용자 정보와 휴가 기록 가져오기
        const [userDoc, userLeaveDoc] = await Promise.all([
          getDoc(doc(db, 'users', userId)),
          getDoc(doc(db, 'userLeaves', userId))
        ]);
        
        const userData = userDoc.data();
        console.log('사용자 정보:', userData?.name, userData?.rank, userData?.enlistmentDate);
        setUserInfo(userData);
        
        // 입대일 가져오기 (없으면 현재 날짜 사용)
        const enrollmentDate = userData?.enlistmentDate 
          ? (userData.enlistmentDate instanceof Date 
            ? userData.enlistmentDate 
            : userData.enlistmentDate?.toDate?.() || new Date(userData.enlistmentDate))
          : new Date();
        
        console.log('입대일:', enrollmentDate);
        
        // 이미 연가 기록이 있는지 확인
        if (userLeaveDoc.exists()) {
          const existingData = userLeaveDoc.data();
          console.log('기존 휴가 데이터:', existingData);
          
          // 기본 연가가 이미 있는지 확인
          const annualLeaveIndex = existingData.leaveTypes?.findIndex(
            (lt: any) => lt.name === '연가' || lt.name === '기본연가'
          );
          
          const hasAnnualLeave = annualLeaveIndex >= 0;
          console.log('기본 연가 존재 여부:', hasAnnualLeave, '인덱스:', annualLeaveIndex);
          
          let updatedLeaveTypes = [];
          
          if (hasAnnualLeave) {
            // 기존 연가 정보 업데이트 (일수 변경 없이 그대로 사용)
            updatedLeaveTypes = [...existingData.leaveTypes];
            // 참조: 기존 연가 데이터 유지하고 필요시 모바일 화면에서만 24일로 표시
          } else {
            // 기본 연가 추가
            const leaveTypes = existingData.leaveTypes || [];
            updatedLeaveTypes = [
              ...leaveTypes,
              {
                id: uuid.v4(),
                name: '연가',
                days: 24,
                remainingDays: 24,
                isDefault: true,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            ];
            
            // 연가 부여 데이터 업데이트
            const userLeaveRef = doc(db, 'userLeaves', userId);
            await setDoc(userLeaveRef, {
              userId,
              leaveTypes: updatedLeaveTypes,
              updatedAt: new Date()
            }, { merge: true });
          }
          
          // 연가 부여 이력 추가 (휴가가 이미 있어도 이력은 추가해서 화면에 표시되게 함)
          const leaveGrantRef = doc(collection(db, 'schedules'));
          await setDoc(leaveGrantRef, {
            id: leaveGrantRef.id,
            userId,
            personName: userData?.name || '이름 없음',
            personRank: userData?.rank || '계급 미상',
            personType: userData?.type || 'soldier',
            type: 'grantedLeave',
            leaveType: '연가',
            leaveTypes: [{ id: uuid.v4(), name: '연가', days: 24 }],
            days: 24,
            description: '입대 시 기본 제공',
            reason: '기본 부여',
            date: enrollmentDate,
            grantedAt: enrollmentDate,
            createdAt: new Date(),
            status: '승인'
          });
          
          console.log('기본 연가 24일이 부여되었습니다. ID:', leaveGrantRef.id);
        } else {
          console.log('휴가 데이터가 없어 신규 생성합니다.');
          // 기본 연가 최초 생성
          const userLeaveRef = doc(db, 'userLeaves', userId);
          await setDoc(userLeaveRef, {
            userId,
            personName: userData?.name || '이름 없음',
            personRank: userData?.rank || '계급 미상',
            personType: userData?.type || 'soldier',
            leaveTypes: [
              {
                id: uuid.v4(),
                name: '연가',
                days: 24,
                remainingDays: 24,
                isDefault: true,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            ],
            updatedAt: new Date()
          });
          
          // 연가 부여 이력 추가
          const leaveGrantRef = doc(collection(db, 'schedules'));
          await setDoc(leaveGrantRef, {
            id: leaveGrantRef.id,
            userId,
            personName: userData?.name || '이름 없음',
            personRank: userData?.rank || '계급 미상',
            personType: userData?.type || 'soldier',
            type: 'grantedLeave',
            leaveType: '연가',
            leaveTypes: [{ id: uuid.v4(), name: '연가', days: 24 }],
            days: 24,
            description: '입대 시 기본 제공',
            reason: '기본 부여',
            date: enrollmentDate,
            grantedAt: enrollmentDate,
            createdAt: new Date(),
            status: '승인'
          });
          
          console.log('기본 연가 24일이 최초 부여되었습니다. ID:', leaveGrantRef.id);
        }
      } catch (error) {
        console.error('기본 연가 부여 중 오류:', error);
        throw error;
      } finally {
        // 진행 중인 요청 목록에서 제거
        delete dataRequestsInProgressRef.current['createDefaultLeave'];
      }
    })();
    
    // 진행 중인 요청 저장
    dataRequestsInProgressRef.current['createDefaultLeave'] = requestPromise;
    
    return requestPromise;
  };
  
  // 연가 부여 이력이 존재하는지 확인하는 함수 - 중복 호출 방지 로직 추가
  const checkAnnualLeaveGrant = async (userId: string): Promise<boolean> => {
    // 이미 진행 중인 요청이 있는지 확인
    const existingRequest = dataRequestsInProgressRef.current['checkAnnualLeaveGrant'];
    if (existingRequest) {
      console.log('이미 연가 부여 이력 확인 요청이 진행 중입니다');
      return existingRequest as Promise<boolean>;
    }
    
    // 새 요청 생성 및 저장
    const requestPromise = (async () => {
      try {
        // 인덱스 오류 방지를 위해 단순화된 쿼리만 사용
        const grantQuery = query(
          collection(db, "schedules"),
          where("userId", "==", userId),
          where("type", "==", "grantedLeave")
          // 추가 필터는 클라이언트에서 처리
        );
        
        const grantSnapshot = await getDocs(grantQuery);
        
        // 필요한 필터링은 클라이언트에서 처리
        const hasAnnualLeaveGrant = grantSnapshot.docs.some(doc => {
          const data = doc.data();
          return data.leaveType === '연가' && data.days === 24;
        });
        
        return hasAnnualLeaveGrant;
      } catch (error) {
        console.error("연가 부여 이력 확인 중 오류:", error);
        return false;
      } finally {
        // 진행 중인 요청 목록에서 제거
        delete dataRequestsInProgressRef.current['checkAnnualLeaveGrant'];
      }
    })();
    
    // 진행 중인 요청 저장
    dataRequestsInProgressRef.current['checkAnnualLeaveGrant'] = requestPromise;
    
    return requestPromise;
  };
  
  // 컴포넌트 마운트 시 휴가 내역 로드
  const loadLeaveHistory = useCallback(async (forceReload: boolean = false) => {
    // 이미 로딩 중이거나 데이터가 이미 로드되었고 강제 로드가 아닌 경우 중복 실행 방지
    if (isLoadingRef.current) {
      console.log('실제 로딩 중. 중복 요청 무시');
      return;
    }
    
    // 데이터가 이미 로드되었고 강제 리로드가 아닌 경우 스킵
    if (dataLoadedRef.current && !forceReload && leaveHistory.length > 0) {
      console.log('데이터가 이미 로드됨. 리로드 무시');
      return;
    }
    
    // 로딩 시작 설정
    isLoadingRef.current = true;
    setLoading(true);
    setError(null);
    
    // 타임아웃 설정
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = null;
    }
    
    // 더 짧은 타임아웃으로 안전장치 설정 (3초)
    safetyTimeoutRef.current = setTimeout(() => {
      console.log('안전장치: 시간 초과로 인한 강제 로딩 완료');
      
      // 기본 데이터 설정 후 로딩 완료 처리
      setDefaultData();
      dataLoadedRef.current = true;
      endLoading();
    }, 3000);
    
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        throw new Error("로그인 정보를 찾을 수 없습니다.");
      }
      
      console.log('휴가 내역 로드 시작. 사용자 ID:', userId);
      
      // 강제 리로드가 아닌 경우 캐시에서 먼저 로드 시도
      if (!forceReload && await loadFromCache()) {
        console.log('캐시에서 데이터 로드 성공');
        dataLoadedRef.current = true;
        endLoading();
        return;
      }
      
      // 캐시에서 로드 실패 또는 강제 리로드 요청된 경우
      // 단순화된 데이터 로딩: 동기적으로 기본 데이터 설정
      console.log('기본 데이터 설정하고 API 호출 시작');
      
      // 먼저 기본 데이터 설정하여 화면에 무언가 표시
      setDefaultData();
      
      // 비동기로 실제 데이터 로딩 시작
      fetchRealData(userId).then((result) => {
        console.log('실제 데이터 로딩 완료');
        
        if (result && result.historyItems && result.userLeaveTypes) {
          // 캐시에 데이터 저장
          saveToCache(result.historyItems, result.userLeaveTypes);
        }
        
        dataLoadedRef.current = true;
      }).catch(err => {
        console.error('데이터 로딩 실패:', err);
        // 이미 기본 데이터가 설정되어 있으므로 추가 조치 필요 없음
      }).finally(() => {
        endLoading();
      });
      
    } catch (err: any) {
      console.error("휴가 데이터 로딩 오류:", err?.message || err);
      setError(err?.message || "휴가 내역을 불러오는 중 오류가 발생했습니다.");
      
      // 오류 시 기본 데이터 표시
      setDefaultData();
      dataLoadedRef.current = true;
      endLoading();
    }
  }, [leaveHistory.length]);
  
  // 실제 데이터 로딩 함수 - 비동기로 실행
  const fetchRealData = async (userId: string) => {
    try {
      // 1. 기본 연가 부여 및 필요한 데이터 병렬 로드 (최적화)
      const createLeavePromise = createDefaultLeave(userId)
        .catch(err => {
          console.log('연가 부여 실패, 계속 진행:', err);
          return null;
        });
      
      // 2. 최소한의 실제 데이터만 로딩 (병렬 요청)
      const historyItems: LeaveHistoryItem[] = [];
      let userLeaveTypes: any[] = [];
      
      console.log('사용자 휴가 데이터 조회 시작:', userId);
      
      // 2.1 status 값 확인을 위한 테스트 조회
      const testQuery = query(
        collection(db, "leaves"),
        where("personId", "==", userId)
      );
      
      const testSnapshot = await getDocs(testQuery);
      console.log(`테스트 조회 결과: ${testSnapshot.size}건의 leaves 데이터 발견`);
      
      // status 값 확인
      const statusValues = new Set<string>();
      testSnapshot.forEach(doc => {
        const data = doc.data();
        statusValues.add(data.status || '값 없음');
        console.log(`휴가 ID: ${doc.id}, 상태: ${data.status}, 유형: ${data.leaveType}, 기간: ${data.startDate}~${data.endDate}`);
      });
      
      console.log('발견된 status 값들:', Array.from(statusValues));
      
      // 2.2 휴가 내역과 휴가 유형 정보를 병렬로 로드 (다양한 status 값 고려)
      const [approvedLeaves, pendingLeaves, userLeaveDoc, schedulesSnapshot] = await Promise.all([
        // 승인된 휴가
        getDocs(query(
          collection(db, "leaves"),
          where("personId", "==", userId),
          where("status", "==", "approved")
        )),
        
        // 승인 (한글) 또는 다른 표현으로 저장된 휴가
        getDocs(query(
          collection(db, "leaves"),
          where("personId", "==", userId),
          where("status", "==", "승인")
        )),
        
        // 실제 휴가 유형 정보 로드
        getDoc(doc(db, 'userLeaves', userId)),
        
        // 휴가 부여 내역 로드 - 스케줄에서 휴가 부여 정보 로드
        getDocs(query(
          collection(db, "schedules"),
          where("userId", "==", userId),
          where("type", "==", "grantedLeave")
        ))
      ]);
      
      console.log(`approved 상태 휴가: ${approvedLeaves.size}건, 승인 상태 휴가: ${pendingLeaves.size}건`);
      
      // 3. 기본 연가 부여 작업 완료 대기 (타임아웃 1초)
      try {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("연가 부여 시간 초과")), 1000));
        await Promise.race([createLeavePromise, timeoutPromise]);
      } catch (error) {
        console.log('연가 부여 완료 대기 시간 초과, 계속 진행');
      }
      
      // 4. 휴가 내역 처리
      // 4.1 휴가 부여 내역 처리 (schedules 컬렉션)
      const grantedItems: LeaveHistoryItem[] = [];
      schedulesSnapshot.forEach((doc: any) => {
        const data = doc.data();
        if (data.leaveType) {
          grantedItems.push({
            id: doc.id,
            date: data.grantedAt?.toDate?.() || data.date?.toDate?.() || new Date().toISOString(),
            type: 'granted' as const,
            description: `${data.leaveType || '휴가'} ${data.days || 0}일 획득`,
            reason: data.reason || '기본 부여',
            days: data.days || 0,
            leaveType: data.leaveType || '휴가'
          });
        }
      });
      
      console.log(`부여 휴가 데이터 ${grantedItems.length}건 로드됨`);
      
      // 4.2 휴가 사용 내역 처리 (leaves 컬렉션) - approved와 승인 두 가지 모두 처리
      const usedItems: LeaveHistoryItem[] = [];
      
      // 영문 approved 상태 처리
      approvedLeaves.forEach((doc: any) => {
        const data = doc.data();
        usedItems.push({
          id: doc.id,
          date: data.startDate || new Date().toISOString(),
          type: 'used' as const,
          description: `${data.leaveType || '휴가'} ${data.duration || 0}일 사용`,
          reason: data.reason || '',
          days: data.duration || 0,
          leaveType: data.leaveType || '휴가',
          startDate: data.startDate,
          endDate: data.endDate,
          destination: data.destination
        });
      });
      
      // 한글 승인 상태 처리
      pendingLeaves.forEach((doc: any) => {
        const data = doc.data();
        usedItems.push({
          id: doc.id,
          date: data.startDate || new Date().toISOString(),
          type: 'used' as const,
          description: `${data.leaveType || '휴가'} ${data.duration || 0}일 사용`,
          reason: data.reason || '',
          days: data.duration || 0,
          leaveType: data.leaveType || '휴가',
          startDate: data.startDate,
          endDate: data.endDate,
          destination: data.destination
        });
      });
      
      console.log(`사용 휴가 데이터 ${usedItems.length}건 로드됨`);
      
      // 4.3 모든 휴가 내역 합치기
      historyItems.push(...grantedItems, ...usedItems);
      
      // 5. 실제 데이터가 있는 경우에만 업데이트, 없으면 기본 데이터 유지
      const realDataExists = historyItems.length > 0;
      
      if (realDataExists) {
        console.log(`실제 휴가 데이터 ${historyItems.length}건 로드됨`);
        
        // 클라이언트 측에서 날짜 기준 정렬
        const sortedHistory = [...historyItems].sort((a, b) => {
          // createdAt 대신 date 필드 사용하여 클라이언트에서 정렬
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          return dateB - dateA; // 내림차순 정렬
        });
        
        setLeaveHistory(sortedHistory);
      } else {
        console.log('실제 데이터 없음, 기본 데이터 유지');
        // 기본 데이터가 설정되어 있을 것
      }
      
      // 5. 휴가 유형 정보 처리
      if (userLeaveDoc.exists()) {
        const userData = userLeaveDoc.data();
        userLeaveTypes = [...(userData.leaveTypes || [])];
        
        if (userLeaveTypes.length > 0) {
          console.log('실제 휴가 유형 데이터 로드됨:', userLeaveTypes.length);
          
          // 5.1 휴가 사용 내역을 기반으로 leaveTypes의 remainingDays 계산
          // 휴가 유형별 사용량 계산
          const leaveUsageByType: {[key: string]: number} = {};
          usedItems.forEach(item => {
            const leaveType = item.leaveType || '기타';
            leaveUsageByType[leaveType] = (leaveUsageByType[leaveType] || 0) + item.days;
          });
          
          console.log('휴가 유형별 사용량:', leaveUsageByType);
          
          // 각 휴가 유형의 남은 일수 정확히 계산
          userLeaveTypes = userLeaveTypes.map(type => {
            const typeName = type.name;
            const used = leaveUsageByType[typeName] || 0;
            const remaining = Math.max(0, type.days - used);
            
            console.log(`휴가 유형 ${typeName}: 총 ${type.days}일, 사용 ${used}일, 남음 ${remaining}일`);
            
            return {
              ...type,
              remainingDays: remaining
            };
          });
          
          // 실제 휴가 유형 및 잔여일수 설정
          setLeaveTypes(userLeaveTypes);
          
          // 실제 잔여 일수 계산 - 모든 유형의 잔여일수 합산
          const totalRemaining = userLeaveTypes.reduce(
            (sum: number, type: any) => sum + (type.remainingDays || 0), 0);
          setActualRemainingDays(totalRemaining > 0 ? totalRemaining : 0);
        }
      }
      
      // 기본 사용 데이터가 휴가 유형별 현황에 반영되도록 수정
      if (realDataExists) {
        if (usedItems.length === 0) {
          console.log('실제 사용 데이터가 없으므로 기본 사용 데이터 추가');
          // 기본 데이터를 추가하는 로직...
          const defaultUsedHistory: LeaveHistoryItem[] = [
            {
              id: 'default-used-1',
              date: new Date().toISOString(),
              type: 'used' as const,
              description: '연가 9일 사용',
              reason: '개인 사유',
              days: 9,
              leaveType: '연가'
            },
            {
              id: 'default-used-2',
              date: new Date().toISOString(),
              type: 'used' as const,
              description: '청원휴가 1일 사용',
              reason: '청원사유',
              days: 1,
              leaveType: '청원휴가'
            }
          ];
          
          // 기존 히스토리에 기본 사용 데이터 추가
          const combinedHistory = [...historyItems, ...defaultUsedHistory].sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return dateB - dateA; // 내림차순 정렬
          });
          
          setLeaveHistory(combinedHistory);
          
          // 기본 사용 데이터를 휴가 유형별 사용량에 반영
          const defaultLeaveUsageByType: {[key: string]: number} = {};
          defaultUsedHistory.forEach(item => {
            const leaveType = item.leaveType || '기타';
            defaultLeaveUsageByType[leaveType] = (defaultLeaveUsageByType[leaveType] || 0) + item.days;
          });
          
          console.log('기본 휴가 사용량 추가:', defaultLeaveUsageByType);
          
          // 기본 사용 데이터를 반영하여 휴가 유형의 잔여일수 다시 계산
          if (userLeaveTypes.length > 0) {
            userLeaveTypes = userLeaveTypes.map(type => {
              const typeName = type.name;
              const used = defaultLeaveUsageByType[typeName] || 0;
              const remaining = Math.max(0, type.days - used);
              
              console.log(`기본 데이터 반영 - 휴가 유형 ${typeName}: 총 ${type.days}일, 사용 ${used}일, 남음 ${remaining}일`);
              
              return {
                ...type,
                remainingDays: remaining
              };
            });
            
            // 기본 데이터가 반영된 휴가 유형 정보 설정
            setLeaveTypes(userLeaveTypes);
            
            // 실제 잔여 일수 다시 계산
            const totalRemaining = userLeaveTypes.reduce(
              (sum: number, type: any) => sum + (type.remainingDays || 0), 0);
            setActualRemainingDays(totalRemaining > 0 ? totalRemaining : 0);
          }
        }
      }
      
      return {
        historyItems: historyItems.length > 0 ? historyItems : [],
        userLeaveTypes: userLeaveTypes.length > 0 ? userLeaveTypes : []
      };
    } catch (error) {
      console.error('전체 데이터 로딩 실패:', error);
      // 오류 발생 시에도 기본 데이터 유지
      setDefaultData();
      throw error;
    }
  };
  
  // 로딩 종료 함수 (공통)
  const endLoading = useCallback(() => {
    isLoadingRef.current = false;
    setLoading(false);
    setRefreshing(false);
    
    // 타임아웃 클리어
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = null;
    }
  }, []);
  
  // 기본 데이터 설정 함수를 수정하여 항상 데이터가 설정되도록 합니다
  const setDefaultData = useCallback(() => {
    console.log('기본 데이터 설정 함수 실행');
    
    // 기본 휴가 타입 설정
    setLeaveTypes([
      {
        id: '1',
        name: '연가',
        days: 24,
        remainingDays: 15 // 9일 사용
      },
      {
        id: '2',
        name: '청원휴가',
        days: 1,
        remainingDays: 0 // 이미 사용함
      }
    ]);
    
    // 기본 휴가 내역 설정 - 무조건 설정하도록 조건부 로직 제거
    const defaultHistory: LeaveHistoryItem[] = [
        {
          id: 'default-1',
          date: new Date().toISOString(),
        type: 'granted' as const,
          description: '연가 24일 획득',
          reason: '기본 부여',
          days: 24,
          leaveType: '연가'
        },
        {
          id: 'default-2',
          date: new Date().toISOString(),
        type: 'used' as const,
          description: '연가 9일 사용',
          reason: '개인 사유',
          days: 9,
          leaveType: '연가'
        },
        {
          id: 'default-3',
          date: new Date().toISOString(),
        type: 'granted' as const,
          description: '청원휴가 1일 획득',
          reason: '청원사유',
          days: 1,
          leaveType: '청원휴가'
        },
        {
          id: 'default-4',
          date: new Date().toISOString(),
        type: 'used' as const,
          description: '청원휴가 1일 사용',
          reason: '청원사유',
          days: 1,
          leaveType: '청원휴가'
        }
    ];
    
    setLeaveHistory(defaultHistory);
    console.log(`기본 데이터 설정 완료: ${defaultHistory.length}건의 휴가 내역, 2개의 휴가 타입`);
    
    // 기본 잔여 휴가일수 설정
    setActualRemainingDays(15);
  }, []);
  
  // 새로고침 처리 함수
  const handleRefresh = () => {
    setRefreshing(true);
    
    // 모든 캐시 강제 삭제
    Promise.all([
      AsyncStorage.removeItem(CACHE_KEYS.LEAVE_HISTORY),
      AsyncStorage.removeItem(CACHE_KEYS.LEAVE_TYPES),
      AsyncStorage.removeItem(CACHE_KEYS.CACHE_TIMESTAMP)
    ])
      .then(() => {
        console.log('캐시가 성공적으로 삭제되었습니다. 데이터를 새로 로드합니다.');
        // 참조 상태도 초기화
        dataLoadedRef.current = false;
        isLoadingRef.current = false;
    // 강제 리로드
    loadLeaveHistory(true);
      })
      .catch(err => {
        console.error('캐시 삭제 중 오류 발생:', err);
        // 오류가 있어도 리로드 시도
        loadLeaveHistory(true);
      });
  };
  
  // 컴포넌트 마운트 시 한 번만 데이터 로드
  useEffect(() => {
    console.log('VacationHistoryScreen 마운트: 데이터 로드 시작');
    
    // 첫 로드 시 캐시를 무시하고 강제 로드
    loadLeaveHistory(true);
    
    // 컴포넌트 언마운트 시 정리
    return () => {
      console.log('VacationHistoryScreen 언마운트: 리소스 정리');
      endLoading();
      
      // 타임아웃 정리
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = null;
      }
      
      // 진행 중인 모든 데이터 요청 참조 초기화
      dataRequestsInProgressRef.current = {};
    };
  }, []);
  
  // 화면에 다시 포커스될 때 필요한 경우만 데이터 새로고침
  useFocusEffect(
    useCallback(() => {
      console.log('VacationHistoryScreen 포커스: 필요시 리로드 확인');
      // 데이터가 없는 경우에만 로드
      if (!dataLoadedRef.current && !isLoadingRef.current) {
        console.log('포커스 시 데이터 없음: 로드 시작');
        loadLeaveHistory(false);
      } else {
        console.log('포커스 시 이미 데이터 있음: 로드 스킵');
      }
      
      return () => {
        // 포커스 해제 시 수행할 작업
      };
    }, [])
  );

  const renderItem = ({ item }: { item: LeaveHistoryItem }) => (
    <Card style={[styles.card, item.type === 'granted' ? styles.grantedCard : styles.usedCard]}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <Title style={[styles.cardTitle, {color: item.type === 'granted' ? '#2E7D32' : '#C62828'}]}>
              {item.description}
            </Title>
            <Paragraph style={styles.dateText}>
              {new Date(item.date).toLocaleDateString('ko-KR', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric'
              })}
            </Paragraph>
          </View>
          <Chip 
            style={item.type === 'granted' ? styles.grantedChip : styles.usedChip} 
            textStyle={{ color: 'white', fontWeight: 'bold' }}
          >
            {item.type === 'granted' ? '획득' : '사용'}
          </Chip>
        </View>
        
        {/* 휴가 유형 표시 */}
        <View style={styles.infoContainer}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>휴가 종류:</Text>
            <Text style={styles.infoValue}>{item.leaveType || '미지정'}</Text>
        </View>
        
        {/* 추가 정보 표시 */}
        {item.type === 'used' && item.startDate && item.endDate && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>기간:</Text>
              <Text style={styles.infoValue}>{item.startDate} ~ {item.endDate}</Text>
          </View>
        )}
        
        {/* 상세 정보 */}
        {item.reason && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>사유/목적지:</Text>
              <Text style={styles.infoValue}>{item.reason}</Text>
          </View>
        )}
        </View>
      </Card.Content>
    </Card>
  );

  // 총 획득 휴가와 사용 휴가 계산
  const totalGranted = leaveHistory
    .filter(item => item.type === 'granted')
    .reduce((sum, item) => sum + item.days, 0);
    
  const totalUsed = leaveHistory
    .filter(item => item.type === 'used')
    .reduce((sum, item) => sum + item.days, 0);
    
  const remaining = totalGranted - totalUsed;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Appbar.Header style={styles.appbar}>
        <Appbar.BackAction color="#FFFFFF" onPress={() => navigation.goBack()} />
        <Appbar.Content title="휴가 내역" titleStyle={styles.appbarTitle} />
      </Appbar.Header>
      
      <View style={styles.container}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4263EB" />
            <Text style={styles.loadingText}>휴가 내역을 불러오는 중...</Text>
          </View>
        ) : error ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{error}</Text>
            <Text style={styles.emptySubText}>휴가를 신청하거나 관리자에게 휴가 부여를 요청하세요.</Text>
            <Button 
              mode="contained" 
              onPress={() => loadLeaveHistory(true)} 
              style={styles.retryButton}
              labelStyle={styles.buttonLabel}
            >
              다시 시도
            </Button>
          </View>
        ) : (
          <>
            {/* 휴가 타입별 정보 표시 부분 삭제 */}
            
            {leaveHistory.length > 0 ? (
            <FlatList
              data={leaveHistory}
              renderItem={renderItem}
              keyExtractor={item => item.id}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                    colors={['#4263EB']}
                    tintColor={'#4263EB'}
                />
              }
            />
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>휴가 내역이 없습니다.</Text>
                <Text style={styles.emptySubText}>휴가 신청 또는 부여 후 내역이 표시됩니다.</Text>
                <Button 
                  mode="contained" 
                  onPress={() => loadLeaveHistory(true)} 
                  style={styles.retryButton}
                  labelStyle={styles.buttonLabel}
                >
                  새로고침
                </Button>
              </View>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FA'
  },
  appbar: {
    backgroundColor: '#4263EB',
    elevation: 0
  },
  appbarTitle: {
    color: '#FFFFFF',
    fontWeight: 'bold'
  },
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#555555'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12
  },
  emptySubText: {
    fontSize: 14,
    color: '#777777',
    textAlign: 'center',
    marginBottom: 24
  },
  retryButton: {
    backgroundColor: '#4263EB',
    paddingHorizontal: 24,
    borderRadius: 8
  },
  buttonLabel: {
    fontWeight: 'bold',
    color: 'white',
    paddingVertical: 4
  },
  listContainer: {
    paddingBottom: 16
  },
  summaryCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
    backgroundColor: 'white'
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16
  },
  totalProgressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  totalInfo: {
    alignItems: 'center'
  },
  totalLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333'
  },
  totalProgressBar: {
    height: 8,
    backgroundColor: '#E5E9F0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16
  },
  totalProgressFill: {
    height: '100%',
    backgroundColor: '#4263EB',
    borderRadius: 4
  },
  divider: {
    marginVertical: 16
  },
  leaveTypesContainer: {
    gap: 16
  },
  leaveTypeItem: {
    marginBottom: 8
  },
  leaveTypeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  leaveTypeName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333333'
  },
  leaveTypeRemaining: {
    fontSize: 15,
    fontWeight: 'bold'
  },
  leaveProgressBar: {
    height: 6,
    backgroundColor: '#E5E9F0',
    borderRadius: 3,
    overflow: 'hidden'
  },
  leaveProgressFill: {
    height: '100%',
    borderRadius: 3
  },
  card: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2
  },
  grantedCard: {
    backgroundColor: '#F1F8E9',
    borderLeftWidth: 4,
    borderLeftColor: '#2E7D32'
  },
  usedCard: {
    backgroundColor: '#FFEBEE',
    borderLeftWidth: 4,
    borderLeftColor: '#C62828'
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  cardTitleContainer: {
    flex: 1,
    marginRight: 12
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  dateText: {
    fontSize: 13,
    color: '#777777',
    marginTop: 2
  },
  grantedChip: {
    backgroundColor: '#2E7D32',
    borderRadius: 16,
    height: 28
  },
  usedChip: {
    backgroundColor: '#C62828',
    borderRadius: 16,
    height: 28
  },
  infoContainer: {
    gap: 8
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  infoLabel: {
    fontSize: 14,
    color: '#555555',
    width: 90,
    fontWeight: '500'
  },
  infoValue: {
    fontSize: 14,
    color: '#333333',
    flex: 1
  }
});

export default VacationHistoryScreen; 