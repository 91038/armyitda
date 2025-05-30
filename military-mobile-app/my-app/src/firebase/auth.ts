import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  UserCredential,
  updateProfile,
  User
} from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from './config';

// 사용자 등록 함수 - 군번을 이메일로 변환하여 사용합니다
export const registerUser = async (
  militaryId: string, 
  password: string, 
  name: string,
  rank: string,
  unitCode: string,
  unitName: string,
  enlistmentDate: Date
): Promise<UserCredential> => {
  try {
    // 군번을 이메일 형식으로 변환 (예: 12345678901 -> 12345678901@military.kr)
    const email = `${militaryId}@military.kr`;
    
    // Firebase Authentication에 사용자 등록
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // 사용자 프로필 업데이트 (표시 이름)
    if (userCredential.user) {
      await updateProfile(userCredential.user, {
        displayName: name
      });
    }
    
    // Firestore에 추가 사용자 정보 저장
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      militaryId,
      name,
      rank,
      unitCode,
      unitName,
      role: 'soldier', // 기본 역할
      enlistmentDate: Timestamp.fromDate(enlistmentDate), // 입대일 추가
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    
    return userCredential;
  } catch (error) {
    console.error('사용자 등록 오류:', error);
    throw error;
  }
};

// 로그인 함수
export const loginUser = async (militaryId: string, password: string): Promise<UserCredential> => {
  try {
    // 군번을 이메일 형식으로 변환
    const email = `${militaryId}@military.kr`;
    
    // Firebase Authentication으로 로그인
    return await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error('로그인 오류:', error);
    throw error;
  }
};

// 로그아웃 함수
export const logoutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('로그아웃 오류:', error);
    throw error;
  }
};

// 현재 로그인 사용자 가져오기
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
}; 