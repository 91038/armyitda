import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Text, Appbar, Badge, useTheme } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { getUnreadNotificationCount } from '../firebase';

// 스크린 import
import HomeScreen from '../screens/home/HomeScreen';
import ScheduleScreen from '../screens/schedule/ScheduleScreen';
import CommunityStackNavigator from './CommunityStackNavigator';
import PortfolioScreen from '../screens/portfolio/PortfolioScreen';
import HealthScreen from '../screens/health/HealthScreen';
import EducationScreen from '../screens/education/EducationScreen';
import WelfareScreen from '../screens/welfare/WelfareScreen';
import MoreScreen from '../screens/more/MoreScreen';

const Tab = createBottomTabNavigator();

// 커스텀 탭 바 컴포넌트
const CustomTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  const theme = useTheme();
  // 탭 바에 표시할 루트 (처음 4개 + 더보기 1개)
  const visibleRoutes = state.routes.slice(0, 5); // 홈, 일정, 커뮤니티, 복무기록, 더보기

  return (
    <View style={[styles.tabBarContainer, { backgroundColor: theme.colors.surface }]}>
      {visibleRoutes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel ?? options.title ?? route.name;
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) {
            // Community 탭의 경우, 중첩된 스택의 첫 화면으로 이동하도록 처리
            if (route.name === 'Community') {
              navigation.navigate(route.name, { screen: 'CommunityList' });
            } else {
              navigation.navigate(route.name, route.params);
            }
          }
        };

        const onLongPress = () => {
          navigation.emit({ type: 'tabLongPress', target: route.key });
        };

        const renderIcon = () => {
          if (typeof options.tabBarIcon === 'function') {
            return options.tabBarIcon({ focused: isFocused, color: isFocused ? theme.colors.primary : theme.colors.onSurfaceVariant, size: 24 });
          }
          // 'More' 탭 아이콘 기본값 설정 (옵션에서 제공되지 않을 경우)
          if (route.name === 'More') {
            return <MaterialCommunityIcons name={isFocused ? 'menu' : 'menu'} color={isFocused ? theme.colors.primary : theme.colors.onSurfaceVariant} size={24} />;
          }
          return null;
        };

        // Health, Education, Welfare 탭은 탭 바에 표시하지 않음 (CustomTabBar에서 렌더링 X)
        if (route.name === 'Health' || route.name === 'Education' || route.name === 'Welfare') {
            return null;
        }

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabBarButton}
          >
            {renderIcon()}
            <Text style={[
              styles.tabBarLabel,
              { color: isFocused ? theme.colors.primary : theme.colors.onSurfaceVariant }
            ]}>
              {label as string}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const MainTabNavigator: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<any>(); // Root 네비게이터 접근용
  const { user } = useSelector((state: RootState) => state.auth);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => { 
    const fetchCount = async () => { if (user) { setUnreadCount(await getUnreadNotificationCount(user.id)) } };
    fetchCount();
  }, [user]);

  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />} 
      screenOptions={{ // 각 화면별 헤더 옵션
        header: ({ navigation: tabNavigation, route, options }) => {
          // const currentRoute = useRoute(); // 현재 라우트 정보 가져오기 (필요시 사용)
          const title = options.title ?? route.name; // 옵션의 title 또는 route 이름 사용

          // 커뮤니티 스택 내부 화면(PostDetail, CreatePost)에서는 헤더 숨김
          if (route.name === 'Community') {
            const communityNavState = tabNavigation.getState();
            // communityNavState가 undefined일 수 있으므로 안전 접근자 사용
            const currentCommunityRouteName = communityNavState?.routes[communityNavState.index ?? 0]?.name;
            if (currentCommunityRouteName === 'PostDetail' || currentCommunityRouteName === 'CreatePost') {
                return null;
            }
          }
          
          // Health, Education, Welfare 탭은 자체 헤더를 가지도록 Appbar 숨김 (More 탭은 표시)
          if (route.name === 'Health' || route.name === 'Education' || route.name === 'Welfare') {
              // 이 화면들은 MoreScreen을 통해 네비게이션 되므로, MainTabs 헤더 불필요
              // 각 스크린에서 자체 헤더를 설정하거나, 필요 없다면 null 반환
              return null; 
          }

          return (
            <Appbar.Header>
              <Appbar.Content title={title as string} titleStyle={{ color: theme.colors.primary, fontWeight: 'bold' }}/>
              {/* 알림 버튼 */} 
              <View style={{ position: 'relative' }}>
                <Appbar.Action 
                  icon="bell-outline" 
                  onPress={() => navigation.navigate('Notifications')} // Root 네비게이터 사용
                />
                {unreadCount > 0 && (
                  <Badge style={styles.notificationBadge} size={16}>
                    {unreadCount}
                  </Badge>
                )}
              </View>
              {/* 헤더 우측 더보기 버튼 제거 (탭 바에 있으므로) */}
            </Appbar.Header>
          );
        },
      }}
    >
      {/* 탭 바에 표시될 메인 스크린들 */} 
      <Tab.Screen 
        name="Home"
        component={HomeScreen} 
        options={{ 
          tabBarLabel: '홈', 
          title: '홈', // 헤더 제목 설정
          tabBarIcon: ({ focused, color, size }) => (
            <MaterialCommunityIcons name={focused ? 'home' : 'home-outline'} color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen 
        name="Schedule" 
        component={ScheduleScreen} 
        options={{ 
          tabBarLabel: '일정', 
          title: '일정 관리', // 헤더 제목 설정
          tabBarIcon: ({ focused, color, size }) => (
            <MaterialCommunityIcons name={focused ? 'calendar-month' : 'calendar-month-outline'} color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen 
        name="Community" 
        component={CommunityStackNavigator} 
        options={{ 
          tabBarLabel: '커뮤니티', 
          title: '커뮤니티', // 헤더 제목 설정
          tabBarIcon: ({ focused, color, size }) => (
            <MaterialCommunityIcons name={focused ? 'account-group' : 'account-group-outline'} color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen 
        name="Portfolio" 
        component={PortfolioScreen} 
        options={{ 
          tabBarLabel: '복무기록', 
          title: '나의 복무기록', // 헤더 제목 설정
          tabBarIcon: ({ focused, color, size }) => (
            <MaterialCommunityIcons name={focused ? 'file-document' : 'file-document-outline'} color={color} size={size} />
          ),
        }}
      />
      {/* 더보기 탭 추가 */} 
      <Tab.Screen
        name="More"
        component={MoreScreen}
        options={{
          tabBarLabel: '더보기',
          title: '전체 메뉴', // 헤더 제목 설정
          tabBarIcon: ({ focused, color, size }) => (
            <MaterialCommunityIcons name={'menu'} color={color} size={size} />
          ),
        }}
       />
       {/* "더보기" 섹션에서 네비게이션 될 스크린들 (탭 바에는 직접 표시되지 않음) */}
      <Tab.Screen
        name="Health"
        component={HealthScreen}
        options={{ title: '건강 관리' }} // 헤더 제목 (MoreScreen에서 이동 시 사용될 수 있음)
      />
      <Tab.Screen
        name="Education"
        component={EducationScreen}
        options={{ title: '자기 계발' }}
      />
      <Tab.Screen
        name="Welfare"
        component={WelfareScreen}
        options={{ title: '복지 혜택' }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    height: 60,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: 'white', // 기본 배경색 명시
    elevation: 8,
  },
  tabBarButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBarLabel: {
    fontSize: 10,
    marginTop: 4,
  },
  notificationBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'red',
  },
});

export default MainTabNavigator; 