import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { TextInput, Button, Title, Switch, Text, Chip } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { addPost } from '../../firebase';
import { RootState } from '../../store';
// import * as ImagePicker from 'expo-image-picker'; // TODO: 첨부파일 기능 구현 시 활성화

const CreatePostScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useSelector((state: RootState) => state.auth);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  // const [attachments, setAttachments] = useState<any[]>([]); // TODO: 첨부파일 기능 구현 시 활성화

  const categories = ['자유게시판', '질문게시판', '정보공유', '건의사항'];

  // TODO: 이미지 선택 기능 구현
  // const pickImage = async () => {
  //   let result = await ImagePicker.launchImageLibraryAsync({
  //     mediaTypes: ImagePicker.MediaTypeOptions.All,
  //     allowsEditing: true,
  //     aspect: [4, 3],
  //     quality: 1,
  //   });
  //   if (!result.canceled) {
  //     setAttachments([...attachments, result.assets[0]]);
  //   }
  // };

  const handleCreatePost = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('오류', '제목과 내용을 입력해주세요.');
      return;
    }
    if (!user) {
      Alert.alert('오류', '로그인이 필요합니다.');
      return;
    }

    setLoading(true);
    try {
      const postData = {
        authorId: user.id,
        authorName: isAnonymous ? '익명' : user.name,
        anonymous: isAnonymous,
        title: title.trim(),
        content: content.trim(),
        category: category,
        // attachments: [], // TODO: 첨부파일 업로드 후 URL 저장
      };
      
      await addPost(postData);
      
      Alert.alert('성공', '게시글이 등록되었습니다.');
      navigation.goBack(); // 이전 화면으로 돌아가기

    } catch (error: any) {
      console.error('게시글 생성 오류:', error);
      Alert.alert('오류', error.message || '게시글 등록 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Title style={styles.title}>새 글 작성</Title>
        
        <TextInput
          label="제목"
          value={title}
          onChangeText={setTitle}
          mode="outlined"
          style={styles.input}
        />
        
        <TextInput
          label="내용"
          value={content}
          onChangeText={setContent}
          mode="outlined"
          multiline
          numberOfLines={8}
          style={styles.input}
        />

        <Text style={styles.label}>카테고리</Text>
        <View style={styles.chipContainer}>
          {categories.map(cat => (
            <Chip 
              key={cat} 
              style={styles.chip}
              mode={category === cat ? 'flat' : 'outlined'}
              selected={category === cat}
              onPress={() => setCategory(cat)}
            >
              {cat}
            </Chip>
          ))}
        </View>
        
        <View style={styles.switchContainer}>
          <Text style={styles.label}>익명으로 작성</Text>
          <Switch value={isAnonymous} onValueChange={setIsAnonymous} />
        </View>

        {/* TODO: 첨부파일 추가 UI */}
        {/* <Button icon="attachment" mode="outlined" onPress={pickImage} style={styles.attachButton}>
          파일 첨부
        </Button>
        {attachments.map((att, index) => (
          <Text key={index}>{att.uri.split('/').pop()}</Text>
        ))} */}

        <Button 
          mode="contained" 
          onPress={handleCreatePost} 
          style={styles.button}
          loading={loading}
          disabled={loading}
        >
          등록하기
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  chip: {
    marginRight: 8,
    marginBottom: 8,
  },
  attachButton: {
    marginBottom: 15,
  },
  button: {
    marginTop: 20,
    paddingVertical: 8,
  },
});

export default CreatePostScreen; 