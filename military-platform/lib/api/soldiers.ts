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
  DocumentReference,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase";
import { ApiResponse, PaginatedResponse, Soldier, MentalHealthTest, PhysicalHealthTest } from "@/types";

// API 함수에서 사용할 타입 정의
export interface SoldierFormData { // @/types의 정의와 일치하는지 확인 필요
  name: string;
  serialNumber: string;
  rank: string;
  unit: string;
  position: string;
  enlistmentDate: Date | string; // Date 또는 ISO 문자열
  dischargeDate: Date | string; // Date 또는 ISO 문자열
  contact?: { // 객체 형태 또는 문자열(phone) 가능 가정
    phone: string;
    email?: string;
    address?: string;
    emergencyContact?: string;
  } | string;
  physicalHealthStatus: "건강" | "양호" | "이상"; // 변경된 필드명
  mentalHealthStatus: "건강" | "양호" | "이상"; // 변경된 필드명
  specialSkills?: string[] | string; // 문자열 또는 배열
  education?: string;
  note?: string;
  drivingSkill?: "요숙련" | "준숙련" | "숙련";
}

const COLLECTION_NAME = "users";

// Firestore 문서를 User 객체로 변환 (함수명 변경, 타입 확인)
const convertDocToUser = (doc: DocumentData): Soldier => { // 반환 타입 확인
  const data = doc.data();
  // users 컬렉션 스키마에 맞춰 필드 매핑 확인
  const contactData = data.contact || {}; // contact 필드가 객체 형태라고 가정, 없으면 빈 객체
  return {
    id: doc.id,
    serialNumber: data.serialNumber || '-',
    name: data.name || '이름 없음',
    rank: data.rank || '-',
    unit: data.unit || '-',
    enlistmentDate: data.enlistmentDate?.toDate?.()?.toISOString() || data.enlistmentDate,
    dischargeDate: data.dischargeDate?.toDate?.()?.toISOString() || data.dischargeDate,
    position: data.position || '-',
    contact: { // Soldier 타입의 contact 구조에 맞춤
        phone: contactData.phone || '-',
        email: contactData.email || '-',
        address: contactData.address || '-',
        emergencyContact: contactData.emergencyContact || '-'
    },
    physicalHealthStatus: data.physicalHealthStatus || data.healthStatus || '양호', // 구버전 호환성 유지
    mentalHealthStatus: data.mentalHealthStatus || '양호', // 새 필드 기본값
    avatar: data.avatar || undefined,
    specialSkills: data.specialSkills || [],
    education: data.education || '-',
    note: data.note || "",
    drivingSkill: data.drivingSkill || undefined,
    leaveStatus: data.leaveStatus || '-',
    currentLeaveId: data.currentLeaveId || undefined,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
  };
};

// SoldierFormData를 Firestore 형식으로 변환 (오류 수정)
const convertFormToFirestore = (data: Partial<SoldierFormData>) => {
  const firestoreData: any = { ...data };

  // 날짜 필드 Timestamp 변환 (타입 확인 추가)
  if (data.enlistmentDate) {
    firestoreData.enlistmentDate = data.enlistmentDate instanceof Date
      ? Timestamp.fromDate(data.enlistmentDate)
      : typeof data.enlistmentDate === 'string'
        ? Timestamp.fromDate(new Date(data.enlistmentDate))
        : data.enlistmentDate; // 예상치 못한 타입이면 그대로 둠 (또는 오류 처리)
  }
  if (data.dischargeDate) {
    firestoreData.dischargeDate = data.dischargeDate instanceof Date
      ? Timestamp.fromDate(data.dischargeDate)
      : typeof data.dischargeDate === 'string'
        ? Timestamp.fromDate(new Date(data.dischargeDate))
        : data.dischargeDate;
  }

  // contact 필드 처리 (문자열이면 phone으로 가정, 객체면 그대로 사용)
  if (typeof data.contact === 'string') {
      firestoreData.contact = { phone: data.contact };
  } else if (typeof data.contact === 'object' && data.contact !== null) {
      firestoreData.contact = data.contact;
  } else {
      delete firestoreData.contact;
  }

  // specialSkills가 문자열이면 배열로 변환 (타입 확인 추가)
  if (typeof data.specialSkills === 'string') {
      firestoreData.specialSkills = data.specialSkills.split(/\s*,\s*/);
  } else if (Array.isArray(data.specialSkills)) {
      firestoreData.specialSkills = data.specialSkills;
  } else {
      delete firestoreData.specialSkills; // 배열이나 문자열 아니면 제거
  }

  firestoreData.updatedAt = serverTimestamp();
  // createdAt은 addUser에서 별도 처리
  if (firestoreData.createdAt) delete firestoreData.createdAt;

  return firestoreData;
};

// 각 병사의 최신 심리 테스트 결과 조회 함수 (코드 중복 방지)
const updateSoldierWithLatestMentalHealthTest = async (soldier: Soldier): Promise<Soldier> => {
  try {
    const testsRef = collection(db, "mentalHealthTests");
    const testQuery = query(
      testsRef, 
      where("userId", "==", soldier.id),
      orderBy("testDate", "desc"),
      limit(1)
    );
    const testSnapshot = await getDocs(testQuery);
    if (!testSnapshot.empty) {
      const latestTest = testSnapshot.docs[0].data() as Omit<MentalHealthTest, 'id'>;
      // MentalHealthTest 타입의 status를 Soldier 타입의 mentalHealthStatus로 매핑
      let healthStatus: Soldier['mentalHealthStatus'] = '양호';
      if (latestTest.status === 'danger') {
        healthStatus = '이상';
      } else if (latestTest.status === 'caution') {
        healthStatus = '양호';
      } else if (latestTest.status === 'good') {
        healthStatus = '건강';
      }
      return { 
        ...soldier, 
        mentalHealthStatus: healthStatus, 
        latestTestDate: latestTest.testDate 
      };
    }
  } catch (testError) {
    console.error(`Failed to fetch mental health test for soldier ${soldier.id}:`, testError);
  }
  return soldier; // 테스트 결과 없거나 오류 시 기존 병사 정보 반환
};

// 각 병사의 최신 신체건강 테스트 결과 조회 함수 (코드 중복 방지)
const updateSoldierWithLatestPhysicalHealthTest = async (soldier: Soldier): Promise<Soldier> => {
  try {
    const testsRef = collection(db, "physicalHealthTests");
    const testQuery = query(
      testsRef, 
      where("userId", "==", soldier.id),
      orderBy("testDate", "desc"),
      limit(1)
    );
    const testSnapshot = await getDocs(testQuery);
    if (!testSnapshot.empty) {
      const latestTest = testSnapshot.docs[0].data() as Omit<PhysicalHealthTest, 'id'>;
      // PhysicalHealthTest 타입의 status를 Soldier 타입의 physicalHealthStatus로 매핑
      let healthStatus: Soldier['physicalHealthStatus'] = '양호';
      if (latestTest.status === 'bad') {
        healthStatus = '이상';
      } else if (latestTest.status === 'normal') {
        healthStatus = '양호';
      } else if (latestTest.status === 'good') {
        healthStatus = '건강';
      }
      return { 
        ...soldier, 
        physicalHealthStatus: healthStatus, 
        latestPhysicalTestDate: latestTest.testDate 
      };
    }
  } catch (testError) {
    console.error(`Failed to fetch physical health test for soldier ${soldier.id}:`, testError);
  }
  return soldier; // 테스트 결과 없거나 오류 시 기존 병사 정보 반환
};

// 병사 목록 가져오기
export const getSoldiers = async (): Promise<ApiResponse<Soldier[]>> => {
  try {
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    let soldiers = querySnapshot.docs.map(convertDocToUser);
    
    // 각 병사의 최신 심리 테스트 및 신체건강 테스트 결과 조회 및 상태 업데이트
    const updatedSoldiers = await Promise.all(
      soldiers.map(async (soldier) => {
        // 심리 테스트 결과 조회 및 업데이트
        const withMentalHealth = await updateSoldierWithLatestMentalHealthTest(soldier);
        // 신체건강 테스트 결과 조회 및 업데이트
        return await updateSoldierWithLatestPhysicalHealthTest(withMentalHealth);
      })
    );
    soldiers = updatedSoldiers;
    
    return {
      success: true,
      data: soldiers
    };
  } catch (error: any) {
    console.error("Error fetching soldiers:", error);
    return {
      success: false,
      error: error.message
    };
  }
};

// 페이지네이션된 병사 목록 가져오기
export const getPaginatedSoldiers = async (
  page: number = 1, 
  pageSize: number = 10,
  searchTerm: string = "",
  filterUnit: string = "",
  filterRank: string = ""
): Promise<ApiResponse<PaginatedResponse<Soldier>>> => {
  try {
    const soldiersRef = collection(db, COLLECTION_NAME);
    let q = query(soldiersRef, orderBy("name"));

    const querySnapshot = await getDocs(q);
    let soldiers = querySnapshot.docs.map(convertDocToUser);

    // 각 병사의 최신 심리 테스트 및 신체건강 테스트 결과 조회 및 상태 업데이트
    const updatedSoldiers = await Promise.all(
      soldiers.map(async (soldier) => {
        // 심리 테스트 결과 조회 및 업데이트
        const withMentalHealth = await updateSoldierWithLatestMentalHealthTest(soldier);
        // 신체건강 테스트 결과 조회 및 업데이트
        return await updateSoldierWithLatestPhysicalHealthTest(withMentalHealth);
      })
    );
    soldiers = updatedSoldiers;

    // 검색어 필터링 (이름 또는 군번)
    if (searchTerm) {
      soldiers = soldiers.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.serialNumber.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    // 부대 필터링
    if (filterUnit) {
      soldiers = soldiers.filter(s => s.unit === filterUnit);
    }
    // 계급 필터링
    if (filterRank) {
      soldiers = soldiers.filter(s => s.rank === filterRank);
    }

    const totalSoldiers = soldiers.length;
    const startIdx = (page - 1) * pageSize;
    const paginatedSoldiers = soldiers.slice(startIdx, startIdx + pageSize);
    
    return {
      success: true,
      data: {
        items: paginatedSoldiers,
        total: totalSoldiers,
        page,
        limit: pageSize,
        totalPages: Math.ceil(totalSoldiers / pageSize)
      }
    };
  } catch (error: any) {
    console.error("페이지네이션 병사 목록 가져오기 실패:", error);
    return {
      success: false,
      error: error.message || "병사 목록을 가져오는데 실패했습니다."
    };
  }
};

// 특정 병사 정보 가져오기
export const getSoldier = async (id: string): Promise<ApiResponse<Soldier>> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      let soldier = convertDocToUser(docSnap);
      
      // 심리 테스트 결과 조회 및 업데이트
      soldier = await updateSoldierWithLatestMentalHealthTest(soldier);
      // 신체건강 테스트 결과 조회 및 업데이트
      soldier = await updateSoldierWithLatestPhysicalHealthTest(soldier);
      
      return {
        success: true,
        data: soldier
      };
    } else {
      return {
        success: false,
        error: "병사 정보를 찾을 수 없습니다."
      };
    }
  } catch (error: any) {
    console.error("Error fetching soldier:", error);
    return {
      success: false,
      error: error.message
    };
  }
};

// 병사 추가하기
export const addSoldier = async (soldierData: SoldierFormData): Promise<ApiResponse<Soldier>> => {
  try {
    const formattedData = {
      ...soldierData,
      enlistmentDate: soldierData.enlistmentDate instanceof Date 
        ? soldierData.enlistmentDate.toISOString()
        : soldierData.enlistmentDate,
      dischargeDate: soldierData.dischargeDate instanceof Date
        ? soldierData.dischargeDate.toISOString()
        : soldierData.dischargeDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const docRef = await addDoc(collection(db, COLLECTION_NAME), formattedData);
    
    const newSoldier: Soldier = {
      id: docRef.id,
      ...formattedData
    } as Soldier;
    
    return {
      success: true,
      data: newSoldier
    };
  } catch (error: any) {
    console.error("Error adding soldier:", error);
    return {
      success: false,
      error: error.message
    };
  }
};

// 병사 정보 업데이트
export const updateSoldier = async (
  id: string, 
  soldierData: Partial<SoldierFormData> & { [key: string]: any }
): Promise<ApiResponse<Soldier>> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return {
        success: false,
        error: "병사 정보를 찾을 수 없습니다."
      };
    }
    
    // 형식에 맞게 데이터 가공
    const updateData: { [key: string]: any } = {
      updatedAt: serverTimestamp()
    };
    
    // 기존 데이터 가져오기
    const existingData = docSnap.data();
    
    // 업데이트할 필드만 가공하여 추가
    Object.keys(soldierData).forEach(key => {
      if (soldierData[key] !== undefined) {
        if (key === 'enlistmentDate' && soldierData.enlistmentDate) {
          updateData.enlistmentDate = soldierData.enlistmentDate instanceof Date
            ? Timestamp.fromDate(soldierData.enlistmentDate)
            : existingData.enlistmentDate;
        } else if (key === 'dischargeDate' && soldierData.dischargeDate) {
          updateData.dischargeDate = soldierData.dischargeDate instanceof Date
            ? Timestamp.fromDate(soldierData.dischargeDate)
            : existingData.dischargeDate;
        } else {
          updateData[key] = soldierData[key];
        }
      }
    });
    
    await updateDoc(docRef, updateData);
    
    // 업데이트된 데이터 가져오기
    const updatedDocSnap = await getDoc(docRef);
    const updatedSoldier = convertDocToUser(updatedDocSnap);
    
    return {
      success: true,
      data: updatedSoldier
    };
  } catch (error: any) {
    console.error("Error updating soldier:", error);
    return {
      success: false,
      error: error.message
    };
  }
};

// 병사 삭제하기
export const deleteSoldier = async (id: string): Promise<ApiResponse<void>> => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
    
    return {
      success: true
    };
  } catch (error: any) {
    console.error("Error deleting soldier:", error);
    return {
      success: false,
      error: error.message
    };
  }
};

// 운전병 목록 가져오기
export const getDrivers = async (): Promise<ApiResponse<Soldier[]>> => {
  try {
    const soldiersRef = collection(db, COLLECTION_NAME);
    // 인덱스가 필요하지 않은 단순 쿼리로 변경
    const q = query(
      soldiersRef,
      where("position", "==", "운전병")
    );
    
    const querySnapshot = await getDocs(q);
    // 클라이언트 측에서 필터링 수행
    const drivers = querySnapshot.docs
      .map(convertDocToUser)
      .filter(soldier => soldier.drivingSkill) // null이 아닌 drivingSkill을 가진 병사만 필터링
      .sort((a, b) => {
        // 클라이언트 측 정렬 (drivingSkill 기준 정렬 후 rank 기준 정렬)
        const skillOrder = { "요숙련": 1, "준숙련": 2, "숙련": 3 };
        const rankOrder = { "이병": 1, "일병": 2, "상병": 3, "병장": 4 };
        
        const skillA = skillOrder[(a.drivingSkill || "요숙련") as keyof typeof skillOrder] || 0;
        const skillB = skillOrder[(b.drivingSkill || "요숙련") as keyof typeof skillOrder] || 0;
        
        if (skillA !== skillB) return skillA - skillB;
        
        const rankA = rankOrder[a.rank as keyof typeof rankOrder] || 0;
        const rankB = rankOrder[b.rank as keyof typeof rankOrder] || 0;
        
        return rankA - rankB;
      });
    
    return {
      success: true,
      data: drivers
    };
  } catch (error: any) {
    console.error("운전병 목록 가져오기 실패:", error);
    return {
      success: false,
      error: error.message || "운전병 목록을 가져오는데 실패했습니다."
    };
  }
};

// 소속별 병사 조회
export async function getSoldiersByUnit(unit: string): Promise<ApiResponse<Soldier[]>> {
  try {
    const q = query(collection(db, COLLECTION_NAME), where("unit", "==", unit));
    const querySnapshot = await getDocs(q);
    let soldiers = querySnapshot.docs.map(convertDocToUser);
    
    // 각 병사의 최신 심리 테스트 및 신체건강 테스트 결과 조회 및 상태 업데이트
    const updatedSoldiers = await Promise.all(
      soldiers.map(async (soldier) => {
        // 심리 테스트 결과 조회 및 업데이트
        const withMentalHealth = await updateSoldierWithLatestMentalHealthTest(soldier);
        // 신체건강 테스트 결과 조회 및 업데이트
        return await updateSoldierWithLatestPhysicalHealthTest(withMentalHealth);
      })
    );
    soldiers = updatedSoldiers;
    
    return {
      success: true,
      data: soldiers
    };
  } catch (error: any) {
    console.error("Error fetching soldiers by unit:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 사용자 추가하기 (함수명 변경)
export const addUser = async (userData: SoldierFormData): Promise<ApiResponse<Soldier>> => {
  try {
    const formattedData = convertFormToFirestore(userData);
    formattedData.createdAt = serverTimestamp(); // createdAt 추가

    const docRef = await addDoc(collection(db, COLLECTION_NAME), formattedData);
    const newDocSnap = await getDoc(docRef);
    if (!newDocSnap.exists()) {
      throw new Error("Failed to fetch newly added user data.");
    }
    const newUser = convertDocToUser(newDocSnap);
    return { success: true, data: newUser };

  } catch (error: any) {
    console.error("Error adding user:", error);
    return { success: false, error: error.message || "Failed to add user" };
  }
};

// 사용자 정보 업데이트 (함수명 변경)
export const updateUser = async (id: string, userData: Partial<SoldierFormData>): Promise<ApiResponse<Soldier>> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const formattedData = convertFormToFirestore(userData);
    // formattedData에서 createdAt 필드 제거 (업데이트 시 불필요)
    // convertFormToFirestore에서 이미 제거함

    await updateDoc(docRef, formattedData);
    const updatedDocSnap = await getDoc(docRef);
    if (!updatedDocSnap.exists()) {
      throw new Error("Failed to fetch updated user data.");
    }
    const updatedUser = convertDocToUser(updatedDocSnap);
    return { success: true, data: updatedUser };

  } catch (error: any) {
    console.error("Error updating user:", error);
    return { success: false, error: error.message || "Failed to update user" };
  }
};

// 사용자 삭제하기
export const deleteUser = async (id: string): Promise<ApiResponse<void>> => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
    
    return {
      success: true
    };
  } catch (error: any) {
    console.error("Error deleting user:", error);
    return {
      success: false,
      error: error.message
    };
  }
};

// 특정 병사의 심리 테스트 결과 목록 가져오기
export const getSoldierMentalHealthTests = async (userId: string): Promise<ApiResponse<MentalHealthTest[]>> => {
  try {
    const testsRef = collection(db, "mentalHealthTests");
    const q = query(testsRef, where("userId", "==", userId), orderBy("testDate", "desc"));
    const querySnapshot = await getDocs(q);
    const tests = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        testDate: data.testDate.toDate().toISOString(), // Firestore Timestamp를 ISO 문자열로 변환
      } as MentalHealthTest;
    });
    return {
      success: true,
      data: tests
    };
  } catch (error: any) {
    console.error("Error fetching soldier mental health tests:", error);
    return {
      success: false,
      error: error.message || "심리 테스트 결과를 가져오는데 실패했습니다."
    };
  }
};

// 특정 병사의 신체건강 테스트 결과 목록 가져오기
export const getSoldierPhysicalHealthTests = async (userId: string): Promise<ApiResponse<PhysicalHealthTest[]>> => {
  try {
    const testsRef = collection(db, "physicalHealthTests");
    const q = query(testsRef, where("userId", "==", userId), orderBy("testDate", "desc"));
    const querySnapshot = await getDocs(q);
    const tests = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        testDate: data.testDate.toDate().toISOString(), // Firestore Timestamp를 ISO 문자열로 변환
      } as PhysicalHealthTest;
    });
    return {
      success: true,
      data: tests
    };
  } catch (error: any) {
    console.error("Error fetching soldier physical health tests:", error);
    return {
      success: false,
      error: error.message || "신체건강 테스트 결과를 가져오는데 실패했습니다."
    };
  }
}; 