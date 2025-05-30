import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { Appbar, Card, Title, Paragraph } from 'react-native-paper';

// 임시 데이터 타입
interface ScheduleItem {
  id: string;
  date: string;
  title: string;
  type: string;
}

const FullScheduleScreen: React.FC = () => {
  // TODO: Fetch all schedule data from backend
  const tempData: ScheduleItem[] = [
    { id: '1', date: '2024-05-15', title: '정기휴가', type: '휴가' },
    { id: '2', date: '2024-06-05', title: '외출', type: '외출' },
    { id: '3', date: '2024-06-20', title: '치과 진료', type: '외진' },
    // ... more items
  ];

  const renderItem = ({ item }: { item: ScheduleItem }) => (
    <Card style={styles.card}>
      <Card.Content>
        <Title>{item.title} ({item.type})</Title>
        <Paragraph>{item.date}</Paragraph>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => { /* navigation.goBack() */ }} />
        <Appbar.Content title="전체 일정" />
      </Appbar.Header>
      <FlatList
        data={tempData} // 실제 데이터로 교체 필요
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.emptyText}>일정이 없습니다.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: 16,
  },
  card: {
    marginBottom: 12,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    color: 'gray',
  },
});

export default FullScheduleScreen; 