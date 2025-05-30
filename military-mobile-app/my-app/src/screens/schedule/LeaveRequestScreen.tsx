import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, Platform, TouchableOpacity, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { TextInput, Button, ActivityIndicator, HelperText, Divider, Chip, IconButton } from 'react-native-paper';
import { httpsCallable } from 'firebase/functions'; // Firebase Functions 호출
import { functions } from '../../firebase/config'; // 직접 functions 객체 가져오기
import DateTimePickerModal from 'react-native-modal-datetime-picker'; // 날짜/시간 선택기
import RNPickerSelect from 'react-native-picker-select'; // 선택 박스
import { format, differenceInCalendarDays, isValid, parseISO, addDays } from 'date-fns'; // 날짜 계산 및 형식

// 휴가 타입 인터페이스
interface LeaveType {
  id: string;
  name: string;
  days: number;
  remainingDays: number;
}

// 휴가 선택 아이템
interface SelectedLeave {
  leaveTypeId: string;
  name: string;
  daysSelected: number;
  remainingDays: number;
}

const LeaveRequestScreen: React.FC = () => {
  const navigation = useNavigation();

  // 입력 상태 관리
  const [startDate, setStartDate] = useState<Date | null>(null); // 시작 날짜+시간
  const [endDate, setEndDate] = useState<Date | null>(null);     // 종료 날짜+시간
  const [reason, setReason] = useState('');
  const [destination, setDestination] = useState(''); // 목적지
  const [contact, setContact] = useState(''); // 연락처
  const [reviewerName, setReviewerName] = useState(''); // 검토자 이름
  const [approverName, setApproverName] = useState(''); // 승인자 이름

  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [isTimePickerVisible, setTimePickerVisibility] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date'); // 현재 선택기 모드
  const [targetDate, setTargetDate] = useState<'start' | 'end' | null>(null); // 어느 날짜/시간을 설정 중인지

  const [totalDuration, setTotalDuration] = useState<number>(0); // 총 휴가 일수
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 휴가 종류 상태
  const [availableLeaveTypes, setAvailableLeaveTypes] = useState<LeaveType[]>([]);
  const [selectedLeaves, setSelectedLeaves] = useState<SelectedLeave[]>([]);
  const [selectedLeaveType, setSelectedLeaveType] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState(1);
  
  // Firebase 함수
  const getUserLeaveTypes = httpsCallable(functions, 'getUserLeaveTypes');
  const requestLeave = httpsCallable(functions, 'requestLeave');

  // 컴포넌트 마운트 시 사용자의 휴가 종류 로드
  useEffect(() => {
    const loadLeaveTypes = async () => {
      try {
        const result = await getUserLeaveTypes();
        const data = result.data as { leaveTypes: LeaveType[] };
        
        if (data && Array.isArray(data.leaveTypes)) {
          // 사용 가능한 휴가만 필터링 (남은 일수가 0보다 큰 것)
          const usableLeaves = data.leaveTypes.filter(leave => leave.remainingDays > 0);
          setAvailableLeaveTypes(usableLeaves);
        } else {
          console.error("Invalid leave types data received");
          setError("휴가 데이터를 불러오는데 실패했습니다");
        }
      } catch (error) {
        console.error("Error loading leave types:", error);
        setError("휴가 데이터를 불러오는데 실패했습니다");
      } finally {
        setInitialLoading(false);
      }
    };
    
    loadLeaveTypes();
  }, []);

  // 날짜/시간 선택기 관련 함수
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

  const hideDatePicker = () => {
    setDatePickerVisibility(false);
    setTargetDate(null);
  };

  const hideTimePicker = () => {
    setTimePickerVisibility(false);
    setTargetDate(null);
  };

  const handleDateConfirm = (selectedDate: Date) => {
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

  const handleTimeConfirm = (selectedTime: Date) => {
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
  
  // 총 휴가 일수 계산
  const updateTotalDuration = () => {
    if (startDate && endDate) {
      // 날짜 차이 계산 (종료일 - 시작일 + 1)
      const days = differenceInCalendarDays(endDate, startDate) + 1;
      setTotalDuration(days > 0 ? days : 0);
    } else {
      setTotalDuration(0);
    }
  };
  
  // 시작일/종료일 변경 시 총 일수 업데이트
  useEffect(() => {
    updateTotalDuration();
  }, [startDate, endDate]);
  
  // 휴가 종류 추가
  const handleAddLeaveType = () => {
    if (!selectedLeaveType || selectedDays <= 0) {
      setError("휴가 종류와 사용일수를 선택해주세요");
      return;
    }
    
    // 선택한 휴가 타입 정보 찾기
    const leaveType = availableLeaveTypes.find(lt => lt.id === selectedLeaveType);
    if (!leaveType) {
      setError("유효하지 않은 휴가 종류입니다");
      return;
    }
    
    // 이미 선택된 같은 종류의 휴가가 있는지 확인
    const existingIndex = selectedLeaves.findIndex(sl => sl.leaveTypeId === selectedLeaveType);
    
    // 남은 일수 체크
    if (selectedDays > leaveType.remainingDays) {
      setError(`${leaveType.name}의 남은 일수(${leaveType.remainingDays}일)를 초과할 수 없습니다`);
      return;
    }
    
    // 전체 선택된 일수가 휴가 기간을 초과하는지 확인
    const currentTotalSelected = selectedLeaves.reduce((sum, item) => sum + item.daysSelected, 0);
    if (currentTotalSelected + selectedDays > totalDuration) {
      setError(`선택한 휴가 일수의 합(${currentTotalSelected + selectedDays}일)이 전체 기간(${totalDuration}일)을 초과합니다`);
      return;
    }
    
    if (existingIndex >= 0) {
      // 이미 있는 경우 일수 업데이트
      const updatedLeaves = [...selectedLeaves];
      const newDaysSelected = updatedLeaves[existingIndex].daysSelected + selectedDays;
      
      // 남은 일수 체크
      if (newDaysSelected > leaveType.remainingDays) {
        setError(`${leaveType.name}의 남은 일수(${leaveType.remainingDays}일)를 초과할 수 없습니다`);
        return;
      }
      
      updatedLeaves[existingIndex] = {
        ...updatedLeaves[existingIndex],
        daysSelected: newDaysSelected
      };
      setSelectedLeaves(updatedLeaves);
    } else {
      // 새로운 휴가 종류 추가
      setSelectedLeaves([
        ...selectedLeaves,
        {
          leaveTypeId: leaveType.id,
          name: leaveType.name,
          daysSelected: selectedDays,
          remainingDays: leaveType.remainingDays
        }
      ]);
    }
    
    // 입력 필드 초기화
    setSelectedLeaveType(null);
    setSelectedDays(1);
    setError(null);
  };
  
  // 휴가 종류 제거
  const handleRemoveLeaveType = (leaveTypeId: string) => {
    setSelectedLeaves(selectedLeaves.filter(leave => leave.leaveTypeId !== leaveTypeId));
  };

  // 선택된 전체 휴가 일수 계산
  const getTotalSelectedDays = () => {
    return selectedLeaves.reduce((sum, item) => sum + item.daysSelected, 0);
  };
  
  // 부족한 휴가 일수 계산
  const getMissingDays = () => {
    const selectedDays = getTotalSelectedDays();
    return totalDuration - selectedDays;
  };

  // 신청 제출 처리
  const handleRequestSubmit = async () => {
    setError(null);

    // 유효성 검사
    if (!startDate) {
      setError('시작 날짜와 시간을 선택해주세요.'); return;
    }
    if (!endDate) {
      setError('종료 날짜와 시간을 선택해주세요.'); return;
    }
    if (startDate > endDate) {
      setError('종료일은 시작일 이후여야 합니다.'); return;
    }
    if (selectedLeaves.length === 0) {
      setError('최소 하나 이상의 휴가 종류를 선택해주세요.'); return;
    }
    if (getTotalSelectedDays() !== totalDuration) {
      setError(`선택한 휴가 일수(${getTotalSelectedDays()}일)가 전체 기간(${totalDuration}일)과 일치해야 합니다.`); return;
    }
    if (!destination) {
      setError('목적지를 입력해주세요.'); return;
    }
    if (!contact) {
      setError('연락처를 입력해주세요.'); return;
    }
    if (!reason) {
      setError('사유를 입력해주세요.'); return;
    }

    setLoading(true);
    
    try {
      // 휴가 신청 API 호출
      setError(null);
      console.log("휴가 신청 시작", {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        duration: totalDuration,
        leaveTypes: selectedLeaves
      });
      
      // 한 번 더 유효성 검사 - 디버깅 목적
      if (!selectedLeaves || selectedLeaves.length === 0) {
        console.error("휴가 신청 오류: 선택된 휴가가 없습니다");
        setError("휴가 종류가 선택되지 않았습니다");
        setLoading(false);
        return;
      }
      
      const response = await requestLeave({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        duration: totalDuration,
        leaveTypes: selectedLeaves.map(leave => ({
          leaveTypeId: leave.leaveTypeId,
          name: leave.name,
          daysSelected: leave.daysSelected
        })),
        destination,
        contact,
        reason,
        reviewerName: reviewerName || undefined,
        approverName: approverName || undefined
      });
      
      console.log("휴가 신청 응답:", response.data);
      
      // 성공 알림
      Alert.alert(
        "휴가 신청 완료",
        "휴가 신청이 성공적으로 등록되었습니다. 승인 결과를 확인해주세요.",
        [{ text: "확인", onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      console.error("휴가 신청 오류:", error);
      console.error("상세 오류 정보:", JSON.stringify(error));
      
      // 오류 메시지 처리 개선
      let errorMsg = "휴가 신청 중 오류가 발생했습니다";
      
      if (error.message) {
        if (error.message.includes("not-found")) {
          errorMsg = "사용자 정보를 찾을 수 없습니다. 관리자에게 문의하세요.";
        } else if (error.message.includes("permission-denied")) {
          errorMsg = "휴가 신청 권한이 없습니다. 관리자에게 문의하세요.";
        } else if (error.message.includes("invalid-argument")) {
          errorMsg = "입력 정보가 올바르지 않습니다. 모든 필드를 확인해주세요.";
        } else {
          errorMsg = `오류: ${error.message}`;
        }
      }
      
      setError(errorMsg);
      
      // 심각한 오류인 경우 알림 표시
      Alert.alert(
        "휴가 신청 오류",
        `${errorMsg}\n\n앱을 다시 시작하거나 관리자에게 문의하세요.`,
        [{ text: "확인" }]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {initialLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066cc" />
          <Text style={styles.loadingText}>휴가 데이터를 불러오는 중...</Text>
        </View>
      ) : (
        <>
          {/* 오류 메시지 */}
          {error && (
            <HelperText type="error" visible={!!error}>
              {error}
            </HelperText>
          )}
          
          {/* --- 시작 날짜/시간 --- */}
          <Text style={styles.label}>시작</Text>
          <View style={styles.dateTimeRow}>
             <TouchableOpacity onPress={() => showDatePicker('start')} style={styles.dateButton}>
                 <Text style={styles.buttonText}>{startDate ? format(startDate, 'yyyy-MM-dd') : '날짜 선택'}</Text>
             </TouchableOpacity>
             <TouchableOpacity onPress={() => showTimePicker('start')} style={styles.timeButton}>
                 <Text style={styles.buttonText}>{startDate ? format(startDate, 'HH:mm') : '시간 선택'}</Text>
             </TouchableOpacity>
          </View>

          {/* --- 종료 날짜/시간 --- */}
          <Text style={styles.label}>복귀</Text>
            <View style={styles.dateTimeRow}>
               <TouchableOpacity onPress={() => showDatePicker('end')} style={styles.dateButton}>
                   <Text style={styles.buttonText}>{endDate ? format(endDate, 'yyyy-MM-dd') : '날짜 선택'}</Text>
               </TouchableOpacity>
               <TouchableOpacity onPress={() => showTimePicker('end')} style={styles.timeButton}>
                   <Text style={styles.buttonText}>{endDate ? format(endDate, 'HH:mm') : '시간 선택'}</Text>
               </TouchableOpacity>
            </View>

          {/* --- 휴가 기간 표시 --- */}
          {startDate && endDate && (
            <View style={styles.durationContainer}>
              <Text style={styles.durationText}>
                휴가 기간: {totalDuration}일
              </Text>
            </View>
          )}
          
          <Divider style={styles.divider} />
          
          {/* --- 휴가 종류 선택 영역 --- */}
          <Text style={styles.sectionTitle}>휴가 종류 선택</Text>
          
          {(startDate && endDate) ? (
            <>
              <View style={styles.leaveTypeSelectionRow}>
                <View style={styles.leaveTypePickerContainer}>
                  <RNPickerSelect
                    placeholder={{ label: "휴가 종류를 선택하세요...", value: null }}
                    onValueChange={(value: string | null) => setSelectedLeaveType(value)}
                    value={selectedLeaveType}
                    items={availableLeaveTypes.map(lt => ({
                      label: `${lt.name} (남은 일수: ${lt.remainingDays}일)`,
                      value: lt.id
                    }))}
                    style={pickerSelectStyles}
                    useNativeAndroidPickerStyle={false}
                  />
                </View>
                
                <View style={styles.daysInputContainer}>
                  <TextInput
                    label="일수"
                    keyboardType="number-pad"
                    value={selectedDays.toString()}
                    onChangeText={(text) => setSelectedDays(parseInt(text) || 0)}
                    style={styles.daysInput}
                    mode="outlined"
                  />
                </View>
                
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={handleAddLeaveType}
                  disabled={!selectedLeaveType || selectedDays <= 0}
                >
                  <Text style={styles.addButtonText}>추가</Text>
                </TouchableOpacity>
              </View>
              
              {/* 선택된 휴가 목록 */}
              {selectedLeaves.length > 0 && (
                <View style={styles.selectedLeavesContainer}>
                  <Text style={styles.selectedLeavesTitle}>선택된 휴가</Text>
                  
                  {selectedLeaves.map((leave, index) => (
                    <View key={index} style={styles.selectedLeaveItem}>
                      <View style={styles.selectedLeaveInfo}>
                        <Text style={styles.selectedLeaveName}>{leave.name}</Text>
                        <Text style={styles.selectedLeaveDays}>{leave.daysSelected}일</Text>
                      </View>
                      <IconButton
                        icon="close"
                        size={20}
                        onPress={() => handleRemoveLeaveType(leave.leaveTypeId)}
                      />
                    </View>
                  ))}
                  
                  <View style={styles.totalSummary}>
                    <Text style={styles.totalSummaryText}>
                      선택됨: {getTotalSelectedDays()}일 / 필요: {totalDuration}일
                    </Text>
                    {getMissingDays() > 0 && (
                      <Text style={styles.missingDaysText}>
                        {getMissingDays()}일이 부족합니다
                      </Text>
                    )}
                    {getMissingDays() < 0 && (
                      <Text style={styles.tooManyDaysText}>
                        {Math.abs(getMissingDays())}일이 초과되었습니다
                      </Text>
                    )}
                  </View>
                </View>
              )}
            </>
          ) : (
            <Text style={styles.warningText}>
              휴가 시작일과 종료일을 먼저 선택해주세요
            </Text>
          )}
          
          <Divider style={styles.divider} />
          
          {/* --- 목적지 입력 --- */}
          <TextInput
            label="목적지"
            value={destination}
            onChangeText={setDestination}
            style={styles.input}
            mode="outlined"
          />
          
          {/* --- 연락처 입력 --- */}
          <TextInput
            label="연락처"
            value={contact}
            onChangeText={setContact}
            style={styles.input}
            mode="outlined"
            keyboardType="phone-pad"
          />
          
          {/* --- 사유 입력 --- */}
          <TextInput
            label="사유"
            value={reason}
            onChangeText={setReason}
            style={styles.input}
            mode="outlined"
            multiline
            numberOfLines={3}
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
          
          {/* 제출 버튼 */}
          <Button
            mode="contained"
            onPress={handleRequestSubmit}
            disabled={loading || getMissingDays() !== 0}
            loading={loading}
            style={styles.submitButton}
          >
            휴가 신청
          </Button>
          
          {/* DateTimePicker 컴포넌트 */}
          <DateTimePickerModal
            isVisible={isDatePickerVisible}
            mode="date"
            onConfirm={handleDateConfirm}
            onCancel={() => setDatePickerVisibility(false)}
            minimumDate={
              targetDate === 'end' && startDate
                ? startDate
                : undefined
            }
          />
          
          {/* TimePicker 컴포넌트 */}
          <DateTimePickerModal
            isVisible={isTimePickerVisible}
            mode="time"
            onConfirm={handleTimeConfirm}
            onCancel={() => setTimePickerVisibility(false)}
          />
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 16,
  },
  input: {
    marginVertical: 8,
    backgroundColor: '#f9f9f9',
  },
  dateTimeRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  dateButton: {
    flex: 2,
    backgroundColor: '#f0f0f0',
    padding: 12,
    marginRight: 8,
    borderRadius: 4,
    alignItems: 'center',
  },
  timeButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
  },
  submitButton: {
    marginTop: 24,
    marginBottom: 32,
    paddingVertical: 8,
  },
  divider: {
    marginVertical: 16,
  },
  durationContainer: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 4,
    marginTop: 8,
  },
  durationText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  leaveTypeSelectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  leaveTypePickerContainer: {
    flex: 3,
    marginRight: 8,
  },
  daysInputContainer: {
    flex: 1,
    marginRight: 8,
  },
  daysInput: {
    backgroundColor: '#f9f9f9',
  },
  addButton: {
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  selectedLeavesContainer: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 4,
    marginBottom: 16,
  },
  selectedLeavesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  selectedLeaveItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 8,
    borderRadius: 4,
    marginVertical: 4,
  },
  selectedLeaveInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectedLeaveName: {
    fontSize: 16,
    flex: 1,
  },
  selectedLeaveDays: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  totalSummary: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#e3f2fd',
    borderRadius: 4,
  },
  totalSummaryText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  missingDaysText: {
    color: 'red',
    textAlign: 'center',
    marginTop: 4,
  },
  tooManyDaysText: {
    color: 'orange',
    textAlign: 'center',
    marginTop: 4,
  },
  warningText: {
    color: '#ff9800',
    textAlign: 'center',
    padding: 16,
  },
});

// RNPickerSelect 스타일
const pickerSelectStyles = {
  inputIOS: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'gray',
    borderRadius: 4,
    color: 'black',
    paddingRight: 30, // 아이콘 공간
    backgroundColor: '#f9f9f9',
  },
  inputAndroid: {
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'gray',
    borderRadius: 8,
    color: 'black',
    paddingRight: 30, // 아이콘 공간
    backgroundColor: '#f9f9f9',
  },
};

export default LeaveRequestScreen; 