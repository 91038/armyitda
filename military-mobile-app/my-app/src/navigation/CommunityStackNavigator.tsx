import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import CommunityScreen from '../screens/community/CommunityScreen';
import PostDetailScreen from '../screens/community/PostDetailScreen';
import CreatePostScreen from '../screens/community/CreatePostScreen';

const Stack = createStackNavigator();

const CommunityStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, // 탭 내비게이터 헤더를 사용하므로 스택 헤더는 숨김
      }}
    >
      <Stack.Screen 
        name="CommunityList" 
        component={CommunityScreen} 
      />
      <Stack.Screen 
        name="PostDetail" 
        component={PostDetailScreen} 
        options={{ headerShown: true, title: '게시글 상세' }} // 상세 화면에서는 헤더 표시
      />
      <Stack.Screen 
        name="CreatePost" 
        component={CreatePostScreen} 
        options={{ headerShown: true, title: '새 글 작성' }} // 새 글 작성 화면 헤더 표시
      />
    </Stack.Navigator>
  );
};

export default CommunityStackNavigator; 