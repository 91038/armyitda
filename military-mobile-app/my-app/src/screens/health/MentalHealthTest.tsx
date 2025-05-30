import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { Text, Card, Title, Button, RadioButton, ProgressBar, Divider, Paragraph } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { saveMentalHealthTestResult, MentalHealthTestResult } from '../../firebase';
import { Timestamp } from 'firebase/firestore';

// 심리 테스트 질문 목록
const mentalHealthQuestions = [
  {
    id: 1,
    question: '최근 2주간 군 생활에 적응하는 데 어려움을 느끼고 있나요?',
    options: [
      { value: 0, label: '전혀 그렇지 않다' },
      { value: 1, label: '가끔 그렇다' },
      { value: 2, label: '자주 그렇다' },
      { value: 3, label: '항상 그렇다' }
    ]
  },
  {
    id: 2,
    question: '최근 2주간 부대 내 인간관계에서 스트레스를 받고 있나요?',
    options: [
      { value: 0, label: '전혀 그렇지 않다' },
      { value: 1, label: '가끔 그렇다' },
      { value: 2, label: '자주 그렇다' },
      { value: 3, label: '항상 그렇다' }
    ]
  },
  {
    id: 3,
    question: '최근 2주간 무기력하거나 우울한 기분이 지속되나요?',
    options: [
      { value: 0, label: '전혀 그렇지 않다' },
      { value: 1, label: '가끔 그렇다' },
      { value: 2, label: '자주 그렇다' },
      { value: 3, label: '항상 그렇다' }
    ]
  },
  {
    id: 4,
    question: '최근 2주간 수면에 어려움을 겪고 있나요?',
    options: [
      { value: 0, label: '전혀 그렇지 않다' },
      { value: 1, label: '가끔 그렇다' },
      { value: 2, label: '자주 그렇다' },
      { value: 3, label: '항상 그렇다' }
    ]
  },
  {
    id: 5,
    question: '최근 2주간 자신이 가치 없다고 느끼거나 자책한 적이 있나요?',
    options: [
      { value: 0, label: '전혀 그렇지 않다' },
      { value: 1, label: '가끔 그렇다' },
      { value: 2, label: '자주 그렇다' },
      { value: 3, label: '항상 그렇다' }
    ]
  },
  {
    id: 6,
    question: '최근 2주간 집중하기 어렵거나 결정을 내리기 어려운 상태였나요?',
    options: [
      { value: 0, label: '전혀 그렇지 않다' },
      { value: 1, label: '가끔 그렇다' },
      { value: 2, label: '자주 그렇다' },
      { value: 3, label: '항상 그렇다' }
    ]
  },
  {
    id: 7,
    question: '최근 2주간 신체적으로 불편한 증상(두통, 소화불량 등)이 있었나요?',
    options: [
      { value: 0, label: '전혀 그렇지 않다' },
      { value: 1, label: '가끔 그렇다' },
      { value: 2, label: '자주 그렇다' },
      { value: 3, label: '항상 그렇다' }
    ]
  },
  {
    id: 8,
    question: '최근 2주간 식욕이나 체중에 변화가 있었나요?',
    options: [
      { value: 0, label: '전혀 그렇지 않다' },
      { value: 1, label: '가끔 그렇다' },
      { value: 2, label: '자주 그렇다' },
      { value: 3, label: '항상 그렇다' }
    ]
  },
  {
    id: 9,
    question: '최근 2주간 자해나 자살에 대한 생각이 든 적이 있나요?',
    options: [
      { value: 0, label: '전혀 그렇지 않다' },
      { value: 1, label: '가끔 그렇다' },
      { value: 2, label: '자주 그렇다' },
      { value: 3, label: '항상 그렇다' }
    ]
  },
  {
    id: 10,
    question: '최근 2주간 군 생활에서 목표나 의미를 찾기 어려웠나요?',
    options: [
      { value: 0, label: '전혀 그렇지 않다' },
      { value: 1, label: '가끔 그렇다' },
      { value: 2, label: '자주 그렇다' },
      { value: 3, label: '항상 그렇다' }
    ]
  }
];

const MentalHealthTest: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ questionId: number; answer: number }[]>([]);
  const [selectedValue, setSelectedValue] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [testResult, setTestResult] = useState<{
    score: number;
    status: 'danger' | 'caution' | 'good';
    message: string;
  } | null>(null);
  
  const currentQuestion = mentalHealthQuestions[currentQuestionIndex];
  const progress = (currentQuestionIndex) / mentalHealthQuestions.length;
  
  // 다음 질문으로 이동
  const handleNext = () => {
    if (selectedValue === null) {
      Alert.alert('알림', '답변을 선택해주세요.');
      return;
    }
    
    // 현재 답변 저장
    const newAnswers = [...answers];
    const existingIndex = newAnswers.findIndex(a => a.questionId === currentQuestion.id);
    
    if (existingIndex >= 0) {
      newAnswers[existingIndex].answer = selectedValue;
    } else {
      newAnswers.push({ questionId: currentQuestion.id, answer: selectedValue });
    }
    
    setAnswers(newAnswers);
    
    // 다음 질문으로 이동하거나 결과 계산
    if (currentQuestionIndex < mentalHealthQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedValue(null); // 선택 초기화
    } else {
      calculateResult(newAnswers);
    }
  };
  
  // 이전 질문으로 이동
  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      
      // 이전에 선택한 값 복원
      const prevAnswer = answers.find(a => a.questionId === mentalHealthQuestions[currentQuestionIndex - 1].id);
      setSelectedValue(prevAnswer ? prevAnswer.answer : null);
    }
  };
  
  // 결과 계산
  const calculateResult = (finalAnswers: { questionId: number; answer: number }[]) => {
    // 총점 계산
    const totalScore = finalAnswers.reduce((sum, answer) => sum + answer.answer, 0);
    
    // 상태 결정 (0-30점 범위)
    let status: 'danger' | 'caution' | 'good';
    let message: string;
    
    if (totalScore >= 20) {
      status = 'danger';
      message = '위험 상태: 심리적 어려움이 있을 수 있습니다. 즉시 전문가의 상담이 필요합니다.';
    } else if (totalScore >= 10) {
      status = 'caution';
      message = '주의 상태: 경미한 심리적 어려움이 있을 수 있습니다. 상담을 고려해보세요.';
    } else {
      status = 'good';
      message = '양호 상태: 현재 심리 상태가 안정적입니다. 지속적인 자기 관리를 권장합니다.';
    }
    
    const result = { score: totalScore, status, message };
    setTestResult(result);
    setShowResult(true);
    
    // 결과 자동 저장 시작
    if (user) {
      autoSaveTestResult(result, finalAnswers);
    }
  };
  
  // 테스트 결과 자동 저장
  const autoSaveTestResult = async (
    result: { score: number; status: 'danger' | 'caution' | 'good'; message: string }, 
    finalAnswers: { questionId: number; answer: number }[]
  ) => {
    if (!user) return;
    
    try {
      setIsSubmitting(true);
      
      const testData: Omit<MentalHealthTestResult, 'id' | 'createdAt'> = {
        userId: user.id,
        userName: user.name,
        unitCode: user.unitCode,
        unitName: user.unitName,
        rank: user.rank,
        testDate: Timestamp.now(),
        score: result.score,
        status: result.status,
        answers: finalAnswers
      };
      
      await saveMentalHealthTestResult(testData);
      
      // 저장 완료 메시지 표시
      Alert.alert(
        '결과 저장 완료',
        '심리 테스트 결과가 자동으로 저장되었습니다.',
        [{ text: '확인' }]
      );
    } catch (error) {
      console.error('테스트 결과 저장 오류:', error);
      Alert.alert('오류', '결과 저장 중 문제가 발생했습니다. 나중에 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // 테스트 다시 시작
  const restartTest = () => {
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setSelectedValue(null);
    setShowResult(false);
    setTestResult(null);
  };
  
  // 결과 화면에서 돌아가기
  const goBack = () => {
    navigation.goBack();
  };
  
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
  
  return (
    <ScrollView style={styles.container}>
      {!showResult ? (
        <Card style={styles.card}>
          <Card.Content>
            <Title>군 심리 건강 테스트</Title>
            <Text style={styles.subtitle}>
              질문 {currentQuestionIndex + 1}/{mentalHealthQuestions.length}
            </Text>
            
            <ProgressBar
              progress={progress}
              color="#3F51B5"
              style={styles.progressBar}
            />
            
            <View style={styles.questionContainer}>
              <Text style={styles.question}>{currentQuestion.question}</Text>
              
              <RadioButton.Group
                onValueChange={(value) => setSelectedValue(Number(value))}
                value={selectedValue !== null ? selectedValue.toString() : ''}
              >
                {currentQuestion.options.map((option) => (
                  <View key={option.value} style={styles.radioOption}>
                    <RadioButton value={option.value.toString()} />
                    <Text onPress={() => setSelectedValue(option.value)}>
                      {option.label}
                    </Text>
                  </View>
                ))}
              </RadioButton.Group>
            </View>
            
            <View style={styles.buttonContainer}>
              <Button
                mode="outlined"
                onPress={handlePrevious}
                disabled={currentQuestionIndex === 0}
                style={[styles.button, styles.buttonOutline]}
              >
                이전
              </Button>
              
              <Button
                mode="contained"
                onPress={handleNext}
                style={styles.button}
              >
                {currentQuestionIndex === mentalHealthQuestions.length - 1 ? '완료' : '다음'}
              </Button>
            </View>
          </Card.Content>
        </Card>
      ) : (
        <Card style={styles.card}>
          <Card.Content>
            <Title>테스트 결과</Title>
            
            <View style={styles.resultContainer}>
              <Text style={styles.resultScore}>
                총점: {testResult?.score}/{mentalHealthQuestions.length * 3}점
              </Text>
              
              <View style={[
                styles.statusIndicator,
                testResult?.status === 'danger' ? styles.statusDanger :
                testResult?.status === 'caution' ? styles.statusCaution :
                styles.statusGood
              ]}>
                <Text style={styles.statusText}>
                  {testResult?.status === 'danger' ? '위험' :
                   testResult?.status === 'caution' ? '주의' : '양호'}
                </Text>
              </View>
              
              <Text style={styles.resultMessage}>{testResult?.message}</Text>
              
              <Divider style={styles.divider} />
              
              <Paragraph style={styles.resultNote}>
                이 테스트 결과는 참고용이며, 정확한 진단을 위해서는 전문가와 상담하시기 바랍니다.
                심리적 어려움이 있는 경우 부대 상담관이나 의무대에 도움을 요청하세요.
              </Paragraph>
            </View>
            
            <View style={styles.buttonContainer}>
              <Button
                mode="outlined"
                onPress={restartTest}
                style={[styles.button, styles.buttonOutline]}
                disabled={isSubmitting}
              >
                다시 시작
              </Button>
              
              <Button
                mode="contained"
                onPress={goBack}
                style={styles.button}
                disabled={isSubmitting}
              >
                {isSubmitting ? '저장 중...' : '확인'}
              </Button>
            </View>
          </Card.Content>
        </Card>
      )}
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
  subtitle: {
    marginTop: 5,
    color: '#666',
    marginBottom: 10,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginVertical: 15,
  },
  questionContainer: {
    marginVertical: 20,
  },
  question: {
    fontSize: 18,
    marginBottom: 20,
    lineHeight: 24,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flex: 1,
    marginHorizontal: 5,
  },
  buttonOutline: {
    borderColor: '#3F51B5',
  },
  resultContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  resultScore: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  statusIndicator: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginVertical: 15,
  },
  statusDanger: {
    backgroundColor: '#f44336',
  },
  statusCaution: {
    backgroundColor: '#ff9800',
  },
  statusGood: {
    backgroundColor: '#4CAF50',
  },
  statusText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  resultMessage: {
    textAlign: 'center',
    marginVertical: 15,
    fontSize: 16,
    lineHeight: 24,
  },
  divider: {
    width: '100%',
    marginVertical: 15,
  },
  resultNote: {
    textAlign: 'center',
    fontStyle: 'italic',
    color: '#666',
  },
});

export default MentalHealthTest; 