import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Platform, FlatList } from 'react-native';
import { Text, Card, Title, Paragraph, Button, ProgressBar, ActivityIndicator, Divider, List } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { 
  getUserLatestMentalHealthTest, 
  getUserLatestPhysicalHealthTest, 
  getUserMentalHealthTests, 
  getUserPhysicalHealthTests, 
  MentalHealthTestResult, 
  PhysicalHealthTestResult 
} from '../../firebase';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

const HealthScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [latestMentalTestResult, setLatestMentalTestResult] = useState<MentalHealthTestResult | null>(null);
  const [latestPhysicalTestResult, setLatestPhysicalTestResult] = useState<PhysicalHealthTestResult | null>(null);
  const [mentalHealthTests, setMentalHealthTests] = useState<MentalHealthTestResult[]>([]);
  const [physicalHealthTests, setPhysicalHealthTests] = useState<PhysicalHealthTestResult[]>([]);
  const [loadingTestHistory, setLoadingTestHistory] = useState(false);
  
  // 스크립트 에러 감지 및 페이지 자동 새로고침을 위한 코드
  useEffect(() => {
    // 모바일 환경에서는 window 객체가 없으므로 Platform을 확인하여 조건부로 실행
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // 청크 로드 에러 처리 (ChunkLoadError)
      const handleError = (event: ErrorEvent) => {
        // 청크 로드 에러 또는 구문 오류 감지
        if (
          event.message?.includes('ChunkLoadError') || 
          event.message?.includes('Loading chunk') || 
          event.message?.includes('Unexpected token')
        ) {
          console.error('청크 로드 오류 감지, 페이지 새로고침 시도:', event.message);
          // 페이지 새로고침
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
      };

      // 전역 에러 이벤트 리스너 등록
      window.addEventListener('error', handleError);

      // 컴포넌트 언마운트 시 이벤트 리스너 제거
      return () => {
        window.removeEventListener('error', handleError);
      };
    }
    
    // 모바일 환경에서는 단순히 빈 cleanup 함수 반환
    return () => {};
  }, []);
  
  // 최근 테스트 결과 및 테스트 내역 로드
  const loadHealthData = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      setLoadingTestHistory(true);
      
      // 병렬로 모든 데이터 로드
      const [mentalResult, physicalResult, mentalTests, physicalTests] = await Promise.all([
        getUserLatestMentalHealthTest(user.id),
        getUserLatestPhysicalHealthTest(user.id),
        getUserMentalHealthTests(user.id),
        getUserPhysicalHealthTests(user.id)
      ]);
      
      setLatestMentalTestResult(mentalResult);
      setLatestPhysicalTestResult(physicalResult);
      setMentalHealthTests(mentalTests || []);
      setPhysicalHealthTests(physicalTests || []);
    } catch (error) {
      console.error('건강 데이터 로드 오류:', error);
    } finally {
      setLoading(false);
      setLoadingTestHistory(false);
      setRefreshing(false);
    }
  };
  
  // 새로고침 처리
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadHealthData();
  }, [user]);
  
  // 화면이 포커스될 때마다 데이터 새로고침
  useFocusEffect(
    useCallback(() => {
      loadHealthData();
      return () => {};
    }, [user])
  );
  
  // 초기 로드
  useEffect(() => {
    loadHealthData();
  }, [user]);
  
  // 심리 테스트 화면으로 이동
  const goToMentalHealthTest = () => {
    navigation.navigate('MentalHealthTest' as never);
  };
  
  // 신체건강 테스트 화면으로 이동
  const goToPhysicalHealthTest = () => {
    navigation.navigate('PhysicalHealthTest' as never);
  };
  
  // 간부용 심리 테스트 관리 화면으로 이동
  const goToOfficerMentalHealthView = () => {
    navigation.navigate('OfficerMentalHealthView' as never);
  };
  
  // 정신건강 상태에 따른 색상 및 텍스트 반환
  const getMentalStatusInfo = (status: 'danger' | 'caution' | 'good') => {
    switch (status) {
      case 'danger':
        return { color: '#f44336', text: '위험', progress: 0.9 };
      case 'caution':
        return { color: '#ff9800', text: '주의', progress: 0.5 };
      case 'good':
        return { color: '#4CAF50', text: '양호', progress: 0.2 };
      default:
        return { color: '#4CAF50', text: '양호', progress: 0.2 };
    }
  };
  
  // 신체건강 상태에 따른 색상 및 텍스트 반환
  const getPhysicalStatusInfo = (status: 'bad' | 'normal' | 'good') => {
    switch (status) {
      case 'bad':
        return { color: '#f44336', text: '이상', progress: 0.9 };
      case 'normal':
        return { color: '#ff9800', text: '양호', progress: 0.5 };
      case 'good':
        return { color: '#4CAF50', text: '건강', progress: 0.2 };
      default:
        return { color: '#4CAF50', text: '양호', progress: 0.5 };
    }
  };
  
  // 모든 테스트 결과를 날짜순으로 결합하고 정렬
  const getAllTestResults = () => {
    const allTests = [
      ...mentalHealthTests.map(test => ({
        ...test,
        type: 'mental',
        formattedDate: format(test.testDate.toDate(), 'yyyy년 MM월 dd일', { locale: ko })
      })),
      ...physicalHealthTests.map(test => ({
        ...test,
        type: 'physical',
        formattedDate: format(test.testDate.toDate(), 'yyyy년 MM월 dd일', { locale: ko })
      }))
    ];
    
    // 날짜 내림차순 정렬 (최신순)
    return allTests.sort((a, b) => 
      b.testDate.toDate().getTime() - a.testDate.toDate().getTime()
    );
  };
  
  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#3F51B5']}
        />
      }
    >
      {/* 정신건강 상태 카드 */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>정신건강 상태</Title>
          
          {loading && !refreshing ? (
            <ActivityIndicator style={styles.loader} />
          ) : latestMentalTestResult ? (
            <>
              <View style={styles.lastTestInfo}>
                <Text>마지막 테스트: {format(latestMentalTestResult.testDate.toDate(), 'yyyy년 MM월 dd일', { locale: ko })}</Text>
              </View>
              
              <View style={styles.statusContainer}>
                <View style={styles.statusItem}>
                  <Text>심리 상태</Text>
                  <ProgressBar 
                    progress={getMentalStatusInfo(latestMentalTestResult.status).progress} 
                    color={getMentalStatusInfo(latestMentalTestResult.status).color} 
                    style={styles.progressBar} 
                  />
                  <Text style={[styles.statusText, { color: getMentalStatusInfo(latestMentalTestResult.status).color }]}>
                    {getMentalStatusInfo(latestMentalTestResult.status).text}
                  </Text>
                </View>
                
                <View style={styles.statusItem}>
                  <Text>스트레스 지수</Text>
                  <ProgressBar 
                    progress={latestMentalTestResult.score / 30} 
                    color={latestMentalTestResult.score > 20 ? '#f44336' : latestMentalTestResult.score > 10 ? '#ff9800' : '#4CAF50'} 
                    style={styles.progressBar} 
                  />
                  <Text style={styles.statusText}>
                    점수: {latestMentalTestResult.score}/30
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.noTestContainer}>
              <Text style={styles.noTestText}>아직 실시한 심리 테스트가 없습니다.</Text>
            </View>
          )}
          
          <Button 
            mode="contained" 
            style={styles.button}
            onPress={goToMentalHealthTest}
          >
            심리 건강 테스트 실시
          </Button>
        </Card.Content>
      </Card>

      {/* 신체건강 상태 카드 */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>신체건강 상태</Title>
          
          {loading && !refreshing ? (
            <ActivityIndicator style={styles.loader} />
          ) : latestPhysicalTestResult ? (
            <>
              <View style={styles.lastTestInfo}>
                <Text>마지막 테스트: {format(latestPhysicalTestResult.testDate.toDate(), 'yyyy년 MM월 dd일', { locale: ko })}</Text>
              </View>
              
              <View style={styles.statusContainer}>
                <View style={styles.statusItem}>
                  <Text>신체 상태</Text>
                  <ProgressBar 
                    progress={getPhysicalStatusInfo(latestPhysicalTestResult.status).progress} 
                    color={getPhysicalStatusInfo(latestPhysicalTestResult.status).color} 
                    style={styles.progressBar} 
                  />
                  <Text style={[styles.statusText, { color: getPhysicalStatusInfo(latestPhysicalTestResult.status).color }]}>
                    {getPhysicalStatusInfo(latestPhysicalTestResult.status).text}
                  </Text>
                </View>
                
                <View style={styles.statusItem}>
                  <Text>종합 건강 점수</Text>
                  <ProgressBar 
                    progress={latestPhysicalTestResult.score / 100} 
                    color={latestPhysicalTestResult.score < 60 ? '#f44336' : latestPhysicalTestResult.score < 80 ? '#ff9800' : '#4CAF50'} 
                    style={styles.progressBar} 
                  />
                  <Text style={styles.statusText}>
                    점수: {latestPhysicalTestResult.score}/100
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.noTestContainer}>
              <Text style={styles.noTestText}>아직 실시한 신체건강 테스트가 없습니다.</Text>
            </View>
          )}
          
          <Button 
            mode="contained" 
            style={styles.button}
            onPress={goToPhysicalHealthTest}
          >
            신체 건강 테스트 실시
          </Button>
        </Card.Content>
      </Card>

      {/* 간부 전용 버튼 */}
      {(user?.role === 'officer' || user?.role === 'admin') && (
        <Card style={styles.card}>
          <Card.Content>
            <Button 
              mode="outlined" 
              style={styles.officerButton}
              onPress={goToOfficerMentalHealthView}
            >
              부대 건강 관리 현황
            </Button>
          </Card.Content>
        </Card>
      )}

      {/* 건강 활동 내역 카드 */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>건강 테스트 내역</Title>
          
          {loadingTestHistory ? (
            <ActivityIndicator style={styles.loader} />
          ) : getAllTestResults().length > 0 ? (
            <View style={styles.testHistoryContainer}>
              {getAllTestResults().map((test, index) => (
                <View key={test.id || index}>
                  <List.Item
                    title={test.type === 'mental' ? '정신건강 테스트' : '신체건강 테스트'}
                    description={`${test.formattedDate} | 점수: ${test.score}/${test.type === 'mental' ? '30' : '100'}`}
                    left={props => (
                      <List.Icon 
                        {...props} 
                        icon={test.type === 'mental' ? "brain" : "run"} 
                        color={
                          test.type === 'mental' 
                            ? getMentalStatusInfo(test.status as 'danger' | 'caution' | 'good').color
                            : getPhysicalStatusInfo(test.status as 'bad' | 'normal' | 'good').color
                        }
                      />
                    )}
                    right={props => (
                      <Text style={{
                        color: test.type === 'mental' 
                          ? getMentalStatusInfo(test.status as 'danger' | 'caution' | 'good').color
                          : getPhysicalStatusInfo(test.status as 'bad' | 'normal' | 'good').color
                      }}>
                        {test.type === 'mental'
                          ? getMentalStatusInfo(test.status as 'danger' | 'caution' | 'good').text
                          : getPhysicalStatusInfo(test.status as 'bad' | 'normal' | 'good').text
                        }
                      </Text>
                    )}
                  />
                  {index < getAllTestResults().length - 1 && <Divider />}
                </View>
              ))}
            </View>
          ) : (
            <Paragraph>아직 실시한 건강 테스트가 없습니다.</Paragraph>
          )}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title>의무시설 정보</Title>
          <View style={styles.medicalInfo}>
            <View style={styles.medicalItem}>
              <Text style={styles.medicalTitle}>부대 의무실</Text>
              <Text>위치: 본부 1층</Text>
              <Text>연락처: 123-456</Text>
              <Text>운영시간: 08:00 ~ 17:00</Text>
            </View>
            <View style={styles.medicalItem}>
              <Text style={styles.medicalTitle}>가까운 군 병원</Text>
              <Text>위치: OO시 OO구</Text>
              <Text>연락처: 02-123-4567</Text>
              <Text>운영시간: 24시간</Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 10,
  },
  card: {
    marginVertical: 10,
    elevation: 2,
  },
  statusContainer: {
    marginVertical: 15,
  },
  statusItem: {
    marginBottom: 15,
  },
  progressBar: {
    marginVertical: 8,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    textAlign: 'right',
    fontSize: 12,
    color: '#444',
  },
  button: {
    marginTop: 10,
  },
  officerButton: {
    marginTop: 10,
    borderColor: '#3F51B5',
  },
  medicalInfo: {
    marginTop: 10,
  },
  medicalItem: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
  },
  medicalTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
    fontSize: 16,
  },
  loader: {
    marginVertical: 20,
  },
  noTestContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noTestText: {
    color: '#666',
    fontStyle: 'italic',
  },
  lastTestInfo: {
    marginTop: 5,
    marginBottom: 10,
  },
  testHistoryContainer: {
    marginTop: 10,
  },
});

export default HealthScreen; 