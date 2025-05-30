import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { 
  Text, 
  Card, 
  Title, 
  Button, 
  TextInput, 
  Chip,
  ActivityIndicator,
  FAB,
  Modal,
  Portal,
  Divider,
  IconButton
} from 'react-native-paper';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

// 팟택시 요청 타입 정의
interface TaxiPoolRequest {
  id: string;
  authorId: string; // 작성자 ID 추가
  authorName: string;
  authorRank: string;
  authorUnit: string;
  departure: string;
  destination: string;
  requestedPeople: number;
  currentPeople: number;
  departureDate: string; // 날짜
  departureTime: string; // 시간
  contactInfo: string;
  additionalInfo: string;
  createdAt: string;
  status: 'recruiting' | 'full' | 'completed';
  participants: string[]; // 참여자 ID 목록
}

const TaxiPoolScreen: React.FC = () => {
  // Redux에서 현재 사용자 정보 가져오기
  const currentUser = useSelector((state: RootState) => state.auth.user);
  
  const [requests, setRequests] = useState<TaxiPoolRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  
  // 새 요청 폼 상태
  const [departure, setDeparture] = useState('');
  const [destination, setDestination] = useState('');
  const [requestedPeople, setRequestedPeople] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');

  useEffect(() => {
    loadTaxiPoolRequests();
    // 기본값 설정
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDepartureDate(tomorrow.toISOString().split('T')[0]);
    setDepartureTime('18:00');
  }, []);

  const loadTaxiPoolRequests = async () => {
    setLoading(true);
    try {
      // 실제 Firebase에서 데이터 가져오기
      // TODO: Firebase 연동 시 실제 API 호출로 교체
      // const response = await getTaxiPoolRequests();
      // setRequests(response.data);
      
      // 임시로 빈 배열로 시작 (실제 데이터만 사용)
      setRequests([]);
    } catch (error) {
      console.error('팟택시 목록 로딩 오류:', error);
      Alert.alert('오류', '팟택시 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const createTaxiPoolRequest = async () => {
    if (!departure.trim() || !destination.trim() || !requestedPeople.trim() || !departureDate.trim() || !departureTime.trim()) {
      Alert.alert('알림', '필수 정보를 모두 입력해주세요.');
      return;
    }

    const peopleCount = parseInt(requestedPeople);
    if (isNaN(peopleCount) || peopleCount < 1 || peopleCount > 10) {
      Alert.alert('알림', '구하는 인원은 1~10명 사이로 입력해주세요.');
      return;
    }

    // 날짜 유효성 검사
    const selectedDate = new Date(departureDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      Alert.alert('알림', '출발 날짜는 오늘 이후로 선택해주세요.');
      return;
    }

    // 시간 유효성 검사
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(departureTime)) {
      Alert.alert('알림', '시간은 HH:MM 형식으로 입력해주세요. (예: 18:00)');
      return;
    }

    if (!currentUser) {
      Alert.alert('오류', '로그인이 필요합니다.');
      return;
    }

    try {
      const newRequest: TaxiPoolRequest = {
        id: Date.now().toString(),
        authorId: currentUser.id,
        authorName: currentUser.name || '사용자',
        authorRank: currentUser.rank || '병장',
        authorUnit: currentUser.unitName || '1대대 2중대',
        departure: departure.trim(),
        destination: destination.trim(),
        requestedPeople: peopleCount,
        currentPeople: 1,
        departureDate: departureDate,
        departureTime: departureTime,
        contactInfo: contactInfo.trim(),
        additionalInfo: additionalInfo.trim(),
        createdAt: new Date().toLocaleString('ko-KR'),
        status: 'recruiting',
        participants: [currentUser.id]
      };

      // TODO: Firebase에 저장
      // await addTaxiPoolRequest(newRequest);
      
      setRequests(prev => [newRequest, ...prev]);
      
      // 폼 초기화
      resetForm();
      setModalVisible(false);

      Alert.alert('성공', '팟택시 요청이 등록되었습니다!');
    } catch (error) {
      console.error('팟택시 등록 오류:', error);
      Alert.alert('오류', '팟택시 등록에 실패했습니다.');
    }
  };

  const joinTaxiPool = async (requestId: string) => {
    if (!currentUser) {
      Alert.alert('오류', '로그인이 필요합니다.');
      return;
    }

    const request = requests.find(r => r.id === requestId);
    if (!request) return;

    // 자신이 등록한 팟택시에는 참여할 수 없음
    if (request.authorId === currentUser.id) {
      Alert.alert('알림', '본인이 등록한 팟택시에는 참여할 수 없습니다.');
      return;
    }

    // 이미 참여한 경우
    if (request.participants.includes(currentUser.id)) {
      Alert.alert('알림', '이미 참여한 팟택시입니다.');
      return;
    }

    Alert.alert(
      '팟택시 참여',
      '이 팟택시에 참여하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '참여하기', 
          onPress: async () => {
            try {
              setRequests(prev => prev.map(req => {
                if (req.id === requestId && req.currentPeople < req.requestedPeople) {
                  const newCurrentPeople = req.currentPeople + 1;
                  const newParticipants = [...req.participants, currentUser.id];
                  return {
                    ...req,
                    currentPeople: newCurrentPeople,
                    participants: newParticipants,
                    status: newCurrentPeople >= req.requestedPeople ? 'full' : 'recruiting'
                  };
                }
                return req;
              }));
              
              // TODO: Firebase 업데이트
              // await updateTaxiPoolRequest(requestId, { participants, currentPeople, status });
              
              Alert.alert('성공', '팟택시에 참여했습니다!');
            } catch (error) {
              console.error('팟택시 참여 오류:', error);
              Alert.alert('오류', '팟택시 참여에 실패했습니다.');
            }
          }
        }
      ]
    );
  };

  const deleteTaxiPool = (requestId: string) => {
    const request = requests.find(r => r.id === requestId);
    if (!request) return;

    // 본인이 등록한 팟택시만 삭제 가능
    if (request.authorId !== currentUser?.id) {
      Alert.alert('알림', '본인이 등록한 팟택시만 삭제할 수 있습니다.');
      return;
    }

    Alert.alert(
      '팟택시 삭제',
      '정말로 이 팟택시를 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '삭제', 
          style: 'destructive',
          onPress: async () => {
            try {
              setRequests(prev => prev.filter(req => req.id !== requestId));
              
              // TODO: Firebase에서 삭제
              // await deleteTaxiPoolRequest(requestId);
              
              Alert.alert('성공', '팟택시가 삭제되었습니다.');
            } catch (error) {
              console.error('팟택시 삭제 오류:', error);
              Alert.alert('오류', '팟택시 삭제에 실패했습니다.');
            }
          }
        }
      ]
    );
  };

  const resetForm = () => {
    setDeparture('');
    setDestination('');
    setRequestedPeople('');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDepartureDate(tomorrow.toISOString().split('T')[0]);
    setDepartureTime('18:00');
    setContactInfo('');
    setAdditionalInfo('');
  };

  const formatDateTime = (date: string, time: string) => {
    const dateObj = new Date(date);
    const formattedDate = dateObj.toLocaleDateString('ko-KR');
    return `${formattedDate} ${time}`;
  };

  const blurText = (text: string, shouldBlur: boolean) => {
    if (!shouldBlur) return text;
    return text.replace(/./g, '●');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'recruiting': return '#4CAF50';
      case 'full': return '#FF9800';
      case 'completed': return '#9E9E9E';
      default: return '#9E9E9E';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'recruiting': return '모집중';
      case 'full': return '모집완료';
      case 'completed': return '완료';
      default: return '알 수 없음';
    }
  };

  const getTimeOptions = () => {
    const options = [];
    for (let hour = 6; hour <= 23; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        options.push(timeString);
      }
    }
    return options;
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Card style={styles.headerCard}>
          <Card.Content>
            <Title>🚕 팟택시</Title>
            <Text style={styles.subtitle}>
              같은 대대원들과 함께 택시를 타고 이동하세요
            </Text>
            <Text style={styles.description}>
              • 출발지와 목적지가 같은 동료들과 택시비를 나눠내세요{'\n'}
              • 안전하고 경제적인 이동이 가능합니다{'\n'}
              • 대대 내 인원만 참여 가능합니다
            </Text>
          </Card.Content>
        </Card>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3F51B5" />
            <Text style={styles.loadingText}>팟택시 목록을 불러오는 중...</Text>
          </View>
        ) : (
          <View style={styles.requestsContainer}>
            <Text style={styles.sectionTitle}>
              🚖 현재 모집 중인 팟택시 ({requests.filter(r => r.status === 'recruiting').length}건)
            </Text>
            
            {requests.length > 0 ? (
              requests.map((request) => {
                const isAuthor = request.authorId === currentUser?.id;
                const isParticipant = request.participants.includes(currentUser?.id || '');
                const shouldBlurContact = request.status !== 'full' && !isAuthor && !isParticipant;
                
                return (
                  <Card key={request.id} style={styles.requestCard}>
                    <Card.Content>
                      <View style={styles.requestHeader}>
                        <View style={styles.authorInfo}>
                          <Text style={styles.authorName}>
                            {shouldBlurContact ? blurText(request.authorName, true) : `${request.authorRank} ${request.authorName}`}
                          </Text>
                          <Text style={styles.authorUnit}>
                            {shouldBlurContact ? blurText(request.authorUnit, true) : request.authorUnit}
                          </Text>
                        </View>
                        <View style={styles.headerActions}>
                          <Chip 
                            style={[styles.statusChip, { backgroundColor: getStatusColor(request.status) }]}
                            textStyle={styles.statusChipText}
                          >
                            {getStatusText(request.status)}
                          </Chip>
                          {isAuthor && (
                            <IconButton
                              icon="delete"
                              size={20}
                              onPress={() => deleteTaxiPool(request.id)}
                              style={styles.deleteButton}
                            />
                          )}
                        </View>
                      </View>
                      
                      <Divider style={styles.divider} />
                      
                      <View style={styles.routeInfo}>
                        <Text style={styles.routeText}>
                          📍 출발: {request.departure}
                        </Text>
                        <Text style={styles.routeText}>
                          🎯 도착: {request.destination}
                        </Text>
                        <Text style={styles.timeText}>
                          🕐 출발시간: {formatDateTime(request.departureDate, request.departureTime)}
                        </Text>
                      </View>
                      
                      <View style={styles.peopleInfo}>
                        <Text style={styles.peopleText}>
                          👥 인원: {request.currentPeople}/{request.requestedPeople}명
                        </Text>
                        <View style={styles.progressBar}>
                          <View 
                            style={[
                              styles.progressFill, 
                              { width: `${(request.currentPeople / request.requestedPeople) * 100}%` }
                            ]} 
                          />
                        </View>
                      </View>
                      
                      {request.contactInfo && (
                        <Text style={styles.contactText}>
                          📞 연락처: {shouldBlurContact ? blurText(request.contactInfo, true) : request.contactInfo}
                        </Text>
                      )}
                      
                      {request.additionalInfo && (
                        <Text style={styles.additionalText}>
                          💬 {request.additionalInfo}
                        </Text>
                      )}
                      
                      <Text style={styles.createdText}>
                        등록시간: {request.createdAt}
                      </Text>
                      
                      {request.status === 'recruiting' && !isAuthor && (
                        <Button
                          mode="contained"
                          style={styles.joinButton}
                          onPress={() => joinTaxiPool(request.id)}
                          icon="account-plus"
                          disabled={isParticipant}
                        >
                          {isParticipant ? '참여중' : '참여하기'}
                        </Button>
                      )}
                    </Card.Content>
                  </Card>
                );
              })
            ) : (
              <Card style={styles.emptyCard}>
                <Card.Content style={styles.emptyContent}>
                  <Text style={styles.emptyText}>🚕 등록된 팟택시가 없습니다</Text>
                  <Text style={styles.emptySubText}>
                    첫 번째 팟택시를 등록해보세요!
                  </Text>
                </Card.Content>
              </Card>
            )}
          </View>
        )}
      </ScrollView>

      {/* 팟택시 등록 FAB */}
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => setModalVisible(true)}
        label="팟택시 등록"
      />

      {/* 팟택시 등록 모달 */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <ScrollView>
            <Title style={styles.modalTitle}>🚕 팟택시 등록</Title>
            
            <TextInput
              label="출발지 *"
              value={departure}
              onChangeText={setDeparture}
              style={styles.input}
              placeholder="예: 부대 정문, 용산역 등"
            />
            
            <TextInput
              label="목적지 *"
              value={destination}
              onChangeText={setDestination}
              style={styles.input}
              placeholder="예: 강남역, 홍대입구역 등"
            />
            
            <TextInput
              label="구하는 인원 (본인 제외) *"
              value={requestedPeople}
              onChangeText={setRequestedPeople}
              style={styles.input}
              keyboardType="numeric"
              placeholder="1~10명"
            />
            
            <TextInput
              label="출발 날짜 *"
              value={departureDate}
              onChangeText={setDepartureDate}
              style={styles.input}
              placeholder="YYYY-MM-DD (예: 2025-01-15)"
              right={<TextInput.Icon icon="calendar" />}
            />
            
            <TextInput
              label="출발 시간 *"
              value={departureTime}
              onChangeText={setDepartureTime}
              style={styles.input}
              placeholder="HH:MM (예: 18:00)"
              right={<TextInput.Icon icon="clock" />}
            />
            
            <View style={styles.timeHelpContainer}>
              <Text style={styles.timeHelpText}>💡 자주 사용하는 시간:</Text>
              <View style={styles.timeChipsContainer}>
                {['09:00', '12:00', '15:00', '18:00', '21:00'].map((time) => (
                  <Chip
                    key={time}
                    style={styles.timeChip}
                    onPress={() => setDepartureTime(time)}
                    mode={departureTime === time ? 'flat' : 'outlined'}
                  >
                    {time}
                  </Chip>
                ))}
              </View>
            </View>
            
            <TextInput
              label="연락처"
              value={contactInfo}
              onChangeText={setContactInfo}
              style={styles.input}
              placeholder="예: 010-1234-5678"
            />
            
            <TextInput
              label="추가 정보"
              value={additionalInfo}
              onChangeText={setAdditionalInfo}
              style={styles.input}
              multiline
              numberOfLines={3}
              placeholder="함께 가고 싶은 이유나 추가 정보를 입력하세요"
            />
            
            <View style={styles.modalButtons}>
              <Button
                mode="outlined"
                onPress={() => {
                  resetForm();
                  setModalVisible(false);
                }}
                style={styles.cancelButton}
              >
                취소
              </Button>
              <Button
                mode="contained"
                onPress={createTaxiPoolRequest}
                style={styles.submitButton}
              >
                등록하기
              </Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    padding: 10,
  },
  headerCard: {
    marginBottom: 15,
    elevation: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  description: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  requestsContainer: {
    marginBottom: 80,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3F51B5',
    marginBottom: 10,
  },
  requestCard: {
    marginBottom: 10,
    elevation: 2,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  authorUnit: {
    fontSize: 12,
    color: '#666',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusChip: {
    marginLeft: 10,
  },
  statusChipText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  deleteButton: {
    margin: 0,
    marginLeft: 5,
  },
  divider: {
    marginVertical: 10,
  },
  routeInfo: {
    marginBottom: 10,
  },
  routeText: {
    fontSize: 14,
    marginBottom: 3,
  },
  timeText: {
    fontSize: 14,
    color: '#3F51B5',
    fontWeight: 'bold',
  },
  peopleInfo: {
    marginBottom: 10,
  },
  peopleText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  contactText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 5,
  },
  additionalText: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 5,
  },
  createdText: {
    fontSize: 11,
    color: '#999',
    marginBottom: 10,
  },
  joinButton: {
    marginTop: 5,
  },
  emptyCard: {
    elevation: 2,
  },
  emptyContent: {
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 10,
    maxHeight: '80%',
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    marginBottom: 15,
  },
  timeHelpContainer: {
    marginBottom: 15,
  },
  timeHelpText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  timeChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    marginRight: 10,
  },
  submitButton: {
    flex: 1,
    marginLeft: 10,
  },
});

export default TaxiPoolScreen; 