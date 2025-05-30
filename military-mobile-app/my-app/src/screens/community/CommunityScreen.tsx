import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, RefreshControl, TextInput } from 'react-native';
import { Text, Card, Title, Paragraph, Avatar, IconButton, Chip, Button, FAB } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { getPosts, togglePostLike, PostData } from '../../firebase';
import { RootState } from '../../store';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

const categories = ['전체', '자유게시판', '질문게시판', '정보공유', '건의사항'];

const CommunityScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useSelector((state: RootState) => state.auth);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [searchQuery, setSearchQuery] = useState('');

  const loadPosts = useCallback(async (isRefreshing = false) => {
    if (!isRefreshing) {
      setLoading(true);
    }
    setError(null);
    try {
      const fetchedPosts = await getPosts(selectedCategory, 20);
      setPosts(fetchedPosts);
    } catch (err: any) {
      setError(err.message || '게시글을 불러오는 중 오류가 발생했습니다.');
      console.error(err);
    } finally {
      if (!isRefreshing) {
        setLoading(false);
      }
    }
  }, [selectedCategory]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPosts(true);
    setRefreshing(false);
  }, [loadPosts]);

  useFocusEffect(
    useCallback(() => {
      loadPosts();
    }, [loadPosts])
  );

  const handleLike = async (postId: string | undefined) => {
    if (!user || !postId) return;
    try {
      await togglePostLike(postId, user.id);
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === postId 
            ? { 
                ...post, 
                likes: post.likes.includes(user.id)
                  ? post.likes.filter(id => id !== user.id)
                  : [...post.likes, user.id]
              }
            : post
        )
      );
    } catch (err) {
      console.error('좋아요 처리 오류:', err);
    }
  };

  const renderPostItem = ({ item }: { item: PostData }) => {
    const isLiked = user ? item.likes.includes(user.id) : false;
    const timeAgo = item.createdAt ? formatDistanceToNow(item.createdAt.toDate(), { addSuffix: true, locale: ko }) : '';

    return (
      <Card style={styles.card} onPress={() => navigation.navigate('PostDetail', { postId: item.id })}>
        <Card.Content>
          <View style={styles.header}>
            <Avatar.Icon size={40} icon="account-circle" style={styles.avatar} />
            <View style={styles.authorInfo}>
              <Text style={styles.authorName}>{item.anonymous ? '익명' : item.authorName}</Text>
              <Text style={styles.timeAgo}>{timeAgo}</Text>
            </View>
          </View>
          <Title style={styles.title}>{item.title}</Title>
          <Paragraph style={styles.content} numberOfLines={3}>{item.content}</Paragraph>
          {item.category && <Chip style={styles.chip} icon="tag">{item.category}</Chip>}
        </Card.Content>
        <Card.Actions style={styles.actions}>
          <Button 
            icon={isLiked ? "heart" : "heart-outline"} 
            onPress={() => handleLike(item.id)}
            color={isLiked ? '#E91E63' : undefined}
          >
            {item.likes.length}
          </Button>
          <Button icon="comment-outline">
            {item.commentCount}
          </Button>
        </Card.Actions>
      </Card>
    );
  };

  if (loading && !refreshing && posts.length === 0) {
    return <ActivityIndicator animating={true} size="large" style={styles.loader} />;
  }

  if (error) {
    return <Text style={styles.errorText}>{error}</Text>;
  }

  const filteredPosts = posts.filter(post => {
    const query = searchQuery.toLowerCase();
    return (
      post.title.toLowerCase().includes(query) ||
      post.content.toLowerCase().includes(query)
    );
  });

  return (
    <View style={styles.container}>
      <View style={styles.chipContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {categories.map(cat => (
            <Chip 
              key={cat} 
              style={styles.categoryChip}
              mode={selectedCategory === cat ? 'flat' : 'outlined'}
              selected={selectedCategory === cat}
              onPress={() => setSelectedCategory(cat)}
            >
              {cat}
            </Chip>
          ))}
        </ScrollView>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="제목 또는 내용 검색..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        clearButtonMode="while-editing"
      />

      <FlatList
        data={filteredPosts}
        renderItem={renderPostItem}
        keyExtractor={(item) => item.id!}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={<Text style={styles.emptyText}>{searchQuery ? '검색 결과가 없습니다.' : '아직 게시글이 없습니다.'}</Text>}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      />
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => navigation.navigate('CreatePost')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  listContainer: {
    padding: 10,
    paddingBottom: 80,
  },
  card: {
    marginBottom: 15,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    marginRight: 10,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontWeight: 'bold',
  },
  timeAgo: {
    fontSize: 12,
    color: 'gray',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  content: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  chip: {
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  actions: {
    justifyContent: 'flex-end',
    paddingTop: 0,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    flex: 1,
    textAlign: 'center',
    marginTop: 20,
    color: 'red',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    color: 'gray',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  chipContainer: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'white',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  categoryChip: {
    marginRight: 8,
  },
  searchInput: {
    height: 40,
    margin: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: 'white',
  },
});

export default CommunityScreen; 