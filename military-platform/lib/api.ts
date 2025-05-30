export async function getLeaves() {
  try {
    const response = await fetch('/api/leaves', {
      cache: 'no-store',
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '휴가 목록을 가져오는데 실패했습니다.');
    }
    return response.json();
  } catch (error) {
    console.error('Error fetching leaves:', error);
    throw error;
  }
}

export async function getLeaveStats(period: string, year: number, month?: number) {
  try {
    let url = `/api/leaves/statistics?period=${period}&year=${year}`;
    if (period === 'month' && month !== undefined) {
      url += `&month=${month}`;
    }
    
    const response = await fetch(url, {
      cache: 'no-store',
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '휴가 통계를 가져오는데 실패했습니다.');
    }
    
    return response.json();
  } catch (error) {
    console.error('Error fetching leave statistics:', error);
    throw error;
  }
} 