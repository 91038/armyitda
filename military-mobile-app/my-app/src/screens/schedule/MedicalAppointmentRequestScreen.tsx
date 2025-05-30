import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { TextInput, Button, ActivityIndicator, HelperText, Divider } from 'react-native-paper';
import { getApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { format, isValid, parseISO } from 'date-fns';

// 컴포넌트 이름 변경: OutingRequestScreen -> MedicalAppointmentRequestScreen
const MedicalAppointmentRequestScreen: React.FC = () => {
  const navigation = useNavigation();
  const app = getApp();
  const functions = getFunctions(app, 'asia-northeast3');

  // 입력 상태 관리
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [reason, setReason] = useState('');
  const [location, setLocation] = useState(''); // 진료 장소 상태 추가
  const [reviewerName, setReviewerName] = useState('');
  const [approverName, setApproverName] = useState('');

  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [isTimePickerVisible, setTimePickerVisibility] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [targetDate, setTargetDate] = useState<'start' | 'end' | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestScheduleEvent = httpsCallable(functions, 'requestScheduleEvent');

  // 날짜/시간 선택기 관련 함수 (동일)
  const showDatePicker = (target: 'start' | 'end') => {
    setTargetDate(target);
    setPickerMode('date');
    setDatePickerVisibility(true);
  };

  const showTimePicker = (target: 'start' | 'end') => {
    setTargetDate(target);
    setPickerMode('time');
    setTimePickerVisibility(true);
  };

  const hidePicker = () => {
    setDatePickerVisibility(false);
    setTimePickerVisibility(false);
    setTargetDate(null);
  };

  const handleConfirmDate = (selectedDate: Date) => {
    if (targetDate === 'start') {
      setStartDate(selectedDate);
      if (endDate && selectedDate > endDate) {
        setEndDate(null);
      }
    } else {
      setEndDate(selectedDate);
    }
    setDatePickerVisibility(false);
    setTargetDate(null);
  };

  const handleConfirmTime = (selectedTime: Date) => {
    if (targetDate === 'start') {
      const newStartDate = startDate ? new Date(startDate) : new Date();
      newStartDate.setHours(selectedTime.getHours());
      newStartDate.setMinutes(selectedTime.getMinutes());
      setStartDate(newStartDate);
    } else {
      const newEndDate = endDate ? new Date(endDate) : new Date();
      newEndDate.setHours(selectedTime.getHours());
      newEndDate.setMinutes(selectedTime.getMinutes());
      setEndDate(newEndDate);
    }
    setTimePickerVisibility(false);
    setTargetDate(null);
  };

  // 신청 제출 처리 수정
  const handleRequestSubmit = async () => {
    setError(null);

    // 유효성 검사
    if (!startDate) {
      setError('진료 시작 시간을 선택해주세요.'); return; // 문구 수정
    }
    if (!endDate) {
      setError('복귀 시간을 선택해주세요.'); return;
    }
    if (!location) { // 진료 장소 유효성 검사 추가
       setError('진료 장소를 입력해주세요.'); return;
    }
     if (!reason) {
      setError('외진 사유(진료과목 등)를 입력해주세요.'); return; // 문구 수정
    }
    if (startDate > endDate) {
      setError('복귀 시간은 진료 시작 시간 이후여야 합니다.'); return; // 문구 수정
    }

    setLoading(true);
    try {
      const payload: any = {
        type: 'externalmedical', // 타입 변경 (대소문자 통일)
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        reason: reason,
        location: location, // 진료 장소 추가
        // title 수정: 외진 정보 포함
        title: `외진 신청 (${location}, ${format(startDate, 'MM/dd HH:mm')}~${format(endDate, 'HH:mm')})`,
        reviewerName: reviewerName || null,
        approverName: approverName || null,
      };

      const result = await requestScheduleEvent(payload);
      console.log('Firebase Function result:', result.data);

      if ((result.data as any)?.success === true) {
        Alert.alert('신청 완료', '외진 신청이 성공적으로 접수되었습니다.'); // 문구 수정
        navigation.goBack();
      } else {
        throw new Error((result.data as any)?.message || '함수 응답 오류');
      }

    } catch (err: any) {
      console.error('Error calling requestScheduleEvent function:', err.code, err.message, err.details);
      const errorMessage = err.message || '신청 중 오류가 발생했습니다.';
      setError(errorMessage);
      if (err.code === 'invalid-argument') {
          Alert.alert('오류', `입력 값 오류: ${errorMessage}`);
      } else {
          Alert.alert('오류', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* --- 진료 시작 시간 --- */}
      {/* <Text style={styles.label}>진료 시작 시간</Text> // 라벨 수정 */}
      <Text style={styles.label}>진료 시작 시간</Text>
      <View style={styles.dateTimeRow}>
         <TouchableOpacity onPress={() => showDatePicker('start')} style={styles.dateButton}>
             <Text style={styles.buttonText}>{startDate ? format(startDate, 'yyyy-MM-dd') : '날짜 선택'}</Text>
         </TouchableOpacity>
         <TouchableOpacity onPress={() => showTimePicker('start')} style={styles.timeButton}>
             <Text style={styles.buttonText}>{startDate ? format(startDate, 'HH:mm') : '시간 선택'}</Text>
         </TouchableOpacity>
      </View>

      {/* --- 복귀 시간 --- */}
      <Text style={styles.label}>복귀 시간</Text>
        <View style={styles.dateTimeRow}>
           <TouchableOpacity onPress={() => showDatePicker('end')} style={styles.dateButton}>
               <Text style={styles.buttonText}>{endDate ? format(endDate, 'yyyy-MM-dd') : '날짜 선택'}</Text>
           </TouchableOpacity>
           <TouchableOpacity onPress={() => showTimePicker('end')} style={styles.timeButton}>
               <Text style={styles.buttonText}>{endDate ? format(endDate, 'HH:mm') : '시간 선택'}</Text>
           </TouchableOpacity>
        </View>

      <Divider style={styles.divider} />

      {/* --- 진료 장소 --- */}
      <TextInput
        mode="outlined"
        label="진료 장소 (병원명 등)" // 필드 추가
        value={location}
        onChangeText={setLocation}
        style={styles.input}
      />

      {/* --- 사유 --- */}
      <TextInput
        mode="outlined"
        label="외진 사유 (진료과목 등)" // 라벨 수정
        value={reason}
        onChangeText={setReason}
        multiline
        numberOfLines={3}
        style={styles.input}
      />

      {/* --- 검토자 정보 --- */}
      <Text style={styles.label}>검토자 이름 (선택)</Text>
      <TextInput
        mode="outlined"
        label="검토자 이름"
        value={reviewerName}
        onChangeText={setReviewerName}
        style={styles.input}
      />

      {/* --- 승인자 정보 --- */}
      <Text style={styles.label}>승인자 이름 (선택)</Text>
      <TextInput
        mode="outlined"
        label="승인자 이름"
        value={approverName}
        onChangeText={setApproverName}
        style={styles.input}
      />

      {/* --- 오류 메시지 및 버튼 --- */}
      {error && <HelperText type="error" visible={!!error} style={styles.errorText}>{error}</HelperText>}

      <Button
        mode="contained"
        onPress={handleRequestSubmit}
        style={styles.button}
        disabled={loading}
        loading={loading}
      >
        {loading ? '신청 중...' : '신청하기'}
      </Button>
      <Button
        mode="outlined"
        onPress={() => navigation.goBack()}
        style={styles.button}
        disabled={loading}
      >
        뒤로가기
      </Button>

      {/* --- 날짜/시간 선택 모달 --- */}
      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        onConfirm={handleConfirmDate}
        onCancel={() => setDatePickerVisibility(false)}
        minimumDate={targetDate === 'end' ? startDate || undefined : undefined}
      />
      
      <DateTimePickerModal
        isVisible={isTimePickerVisible}
        mode="time"
        onConfirm={handleConfirmTime}
        onCancel={() => setTimePickerVisibility(false)}
      />
    </ScrollView>
  );
};

// 스타일 유지 (동일)
const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 5,
    color: '#333',
  },
  dateTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  dateButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 5,
  },
  timeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    paddingVertical: 12,
    alignItems: 'center',
    marginLeft: 5,
  },
  buttonText: {
    fontSize: 16,
    color: '#333',
  },
  divider: {
      marginVertical: 20,
  },
  input: {
    marginBottom: 15,
  },
  button: {
    marginTop: 15,
  },
   errorText: {
      marginTop: 5,
      marginBottom: 10,
      fontSize: 14,
      textAlign: 'center',
   }
});

// 컴포넌트 export 이름 변경
export default MedicalAppointmentRequestScreen; 