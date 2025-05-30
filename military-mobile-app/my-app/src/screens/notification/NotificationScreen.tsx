import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Text, List, Avatar, Badge } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { getUserNotifications, markNotificationAsRead, NotificationData } from '../../firebase';
import { RootState } from '../../store';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

const NotificationScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useSelector((state: RootState) => state.auth);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    if (!user) {
      setLoading(false);
      setError('로그인이 필요합니다.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const fetchedNotifications = await getUserNotifications(user.id, 30);
      setNotifications(fetchedNotifications);
    } catch (err: any) {
      setError(err.message || '알림을 불러오는 중 오류가 발생했습니다.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 화면 포커스 시 알림 새로고침
  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  const handleNotificationPress = async (item: NotificationData) => {
    if (!item.isRead) {
      try {
        await markNotificationAsRead(item.id!); // 읽음 처리
        // 로컬 상태 업데이트
        setNotifications(prev => 
          prev.map(n => n.id === item.id ? { ...n, isRead: true } : n)
        );
      } catch (err) {
        console.error("알림 읽음 처리 오류:", err);
      }
    }
    // 관련 화면으로 이동 (PostDetail 등)
    if (item.relatedPostId) {
      navigation.navigate('PostDetail', { postId: item.relatedPostId });
    } else {
      // TODO: 다른 유형의 알림 처리 (예: 공지사항 등)
    }
  };

  const renderNotificationItem = ({ item }: { item: NotificationData }) => {
    const timeAgo = item.createdAt ? formatDistanceToNow(item.createdAt.toDate(), { addSuffix: true, locale: ko }) : '';
    const icon = item.type === 'new_comment' || item.type === 'new_reply' ? 'comment-text' : 'bell';

    return (
      <List.Item
        title={item.message}
        description={timeAgo}
        left={props => <List.Icon {...props} icon={icon} color={item.isRead ? 'gray' : '#3F51B5'} />}
        right={props => !item.isRead ? <Badge {...props} style={styles.badge}>N</Badge> : null}
        style={[styles.listItem, !item.isRead && styles.unreadItem]}
        onPress={() => handleNotificationPress(item)}
        titleStyle={!item.isRead && styles.unreadTitle}
        descriptionStyle={!item.isRead && styles.unreadDescription}
      />
    );
  };

  if (loading) {
    return <ActivityIndicator animating={true} size="large" style={styles.loader} />;
  }

  if (error) {
    return <Text style={styles.errorText}>{error}</Text>;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={notifications}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item.id!}
        ListEmptyComponent={<Text style={styles.emptyText}>새로운 알림이 없습니다.</Text>}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        onRefresh={loadNotifications}
        refreshing={loading}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  listItem: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  unreadItem: {
    backgroundColor: '#EEF5FD', // 약간의 배경색 강조
  },
  unreadTitle: {
    fontWeight: 'bold',
  },
  unreadDescription: {
    color: '#3F51B5',
  },
  badge: {
    alignSelf: 'center',
    backgroundColor: 'red',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    textAlign: 'center',
    marginTop: 20,
    color: 'red',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    color: 'gray',
  },
  separator: {
    height: 1,
    backgroundColor: '#eee',
    marginLeft: 60, // 아이콘 너비만큼 들여쓰기
  },
});

export default NotificationScreen; 