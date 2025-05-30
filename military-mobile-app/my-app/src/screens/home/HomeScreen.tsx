import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Platform, Dimensions, Alert } from 'react-native';
import { Text, Card, Title, Paragraph, Button, Avatar, List, Badge, ActivityIndicator, Chip, Surface, IconButton } from 'react-native-paper';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getDangerousMentalHealthTests, getDangerousSoldiers, MentalHealthTestResult, PhysicalHealthTestResult } from '../../firebase';
import { format, differenceInDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import * as Location from 'expo-location';

const { width } = Dimensions.get('window');

interface WeatherData {
  temperature: number;
  description: string;
  icon: string;
  location: string;
}

const HomeScreen: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [dangerousSoldiers, setDangerousSoldiers] = useState<MentalHealthTestResult[]>([]);
  const [physicalUnhealthySoldiers, setPhysicalUnhealthySoldiers] = useState<PhysicalHealthTestResult[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  // 현재 시간 업데이트
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 날씨 정보 가져오기
  const getWeatherData = async () => {
    try {
      setWeatherLoading(true);
      
      // 위치 권한 요청
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('위치 권한 필요', '날씨 정보를 가져오려면 위치 권한이 필요합니다.');
        return;
      }

      // 현재 위치 가져오기
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      // OpenWeatherMap API 호출 (무료 API 키 필요)
      const API_KEY = 'your_openweather_api_key'; // 실제 API 키로 교체 필요
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric&lang=kr`
      );
      
      if (response.ok) {
        const data = await response.json();
        setWeather({
          temperature: Math.round(data.main.temp),
          description: data.weather[0].description,
          icon: data.weather[0].icon,
          location: data.name
        });
      } else {
        // API 키가 없거나 오류 시 임시 데이터
        setWeather({
          temperature: 22,
          description: '맑음',
          icon: '01d',
          location: '현재 위치'
        });
      }
    } catch (error) {
      console.error('날씨 정보 가져오기 오류:', error);
      // 오류 시 임시 데이터
      setWeather({
        temperature: 22,
        description: '날씨 정보 로드 중...',
        icon: '01d',
        location: '현재 위치'
      });
    } finally {
      setWeatherLoading(false);
    }
  };

  // 컴포넌트 마운트 시 날씨 정보 가져오기
  useEffect(() => {
    getWeatherData();
  }, []);

  // 전역까지 남은 일수 계산 (실제 입대일 기준)
  const getDaysUntilDischarge = () => {
    if (!user?.enlistmentDate) return null;
    
    try {
      let enlistmentDate: Date;
      
      // Firebase Timestamp 객체인지 확인
      if (user.enlistmentDate && typeof user.enlistmentDate === 'object' && 'seconds' in user.enlistmentDate) {
        // Firebase Timestamp를 Date로 변환
        enlistmentDate = new Date((user.enlistmentDate as any).seconds * 1000);
      } else if (typeof user.enlistmentDate === 'string') {
        // 문자열인 경우 Date로 변환
        enlistmentDate = new Date(user.enlistmentDate);
      } else {
        // 이미 Date 객체인 경우
        enlistmentDate = new Date(user.enlistmentDate);
      }
      
      if (isNaN(enlistmentDate.getTime())) {
        console.warn('Invalid enlistment date:', user.enlistmentDate);
        return null;
      }
      
      // 일반적으로 육군 복무기간은 18개월 (548일)
      const dischargeDate = new Date(enlistmentDate);
      dischargeDate.setDate(dischargeDate.getDate() + 548);
      
      const today = new Date();
      const daysLeft = differenceInDays(dischargeDate, today);
      
      return daysLeft > 0 ? daysLeft : 0;
    } catch (error) {
      console.error('Error calculating days until discharge:', error);
      return null;
    }
  };

  // 복무 진행률 계산 (실제 입대일 기준)
  const getServiceProgress = () => {
    if (!user?.enlistmentDate) return 0;
    
    try {
      let enlistmentDate: Date;
      
      // Firebase Timestamp 객체인지 확인
      if (user.enlistmentDate && typeof user.enlistmentDate === 'object' && 'seconds' in user.enlistmentDate) {
        // Firebase Timestamp를 Date로 변환
        enlistmentDate = new Date((user.enlistmentDate as any).seconds * 1000);
      } else if (typeof user.enlistmentDate === 'string') {
        // 문자열인 경우 Date로 변환
        enlistmentDate = new Date(user.enlistmentDate);
      } else {
        // 이미 Date 객체인 경우
        enlistmentDate = new Date(user.enlistmentDate);
      }
      
      // 유효한 날짜인지 확인
      if (isNaN(enlistmentDate.getTime())) {
        console.warn('Invalid enlistment date:', user.enlistmentDate);
        return 0;
      }
      
      const dischargeDate = new Date(enlistmentDate);
      dischargeDate.setDate(dischargeDate.getDate() + 548);
      
      const today = new Date();
      const totalDays = differenceInDays(dischargeDate, enlistmentDate);
      const servedDays = differenceInDays(today, enlistmentDate);
      
      return Math.min(Math.max((servedDays / totalDays) * 100, 0), 100);
    } catch (error) {
      console.error('Error calculating service progress:', error);
      return 0;
    }
  };

  // 건강 이상 상태 병사 정보 로드 (간부만)
  const loadDangerousSoldiers = async () => {
    if (!user?.unitCode || (user.role !== 'officer' && user.role !== 'admin')) return;
    
    try {
      setLoading(true);
      
      // 새로운 getDangerousSoldiers 함수 사용
      const results = await getDangerousSoldiers(user.unitCode);
      setDangerousSoldiers(results.mentalHealthTests);
      setPhysicalUnhealthySoldiers(results.physicalHealthTests);
    } catch (error) {
      console.error('건강 이상 상태 병사 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  // 화면이 포커스될 때마다 데이터 새로고침
  useFocusEffect(
    useCallback(() => {
      loadDangerousSoldiers();
      return () => {};
    }, [user])
  );

  // 초기 로드
  useEffect(() => {
    loadDangerousSoldiers();
  }, [user]);

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

  // 간부용 건강 관리 화면으로 이동
  const goToHealthManagement = () => {
    navigation.navigate('OfficerMentalHealthView' as never);
  };

  // 심리 테스트 화면으로 이동
  const goToMentalHealthTest = () => {
    navigation.navigate('MentalHealthTest' as never);
  };

  // 건강 이상 인원 전체 개수 계산
  const totalUnhealthySoldiers = () => {
    // 중복된 인원 제거를 위해 Set 사용
    const uniqueSoldierIds = new Set([
      ...dangerousSoldiers.map(s => s.userId),
      ...physicalUnhealthySoldiers.map(s => s.userId)
    ]);
    
    return uniqueSoldierIds.size;
  };

  // 건강 이상 인원 전체 목록 (정신건강 이상 인원 우선, 중복 제거)
  const getAllUnhealthySoldiers = () => {
    // 이미 추가한 병사 ID 추적
    const addedSoldierIds = new Set<string>();
    const allSoldiers = [];
    
    // 먼저 정신건강 위험 인원 추가 (우선순위 높음)
    for (const soldier of dangerousSoldiers) {
      allSoldiers.push({
        ...soldier,
        healthType: 'mental',
      });
      addedSoldierIds.add(soldier.userId);
    }
    
    // 그 다음 신체건강 이상 인원 추가 (정신건강 위험 인원에 없는 경우)
    for (const soldier of physicalUnhealthySoldiers) {
      if (!addedSoldierIds.has(soldier.userId)) {
        allSoldiers.push({
          ...soldier,
          healthType: 'physical',
        });
        addedSoldierIds.add(soldier.userId);
      }
    }
    
    // 날짜 기준 정렬
    return allSoldiers.sort((a, b) => b.testDate.toMillis() - a.testDate.toMillis());
  };

  // 인사말 시간대별 변경
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 6) return '새벽';
    if (hour < 12) return '오전';
    if (hour < 18) return '오후';
    return '저녁';
  };

  const daysLeft = getDaysUntilDischarge();
  const serviceProgress = getServiceProgress();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 헤더 섹션 */}
      <Surface style={styles.headerSection}>
        <View style={styles.headerTop}>
          <View style={styles.userInfo}>
            <Avatar.Text 
              size={45} 
              label={user?.name?.charAt(0) || 'U'} 
              style={styles.avatar}
            />
            <View style={styles.userDetails}>
              <Text style={styles.greeting}>
                {getGreeting()} 좋은 시간입니다!
              </Text>
              <Text style={styles.userName}>
                {user?.name || '전우'} {user?.rank || ''}님
              </Text>
              <Text style={styles.unitName}>
                {user?.unitName || '부대명'}
              </Text>
            </View>
          </View>
          <View style={styles.timeInfo}>
            <View style={styles.timeSection}>
              <View style={styles.timeRow}>
                <IconButton icon="clock" size={16} iconColor="#2196F3" style={styles.compactIcon} />
                <View>
                  <Text style={styles.currentTime}>
                    {format(currentTime, 'HH:mm:ss', { locale: ko })}
                  </Text>
                  <Text style={styles.currentDate}>
                    {format(currentTime, 'MM월 dd일 (E)', { locale: ko })}
                  </Text>
                </View>
              </View>
              
              <View style={styles.weatherRow}>
                {weatherLoading ? (
                  <ActivityIndicator size="small" color="#2196F3" />
                ) : weather ? (
                  <>
                    <IconButton icon="weather-cloudy" size={16} iconColor="#FF9800" style={styles.compactIcon} />
                    <View>
                      <Text style={styles.temperature}>{weather.temperature}°C</Text>
                      <Text style={styles.weatherDescription}>{weather.description}</Text>
                    </View>
                  </>
                ) : (
                  <TouchableOpacity onPress={getWeatherData} style={styles.weatherRefresh}>
                    <IconButton icon="refresh" size={16} iconColor="#666" style={styles.compactIcon} />
                    <Text style={styles.weatherError}>새로고침</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* 복무 현황 - 실제 입대일이 있을 때만 표시 */}
        {user?.enlistmentDate && daysLeft !== null && (
          <View style={styles.serviceStatus}>
            <View style={styles.serviceHeader}>
              <Text style={styles.serviceTitle}>복무 현황</Text>
              <Chip mode="outlined" style={styles.daysChip}>
                전역까지 {daysLeft}일
              </Chip>
            </View>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${serviceProgress}%` }]} />
              </View>
              <Text style={styles.progressText}>{serviceProgress.toFixed(1)}% 완료</Text>
            </View>
            <Text style={styles.enlistmentInfo}>
              입대일: {(() => {
                try {
                  let enlistmentDate: Date;
                  
                  // Firebase Timestamp 객체인지 확인
                  if (user.enlistmentDate && typeof user.enlistmentDate === 'object' && 'seconds' in user.enlistmentDate) {
                    // Firebase Timestamp를 Date로 변환
                    enlistmentDate = new Date((user.enlistmentDate as any).seconds * 1000);
                  } else if (typeof user.enlistmentDate === 'string') {
                    // 문자열인 경우 Date로 변환
                    enlistmentDate = new Date(user.enlistmentDate);
                  } else {
                    // 이미 Date 객체인 경우
                    enlistmentDate = new Date(user.enlistmentDate);
                  }
                  
                  if (isNaN(enlistmentDate.getTime())) {
                    return '날짜 정보 오류';
                  }
                  return format(enlistmentDate, 'yyyy년 MM월 dd일', { locale: ko });
                } catch (error) {
                  console.error('Error formatting enlistment date:', error);
                  return '날짜 정보 오류';
                }
              })()}
            </Text>
          </View>
        )}
      </Surface>

      {/* 빠른 메뉴 */}
      <Card style={styles.card}>
        <Card.Content style={styles.compactCardContent}>
          <Title style={styles.cardTitle}>빠른 메뉴</Title>
          <View style={styles.quickMenuGrid}>
            <TouchableOpacity 
              style={styles.quickMenuItem}
              onPress={() => navigation.navigate('Schedule' as never)}
            >
              <Avatar.Icon size={36} icon="calendar" style={styles.menuIcon} />
              <Text style={styles.menuText}>일정관리</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickMenuItem}
              onPress={() => navigation.navigate('LeaveRequest' as never)}
            >
              <Avatar.Icon size={36} icon="airplane" style={styles.menuIcon} />
              <Text style={styles.menuText}>휴가신청</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickMenuItem}
              onPress={() => navigation.navigate('TaxiPool' as never)}
            >
              <Avatar.Icon size={36} icon="car" style={styles.menuIcon} />
              <Text style={styles.menuText}>팟택시</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickMenuItem}
              onPress={goToMentalHealthTest}
            >
              <Avatar.Icon size={36} icon="heart-pulse" style={styles.menuIcon} />
              <Text style={styles.menuText}>건강관리</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickMenuItem}
              onPress={() => navigation.navigate('Education' as never)}
            >
              <Avatar.Icon size={36} icon="school" style={styles.menuIcon} />
              <Text style={styles.menuText}>자기계발</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickMenuItem}
              onPress={() => navigation.navigate('Welfare' as never)}
            >
              <Avatar.Icon size={36} icon="gift" style={styles.menuIcon} />
              <Text style={styles.menuText}>복리후생</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickMenuItem}
              onPress={() => navigation.navigate('Community' as never)}
            >
              <Avatar.Icon size={36} icon="forum" style={styles.menuIcon} />
              <Text style={styles.menuText}>커뮤니티</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickMenuItem}
              onPress={() => navigation.navigate('AddGoal' as never)}
            >
              <Avatar.Icon size={36} icon="target" style={styles.menuIcon} />
              <Text style={styles.menuText}>목표설정</Text>
            </TouchableOpacity>
          </View>
        </Card.Content>
      </Card>

      {/* 간부에게만 보이는 건강 관심 인원 카드 */}
      {(user?.role === 'officer' || user?.role === 'admin') && (
        <Card style={[styles.card, totalUnhealthySoldiers() > 0 ? styles.alertCard : null]}>
          <Card.Content>
            <View style={styles.cardTitleContainer}>
              <Title style={styles.cardTitle}>건강 관심 인원</Title>
              {totalUnhealthySoldiers() > 0 && (
                <Badge size={24} style={styles.badge}>{totalUnhealthySoldiers()}</Badge>
              )}
            </View>
            
            {loading ? (
              <ActivityIndicator style={styles.loader} />
            ) : totalUnhealthySoldiers() > 0 ? (
              <List.Section>
                {getAllUnhealthySoldiers().slice(0, 3).map((soldier) => (
                  <TouchableOpacity key={soldier.id} onPress={goToHealthManagement}>
                    <List.Item
                      title={soldier.userName}
                      description={`${soldier.rank} | ${soldier.healthType === 'mental' ? 
                        `정신건강: ${soldier.score}/30` : 
                        `신체건강: ${soldier.score}/100`}`}
                      left={props => (
                        <Avatar.Icon 
                          {...props} 
                          icon={
                            soldier.healthType === 'mental' && soldier.status === 'danger' ? "account-alert" : 
                            soldier.healthType === 'mental' && soldier.status === 'caution' ? "account-clock" :
                            "heart-off"
                          } 
                          color="#fff" 
                          style={
                            soldier.healthType === 'mental' && soldier.status === 'danger' ? styles.dangerIcon : 
                            soldier.healthType === 'mental' && soldier.status === 'caution' ? styles.cautionIcon :
                            styles.unhealthyIcon
                          }
                        />
                      )}
                      right={() => (
                        <Text style={
                          soldier.healthType === 'mental' && soldier.status === 'danger' ? styles.urgentText : 
                          soldier.healthType === 'mental' && soldier.status === 'caution' ? styles.cautionText :
                          styles.unhealthyText
                        }>
                          {soldier.healthType === 'mental' && soldier.status === 'danger' ? '위험' : 
                           soldier.healthType === 'mental' && soldier.status === 'caution' ? '주의' :
                           '이상'}
                        </Text>
                      )}
                    />
                  </TouchableOpacity>
                ))}
                {totalUnhealthySoldiers() > 3 && (
                  <Button mode="text" onPress={goToHealthManagement}>
                    더보기 ({totalUnhealthySoldiers()}명)
                  </Button>
                )}
              </List.Section>
            ) : (
              <Paragraph>현재 건강 관심 인원이 없습니다.</Paragraph>
            )}
            
            <Button 
              mode="contained" 
              icon="eye" 
              style={styles.addButton}
              onPress={goToHealthManagement}
            >
              건강 관리 현황 보기
            </Button>
          </Card.Content>
        </Card>
      )}

      {/* 시스템 안내 */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>시스템 안내</Title>
          <List.Section>
            <List.Item
              title="실시간 날씨"
              description="현재 위치 기반 실시간 날씨 정보를 제공합니다."
              left={props => <List.Icon {...props} icon="weather-cloudy" color="#2196F3" />}
            />
            <List.Item
              title="위치 기반 서비스"
              description="주변 영외마트 찾기 등 위치 기반 서비스를 제공합니다."
              left={props => <List.Icon {...props} icon="map-marker-radius" color="#4CAF50" />}
            />
            <List.Item
              title="급식 정보"
              description="급식 메뉴는 부대 급식팀에서 업데이트됩니다."
              left={props => <List.Icon {...props} icon="food" color="#FF9800" />}
            />
            <List.Item
              title="부대 일정"
              description="부대 공식 일정은 행정팀에서 관리됩니다."
              left={props => <List.Icon {...props} icon="calendar-check" color="#9C27B0" />}
            />
          </List.Section>
        </Card.Content>
      </Card>

      {/* 공지사항 */}
      <Card style={[styles.card, styles.lastCard]}>
        <Card.Content>
          <Title style={styles.cardTitle}>공지사항</Title>
          <View style={styles.noticeContainer}>
            <IconButton icon="information" size={40} iconColor="#2196F3" />
            <View style={styles.noticeContent}>
              <Text style={styles.noticeTitle}>육군 정보과 연동 예정</Text>
              <Text style={styles.noticeDescription}>
                공지사항은 육군 정보과에서 데이터를 제공하면 자동으로 업데이트됩니다.
              </Text>
              <Text style={styles.noticeSubtext}>
                현재는 개발 단계로 실제 공지사항이 표시되지 않습니다.
              </Text>
            </View>
          </View>
          <Button 
            mode="outlined" 
            icon="web"
            style={styles.linkButton}
            onPress={() => {/* 육군 공식 사이트 연결 예정 */}}
          >
            육군 공식 홈페이지 바로가기
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  headerSection: {
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 16,
    elevation: 4,
    backgroundColor: '#fff',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    backgroundColor: '#3F51B5',
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  greeting: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  unitName: {
    fontSize: 13,
    color: '#666',
  },
  timeInfo: {
    alignItems: 'flex-end',
  },
  timeSection: {
    alignItems: 'flex-end',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  weatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactIcon: {
    margin: 0,
    marginRight: 4,
  },
  currentTime: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  currentDate: {
    fontSize: 11,
    color: '#666',
  },
  temperature: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  weatherDescription: {
    fontSize: 11,
    color: '#666',
  },
  weatherRefresh: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weatherError: {
    fontSize: 11,
    color: '#666',
  },
  serviceStatus: {
    backgroundColor: '#f8f9fa',
    padding: 14,
    borderRadius: 12,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  serviceTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  daysChip: {
    backgroundColor: '#e3f2fd',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    marginRight: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    color: '#666',
    minWidth: 55,
  },
  enlistmentInfo: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 10,
    elevation: 2,
    borderRadius: 12,
  },
  lastCard: {
    marginBottom: 32,
  },
  compactCardContent: {
    padding: 14,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  quickMenuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickMenuItem: {
    width: (width - 64) / 4,
    alignItems: 'center',
    marginBottom: 16,
  },
  menuIcon: {
    backgroundColor: '#e3f2fd',
    marginBottom: 6,
  },
  menuText: {
    fontSize: 11,
    textAlign: 'center',
    color: '#333',
    lineHeight: 14,
  },
  alertCard: {
    backgroundColor: '#ffebee',
  },
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  badge: {
    backgroundColor: '#f44336',
    color: 'white',
    marginLeft: 10,
  },
  addButton: {
    marginTop: 10,
  },
  dangerIcon: {
    backgroundColor: '#f44336',
  },
  cautionIcon: {
    backgroundColor: '#ff9800',
  },
  urgentText: {
    color: '#f44336',
    fontWeight: 'bold',
  },
  cautionText: {
    color: '#ff9800',
    fontWeight: 'bold',
  },
  loader: {
    margin: 20,
  },
  unhealthyIcon: {
    backgroundColor: '#d32f2f',
  },
  unhealthyText: {
    color: '#d32f2f',
    fontWeight: 'bold',
  },
  noticeContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  noticeContent: {
    flex: 1,
    marginLeft: 8,
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  noticeDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  noticeSubtext: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  linkButton: {
    marginTop: 8,
  },
});

export default HomeScreen; 