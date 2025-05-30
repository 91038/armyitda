import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, RefreshControl, Platform } from 'react-native';
import { Text, Card, Title, Button, DataTable, Chip, Searchbar, ActivityIndicator, Portal, Dialog, Paragraph, List, Divider } from 'react-native-paper';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { 
  getDangerousSoldiers, 
  getUnitMentalHealthTestsByDate, 
  MentalHealthTestResult, 
  PhysicalHealthTestResult 
} from '../../firebase';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useNavigation } from '@react-navigation/native';

const OfficerMentalHealthView: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dangerousMentalSoldiers, setDangerousMentalSoldiers] = useState<MentalHealthTestResult[]>([]);
  const [dangerousPhysicalSoldiers, setDangerousPhysicalSoldiers] = useState<PhysicalHealthTestResult[]>([]);
  const [allTestResults, setAllTestResults] = useState<MentalHealthTestResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedMentalSoldier, setSelectedMentalSoldier] = useState<MentalHealthTestResult | null>(null);
  const [selectedPhysicalSoldier, setSelectedPhysicalSoldier] = useState<PhysicalHealthTestResult | null>(null);
  
  // 데이터 로드 함수
  const loadData = async () => {
    if (!user?.unitCode) return;
    
    try {
      setLoading(true);
      
      // 위험 상태 병사와 선택된 날짜의 결과를 병렬로 로드
      const [dangerousResults, dateResults] = await Promise.all([
        getDangerousSoldiers(user.unitCode),
        getUnitMentalHealthTestsByDate(user.unitCode, selectedDate)
      ]);
      
      setDangerousMentalSoldiers(dangerousResults.mentalHealthTests);
      setDangerousPhysicalSoldiers(dangerousResults.physicalHealthTests);
      setAllTestResults(dateResults);
    } catch (error) {
      console.error('데이터 로드 오류:', error);
      Alert.alert('오류', '데이터를 불러오는 중 문제가 발생했습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // 새로고침 처리
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [user, selectedDate]);
  
  // 날짜 변경 처리
  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setSelectedDate(selectedDate);
    }
  };
  
  // 날짜 변경 시 해당 날짜의 데이터만 다시 로드
  const loadTestResultsByDate = async () => {
    if (!user?.unitCode) return;
    
    try {
      setLoading(true);
      const results = await getUnitMentalHealthTestsByDate(user.unitCode, selectedDate);
      setAllTestResults(results);
    } catch (error) {
      console.error('날짜별 테스트 결과 로드 오류:', error);
      Alert.alert('오류', '데이터를 불러오는 중 문제가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };
  
  // 검색 기능
  const filteredResults = allTestResults.filter(result => 
    result.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    result.rank.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // 병사 상세 정보 표시
  const showSoldierDetail = (soldier: MentalHealthTestResult) => {
    setSelectedMentalSoldier(soldier);
    setSelectedPhysicalSoldier(null);
    setShowDetailDialog(true);
  };
  
  // 신체건강 병사 상세 정보 표시
  const showPhysicalSoldierDetail = (soldier: PhysicalHealthTestResult) => {
    setSelectedPhysicalSoldier(soldier);
    setSelectedMentalSoldier(null);
    setShowDetailDialog(true);
  };
  
  // 테스트 시작 (새로운 테스트 세션 생성)
  const startNewTestSession = () => {
    // 여기서는 간부가 테스트를 시작하는 것이므로, 병사들이 테스트를 볼 수 있는 화면으로 이동
    // 실제로는 테스트 세션을 생성하고 병사들에게 알림을 보내는 로직이 필요
    Alert.alert(
      '테스트 시작',
      '새로운 건강 테스트 세션을 시작하시겠습니까? 모든 병사들에게 테스트 알림이 전송됩니다.',
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '시작', 
          onPress: () => {
            // 여기서 실제로 테스트 세션을 생성하고 알림을 보내는 API 호출
            Alert.alert('알림', '건강 테스트 세션이 시작되었습니다. 병사들은 건강관리 탭에서 테스트를 볼 수 있습니다.');
          }
        }
      ]
    );
  };
  
  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    if (user?.role === 'officer' || user?.role === 'admin') {
      loadData();
    } else {
      Alert.alert('접근 제한', '이 화면은 간부만 접근할 수 있습니다.');
      navigation.goBack();
    }
  }, [user]);
  
  // 날짜 변경 시 해당 날짜의 테스트 결과만 다시 로드
  useEffect(() => {
    if (user?.unitCode) {
      loadTestResultsByDate();
    }
  }, [selectedDate]);
  
  // 스크립트 에러 감지 및 페이지 자동 새로고침을 위한 코드
  useEffect(() => {
    // 웹 환경에서만 실행
    if (Platform.OS === 'web') {
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
    
    // React Native 환경에서는 빈 cleanup 함수 반환
    return () => {};
  }, []);
  
  // 상태 표시 칩 렌더링
  const renderStatusChip = (status: 'danger' | 'caution' | 'good') => {
    let color, label;
    
    switch (status) {
      case 'danger':
        color = '#f44336';
        label = '위험';
        break;
      case 'caution':
        color = '#ff9800';
        label = '주의';
        break;
      case 'good':
        color = '#4CAF50';
        label = '양호';
        break;
    }
    
    return <Chip style={{ backgroundColor: color }}><Text style={{ color: 'white' }}>{label}</Text></Chip>;
  };
  
  // 신체건강 상태 표시 칩 렌더링
  const renderPhysicalStatusChip = (status: 'bad' | 'normal' | 'good') => {
    let color, label;
    
    switch (status) {
      case 'bad':
        color = '#f44336';
        label = '이상';
        break;
      case 'normal':
        color = '#ff9800';
        label = '양호';
        break;
      case 'good':
        color = '#4CAF50';
        label = '건강';
        break;
    }
    
    return <Chip style={{ backgroundColor: color }}><Text style={{ color: 'white' }}>{label}</Text></Chip>;
  };
  
  // 병사 상세 정보 다이얼로그
  const renderDetailDialog = () => {
    const selectedSoldier = selectedMentalSoldier || selectedPhysicalSoldier;
    if (!selectedSoldier) return null;
    
    const isPhysicalHealth = selectedPhysicalSoldier !== null;
    
    return (
      <Portal>
        <Dialog visible={showDetailDialog} onDismiss={() => setShowDetailDialog(false)}>
          <Dialog.Title>
            {isPhysicalHealth ? '신체건강' : '정신건강'} 상태 상세
          </Dialog.Title>
          <Dialog.Content>
            <List.Item
              title={selectedSoldier.userName}
              description={`${selectedSoldier.rank} | ${selectedSoldier.unitName}`}
              left={props => <List.Icon {...props} icon={isPhysicalHealth ? "run" : "brain"} />}
            />
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>테스트 일시:</Text>
              <Text>{format(selectedSoldier.testDate.toDate(), 'yyyy년 MM월 dd일 HH:mm', { locale: ko })}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>점수:</Text>
              <Text>{selectedSoldier.score}/{isPhysicalHealth ? '100' : '30'}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>상태:</Text>
              {isPhysicalHealth 
                ? renderPhysicalStatusChip((selectedSoldier as PhysicalHealthTestResult).status)
                : renderStatusChip((selectedSoldier as MentalHealthTestResult).status)
              }
            </View>
            
            {isPhysicalHealth && selectedPhysicalSoldier?.items && (
              <>
                <Divider style={styles.itemDivider} />
                <Text style={styles.detailLabel}>세부 측정 항목:</Text>
                {selectedPhysicalSoldier.items.slice(0, 3).map((item, index) => (
                  <View key={index} style={styles.itemRow}>
                    <Text style={styles.itemName}>{item.name}: </Text>
                    <Text>{item.value} {item.unit || ''}</Text>
                    {renderPhysicalStatusChip(item.status)}
                  </View>
                ))}
                {selectedPhysicalSoldier.items.length > 3 && (
                  <Text style={styles.moreItems}>외 {selectedPhysicalSoldier.items.length - 3}개 항목</Text>
                )}
              </>
            )}
            
            <Paragraph style={styles.warningText}>
              {isPhysicalHealth ? (
                selectedPhysicalSoldier?.status === 'bad' ? 
                  '※ 이상 상태: 의무대 방문 및 정밀 검진이 필요합니다.' :
                  selectedPhysicalSoldier?.status === 'normal' ?
                  '※ 양호 상태: 정기적인 건강 관리가 필요합니다.' :
                  '※ 건강 상태: 신체 건강 상태가 양호합니다.'
              ) : (
                selectedMentalSoldier?.status === 'danger' ? 
                  '※ 위험 상태: 즉시 면담 및 전문가 상담이 필요합니다.' :
                  selectedMentalSoldier?.status === 'caution' ?
                  '※ 주의 상태: 정기적인 관찰이 필요합니다.' :
                  '※ 양호 상태: 정상적인 심리 상태입니다.'
              )}
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDetailDialog(false)}>닫기</Button>
            {((isPhysicalHealth && selectedPhysicalSoldier?.status === 'bad') || 
              (!isPhysicalHealth && selectedMentalSoldier?.status === 'danger')) && (
              <Button mode="contained" onPress={() => {
                setShowDetailDialog(false);
                // 여기서 면담 예약 또는 기타 조치를 위한 화면으로 이동할 수 있음
                Alert.alert('알림', isPhysicalHealth ? '의무대 진료 일정이 등록되었습니다.' : '면담 일정이 등록되었습니다.');
              }}>
                {isPhysicalHealth ? '의무대 진료' : '면담 예약'}
              </Button>
            )}
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
      <Card style={styles.card}>
        <Card.Content>
          <Title>부대 건강 관리</Title>
          
          <Button 
            mode="contained"
            icon="plus"
            style={styles.startButton}
            onPress={startNewTestSession}
          >
            새 건강 테스트 시작
          </Button>
          
          {loading && <ActivityIndicator style={styles.loader} />}
        </Card.Content>
      </Card>
      
      {dangerousMentalSoldiers.length > 0 && (
        <Card style={[styles.card, styles.dangerCard]}>
          <Card.Content>
            <Title style={styles.dangerTitle}>⚠️ 정신건강 관심 인원</Title>
            
            <DataTable>
              <DataTable.Header>
                <DataTable.Title>이름</DataTable.Title>
                <DataTable.Title>계급</DataTable.Title>
                <DataTable.Title>테스트 일시</DataTable.Title>
                <DataTable.Title>상태</DataTable.Title>
                <DataTable.Title numeric>점수</DataTable.Title>
              </DataTable.Header>
              
              {dangerousMentalSoldiers.map((soldier) => (
                <TouchableOpacity key={soldier.id} onPress={() => showSoldierDetail(soldier)}>
                  <DataTable.Row style={soldier.status === 'danger' ? styles.dangerRow : styles.cautionRow}>
                    <DataTable.Cell>{soldier.userName}</DataTable.Cell>
                    <DataTable.Cell>{soldier.rank}</DataTable.Cell>
                    <DataTable.Cell>
                      {format(soldier.testDate.toDate(), 'MM/dd', { locale: ko })}
                    </DataTable.Cell>
                    <DataTable.Cell>
                      {renderStatusChip(soldier.status)}
                    </DataTable.Cell>
                    <DataTable.Cell numeric>{soldier.score}/30</DataTable.Cell>
                  </DataTable.Row>
                </TouchableOpacity>
              ))}
            </DataTable>
          </Card.Content>
        </Card>
      )}
      
      {dangerousPhysicalSoldiers.length > 0 && (
        <Card style={[styles.card, styles.dangerCard]}>
          <Card.Content>
            <Title style={styles.dangerTitle}>⚠️ 신체건강 관심 인원</Title>
            
            <DataTable>
              <DataTable.Header>
                <DataTable.Title>이름</DataTable.Title>
                <DataTable.Title>계급</DataTable.Title>
                <DataTable.Title>테스트 일시</DataTable.Title>
                <DataTable.Title>상태</DataTable.Title>
                <DataTable.Title numeric>점수</DataTable.Title>
              </DataTable.Header>
              
              {dangerousPhysicalSoldiers.map((soldier) => (
                <TouchableOpacity key={soldier.id} onPress={() => showPhysicalSoldierDetail(soldier)}>
                  <DataTable.Row style={styles.dangerRow}>
                    <DataTable.Cell>{soldier.userName}</DataTable.Cell>
                    <DataTable.Cell>{soldier.rank}</DataTable.Cell>
                    <DataTable.Cell>
                      {format(soldier.testDate.toDate(), 'MM/dd', { locale: ko })}
                    </DataTable.Cell>
                    <DataTable.Cell>
                      {renderPhysicalStatusChip(soldier.status)}
                    </DataTable.Cell>
                    <DataTable.Cell numeric>{soldier.score}/100</DataTable.Cell>
                  </DataTable.Row>
                </TouchableOpacity>
              ))}
            </DataTable>
          </Card.Content>
        </Card>
      )}
      
      <Card style={styles.card}>
        <Card.Content>
          <Title>날짜별 테스트 결과</Title>
          
          <View style={styles.datePickerContainer}>
            <Button 
              mode="outlined" 
              onPress={() => setShowDatePicker(true)}
              icon="calendar"
              style={styles.dateButton}
            >
              {format(selectedDate, 'yyyy년 MM월 dd일', { locale: ko })}
            </Button>
            
            {showDatePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="default"
                onChange={onDateChange}
              />
            )}
          </View>
          
          <Searchbar
            placeholder="이름 또는 계급으로 검색"
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
          />
          
          {loading ? (
            <ActivityIndicator style={styles.loader} />
          ) : filteredResults.length > 0 ? (
            <DataTable>
              <DataTable.Header>
                <DataTable.Title>이름</DataTable.Title>
                <DataTable.Title>계급</DataTable.Title>
                <DataTable.Title>상태</DataTable.Title>
                <DataTable.Title numeric>점수</DataTable.Title>
              </DataTable.Header>
              
              {filteredResults.map((result) => (
                <TouchableOpacity key={result.id} onPress={() => showSoldierDetail(result)}>
                  <DataTable.Row>
                    <DataTable.Cell>{result.userName}</DataTable.Cell>
                    <DataTable.Cell>{result.rank}</DataTable.Cell>
                    <DataTable.Cell>
                      {renderStatusChip(result.status)}
                    </DataTable.Cell>
                    <DataTable.Cell numeric>{result.score}/30</DataTable.Cell>
                  </DataTable.Row>
                </TouchableOpacity>
              ))}
            </DataTable>
          ) : (
            <Text style={styles.emptyText}>
              해당 날짜에 실시된 테스트 결과가 없습니다.
            </Text>
          )}
        </Card.Content>
      </Card>
      
      {renderDetailDialog()}
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
  dangerCard: {
    backgroundColor: '#ffebee',
  },
  dangerTitle: {
    color: '#d32f2f',
  },
  startButton: {
    marginTop: 15,
  },
  datePickerContainer: {
    marginVertical: 15,
    alignItems: 'center',
  },
  dateButton: {
    width: '100%',
  },
  searchBar: {
    marginBottom: 15,
  },
  loader: {
    marginVertical: 20,
  },
  emptyText: {
    textAlign: 'center',
    padding: 20,
    color: '#666',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  detailLabel: {
    fontWeight: 'bold',
    width: 100,
  },
  warningText: {
    marginTop: 15,
    color: '#d32f2f',
    fontWeight: 'bold',
  },
  dangerRow: {
    backgroundColor: '#ffebee',
  },
  cautionRow: {
    backgroundColor: '#fff9c4',
  },
  itemDivider: {
    marginVertical: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemName: {
    fontWeight: 'bold',
    marginRight: 10,
  },
  moreItems: {
    marginTop: 5,
    color: '#666',
  },
});

export default OfficerMentalHealthView; 