import { 
  doc, 
  getDoc, 
  getDocs, 
  collection, 
  query, 
  where,
  updateDoc, 
  Timestamp,
  addDoc,
  orderBy,
  limit,
  runTransaction,
  DocumentReference
} from 'firebase/firestore';
import { db } from './config';

// 사용자 정보 타입
export interface UserData {
  militaryId: string;
  name: string;
  rank: string;
  unitCode: string;
  unitName: string;
  role: 'soldier' | 'officer' | 'admin';
  enlistmentDate?: Timestamp; // 입대일 필드 추가
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// 군번으로 사용자 정보 조회
export const getUserByMilitaryId = async (militaryId: string): Promise<UserData | null> => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('militaryId', '==', militaryId));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    return querySnapshot.docs[0].data() as UserData;
  } catch (error) {
    console.error('사용자 정보 조회 오류:', error);
    throw error;
  }
};

// 사용자 ID로 사용자 정보 조회
export const getUserById = async (userId: string): Promise<UserData | null> => {
  try {
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    return docSnap.data() as UserData;
  } catch (error) {
    console.error('사용자 정보 조회 오류:', error);
    throw error;
  }
};

// 사용자 정보 업데이트
export const updateUserData = async (userId: string, userData: Partial<UserData>): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    
    await updateDoc(userRef, {
      ...userData,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('사용자 정보 업데이트 오류:', error);
    throw error;
  }
};

// 커뮤니티 관련 타입 정의
export interface PostData {
  id?: string; // Firestore에서 자동 생성되므로 optional
  authorId: string;
  authorName: string; // 비정규화된 데이터
  anonymous: boolean;
  title: string;
  content: string;
  category: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  likes: string[];
  commentCount: number; // 비정규화된 데이터
  attachments?: { url: string; type: string; name: string }[];
}

export interface CommentData {
  id?: string; // Firestore에서 자동 생성되므로 optional
  postId: string;
  parentId?: string | null; // 답글 대상 댓글 ID (옵션)
  authorId: string;
  authorName: string; // 비정규화된 데이터
  anonymous: boolean;
  content: string;
  createdAt: Timestamp;
  likes: string[];
}

// 알림 데이터 타입
export interface NotificationData {
  id?: string;
  userId: string;
  type: 'new_comment' | 'new_reply' | 'announcement' | string; // 확장 가능하게 string 허용
  message: string;
  relatedPostId?: string;
  relatedCommentId?: string;
  senderId?: string;
  senderName?: string;
  createdAt: Timestamp;
  isRead: boolean;
}

// 알림 생성
export const addNotification = async (notificationData: Omit<NotificationData, 'id' | 'createdAt' | 'isRead'>): Promise<DocumentReference> => {
  try {
    const notificationsRef = collection(db, 'notifications');
    const newNotification = {
      ...notificationData,
      createdAt: Timestamp.now(),
      isRead: false
    };
    return await addDoc(notificationsRef, newNotification);
  } catch (error) {
    console.error('알림 생성 오류:', error);
    throw error;
  }
};

// 특정 사용자의 알림 목록 조회 (최신순, 읽지 않은 알림 우선)
export const getUserNotifications = async (userId: string, limitCount: number = 20): Promise<NotificationData[]> => {
  try {
    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef, 
      where('userId', '==', userId), 
      orderBy('isRead'), // 읽지 않은 것(false) 우선
      orderBy('createdAt', 'desc'), 
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NotificationData));
  } catch (error) {
    console.error('알림 조회 오류:', error);
    throw error;
  }
};

// 특정 알림 읽음 처리
export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, { isRead: true });
  } catch (error) {
    console.error('알림 읽음 처리 오류:', error);
    throw error;
  }
};

// 사용자의 읽지 않은 알림 개수 조회 (실시간 업데이트는 리스너 필요)
export const getUnreadNotificationCount = async (userId: string): Promise<number> => {
  try {
    const notificationsRef = collection(db, 'notifications');
    const q = query(notificationsRef, where('userId', '==', userId), where('isRead', '==', false));
    const querySnapshot = await getDocs(q); // getCountFromServer() 사용 가능 (최신 SDK)
    return querySnapshot.size;
  } catch (error) {
    console.error('읽지 않은 알림 개수 조회 오류:', error);
    return 0; // 오류 시 0 반환
  }
};

// 댓글 추가 시 알림 생성 로직
export const createCommentNotification = async (
  commentData: CommentData & { id: string }, // ID가 반드시 포함된 타입으로 명시
  postId: string, 
  postAuthorId: string
) => {
  // 1. 게시글 작성자에게 알림 (자신이 작성한 글의 댓글은 제외)
  if (commentData.authorId !== postAuthorId) {
    await addNotification({
      userId: postAuthorId,
      type: 'new_comment',
      message: `${commentData.authorName}님이 회원님의 게시글에 댓글을 남겼습니다.`,
      relatedPostId: postId,
      relatedCommentId: commentData.id, // 이제 id 접근 가능
      senderId: commentData.authorId,
      senderName: commentData.authorName
    });
  }

  // 2. 답글인 경우, 부모 댓글 작성자에게 알림 (자신이 작성한 댓글의 답글은 제외)
  if (commentData.parentId) {
    const parentCommentRef = doc(db, 'posts', postId, 'comments', commentData.parentId);
    const parentCommentSnap = await getDoc(parentCommentRef);
    if (parentCommentSnap.exists()) {
      const parentCommentData = parentCommentSnap.data() as CommentData;
      if (commentData.authorId !== parentCommentData.authorId) {
        await addNotification({
          userId: parentCommentData.authorId,
          type: 'new_reply',
          message: `${commentData.authorName}님이 회원님의 댓글에 답글을 남겼습니다.`,
          relatedPostId: postId,
          relatedCommentId: commentData.id, // 이제 id 접근 가능
          senderId: commentData.authorId,
          senderName: commentData.authorName
        });
      }
    }
  }
};

// 새 게시글 추가
export const addPost = async (postData: Omit<PostData, 'id' | 'createdAt' | 'updatedAt' | 'likes' | 'commentCount'>): Promise<DocumentReference> => {
  try {
    const postsRef = collection(db, 'posts');
    const newPostData = {
      ...postData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      likes: [],
      commentCount: 0
    };
    return await addDoc(postsRef, newPostData);
  } catch (error) {
    console.error('게시글 추가 오류:', error);
    throw error;
  }
};

// 게시글 목록 조회 (카테고리 필터링 및 최신순)
export const getPosts = async (category?: string, limitCount: number = 10): Promise<PostData[]> => {
  try {
    const postsRef = collection(db, 'posts');
    let q;
    if (category && category !== '전체') {
      q = query(postsRef, where('category', '==', category), orderBy('createdAt', 'desc'), limit(limitCount));
    } else {
      // '전체' 또는 카테고리 미지정 시
      q = query(postsRef, orderBy('createdAt', 'desc'), limit(limitCount));
    }
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PostData));
  } catch (error) {
    console.error('게시글 목록 조회 오류:', error);
    throw error;
  }
};

// 특정 게시글 조회
export const getPostById = async (postId: string): Promise<PostData | null> => {
  try {
    const docRef = doc(db, 'posts', postId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    return { id: docSnap.id, ...docSnap.data() } as PostData;
  } catch (error) {
    console.error('게시글 조회 오류:', error);
    throw error;
  }
};

// 댓글 추가 (답글 기능 추가)
export const addComment = async (commentData: Omit<CommentData, 'id' | 'createdAt' | 'likes'>): Promise<DocumentReference> => {
  try {
    const commentsRef = collection(db, 'posts', commentData.postId, 'comments');
    const newCommentData = {
      ...commentData,
      parentId: commentData.parentId || null, 
      createdAt: Timestamp.now(),
      likes: []
    };
    
    const postRef = doc(db, 'posts', commentData.postId);
    let addedCommentRef: DocumentReference | null = null;
    let postAuthorId: string | null = null;

    await runTransaction(db, async (transaction) => {
      const postDoc = await transaction.get(postRef);
      if (!postDoc.exists()) {
        throw "게시글이 존재하지 않습니다.";
      }
      postAuthorId = postDoc.data().authorId; // 게시글 작성자 ID 가져오기
      const currentCommentCount = postDoc.data().commentCount || 0;
      transaction.update(postRef, { commentCount: currentCommentCount + 1 });
      
      const newDocRef = doc(commentsRef);
      transaction.set(newDocRef, newCommentData);
      addedCommentRef = newDocRef; 
    });

    if (!addedCommentRef) {
       throw new Error("댓글 참조를 가져오지 못했습니다.");
    }

    // 알림 생성 (트랜잭션 외부에서 실행)
    /* // FIXME: 타입 오류로 인해 임시 주석 처리
    if (postAuthorId && addedCommentRef) { 
      const notificationCommentData: CommentData & { id: string } = {
        id: addedCommentRef.id, 
        postId: commentData.postId,
        parentId: newCommentData.parentId,
        authorId: newCommentData.authorId,
        authorName: newCommentData.authorName,
        anonymous: newCommentData.anonymous,
        content: newCommentData.content,
        createdAt: newCommentData.createdAt,
        likes: newCommentData.likes
      };
      await createCommentNotification(notificationCommentData, commentData.postId, postAuthorId);
    }
    */

    return addedCommentRef;

  } catch (error) {
    console.error('댓글 추가 오류:', error);
    throw error;
  }
};

// 특정 게시글의 댓글 조회 (최신순)
export const getComments = async (postId: string): Promise<CommentData[]> => {
  try {
    const commentsRef = collection(db, 'posts', postId, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CommentData));
  } catch (error) {
    console.error('댓글 조회 오류:', error);
    throw error;
  }
};

// 게시글 좋아요 토글
export const togglePostLike = async (postId: string, userId: string): Promise<void> => {
  const postRef = doc(db, 'posts', postId);
  try {
    await runTransaction(db, async (transaction) => {
      const postDoc = await transaction.get(postRef);
      if (!postDoc.exists()) {
        throw "게시글이 존재하지 않습니다.";
      }

      const currentLikes = postDoc.data().likes || [];
      let updatedLikes;
      if (currentLikes.includes(userId)) {
        // 이미 좋아요를 눌렀으면 취소
        updatedLikes = currentLikes.filter((id: string) => id !== userId);
      } else {
        // 좋아요 추가
        updatedLikes = [...currentLikes, userId];
      }
      transaction.update(postRef, { likes: updatedLikes });
    });
  } catch (error) {
    console.error('게시글 좋아요 오류:', error);
    throw error;
  }
};

// 댓글 좋아요 토글
export const toggleCommentLike = async (postId: string, commentId: string, userId: string): Promise<void> => {
  const commentRef = doc(db, 'posts', postId, 'comments', commentId);
  try {
    await runTransaction(db, async (transaction) => {
      const commentDoc = await transaction.get(commentRef);
      if (!commentDoc.exists()) {
        throw "댓글이 존재하지 않습니다.";
      }

      const currentLikes = commentDoc.data().likes || [];
      let updatedLikes;
      if (currentLikes.includes(userId)) {
        // 이미 좋아요를 눌렀으면 취소
        updatedLikes = currentLikes.filter((id: string) => id !== userId);
      } else {
        // 좋아요 추가
        updatedLikes = [...currentLikes, userId];
      }
      transaction.update(commentRef, { likes: updatedLikes });
    });
  } catch (error) {
    console.error('댓글 좋아요 오류:', error);
    throw error;
  }
};

// 심리 테스트 결과 타입
export interface MentalHealthTestResult {
  id?: string;
  userId: string;
  userName: string;
  unitCode: string;
  unitName: string;
  rank: string;
  testDate: Timestamp;
  score: number;
  status: 'danger' | 'caution' | 'good'; // 위험, 주의, 양호 상태
  answers: { questionId: number; answer: number }[]; // 각 질문에 대한 답변
  createdAt: Timestamp;
}

// 신체건강 테스트 결과 타입
export interface PhysicalHealthTestResult {
  id?: string;
  userId: string;
  userName: string;
  unitCode: string;
  unitName: string;
  rank: string;
  testDate: Timestamp;
  score: number;
  status: 'bad' | 'normal' | 'good'; // 이상, 양호, 건강 상태
  items: { 
    id: number; 
    category: string; // 체력, 질병, 부상 등 카테고리
    name: string; 
    value: number; 
    unit?: string; // 단위 (cm, kg 등)
    status: 'bad' | 'normal' | 'good';
  }[];
  note?: string; // 비고, 특이사항
  createdAt: Timestamp;
}

// 심리 테스트 결과 저장
export const saveMentalHealthTestResult = async (
  testResult: Omit<MentalHealthTestResult, 'id' | 'createdAt'>
): Promise<DocumentReference> => {
  try {
    const mentalHealthRef = collection(db, 'mentalHealthTests');
    const newTestResult = {
      ...testResult,
      createdAt: Timestamp.now()
    };
    return await addDoc(mentalHealthRef, newTestResult);
  } catch (error) {
    console.error('심리 테스트 결과 저장 오류:', error);
    throw error;
  }
};

// 특정 사용자의 최근 심리 테스트 결과 조회
export const getUserLatestMentalHealthTest = async (userId: string): Promise<MentalHealthTestResult | null> => {
  try {
    const mentalHealthRef = collection(db, 'mentalHealthTests');
    const q = query(
      mentalHealthRef,
      where('userId', '==', userId),
      orderBy('testDate', 'desc'),
      limit(1)
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() } as MentalHealthTestResult;
  } catch (error) {
    console.error('심리 테스트 결과 조회 오류:', error);
    throw error;
  }
};

// 특정 사용자의 모든 심리 테스트 결과 조회 (최신순)
export const getUserMentalHealthTests = async (userId: string): Promise<MentalHealthTestResult[]> => {
  try {
    const mentalHealthRef = collection(db, 'mentalHealthTests');
    const q = query(
      mentalHealthRef,
      where('userId', '==', userId),
      orderBy('testDate', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    } as MentalHealthTestResult));
  } catch (error) {
    console.error('심리 테스트 결과 조회 오류:', error);
    throw error;
  }
};

// 특정 부대의 위험 상태 병사 조회
export const getDangerousMentalHealthTests = async (unitCode: string): Promise<MentalHealthTestResult[]> => {
  try {
    const mentalHealthRef = collection(db, 'mentalHealthTests');
    
    // 위험 상태와 주의 상태 모두 가져오기
    const dangerQ = query(
      mentalHealthRef,
      where('unitCode', '==', unitCode),
      where('status', '==', 'danger'),
      orderBy('testDate', 'desc')
    );
    
    const cautionQ = query(
      mentalHealthRef,
      where('unitCode', '==', unitCode),
      where('status', '==', 'caution'),
      orderBy('testDate', 'desc')
    );
    
    // 두 쿼리 병렬로 실행
    const [dangerSnapshot, cautionSnapshot] = await Promise.all([
      getDocs(dangerQ),
      getDocs(cautionQ)
    ]);
    
    // 결과 병합
    const results = [
      ...dangerSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MentalHealthTestResult)),
      ...cautionSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MentalHealthTestResult))
    ];
    
    // 사용자별로 가장 최근 테스트 결과만 필터링 (위험 상태 우선)
    const latestByUser = new Map<string, MentalHealthTestResult>();
    
    // 먼저 위험 상태 추가 (우선순위 높음)
    results
      .filter(result => result.status === 'danger')
      .forEach(result => {
        if (!latestByUser.has(result.userId) || 
            result.testDate.toMillis() > latestByUser.get(result.userId)!.testDate.toMillis()) {
          latestByUser.set(result.userId, result);
        }
      });
    
    // 그 다음 주의 상태 추가 (위험 상태가 없는 경우에만)
    results
      .filter(result => result.status === 'caution')
      .forEach(result => {
        if (!latestByUser.has(result.userId) || 
            (latestByUser.get(result.userId)!.status !== 'danger' && 
             result.testDate.toMillis() > latestByUser.get(result.userId)!.testDate.toMillis())) {
          latestByUser.set(result.userId, result);
        }
      });
    
    // 날짜 기준 내림차순 정렬 (최신순)
    return Array.from(latestByUser.values())
      .sort((a, b) => b.testDate.toMillis() - a.testDate.toMillis());
  } catch (error) {
    console.error('위험/주의 상태 심리 테스트 결과 조회 오류:', error);
    throw error;
  }
};

// 특정 날짜에 실시된 부대 내 모든 심리 테스트 결과 조회
export const getUnitMentalHealthTestsByDate = async (
  unitCode: string,
  date: Date
): Promise<MentalHealthTestResult[]> => {
  try {
    // 해당 날짜의 시작과 끝 타임스탬프 계산
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const startTimestamp = Timestamp.fromDate(startOfDay);
    const endTimestamp = Timestamp.fromDate(endOfDay);
    
    const mentalHealthRef = collection(db, 'mentalHealthTests');
    const q = query(
      mentalHealthRef,
      where('unitCode', '==', unitCode),
      where('testDate', '>=', startTimestamp),
      where('testDate', '<=', endTimestamp),
      orderBy('testDate', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    } as MentalHealthTestResult));
  } catch (error) {
    console.error('날짜별 심리 테스트 결과 조회 오류:', error);
    throw error;
  }
};

// 특정 부대의 위험 상태 병사 조회 (정신건강 + 신체건강)
export const getDangerousSoldiers = async (unitCode: string): Promise<{
  mentalHealthTests: MentalHealthTestResult[];
  physicalHealthTests: PhysicalHealthTestResult[];
}> => {
  try {
    // 정신건강 위험/주의 상태 병사 조회
    const mentalResults = await getDangerousMentalHealthTests(unitCode);
    
    // 신체건강 이상 상태 병사 조회
    const physicalHealthRef = collection(db, 'physicalHealthTests');
    const physicalQ = query(
      physicalHealthRef,
      where('unitCode', '==', unitCode),
      where('status', '==', 'bad'),
      orderBy('testDate', 'desc')
    );
    
    const physicalSnapshot = await getDocs(physicalQ);
    const physicalResults = physicalSnapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    } as PhysicalHealthTestResult));
    
    // 사용자별로 가장 최근 테스트 결과만 필터링
    const latestPhysicalByUser = new Map<string, PhysicalHealthTestResult>();
    
    physicalResults.forEach(result => {
      if (!latestPhysicalByUser.has(result.userId) || 
          result.testDate.toMillis() > latestPhysicalByUser.get(result.userId)!.testDate.toMillis()) {
        latestPhysicalByUser.set(result.userId, result);
      }
    });
    
    // 날짜 기준 내림차순 정렬 (최신순)
    const filteredPhysicalResults = Array.from(latestPhysicalByUser.values())
      .sort((a, b) => b.testDate.toMillis() - a.testDate.toMillis());
    
    return {
      mentalHealthTests: mentalResults,
      physicalHealthTests: filteredPhysicalResults
    };
  } catch (error) {
    console.error('건강 이상 상태 병사 조회 오류:', error);
    throw error;
  }
};

// 신체건강 테스트 결과 저장
export const savePhysicalHealthTestResult = async (
  testResult: Omit<PhysicalHealthTestResult, 'id' | 'createdAt'>
): Promise<DocumentReference> => {
  try {
    const physicalHealthRef = collection(db, 'physicalHealthTests');
    const newTestResult = {
      ...testResult,
      createdAt: Timestamp.now()
    };
    return await addDoc(physicalHealthRef, newTestResult);
  } catch (error) {
    console.error('신체건강 테스트 결과 저장 오류:', error);
    throw error;
  }
};

// 특정 사용자의 최근 신체건강 테스트 결과 조회
export const getUserLatestPhysicalHealthTest = async (userId: string): Promise<PhysicalHealthTestResult | null> => {
  try {
    const physicalHealthRef = collection(db, 'physicalHealthTests');
    const q = query(
      physicalHealthRef,
      where('userId', '==', userId),
      orderBy('testDate', 'desc'),
      limit(1)
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() } as PhysicalHealthTestResult;
  } catch (error) {
    console.error('신체건강 테스트 결과 조회 오류:', error);
    throw error;
  }
};

// 특정 사용자의 모든 신체건강 테스트 결과 조회 (최신순)
export const getUserPhysicalHealthTests = async (userId: string): Promise<PhysicalHealthTestResult[]> => {
  try {
    const physicalHealthRef = collection(db, 'physicalHealthTests');
    const q = query(
      physicalHealthRef,
      where('userId', '==', userId),
      orderBy('testDate', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    } as PhysicalHealthTestResult));
  } catch (error) {
    console.error('신체건강 테스트 결과 조회 오류:', error);
    throw error;
  }
};

// 자기계발 관련 타입 정의
export interface SelfDevelopmentGoal {
  id?: string;
  userId: string;
  userName: string;
  rank: string;
  unitCode: string;
  unitName: string;
  title: string;
  description?: string;
  category: 'certificate' | 'skill' | 'course' | 'book' | 'language' | 'other'; // 자격증, 기술, 강의, 독서, 언어, 기타
  targetDate: Timestamp;
  status: 'planning' | 'in_progress' | 'completed' | 'cancelled'; // 계획중, 진행중, 완료, 취소
  progress: number; // 0-100 진행률
  milestones: {
    id: string;
    title: string;
    description?: string;
    isCompleted: boolean;
    completedAt?: Timestamp;
  }[];
  successProof?: {
    description: string;
    imageUrls: string[];
    uploadedAt: Timestamp;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface StudyRecord {
  id?: string;
  userId: string;
  goalId?: string; // 연관된 목표 ID (옵션)
  title: string;
  category: 'study' | 'practice' | 'test' | 'lecture' | 'reading' | 'other';
  description?: string;
  duration: number; // 분 단위
  date: Timestamp;
  note?: string;
  createdAt: Timestamp;
}

export interface SelfDevelopmentFundApplication {
  id?: string;
  userId: string;
  userName: string;
  rank: string;
  unitCode: string;
  unitName: string;
  category: 'certificate' | 'book' | 'course' | 'equipment' | 'other';
  title: string;
  description: string;
  amount: number;
  receiptImageUrl: string;
  extractedData?: {
    merchantName?: string;
    amount?: number;
    date?: string;
    items?: string[];
  };
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  applicationDate: Timestamp;
  reviewDate?: Timestamp;
  reviewNote?: string;
  reviewerId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface RecommendedContent {
  id?: string;
  category: 'certificate' | 'course' | 'book';
  title: string;
  description: string;
  url?: string;
  imageUrl?: string;
  targetAudience: string[]; // 대상 병과나 보직
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedDuration?: string; // 예상 소요 시간
  cost?: number;
  provider?: string; // 제공 기관
  tags: string[];
  isActive: boolean;
  createdAt: Timestamp;
}

// 자기계발 목표 관련 함수들

// 자기계발 목표 추가
export const addSelfDevelopmentGoal = async (
  goalData: Omit<SelfDevelopmentGoal, 'id' | 'createdAt' | 'updatedAt'>
): Promise<DocumentReference> => {
  try {
    const goalsRef = collection(db, 'selfDevelopmentGoals');
    const newGoal = {
      ...goalData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    return await addDoc(goalsRef, newGoal);
  } catch (error) {
    console.error('자기계발 목표 추가 오류:', error);
    throw error;
  }
};

// 사용자의 자기계발 목표 조회
export const getUserSelfDevelopmentGoals = async (userId: string): Promise<SelfDevelopmentGoal[]> => {
  try {
    const goalsRef = collection(db, 'selfDevelopmentGoals');
    const q = query(
      goalsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SelfDevelopmentGoal));
  } catch (error) {
    console.error('자기계발 목표 조회 오류:', error);
    throw error;
  }
};

// 자기계발 목표 업데이트
export const updateSelfDevelopmentGoal = async (
  goalId: string,
  updateData: Partial<SelfDevelopmentGoal>
): Promise<void> => {
  try {
    const goalRef = doc(db, 'selfDevelopmentGoals', goalId);
    await updateDoc(goalRef, {
      ...updateData,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('자기계발 목표 업데이트 오류:', error);
    throw error;
  }
};

// 자기계발 목표 완료 처리
export const completeSelfDevelopmentGoal = async (
  goalId: string,
  successProof: {
    description: string;
    imageUrls: string[];
  }
): Promise<void> => {
  try {
    const goalRef = doc(db, 'selfDevelopmentGoals', goalId);
    await updateDoc(goalRef, {
      status: 'completed',
      progress: 100,
      successProof: {
        ...successProof,
        uploadedAt: Timestamp.now()
      },
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('자기계발 목표 완료 처리 오류:', error);
    throw error;
  }
};

// 학습 기록 관련 함수들

// 학습 기록 추가
export const addStudyRecord = async (
  recordData: Omit<StudyRecord, 'id' | 'createdAt'>
): Promise<DocumentReference> => {
  try {
    const recordsRef = collection(db, 'studyRecords');
    const newRecord = {
      ...recordData,
      createdAt: Timestamp.now()
    };
    return await addDoc(recordsRef, newRecord);
  } catch (error) {
    console.error('학습 기록 추가 오류:', error);
    throw error;
  }
};

// 사용자의 학습 기록 조회
export const getUserStudyRecords = async (userId: string, limitCount: number = 50): Promise<StudyRecord[]> => {
  try {
    const recordsRef = collection(db, 'studyRecords');
    const q = query(
      recordsRef,
      where('userId', '==', userId),
      orderBy('date', 'desc'),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudyRecord));
  } catch (error) {
    console.error('학습 기록 조회 오류:', error);
    throw error;
  }
};

// 자기계발비 신청 관련 함수들

// 자기계발비 신청 추가
export const addSelfDevelopmentFundApplication = async (
  applicationData: Omit<SelfDevelopmentFundApplication, 'id' | 'createdAt' | 'updatedAt'>
): Promise<DocumentReference> => {
  try {
    const applicationsRef = collection(db, 'selfDevelopmentFundApplications');
    const newApplication = {
      ...applicationData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    return await addDoc(applicationsRef, newApplication);
  } catch (error) {
    console.error('자기계발비 신청 추가 오류:', error);
    throw error;
  }
};

// 사용자의 자기계발비 신청 내역 조회
export const getUserSelfDevelopmentFundApplications = async (userId: string): Promise<SelfDevelopmentFundApplication[]> => {
  try {
    const applicationsRef = collection(db, 'selfDevelopmentFundApplications');
    const q = query(
      applicationsRef,
      where('userId', '==', userId),
      orderBy('applicationDate', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SelfDevelopmentFundApplication));
  } catch (error) {
    console.error('자기계발비 신청 내역 조회 오류:', error);
    throw error;
  }
};

// 추천 콘텐츠 관련 함수들

// 추천 콘텐츠 조회 (운전병 특화)
export const getRecommendedContent = async (targetAudience: string = '운전병'): Promise<RecommendedContent[]> => {
  try {
    const contentRef = collection(db, 'recommendedContent');
    const q = query(
      contentRef,
      where('isActive', '==', true),
      where('targetAudience', 'array-contains', targetAudience),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RecommendedContent));
  } catch (error) {
    console.error('추천 콘텐츠 조회 오류:', error);
    // 실제 데이터가 없을 경우를 대비해 더미 데이터 반환
    return getDummyRecommendedContent();
  }
};

// 더미 추천 콘텐츠 (운전병 특화)
const getDummyRecommendedContent = (): RecommendedContent[] => {
  return [
    {
      id: 'dummy-1',
      category: 'certificate',
      title: '운전면허 1종 대형',
      description: '대형 차량 운전을 위한 필수 자격증입니다. 제설차, 소방차 등 특수차량 운전 가능',
      url: 'https://www.safedriving.or.kr',
      imageUrl: 'https://via.placeholder.com/300x200?text=운전면허+1종+대형',
      targetAudience: ['운전병', '기계운전병'],
      difficulty: 'intermediate',
      estimatedDuration: '1-2개월',
      cost: 350000,
      provider: '도로교통공단',
      tags: ['운전', '대형차', '특수차량'],
      isActive: true,
      createdAt: Timestamp.now()
    },
    {
      id: 'dummy-2',
      category: 'certificate',
      title: '지게차운전기능사',
      description: '지게차 조작 및 운전에 필요한 기능사 자격증입니다. 부대 내 물자 운반 업무에 활용',
      url: 'https://www.q-net.or.kr/crf005.do?id=crf00505&jmCd=1320',
      imageUrl: 'https://via.placeholder.com/300x200?text=지게차운전기능사',
      targetAudience: ['운전병', '보급병'],
      difficulty: 'beginner',
      estimatedDuration: '2-3주',
      cost: 150000,
      provider: '한국산업인력공단',
      tags: ['지게차', '운전', '물류'],
      isActive: true,
      createdAt: Timestamp.now()
    },
    {
      id: 'dummy-3',
      category: 'certificate',
      title: '굴삭기운전기능사',
      description: '굴삭기 조작 및 운전 기능사 자격증입니다. 공병부대 및 건설 업무에 필수',
      url: 'https://www.q-net.or.kr/crf005.do?id=crf00505&jmCd=1310',
      imageUrl: 'https://via.placeholder.com/300x200?text=굴삭기운전기능사',
      targetAudience: ['운전병', '공병'],
      difficulty: 'intermediate',
      estimatedDuration: '1-2개월',
      cost: 200000,
      provider: '한국산업인력공단',
      tags: ['굴삭기', '건설', '토목'],
      isActive: true,
      createdAt: Timestamp.now()
    },
    {
      id: 'dummy-4',
      category: 'course',
      title: '차량정비 기초과정',
      description: '군용차량 정비 및 점검에 필요한 기초 지식을 배우는 온라인 강의입니다.',
      url: 'https://www.kmooc.kr/courses/course-v1:SMUk+SMU2019_01+2019_T1/about',
      imageUrl: 'https://via.placeholder.com/300x200?text=차량정비+기초과정',
      targetAudience: ['운전병', '정비병'],
      difficulty: 'beginner',
      estimatedDuration: '4주',
      cost: 0,
      provider: 'K-MOOC',
      tags: ['정비', '차량', '온라인강의'],
      isActive: true,
      createdAt: Timestamp.now()
    },
    {
      id: 'dummy-5',
      category: 'course',
      title: '안전운전 및 교통법규',
      description: '군용차량 안전운전과 최신 교통법규에 대한 종합 교육과정입니다.',
      url: 'https://www.safedriving.or.kr/guide/courseList.do',
      imageUrl: 'https://via.placeholder.com/300x200?text=안전운전+교육',
      targetAudience: ['운전병', '전체'],
      difficulty: 'beginner',
      estimatedDuration: '2주',
      cost: 50000,
      provider: '도로교통공단',
      tags: ['안전운전', '교통법규', '교육'],
      isActive: true,
      createdAt: Timestamp.now()
    },
    {
      id: 'dummy-6',
      category: 'book',
      title: '자동차 구조와 원리',
      description: '자동차의 기본 구조와 작동 원리를 쉽게 설명한 입문서입니다.',
      url: 'https://www.yes24.com/Product/Goods/123456',
      imageUrl: 'https://via.placeholder.com/300x200?text=자동차+구조와+원리',
      targetAudience: ['운전병', '정비병'],
      difficulty: 'beginner',
      estimatedDuration: '1개월',
      cost: 25000,
      provider: '기술과학사',
      tags: ['자동차', '구조', '원리', '도서'],
      isActive: true,
      createdAt: Timestamp.now()
    }
  ];
}; 