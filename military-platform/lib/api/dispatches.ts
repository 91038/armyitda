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
  limit,
  startAfter,
  Timestamp,
  DocumentData,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase";
import { ApiResponse, Dispatch, PaginatedResponse, ExtendedDispatch, DispatchDocument } from "@/types";
import { getVehicle } from "./vehicles";
import { getSoldier } from "./soldiers";
import { getOfficer } from "./officers";
import { format } from "date-fns";

const COLLECTION_NAME = "dispatches";
const DOCUMENT_COLLECTION = "dispatchDocuments";

// Firestore 문서를 Dispatch 객체로 변환
const convertDocToDispatch = (doc: DocumentData): Dispatch => {
  const data = doc.data();
  return {
    id: doc.id,
    date: data.date,
    startTime: data.startTime,
    endTime: data.endTime,
    vehicleId: data.vehicleId,
    driverId: data.driverId,
    officerId: data.officerId,
    destination: data.destination,
    purpose: data.purpose,
    passengerCount: data.passengerCount || 0,
    status: data.status || "예정",
    notes: data.notes || "",
    isFixedRoute: data.isFixedRoute || false,
  };
};

// 배차 지시서 목록 가져오기
export const getDispatches = async (): Promise<ApiResponse<Dispatch[]>> => {
  try {
    const dispatchesRef = collection(db, COLLECTION_NAME);
    const q = query(dispatchesRef, orderBy("date", "desc"), orderBy("startTime"));
    
    const querySnapshot = await getDocs(q);
    const dispatches = querySnapshot.docs.map(convertDocToDispatch);
    
    return {
      success: true,
      data: dispatches
    };
  } catch (error: any) {
    console.error("배차 지시서 목록 가져오기 실패:", error);
    return {
      success: false,
      error: error.message || "배차 지시서 목록을 가져오는데 실패했습니다."
    };
  }
};

// 특정 날짜의 배차 지시서 목록 가져오기
export const getDispatchesByDate = async (date: string): Promise<ApiResponse<Dispatch[]>> => {
  try {
    const dispatchesRef = collection(db, COLLECTION_NAME);
    const q = query(
      dispatchesRef,
      where("date", "==", date),
      orderBy("startTime")
    );
    
    const querySnapshot = await getDocs(q);
    const dispatches = querySnapshot.docs.map(convertDocToDispatch);
    
    return {
      success: true,
      data: dispatches
    };
  } catch (error: any) {
    console.error("특정 날짜 배차 지시서 목록 가져오기 실패:", error);
    return {
      success: false,
      error: error.message || "날짜별 배차 지시서 목록을 가져오는데 실패했습니다."
    };
  }
};

// 특정 상태의 배차 지시서 목록 가져오기
export const getDispatchesByStatus = async (status: string): Promise<ApiResponse<Dispatch[]>> => {
  try {
    const dispatchesRef = collection(db, COLLECTION_NAME);
    const q = query(
      dispatchesRef,
      where("status", "==", status),
      orderBy("date", "desc"),
      orderBy("startTime")
    );
    
    const querySnapshot = await getDocs(q);
    const dispatches = querySnapshot.docs.map(convertDocToDispatch);
    
    return {
      success: true,
      data: dispatches
    };
  } catch (error: any) {
    console.error("특정 상태 배차 지시서 목록 가져오기 실패:", error);
    return {
      success: false,
      error: error.message || "상태별 배차 지시서 목록을 가져오는데 실패했습니다."
    };
  }
};

// 페이지네이션된 배차 지시서 목록 가져오기
export const getPaginatedDispatches = async (
  page: number = 1,
  pageSize: number = 10,
  status?: string
): Promise<ApiResponse<PaginatedResponse<Dispatch>>> => {
  try {
    const dispatchesRef = collection(db, COLLECTION_NAME);
    let q;
    
    if (status) {
      q = query(
        dispatchesRef,
        where("status", "==", status),
        orderBy("date", "desc"),
        orderBy("startTime"),
        limit(pageSize)
      );
    } else {
      q = query(
        dispatchesRef,
        orderBy("date", "desc"),
        orderBy("startTime"),
        limit(pageSize)
      );
    }
    
    // 첫 페이지 이후의 페이지는 시작점 설정
    if (page > 1) {
      // 이전 페이지의 마지막 문서 가져오기
      // 실제 구현에서는 이전 페이지의 마지막 문서 정보가 필요함
      // 여기서는 간단한 구현으로 대체
      const startAtDoc = null; // 이전 페이지의 마지막 문서
      if (startAtDoc) {
        q = query(q, startAfter(startAtDoc));
      }
    }
    
    const querySnapshot = await getDocs(q);
    const dispatches = querySnapshot.docs.map(convertDocToDispatch);
    
    // 전체 개수 (실제로는 별도 쿼리나 캐싱된 값을 사용해야 함)
    const totalQuery = status 
      ? query(dispatchesRef, where("status", "==", status))
      : dispatchesRef;
    const totalSnapshot = await getDocs(totalQuery);
    const total = totalSnapshot.size;
    
    return {
      success: true,
      data: {
        items: dispatches,
        total,
        page,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  } catch (error: any) {
    console.error("페이지네이션 배차 지시서 목록 가져오기 실패:", error);
    return {
      success: false,
      error: error.message || "배차 지시서 목록을 가져오는데 실패했습니다."
    };
  }
};

// 특정 배차 지시서 정보 가져오기
export const getDispatch = async (id: string): Promise<ApiResponse<Dispatch>> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const dispatch = convertDocToDispatch(docSnap);
      return {
        success: true,
        data: dispatch
      };
    } else {
      return {
        success: false,
        error: "배차 지시서 정보를 찾을 수 없습니다."
      };
    }
  } catch (error: any) {
    console.error("배차 지시서 정보 가져오기 실패:", error);
    return {
      success: false,
      error: error.message || "배차 지시서 정보를 가져오는데 실패했습니다."
    };
  }
};

// 배차 지시서 추가하기
export const addDispatch = async (dispatchData: Omit<Dispatch, "id">): Promise<ApiResponse<Dispatch>> => {
  try {
    const data = {
      ...dispatchData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, COLLECTION_NAME), data);
    
    const newDispatch: Dispatch = {
      id: docRef.id,
      ...dispatchData
    };
    
    return {
      success: true,
      data: newDispatch
    };
  } catch (error: any) {
    console.error("배차 지시서 추가 실패:", error);
    return {
      success: false,
      error: error.message || "배차 지시서 추가에 실패했습니다."
    };
  }
};

// 배차 지시서 업데이트
export const updateDispatch = async (
  id: string, 
  dispatchData: Partial<Omit<Dispatch, "id">>
): Promise<ApiResponse<Dispatch>> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    
    const data = {
      ...dispatchData,
      updatedAt: serverTimestamp()
    };
    
    await updateDoc(docRef, data);
    
    // 업데이트된 데이터 가져오기
    const updatedDoc = await getDoc(docRef);
    if (!updatedDoc.exists()) {
      return {
        success: false,
        error: "배차 지시서 정보를 찾을 수 없습니다."
      };
    }
    
    const updatedDispatch = convertDocToDispatch(updatedDoc);
    
    return {
      success: true,
      data: updatedDispatch
    };
  } catch (error: any) {
    console.error("배차 지시서 업데이트 실패:", error);
    return {
      success: false,
      error: error.message || "배차 지시서 업데이트에 실패했습니다."
    };
  }
};

// 배차 지시서 삭제하기
export const deleteDispatch = async (id: string): Promise<ApiResponse<void>> => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
    
    return {
      success: true
    };
  } catch (error: any) {
    console.error("배차 지시서 삭제 실패:", error);
    return {
      success: false,
      error: error.message || "배차 지시서 삭제에 실패했습니다."
    };
  }
};

// 배차 지시서 상태 변경
export const updateDispatchStatus = async (
  id: string, 
  status: "예정" | "진행중" | "완료" | "취소"
): Promise<ApiResponse<Dispatch>> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    
    await updateDoc(docRef, {
      status,
      updatedAt: serverTimestamp()
    });
    
    // 업데이트된 데이터 가져오기
    const updatedDoc = await getDoc(docRef);
    if (!updatedDoc.exists()) {
      return {
        success: false,
        error: "배차 지시서 정보를 찾을 수 없습니다."
      };
    }
    
    const updatedDispatch = convertDocToDispatch(updatedDoc);
    
    return {
      success: true,
      data: updatedDispatch
    };
  } catch (error: any) {
    console.error("배차 지시서 상태 업데이트 실패:", error);
    return {
      success: false,
      error: error.message || "배차 지시서 상태 업데이트에 실패했습니다."
    };
  }
};

// 특정 날짜의 배차 지시서 목록 가져오기 (확장 정보 포함)
export const getDispatchesWithDetails = async (date: string): Promise<ApiResponse<ExtendedDispatch[]>> => {
  try {
    // 먼저 해당 날짜의 배차 데이터를 가져옵니다
    const result = await getDispatchesByDate(date);
    
    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "배차 데이터를 가져오는데 실패했습니다."
      };
    }
    
    const dispatches = result.data;
    
    // 각 배차에 대해 차량, 운전병, 선탑자 정보를 가져옵니다
    const extendedDispatches = await Promise.all(
      dispatches.map(async (dispatch) => {
        // 차량 정보 가져오기
        const vehicleResult = await getVehicle(dispatch.vehicleId);
        const vehicleInfo = vehicleResult.success && vehicleResult.data 
          ? { 
              id: vehicleResult.data.id,
              number: vehicleResult.data.vehicleNumber,
              type: vehicleResult.data.vehicleType,
              name: vehicleResult.data.vehicleName
            }
          : null;
        
        // 운전병 정보 가져오기
        const driverResult = await getSoldier(dispatch.driverId);
        const driverInfo = driverResult.success && driverResult.data 
          ? {
              id: driverResult.data.id,
              name: driverResult.data.name,
              rank: driverResult.data.rank
            }
          : null;
        
        // 선탑자(간부) 정보 가져오기
        const officerResult = await getOfficer(dispatch.officerId);
        const officerInfo = officerResult.success && officerResult.data 
          ? {
              id: officerResult.data.id,
              name: officerResult.data.name,
              rank: officerResult.data.rank
            }
          : null;
        
        // 기본 배차 정보와 상세 정보 합치기
        return {
          ...dispatch,
          vehicleInfo,
          driverInfo,
          officerInfo
        };
      })
    );
    
    return {
      success: true,
      data: extendedDispatches
    };
  } catch (error: any) {
    console.error("상세 배차 정보 가져오기 실패:", error);
    return {
      success: false,
      error: error.message || "상세 배차 정보를 가져오는데 실패했습니다."
    };
  }
};

// 배차지시서 문서 추가
export const addDispatchDocument = async (document: Omit<DispatchDocument, "id" | "createdAt">): Promise<ApiResponse<string>> => {
  try {
    const docData = {
      ...document,
      createdAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, DOCUMENT_COLLECTION), docData);
    return {
      success: true,
      data: docRef.id
    };
  } catch (error: any) {
    console.error("배차지시서 문서 추가 실패:", error);
    return {
      success: false,
      error: error.message || "배차지시서 문서를 추가하는데 실패했습니다."
    };
  }
};

// 배차지시서 문서 목록 가져오기
export const getDispatchDocuments = async (): Promise<ApiResponse<DispatchDocument[]>> => {
  try {
    const documentsRef = collection(db, DOCUMENT_COLLECTION)
    const q = query(documentsRef, orderBy('createdAt', 'desc'))
    const querySnapshot = await getDocs(q)
    
    const documents: DispatchDocument[] = []
    
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      documents.push({
        id: doc.id,
        date: data.date,
        documentNumber: data.documentNumber,
        unitName: data.unitName,
        creator: data.creator,
        commanderName: data.commanderName,
        additionalNotes: data.additionalNotes,
        dispatchIds: data.dispatchIds || [],
        createdAt: data.createdAt instanceof Timestamp 
          ? data.createdAt.toDate() 
          : data.createdAt && typeof data.createdAt === 'string'
            ? new Date(data.createdAt)
            : new Date()
      })
    })
    
    return {
      success: true,
      data: documents
    }
  } catch (error: any) {
    console.error("배차지시서 문서 목록 조회 실패:", error)
    return {
      success: false,
      error: error.message || "배차지시서 문서 목록을 조회하는데 실패했습니다."
    }
  }
}

// 특정 배차지시서 문서 정보 가져오기
export const getDispatchDocument = async (docId: string): Promise<ApiResponse<DispatchDocument | null>> => {
  try {
    const docRef = doc(db, DOCUMENT_COLLECTION, docId)
    const docSnapshot = await getDoc(docRef)
    
    if (!docSnapshot.exists()) {
      return {
        success: false,
        error: "해당 배차지시서 문서를 찾을 수 없습니다."
      }
    }
    
    const data = docSnapshot.data()
    const documentData: DispatchDocument = {
      id: docSnapshot.id,
      date: data.date,
      documentNumber: data.documentNumber,
      unitName: data.unitName,
      creator: data.creator,
      commanderName: data.commanderName,
      additionalNotes: data.additionalNotes,
      dispatchIds: data.dispatchIds || [],
      createdAt: data.createdAt instanceof Timestamp 
        ? data.createdAt.toDate() 
        : data.createdAt && typeof data.createdAt === 'string'
          ? new Date(data.createdAt)
          : new Date()
    }
    
    return {
      success: true,
      data: documentData
    }
  } catch (error: any) {
    console.error("배차지시서 문서 조회 오류:", error)
    return {
      success: false,
      error: error.message || "배차지시서 문서를 조회하는 중 오류가 발생했습니다."
    }
  }
}

// 배차지시서 문서 삭제
export const deleteDispatchDocument = async (id: string): Promise<ApiResponse<void>> => {
  try {
    await deleteDoc(doc(db, DOCUMENT_COLLECTION, id));
    
    return {
      success: true
    };
  } catch (error: any) {
    console.error("배차지시서 문서 삭제 실패:", error);
    return {
      success: false,
      error: error.message || "배차지시서 문서 삭제에 실패했습니다."
    };
  }
}; 