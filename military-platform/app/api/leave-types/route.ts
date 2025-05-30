import { NextResponse } from 'next/server';

// 휴가 종류 목록 기본값
const defaultLeaveTypes = [
  { id: "annual", name: "연가", isDefault: true },
  { id: "reward", name: "포상휴가", isDefault: true },
  { id: "medical", name: "병가", isDefault: true },
  { id: "special", name: "위로휴가", isDefault: true },
  { id: "other", name: "기타", isDefault: true }
];

export async function GET() {
  try {
    // TODO: 실제 구현에서는 여기서 데이터베이스에서 휴가 종류 목록을 가져올 수 있음
    // 현재는 기본 목록 반환
    return NextResponse.json({ 
      success: true, 
      leaveTypes: defaultLeaveTypes 
    });
  } catch (error) {
    console.error('휴가 종류 조회 오류:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '휴가 종류 목록을 불러오는데 실패했습니다.' 
      }, 
      { status: 500 }
    );
  }
} 