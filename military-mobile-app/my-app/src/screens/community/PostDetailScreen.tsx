import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, FlatList, TextInput as RNTextInput, KeyboardAvoidingView, Platform, Alert, TouchableOpacity } from 'react-native';
import { Text, Card, Title, Paragraph, Avatar, IconButton, Button, Divider, TextInput, Menu } from 'react-native-paper';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { 
  getPostById, 
  getComments, 
  addComment, 
  togglePostLike, 
  toggleCommentLike,
  PostData, 
  CommentData,
  deletePost,
  deleteComment
} from '../../firebase';
import { RootState } from '../../store';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

// 네비게이션 파라미터 타입 정의
type PostDetailRouteProp = RouteProp<{ PostDetail: { postId: string } }, 'PostDetail'>;

// 댓글 입력 상태 타입
interface CommentInputState {
  text: string;
  replyTo?: CommentData | null; // 답글 대상 댓글 정보
}

// 댓글 트리 노드 타입 정의
interface CommentTreeNode extends CommentData {
  children: CommentTreeNode[];
}

const PostDetailScreen: React.FC = () => {
  const route = useRoute<PostDetailRouteProp>();
  const navigation = useNavigation();
  const { user } = useSelector((state: RootState) => state.auth);
  const postId = route.params.postId;

  const [post, setPost] = useState<PostData | null>(null);
  const [comments, setComments] = useState<CommentData[]>([]);
  const [commentInput, setCommentInput] = useState<CommentInputState>({ text: '', replyTo: null }); // 댓글 입력 상태 관리
  const [loadingPost, setLoadingPost] = useState(true);
  const [loadingComments, setLoadingComments] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [postMenuVisible, setPostMenuVisible] = useState(false); // 게시글 메뉴 표시 상태
  
  const commentInputRef = useRef<RNTextInput>(null); // 댓글 입력창 참조

  const loadPostAndComments = useCallback(async () => {
    setLoadingPost(true);
    setLoadingComments(true);
    setError(null);
    try {
      const fetchedPost = await getPostById(postId);
      if (!fetchedPost) {
        throw new Error('게시글을 찾을 수 없습니다.');
      }
      setPost(fetchedPost);
      setLoadingPost(false);

      const fetchedComments = await getComments(postId);
      setComments(fetchedComments);
    } catch (err: any) {
      setError(err.message || '데이터를 불러오는 중 오류가 발생했습니다.');
      console.error(err);
    } finally {
      setLoadingPost(false);
      setLoadingComments(false);
    }
  }, [postId]);

  useEffect(() => {
    loadPostAndComments();
  }, [loadPostAndComments]);

  const handlePostLike = async () => {
    if (!user || !post?.id) return;
    try {
      await togglePostLike(post.id, user.id);
      // 로컬 상태 업데이트
      setPost(prevPost => 
        prevPost
          ? { 
              ...prevPost, 
              likes: prevPost.likes.includes(user.id)
                ? prevPost.likes.filter(id => id !== user.id)
                : [...prevPost.likes, user.id]
            }
          : null
      );
    } catch (err) {
      console.error('게시글 좋아요 처리 오류:', err);
    }
  };

  const handleCommentLike = async (commentId: string | undefined) => {
    if (!user || !post?.id || !commentId) return;
    try {
      await toggleCommentLike(post.id, commentId, user.id);
      // 로컬 상태 업데이트
      setComments(prevComments => 
        prevComments.map(comment => 
          comment.id === commentId
            ? { 
                ...comment, 
                likes: comment.likes.includes(user.id)
                  ? comment.likes.filter(id => id !== user.id)
                  : [...comment.likes, user.id]
              }
            : comment
        )
      );
    } catch (err) {
      console.error('댓글 좋아요 처리 오류:', err);
    }
  };

  const handleAddComment = async () => {
    if (!user || !post?.id || !commentInput.text.trim()) return;
    setSubmittingComment(true);
    try {
      const commentData = {
        postId: post.id,
        parentId: commentInput.replyTo ? commentInput.replyTo.id : null, // parentId 추가
        authorId: user.id,
        authorName: user.name, // 실제 유저 이름 사용
        anonymous: false, // TODO: 익명 기능 추가 시 변경 필요
        content: commentInput.text.trim(),
      };
      await addComment(commentData);
      setCommentInput({ text: '', replyTo: null }); // 입력 상태 초기화
      // 댓글 목록 새로고침
      const fetchedComments = await getComments(postId);
      setComments(fetchedComments);
    } catch (err: any) {
      console.error('댓글 추가 오류:', err);
      Alert.alert('오류', '댓글을 추가하는 중 오류가 발생했습니다.');
    } finally {
      setSubmittingComment(false);
    }
  };

  // 답글 달기 버튼 클릭 시
  const handleReplyPress = (comment: CommentData) => {
    setCommentInput({ text: '', replyTo: comment });
    commentInputRef.current?.focus(); // 입력창으로 포커스 이동
  };

  // 댓글 렌더링 함수 (재귀적으로 또는 플랫하게 처리 후 클라이언트에서 구조화)
  // 여기서는 플랫하게 가져온 데이터를 클라이언트에서 계층구조로 만듦
  const buildCommentTree = (commentList: CommentData[]): CommentTreeNode[] => {
    const map: { [key: string]: CommentTreeNode } = {}; // 타입 수정: CommentTreeNode
    const roots: CommentTreeNode[] = []; // 타입 수정: CommentTreeNode

    // 모든 댓글을 맵에 추가하고 children 배열 초기화
    commentList.forEach(comment => {
      map[comment.id!] = { ...comment, children: [] };
    });

    // 부모-자식 관계 설정
    commentList.forEach(comment => {
      if (comment.parentId && map[comment.parentId]) {
        map[comment.parentId].children.push(map[comment.id!]);
      } else {
        roots.push(map[comment.id!]); // 최상위 댓글
      }
    });
    
    // createdAt 기준으로 정렬 (각 레벨별로)
    const sortComments = (comments: CommentTreeNode[]) => { // 타입 수정: CommentTreeNode
      comments.sort((a, b) => (a.createdAt?.toDate().getTime() || 0) - (b.createdAt?.toDate().getTime() || 0));
      comments.forEach(comment => sortComments(comment.children));
    };
    sortComments(roots);

    return roots;
  };

  // 게시글 삭제 함수
  const handleDeletePost = async () => {
    setPostMenuVisible(false); // 메뉴 닫기
    if (!user || !post || post.authorId !== user.id) return;

    Alert.alert(
      "게시글 삭제",
      "정말로 이 게시글을 삭제하시겠습니까?",
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제", 
          onPress: async () => {
            try {
              setLoadingPost(true); // 로딩 표시
              await deletePost(post.id!); // postId 확인 필요
              Alert.alert("삭제 완료", "게시글이 삭제되었습니다.");
              navigation.goBack(); // 이전 화면으로 이동
            } catch (error) {
              console.error("게시글 삭제 오류:", error);
              Alert.alert("오류", "게시글 삭제 중 오류가 발생했습니다.");
              setLoadingPost(false);
            }
          },
          style: "destructive",
        },
      ],
      { cancelable: false }
    );
  };

  // 댓글 삭제 함수
  const handleDeleteComment = async (commentId: string | undefined) => {
    if (!user || !post || !commentId) return;
    // 추가: 댓글 작성자 확인 로직 (comment 객체에서 authorId 가져오기)
    const commentToDelete = comments.find(c => c.id === commentId);
    if (!commentToDelete || commentToDelete.authorId !== user.id) {
        Alert.alert("권한 없음", "댓글을 삭제할 권한이 없습니다.");
        return;
    }

    Alert.alert(
      "댓글 삭제",
      "정말로 이 댓글을 삭제하시겠습니까?",
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          onPress: async () => {
            try {
              setLoadingComments(true);
              await deleteComment(post.id!, commentId); // postId, commentId 확인 필요
              // 댓글 목록 새로고침
              const fetchedComments = await getComments(postId);
              setComments(fetchedComments);
              Alert.alert("삭제 완료", "댓글이 삭제되었습니다.");
            } catch (error) {
              console.error("댓글 삭제 오류:", error);
              Alert.alert("오류", "댓글 삭제 중 오류가 발생했습니다.");
            } finally {
              setLoadingComments(false);
            }
          },
          style: "destructive",
        },
      ],
      { cancelable: false }
    );
  };

  // 재귀적 댓글 렌더링 컴포넌트
  const RenderCommentNode: React.FC<{ comment: CommentTreeNode; level: number }> = ({ comment, level }) => {
    const isLiked = user ? comment.likes.includes(user.id) : false;
    const timeAgo = comment.createdAt ? formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true, locale: ko }) : '';
    const [commentMenuVisible, setCommentMenuVisible] = useState(false); // 댓글 메뉴 상태 추가

    return (
      <View style={{ marginLeft: (level * 20) + 15 }}>
        <View style={styles.commentItem}>
          <View style={styles.commentHeader}>
            <Avatar.Icon size={30} icon="account-circle" style={styles.commentAvatar} />
            <View style={styles.commentAuthorInfo}>
              <Text style={styles.commentAuthorName}>{comment.anonymous ? '익명' : comment.authorName}</Text>
              <Text style={styles.commentTimeAgo}>{timeAgo}</Text>
            </View>
            {/* 댓글 작성자와 현재 사용자가 같으면 메뉴 버튼 표시 */} 
            {user && comment.authorId === user.id && (
              <Menu
                visible={commentMenuVisible}
                onDismiss={() => setCommentMenuVisible(false)}
                anchor={
                  <IconButton 
                    icon="dots-vertical" 
                    size={18} 
                    onPress={() => setCommentMenuVisible(true)} 
                    style={{ margin: -5 }} // 버튼 크기 및 위치 미세 조정
                  />
                }
              >
                <Menu.Item onPress={() => { /* TODO: 댓글 수정 */ setCommentMenuVisible(false); }} title="수정" />
                <Menu.Item onPress={() => { handleDeleteComment(comment.id); setCommentMenuVisible(false); }} title="삭제" />
              </Menu>
            )}
          </View>
          <Paragraph style={styles.commentContent}>{comment.content}</Paragraph>
          <View style={styles.commentActions}>
            {/* 좋아요 버튼 */} 
            <Button 
              icon={isLiked ? "heart" : "heart-outline"} 
              onPress={() => handleCommentLike(comment.id)}
              compact
              labelStyle={styles.commentActionButtonLabel}
              color={isLiked ? '#E91E63' : undefined}
            >
              {comment.likes.length}
            </Button>
            {/* 답글 버튼 - 레벨 0 댓글에만 표시 */} 
            {level === 0 && (
              <Button 
                icon="reply" 
                onPress={() => handleReplyPress(comment)}
                compact
                labelStyle={styles.commentActionButtonLabel}
              >
                답글
              </Button>
            )}
          </View>
          {comment.children.length > 0 && <Divider style={styles.commentDivider} />}
        </View>
        {/* 자식 댓글 렌더링 */} 
        {comment.children.map(child => (
          <RenderCommentNode key={child.id} comment={child} level={level + 1} />
        ))}
        {/* 마지막 자식 댓글 뒤에는 구분선 추가 안 함 (선택적) */} 
        {level > 0 && comment.children.length === 0 && <Divider style={styles.commentDivider} />} 
      </View>
    );
  };

  if (loadingPost) {
    return <ActivityIndicator animating={true} size="large" style={styles.loader} />;
  }

  if (error || !post) {
    return <Text style={styles.errorText}>{error || '게시글을 찾을 수 없습니다.'}</Text>;
  }

  const isPostLiked = user ? post.likes.includes(user.id) : false;
  const postTimeAgo = post.createdAt ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true, locale: ko }) : '';

  const commentTree = buildCommentTree(comments);

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
      keyboardVerticalOffset={90} // Adjust this value based on your header height
    >
      <ScrollView style={styles.scrollView}>
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.header}>
              <Avatar.Icon size={40} icon="account-circle" style={styles.avatar} />
              <View style={styles.authorInfo}>
                <Text style={styles.authorName}>{post.anonymous ? '익명' : post.authorName}</Text>
                <Text style={styles.timeAgo}>{postTimeAgo}</Text>
              </View>
              {/* 게시글 작성자와 현재 사용자가 같으면 메뉴 버튼 표시 */} 
              {user && post && user.id === post.authorId && (
                <Menu
                  visible={postMenuVisible}
                  onDismiss={() => setPostMenuVisible(false)}
                  anchor={
                    <IconButton 
                      icon="dots-vertical" 
                      size={20} 
                      onPress={() => setPostMenuVisible(true)} 
                    />
                  }
                >
                  <Menu.Item onPress={() => { /* TODO: 수정 기능 구현 */ setPostMenuVisible(false); }} title="수정" />
                  <Menu.Item onPress={handleDeletePost} title="삭제" />
                </Menu>
              )}
            </View>
            <Title style={styles.title}>{post.title}</Title>
            <Paragraph style={styles.content}>{post.content}</Paragraph>
            {/* TODO: 첨부파일 표시 */} 
          </Card.Content>
          <Card.Actions style={styles.actions}>
            <Button 
              icon={isPostLiked ? "heart" : "heart-outline"} 
              onPress={handlePostLike}
              color={isPostLiked ? '#E91E63' : undefined}
            >
              {post.likes.length}
            </Button>
            <Button icon="comment-outline">
              {comments.length}
            </Button>
          </Card.Actions>
        </Card>

        <Title style={styles.commentsTitle}>댓글</Title>
        {loadingComments ? (
          <ActivityIndicator animating={true} />
        ) : (
          commentTree.length > 0 ? (
            commentTree.map(rootComment => (
              <RenderCommentNode key={rootComment.id} comment={rootComment} level={0} />
            ))
          ) : (
            <Text style={styles.emptyText}>아직 댓글이 없습니다.</Text>
          )
          // FlatList 대신 직접 렌더링 (계층 구조 때문에 FlatList 비효율적일 수 있음)
          /* <FlatList
            data={commentTree} // 수정: 계층 구조 데이터 사용
            renderItem={({ item }) => <RenderCommentNode comment={item} level={0} />} // 수정
            keyExtractor={(item) => item.id!}
            ListEmptyComponent={<Text style={styles.emptyText}>아직 댓글이 없습니다.</Text>}
            style={styles.commentsList}
            scrollEnabled={false}
          /> */
        )}
      </ScrollView>

      {/* 댓글 입력란 수정 */} 
      <View style={styles.commentInputContainer}>
        {commentInput.replyTo && (
          <View style={styles.replyingToContainer}>
            <Text style={styles.replyingToText}>
              @{commentInput.replyTo.anonymous ? '익명' : commentInput.replyTo.authorName}에게 답글 남기는 중
            </Text>
            <IconButton icon="close-circle" size={16} onPress={() => setCommentInput({ text: '', replyTo: null })} />
          </View>
        )}
        <View style={styles.inputRow}>
          <TextInput
            ref={commentInputRef} // 참조 연결
            style={styles.commentInput}
            placeholder={commentInput.replyTo ? "답글을 입력하세요..." : "댓글을 입력하세요..."}
            value={commentInput.text}
            onChangeText={(text) => setCommentInput(prev => ({ ...prev, text }))}
            mode="outlined"
            dense
          />
          <Button 
            mode="contained" 
            onPress={handleAddComment}
            disabled={!commentInput.text.trim() || submittingComment}
            loading={submittingComment}
            style={styles.commentSubmitButton}
          >
            등록
          </Button>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  scrollView: {
    flex: 1,
  },
  card: {
    margin: 10,
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
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  content: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 15,
  },
  actions: {
    justifyContent: 'flex-start',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingVertical: 5,
    paddingHorizontal: 15,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 15,
    marginTop: 20,
    marginBottom: 10,
  },
  commentsList: {
    paddingHorizontal: 10,
  },
  commentItem: {
    paddingVertical: 10,
    // paddingHorizontal: 5, // 들여쓰기로 대체
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  commentAvatar: {
    marginRight: 8,
  },
  commentAuthorInfo: {
    flex: 1,
  },
  commentAuthorName: {
    fontWeight: 'bold',
    fontSize: 13,
  },
  commentTimeAgo: {
    fontSize: 11,
    color: 'gray',
  },
  commentContent: {
    fontSize: 14,
    marginLeft: 38, // Align with author name
    marginBottom: 5,
  },
  commentActions: {
    flexDirection: 'row',
    marginLeft: 30, // Align with content
    alignItems: 'center',
  },
  commentActionButtonLabel: {
    fontSize: 12,
    marginHorizontal: 0, // 버튼 간격 조절
  },
  commentDivider: {
    marginTop: 10,
    marginLeft: 38, // 들여쓰기 고려
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
    marginVertical: 20,
    color: 'gray',
  },
  commentInputContainer: {
    // flexDirection: 'row', // 제거하고 내부에서 row 사용
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    backgroundColor: '#fff',
    // alignItems: 'center', // 제거
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyingToContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    paddingHorizontal: 5,
  },
  replyingToText: {
    fontSize: 12,
    color: 'gray',
    flex: 1,
  },
  commentInput: {
    flex: 1,
    marginRight: 10,
  },
  commentSubmitButton: {
    height: 40, // TextInput 높이에 맞춤
    justifyContent: 'center',
  },
});

export default PostDetailScreen; 