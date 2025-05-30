import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, initializeAuth } from "firebase/auth";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Firebase 설정
// 모바일앱과 웹앱이 동일한 Firebase 프로젝트를 사용하도록 설정
const firebaseConfig = {
  apiKey: "AIzaSyD9QaXGQvfBiyzbyvdPwHwAk4OCkDsRHN4",
  authDomain: "roka-7a8eb.firebaseapp.com",
  projectId: "roka-7a8eb",
  storageBucket: "roka-7a8eb.firebasestorage.app",
  messagingSenderId: "608819079449",
  appId: "1:608819079449:web:fc78e0ac7f2bde290bf19e",
  measurementId: "G-C0E9CL7CW8"
};

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);

// Firebase 서비스 초기화
const db = getFirestore(app);

// Auth 초기화 - React Native에서 안전한 방식으로 초기화
let auth;
try {
  // React Native 환경에서 AsyncStorage 지속성을 시도
  const { getReactNativePersistence } = require("firebase/auth/react-native");
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} catch (error) {
  // 지속성 모듈을 찾을 수 없는 경우 기본 Auth 사용
  console.log("Firebase Auth: AsyncStorage 지속성을 사용할 수 없어 메모리 지속성을 사용합니다.");
  auth = getAuth(app);
}

// Firebase Functions 초기화 - 아시아 서버(도쿄)
const functions = getFunctions(app, 'asia-northeast3');

// 로컬 환경에서 Firebase Emulator를 사용하는 경우
// connectFunctionsEmulator(functions, 'localhost', 5001);

export { auth, db, functions };
export default app;