import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(num: number): string {
  return num.toLocaleString('ko-KR')
}

/**
 * 상태값 매핑 함수 - 모바일앱과 웹앱 간 일관성 유지
 * @param status 원본 상태값
 * @param toKorean 한국어 변환 여부
 * @returns 표준화된 상태값
 */
export const normalizeStatus = (status: string, toKorean = false): "pending" | "approved" | "rejected" | "personal" | string => {
  // 영문 -> 영문 표준화
  const normalized = (() => {
    switch (status.toLowerCase()) {
      case 'pending':
      case '신청':
      case '대기':
      case '대기중':
        return 'pending';
      case 'approved':
      case '승인':
      case '승인됨':
        return 'approved';
      case 'rejected':
      case '거절':
      case '반려':
      case '반려됨':
        return 'rejected';
      case 'personal':
      case '개인':
        return 'personal';
      default:
        return status;
    }
  })();

  // 필요시 한국어로 변환
  if (toKorean) {
    switch (normalized) {
      case 'pending': return '신청';
      case 'approved': return '승인';
      case 'rejected': return '거절';
      case 'personal': return '개인';
      default: return normalized;
    }
  }

  return normalized;
};

/**
 * Firestore Timestamp 또는 문자열을 ISO 문자열로 변환
 * @param timestamp Timestamp 또는 Date 문자열
 * @returns ISO 형식의 문자열
 */
export const normalizeTimestamp = (timestamp: any): string => {
  if (!timestamp) return new Date().toISOString();

  // 이미 문자열인 경우
  if (typeof timestamp === 'string') {
    // ISO 문자열인지 확인
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(timestamp)) {
      return timestamp;
    }
    // 다른 형식의 날짜 문자열인 경우 Date 객체로 변환 후 ISO 문자열로
    return new Date(timestamp).toISOString();
  }

  // Firestore Timestamp인 경우
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate().toISOString();
  }

  // Date 객체인 경우
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }

  // 처리할 수 없는 형식인 경우 현재 시간 반환
  console.warn('Unknown timestamp format:', timestamp);
  return new Date().toISOString();
};

/**
 * ISO 문자열을 Date 객체로 변환
 * @param isoString ISO 형식의 문자열
 * @returns Date 객체
 */
export const isoToDate = (isoString: string): Date => {
  return new Date(isoString);
};

/**
 * 휴가 유형 정규화 함수
 * @param leaveType 원본 휴가 유형
 * @returns 정규화된 휴가 유형
 */
export const normalizeLeaveType = (
  leaveType: string | { id: string; name: string; days?: number }[] | undefined
): string => {
  if (!leaveType) return '휴가';

  // 이미 문자열인 경우
  if (typeof leaveType === 'string') {
    return leaveType;
  }

  // 객체 배열인 경우
  if (Array.isArray(leaveType) && leaveType.length > 0) {
    if (leaveType.length === 1) {
      return leaveType[0].name || '휴가';
    } else {
      return leaveType.map(lt => lt.name).join('+') || '휴가';
    }
  }

  return '휴가';
};
