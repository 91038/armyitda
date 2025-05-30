// Firebase 설정 및 인스턴스
export { db, auth } from './config';
export { default as firebaseApp } from './config';

// 인증 관련 함수
export { 
  registerUser, 
  loginUser, 
  logoutUser,
  getCurrentUser
} from './auth';

// Firestore 관련 함수 및 타입
export {
  getUserByMilitaryId,
  getUserById,
  updateUserData,
  addPost,
  getPosts,
  getPostById,
  addComment,
  getComments,
  togglePostLike,
  toggleCommentLike
} from './firestore';
export type { UserData, PostData, CommentData } from './firestore';

// 알림 관련 함수 및 타입 추가
export {
  addNotification,
  getUserNotifications,
  markNotificationAsRead,
  getUnreadNotificationCount,
  // createCommentNotification // firestore.ts 내부에서만 사용되므로 내보내지 않음
} from './firestore';
export type { NotificationData } from './firestore';

// Storage 관련 함수
export {
  uploadCommunityAttachment
} from './storage';

// 심리 테스트 관련 함수 및 타입 추가
export {
  saveMentalHealthTestResult,
  getUserLatestMentalHealthTest,
  getUserMentalHealthTests,
  getDangerousMentalHealthTests,
  getUnitMentalHealthTestsByDate,
  // 신체건강 테스트 관련 함수 추가
  savePhysicalHealthTestResult,
  getUserLatestPhysicalHealthTest,
  getUserPhysicalHealthTests,
  getDangerousSoldiers,
  // 자기계발 관련 함수 추가
  addSelfDevelopmentGoal,
  getUserSelfDevelopmentGoals,
  updateSelfDevelopmentGoal,
  completeSelfDevelopmentGoal,
  addStudyRecord,
  getUserStudyRecords,
  addSelfDevelopmentFundApplication,
  getUserSelfDevelopmentFundApplications,
  getRecommendedContent
} from './firestore';
export type { 
  MentalHealthTestResult, 
  PhysicalHealthTestResult,
  SelfDevelopmentGoal,
  StudyRecord,
  SelfDevelopmentFundApplication,
  RecommendedContent
} from './firestore'; 