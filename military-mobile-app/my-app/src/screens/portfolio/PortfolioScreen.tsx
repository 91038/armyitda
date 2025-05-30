import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Modal, TouchableOpacity, Alert, RefreshControl, Platform } from 'react-native';
import { Text, Card, Title, Button, Divider, ProgressBar, Avatar, List, TextInput, Portal, Dialog, Paragraph, ActivityIndicator } from 'react-native-paper';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { getFirestore, collection, addDoc, query, where, orderBy, getDocs, Timestamp, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// 입대일이 유효한지 확인하는 함수를 먼저 정의
const isValidDate = (date: Date) => date instanceof Date && !isNaN(date.getTime());

const PortfolioScreen: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const auth = getAuth();
  const db = getFirestore();
  
  // 디버깅용 상태 추가 - 개발 모드에서만 사용
  const [debugInfo, setDebugInfo] = useState<string>('');
  
  // 실시간 업데이트를 위한 현재 시간 상태
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  
  // 복무 일지 상태 관리
  const [diaryEntries, setDiaryEntries] = useState<any[]>([]);
  const [diaryModalVisible, setDiaryModalVisible] = useState(false);
  const [newDiaryTitle, setNewDiaryTitle] = useState('');
  const [newDiaryContent, setNewDiaryContent] = useState('');
  const [isLoadingDiary, setIsLoadingDiary] = useState(false);

  // 획득 기술/경험 상태 관리
  const [skills, setSkills] = useState<any[]>([]);
  const [isLoadingSkills, setIsLoadingSkills] = useState(false);

  // 성취 배지 상태 관리
  const [badges, setBadges] = useState<any[]>([]);
  const [isLoadingBadges, setIsLoadingBadges] = useState(false);
  
  // 새로고침 상태 관리
  const [refreshing, setRefreshing] = useState(false);
  
  // PDF 생성 상태 관리
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [exportOptionsVisible, setExportOptionsVisible] = useState(false);
  
  // 1초마다 현재 시간 업데이트
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // 1초마다 업데이트
    
    return () => clearInterval(timer); // 컴포넌트 언마운트 시 타이머 정리
  }, []);
  
  // 사용자의 입대일 가져오기 (Redux 스토어에서)
  useEffect(() => {
    if (__DEV__) {
      console.log('Redux 사용자 정보:', user);
      console.log('입대일 정보:', user?.enlistmentDate);
      
      let debugText = '';
      if (!user) {
        debugText = '사용자 정보 없음';
      } else if (!user.enlistmentDate) {
        debugText = '입대일 정보 없음';
      } else {
        debugText = `원본 입대일: ${JSON.stringify(user.enlistmentDate)}`;
      }
      setDebugInfo(debugText);
    }
  }, [user]);
  
  // 모든 데이터 로드 함수
  const loadAllData = useCallback(async () => {
    if (!auth.currentUser?.uid) return;
    
    setIsLoadingDiary(true);
    setIsLoadingSkills(true);
    setIsLoadingBadges(true);
    
    try {
      // 복무 일지 로드
      const diaryRef = collection(db, 'diaryEntries');
      const diaryQuery = query(
        diaryRef, 
        where('userId', '==', auth.currentUser.uid),
        orderBy('createdAt', 'desc')
      );
      
      const diarySnapshot = await getDocs(diaryQuery);
      const entries = diarySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setDiaryEntries(entries);
      
      // 기술 및 경험 로드
      const skillsRef = collection(db, 'skills');
      const skillsQuery = query(
        skillsRef,
        where('userId', '==', auth.currentUser.uid),
        orderBy('awardedAt', 'desc')
      );
      
      const skillsSnapshot = await getDocs(skillsQuery);
      const skillsList = skillsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setSkills(skillsList);
      
      // 배지 로드
      const badgesRef = collection(db, 'badges');
      const badgesQuery = query(
        badgesRef,
        where('userId', '==', auth.currentUser.uid),
        orderBy('awardedAt', 'desc')
      );
      
      const badgesSnapshot = await getDocs(badgesQuery);
      const badgesList = badgesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setBadges(badgesList);
      
      console.log('모든 데이터 새로고침 완료');
    } catch (error) {
      console.error('데이터 로드 오류:', error);
      Alert.alert('오류', '데이터를 불러오는 중 문제가 발생했습니다.');
    } finally {
      setIsLoadingDiary(false);
      setIsLoadingSkills(false);
      setIsLoadingBadges(false);
      setRefreshing(false);
    }
  }, [auth.currentUser, db]);
  
  // 첫 로드 시 데이터 가져오기
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);
  
  // 당겨서 새로고침 처리
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAllData();
  }, [loadAllData]);
  
  // 복무 일지 데이터 로드 (개별 함수는 유지)
  useEffect(() => {
    const loadDiaryEntries = async () => {
      if (!auth.currentUser?.uid) return;
      
      setIsLoadingDiary(true);
      try {
        const diaryRef = collection(db, 'diaryEntries');
        const q = query(
          diaryRef, 
          where('userId', '==', auth.currentUser.uid),
          orderBy('createdAt', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        const entries = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setDiaryEntries(entries);
      } catch (error) {
        console.error('복무일지 로드 오류:', error);
      } finally {
        setIsLoadingDiary(false);
      }
    };
    
    loadDiaryEntries();
  }, [auth.currentUser]);
  
  // 획득 기술 및 경험 데이터 로드
  useEffect(() => {
    const loadSkills = async () => {
      if (!auth.currentUser?.uid) return;
      
      setIsLoadingSkills(true);
      try {
        const skillsRef = collection(db, 'skills');
        const q = query(
          skillsRef,
          where('userId', '==', auth.currentUser.uid),
          orderBy('awardedAt', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        const skillsList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setSkills(skillsList);
      } catch (error) {
        console.error('기술/경험 로드 오류:', error);
      } finally {
        setIsLoadingSkills(false);
      }
    };
    
    loadSkills();
  }, [auth.currentUser]);
  
  // 성취 배지 데이터 로드
  useEffect(() => {
    const loadBadges = async () => {
      if (!auth.currentUser?.uid) return;
      
      setIsLoadingBadges(true);
      try {
        const badgesRef = collection(db, 'badges');
        const q = query(
          badgesRef,
          where('userId', '==', auth.currentUser.uid),
          orderBy('awardedAt', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        const badgesList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setBadges(badgesList);
      } catch (error) {
        console.error('배지 로드 오류:', error);
      } finally {
        setIsLoadingBadges(false);
      }
    };
    
    loadBadges();
  }, [auth.currentUser]);
  
  // 복무 일지 추가
  const addDiaryEntry = async () => {
    if (!newDiaryTitle.trim() || !newDiaryContent.trim() || !auth.currentUser?.uid) {
      // 경고창 표시
      Alert.alert('입력 오류', '제목과 내용을 모두 입력해주세요.');
      return;
    }
    
    try {
      console.log('복무일지 저장 시작...');
      
      // Firestore에 복무일지 추가
      const docRef = await addDoc(collection(db, 'diaryEntries'), {
        userId: auth.currentUser.uid,
        title: newDiaryTitle.trim(),
        content: newDiaryContent.trim(),
        date: new Date().toISOString().split('T')[0], // YYYY-MM-DD 형식
        createdAt: serverTimestamp()
      });
      
      console.log('복무일지 저장 완료:', docRef.id);
      
      // 모달 닫고 입력 초기화
      setDiaryModalVisible(false);
      setNewDiaryTitle('');
      setNewDiaryContent('');
      
      // 최신 데이터 다시 로드
      const diaryRef = collection(db, 'diaryEntries');
      const q = query(
        diaryRef, 
        where('userId', '==', auth.currentUser.uid),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const entries = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setDiaryEntries(entries);
      
      // 성공 메시지
      Alert.alert('완료', '복무일지가 저장되었습니다.');
    } catch (error) {
      console.error('복무일지 추가 오류:', error);
      Alert.alert('오류', '복무일지 저장 중 오류가 발생했습니다.');
    }
  };

  // 입대일 처리 - 여러 형식 지원 (useMemo로 최적화)
  const parseEnlistmentDate = useMemo(() => {
    try {
      if (!user || !user.enlistmentDate) {
        console.log('입대일 정보가 없습니다. 기본값 사용');
        return new Date('2024-02-01'); // 기본값
      }
      
      // Firebase Firestore 타임스탬프 객체 처리 (seconds, nanoseconds)
      if (typeof user.enlistmentDate === 'object' && 
          user.enlistmentDate !== null &&
          'seconds' in (user.enlistmentDate as any) && 
          typeof (user.enlistmentDate as any).seconds === 'number') {
        console.log('Firebase 타임스탬프 형식 감지:', user.enlistmentDate);
        const seconds = (user.enlistmentDate as any).seconds;
        const date = new Date(seconds * 1000); // 초를 밀리초로 변환
        
        if (isValidDate(date)) {
          console.log('Firebase 타임스탬프 변환 성공:', date);
          return date;
        }
      }
      
      // 문자열인 경우 직접 파싱
      if (typeof user.enlistmentDate === 'string') {
        // ISO 형식 문자열 (2024-02-01T00:00:00.000Z)
        if (user.enlistmentDate.includes('T')) {
          const date = new Date(user.enlistmentDate);
          if (isValidDate(date)) return date;
        }
        
        // YYYY-MM-DD 형식
        if (user.enlistmentDate.includes('-')) {
          const [year, month, day] = user.enlistmentDate.split('-').map(Number);
          const date = new Date(year, month - 1, day);
          if (isValidDate(date)) return date;
        }
        
        // YYYY/MM/DD 형식
        if (user.enlistmentDate.includes('/')) {
          const [year, month, day] = user.enlistmentDate.split('/').map(Number);
          const date = new Date(year, month - 1, day);
          if (isValidDate(date)) return date;
        }
        
        // 타임스탬프 (숫자 문자열)
        if (!isNaN(Number(user.enlistmentDate))) {
          const timestamp = Number(user.enlistmentDate);
          // 밀리초 타임스탬프
          if (timestamp > 1000000000000) {
            const date = new Date(timestamp);
            if (isValidDate(date)) return date;
          } 
          // 초 타임스탬프
          else {
            const date = new Date(timestamp * 1000);
            if (isValidDate(date)) return date;
          }
        }
      }
      
      // 타임스탬프 숫자인 경우
      if (typeof user.enlistmentDate === 'number') {
        const timestamp = user.enlistmentDate;
        // 밀리초 타임스탬프
        if (timestamp > 1000000000000) {
          const date = new Date(timestamp);
          if (isValidDate(date)) return date;
        } 
        // 초 타임스탬프
        else {
          const date = new Date(timestamp * 1000);
          if (isValidDate(date)) return date;
        }
      }
      
      // Firebase 타임스탬프 객체인 경우 (toDate 메서드)
      if (user.enlistmentDate && typeof user.enlistmentDate === 'object' && 'toDate' in user.enlistmentDate) {
        try {
          const date = (user.enlistmentDate as any).toDate();
          if (isValidDate(date)) return date;
        } catch (e) {
          console.error('toDate 메서드 호출 오류:', e);
        }
      }
      
      console.log('입대일 파싱 실패, 기본값 사용');
      return new Date('2024-02-01'); // 기본값
    } catch (error) {
      console.error('입대일 파싱 오류:', error);
      return new Date('2024-02-01'); // 기본값
    }
  }, [user]); // user가 변경될 때만 계산
  
  // 전역일 계산 (입대일로부터 1년 6개월 후, 1일 빼기)
  const dischargeDate = useMemo(() => {
    if (!isValidDate(parseEnlistmentDate)) return new Date('2025-08-01'); // 기본값
    
    const result = new Date(parseEnlistmentDate);
    result.setMonth(result.getMonth() + 18); // 1년 6개월 = 18개월
    result.setDate(result.getDate() - 1); // 전역일은 1일 빼기
    return result;
  }, [parseEnlistmentDate]); // parseEnlistmentDate가 변경될 때만 계산
  
  // 복무 진행률 계산 (초 단위로 정확하게)
  const calculateProgressRatio = () => {
    try {
      if (!isValidDate(parseEnlistmentDate) || !isValidDate(dischargeDate)) {
        return 0;
      }
      
      // 초 단위로 계산
      const totalSeconds = Math.floor((dischargeDate.getTime() - parseEnlistmentDate.getTime()) / 1000);
      const passedSeconds = Math.floor((currentTime.getTime() - parseEnlistmentDate.getTime()) / 1000);
      
      // 총 기간이 0이거나 음수인 경우 처리
      if (totalSeconds <= 0) {
        return 0;
      }
      
      // 소수점 이하까지 정확하게 계산
      return Math.min(1, Math.max(0, passedSeconds / totalSeconds));
    } catch (error) {
      console.error('진행률 계산 오류:', error);
      return 0;
    }
  };
  
  const progressRatio = calculateProgressRatio();
  const progressPercentage = progressRatio * 100;
  
  // 남은 복무일 계산
  const calculateRemainingDays = () => {
    try {
      if (!isValidDate(dischargeDate)) return 0;
      
      return Math.max(0, Math.ceil((dischargeDate.getTime() - currentTime.getTime()) / (1000 * 3600 * 24)));
    } catch (error) {
      console.error('남은 일수 계산 오류:', error);
      return 0;
    }
  };
  
  const remainingDays = calculateRemainingDays();
  
  // 계급 자동 계산
  const calculateRank = () => {
    if (!isValidDate(parseEnlistmentDate)) return '이병';
    
    try {
      const monthsServed = (currentTime.getTime() - parseEnlistmentDate.getTime()) / (1000 * 3600 * 24 * 30.4375); // 평균 한 달 일수로 계산
      
      if (monthsServed < 0) return '민간인';
      if (monthsServed < 2) return '이병';
      if (monthsServed < 8) return '일병';  // 이병 2개월 + 일병 6개월 = 8개월
      if (monthsServed < 14) return '상병'; // 이병 2개월 + 일병 6개월 + 상병 6개월 = 14개월
      return '병장';  // 나머지 4개월 (전체 18개월)
    } catch (error) {
      console.error('계급 계산 오류:', error);
      return '이병';
    }
  };
  
  const currentRank = calculateRank();
  
  // 날짜 포맷 함수 (YYYY/MM/DD)
  const formatDate = (date: Date) => {
    try {
      if (!isValidDate(date)) return '날짜 정보 없음';
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}/${month}/${day}`;
    } catch (error) {
      console.error('날짜 포맷 오류:', error);
      return '날짜 정보 없음';
    }
  };

  // 복무 일지 작성 모달
  const renderDiaryModal = () => {
    return (
      <Portal>
        <Dialog visible={diaryModalVisible} onDismiss={() => setDiaryModalVisible(false)}>
          <Dialog.Title>복무 일지 추가</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="제목"
              value={newDiaryTitle}
              onChangeText={setNewDiaryTitle}
              style={styles.modalInput}
            />
            <TextInput
              label="내용"
              value={newDiaryContent}
              onChangeText={setNewDiaryContent}
              multiline
              numberOfLines={5}
              style={[styles.modalInput, styles.textArea]}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDiaryModalVisible(false)}>취소</Button>
            <Button onPress={addDiaryEntry}>저장</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    );
  };

  // PDF 생성 함수
  const generatePDF = async () => {
    try {
      setIsGeneratingPDF(true);
      
      // HTML 콘텐츠 생성
      const now = new Date();
      const formattedDate = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
      const userName = user?.name || '홍길동';
      const rank = currentRank;
      
      // PDF 파일 생성
      const htmlContent = `
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap');
              
              body {
                font-family: 'Noto Sans KR', sans-serif;
                margin: 0;
                padding: 0;
                color: #333;
                line-height: 1.6;
              }
              
              .container {
                padding: 40px;
                max-width: 800px;
                margin: 0 auto;
              }
              
              .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 2px solid #3F51B5;
                padding-bottom: 20px;
              }
              
              .header h1 {
                font-size: 28px;
                font-weight: 700;
                color: #3F51B5;
                margin: 0;
              }
              
              .header p {
                font-size: 14px;
                color: #666;
                margin: 5px 0 0 0;
              }
              
              .profile-section {
                display: flex;
                margin-bottom: 30px;
                background-color: #f8f9fa;
                border-radius: 10px;
                padding: 20px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
              }
              
              .profile-info {
                flex: 1;
              }
              
              .profile-info h2 {
                font-size: 20px;
                margin: 0 0 10px 0;
                color: #3F51B5;
              }
              
              .info-table {
                width: 100%;
                border-collapse: collapse;
              }
              
              .info-table td {
                padding: 8px 0;
                border-bottom: 1px solid #eee;
              }
              
              .info-table td:first-child {
                font-weight: 500;
                width: 120px;
                color: #555;
              }
              
              .progress-section {
                margin-bottom: 30px;
                background-color: #fff;
                border-radius: 10px;
                padding: 20px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
              }
              
              .progress-bar-container {
                height: 20px;
                background-color: #e9ecef;
                border-radius: 10px;
                margin: 15px 0;
                overflow: hidden;
              }
              
              .progress-bar {
                height: 100%;
                background-color: #3F51B5;
                border-radius: 10px;
              }
              
              .progress-labels {
                display: flex;
                justify-content: space-between;
                font-size: 12px;
                color: #666;
              }
              
              .section {
                margin-bottom: 30px;
                background-color: #fff;
                border-radius: 10px;
                padding: 20px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
              }
              
              .section h2 {
                font-size: 20px;
                margin: 0 0 15px 0;
                color: #3F51B5;
                border-bottom: 1px solid #eee;
                padding-bottom: 10px;
              }
              
              .item {
                margin-bottom: 15px;
                padding-bottom: 15px;
                border-bottom: 1px solid #f0f0f0;
              }
              
              .item:last-child {
                margin-bottom: 0;
                padding-bottom: 0;
                border-bottom: none;
              }
              
              .item-title {
                font-weight: 500;
                margin: 0 0 5px 0;
              }
              
              .item-date {
                font-size: 12px;
                color: #666;
                margin: 0 0 5px 0;
              }
              
              .item-content {
                font-size: 14px;
                color: #555;
              }
              
              .empty-message {
                color: #999;
                font-style: italic;
                text-align: center;
                padding: 20px 0;
              }
              
              .footer {
                text-align: center;
                margin-top: 40px;
                font-size: 12px;
                color: #999;
                border-top: 1px solid #eee;
                padding-top: 20px;
              }
              
              .badge-grid {
                display: flex;
                flex-wrap: wrap;
                gap: 15px;
              }
              
              .badge-item {
                text-align: center;
                width: calc(33% - 10px);
              }
              
              .badge-icon {
                width: 50px;
                height: 50px;
                background-color: #3F51B5;
                border-radius: 50%;
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 10px auto;
                font-size: 24px;
              }
              
              .badge-title {
                font-weight: 500;
                font-size: 14px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>군 복무 포트폴리오</h1>
                <p>${userName} ${rank} | ${user?.unitName || '00사단 00연대 00중대'}</p>
              </div>
              
              <div class="profile-section">
                <div class="profile-info">
                  <h2>개인 정보</h2>
                  <table class="info-table">
                    <tr>
                      <td>이름</td>
                      <td>${userName}</td>
                    </tr>
                    <tr>
                      <td>계급</td>
                      <td>${rank}</td>
                    </tr>
                    <tr>
                      <td>소속</td>
                      <td>${user?.unitName || '00사단 00연대 00중대'}</td>
                    </tr>
                    <tr>
                      <td>군번</td>
                      <td>${user?.militaryId || '-'}</td>
                    </tr>
                    <tr>
                      <td>입대일</td>
                      <td>${formatDate(parseEnlistmentDate)}</td>
                    </tr>
                    <tr>
                      <td>전역일</td>
                      <td>${formatDate(dischargeDate)}</td>
                    </tr>
                  </table>
                </div>
              </div>
              
              <div class="progress-section">
                <h2>복무 진행률</h2>
                <div class="progress-bar-container">
                  <div class="progress-bar" style="width: ${progressPercentage}%;"></div>
                </div>
                <div class="progress-labels">
                  <span>${formatDate(parseEnlistmentDate)}</span>
                  <span>${progressPercentage.toFixed(2)}% (남은 복무일: ${remainingDays}일)</span>
                  <span>${formatDate(dischargeDate)}</span>
                </div>
              </div>
              
              <div class="section">
                <h2>획득 기술 및 경험</h2>
                ${skills.length > 0 ? 
                  skills.map((skill, index) => `
                    <div class="item">
                      <div class="item-title">${skill.title || '기술/경험'}</div>
                      <div class="item-date">${skill.date || '날짜 정보 없음'}</div>
                      ${skill.description ? `<div class="item-content">${skill.description}</div>` : ''}
                    </div>
                  `).join('') : 
                  '<div class="empty-message">아직 획득한 기술/경험이 없습니다.</div>'
                }
              </div>
              
              <div class="section">
                <h2>복무 일지</h2>
                ${diaryEntries.length > 0 ? 
                  diaryEntries.map((entry, index) => `
                    <div class="item">
                      <div class="item-title">${entry.title || '제목 없음'}</div>
                      <div class="item-date">${entry.date || '날짜 정보 없음'}</div>
                      ${entry.content ? `<div class="item-content">${entry.content}</div>` : ''}
                    </div>
                  `).join('') : 
                  '<div class="empty-message">아직 작성한 복무일지가 없습니다.</div>'
                }
              </div>
              
              <div class="section">
                <h2>성취 배지</h2>
                ${badges.length > 0 ? `
                  <div class="badge-grid">
                    ${badges.map((badge, index) => `
                      <div class="badge-item">
                        <div class="badge-icon">★</div>
                        <div class="badge-title">${badge.title || '배지'}</div>
                      </div>
                    `).join('')}
                  </div>
                ` : 
                  '<div class="empty-message">아직 획득한 배지가 없습니다.</div>'
                }
              </div>
              
              <div class="footer">
                <p>본 포트폴리오는 ${now.toLocaleDateString()} 에 생성되었습니다.</p>
                <p>대한민국 국군 복무 포트폴리오</p>
              </div>
            </div>
          </body>
        </html>
      `;
      
      // PDF 생성
      const { uri: pdfUri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false
      });
      
      // 파일 이름 설정
      const fileName = `복무포트폴리오_${userName}_${formattedDate}.pdf`;
      const destinationUri = `${FileSystem.documentDirectory}${fileName}`;
      
      // 파일 이동
      await FileSystem.moveAsync({
        from: pdfUri,
        to: destinationUri
      });
      
      setExportOptionsVisible(false);
      setIsGeneratingPDF(false);
      
      // PDF 공유
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(destinationUri, {
          mimeType: 'application/pdf',
          dialogTitle: '복무 포트폴리오 PDF'
        });
      } else {
        Alert.alert('알림', '파일 공유가 지원되지 않는 기기입니다.');
      }
    } catch (error) {
      console.error('PDF 생성 오류:', error);
      setIsGeneratingPDF(false);
      setExportOptionsVisible(false);
      Alert.alert('오류', '포트폴리오 PDF 생성 중 오류가 발생했습니다.');
    }
  };
  
  // 내보내기 옵션 모달
  const renderExportOptionsModal = () => {
    return (
      <Portal>
        <Dialog visible={exportOptionsVisible} onDismiss={() => setExportOptionsVisible(false)}>
          <Dialog.Title>포트폴리오 내보내기</Dialog.Title>
          <Dialog.Content>
            <Paragraph>포트폴리오를 PDF로 저장하시겠습니까?</Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setExportOptionsVisible(false)}>취소</Button>
            <Button onPress={generatePDF}>PDF로 저장</Button>
          </Dialog.Actions>
        </Dialog>
        
        <Dialog visible={isGeneratingPDF} dismissable={false}>
          <Dialog.Title>처리 중</Dialog.Title>
          <Dialog.Content style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3F51B5" />
            <Paragraph style={styles.processingText}>포트폴리오를 생성하는 중입니다...</Paragraph>
          </Dialog.Content>
        </Dialog>
      </Portal>
    );
  };

  return (
    <>
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#3F51B5']} // 안드로이드용 로딩 색상
            tintColor="#3F51B5" // iOS용 로딩 색상
            title="새로고침 중..." // iOS용 로딩 텍스트
            titleColor="#3F51B5" // iOS용 로딩 텍스트 색상
          />
        }
      >
      <Card style={styles.profileCard}>
        <Card.Content style={styles.profileContent}>
          <Avatar.Icon size={80} icon="account" style={styles.avatar} />
          <View style={styles.profileInfo}>
            <Title>{user?.name || '홍길동'}</Title>
              <Text style={styles.rankUnit}>{currentRank} | {user?.unitName || '00사단 00연대 00중대'}</Text>
              <Text style={styles.enlistmentInfo}>입대일: {formatDate(parseEnlistmentDate)}</Text>
              <Text style={styles.enlistmentInfo}>전역일: {formatDate(dischargeDate)}</Text>
              {/* 디버그 정보는 개발 모드에서만 표시 (숨김) */}
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title>복무 진행률</Title>
          <View style={styles.progressSection}>
            <View style={styles.progressInfo}>
                <Text style={styles.progressPercentage}>{progressPercentage.toFixed(2)}%</Text>
              <Text style={styles.remainingDays}>전역까지 {remainingDays}일</Text>
              </View>
              <ProgressBar progress={Number(progressRatio) || 0} color="#3F51B5" style={styles.progressBar} />
              <View style={styles.dateLabels}>
                <Text style={styles.dateLabel}>{formatDate(parseEnlistmentDate)}</Text>
                <Text style={styles.dateLabel}>{formatDate(dischargeDate)}</Text>
              </View>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
            <View style={styles.cardHeader}>
          <Title>획득 기술 및 경험</Title>
              <Text style={styles.infoText}>* 이 내용은 간부가 부여한 기술/경험입니다</Text>
            </View>
            {isLoadingSkills ? (
              <Text style={styles.loadingText}>로딩 중...</Text>
            ) : skills.length > 0 ? (
          <List.Section>
                {skills.map((skill, index) => (
                  <React.Fragment key={skill.id || index}>
            <List.Item
                      title={skill.title || "보안장비 운용 교육 수료"}
                      description={skill.date || "2024-03-15"}
              left={props => <List.Icon {...props} icon="certificate" />}
            />
                    {index < skills.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List.Section>
            ) : (
              <List.Section>
            <List.Item
                  title="아직 획득한 기술/경험이 없습니다"
                  description="간부가 기술/경험을 부여하면 이곳에 표시됩니다"
                  left={props => <List.Icon {...props} icon="information" />}
            />
          </List.Section>
            )}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
            <View style={styles.cardHeader}>
          <Title>취득 자격증</Title>
              <Text style={styles.infoText}>* 국가 자격증 API 개발 시 연동 예정</Text>
            </View>
          <List.Section>
            <List.Item
                title="현재 자격증 정보는 국가 API 연동 대기 중입니다"
                description="국가 자격증 API가 개발되면 자동으로 연동될 예정입니다"
                left={props => <List.Icon {...props} icon="timer-sand" />}
            />
            <Divider />
            <List.Item
                title="자격증 취득 시 자동으로 포트폴리오에 반영됩니다"
                description="Q-Net, 큐넷 자격증 서비스 연동 예정"
                left={props => <List.Icon {...props} icon="information" />}
            />
          </List.Section>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title>복무 일지</Title>
            {isLoadingDiary ? (
              <Text style={styles.loadingText}>로딩 중...</Text>
            ) : diaryEntries.length > 0 ? (
          <List.Section>
                {diaryEntries.map((entry, index) => (
                  <React.Fragment key={entry.id || index}>
            <List.Item
                      title={entry.title}
                      description={entry.date}
              left={props => <List.Icon {...props} icon="notebook" />}
            />
                    {index < diaryEntries.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List.Section>
            ) : (
              <List.Section>
            <List.Item
                  title="아직 복무일지가 없습니다"
                  description="복무일지 추가 버튼을 눌러 첫 복무일지를 작성해보세요"
                  left={props => <List.Icon {...props} icon="information" />}
            />
          </List.Section>
            )}
          <Button 
            mode="outlined" 
            icon="plus" 
            style={styles.addButton}
              onPress={() => setDiaryModalVisible(true)}
          >
            복무일지 추가
          </Button>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
            <View style={styles.cardHeader}>
          <Title>성취 배지</Title>
              <Text style={styles.infoText}>* 이 내용은 간부가 부여한 배지입니다</Text>
            </View>
            {isLoadingBadges ? (
              <Text style={styles.loadingText}>로딩 중...</Text>
            ) : badges.length > 0 ? (
              <View style={styles.badgesContainer}>
                {badges.map((badge, index) => (
                  <View key={badge.id || index} style={styles.badge}>
                    <Avatar.Icon size={50} icon={badge.icon || "trophy"} style={styles.badgeIcon} />
                    <Text style={styles.badgeTitle}>{badge.title || "성취 배지"}</Text>
            </View>
                ))}
            </View>
            ) : (
              <View style={styles.badgesContainer}>
                <View style={styles.emptyCenterContainer}>
                  <Text style={styles.emptyText}>아직 획득한 배지가 없습니다</Text>
                  <Text style={styles.emptySubText}>간부가 배지를 부여하면 이곳에 표시됩니다</Text>
            </View>
          </View>
            )}
        </Card.Content>
      </Card>

      <View style={styles.buttonContainer}>
        <Button 
          mode="contained" 
          icon="file-pdf-box" 
          style={styles.exportButton}
            onPress={() => setExportOptionsVisible(true)}
            disabled={isGeneratingPDF}
        >
            복무 포트폴리오 내보내기
        </Button>
      </View>
    </ScrollView>
      
      {renderDiaryModal()}
      {renderExportOptionsModal()}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 10,
  },
  profileCard: {
    marginBottom: 10,
    elevation: 2,
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: '#3F51B5',
    marginRight: 20,
  },
  profileInfo: {
    flex: 1,
  },
  rankUnit: {
    marginBottom: 5,
    color: '#555',
  },
  enlistmentInfo: {
    fontSize: 12,
    color: '#666',
  },
  debugText: {
    fontSize: 10,
    color: 'red',
    marginTop: 5,
  },
  card: {
    marginVertical: 10,
    elevation: 2,
  },
  progressSection: {
    marginVertical: 15,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  progressPercentage: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3F51B5',
  },
  remainingDays: {
    fontSize: 16,
    color: '#555',
  },
  progressBar: {
    height: 12,
    borderRadius: 6,
  },
  dateLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  dateLabel: {
    fontSize: 12,
    color: '#666',
  },
  addButton: {
    marginTop: 15,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 15,
    minHeight: 100,
  },
  badge: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 15,
  },
  badgeIcon: {
    backgroundColor: '#3F51B5',
    marginBottom: 5,
  },
  badgeTitle: {
    textAlign: 'center',
  },
  buttonContainer: {
    margin: 15,
  },
  exportButton: {
    paddingVertical: 6,
  },
  modalInput: {
    marginBottom: 10,
  },
  textArea: {
    height: 100,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 10,
    color: '#777',
    fontStyle: 'italic',
  },
  loadingText: {
    textAlign: 'center',
    padding: 15,
    color: '#666',
  },
  emptyCenterContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 5,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  processingText: {
    marginTop: 10,
    textAlign: 'center',
  },
});

export default PortfolioScreen; 