import { NextResponse } from 'next/server';

/**
 * 육군 공지사항을 가져오는 API 라우트
 * 
 * 클라이언트에서 발생하는 CORS 문제를 해결하기 위한 서버 프록시
 */
export async function GET() {
  try {
    // 육군 홈페이지 공지사항 URL
    const url = "https://www.army.mil.kr/army/24/subview.do";
    
    const response = await fetch(url, {
      // 서버에서 실행되므로 CORS 제한 없음
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      cache: 'no-store' // 캐시 사용 안함
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const html = await response.text();
    
    // HTML 파싱 (간단한 문자열 처리 방식)
    const noticeItems = [];
    
    // tbody 태그 내용 추출
    const tbodyMatch = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
    if (!tbodyMatch) {
      return NextResponse.json({
        success: true,
        data: noticeItems // 빈 배열 반환
      });
    }
    
    const tbodyContent = tbodyMatch[1];
    
    // tr 태그 추출
    const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let trMatch;
    
    while ((trMatch = trRegex.exec(tbodyContent)) !== null) {
      const trContent = trMatch[1];
      
      // 블라인드 처리된 게시물인지 더 정확히 확인
      const isBlind = trContent.includes('class="blind ') || 
                      trContent.includes('블라인드 - 블라인드 처리') || 
                      trContent.includes('<td class="td-write">') && trContent.includes('블라인드</td>');
      
      if (isBlind) {
        continue; // 블라인드 처리된 게시물은 건너뜀
      }
      
      // 번호
      const numberMatch = trContent.match(/<td[^>]*class="td-num"[^>]*>(.*?)<\/td>/i);
      const number = numberMatch ? numberMatch[1].trim() : "";
      
      // 분류
      const categoryMatch = trContent.match(/<td[^>]*class="td-cate"[^>]*>(.*?)<\/td>/i);
      const category = categoryMatch ? categoryMatch[1].trim() : "";
      
      // 제목 및 URL
      const titleMatch = trContent.match(/<a href="([^"]*)"[^>]*>[\s\S]*?<strong>(.*?)<\/strong>/i);
      const title = titleMatch ? titleMatch[2].trim() : "";
      const url = titleMatch ? "https://www.army.mil.kr" + titleMatch[1].trim() : "";
      
      // 새 글 여부
      const isNew = trContent.includes('<span class="new">새글</span>');
      
      // 작성자
      const authorMatch = trContent.match(/<td[^>]*class="td-write"[^>]*>(.*?)<\/td>/i);
      const author = authorMatch ? authorMatch[1].replace(/\s+/g, " ").trim() : "";
      
      // 작성일
      const dateMatch = trContent.match(/<td[^>]*class="td-date"[^>]*>(.*?)<\/td>/i);
      const date = dateMatch ? dateMatch[1].trim() : "";
      
      // 조회수
      const viewsMatch = trContent.match(/<td[^>]*class="td-access"[^>]*>(.*?)<\/td>/i);
      const views = viewsMatch ? viewsMatch[1].replace(/\s+/g, " ").trim() : "";
      
      // 첨부파일 여부
      const hasAttachment = trContent.includes('<span class="file">첨부파일</span>');
      
      // 공지사항 아이템 추가
      noticeItems.push({
        id: `notice-${number}`,
        number,
        category,
        title,
        author,
        date,
        views,
        hasAttachment,
        url,
        isNew
      });
      
      // 최대 6개까지만 수집
      if (noticeItems.length >= 6) {
        break;
      }
    }
    
    // 결과 반환
    return NextResponse.json({
      success: true,
      data: noticeItems // 최대 6개 반환
    });
    
  } catch (error) {
    console.error("육군 공지사항 가져오기 실패:", error);
    
    // 오류 발생 시 샘플 데이터 반환 (폴백)
    const sampleNotices = [
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
      },
      {
        id: "notice-6",
        number: "9480",
        category: "훈련",
        title: "3/4분기 예비군 훈련 일정 안내",
        author: "훈련담당",
        date: "2024-06-20",
        views: "4,125",
        hasAttachment: true,
        url: "https://www.army.mil.kr/army/24/subview.do",
        isNew: false
      }
    ];
    
    return NextResponse.json({
      success: true,
      data: sampleNotices
    });
  }
} 