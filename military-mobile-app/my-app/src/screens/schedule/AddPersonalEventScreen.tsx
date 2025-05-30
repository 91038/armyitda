import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { Text, TextInput, Button, Appbar, HelperText, ActivityIndicator } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { getAuth } from 'firebase/auth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { format } from 'date-fns';

// 경로 파라미터 타입 정의
type RouteParams = {
  selectedDate?: string; // 캘린더에서 선택한 날짜
};

const AddPersonalEventScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as RouteParams;
  
  // 상태 변수
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState<Date>(
    params?.selectedDate ? new Date(params.selectedDate) : new Date()
  );
  const [endDate, setEndDate] = useState<Date>(
    params?.selectedDate ? new Date(params.selectedDate) : new Date()
  );
  const [isStartDatePickerVisible, setStartDatePickerVisible] = useState(false);
  const [isEndDatePickerVisible, setEndDatePickerVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [titleError, setTitleError] = useState('');
  
  // 날짜 선택 핸들러
  const handleStartDateConfirm = (selectedDate: Date) => {
    setStartDate(selectedDate);
    if (endDate && selectedDate > endDate) {
      setEndDate(selectedDate);
    }
    setStartDatePickerVisible(false);
  };
  
  const handleEndDateConfirm = (selectedDate: Date) => {
    setEndDate(selectedDate);
    setEndDatePickerVisible(false);
  };
  
  // 유효성 검사
  const validateForm = () => {
    let isValid = true;
    
    if (!title.trim()) {
      setTitleError('제목을 입력해주세요');
      isValid = false;
    } else {
      setTitleError('');
    }
    
    return isValid;
  };
  
  // 개인 일정 저장
  const savePersonalEvent = async () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      
      const auth = getAuth();
      const userId = auth.currentUser?.uid;
      
      if (!userId) {
        Alert.alert('오류', '로그인이 필요합니다.');
        return;
      }
      
      // Firestore에 저장할 데이터
      const eventData = {
        userId,
        title,
        description,
        startDate,
        endDate,
        type: 'personal', // 개인 일정 타입
        status: 'personal', // 개인 일정은 승인 필요 없음
        createdAt: serverTimestamp(),
      };
      
      // Firestore에 저장
      await addDoc(collection(db, 'schedules'), eventData);
      
      Alert.alert(
        '성공',
        '개인 일정이 추가되었습니다.',
        [
          { 
            text: '확인', 
            onPress: () => navigation.goBack() 
          }
        ]
      );
    } catch (error) {
      console.error('개인 일정 저장 오류:', error);
      Alert.alert('오류', '개인 일정 저장 중 문제가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="개인 일정 추가" />
      </Appbar.Header>
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <TextInput
          label="제목"
          value={title}
          onChangeText={setTitle}
          style={styles.input}
          error={!!titleError}
        />
        {!!titleError && <HelperText type="error">{titleError}</HelperText>}
        
        <View style={styles.dateContainer}>
          <Text style={styles.dateLabel}>시작일</Text>
          <Button 
            mode="outlined" 
            onPress={() => setStartDatePickerVisible(true)}
            style={styles.dateButton}
          >
            {format(startDate, 'yyyy년 MM월 dd일')}
          </Button>
        </View>
        
        <View style={styles.dateContainer}>
          <Text style={styles.dateLabel}>종료일</Text>
          <Button 
            mode="outlined" 
            onPress={() => setEndDatePickerVisible(true)}
            style={styles.dateButton}
          >
            {format(endDate, 'yyyy년 MM월 dd일')}
          </Button>
        </View>
        
        <TextInput
          label="설명"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          style={styles.input}
        />
        
        <Button 
          mode="contained" 
          onPress={savePersonalEvent} 
          style={styles.saveButton}
          loading={loading}
          disabled={loading}
        >
          일정 저장
        </Button>
      </ScrollView>
      
      {/* 날짜 선택 모달 */}
      <DateTimePickerModal
        isVisible={isStartDatePickerVisible}
        mode="date"
        onConfirm={handleStartDateConfirm}
        onCancel={() => setStartDatePickerVisible(false)}
      />
      
      <DateTimePickerModal
        isVisible={isEndDatePickerVisible}
        mode="date"
        onConfirm={handleEndDateConfirm}
        onCancel={() => setEndDatePickerVisible(false)}
        minimumDate={startDate} // 시작일 이후만 선택 가능
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  input: {
    marginBottom: 16,
    backgroundColor: 'white',
  },
  dateContainer: {
    marginBottom: 16,
  },
  dateLabel: {
    fontSize: 14,
    marginBottom: 8,
    color: '#666',
  },
  dateButton: {
    marginBottom: 8,
  },
  saveButton: {
    marginTop: 24,
    marginBottom: 40,
  },
});

export default AddPersonalEventScreen; 