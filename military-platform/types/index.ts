import { Timestamp } from 'firebase/firestore';

// 병사 관련 타입
export interface Soldier {
  id: string;
  serialNumber: string;       // 군번
  name: string;               // 이름
  rank: string;               // 계급
  unit: string;               // 소속 (소대)
  enlistmentDate: string;     // 입대일 (ISO 문자열)
  dischargeDate: string;      // 전역예정일 (ISO 문자열)
  position: string;           // 보직 (행정병, 운전병, 통신병 등)
  contact: {                  // 연락처
    phone: string;            // 전화번호
    email: string;            // 이메일
    address: string;          // 주소
    emergencyContact: string; // 비상연락처
  };
  physicalHealthStatus: "건강" | "양호" | "이상";  // 신체건강상태 (변경)
  mentalHealthStatus: "건강" | "양호" | "이상";    // 정신건강상태 (변경)
  avatar?: string;             // 프로필 이미지 URL
  specialSkills: string[];    // 특기
  education: string;          // 학력
  note: string;               // 특이사항
  drivingSkill?: "요숙련" | "준숙련" | "숙련";  // 운전기량
  leaveStatus?: "재대기" | "휴가중";  // 휴가 상태
  currentLeaveId?: string;    // 현재 휴가 ID (휴가중인 경우)
  latestTestDate?: string;    // 최신 심리 테스트 날짜 (ISO 문자열)
  latestPhysicalTestDate?: string; // 최신 신체 테스트 날짜 (ISO 문자열)
  createdAt?: string;         // 생성일 (ISO 문자열)
  updatedAt?: string;         // 수정일 (ISO 문자열)
}

// 보직 타입
export interface Position {
  id: number;
  name: string;
}

// 차량 관련 타입
export interface Vehicle {
  id: string;
  vehicleNumber: string;      // 차량번호
  vehicleType: string;        // 차종
  vehicleName: string;        // 차량명
  capacity: number;           // 정원
  status: "운행가능" | "정비중" | "운행중";  // 상태
}

// 운전병 관련 타입
export interface Driver extends Omit<Soldier, "position"> {
  position: "운전병";
  drivingSkill: "요숙련" | "준숙련" | "숙련";
  available: boolean;
}

// 간부(선탑자) 관련 타입
export interface Officer {
  id: string;
  name: string;               // 이름
  rank: string;               // 계급
  unit: string;               // 소속
  position: string;           // 직책
  birthDate?: string;         // 생년월일 (ISO 문자열)
  contact: string;            // 연락처
  status: "재직" | "휴가" | "출장" | "교육";  // 상태
  available: boolean;         // 선탑자 가용 여부
  currentLeaveId?: string;    // 현재 휴가 ID (휴가중인 경우)
  notes?: string;             // 특이사항
}

// 배차 지시 관련 타입
export interface Dispatch {
  id: string;
  date: string;               // 날짜
  startTime: string;          // 시작 시간
  endTime: string;            // 종료 시간
  vehicleId: string;          // 차량 ID
  driverId: string;           // 운전병 ID
  officerId: string;          // 선탑자(간부) ID
  destination: string;        // 목적지
  purpose: string;            // 사용 목적
  passengerCount: number;     // 탑승 인원
  status: "예정" | "진행중" | "완료" | "취소";  // 상태
  notes: string;              // 비고
  isFixedRoute?: boolean;     // 고정 배차 여부
}

// 확장된 배차 정보 타입 (상세 정보 포함)
export interface ExtendedDispatch extends Dispatch {
  vehicleInfo?: {
    id: string;
    number: string;
    type: string;
    name: string;
  } | null;
  driverInfo?: {
    id: string;
    name: string;
    rank: string;
  } | null;
  officerInfo?: {
    id: string;
    name: string;
    rank: string;
  } | null;
}

// 근무표 관련 타입
export interface Duty {
  id: number;
  date: string;
  type: string;
  soldiers: Pick<Soldier, "id" | "name" | "rank" | "avatar">[];
}

// 보고서 관련 타입
export interface Report {
  id: number;
  title: string;
  category: string;
  created: string;
  author: string;
  status: string;
  type: string;
}

// 템플릿 관련 타입
export interface Template {
  id: number;
  title: string;
  category: string;
  lastUsed: string;
  type: string;
}

// API 응답 관련 타입
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// 페이지네이션 관련 타입
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// 병사 생성/수정 폼 데이터 타입
export interface SoldierFormData {
  serialNumber: string;
  name: string;
  rank: string;
  unit: string;
  enlistmentDate: string;
  dischargeDate: string;
  position: string;
  contact: {
    phone: string;
    email: string;
    address: string;
    emergencyContact: string;
  };
  healthStatus: "양호" | "경계" | "관심";
  mentalHealthRisk: "낮음" | "중간" | "높음";
  specialSkills: string[];
  education: string;
  note: string;
  drivingSkill?: "요숙련" | "준숙련" | "숙련";
}

// 배차지시서 관련 타입
export interface DispatchDocument {
  id: string;
  date: string; // 배차 지시서 날짜 (YYYY-MM-DD)
  documentNumber: string; // 문서 번호
  unitName: string; // 부대명
  creator: string; // 작성자
  commanderName: string; // 지휘관 이름
  additionalNotes?: string; // 추가 참고사항
  dispatchIds: string[]; // 이 문서에 포함된 배차 ID 목록
  createdAt: Date; // 문서 생성 시간
}

// 휴가 관련 타입
export interface Leave {
  id: string;
  personId: string;
  personType: "soldier" | "officer";
  personName: string;
  personRank?: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  destination: string;
  contact: string;
  reason: string;
  status: "pending" | "approved" | "rejected" | "personal";
  duration: number;
  createdAt: string;
  updatedAt: string;
  approverName?: string;
}

// 휴가 통계를 위한 타입 (수정)
export interface LeaveStats {
  totalLeaves: number;
  personnelStats: {
    soldiers: number;
    officers: number;
  };
  typeStats: Record<string, number>;
  unitStats: Record<string, number>;
  statusStats: Record<string, number>;
}

// 경계작전 근무 유형
export type GuardDutyType = "불침번" | "CCTV";

// 근무 시간대 타입
export type GuardDutyShift = "1번초" | "2번초" | "3번초" | "4번초" | "5번초";

// 요일 타입
export type DayOfWeekType = "평일" | "토요일" | "공휴일";

// 경계작전 근무자 정보
export interface GuardDutyAssignment {
  id: string;
  soldierId: string;
  soldierName: string;
  soldierRank: string;
  unit: string;
  date: string; // ISO 형식 날짜
  dutyType: GuardDutyType;
  shift: GuardDutyShift;
  startTime: string; // 24시간 형식 (HH:MM)
  endTime: string; // 24시간 형식 (HH:MM)
  isCompleted: boolean;
  isReplacement: boolean; // 교대 여부
  originalSoldierId?: string; // 교대 시 원래 병사 ID
  replacementDate?: string; // 교대 날짜
  createdAt: string;
  updatedAt: string;
}

// 경계작전 명령서
export interface GuardOperationOrder {
  id: string;
  title: string;
  documentNumber: string;
  year: number;
  month: number;
  createdAt: string;
  createdBy: string;
  approvedBy?: string;
  status: "초안" | "승인" | "완료";
  notes?: string;
  dutyAssignments: {
    id: string;
    date: string;
    shift: string;
    startTime: string;
    endTime: string;
    soldierName: string;
    soldierRank: string;
    position?: string;
  }[];
}

// 경계작전 통계
export interface GuardDutyStats {
  soldierId: string;
  soldierName: string;
  soldierRank: string;
  totalDuties: number;
  dutyByType: {
    불침번: number;
    CCTV: number;
  };
  dutyByShift: {
    "1번초": number;
    "2번초": number;
    "3번초": number;
    "4번초": number;
    "5번초": number;
  };
}

// --- 추가: 일정 신청 이벤트 타입 ---
export interface ScheduleEvent {
  id: string;
  userId: string; // 신청자 ID
  type: string;     // 'leave', 'outing', 'stayOut', 'medical', 'personal', 'grantedLeave' 등
  title: string;
  startDate: Timestamp | string; // Firestore Timestamp 또는 ISO 문자열
  endDate?: Timestamp | string;
  status: 'pending' | 'approved' | 'rejected' | 'personal';
  reason?: string;
  days?: number;     // 휴가일 경우 일수
  duration?: number; // days와 동일한 목적
  requestedAt?: Timestamp | string; // 신청 시각
  reviewerName?: string;
  approverName?: string;
  processedBy?: string; // 처리자 ID (예: 관리자 UID)
  processedAt?: Timestamp | string; // 처리 시각
  // 웹에서 표시하기 위해 추가될 수 있는 필드 (API 함수에서 채움)
  requesterName?: string; // 신청자 이름
  requesterRank?: string; // 신청자 계급
  // 휴가 관련 추가 필드
  leaveTypes?: Array<{id: string, name: string, days?: number, daysSelected?: number}>; // 휴가 유형 목록
  leaveType?: string; // 단일 휴가 유형
  personName?: string; // 인원 이름
  personRank?: string; // 인원 계급
  personType?: 'soldier' | 'officer'; // 인원 구분
  destination?: string; // 목적지
  contact?: string; // 연락처
  createdAt?: Timestamp | string; // 생성 시각
  updatedAt?: Timestamp | string; // 수정 시각
}

// --- 추가: 외진 슬롯 타입 ---
export interface MedicalAppointmentSlot {
  id: string; // Firestore document ID
  appointmentDate: Date | Timestamp; // 클라이언트 Timestamp 사용
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  location: string;
  department: string;
  maxCapacity: number;
  applicantIds: string[];
  notes?: string;
  createdAt?: Date | Timestamp;
  updatedAt?: Date | Timestamp;
  status: 'available' | 'full' | 'cancelled';
}

// 심리 테스트 결과 타입
export interface MentalHealthTest {
  id: string;
  userId: string;
  userName: string;
  unitCode?: string; // 부대 코드 (선택적)
  unitName?: string; // 부대 이름 (선택적)
  rank: string;
  testDate: string; // Firestore Timestamp ISO 문자열
  score: number;
  status: 'danger' | 'caution' | 'good'; // 위험, 주의, 양호
  answers?: { questionId: number; answer: number }[]; // 답변 내용 (선택적)
  createdAt?: string; // Firestore Timestamp ISO 문자열 (선택적)
}

// 신체건강 테스트 결과 타입
export interface PhysicalHealthTest {
  id: string;
  userId: string;
  userName: string;
  unitCode?: string; // 부대 코드 (선택적)
  unitName?: string; // 부대 이름 (선택적)
  rank: string;
  testDate: string; // Firestore Timestamp ISO 문자열
  score: number;
  status: 'bad' | 'normal' | 'good'; // 이상, 양호, 건강
  items: { 
    id: number; 
    category: string; // 체력, 질병, 부상 등 카테고리
    name: string; 
    value: number; 
    unit?: string; // 단위 (cm, kg 등)
    status: 'bad' | 'normal' | 'good';
  }[];
  note?: string; // 비고, 특이사항
  createdAt?: string; // Firestore Timestamp ISO 문자열 (선택적)
}

// 근무 유형
// ... existing code ... 