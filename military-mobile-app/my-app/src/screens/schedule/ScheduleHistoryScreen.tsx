import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { getApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { format, differenceInDays } from 'date-fns';
import { Divider, List, Card, Chip, Paragraph, Title, Button, IconButton } from 'react-native-paper';

// 일정 상태에 따른 색상/텍스트 매핑 (아이콘 추가)
const statusMap: { [key: string]: { text: string; color: string; icon: string } } = {
  pending: { text: '대기', color: 'orange', icon: 'clock-outline' },
  approved: { text: '승인', color: 'green', icon: 'check-circle-outline' },
  rejected: { text: '반려', color: 'red', icon: 'close-circle-outline' },
  personal: { text: '개인', color: 'blue', icon: 'account-circle-outline' },
  default: { text: '알 수 없음', color: 'grey', icon: 'help-circle-outline' },
};

// 일정 타입 한글 변환
const typeMap: { [key: string]: string } = {
    leave: '연가',
    medical: '병가',
    outing: '외출',
    stayOut: '외박',
    rewardLeave: '포상휴가',
    other: '기타 휴가',
    personal: '개인 일정',
    duty: '당직' // 예시: 다른 타입 추가 가능
};

// Firestore Timestamp를 Date 객체로 안전하게 변환하는 함수 (ISO 문자열 가정)
const parseFirestoreTimestamp = (timestamp: string | undefined): Date | null => {
  if (!timestamp) return null;
  try {
    return new Date(timestamp);
  } catch (e) {
    console.error("Error parsing timestamp:", e);
    return null;
  }
};

export interface ScheduleEvent {
  id: string;
  type: string;
  title: string;
  startDate: string; // ISO String
  endDate?: string; // ISO String
  status: 'pending' | 'approved' | 'rejected' | 'personal';
  reason?: string;
  days?: number;
  // 필요한 다른 필드 추가 가능 (예: 검토자, 승인자 정보)
  reviewerName?: string;
  approverName?: string;
  requestedAt?: string; // Firestore Timestamp를 ISO 문자열로 받을 것으로 가정
  // 추가 필드 정의
  requesterId?: string;
  requesterName?: string;
  requesterRank?: string;
  requesterUnit?: string;
  processedAt?: string; // ISO String for processed timestamp
}

// --- 추가: 색상 이름을 RGBA로 변환하는 헬퍼 함수 ---
const colorNameToRgba = (colorName: string, alpha: number): string => {
    const colors: { [key: string]: string } = {
        orange: '255, 165, 0',
        green: '76, 175, 80',
        red: '244, 67, 54',
        blue: '33, 150, 243',
        grey: '158, 158, 158',
    };
    const rgb = colors[colorName.toLowerCase()] || colors.grey; // 기본값 grey
    return `rgba(${rgb}, ${alpha})`;
};
// ----------------------------------------------

// 네비게이션 스택 파라미터 타입 정의 (필요시)
// 예시: export type RootStackParamList = { ScheduleHistory: undefined; CertificateViewer: { schedule: ScheduleEvent }; };
// 실제 스택 정의에 따라 수정해야 합니다. 여기서는 간단히 any 사용
type ScheduleHistoryNavigationProp = NavigationProp<any>;

const ScheduleHistoryScreen: React.FC = () => {
  const navigation = useNavigation<ScheduleHistoryNavigationProp>();
  const [scheduleHistory, setScheduleHistory] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const functions = getFunctions(getApp(), 'asia-northeast3');
  const getUserFullSchedule = httpsCallable(functions, 'getUserFullSchedule');

  const fetchScheduleHistory = async () => {
    setError(null);
    setLoading(true); // 항상 로딩 시작
    try {
      const result = await getUserFullSchedule();
      const data = result.data as { fullSchedule: ScheduleEvent[] };
      if (data && Array.isArray(data.fullSchedule)) {
        setScheduleHistory(data.fullSchedule);
      } else {
        console.error("Invalid data structure received:", data);
        throw new Error("서버로부터 잘못된 형식의 데이터를 받았습니다.");
      }
    } catch (err: any) {
      console.error("Error fetching schedule history:", err.code, err.message, err.details);
      setError(err.message || "일정 내역을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
      setRefreshing(false); // 새로고침 완료
    }
  };

  useEffect(() => {
    fetchScheduleHistory();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchScheduleHistory();
  }, []);

  // 항목 렌더링 함수 (증명서 보기 버튼 추가)
  const renderItem = ({ item }: { item: ScheduleEvent }) => {
    const statusInfo = statusMap[item.status] || statusMap.default;
    const scheduleTypeDisplay = typeMap[item.type] || item.type;

    const startDate = parseFirestoreTimestamp(item.startDate);
    const endDate = parseFirestoreTimestamp(item.endDate);

    const requestedAtDate = parseFirestoreTimestamp(item.requestedAt); // 신청일 파싱

    let dateString = startDate ? format(startDate, 'yyyy.MM.dd') : '-';
    let durationString = '';

    if (endDate) {
        const formattedEndDate = format(endDate, 'yyyy.MM.dd');
        if (dateString !== formattedEndDate) {
            dateString += ` ~ ${formattedEndDate}`;
        }
        // 시작일과 종료일이 모두 유효할 때 기간 계산 (일수 또는 시간)
        if (startDate) {
            if (item.days && item.type === 'leave') {
                durationString = `${item.days}일`;
            } else {
                // 시간 단위 계산 등 추가 로직 가능
                const diff = differenceInDays(endDate, startDate);
                if (diff >= 1) {
                     durationString = `${diff + 1}일`; // 시작일 포함
                }
            }
        }
    } else if (item.days && item.type === 'leave') {
        durationString = `${item.days}일`;
    }

    // 증명서 버튼 텍스트 및 아이콘 결정
    let certificateButtonText: string | null = null;
    let certificateButtonIcon: string | null = null;

    if (item.status === 'approved') {
      if (['leave', 'rewardLeave', 'other'].includes(item.type)) { // 휴가 계열
        certificateButtonText = '휴가증 보기';
        certificateButtonIcon = 'file-document-outline';
      } else if (item.type === 'outing') {
        certificateButtonText = '외출증 보기';
        certificateButtonIcon = 'walk';
      } else if (item.type === 'stayOut') {
        certificateButtonText = '외박증 보기';
        certificateButtonIcon = 'bed-outline';
      }
    }

    const handleCertificatePress = () => {
      // TODO: 증명서 화면으로 네비게이션 또는 모달 표시
      // console.log(`증명서 보기 클릭: ${certificateButtonText}, ID: ${item.id}`);
      // Alert.alert(`${certificateButtonText}`, `ID: ${item.id}의 증명서 화면으로 이동합니다. (구현 필요)`);
      // 예시: navigation.navigate('CertificateViewer', { scheduleId: item.id, type: item.type });
      if (!certificateButtonText) return; // 버튼 텍스트 없으면 아무것도 안 함

      console.log(`증명서 보기 클릭: ${certificateButtonText}, ID: ${item.id}`);
      // CertificateViewerScreen으로 네비게이션하고 schedule 객체 전달
      navigation.navigate('CertificateViewer', { schedule: item });
    };

    return (
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Chip icon="calendar-check" style={styles.typeChip}>
              {scheduleTypeDisplay}
            </Chip>
            <Chip
                icon={statusInfo.icon}
                style={[styles.statusChip, { backgroundColor: colorNameToRgba(statusInfo.color, 0.15) }]}
                textStyle={{ color: statusInfo.color, fontWeight: 'bold' }}
            >
                {statusInfo.text}
            </Chip>
          </View>
          <Title style={styles.title}>{item.title || '제목 없음'}</Title>
          <View style={styles.infoRow}>
            <IconButton icon="calendar-range" size={16} style={styles.infoIcon} />
            <Text style={styles.infoText}>{dateString}</Text>
            {durationString && <Text style={styles.durationText}> ({durationString})</Text>}
          </View>
          {item.reason && (
            <View style={styles.infoRow}>
                <IconButton icon="text-account" size={16} style={styles.infoIcon} />
                <Text style={styles.infoText}>사유: {item.reason}</Text>
            </View>
          )}
          {requestedAtDate && (
              <View style={styles.infoRow}>
                  <IconButton icon="clock-edit-outline" size={16} style={styles.infoIcon} />
                  <Text style={styles.infoText}>신청일: {format(requestedAtDate, 'yyyy.MM.dd HH:mm')}</Text>
              </View>
          )}
          {/* 검토자/승인자 정보 (데이터 있을 경우 표시) */}
          {item.reviewerName && (
              <View style={styles.infoRow}>
                  <IconButton icon="account-eye-outline" size={16} style={styles.infoIcon} />
                  <Text style={styles.infoText}>검토자: {item.reviewerName}</Text>
              </View>
          )}
          {item.approverName && (
              <View style={styles.infoRow}>
                  <IconButton icon="account-check-outline" size={16} style={styles.infoIcon} />
                  <Text style={styles.infoText}>승인자: {item.approverName}</Text>
              </View>
          )}
        </Card.Content>

        {/* --- 증명서 보기 버튼 (조건부 렌더링) --- */}
        {certificateButtonText && certificateButtonIcon && (
          <Card.Actions style={styles.cardActions}>
            <Button
              icon={certificateButtonIcon}
              mode="outlined"
              onPress={handleCertificatePress}
              style={styles.certificateButton}
            >
              {certificateButtonText}
            </Button>
          </Card.Actions>
        )}
      </Card>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text>일정 내역을 불러오는 중...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>오류: {error}</Text>
        <Button onPress={fetchScheduleHistory}>다시 시도</Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={scheduleHistory}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<View style={styles.centered}><Text>신청 내역이 없습니다.</Text></View>}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  list: {
    padding: 16,
  },
  card: {
    marginBottom: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeChip: {
    marginRight: 8, // 오른쪽 여백 추가
  },
  statusChip: {
     // 스타일 조정 가능
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
  },
  infoIcon: {
      marginRight: 4,
      marginLeft: -4, // 아이콘 왼쪽 여백 조정
      marginTop: -2, // 아이콘 상단 여백 조정
      marginBottom: -2, // 아이콘 하단 여백 조정
  },
  infoText: {
      fontSize: 14,
      color: '#333',
  },
  durationText: {
      fontSize: 14,
      color: 'grey',
      marginLeft: 4,
  },
  emptyText: {
    textAlign: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
      color: 'red',
      marginBottom: 10,
  },
  cardActions: {
    justifyContent: 'flex-end', // 버튼을 오른쪽으로 정렬
    paddingTop: 0, // 상단 패딩 제거
  },
  certificateButton: {
    // 버튼 스타일 필요시 추가
  },
});

export default ScheduleHistoryScreen; 