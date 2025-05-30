import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { TextInput, Button, Title, Divider, HelperText, Text } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import { useDispatch, useSelector } from 'react-redux';
import { register } from '../../store/slices/authSlice';
import { AppDispatch, RootState } from '../../store';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { format } from 'date-fns';

// 부대 코드 목록 (예시 데이터)
const unitCodes = [
  { code: '11023', name: '1사단 1연대 2중대' },
  { code: '11033', name: '1사단 1연대 3중대' },
  { code: '12013', name: '1사단 2연대 1중대' },
  { code: '21023', name: '2사단 1연대 2중대' },
  { code: '31013', name: '3사단 1연대 1중대' },
  { code: '31023', name: '3사단 1연대 2중대' },
];

const RegisterScreen: React.FC = ({ navigation }: any) => {
  // Redux dispatch 및 상태
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((state: RootState) => state.auth);

  // 컴포넌트 마운트 시 navigation 객체 확인
  useEffect(() => {
    console.log('RegisterScreen이 마운트됨');
    console.log('Navigation 객체:', navigation);
  }, [navigation]);

  const [militaryId, setMilitaryId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [rank, setRank] = useState('');
  const [unitCode, setUnitCode] = useState('');
  const [enlistmentDate, setEnlistmentDate] = useState<Date | null>(null);
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  
  // 오류 상태 표시
  useEffect(() => {
    if (error) {
      Alert.alert('오류', error);
    }
  }, [error]);

  // 날짜 선택기 관련 함수
  const showDatePicker = () => {
    setDatePickerVisibility(true);
  };

  const hideDatePicker = () => {
    setDatePickerVisibility(false);
  };

  const handleDateConfirm = (selectedDate: Date) => {
    setEnlistmentDate(selectedDate);
    setDatePickerVisibility(false);
  };

  // 간단한 유효성 검증
  const passwordsMatch = () => password === confirmPassword;
  const isMilitaryIdValid = () => militaryId.length === 11;

  const handleRegister = async () => {
    console.log('회원가입 버튼 클릭됨');
    
    // 입력값 검증
    if (!militaryId || !password || !confirmPassword || !name || !rank || !unitCode || !enlistmentDate) {
      Alert.alert('오류', '모든 필드를 입력해주세요.');
      return;
    }

    if (!isMilitaryIdValid()) {
      Alert.alert('오류', '군번은 11자리로 입력해주세요.');
      return;
    }

    if (!passwordsMatch()) {
      Alert.alert('오류', '비밀번호가 일치하지 않습니다.');
      return;
    }

    try {
      // 선택한 부대 이름 찾기
      const selectedUnit = unitCodes.find(unit => unit.code === unitCode);
      
      if (!selectedUnit) {
        Alert.alert('오류', '유효한 부대를 선택해주세요.');
        return;
      }
      
      // Firebase 회원가입 호출
      const resultAction = await dispatch(register({
        militaryId,
        password,
        name,
        rank,
        unitCode,
        unitName: selectedUnit.name,
        enlistmentDate
      }));
      
      if (register.fulfilled.match(resultAction)) {
        Alert.alert(
          '회원가입 성공',
          '회원가입이 완료되었습니다. 자동으로 메인 화면으로 이동합니다.',
          [{ 
            text: '확인', 
            onPress: () => {
              console.log('회원가입 성공 후 확인 버튼 클릭됨');
              // 여기서 Login으로 이동할 필요 없음 - AppNavigator가 상태 변경에 따라 자동으로 Main 화면으로 전환
            }
          }]
        );
      }
    } catch (error: any) {
      Alert.alert('오류', error.message || '회원가입 중 오류가 발생했습니다.');
    }
  };

  const ranks = [
    '이병', '일병', '상병', '병장',
    '하사', '중사', '상사', '원사',
    '소위', '중위', '대위', '소령', '중령', '대령',
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Title style={styles.title}>회원가입</Title>
        <Divider style={styles.divider} />

        <TextInput
          label="군번"
          value={militaryId}
          onChangeText={setMilitaryId}
          mode="outlined"
          style={styles.input}
          autoCapitalize="none"
          keyboardType="number-pad"
          maxLength={11}
        />
        <HelperText type="info" visible={true}>
          11자리 군번을 입력하세요
        </HelperText>

        <TextInput
          label="이름"
          value={name}
          onChangeText={setName}
          mode="outlined"
          style={styles.input}
        />

        <View style={styles.pickerContainer}>
          <Title style={styles.pickerLabel}>계급</Title>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={rank}
              onValueChange={(itemValue: string) => setRank(itemValue)}
              style={styles.picker}
            >
              <Picker.Item label="계급 선택" value="" />
              {ranks.map((r) => (
                <Picker.Item key={r} label={r} value={r} />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.pickerContainer}>
          <Title style={styles.pickerLabel}>소속 부대</Title>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={unitCode}
              onValueChange={(itemValue: string) => setUnitCode(itemValue)}
              style={styles.picker}
            >
              <Picker.Item label="소속 부대 선택" value="" />
              {unitCodes.map((unit) => (
                <Picker.Item key={unit.code} label={unit.name} value={unit.code} />
              ))}
            </Picker>
          </View>
        </View>
        <HelperText type="info" visible={true}>
          소속 부대가 목록에 없는 경우 관리자에게 문의하세요
        </HelperText>

        {/* 입대일 선택 */}
        <View style={styles.datePickerContainer}>
          <Title style={styles.pickerLabel}>입대일</Title>
          <Button 
            mode="outlined" 
            onPress={showDatePicker} 
            style={styles.dateButton}
          >
            {enlistmentDate ? format(enlistmentDate, 'yyyy-MM-dd') : '입대일 선택'}
          </Button>
          <DateTimePickerModal
            isVisible={isDatePickerVisible}
            mode="date"
            onConfirm={handleDateConfirm}
            onCancel={() => setDatePickerVisibility(false)}
          />
        </View>
        <HelperText type="info" visible={true}>
          입대일은 휴가 계산에 사용됩니다
        </HelperText>

        <TextInput
          label="비밀번호"
          value={password}
          onChangeText={setPassword}
          mode="outlined"
          style={styles.input}
          secureTextEntry
        />

        <TextInput
          label="비밀번호 확인"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          mode="outlined"
          style={styles.input}
          secureTextEntry
          error={confirmPassword !== '' && !passwordsMatch()}
        />
        {confirmPassword !== '' && !passwordsMatch() && (
          <HelperText type="error">
            비밀번호가 일치하지 않습니다
          </HelperText>
        )}

        <Button
          mode="contained"
          onPress={handleRegister}
          style={styles.button}
          loading={isLoading}
          disabled={isLoading}
        >
          회원가입
        </Button>

        <Button
          mode="text"
          onPress={() => navigation.navigate('Login')}
          style={styles.linkButton}
        >
          이미 계정이 있으신가요? 로그인
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 24,
    textAlign: 'center',
    marginTop: 20,
  },
  divider: {
    marginVertical: 20,
  },
  input: {
    marginBottom: 10,
  },
  pickerContainer: {
    marginBottom: 10,
  },
  pickerLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#aaa',
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
  },
  button: {
    marginTop: 20,
    paddingVertical: 8,
  },
  linkButton: {
    marginTop: 10,
  },
  datePickerContainer: {
    marginBottom: 10,
  },
  dateButton: {
    marginTop: 5,
    marginBottom: 5,
  }
});

export default RegisterScreen; 