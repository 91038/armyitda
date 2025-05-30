import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert, Linking } from 'react-native';
import { 
  Text, 
  Card, 
  Title, 
  Paragraph, 
  Button, 
  Chip, 
  ProgressBar, 
  List,
  Divider,
  ActivityIndicator,
  FAB,
  IconButton,
  Portal,
  Dialog,
  TextInput
} from 'react-native-paper';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { 
  getUserSelfDevelopmentGoals, 
  getUserStudyRecords,
  getRecommendedContent,
  addStudyRecord,
  updateSelfDevelopmentGoal,
  SelfDevelopmentGoal,
  StudyRecord,
  RecommendedContent
} from '../../firebase';
import { Timestamp } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

const EducationScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [goals, setGoals] = useState<SelfDevelopmentGoal[]>([]);
  const [studyRecords, setStudyRecords] = useState<StudyRecord[]>([]);
  const [recommendedContent, setRecommendedContent] = useState<RecommendedContent[]>([]);
  const [showStudyTimer, setShowStudyTimer] = useState(false);
  const [studyTitle, setStudyTitle] = useState('');
  const [studyDuration, setStudyDuration] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    loadData();
  }, []);
  
  useEffect(() => {
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [timerInterval]);
  
  const loadData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const [goalsData, recordsData] = await Promise.all([
        getUserSelfDevelopmentGoals(user.id),
        getUserStudyRecords(user.id, 10)
      ]);
      
      setGoals(goalsData);
      setStudyRecords(recordsData);
      
      // 임시 추천 콘텐츠 데이터 (운전병 특화)
      const tempRecommendedContent = [
        {
          id: '1',
          category: 'certificate' as const,
          title: '지게차운전기능사',
          description: '운전병에게 필수! 지게차 운전 자격증으로 전역 후 취업에 유리합니다.',
          imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=200&fit=crop',
          targetAudience: ['운전병', '전체'],
          difficulty: 'beginner' as const,
          estimatedDuration: '2-3개월',
          cost: 150000,
          provider: '한국산업인력공단',
          tags: ['자격증', '운전', '지게차', '취업'],
          isActive: true,
          url: 'https://www.q-net.or.kr/crf005.do?id=crf00505&gSite=Q&gId=',
          createdAt: Timestamp.now()
        },
        {
          id: '2',
          category: 'certificate' as const,
          title: '굴삭기운전기능사',
          description: '건설현장에서 활용도가 높은 굴삭기 운전 자격증입니다.',
          imageUrl: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=300&h=200&fit=crop',
          targetAudience: ['운전병', '전체'],
          difficulty: 'intermediate' as const,
          estimatedDuration: '1-2개월',
          cost: 200000,
          provider: '한국산업인력공단',
          tags: ['자격증', '운전', '굴삭기', '건설'],
          isActive: true,
          url: 'https://www.q-net.or.kr/crf005.do?id=crf00505&gSite=Q&gId=',
          createdAt: Timestamp.now()
        },
        {
          id: '3',
          category: 'course' as const,
          title: '운전면허 2종 대형',
          description: '대형차량 운전이 가능한 2종 대형 면허증 취득 과정입니다.',
          imageUrl: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=300&h=200&fit=crop',
          targetAudience: ['운전병', '전체'],
          difficulty: 'beginner' as const,
          estimatedDuration: '1개월',
          cost: 80000,
          provider: '도로교통공단',
          tags: ['면허', '운전', '대형차', '교육'],
          isActive: true,
          url: 'https://www.safedriving.or.kr/',
          createdAt: Timestamp.now()
        },
        {
          id: '4',
          category: 'certificate' as const,
          title: '자동차정비기능사',
          description: '차량 정비 전문가가 되기 위한 기초 자격증입니다.',
          imageUrl: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=300&h=200&fit=crop',
          targetAudience: ['운전병', '정비병', '전체'],
          difficulty: 'intermediate' as const,
          estimatedDuration: '3-4개월',
          cost: 250000,
          provider: '한국산업인력공단',
          tags: ['자격증', '정비', '자동차', '기술'],
          isActive: true,
          url: 'https://www.q-net.or.kr/crf005.do?id=crf00505&gSite=Q&gId=',
          createdAt: Timestamp.now()
        },
        {
          id: '5',
          category: 'course' as const,
          title: '안전관리자 교육과정',
          description: '산업안전보건법에 따른 안전관리자 양성 교육입니다.',
          imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=200&fit=crop',
          targetAudience: ['운전병', '전체'],
          difficulty: 'advanced' as const,
          estimatedDuration: '2주',
          cost: 120000,
          provider: '안전보건공단',
          tags: ['안전', '관리', '교육', '법정'],
          isActive: true,
          url: 'https://www.kosha.or.kr/',
          createdAt: Timestamp.now()
        }
      ];
      
      setRecommendedContent(tempRecommendedContent);
    } catch (error) {
      console.error('데이터 로딩 오류:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };
  
  const handleMilestoneToggle = async (goal: SelfDevelopmentGoal, milestoneId: string) => {
    if (!goal.id) return;
    
    const updatedMilestones = goal.milestones.map(m => 
      m.id === milestoneId 
        ? { ...m, isCompleted: !m.isCompleted, completedAt: !m.isCompleted ? Timestamp.now() : undefined }
        : m
    );
    
    const completedCount = updatedMilestones.filter(m => m.isCompleted).length;
    const progress = Math.round((completedCount / updatedMilestones.length) * 100);
    
    try {
      await updateSelfDevelopmentGoal(goal.id, {
        milestones: updatedMilestones,
        progress,
        status: progress === 100 ? 'completed' : progress > 0 ? 'in_progress' : 'planning'
      });
      
      await loadData(); // 데이터 새로고침
    } catch (error) {
      console.error('마일스톤 업데이트 오류:', error);
      Alert.alert('오류', '마일스톤 업데이트 중 오류가 발생했습니다.');
    }
  };
  
  const startStudyTimer = () => {
    if (!studyTitle.trim()) {
      Alert.alert('오류', '학습 제목을 입력해주세요.');
      return;
    }
    
    setTimerRunning(true);
    setStudyDuration(0);
    
    // 실제 1분마다 증가하는 타이머 (데모용으로 10초마다 1분 증가)
    const interval = setInterval(() => {
      setStudyDuration(prev => prev + 1);
    }, 10000); // 10초마다 1분 증가 (실제로는 60000으로 설정)
    
    setTimerInterval(interval);
  };
  
  const stopStudyTimer = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    setTimerRunning(false);
  };
  
  const saveStudyRecord = async () => {
    if (!user || !studyTitle.trim() || studyDuration === 0) return;
    
    try {
      const recordData = {
        userId: user.id,
        title: studyTitle,
        category: 'study' as const,
        duration: studyDuration,
        date: Timestamp.now(),
        note: `총 ${studyDuration}분간 학습`
      };
      
      await addStudyRecord(recordData);
      Alert.alert('저장 완료', `${studyDuration}분간의 학습 기록이 저장되었습니다.`);
      
      // 상태 초기화
      setStudyTitle('');
      setStudyDuration(0);
      setShowStudyTimer(false);
      await loadData(); // 데이터 새로고침
    } catch (error) {
      console.error('학습 기록 저장 오류:', error);
      Alert.alert('오류', '학습 기록 저장 중 오류가 발생했습니다.');
    }
  };
  
  const closeStudyTimer = () => {
    if (timerRunning) {
      stopStudyTimer();
    }
    setStudyTitle('');
    setStudyDuration(0);
    setShowStudyTimer(false);
  };
  
  const openExternalLink = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('오류', '링크를 열 수 없습니다.');
    });
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return '#9E9E9E';
      case 'in_progress': return '#ff9800';
      case 'completed': return '#4CAF50';
      case 'cancelled': return '#f44336';
      default: return '#9E9E9E';
    }
  };
  
  const getStatusText = (status: string) => {
    switch (status) {
      case 'planning': return '계획중';
      case 'in_progress': return '진행중';
      case 'completed': return '완료';
      case 'cancelled': return '취소';
      default: return '알 수 없음';
    }
  };
  
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'certificate': return 'certificate';
      case 'skill': return 'code-tags';
      case 'course': return 'school';
      case 'book': return 'book';
      case 'language': return 'translate';
      default: return 'target';
    }
  };
  
  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#3F51B5']}
        />
      }
    >
      {/* 나의 자기계발 목표 */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>나의 자기계발 목표</Title>
          
          {loading ? (
            <ActivityIndicator style={styles.loader} />
          ) : goals.length > 0 ? (
            goals.map((goal, index) => (
              <Card key={goal.id || index} style={styles.goalCard}>
                <Card.Content>
                  <View style={styles.goalHeader}>
                    <View style={styles.goalTitleContainer}>
                      <Title style={styles.goalTitle}>{goal.title}</Title>
                      <Chip 
                        icon={getCategoryIcon(goal.category)}
                        style={[styles.categoryChip, { backgroundColor: getStatusColor(goal.status) }]}
                        textStyle={{ color: 'white' }}
                      >
                        {getStatusText(goal.status)}
                      </Chip>
                    </View>
                    <IconButton
                      icon="pencil"
                      size={20}
                      onPress={() => (navigation as any).navigate('AddGoal', { goal })}
                    />
                  </View>
                  
                  {goal.description && (
                    <Paragraph style={styles.goalDescription}>{goal.description}</Paragraph>
                  )}
                  
                  <View style={styles.goalInfo}>
                    <Chip icon="calendar" style={styles.chip}>
                      목표일: {format(goal.targetDate.toDate(), 'yyyy-MM-dd')}
                    </Chip>
                  </View>
                  
                  <Text style={styles.progressText}>진행률: {goal.progress}%</Text>
                  <ProgressBar 
                    progress={goal.progress / 100} 
                    color="#3F51B5" 
                    style={styles.progressBar} 
                  />
                  
                  {goal.milestones.length > 0 && (
                    <View style={styles.milestoneContainer}>
                      <Text style={styles.milestoneTitle}>마일스톤:</Text>
                      {goal.milestones.map((milestone, idx) => (
                        <View key={milestone.id} style={styles.milestone}>
                          <View style={styles.milestoneContent}>
                            <Text style={[
                              styles.milestoneName,
                              milestone.isCompleted && styles.completedMilestone
                            ]}>
                              {idx + 1}. {milestone.title}
                            </Text>
                          </View>
                          <Chip 
                            style={[
                              styles.statusChip, 
                              milestone.isCompleted ? styles.completedChip : styles.pendingChip
                            ]}
                            onPress={() => handleMilestoneToggle(goal, milestone.id)}
                          >
                            {milestone.isCompleted ? '완료' : '진행중'}
                          </Chip>
                        </View>
                      ))}
                    </View>
                  )}
                </Card.Content>
              </Card>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Paragraph>진행 중인 자기계발 목표가 없습니다.</Paragraph>
              <Button 
                mode="contained" 
                icon="plus" 
                style={styles.addButton}
                onPress={() => (navigation as any).navigate('AddGoal')}
              >
                첫 번째 목표 추가
              </Button>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* 추천 자격증/강의 (운전병 특화) */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Title>운전병 맞춤 추천</Title>
            <Text style={styles.subtitle}>
              🚛 운전병에게 특화된 자격증과 강의입니다
            </Text>
            <Text style={styles.apiNote}>
              * 병과 API 연동 시 모든 병과별 맞춤 추천 제공 예정
            </Text>
          </View>
          
          {recommendedContent.length > 0 ? (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recommendScrollContainer}
              style={styles.recommendScrollView}
            >
              {recommendedContent.map((content, index) => (
                <Card key={content.id || index} style={styles.recommendCard}>
                  <Card.Cover 
                    source={{ uri: content.imageUrl || 'https://via.placeholder.com/300x200' }} 
                    style={styles.recommendImage}
                  />
                  <Card.Content style={styles.recommendContent}>
                    <Title style={styles.recommendTitle} numberOfLines={2}>
                      {content.title}
                    </Title>
                    <Paragraph numberOfLines={3} style={styles.recommendDescription}>
                      {content.description}
                    </Paragraph>
                    
                    <View style={styles.recommendInfo}>
                      {content.estimatedDuration && (
                        <Chip icon="clock" style={styles.infoChip} textStyle={styles.infoChipText}>
                          {content.estimatedDuration}
                        </Chip>
                      )}
                      {content.cost && (
                        <Chip icon="currency-krw" style={styles.infoChip} textStyle={styles.infoChipText}>
                          {content.cost.toLocaleString()}원
                        </Chip>
                      )}
                    </View>
                    
                    <Button
                      mode="outlined"
                      onPress={() => content.url && openExternalLink(content.url)}
                      style={styles.recommendButton}
                      compact
                      labelStyle={styles.recommendButtonText}
                    >
                      자세히 보기
                    </Button>
                  </Card.Content>
                </Card>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyRecommendContainer}>
              <Text style={styles.emptyText}>추천 콘텐츠를 불러오는 중...</Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* 학습 기록 */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Title>학습 기록</Title>
            <Button 
              mode="outlined" 
              icon="timer" 
              style={styles.timerButton}
              onPress={() => setShowStudyTimer(true)}
            >
              학습 시작
            </Button>
          </View>
          
          {studyRecords.length > 0 ? (
            <List.Section>
              {studyRecords.slice(0, 5).map((record, index) => (
                <View key={record.id || index}>
                  <List.Item
                    title={record.title}
                    description={`${record.duration}분 | ${format(record.date.toDate(), 'MM/dd HH:mm', { locale: ko })}`}
                    left={() => <List.Icon icon="book-open" />}
                    right={() => <Text style={styles.durationText}>{record.duration}분</Text>}
                  />
                  {index < Math.min(studyRecords.length, 5) - 1 && <Divider />}
                </View>
              ))}
            </List.Section>
          ) : (
            <Paragraph>아직 학습 기록이 없습니다. 학습 타이머를 시작해보세요!</Paragraph>
          )}
          
          {studyRecords.length > 5 && (
            <Button mode="text" style={styles.moreButton}>
              더 보기 ({studyRecords.length - 5}개)
            </Button>
          )}
        </Card.Content>
      </Card>

      {/* 자기계발비 신청 */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>자기계발비 신청</Title>
          <Paragraph style={styles.fundDescription}>
            📸 영수증만 찍으면 자동으로 정보가 입력되는 간편 신청!
          </Paragraph>
          <Paragraph style={styles.fundSubtitle}>
            기존 나라사랑포털보다 훨씬 간편합니다
          </Paragraph>
          
          <Button 
            mode="contained" 
            icon="receipt" 
            style={styles.button}
            onPress={() => (navigation as any).navigate('SelfDevelopmentFund')}
          >
            자기계발비 신청하기
          </Button>
        </Card.Content>
      </Card>
      
      {/* 학습 타이머 다이얼로그 */}
      <Portal>
        <Dialog visible={showStudyTimer} onDismiss={() => setShowStudyTimer(false)}>
          <Dialog.Title>학습 타이머</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="학습 내용"
              value={studyTitle}
              onChangeText={setStudyTitle}
              style={styles.input}
              placeholder="학습 내용을 입력하세요"
              mode="outlined"
            />
            
            {timerRunning ? (
              <View style={styles.timerContainer}>
                <Text style={styles.timerText}>{studyDuration}분 경과</Text>
                <ActivityIndicator size="large" />
              </View>
            ) : (
              <Button
                mode="contained"
                onPress={startStudyTimer}
                disabled={!studyTitle.trim()}
              >
                학습 시작
              </Button>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={closeStudyTimer}>취소</Button>
            {timerRunning && (
              <Button onPress={() => {
                stopStudyTimer();
                saveStudyRecord();
              }}>완료</Button>
            )}
          </Dialog.Actions>
        </Dialog>
      </Portal>
      
      {/* 플로팅 액션 버튼 */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => (navigation as any).navigate('AddGoal')}
        label="목표 추가"
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 10,
  },
  scrollContent: {
    paddingTop: 50,
    paddingBottom: 100, // 플로팅 액션 버튼을 위한 여유 공간
  },
  card: {
    marginVertical: 12,
    elevation: 2,
  },
  loader: {
    margin: 20,
  },
  goalCard: {
    marginBottom: 15,
    elevation: 3,
    backgroundColor: '#fafafa',
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  goalTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  goalTitle: {
    fontSize: 18,
    marginRight: 10,
    flex: 1,
  },
  goalDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  goalInfo: {
    flexDirection: 'row',
    marginVertical: 10,
    flexWrap: 'wrap',
  },
  chip: {
    marginRight: 8,
    marginBottom: 8,
  },
  categoryChip: {
    marginBottom: 8,
  },
  progressText: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: 'bold',
  },
  progressBar: {
    marginVertical: 10,
    height: 8,
    borderRadius: 4,
  },
  milestoneContainer: {
    marginTop: 15,
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 5,
  },
  milestoneTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  milestone: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  milestoneContent: {
    flex: 1,
  },
  milestoneName: {
    flex: 1,
  },
  completedMilestone: {
    textDecorationLine: 'line-through',
    color: '#666',
  },
  statusChip: {
    height: 24,
  },
  completedChip: {
    backgroundColor: '#4CAF50',
  },
  pendingChip: {
    backgroundColor: '#ff9800',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 20,
  },
  addButton: {
    marginTop: 15,
  },
  sectionHeader: {
    flexDirection: 'column',
    marginBottom: 15,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  apiNote: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 5,
  },
  recommendScrollView: {
    marginHorizontal: -10,
  },
  recommendScrollContainer: {
    paddingHorizontal: 10,
  },
  recommendCard: {
    width: 280,
    marginHorizontal: 8,
    height: 380,
    elevation: 4,
    borderRadius: 12,
  },
  recommendImage: {
    height: 120,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  recommendContent: {
    padding: 16,
    height: 260,
    justifyContent: 'space-between',
  },
  recommendTextSection: {
    flex: 1,
  },
  recommendTitle: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  recommendDescription: {
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
    color: '#666',
  },
  recommendBottomSection: {
    flexDirection: 'column',
    justifyContent: 'flex-end',
  },
  recommendInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    minHeight: 40,
  },
  infoChip: {
    marginRight: 6,
    marginBottom: 6,
    height: 32,
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 4,
  },
  infoChipText: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: '500',
  },
  recommendButton: {
    borderColor: '#3F51B5',
  },
  recommendButtonText: {
    fontSize: 12,
    color: '#3F51B5',
  },
  emptyRecommendContainer: {
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
  },
  timerButton: {
    alignSelf: 'flex-end',
  },
  durationText: {
    fontSize: 14,
    color: '#666',
  },
  moreButton: {
    marginTop: 10,
  },
  fundDescription: {
    fontSize: 16,
    marginBottom: 5,
    textAlign: 'center',
  },
  fundSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
  },
  button: {
    marginTop: 10,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    marginBottom: 16,
  },
  timerContainer: {
    alignItems: 'center',
    padding: 20,
  },
  timerText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#3F51B5',
  },
});

export default EducationScreen; 