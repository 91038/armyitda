import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Appbar, Card, Title, Paragraph, Divider, Button, useTheme } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { format } from 'date-fns';
import { ScheduleEvent } from './ScheduleHistoryScreen';

// 네비게이션 파라미터 타입 정의
type CertificateViewerRouteParams = {
  schedule: ScheduleEvent; // 상세 정보를 객체로 받음
};

// 타입맵 (ScheduleHistoryScreen과 동일하게)
const typeMap: { [key: string]: string } = {
    leave: '연가',
    medical: '병가',
    outing: '외출',
    stayOut: '외박',
    rewardLeave: '포상휴가',
    other: '기타 휴가',
    personal: '개인 일정',
    duty: '당직'
};

// Timestamp 포맷 함수 (ScheduleHistoryScreen과 동일하게)
const formatTimestamp = (timestamp: any, dateFormat: string = 'yyyy년 MM월 dd일'): string => {
  if (!timestamp) return '-';
  try {
    // Firestore Timestamp 객체 또는 ISO 문자열 처리
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    // 추가: 유효한 날짜인지 확인
    if (isNaN(date.getTime())) {
        throw new Error('Invalid date object');
    }
    return format(date, dateFormat);
  } catch (e) {
    // 수정: 오류 로깅 시 timestamp 값 포함
    console.error("Error formatting timestamp:", timestamp, e);
    return '날짜 오류';
  }
};

const CertificateViewerScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: CertificateViewerRouteParams }, 'params'>>();
  const { schedule } = route.params;
  const theme = useTheme();

  // 증명서 제목 설정
  let certificateTitle = '증명서';
  if (['leave', 'rewardLeave', 'other'].includes(schedule.type)) {
    certificateTitle = '휴가증';
  } else if (schedule.type === 'outing') {
    certificateTitle = '외출증';
  } else if (schedule.type === 'stayOut') {
    certificateTitle = '외박증';
  }

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={certificateTitle} />
      </Appbar.Header>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.title}>{certificateTitle}</Title>
            <Divider style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.label}>소속:</Text>
              <Text style={styles.value}>{schedule.requesterUnit || '-'} {/* requesterUnit 추가 필요 */}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>계급:</Text>
              <Text style={styles.value}>{schedule.requesterRank || '-'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>성명:</Text>
              <Text style={styles.value}>{schedule.requesterName || '-'}</Text>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.label}>종류:</Text>
              <Text style={styles.value}>{typeMap[schedule.type] || schedule.type}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>기간:</Text>
              <Text style={styles.value}>
                {`${formatTimestamp(schedule.startDate)} ~ ${formatTimestamp(schedule.endDate)}${schedule.days ? ` (${schedule.days}일)` : ''}`}
              </Text>
            </View>
            <View style={styles.infoRow}>
                <Text style={styles.label}>목적:</Text>
                <Text style={[styles.value, styles.reasonValue]}>{schedule.reason || schedule.title || '-'}</Text>
            </View>
             <Divider style={styles.divider} />
             <View style={styles.infoRow}>
                <Text style={styles.label}>승인자:</Text>
                <Text style={styles.value}>{schedule.approverName || '-'} { /* TODO: 직책 표시 */}</Text>
             </View>
             <View style={styles.infoRow}>
                <Text style={styles.label}>승인일:</Text>
                <Text style={styles.value}>{formatTimestamp(schedule.processedAt, 'yyyy년 MM월 dd일')}</Text>
             </View>
             <Paragraph style={styles.footerText}>
                위와 같이 {certificateTitle.slice(0,-1)}을 허가합니다.
             </Paragraph>
             <Paragraph style={styles.approvalDate}>{formatTimestamp(schedule.processedAt)}</Paragraph>
             <Title style={styles.commanderName}>부대장 (인)</Title>
             { /* TODO: 실제 부대장 이름 */ }
          </Card.Content>
        </Card>
        <Button
            mode="contained"
            onPress={() => navigation.goBack()}
            style={styles.closeButton}
        >
            닫기
        </Button>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    padding: 16,
  },
  card: {
    elevation: 2,
  },
  title: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 16,
  },
  divider: {
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start', // 여러 줄 사유를 위해
  },
  label: {
    width: 80, // 라벨 너비 고정
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 8,
    textAlign: 'right',
  },
  value: {
    flex: 1, // 남은 공간 차지
    fontSize: 16,
  },
  reasonValue: {
      lineHeight: 22, // 줄 간격 조정
  },
  footerText: {
      marginTop: 30,
      textAlign: 'center',
      fontSize: 16,
  },
  approvalDate: {
      textAlign: 'center',
      fontSize: 16,
      marginVertical: 10,
  },
  commanderName: {
      textAlign: 'center',
      fontSize: 18,
      fontWeight: 'bold',
      marginTop: 20,
      marginBottom: 10,
  },
  closeButton: {
      marginTop: 20,
  }
});

export default CertificateViewerScreen; 