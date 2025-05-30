import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { Alert } from 'react-native';

// 인증 화면
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// 메인 탭 네비게이터
import MainTabNavigator from './MainTabNavigator';

// 알림 화면 추가
import NotificationScreen from '../screens/notification/NotificationScreen';
// 일정 신청 화면 추가
import LeaveRequestScreen from '../screens/schedule/LeaveRequestScreen';
// 신청 내역 화면 추가
import ScheduleHistoryScreen from '../screens/schedule/ScheduleHistoryScreen';
// 증명서 보기 화면 추가
import CertificateViewerScreen from '../screens/schedule/CertificateViewerScreen';
// 외출 신청 화면 추가
import OutingRequestScreen from '../screens/schedule/OutingRequestScreen';
// 외진 신청 화면 추가
import MedicalAppointmentRequestScreen from '../screens/schedule/MedicalAppointmentRequestScreen';
// 개인 일정 추가 화면 추가
import AddPersonalEventScreen from '../screens/schedule/AddPersonalEventScreen';
// 휴가 내역 화면 추가
import VacationHistoryScreen from '../screens/schedule/VacationHistoryScreen';
// 전체 메뉴 화면 추가
// import MoreMenuScreen from '../screens/more/MoreMenuScreen';

// 심리 테스트 화면 import 추가
import MentalHealthTest from '../screens/health/MentalHealthTest';
import OfficerMentalHealthView from '../screens/health/OfficerMentalHealthView';
// 신체건강 테스트 화면 import 추가
import PhysicalHealthTest from '../screens/health/PhysicalHealthTest';

// 자기계발 관련 화면 추가
import AddGoalScreen from '../screens/education/AddGoalScreen';
import SelfDevelopmentFundScreen from '../screens/education/SelfDevelopmentFundScreen';

// 팟택시 화면 추가
import TaxiPoolScreen from '../screens/more/TaxiPoolScreen';

const Stack = createStackNavigator();

const AppNavigator: React.FC = () => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  // 디버깅용 네비게이션 설정 검증
  React.useEffect(() => {
    console.log('AppNavigator 마운트됨');
    console.log('인증 상태:', isAuthenticated);
  }, [isAuthenticated]);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false
      }}
    >
      {!isAuthenticated ? (
        // 인증되지 않은 사용자를 위한 화면 (헤더 숨김)
        <>
          <Stack.Screen 
            name="Login" 
            component={LoginScreen} 
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="Register" 
            component={RegisterScreen} 
            options={{ headerShown: false }}
          />
        </>
      ) : (
        // 인증된 사용자를 위한 화면
        <>
          <Stack.Screen 
            name="MainTabs" // 이름 변경
            component={MainTabNavigator} 
            options={{ headerShown: false }} // 탭 네비게이터 자체의 헤더를 사용
          />
          {/* 알림 화면을 메인 스택에 추가 */}
          <Stack.Screen 
            name="Notifications" 
            component={NotificationScreen} 
            options={{ 
              title: '알림', // 헤더 제목 설정
              headerShown: true // 헤더 표시
            }} 
          />
          {/* 일정 신청 화면을 메인 스택에 추가 */}
          <Stack.Screen 
            name="LeaveRequest" 
            component={LeaveRequestScreen} 
            options={{ 
              title: '휴가 신청', // 헤더 제목 설정
              headerShown: true // 헤더 표시
            }} 
          />
          {/* 신청 내역 화면을 메인 스택에 추가 */}
          <Stack.Screen 
            name="ScheduleHistory" 
            component={ScheduleHistoryScreen} 
            options={{ 
              title: '신청 내역', // 헤더 제목 설정
              headerShown: true // 헤더 표시
            }} 
          />
          {/* 휴가 내역 화면 추가 */}
          <Stack.Screen 
            name="VacationHistory" 
            component={VacationHistoryScreen} 
            options={{ 
              title: '휴가 사용 내역', // 헤더 제목 설정
              headerShown: false // 헤더 숨김 (화면 내부에서 헤더 제공)
            }} 
          />
          {/* 증명서 보기 화면 추가 */}
          <Stack.Screen
            name="CertificateViewer" // ScheduleHistoryScreen에서 navigate 할 때 사용한 이름
            component={CertificateViewerScreen}
            options={{
              headerShown: false // CertificateViewerScreen 자체 헤더 사용
            }}
          />
          {/* 외출 신청 화면 추가 */}
          <Stack.Screen
            name="OutingRequest"
            component={OutingRequestScreen}
            options={{
              title: '외출 신청',
              headerShown: true
            }}
          />
          {/* 외진 신청 화면 추가 */}
          <Stack.Screen
            name="MedicalAppointmentRequest"
            component={MedicalAppointmentRequestScreen}
            options={{
              title: '외진 신청',
              headerShown: true
            }}
          />
          {/* 개인 일정 추가 화면 추가 */}
          <Stack.Screen
            name="AddPersonalEvent"
            component={AddPersonalEventScreen}
            options={{
              title: '개인 일정 추가',
              headerShown: true
            }}
          />
          {/* 전체 메뉴 화면을 메인 스택에 추가 */}
          {/* <Stack.Screen 
            name="MoreMenu" 
            component={MoreMenuScreen} 
            options={{ title: '전체 메뉴' }} // 헤더 제목 설정
          /> */}
          {/* 여기에 다른 모달 형태의 스크린 등을 추가할 수 있음 */}
          {/* 심리 테스트 화면 추가 */}
          <Stack.Screen name="MentalHealthTest" component={MentalHealthTest} options={{ title: '심리 건강 테스트' }} />
          <Stack.Screen name="OfficerMentalHealthView" component={OfficerMentalHealthView} options={{ title: '부대 심리 건강 관리' }} />
          {/* 신체건강 테스트 화면 추가 */}
          <Stack.Screen name="PhysicalHealthTest" component={PhysicalHealthTest} options={{ title: '신체 건강 테스트' }} />
          {/* 자기계발 관련 화면 추가 */}
          <Stack.Screen 
            name="AddGoal" 
            component={AddGoalScreen} 
            options={{ 
              title: '목표 추가', 
              headerShown: true 
            }} 
          />
          <Stack.Screen 
            name="SelfDevelopmentFund" 
            component={SelfDevelopmentFundScreen} 
            options={{ 
              title: '자기계발비 신청', 
              headerShown: true 
            }} 
          />
          {/* 팟택시 화면 추가 */}
          <Stack.Screen 
            name="TaxiPool" 
            component={TaxiPoolScreen} 
            options={{ 
              title: '팟택시', 
              headerShown: true 
            }} 
          />
        </>
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator; 