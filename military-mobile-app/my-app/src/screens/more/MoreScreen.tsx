import React from 'react';
import { View, StyleSheet } from 'react-native';
import { List, Divider, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const MoreScreen = () => {
  const navigation = useNavigation<any>();
  const theme = useTheme();

  const menuItems = [
    { title: '홈', icon: 'home-outline', targetScreen: 'Home' },
    { title: '일정 관리', icon: 'calendar-month-outline', targetScreen: 'Schedule' },
    { title: '커뮤니티', icon: 'account-group-outline', targetScreen: 'Community', params: { screen: 'CommunityList' } },
    { title: '나의 복무기록', icon: 'file-document-outline', targetScreen: 'Portfolio' },
    { title: '건강 관리', icon: 'heart-pulse', targetScreen: 'Health' },
    { title: '자기 계발', icon: 'book-open-page-variant-outline', targetScreen: 'Education' },
    { title: '복지 혜택', icon: 'gift-outline', targetScreen: 'Welfare' },
    { title: '팟택시', icon: 'taxi', targetScreen: 'TaxiPool', isRootNavigation: true },
  ];

  const handleMenuPress = (item: any) => {
    if (item.isRootNavigation) {
      // AppNavigator의 스크린으로 직접 이동
      navigation.navigate(item.targetScreen);
    } else {
      // MainTabs 내의 스크린으로 이동
      navigation.navigate('MainTabs', { screen: item.targetScreen, params: item.params });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <List.Section>
        {menuItems.map((item, index) => (
          <View key={item.targetScreen} style={styles.menuItemContainer}>
            <List.Item
              title={item.title}
              left={() => <List.Icon icon={item.icon} color={theme.colors.onSurfaceVariant} />}
              onPress={() => handleMenuPress(item)}
              titleStyle={{ color: theme.colors.onSurface }}
            />
            {index < menuItems.length - 1 && <Divider />}
          </View>
        ))}
      </List.Section>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  menuItemContainer: {
    paddingVertical: 10,
  }
});

export default MoreScreen; 