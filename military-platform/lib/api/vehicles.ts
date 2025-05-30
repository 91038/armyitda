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
import { ApiResponse, Vehicle } from "@/types";

const COLLECTION_NAME = "vehicles";

// Firestore 문서를 Vehicle 객체로 변환
const convertDocToVehicle = (doc: DocumentData): Vehicle => {
  const data = doc.data();
  return {
    id: doc.id,
    vehicleNumber: data.vehicleNumber,
    vehicleType: data.vehicleType,
    vehicleName: data.vehicleName,
    capacity: data.capacity,
    status: data.status,
  };
};

// 차량 목록 가져오기
export const getVehicles = async (): Promise<ApiResponse<Vehicle[]>> => {
  try {
    const vehiclesRef = collection(db, COLLECTION_NAME);
    const q = query(vehiclesRef, orderBy("vehicleName"));
    
    const querySnapshot = await getDocs(q);
    const vehicles = querySnapshot.docs.map(convertDocToVehicle);
    
    return {
      success: true,
      data: vehicles
    };
  } catch (error: any) {
    console.error("차량 목록 가져오기 실패:", error);
    return {
      success: false,
      error: error.message || "차량 목록을 가져오는데 실패했습니다."
    };
  }
};

// 운행 가능한 차량 목록 가져오기
export const getAvailableVehicles = async (): Promise<ApiResponse<Vehicle[]>> => {
  try {
    // 모든 차량을 가져와서 클라이언트에서 필터링
    const vehiclesRef = collection(db, COLLECTION_NAME);
    const querySnapshot = await getDocs(vehiclesRef);
    
    // 클라이언트 측에서 필터링
    const vehicles = querySnapshot.docs
      .map(convertDocToVehicle)
      .filter(vehicle => vehicle.status === "운행가능")
      .sort((a, b) => a.vehicleName.localeCompare(b.vehicleName));
    
    return {
      success: true,
      data: vehicles
    };
  } catch (error: any) {
    console.error("가용 차량 목록 가져오기 실패:", error);
    return {
      success: false,
      error: error.message || "가용 차량 목록을 가져오는데 실패했습니다."
    };
  }
};

// 특정 차량 정보 가져오기
export const getVehicle = async (id: string): Promise<ApiResponse<Vehicle>> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const vehicle = convertDocToVehicle(docSnap);
      return {
        success: true,
        data: vehicle
      };
    } else {
      return {
        success: false,
        error: "차량 정보를 찾을 수 없습니다."
      };
    }
  } catch (error: any) {
    console.error("차량 정보 가져오기 실패:", error);
    return {
      success: false,
      error: error.message || "차량 정보를 가져오는데 실패했습니다."
    };
  }
};

// 차량 추가하기
export const addVehicle = async (vehicleData: Omit<Vehicle, "id">): Promise<ApiResponse<Vehicle>> => {
  try {
    const data = {
      ...vehicleData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, COLLECTION_NAME), data);
    
    const newVehicle: Vehicle = {
      id: docRef.id,
      ...vehicleData
    };
    
    return {
      success: true,
      data: newVehicle
    };
  } catch (error: any) {
    console.error("차량 추가 실패:", error);
    return {
      success: false,
      error: error.message || "차량 추가에 실패했습니다."
    };
  }
};

// 차량 정보 업데이트
export const updateVehicle = async (
  id: string, 
  vehicleData: Partial<Omit<Vehicle, "id">>
): Promise<ApiResponse<Vehicle>> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    
    const data = {
      ...vehicleData,
      updatedAt: serverTimestamp()
    };
    
    await updateDoc(docRef, data);
    
    // 업데이트된 데이터 가져오기
    const updatedDoc = await getDoc(docRef);
    if (!updatedDoc.exists()) {
      return {
        success: false,
        error: "차량 정보를 찾을 수 없습니다."
      };
    }
    
    const updatedVehicle = convertDocToVehicle(updatedDoc);
    
    return {
      success: true,
      data: updatedVehicle
    };
  } catch (error: any) {
    console.error("차량 정보 업데이트 실패:", error);
    return {
      success: false,
      error: error.message || "차량 정보 업데이트에 실패했습니다."
    };
  }
};

// 차량 삭제하기
export const deleteVehicle = async (id: string): Promise<ApiResponse<void>> => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
    
    return {
      success: true
    };
  } catch (error: any) {
    console.error("차량 삭제 실패:", error);
    return {
      success: false,
      error: error.message || "차량 삭제에 실패했습니다."
    };
  }
}; 