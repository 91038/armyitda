import { 
  getStorage, 
  ref, 
  uploadBytesResumable, 
  getDownloadURL 
} from "firebase/storage";
import firebaseApp from './config'; // Firebase 앱 인스턴스 가져오기 (기본 내보내기)
import uuid from 'react-native-uuid'; // 고유 ID 생성을 위해 uuid 설치 필요

// Firebase Storage 인스턴스 가져오기
const storage = getStorage(firebaseApp);

// 파일 업로드 함수 (커뮤니티 첨부파일용)
export const uploadCommunityAttachment = async (
  fileUri: string,
  postId: string,
  onProgress?: (progress: number) => void
): Promise<{ url: string; name: string; type: string }> => {
  try {
    const response = await fetch(fileUri);
    const blob = await response.blob();
    const fileExtension = fileUri.split('.').pop();
    const fileName = `${Date.now()}-${uuid.v4()}.${fileExtension}`;
    const storagePath = `community/posts/${postId}/${fileName}`;
    const storageRef = ref(storage, storagePath);

    const uploadTask = uploadBytesResumable(storageRef, blob);

    return new Promise((resolve, reject) => {
      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log('Upload is ' + progress + '% done');
          if (onProgress) {
            onProgress(progress);
          }
        },
        (error) => {
          console.error('파일 업로드 오류:', error);
          reject(error);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            console.log('File available at', downloadURL);
            resolve({
              url: downloadURL,
              name: fileName,
              type: blob.type // 파일 타입
            });
          } catch (error) {
            console.error('Download URL 가져오기 오류:', error);
            reject(error);
          }
        }
      );
    });
  } catch (error) {
    console.error('파일 업로드 처리 오류:', error);
    throw error;
  }
}; 