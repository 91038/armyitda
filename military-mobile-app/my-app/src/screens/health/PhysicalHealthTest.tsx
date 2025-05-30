import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { Text, Card, Title, Button, RadioButton, ProgressBar, Divider, Paragraph, TextInput } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { savePhysicalHealthTestResult, PhysicalHealthTestResult } from '../../firebase';
import { Timestamp } from 'firebase/firestore';

// 신체건강 테스트 항목 목록
const physicalHealthItems = [
  {
    id: 1,
    category: '신체계측',
    name: '체중',
    unit: 'kg',
    min: 40,
    max: 120,
    defaultValue: 70,
    evaluator: (value: number) => {
      // 간단한 예시 평가 (실제로는 더 복잡한 BMI 계산 등이 필요)
      return { score: 10, status: 'normal' as 'bad' | 'normal' | 'good' };
    }
  },
  {
    id: 2,
    category: '신체계측',
    name: '체지방률',
    unit: '%',
    min: 5,
    max: 40,
    defaultValue: 20,
    evaluator: (value: number) => {
      if (value > 30) return { score: 5, status: 'bad' as 'bad' | 'normal' | 'good' };
      if (value > 25) return { score: 7, status: 'normal' as 'bad' | 'normal' | 'good' };
      return { score: 10, status: 'good' as 'bad' | 'normal' | 'good' };
    }
  },
  {
    id: 3,
    category: '체력측정',
    name: '팔굽혀펴기',
    unit: '회',
    min: 0,
    max: 100,
    defaultValue: 30,
    evaluator: (value: number) => {
      if (value < 20) return { score: 5, status: 'bad' as 'bad' | 'normal' | 'good' };
      if (value < 40) return { score: 8, status: 'normal' as 'bad' | 'normal' | 'good' };
      return { score: 10, status: 'good' as 'bad' | 'normal' | 'good' };
    }
  },
  {
    id: 4,
    category: '체력측정',
    name: '윗몸일으키기',
    unit: '회',
    min: 0,
    max: 100,
    defaultValue: 35,
    evaluator: (value: number) => {
      if (value < 25) return { score: 5, status: 'bad' as 'bad' | 'normal' | 'good' };
      if (value < 45) return { score: 8, status: 'normal' as 'bad' | 'normal' | 'good' };
      return { score: 10, status: 'good' as 'bad' | 'normal' | 'good' };
    }
  },
  {
    id: 5,
    category: '체력측정',
    name: '3km 달리기',
    unit: '분',
    min: 10,
    max: 30,
    defaultValue: 15,
    evaluator: (value: number) => {
      if (value > 20) return { score: 5, status: 'bad' as 'bad' | 'normal' | 'good' };
      if (value > 15) return { score: 8, status: 'normal' as 'bad' | 'normal' | 'good' };
      return { score: 10, status: 'good' as 'bad' | 'normal' | 'good' };
    }
  },
  {
    id: 6,
    category: '건강상태',
    name: '혈압(수축기)',
    unit: 'mmHg',
    min: 90,
    max: 200,
    defaultValue: 120,
    evaluator: (value: number) => {
      if (value > 140 || value < 90) return { score: 5, status: 'bad' as 'bad' | 'normal' | 'good' };
      if (value > 130 || value < 100) return { score: 8, status: 'normal' as 'bad' | 'normal' | 'good' };
      return { score: 10, status: 'good' as 'bad' | 'normal' | 'good' };
    }
  },
  {
    id: 7,
    category: '건강상태',
    name: '혈압(이완기)',
    unit: 'mmHg',
    min: 50,
    max: 120,
    defaultValue: 80,
    evaluator: (value: number) => {
      if (value > 90 || value < 60) return { score: 5, status: 'bad' as 'bad' | 'normal' | 'good' };
      if (value > 85 || value < 65) return { score: 8, status: 'normal' as 'bad' | 'normal' | 'good' };
      return { score: 10, status: 'good' as 'bad' | 'normal' | 'good' };
    }
  },
  {
    id: 8,
    category: '자가진단',
    name: '관절/근육통',
    options: [
      { value: 0, label: '없음' },
      { value: 1, label: '경미함' },
      { value: 2, label: '중간 정도' },
      { value: 3, label: '심각함' }
    ],
    evaluator: (value: number) => {
      if (value >= 3) return { score: 3, status: 'bad' as 'bad' | 'normal' | 'good' };
      if (value >= 1) return { score: 7, status: 'normal' as 'bad' | 'normal' | 'good' };
      return { score: 10, status: 'good' as 'bad' | 'normal' | 'good' };
    }
  },
  {
    id: 9,
    category: '자가진단',
    name: '소화기 증상',
    options: [
      { value: 0, label: '없음' },
      { value: 1, label: '경미함' },
      { value: 2, label: '중간 정도' },
      { value: 3, label: '심각함' }
    ],
    evaluator: (value: number) => {
      if (value >= 3) return { score: 3, status: 'bad' as 'bad' | 'normal' | 'good' };
      if (value >= 1) return { score: 7, status: 'normal' as 'bad' | 'normal' | 'good' };
      return { score: 10, status: 'good' as 'bad' | 'normal' | 'good' };
    }
  },
  {
    id: 10,
    category: '자가진단',
    name: '피로도',
    options: [
      { value: 0, label: '없음' },
      { value: 1, label: '경미함' },
      { value: 2, label: '중간 정도' },
      { value: 3, label: '심각함' }
    ],
    evaluator: (value: number) => {
      if (value >= 3) return { score: 3, status: 'bad' as 'bad' | 'normal' | 'good' };
      if (value >= 1) return { score: 7, status: 'normal' as 'bad' | 'normal' | 'good' };
      return { score: 10, status: 'good' as 'bad' | 'normal' | 'good' };
    }
  }
];

const PhysicalHealthTest: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [values, setValues] = useState<{ id: number; value: number; status: 'bad' | 'normal' | 'good'; score: number }[]>([]);
  const [selectedValue, setSelectedValue] = useState<number | null>(null);
  const [textValue, setTextValue] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [testResult, setTestResult] = useState<{
    score: number;
    status: 'bad' | 'normal' | 'good';
    message: string;
    items: { id: number; category: string; name: string; value: number; status: 'bad' | 'normal' | 'good' }[];
  } | null>(null);
  
  const currentItem = physicalHealthItems[currentItemIndex];
  const progress = (currentItemIndex) / physicalHealthItems.length;
  
  // 다음 항목으로 이동
  const handleNext = () => {
    if (selectedValue === null && textValue === '' && !('defaultValue' in currentItem)) {
      Alert.alert('알림', '값을 입력하거나 선택해주세요.');
      return;
    }
    
    // 현재 값 저장
    let value = 0;
    
    if ('options' in currentItem) {
      // 선택형 항목
      if (selectedValue === null) {
        Alert.alert('알림', '옵션을 선택해주세요.');
        return;
      }
      value = selectedValue;
    } else {
      // 수치 입력형 항목
      if (textValue) {
        value = parseFloat(textValue);
        if (isNaN(value)) {
          Alert.alert('알림', '유효한 숫자를 입력해주세요.');
          return;
        }
        
        // 범위 검증
        if (value < currentItem.min || value > currentItem.max) {
          Alert.alert('알림', `${currentItem.min}에서 ${currentItem.max} 사이의 값을 입력해주세요.`);
          return;
        }
      } else {
        // 기본값 사용
        value = currentItem.defaultValue;
      }
    }
    
    // 평가 실행
    const evaluation = currentItem.evaluator(value);
    
    // 결과 저장
    const newValues = [...values];
    const existingIndex = newValues.findIndex(v => v.id === currentItem.id);
    
    if (existingIndex >= 0) {
      newValues[existingIndex] = { 
        id: currentItem.id, 
        value, 
        status: evaluation.status, 
        score: evaluation.score 
      };
    } else {
      newValues.push({ 
        id: currentItem.id, 
        value, 
        status: evaluation.status, 
        score: evaluation.score 
      });
    }
    
    setValues(newValues);
    
    // 다음 항목으로 이동하거나 결과 계산
    if (currentItemIndex < physicalHealthItems.length - 1) {
      setCurrentItemIndex(currentItemIndex + 1);
      setSelectedValue(null);
      setTextValue('');
      
      // 다음 항목이 수치 입력형인 경우 기본값 설정
      const nextItem = physicalHealthItems[currentItemIndex + 1];
      if (!('options' in nextItem) && 'defaultValue' in nextItem) {
        setTextValue(nextItem.defaultValue.toString());
      }
    } else {
      calculateResult(newValues);
    }
  };
  
  // 이전 항목으로 이동
  const handlePrevious = () => {
    if (currentItemIndex > 0) {
      setCurrentItemIndex(currentItemIndex - 1);
      
      // 이전에 선택/입력한 값 복원
      const prevValue = values.find(v => v.id === physicalHealthItems[currentItemIndex - 1].id);
      const prevItem = physicalHealthItems[currentItemIndex - 1];
      
      if (prevValue) {
        if ('options' in prevItem) {
          setSelectedValue(prevValue.value);
          setTextValue('');
        } else {
          setSelectedValue(null);
          setTextValue(prevValue.value.toString());
        }
      } else {
        setSelectedValue(null);
        setTextValue('');
        
        // 기본값 설정
        if (!('options' in prevItem) && 'defaultValue' in prevItem) {
          setTextValue(prevItem.defaultValue.toString());
        }
      }
    }
  };
  
  // 결과 계산
  const calculateResult = (finalValues: { id: number; value: number; status: 'bad' | 'normal' | 'good'; score: number }[]) => {
    // 총점 계산 (100점 만점)
    const totalScore = Math.round(finalValues.reduce((sum, item) => sum + item.score, 0) / physicalHealthItems.length * 10);
    
    // 각 항목 결과 생성
    const itemResults = finalValues.map(value => {
      const item = physicalHealthItems.find(i => i.id === value.id)!;
      return {
        id: value.id,
        category: item.category,
        name: item.name,
        value: value.value,
        status: value.status
      };
    });
    
    // 종합 상태 결정
    let status: 'bad' | 'normal' | 'good';
    let message: string;
    
    if (totalScore < 60) {
      status = 'bad';
      message = '이상 상태: 신체 건강에 주의가 필요합니다. 의무대 방문을 권장합니다.';
    } else if (totalScore < 80) {
      status = 'normal';
      message = '양호 상태: 전반적인 건강 상태가 양호합니다. 꾸준한 운동을 권장합니다.';
    } else {
      status = 'good';
      message = '건강 상태: 신체 건강 상태가 매우 좋습니다. 현재 상태를 유지하세요.';
    }
    
    const result = { score: totalScore, status, message, items: itemResults };
    setTestResult(result);
    setShowResult(true);
    
    // 결과 자동 저장 시작
    if (user) {
      autoSaveTestResult(result, itemResults);
    }
  };
  
  // 테스트 결과 자동 저장
  const autoSaveTestResult = async (
    result: { score: number; status: 'bad' | 'normal' | 'good'; message: string }, 
    itemResults: { id: number; category: string; name: string; value: number; status: 'bad' | 'normal' | 'good' }[]
  ) => {
    if (!user) return;
    
    try {
      setIsSubmitting(true);
      
      const testData: Omit<PhysicalHealthTestResult, 'id' | 'createdAt'> = {
        userId: user.id,
        userName: user.name,
        unitCode: user.unitCode,
        unitName: user.unitName,
        rank: user.rank,
        testDate: Timestamp.now(),
        score: result.score,
        status: result.status,
        items: itemResults,
        note: ''
      };
      
      await savePhysicalHealthTestResult(testData);
      
      // 저장 완료 메시지 표시
      Alert.alert(
        '결과 저장 완료',
        '신체건강 테스트 결과가 자동으로 저장되었습니다.',
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
    setCurrentItemIndex(0);
    setValues([]);
    setSelectedValue(null);
    setTextValue('');
    setShowResult(false);
    setTestResult(null);
    
    // 첫 항목이 수치 입력형인 경우 기본값 설정
    const firstItem = physicalHealthItems[0];
    if (!('options' in firstItem) && 'defaultValue' in firstItem) {
      setTextValue(firstItem.defaultValue.toString());
    }
  };
  
  // 결과 화면에서 돌아가기
  const goBack = () => {
    navigation.goBack();
  };
  
  // 초기 기본값 설정
  useEffect(() => {
    // 첫 항목이 수치 입력형인 경우 기본값 설정
    const firstItem = physicalHealthItems[0];
    if (!('options' in firstItem) && 'defaultValue' in firstItem) {
      setTextValue(firstItem.defaultValue.toString());
    }
  }, []);
  
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
            <Title>신체건강 테스트</Title>
            <Text style={styles.subtitle}>
              항목 {currentItemIndex + 1}/{physicalHealthItems.length}
            </Text>
            
            <ProgressBar
              progress={progress}
              color="#3F51B5"
              style={styles.progressBar}
            />
            
            <View style={styles.itemContainer}>
              <Text style={styles.category}>{currentItem.category}</Text>
              <Text style={styles.itemName}>{currentItem.name}</Text>
              
              {'options' in currentItem ? (
                <RadioButton.Group
                  onValueChange={(value) => setSelectedValue(Number(value))}
                  value={selectedValue !== null ? selectedValue.toString() : ''}
                >
                  {currentItem.options!.map((option) => (
                    <View key={option.value} style={styles.radioOption}>
                      <RadioButton value={option.value.toString()} />
                      <Text onPress={() => setSelectedValue(option.value)}>
                        {option.label}
                      </Text>
                    </View>
                  ))}
                </RadioButton.Group>
              ) : (
                <View style={styles.inputContainer}>
                  <TextInput
                    label={`${currentItem.name} (${currentItem.unit})`}
                    value={textValue}
                    onChangeText={setTextValue}
                    keyboardType="numeric"
                    style={styles.input}
                    right={<TextInput.Affix text={currentItem.unit} />}
                  />
                  <Text style={styles.inputHelp}>
                    유효 범위: {currentItem.min} - {currentItem.max} {currentItem.unit}
                  </Text>
                </View>
              )}
            </View>
            
            <View style={styles.buttonContainer}>
              <Button
                mode="outlined"
                onPress={handlePrevious}
                disabled={currentItemIndex === 0}
                style={[styles.button, styles.buttonOutline]}
              >
                이전
              </Button>
              
              <Button
                mode="contained"
                onPress={handleNext}
                style={styles.button}
              >
                {currentItemIndex === physicalHealthItems.length - 1 ? '완료' : '다음'}
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
                종합 점수: {testResult?.score}/100점
              </Text>
              
              <View style={[
                styles.statusIndicator,
                testResult?.status === 'bad' ? styles.statusBad :
                testResult?.status === 'normal' ? styles.statusNormal :
                styles.statusGood
              ]}>
                <Text style={styles.statusText}>
                  {testResult?.status === 'bad' ? '이상' :
                   testResult?.status === 'normal' ? '양호' : '건강'}
                </Text>
              </View>
              
              <Text style={styles.resultMessage}>{testResult?.message}</Text>
              
              <Divider style={styles.divider} />
              
              <Title style={styles.detailTitle}>세부 항목 결과</Title>
              
              {testResult?.items.map((item, index) => (
                <View key={item.id} style={styles.itemResult}>
                  <View style={styles.itemResultHeader}>
                    <Text style={styles.itemResultName}>{item.name}</Text>
                    <View style={[
                      styles.itemStatusIndicator,
                      item.status === 'bad' ? styles.statusBad :
                      item.status === 'normal' ? styles.statusNormal :
                      styles.statusGood
                    ]}>
                      <Text style={styles.itemStatusText}>
                        {item.status === 'bad' ? '이상' :
                        item.status === 'normal' ? '양호' : '건강'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.itemResultValue}>
                    측정값: {item.value} {
                      'unit' in physicalHealthItems.find(i => i.id === item.id)! 
                      ? (physicalHealthItems.find(i => i.id === item.id) as any).unit 
                      : ''
                    }
                  </Text>
                  {index < testResult.items.length - 1 && <Divider style={styles.itemDivider} />}
                </View>
              ))}
              
              <Divider style={styles.divider} />
              
              <Paragraph style={styles.resultNote}>
                이 테스트 결과는 참고용이며, 정확한 진단을 위해서는 의무대 검진을 받으시기 바랍니다.
                건강 이상이 있는 경우 부대 의무대에 문의하세요.
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
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  progressBar: {
    marginBottom: 15,
    height: 8,
    borderRadius: 4,
  },
  itemContainer: {
    marginVertical: 15,
  },
  category: {
    fontSize: 12,
    color: '#3F51B5',
    marginBottom: 5,
    fontWeight: 'bold',
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputContainer: {
    marginVertical: 10,
  },
  input: {
    backgroundColor: '#fff',
    marginBottom: 5,
  },
  inputHelp: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
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
    marginVertical: 15,
  },
  resultScore: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  statusIndicator: {
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 15,
  },
  statusBad: {
    backgroundColor: '#FFEBEE',
  },
  statusNormal: {
    backgroundColor: '#FFF9C4',
  },
  statusGood: {
    backgroundColor: '#E8F5E9',
  },
  statusText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  resultMessage: {
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 20,
  },
  divider: {
    marginVertical: 15,
  },
  detailTitle: {
    fontSize: 16,
    marginBottom: 10,
  },
  itemResult: {
    marginBottom: 10,
  },
  itemResultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  itemResultName: {
    fontWeight: 'bold',
  },
  itemStatusIndicator: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
  },
  itemStatusText: {
    fontSize: 12,
  },
  itemResultValue: {
    fontSize: 14,
    color: '#666',
  },
  itemDivider: {
    marginVertical: 10,
  },
  resultNote: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

export default PhysicalHealthTest; 