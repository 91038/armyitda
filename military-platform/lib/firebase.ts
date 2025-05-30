import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyD9QaXGQvfBiyzbyvdPwHwAk4OCkDsRHN4",
  authDomain: "roka-7a8eb.firebaseapp.com",
  projectId: "roka-7a8eb",
  storageBucket: "roka-7a8eb.firebasestorage.app",
  messagingSenderId: "90703321360",
  appId: "1:90703321360:web:ef27b3108d3dae9f25ad95",
  measurementId: "G-RCTN7PNGNF"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);

// Firestore 인스턴스 생성
export const db = getFirestore(app);

// Auth 인스턴스 생성
export const auth = getAuth(app);

// Analytics는 브라우저 환경에서만 초기화
let analytics = null;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export { analytics };
export default app; 