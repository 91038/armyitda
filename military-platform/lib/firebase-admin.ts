import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import serviceAccount from '../roka-7a8eb-firebase-adminsdk-fbsvc-811b129ff8.json';

// 이미 초기화되지 않은 경우에만 초기화
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
    });
    console.log('Firebase Admin SDK 초기화 성공');
  } catch (error) {
    console.error('Firebase Admin SDK 초기화 오류:', error);
  }
}

export const db = getFirestore();
export default admin; 