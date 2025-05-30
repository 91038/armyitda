import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Title, Text } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { login } from '../../store/slices/authSlice';
import { AppDispatch, RootState } from '../../store';

const LoginScreen: React.FC = ({ navigation }: any) => {
  // Redux 상태와 디스패치
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((state: RootState) => state.auth);

  const [militaryId, setMilitaryId] = useState('');
  const [password, setPassword] = useState('');

  // 오류 상태 표시
  useEffect(() => {
    if (error) {
      Alert.alert('로그인 오류', error);
    }
  }, [error]);

  const handleLogin = async () => {
    if (!militaryId || !password) {
      Alert.alert('오류', '군번과 비밀번호를 입력해주세요.');
      return;
    }

    try {
      // Firebase 로그인 요청
      await dispatch(login({ militaryId, password }));
    } catch (error: any) {
      console.error('로그인 오류:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <View style={styles.logoPlaceholder}>
          <Text style={styles.logoText}>🪖</Text>
        </View>
        <Title style={styles.title}>군인 복무 지원 플랫폼</Title>
      </View>

      <View style={styles.formContainer}>
        <TextInput
          label="군번"
          value={militaryId}
          onChangeText={setMilitaryId}
          mode="outlined"
          style={styles.input}
          autoCapitalize="none"
        />
        <TextInput
          label="비밀번호"
          value={password}
          onChangeText={setPassword}
          mode="outlined"
          style={styles.input}
          secureTextEntry
        />
        <Button 
          mode="contained" 
          onPress={handleLogin} 
          style={styles.button}
          loading={isLoading}
          disabled={isLoading}
        >
          로그인
        </Button>
        
        <View style={styles.registerContainer}>
          <Text>계정이 없으신가요?</Text>
          <Button 
            mode="text" 
            onPress={() => navigation.navigate('Register')}
            labelStyle={styles.registerButtonLabel}
          >
            회원가입
          </Button>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  logoPlaceholder: {
    width: 120,
    height: 120,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#3F51B5',
    borderRadius: 60,
  },
  logoText: {
    fontSize: 48,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 24,
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 10,
    paddingVertical: 6,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  registerButtonLabel: {
    marginLeft: 5,
  },
});

export default LoginScreen; 