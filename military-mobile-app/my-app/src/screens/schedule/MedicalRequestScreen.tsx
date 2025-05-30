import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Appbar, Button } from 'react-native-paper';

const MedicalRequestScreen: React.FC = () => {
  // TODO: Add form fields for medical issue, requested date/time, etc.
  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => { /* navigation.goBack() */ }} />
        <Appbar.Content title="진료 신청" />
      </Appbar.Header>
      <View style={styles.content}>
        <Text>진료 신청 폼이 여기에 들어갑니다.</Text>
        {/* TODO: Implement medical request form */}
        <Button mode="contained" onPress={() => { /* Handle submit */ }} style={styles.submitButton}>
          신청하기
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  submitButton: {
    marginTop: 20,
  }
});

export default MedicalRequestScreen; 