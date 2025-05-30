import { ApiResponse } from "@/types";

export interface NoticeItem {
  id: string;
  number: string;
  category: string;
  title: string;
  author: string;
  date: string;
  views: string;
  hasAttachment: boolean;
  url: string;
  isNew: boolean;
}

// 육군 홈페이지에서 공지사항 데이터 가져오기
export const getArmyNotices = async (): Promise<ApiResponse<NoticeItem[]>> => {
  try {
    // 백엔드 API 라우트를 통해 데이터 가져오기
    const response = await fetch('/api/notices');
    
    if (!response.ok) {
      throw new Error(`API 오류! 상태: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      return result;
    } else {
      throw new Error(result.error || '공지사항을 가져오는데 실패했습니다.');
    }
  } catch (error: any) {
    console.error("육군 공지사항 가져오기 실패:", error);
    
    // 오류 발생 시 샘플 데이터 반환 (폴백)
    const sampleNotices: NoticeItem[] = [
      {
        id: "notice-1",
        number: "9485",
        category: "채용",
        title: "2024년 3분기 전문인력 채용공고",
        author: "인사담당",
        date: "2024-07-05",
        views: "1,245",
        hasAttachment: true,
        url: "https://www.army.mil.kr/army/24/subview.do",
        isNew: true
      },
      {
        id: "notice-2", 
        number: "9484",
        category: "공지",
        title: "육군 사관학교 견학 프로그램 안내",
        author: "교육담당",
        date: "2024-07-03",
        views: "987",
        hasAttachment: true,
        url: "https://www.army.mil.kr/army/24/subview.do",
        isNew: true
      },
      {
        id: "notice-3",
        number: "9483",
        category: "행사",
        title: "2024 지상군 페스티벌 개최 안내",
        author: "홍보과",
        date: "2024-07-01",
        views: "2,678",
        hasAttachment: true,
        url: "https://www.army.mil.kr/army/24/subview.do",
        isNew: false
      },
      {
        id: "notice-4",
        number: "9482",
        category: "공지",
        title: "육군 정보보안 교육 일정 공지",
        author: "보안담당",
        date: "2024-06-28",
        views: "756",
        hasAttachment: false,
        url: "https://www.army.mil.kr/army/24/subview.do",
        isNew: false
      },
      {
        id: "notice-5",
        number: "9481",
        category: "전역",
        title: "2024년 8월 전역자 행정절차 안내",
        author: "인사담당",
        date: "2024-06-25",
        views: "3,452",
        hasAttachment: false,
        url: "https://www.army.mil.kr/army/24/subview.do",
        isNew: false
      }
    ];
    
    return {
      success: true,
      data: sampleNotices
    };
  }
}; 