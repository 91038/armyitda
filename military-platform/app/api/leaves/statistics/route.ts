import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { LeaveStats } from '@/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'year';
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString(), 10);
    const month = searchParams.get('month') ? parseInt(searchParams.get('month'), 10) : undefined;

    let startDate, endDate;

    if (period === 'year') {
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31, 23, 59, 59);
    } else if (period === 'month' && month !== undefined) {
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59);
    } else {
      return NextResponse.json(
        { message: '유효하지 않은 기간 파라미터입니다.' },
        { status: 400 }
      );
    }

    // 해당 기간의 모든 휴가 조회
    const leaves = await prisma.leave.findMany({
      where: {
        startDate: {
          gte: startDate
        },
        endDate: {
          lte: endDate
        }
      },
      include: {
        soldier: {
          select: {
            id: true,
            name: true,
            rank: true,
            unit: true
          }
        },
        officer: {
          select: {
            id: true,
            name: true,
            rank: true,
            unit: true
          }
        }
      }
    });

    // 총 휴가 수
    const totalLeaves = leaves.length;

    // 인원별 통계 (병사/간부)
    const soldierLeaves = leaves.filter(leave => leave.personType === 'soldier');
    const officerLeaves = leaves.filter(leave => leave.personType === 'officer');

    // 유형별 통계
    const typeStats = leaves.reduce((acc, leave) => {
      const leaveType = leave.leaveType;
      if (!acc[leaveType]) {
        acc[leaveType] = 0;
      }
      acc[leaveType]++;
      return acc;
    }, {} as Record<string, number>);

    // 부대별 통계
    const unitStats = leaves.reduce((acc, leave) => {
      const person = leave.personType === 'soldier' ? leave.soldier : leave.officer;
      if (person) {
        const unit = person.unit;
        if (!acc[unit]) {
          acc[unit] = 0;
        }
        acc[unit]++;
      }
      return acc;
    }, {} as Record<string, number>);

    // 상태별 통계
    const statusStats = leaves.reduce((acc, leave) => {
      const status = leave.status;
      if (!acc[status]) {
        acc[status] = 0;
      }
      acc[status]++;
      return acc;
    }, {} as Record<string, number>);

    const stats: LeaveStats = {
      totalLeaves,
      personnelStats: {
        soldiers: soldierLeaves.length,
        officers: officerLeaves.length
      },
      typeStats,
      unitStats,
      statusStats
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('휴가 통계 조회 중 오류 발생:', error);
    return NextResponse.json(
      { message: '휴가 통계를 가져오는데 실패했습니다.' },
      { status: 500 }
    );
  }
} 