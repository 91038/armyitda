import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { 
  Text, 
  Card, 
  Title, 
  Button, 
  TextInput, 
  HelperText,
  Chip,
  List,
  IconButton,
  Divider,
  ActivityIndicator
} from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { 
  addSelfDevelopmentGoal, 
  updateSelfDevelopmentGoal, 
  SelfDevelopmentGoal
} from '../../firebase';
import { Timestamp } from 'firebase/firestore';
import { useNavigation, useRoute } from '@react-navigation/native';

interface AddGoalScreenProps {
  goal?: SelfDevelopmentGoal; // 수정할 목표 (옵션)
}

const AddGoalScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useSelector((state: RootState) => state.auth);
  
  // route.params에서 goal을 가져옴 (수정 모드인 경우)
  const existingGoal = (route.params as any)?.goal as SelfDevelopmentGoal | undefined;
  const isEditMode = !!existingGoal;
  
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState(existingGoal?.title || '');
  const [description, setDescription] = useState(existingGoal?.description || '');
  const [category, setCategory] = useState<SelfDevelopmentGoal['category']>(existingGoal?.category || 'certificate');
  const [targetDate, setTargetDate] = useState(existingGoal ? existingGoal.targetDate.toDate() : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [milestones, setMilestones] = useState<Array<{id: string; title: string; description?: string; isCompleted: boolean}>>
    (existingGoal?.milestones || []);
  const [newMilestone, setNewMilestone] = useState('');
  
  const categories = [
    { key: 'certificate', label: '자격증', icon: 'certificate' },
    { key: 'skill', label: '기술', icon: 'code-tags' },
    { key: 'course', label: '강의', icon: 'school' },
    { key: 'book', label: '독서', icon: 'book' },
    { key: 'language', label: '언어', icon: 'translate' },
    { key: 'other', label: '기타', icon: 'dots-horizontal' }
  ];
  
  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('오류', '목표 제목을 입력해주세요.');
      return;
    }
    
    if (!user) {
      Alert.alert('오류', '사용자 정보를 찾을 수 없습니다.');
      return;
    }
    
    setLoading(true);
    
    try {
      const goalData = {
        userId: user.id,
        userName: user.name,
        rank: user.rank,
        unitCode: user.unitCode,
        unitName: user.unitName,
        title: title.trim(),
        description: description.trim(),
        category,
        targetDate: Timestamp.fromDate(targetDate),
        status: 'planning' as const,
        progress: existingGoal?.progress || 0,
        milestones: milestones.map(m => ({
          ...m,
          id: m.id || Date.now().toString()
        }))
      };
      
      if (isEditMode && existingGoal?.id) {
        await updateSelfDevelopmentGoal(existingGoal.id, goalData);
        Alert.alert('성공', '목표가 수정되었습니다.', [
          { text: '확인', onPress: () => navigation.goBack() }
        ]);
      } else {
        await addSelfDevelopmentGoal(goalData);
        Alert.alert('성공', '새로운 목표가 추가되었습니다.', [
          { text: '확인', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      console.error('목표 저장 오류:', error);
      Alert.alert('오류', '목표 저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };
  
  const addMilestone = () => {
    if (!newMilestone.trim()) return;
    
    const milestone = {
      id: Date.now().toString(),
      title: newMilestone.trim(),
      isCompleted: false
    };
    
    setMilestones([...milestones, milestone]);
    setNewMilestone('');
  };
  
  const removeMilestone = (id: string) => {
    setMilestones(milestones.filter(m => m.id !== id));
  };
  
  const handleDateChange = (event: any, selectedDate: Date | undefined) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setTargetDate(selectedDate);
    }
  };
  
  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title>{isEditMode ? '목표 수정' : '새 목표 추가'}</Title>
          
          <TextInput
            label="목표 제목 *"
            value={title}
            onChangeText={setTitle}
            style={styles.input}
            placeholder="예: 정보처리기사 자격증 취득"
          />
          <HelperText type="info">
            구체적이고 명확한 목표를 설정해주세요.
          </HelperText>
          
          <TextInput
            label="목표 설명"
            value={description}
            onChangeText={setDescription}
            style={styles.input}
            multiline
            numberOfLines={3}
            placeholder="목표에 대한 상세 설명을 입력해주세요."
          />
          
          <Text style={styles.sectionTitle}>카테고리</Text>
          <View style={styles.categoryContainer}>
            {categories.map((cat) => (
              <Chip
                key={cat.key}
                icon={cat.icon}
                selected={category === cat.key}
                onPress={() => setCategory(cat.key as SelfDevelopmentGoal['category'])}
                style={[
                  styles.categoryChip,
                  category === cat.key && styles.selectedCategoryChip
                ]}
                textStyle={category === cat.key ? styles.selectedCategoryText : undefined}
              >
                {cat.label}
              </Chip>
            ))}
          </View>
          
          <Text style={styles.sectionTitle}>목표 달성일</Text>
          <Button
            mode="outlined"
            onPress={() => setShowDatePicker(true)}
            icon="calendar"
            style={styles.dateButton}
          >
            {targetDate.toLocaleDateString()}
          </Button>
          
          {showDatePicker && (
            <DateTimePicker
              value={targetDate}
              mode="date"
              display="default"
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          )}
        </Card.Content>
      </Card>
      
      <Card style={styles.card}>
        <Card.Content>
          <Title>마일스톤 설정</Title>
          <Text style={styles.subtitle}>
            목표 달성을 위한 단계별 계획을 세워보세요.
          </Text>
          
          <View style={styles.milestoneInput}>
            <TextInput
              label="새 마일스톤"
              value={newMilestone}
              onChangeText={setNewMilestone}
              style={styles.milestoneTextInput}
              placeholder="예: 온라인 강의 수강 완료"
            />
            <IconButton
              icon="plus"
              mode="contained"
              onPress={addMilestone}
              disabled={!newMilestone.trim()}
            />
          </View>
          
          <List.Section>
            {milestones.map((milestone, index) => (
              <View key={milestone.id}>
                <List.Item
                  title={milestone.title}
                  left={() => <List.Icon icon="target" />}
                  right={() => (
                    <IconButton
                      icon="delete"
                      onPress={() => removeMilestone(milestone.id)}
                    />
                  )}
                />
                {index < milestones.length - 1 && <Divider />}
              </View>
            ))}
          </List.Section>
          
          {milestones.length === 0 && (
            <Text style={styles.emptyText}>
              아직 마일스톤이 없습니다. 목표 달성을 위한 단계를 추가해보세요.
            </Text>
          )}
        </Card.Content>
      </Card>
      
      <View style={styles.buttonContainer}>
        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          style={styles.button}
          disabled={loading}
        >
          취소
        </Button>
        
        <Button
          mode="contained"
          onPress={handleSave}
          style={styles.button}
          loading={loading}
          disabled={loading}
        >
          {isEditMode ? '수정' : '추가'}
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 10,
  },
  card: {
    marginVertical: 10,
    elevation: 2,
  },
  input: {
    backgroundColor: 'white',
    marginBottom: 5,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  categoryChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  selectedCategoryChip: {
    backgroundColor: '#3F51B5',
  },
  selectedCategoryText: {
    color: 'white',
    fontWeight: 'bold',
  },
  dateButton: {
    marginBottom: 15,
  },
  milestoneInput: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  milestoneTextInput: {
    flex: 1,
    backgroundColor: 'white',
    marginRight: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    marginTop: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 30,
  },
  button: {
    flex: 1,
    marginHorizontal: 5,
  },
});

export default AddGoalScreen; 