import { 
  collection, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  Timestamp,
  DocumentData,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase";
import { ApiResponse, Officer } from "@/types";

const COLLECTION_NAME = "officers";

// Firestore 문서를 Officer 객체로 변환
const convertDocToOfficer = (doc: DocumentData): Officer => {
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name,
    rank: data.rank,
    unit: data.unit,
    position: data.position,
    contact: data.contact,
    status: data.status,
    available: data.available,
    notes: data.notes || "",
  };
};

// 간부 목록 가져오기
export const getOfficers = async (): Promise<ApiResponse<Officer[]>> => {
  try {
    const officersRef = collection(db, COLLECTION_NAME);
    const q = query(officersRef, orderBy("name"));
    
    const querySnapshot = await getDocs(q);
    const officers = querySnapshot.docs.map(convertDocToOfficer);
    
    return {
      success: true,
      data: officers
    };
  } catch (error: any) {
    console.error("간부 목록 가져오기 실패:", error);
    return {
      success: false,
      error: error.message || "간부 목록을 가져오는데 실패했습니다."
    };
  }
};

// 선탑 가능한 간부 목록 가져오기
export const getAvailableOfficers = async (): Promise<ApiResponse<Officer[]>> => {
  try {
    const officersRef = collection(db, COLLECTION_NAME);
    const q = query(
      officersRef,
      where("available", "==", true),
      where("status", "in", ["재직", "교육"]),
      orderBy("name")
    );
    
    const querySnapshot = await getDocs(q);
    const officers = querySnapshot.docs.map(convertDocToOfficer);
    
    return {
      success: true,
      data: officers
    };
  } catch (error: any) {
    console.error("가용 간부 목록 가져오기 실패:", error);
    return {
      success: false,
      error: error.message || "가용 간부 목록을 가져오는데 실패했습니다."
    };
  }
};

// 특정 간부 정보 가져오기
export const getOfficer = async (id: string): Promise<ApiResponse<Officer>> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const officer = convertDocToOfficer(docSnap);
      return {
        success: true,
        data: officer
      };
    } else {
      return {
        success: false,
        error: "간부 정보를 찾을 수 없습니다."
      };
    }
  } catch (error: any) {
    console.error("간부 정보 가져오기 실패:", error);
    return {
      success: false,
      error: error.message || "간부 정보를 가져오는데 실패했습니다."
    };
  }
};

// 간부 추가하기
export const addOfficer = async (officerData: Omit<Officer, "id">): Promise<ApiResponse<Officer>> => {
  try {
    const data = {
      ...officerData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, COLLECTION_NAME), data);
    
    const newOfficer: Officer = {
      id: docRef.id,
      ...officerData
    };
    
    return {
      success: true,
      data: newOfficer
    };
  } catch (error: any) {
    console.error("간부 추가 실패:", error);
    return {
      success: false,
      error: error.message || "간부 추가에 실패했습니다."
    };
  }
};

// 간부 정보 업데이트
export const updateOfficer = async (
  id: string, 
  officerData: Partial<Omit<Officer, "id">>
): Promise<ApiResponse<Officer>> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    
    const data = {
      ...officerData,
      updatedAt: serverTimestamp()
    };
    
    await updateDoc(docRef, data);
    
    // 업데이트된 데이터 가져오기
    const updatedDoc = await getDoc(docRef);
    if (!updatedDoc.exists()) {
      return {
        success: false,
        error: "간부 정보를 찾을 수 없습니다."
      };
    }
    
    const updatedOfficer = convertDocToOfficer(updatedDoc);
    
    return {
      success: true,
      data: updatedOfficer
    };
  } catch (error: any) {
    console.error("간부 정보 업데이트 실패:", error);
    return {
      success: false,
      error: error.message || "간부 정보 업데이트에 실패했습니다."
    };
  }
};

// 간부 삭제하기
export const deleteOfficer = async (id: string): Promise<ApiResponse<void>> => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
    
    return {
      success: true
    };
  } catch (error: any) {
    console.error("간부 삭제 실패:", error);
    return {
      success: false,
      error: error.message || "간부 삭제에 실패했습니다."
    };
  }
}; 
 