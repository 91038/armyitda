import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image, Platform } from 'react-native';
import { 
  Text, 
  Card, 
  Title, 
  Button, 
  TextInput, 
  HelperText,
  Chip,
  List,
  ActivityIndicator,
  Divider,
  Portal,
  Dialog,
  Paragraph
} from 'react-native-paper';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { 
  addSelfDevelopmentFundApplication, 
  getUserSelfDevelopmentFundApplications,
  SelfDevelopmentFundApplication
} from '../../firebase';
import { Timestamp } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';

const SelfDevelopmentFundScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [loading, setLoading] = useState(false);
  const [applications, setApplications] = useState<SelfDevelopmentFundApplication[]>([]);
  const [showNewApplication, setShowNewApplication] = useState(false);
  
  // 신청서 작성 상태
  const [category, setCategory] = useState<SelfDevelopmentFundApplication['category']>('certificate');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<any>(null);
  
  const categories = [
    { key: 'certificate', label: '자격증', icon: 'certificate' },
    { key: 'book', label: '도서', icon: 'book' },
    { key: 'course', label: '강의', icon: 'school' },
    { key: 'equipment', label: '장비', icon: 'tools' },
    { key: 'other', label: '기타', icon: 'dots-horizontal' }
  ];
  
  useEffect(() => {
    fetchApplications();
  }, []);
  
  const fetchApplications = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const data = await getUserSelfDevelopmentFundApplications(user.id);
      setApplications(data);
    } catch (error) {
      console.error('신청 내역 조회 오류:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('권한 필요', '사진 라이브러리 접근 권한이 필요합니다.');
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    
    if (!result.canceled && result.assets[0]) {
      setReceiptImage(result.assets[0].uri);
      // 영수증 OCR 분석 시뮬레이션
      simulateOCRAnalysis(result.assets[0].uri);
    }
  };
  
  const simulateOCRAnalysis = (imageUri: string) => {
    // 실제로는 Google Vision API나 AWS Textract 등을 사용해야 함
    // 여기서는 시뮬레이션
    setLoading(true);
    
    setTimeout(() => {
      const mockExtractedData = {
        merchantName: '교보문고',
        amount: 25000,
        date: new Date().toLocaleDateString(),
        items: ['정보처리기사 실기 문제집', '컴퓨터활용능력 1급 교재']
      };
      
      setExtractedData(mockExtractedData);
      setAmount(mockExtractedData.amount.toString());
      if (!title) {
        setTitle(mockExtractedData.items[0] || '');
      }
      setLoading(false);
      
      Alert.alert(
        '영수증 분석 완료!',
        `상호: ${mockExtractedData.merchantName}\n금액: ${mockExtractedData.amount.toLocaleString()}원\n구매일: ${mockExtractedData.date}`,
        [{ text: '확인' }]
      );
    }, 2000);
  };
  
  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('오류', '신청 제목을 입력해주세요.');
      return;
    }
    
    if (!description.trim()) {
      Alert.alert('오류', '신청 내용을 입력해주세요.');
      return;
    }
    
    if (!amount.trim() || isNaN(Number(amount))) {
      Alert.alert('오류', '올바른 금액을 입력해주세요.');
      return;
    }
    
    if (!receiptImage) {
      Alert.alert('오류', '영수증 이미지를 업로드해주세요.');
      return;
    }
    
    if (!user) {
      Alert.alert('오류', '사용자 정보를 찾을 수 없습니다.');
      return;
    }
    
    setLoading(true);
    
    try {
      // 실제로는 이미지를 Firebase Storage에 업로드해야 함
      const applicationData = {
        userId: user.id,
        userName: user.name,
        rank: user.rank,
        unitCode: user.unitCode,
        unitName: user.unitName,
        category,
        title: title.trim(),
        description: description.trim(),
        amount: Number(amount),
        receiptImageUrl: receiptImage, // 실제로는 Storage URL
        extractedData,
        status: 'pending' as const,
        applicationDate: Timestamp.now()
      };
      
      await addSelfDevelopmentFundApplication(applicationData);
      
      Alert.alert('신청 완료', '자기계발비 신청이 완료되었습니다. 검토 후 결과를 알려드리겠습니다.', [
        { text: '확인', onPress: () => {
          setShowNewApplication(false);
          resetForm();
          fetchApplications();
        }}
      ]);
    } catch (error) {
      console.error('신청 오류:', error);
      Alert.alert('오류', '신청 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };
  
  const resetForm = () => {
    setCategory('certificate');
    setTitle('');
    setDescription('');
    setAmount('');
    setReceiptImage(null);
    setExtractedData(null);
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#ff9800';
      case 'approved': return '#4CAF50';
      case 'rejected': return '#f44336';
      case 'paid': return '#2196F3';
      default: return '#9E9E9E';
    }
  };
  
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '검토중';
      case 'approved': return '승인';
      case 'rejected': return '거부';
      case 'paid': return '지급완료';
      default: return '알 수 없음';
    }
  };
  
  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title>자기계발비 신청</Title>
          <Paragraph style={styles.description}>
            📸 영수증만 찍으면 자동으로 정보가 입력됩니다!
          </Paragraph>
          <Paragraph style={styles.subtitle}>
            * 기존 나라사랑포털보다 간편하게 신청하세요
          </Paragraph>
          <Paragraph style={styles.apiNote}>
            🔄 나라사랑포털 API 연동 시 기존 신청 내역 자동 동기화 및 실시간 승인 상태 확인 기능이 추가됩니다
          </Paragraph>
          
          <Button 
            mode="contained" 
            icon="plus" 
            style={styles.button}
            onPress={() => setShowNewApplication(true)}
          >
            새 신청서 작성
          </Button>
        </Card.Content>
      </Card>
      
      <Card style={styles.card}>
        <Card.Content>
          <Title>신청 내역</Title>
          
          {loading && applications.length === 0 ? (
            <ActivityIndicator style={styles.loader} />
          ) : applications.length > 0 ? (
            <List.Section>
              {applications.map((app, index) => (
                <View key={app.id || index}>
                  <List.Item
                    title={app.title}
                    description={`${app.amount.toLocaleString()}원 | ${app.applicationDate.toDate().toLocaleDateString()}`}
                    left={() => <List.Icon icon={categories.find(c => c.key === app.category)?.icon || 'file'} />}
                    right={() => (
                      <Chip 
                        style={{ backgroundColor: getStatusColor(app.status) }}
                        textStyle={{ color: 'white' }}
                      >
                        {getStatusText(app.status)}
                      </Chip>
                    )}
                  />
                  {index < applications.length - 1 && <Divider />}
                </View>
              ))}
            </List.Section>
          ) : (
            <Text style={styles.emptyText}>
              아직 신청 내역이 없습니다.
            </Text>
          )}
        </Card.Content>
      </Card>
      
      {/* 새 신청서 다이얼로그 */}
      <Portal>
        <Dialog 
          visible={showNewApplication} 
          onDismiss={() => setShowNewApplication(false)}
          style={styles.dialog}
        >
          <Dialog.Title>자기계발비 신청</Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView contentContainerStyle={styles.dialogContent}>
              <Text style={styles.sectionTitle}>카테고리</Text>
              <View style={styles.categoryContainer}>
                {categories.map((cat) => (
                  <Chip
                    key={cat.key}
                    icon={cat.icon}
                    selected={category === cat.key}
                    onPress={() => setCategory(cat.key as SelfDevelopmentFundApplication['category'])}
                    style={styles.categoryChip}
                  >
                    {cat.label}
                  </Chip>
                ))}
              </View>
              
              <TextInput
                label="신청 제목 *"
                value={title}
                onChangeText={setTitle}
                style={styles.input}
                placeholder="예: 정보처리기사 교재 구입"
              />
              
              <TextInput
                label="신청 내용 *"
                value={description}
                onChangeText={setDescription}
                style={styles.input}
                multiline
                numberOfLines={3}
                placeholder="구입 목적과 필요성을 설명해주세요"
              />
              
              <TextInput
                label="신청 금액 (원) *"
                value={amount}
                onChangeText={setAmount}
                style={styles.input}
                keyboardType="numeric"
                placeholder="예: 25000"
              />
              
              <Text style={styles.sectionTitle}>영수증 업로드 *</Text>
              <Button
                mode="outlined"
                icon="camera"
                onPress={pickImage}
                style={styles.imageButton}
              >
                영수증 사진 선택
              </Button>
              
              {receiptImage && (
                <View style={styles.imageContainer}>
                  <Image source={{ uri: receiptImage }} style={styles.previewImage} />
                  {extractedData && (
                    <View style={styles.extractedDataContainer}>
                      <Text style={styles.extractedTitle}>📄 자동 추출된 정보</Text>
                      <Text>상호: {extractedData.merchantName}</Text>
                      <Text>금액: {extractedData.amount?.toLocaleString()}원</Text>
                      <Text>구매일: {extractedData.date}</Text>
                      {extractedData.items && (
                        <Text>항목: {extractedData.items.join(', ')}</Text>
                      )}
                    </View>
                  )}
                </View>
              )}
              
              <HelperText type="info">
                💡 영수증을 업로드하면 AI가 자동으로 정보를 추출하여 입력란에 채워드립니다.
              </HelperText>
            </ScrollView>
          </Dialog.ScrollArea>
          
          <Dialog.Actions>
            <Button 
              onPress={() => {
                setShowNewApplication(false);
                resetForm();
              }}
              disabled={loading}
            >
              취소
            </Button>
            <Button 
              mode="contained" 
              onPress={handleSubmit}
              loading={loading}
              disabled={loading}
            >
              신청
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  description: {
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
  },
  apiNote: {
    fontSize: 11,
    color: '#2196F3',
    marginBottom: 15,
    textAlign: 'center',
    fontStyle: 'italic',
    backgroundColor: '#E3F2FD',
    padding: 8,
    borderRadius: 4,
  },
  button: {
    marginTop: 10,
  },
  loader: {
    margin: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    marginTop: 10,
  },
  dialog: {
    maxHeight: '90%',
  },
  dialogContent: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  categoryChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    marginBottom: 12,
  },
  imageButton: {
    marginBottom: 16,
  },
  imageContainer: {
    marginBottom: 16,
  },
  previewImage: {
    width: '100%',
    height: 200,
    resizeMode: 'contain',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginBottom: 8,
  },
  extractedDataContainer: {
    backgroundColor: '#e8f5e8',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  extractedTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#2E7D32',
  },
});

export default SelfDevelopmentFundScreen; 