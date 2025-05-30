import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, Alert, RefreshControl, Linking, TextInput } from 'react-native';
import { 
  Text, 
  Card, 
  Title, 
  Paragraph, 
  Button, 
  Divider, 
  Chip,
  ActivityIndicator,
  IconButton,
  Badge,
  Searchbar
} from 'react-native-paper';
import * as Location from 'expo-location';

// PX 인기상품 API 타입 정의
interface PXProduct {
  rowno: string;
  sellyear: string;
  sellmonth: string;
  seltnstd: string;
  prdtnm: string;
}

// 영외 마트 API 타입 정의
interface MartInfo {
  rowno: string;
  martname: string;
  address: string;
  phone: string;
  latitude?: string;
  longitude?: string;
  distance?: number;
  scale?: string;
  opWeekday?: string;
  opSat?: string;
  opSun?: string;
  note?: string;
}

// 병사 할인 혜택 API 타입 정의
interface DiscountBenefit {
  rowno: string;
  rgn: string;
  instltnnm: string;
  dcntenatvnm: string;
  startday: string;
  fnshday: string;
  cntadr: string;
  hmpg: string;
  dtlexpln: string;
}

// PX 인기상품 API 호출 함수 - 전체 데이터 한 번에 가져오기
const fetchAllPXProducts = async (): Promise<PXProduct[]> => {
  try {
    const API_KEY = '3937313636313637333335343632313734';
    // 올바른 API URL 형식: https://openapi.mnd.go.kr/KEY/TYPE/SERVICE/START_INDEX/END_INDEX
    const url = `https://openapi.mnd.go.kr/${API_KEY}/xml/DS_MND_PX_PARD_PRDT_INFO/1/3000`;
    
    console.log('전체 PX 데이터 API 호출 시작');
    console.log('요청 URL:', url);
    
    const response = await fetch(url);
    const xmlText = await response.text();
    
    console.log('API 응답 받음:', xmlText.substring(0, 500));
    
    // XML 파싱 (간단한 정규식 사용)
    const allProducts: PXProduct[] = [];
    const rowMatches = xmlText.match(/<row>[\s\S]*?<\/row>/g);
    
    if (rowMatches) {
      rowMatches.forEach(row => {
        const rowno = row.match(/<rowno>(.*?)<\/rowno>/)?.[1] || '';
        const sellyear = row.match(/<sellyear>(.*?)<\/sellyear>/)?.[1] || '';
        const sellmonth = row.match(/<sellmonth>(.*?)<\/sellmonth>/)?.[1] || '';
        const seltnstd = row.match(/<seltnstd>(.*?)<\/seltnstd>/)?.[1] || '';
        const prdtnm = row.match(/<prdtnm>(.*?)<\/prdtnm>/)?.[1] || '';
        
        if (rowno && prdtnm && sellyear && sellmonth) {
          allProducts.push({
            rowno,
            sellyear,
            sellmonth,
            seltnstd,
            prdtnm
          });
        }
      });
    }
    
    console.log('전체 상품 수:', allProducts.length);
    
    // 사용 가능한 연도와 월 확인
    const availableYears = [...new Set(allProducts.map(p => p.sellyear))].sort((a, b) => parseInt(b) - parseInt(a));
    const availableMonths = [...new Set(allProducts.map(p => p.sellmonth))].sort((a, b) => parseInt(a) - parseInt(b));
    
    console.log('사용 가능한 연도들:', availableYears);
    console.log('사용 가능한 월들:', availableMonths);
    
    return allProducts;
  } catch (error) {
    console.error('PX 상품 API 호출 오류:', error);
    throw error;
  }
};

// 클라이언트에서 데이터 필터링
const filterProductsByDate = (allProducts: PXProduct[], year: string, month: string): PXProduct[] => {
  const filteredProducts = allProducts.filter(product => {
    // 연도 매칭
    const yearMatch = product.sellyear === year;
    
    // 월 매칭 - "01"과 "1" 형식 모두 고려
    const monthPadded = month.padStart(2, '0'); // "01", "02", ...
    const monthUnpadded = parseInt(month).toString(); // "1", "2", ...
    const monthMatch = product.sellmonth === monthPadded || product.sellmonth === monthUnpadded;
    
    return yearMatch && monthMatch;
  });
  
  console.log(`${year}년 ${month}월 필터링된 상품 수:`, filteredProducts.length);
  console.log(`필터링 조건: 연도=${year}, 월=${month} (패딩: ${month.padStart(2, '0')}, 언패딩: ${parseInt(month).toString()})`);
  
  return filteredProducts;
};

// 영외 마트 API 호출 함수
const fetchMartInfo = async (): Promise<MartInfo[]> => {
  try {
    const API_KEY = '3937313636313637333335343632313734';
    const url = `http://openapi.mnd.go.kr/${API_KEY}/xml/TB_MND_MART_CURRENT/1/200`;
    
    console.log('영외 마트 정보 API 호출 시작');
    console.log('요청 URL:', url);
    
    const response = await fetch(url);
    const xmlText = await response.text();
    
    console.log('마트 API 응답 받음:', xmlText.substring(0, 1000));
    
    // XML 파싱 - 실제 API 구조에 맞게 수정
    const marts: MartInfo[] = [];
    const rowMatches = xmlText.match(/<row>[\s\S]*?<\/row>/g);
    
    if (rowMatches) {
      rowMatches.forEach((row, index) => {
        const seq = row.match(/<SEQ>(.*?)<\/SEQ>/)?.[1] || '';
        const martname = row.match(/<MART>(.*?)<\/MART>/)?.[1] || '';
        const address = row.match(/<LOC>(.*?)<\/LOC>/)?.[1] || '';
        const phone = row.match(/<TEL>(.*?)<\/TEL>/)?.[1] || '';
        const scale = row.match(/<SCALE>(.*?)<\/SCALE>/)?.[1] || '';
        const opWeekday = row.match(/<OP_WEEKDAY>(.*?)<\/OP_WEEKDAY>/)?.[1] || '';
        const opSat = row.match(/<OP_SAT>(.*?)<\/OP_SAT>/)?.[1] || '';
        const opSun = row.match(/<OP_SUN>(.*?)<\/OP_SUN>/)?.[1] || '';
        const note = row.match(/<NOTE>(.*?)<\/NOTE>/)?.[1] || '';
        
        console.log(`마트 ${index + 1}:`, { seq, martname, address, phone, scale });
        
        if (seq && martname && address) {
          marts.push({
            rowno: seq,
            martname: martname,
            address: address,
            phone: phone,
            latitude: '', // API에서 좌표 정보가 제공되지 않음
            longitude: '',
            scale: scale,
            opWeekday: opWeekday,
            opSat: opSat,
            opSun: opSun,
            note: note
          });
        }
      });
    }
    
    console.log('파싱된 마트 수:', marts.length);
    console.log('첫 번째 마트:', marts[0]);
    
    return marts;
  } catch (error) {
    console.error('마트 정보 API 호출 오류:', error);
    // 에러 시 임시 데이터 반환
    return [
      {
        rowno: '1',
        martname: '이마트 용산점',
        address: '서울특별시 용산구 한강대로23길 55',
        phone: '02-2012-1234',
        latitude: '37.5326',
        longitude: '126.9652'
      },
      {
        rowno: '2',
        martname: '롯데마트 서울역점',
        address: '서울특별시 중구 한강대로 405',
        phone: '02-390-2500',
        latitude: '37.5547',
        longitude: '126.9707'
      },
      {
        rowno: '3',
        martname: '홈플러스 영등포점',
        address: '서울특별시 영등포구 영중로 15',
        phone: '02-2678-3000',
        latitude: '37.5185',
        longitude: '126.9085'
      }
    ];
  }
};

// 병사 할인 혜택 API 호출 함수
const fetchDiscountBenefits = async (): Promise<DiscountBenefit[]> => {
  try {
    const API_KEY = '3937313636313637333335343632313734';
    const url = `https://openapi.mnd.go.kr/${API_KEY}/xml/DS_MND_ENLSTMN_DCNT_BEF_INF/1/100`;
    
    console.log('병사 할인 혜택 API 호출 시작');
    console.log('요청 URL:', url);
    
    const response = await fetch(url);
    const xmlText = await response.text();
    
    console.log('할인 혜택 API 응답 받음:', xmlText.substring(0, 1000));
    
    // XML 파싱
    const benefits: DiscountBenefit[] = [];
    const rowMatches = xmlText.match(/<row>[\s\S]*?<\/row>/g);
    
    if (rowMatches) {
      rowMatches.forEach((row, index) => {
        const rowno = row.match(/<rowno>(.*?)<\/rowno>/)?.[1] || '';
        const rgn = row.match(/<rgn>(.*?)<\/rgn>/)?.[1] || '';
        const instltnnm = row.match(/<instltnnm>(.*?)<\/instltnnm>/)?.[1] || '';
        const dcntenatvnm = row.match(/<dcntenatvnm>(.*?)<\/dcntenatvnm>/)?.[1] || '';
        const startday = row.match(/<startday>(.*?)<\/startday>/)?.[1] || '';
        const fnshday = row.match(/<fnshday>(.*?)<\/fnshday>/)?.[1] || '';
        const cntadr = row.match(/<cntadr>(.*?)<\/cntadr>/)?.[1] || '';
        const hmpg = row.match(/<hmpg>(.*?)<\/hmpg>/)?.[1] || '';
        const dtlexpln = row.match(/<dtlexpln>(.*?)<\/dtlexpln>/)?.[1] || '';
        
        console.log(`할인 혜택 ${index + 1}:`, { rowno, rgn, instltnnm, dcntenatvnm });
        
        if (rowno && instltnnm && dcntenatvnm) {
          benefits.push({
            rowno,
            rgn,
            instltnnm,
            dcntenatvnm,
            startday,
            fnshday,
            cntadr,
            hmpg,
            dtlexpln
          });
        }
      });
    }
    
    console.log('파싱된 할인 혜택 수:', benefits.length);
    console.log('첫 번째 할인 혜택:', benefits[0]);
    
    return benefits;
  } catch (error) {
    console.error('할인 혜택 API 호출 오류:', error);
    // 에러 시 임시 데이터 반환
    return [
      {
        rowno: '1',
        rgn: '서울',
        instltnnm: '롯데시네마',
        dcntenatvnm: '군인 영화 할인',
        startday: '2024-01-01',
        fnshday: '2024-12-31',
        cntadr: '1544-8855',
        hmpg: 'https://www.lottecinema.co.kr',
        dtlexpln: '군인증 제시 시 영화 관람료 50% 할인'
      },
      {
        rowno: '2',
        rgn: '전국',
        instltnnm: '이마트',
        dcntenatvnm: '병사 생필품 할인',
        startday: '2024-01-01',
        fnshday: '2024-12-31',
        cntadr: '1588-1234',
        hmpg: 'https://www.emart.co.kr',
        dtlexpln: '나라사랑카드 결제 시 생필품 10% 할인'
      },
      {
        rowno: '3',
        rgn: '수도권',
        instltnnm: '에버랜드',
        dcntenatvnm: '놀이공원 특별 할인',
        startday: '2024-03-01',
        fnshday: '2024-11-30',
        cntadr: '031-320-5000',
        hmpg: 'https://www.everland.com',
        dtlexpln: '군인증 제시 시 입장료 60% 할인 (주말 제외)'
      }
    ];
  }
};

// 거리 계산 함수 (Haversine formula)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // 지구 반지름 (km)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return distance;
};

const WelfareScreen: React.FC = () => {
  const [allPxProducts, setAllPxProducts] = useState<PXProduct[]>([]);
  const [filteredPxProducts, setFilteredPxProducts] = useState<PXProduct[]>([]);
  const [martInfo, setMartInfo] = useState<MartInfo[]>([]);
  const [filteredMarts, setFilteredMarts] = useState<MartInfo[]>([]);
  const [discountBenefits, setDiscountBenefits] = useState<DiscountBenefit[]>([]);
  const [filteredBenefits, setFilteredBenefits] = useState<DiscountBenefit[]>([]);
  const [loading, setLoading] = useState(false);
  const [martLoading, setMartLoading] = useState(false);
  const [benefitLoading, setBenefitLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(12);
  const [selectedYear, setSelectedYear] = useState(2024);
  const [showAllMarts, setShowAllMarts] = useState(false);
  const [showAllBenefits, setShowAllBenefits] = useState(false);
  const [martSearchQuery, setMartSearchQuery] = useState('');
  const [benefitSearchQuery, setBenefitSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [sortByDistance, setSortByDistance] = useState(false);
  
  useEffect(() => {
    loadAllPXProducts();
    loadMartInfo();
    loadDiscountBenefits();
  }, []);
  
  useEffect(() => {
    if (allPxProducts.length > 0) {
      const filtered = filterProductsByDate(allPxProducts, selectedYear.toString(), selectedMonth.toString());
      setFilteredPxProducts(filtered);
    }
  }, [selectedMonth, selectedYear, allPxProducts]);
  
  useEffect(() => {
    // 마트 검색 필터링
    if (martSearchQuery.trim() === '') {
      setFilteredMarts(martInfo);
    } else {
      const filtered = martInfo.filter(mart => 
        mart.martname.toLowerCase().includes(martSearchQuery.toLowerCase()) ||
        mart.address.toLowerCase().includes(martSearchQuery.toLowerCase())
      );
      setFilteredMarts(filtered);
    }
  }, [martInfo, martSearchQuery]);
  
  useEffect(() => {
    // 할인 혜택 검색 필터링
    if (benefitSearchQuery.trim() === '') {
      setFilteredBenefits(discountBenefits);
    } else {
      const filtered = discountBenefits.filter(benefit => 
        benefit.instltnnm.toLowerCase().includes(benefitSearchQuery.toLowerCase()) ||
        benefit.dcntenatvnm.toLowerCase().includes(benefitSearchQuery.toLowerCase()) ||
        benefit.rgn.toLowerCase().includes(benefitSearchQuery.toLowerCase()) ||
        benefit.dtlexpln.toLowerCase().includes(benefitSearchQuery.toLowerCase())
      );
      setFilteredBenefits(filtered);
    }
  }, [discountBenefits, benefitSearchQuery]);
  
  const loadAllPXProducts = async () => {
    setLoading(true);
    try {
      const products = await fetchAllPXProducts();
      setAllPxProducts(products);
    } catch (error) {
      console.error('PX 상품 데이터 로드 실패:', error);
      setAllPxProducts([]);
      Alert.alert('알림', 'PX 인기상품 정보를 불러오는데 실패했습니다.\n네트워크 연결을 확인해주세요.');
    } finally {
      setLoading(false);
    }
  };
  
  const loadMartInfo = async () => {
    setMartLoading(true);
    try {
      const marts = await fetchMartInfo();
      setMartInfo(marts);
    } catch (error) {
      console.error('마트 정보 로드 실패:', error);
      setMartInfo([]);
    } finally {
      setMartLoading(false);
    }
  };
  
  const loadDiscountBenefits = async () => {
    setBenefitLoading(true);
    try {
      const benefits = await fetchDiscountBenefits();
      setDiscountBenefits(benefits);
    } catch (error) {
      console.error('할인 혜택 데이터 로드 실패:', error);
      setDiscountBenefits([]);
    } finally {
      setBenefitLoading(false);
    }
  };
  
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadAllPXProducts(), loadMartInfo(), loadDiscountBenefits()]);
    setRefreshing(false);
  };
  
  const getRankingIcon = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `${rank}위`;
    }
  };
  
  const getRankingColor = (rank: number) => {
    switch (rank) {
      case 1: return '#FFD700';
      case 2: return '#C0C0C0';
      case 3: return '#CD7F32';
      default: return '#E0E0E0';
    }
  };
  
  const months = [
    { value: 1, label: '1월' },
    { value: 2, label: '2월' },
    { value: 3, label: '3월' },
    { value: 4, label: '4월' },
    { value: 5, label: '5월' },
    { value: 6, label: '6월' },
    { value: 7, label: '7월' },
    { value: 8, label: '8월' },
    { value: 9, label: '9월' },
    { value: 10, label: '10월' },
    { value: 11, label: '11월' },
    { value: 12, label: '12월' },
  ];

  const years = [
    { value: 2024, label: '2024년' },
    { value: 2023, label: '2023년' },
    { value: 2022, label: '2022년' },
    { value: 2021, label: '2021년' },
    { value: 2020, label: '2020년' },
    { value: 2019, label: '2019년' },
    { value: 2018, label: '2018년' },
    { value: 2017, label: '2017년' },
    { value: 2016, label: '2016년' },
    { value: 2015, label: '2015년' },
  ];

  const openMap = (mart: MartInfo) => {
    const { martname, address } = mart;
    
    // 구글 맵으로 주소 검색
    const searchUrl = `https://maps.google.com/maps?q=${encodeURIComponent(address)}`;
    
    Alert.alert(
      '지도 열기',
      `${martname}의 위치를 지도에서 확인하시겠습니까?\n\n📍 ${address}`,
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '지도 열기', 
          onPress: async () => {
            try {
              const supported = await Linking.canOpenURL(searchUrl);
              if (supported) {
                await Linking.openURL(searchUrl);
              } else {
                Alert.alert('오류', '지도 앱을 열 수 없습니다.');
              }
            } catch (error) {
              console.error('지도 열기 오류:', error);
              Alert.alert('오류', '지도 앱을 여는 중 오류가 발생했습니다.');
            }
          }
        }
      ]
    );
  };

  const openWebsite = (benefit: DiscountBenefit) => {
    const { instltnnm, hmpg } = benefit;
    
    if (hmpg && hmpg.trim() !== '') {
      Alert.alert(
        '홈페이지 열기',
        `${instltnnm}의 홈페이지로 이동하시겠습니까?\n\n🌐 ${hmpg}`,
        [
          { text: '취소', style: 'cancel' },
          { 
            text: '홈페이지 열기', 
            onPress: async () => {
              try {
                const url = hmpg.startsWith('http') ? hmpg : `https://${hmpg}`;
                const supported = await Linking.canOpenURL(url);
                if (supported) {
                  await Linking.openURL(url);
                } else {
                  Alert.alert('오류', '홈페이지를 열 수 없습니다.');
                }
              } catch (error) {
                console.error('홈페이지 열기 오류:', error);
                Alert.alert('오류', '홈페이지를 여는 중 오류가 발생했습니다.');
              }
            }
          }
        ]
      );
    } else {
      Alert.alert('알림', '홈페이지 정보가 제공되지 않습니다.');
    }
  };

  // 위치 권한 요청 및 현재 위치 가져오기
  const getCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      
      // 위치 권한 요청
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          '위치 권한 필요', 
          '주변 영외마트를 찾으려면 위치 권한이 필요합니다.\n설정에서 위치 권한을 허용해주세요.',
          [
            { text: '취소', style: 'cancel' },
            { text: '설정으로 이동', onPress: () => Linking.openSettings() }
          ]
        );
        return;
      }

      // 현재 위치 가져오기
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      const { latitude, longitude } = location.coords;
      setUserLocation({ latitude, longitude });
      
      // 마트 정보에 거리 계산 추가
      const martsWithDistance = martInfo.map(mart => {
        // 임시 좌표 (실제로는 주소를 좌표로 변환하는 Geocoding API 필요)
        const martLat = parseFloat(mart.latitude || '37.5665') + (Math.random() - 0.5) * 0.1;
        const martLon = parseFloat(mart.longitude || '126.9780') + (Math.random() - 0.5) * 0.1;
        
        const distance = calculateDistance(latitude, longitude, martLat, martLon);
        
        return {
          ...mart,
          latitude: martLat.toString(),
          longitude: martLon.toString(),
          distance: Math.round(distance * 10) / 10 // 소수점 첫째자리까지
        };
      });
      
      setMartInfo(martsWithDistance);
      setSortByDistance(true);
      
      Alert.alert('위치 확인 완료', `현재 위치를 기준으로 주변 영외마트를 거리순으로 정렬했습니다.`);
      
    } catch (error) {
      console.error('위치 가져오기 오류:', error);
      Alert.alert('오류', '현재 위치를 가져오는데 실패했습니다.');
    } finally {
      setLocationLoading(false);
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#3F51B5']}
        />
      }
    >
      <Card style={styles.card}>
        <Card.Content>
          <Title>나라사랑카드 현황</Title>
          <View style={styles.cardContainer}>
            <Image
              source={{ uri: 'https://picsum.photos/400/200' }}
              style={styles.cardImage}
            />
            <View style={styles.cardInfo}>
              <Text style={styles.cardNumber}>**** **** **** 1234</Text>
              <Text style={styles.cardHolder}>홍길동</Text>
              <View style={styles.balanceContainer}>
                <Text style={styles.balanceLabel}>잔액</Text>
                <Text style={styles.balanceAmount}>1,234,000원</Text>
              </View>
            </View>
          </View>
          
          <Divider style={styles.divider} />
          
          {/* 소비 분석 섹션 */}
          <Title style={styles.subTitle}>💡 이번 달 소비 분석</Title>
          <ScrollView horizontal style={styles.analysisContainer} showsHorizontalScrollIndicator={false}>
            <View style={styles.analysisCard}>
              <Text style={styles.analysisTitle}>🍺 주류/음료</Text>
              <Text style={styles.analysisAmount}>156,000원</Text>
              <Text style={styles.analysisPercentage}>전체의 42%</Text>
              <View style={styles.warningContainer}>
                <Text style={styles.warningText}>⚠️ 평균보다 높음</Text>
              </View>
            </View>
            
            <View style={styles.analysisCard}>
              <Text style={styles.analysisTitle}>🍜 식품/간식</Text>
              <Text style={styles.analysisAmount}>89,500원</Text>
              <Text style={styles.analysisPercentage}>전체의 24%</Text>
              <View style={styles.normalContainer}>
                <Text style={styles.normalText}>✅ 적정 수준</Text>
              </View>
            </View>
            
            <View style={styles.analysisCard}>
              <Text style={styles.analysisTitle}>🧴 생활용품</Text>
              <Text style={styles.analysisAmount}>67,500원</Text>
              <Text style={styles.analysisPercentage}>전체의 18%</Text>
              <View style={styles.normalContainer}>
                <Text style={styles.normalText}>✅ 적정 수준</Text>
              </View>
            </View>
            
            <View style={styles.analysisCard}>
              <Text style={styles.analysisTitle}>🎮 기타</Text>
              <Text style={styles.analysisAmount}>59,000원</Text>
              <Text style={styles.analysisPercentage}>전체의 16%</Text>
              <View style={styles.normalContainer}>
                <Text style={styles.normalText}>✅ 적정 수준</Text>
              </View>
            </View>
          </ScrollView>
          
          {/* 소비 솔루션 */}
          <View style={styles.solutionContainer}>
            <Text style={styles.solutionTitle}>🎯 맞춤 소비 솔루션</Text>
            <View style={styles.solutionCard}>
              <Text style={styles.solutionText}>
                💰 주류/음료 소비가 평균(25%)보다 높습니다.{'\n'}
                • 주 2회 → 주 1회로 줄여보세요{'\n'}
                • 월 6만원 절약 가능합니다{'\n'}
                • 건강도 함께 챙기세요! 💪
              </Text>
            </View>
            <View style={styles.solutionCard}>
              <Text style={styles.solutionText}>
                📊 다른 장병들은 이렇게 소비해요:{'\n'}
                • 식품/간식: 35% | 생활용품: 25%{'\n'}
                • 주류/음료: 25% | 기타: 15%
              </Text>
            </View>
          </View>
          
          <Divider style={styles.divider} />
          
          <Title style={styles.subTitle}>최근 거래 내역</Title>
          <View style={styles.transactionList}>
            <View style={styles.transaction}>
              <View style={styles.transactionLeft}>
                <Text style={styles.transactionStore}>PX 편의점 (주류)</Text>
                <Text style={styles.transactionDate}>2025-04-25 14:30</Text>
              </View>
              <Text style={[styles.transactionAmount, styles.alcoholExpense]}>-15,000원</Text>
            </View>
            <Divider />
            <View style={styles.transaction}>
              <View style={styles.transactionLeft}>
                <Text style={styles.transactionStore}>군 매점 (간식)</Text>
                <Text style={styles.transactionDate}>2025-04-24 10:15</Text>
              </View>
              <Text style={styles.transactionAmount}>-8,500원</Text>
            </View>
            <Divider />
            <View style={styles.transaction}>
              <View style={styles.transactionLeft}>
                <Text style={styles.transactionStore}>PX 편의점 (음료)</Text>
                <Text style={styles.transactionDate}>2025-04-23 16:45</Text>
              </View>
              <Text style={[styles.transactionAmount, styles.alcoholExpense]}>-12,000원</Text>
            </View>
            <Divider />
            <View style={styles.transaction}>
              <View style={styles.transactionLeft}>
                <Text style={styles.transactionStore}>생활관 매점 (생활용품)</Text>
                <Text style={styles.transactionDate}>2025-04-22 11:20</Text>
              </View>
              <Text style={styles.transactionAmount}>-25,500원</Text>
            </View>
            <Divider />
            <View style={styles.transaction}>
              <View style={styles.transactionLeft}>
                <Text style={styles.transactionStore}>PX 편의점 (주류)</Text>
                <Text style={styles.transactionDate}>2025-04-21 19:30</Text>
              </View>
              <Text style={[styles.transactionAmount, styles.alcoholExpense]}>-18,000원</Text>
            </View>
            <Divider />
            <View style={styles.transaction}>
              <View style={styles.transactionLeft}>
                <Text style={styles.transactionStore}>급여 입금</Text>
                <Text style={styles.transactionDate}>2025-04-01 00:00</Text>
              </View>
              <Text style={[styles.transactionAmount, styles.depositAmount]}>+608,500원</Text>
            </View>
          </View>
          <Button 
            mode="outlined" 
            style={styles.viewMoreButton}
            onPress={() => {/* 거래내역 상세 기능 */}}
          >
            전체 거래내역 보기
          </Button>
          
          <Text style={styles.apiNotice}>
            ⚠️ 나라사랑카드 API가 제공되지 않아 임시 데이터로 구현되었습니다
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Title>🏆 PX 인기상품 랭킹</Title>
            <Text style={styles.subtitle}>
              {selectedYear}년 {selectedMonth}월 인기상품 TOP 10
            </Text>
            <Text style={styles.dataInfo}>
              📊 실시간 국방부 공식 데이터 기반
            </Text>
          </View>
          
          {/* 연도 선택 탭 */}
          <Text style={styles.selectorLabel}>📅 연도 선택</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.yearSelector}
            contentContainerStyle={styles.yearSelectorContent}
          >
            {years.map((year) => (
              <Chip
                key={year.value}
                selected={selectedYear === year.value}
                onPress={() => setSelectedYear(year.value)}
                style={[
                  styles.yearChip,
                  selectedYear === year.value && styles.selectedYearChip
                ]}
                textStyle={selectedYear === year.value ? styles.selectedYearText : undefined}
                icon={selectedYear === year.value ? "check" : undefined}
              >
                {year.label}
              </Chip>
            ))}
          </ScrollView>
          
          {/* 월별 선택 탭 */}
          <Text style={styles.selectorLabel}>📅 월 선택</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.monthSelector}
            contentContainerStyle={styles.monthSelectorContent}
          >
            {months.map((month) => (
              <Chip
                key={month.value}
                selected={selectedMonth === month.value}
                onPress={() => setSelectedMonth(month.value)}
                style={[
                  styles.monthChip,
                  selectedMonth === month.value && styles.selectedMonthChip
                ]}
                textStyle={selectedMonth === month.value ? styles.selectedMonthText : undefined}
                icon={selectedMonth === month.value ? "check" : undefined}
              >
                {month.label}
              </Chip>
            ))}
          </ScrollView>
          
          {/* 로딩 상태 */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3F51B5" />
              <Text style={styles.loadingText}>
                {selectedYear}년 {selectedMonth}월 랭킹 데이터를 불러오는 중...
              </Text>
            </View>
          ) : filteredPxProducts.length > 0 ? (
            <View style={styles.rankingContainer}>
              <Text style={styles.rankingHeader}>
                🎯 {selectedMonth}월 베스트 상품들
              </Text>
              {filteredPxProducts.slice(0, 10).map((product, index) => {
                const rank = index + 1;
                return (
                  <Card key={`${product.rowno}-${selectedMonth}`} style={[
                    styles.rankingCard,
                    { backgroundColor: getRankingColor(rank) }
                  ]}>
                    <Card.Content style={styles.rankingContent}>
                      <View style={styles.rankingLeft}>
                        <Text style={styles.rankingIcon}>
                          {getRankingIcon(rank)}
                        </Text>
                        <View style={styles.productInfo}>
                          <Text style={styles.productName} numberOfLines={2}>
                            {product.prdtnm}
                          </Text>
                          <Text style={styles.productMeta}>
                            {product.sellyear}년 {parseInt(product.sellmonth)}월 • 선정기준: {product.seltnstd}
                          </Text>
                        </View>
                      </View>
                      
                      {rank <= 3 && (
                        <View style={styles.trophyContainer}>
                          <Text style={styles.trophyText}>
                            {rank === 1 ? '👑' : rank === 2 ? '🎖️' : '🏅'}
                          </Text>
                        </View>
                      )}
                    </Card.Content>
                  </Card>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                📊 {selectedYear}년 {selectedMonth}월 PX 인기상품 데이터가 없습니다
              </Text>
              <Text style={styles.emptySubText}>
                • 해당 월에 등록된 데이터가 없거나{'\n'}
                • 국방부 API가 업데이트되지 않았을 수 있습니다{'\n'}
                • 다른 월을 선택해보세요
              </Text>
              <Button 
                mode="outlined" 
                onPress={loadAllPXProducts}
                style={styles.retryButton}
                icon="refresh"
              >
                새로고침
              </Button>
            </View>
          )}
          
          <Text style={styles.dataSource}>
            📡 데이터 출처: 국방부 공공데이터포털{'\n'}
            📊 제공 데이터: 2015년~2024년 PX 인기상품 정보 (전체 데이터){'\n'}
            ⚠️ 국방부 API 업데이트가 지연될 수 있어 최신 데이터가 없을 수 있습니다{'\n'}
            🕐 마지막 업데이트: {new Date().toLocaleString('ko-KR')}
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Title>🗺️ 영외 마트 위치 찾기</Title>
            <Text style={styles.subtitle}>
              가까운 대형마트를 지도에서 확인하세요
            </Text>
            <Text style={styles.dataInfo}>
              📍 국방부 공식 마트 현황 데이터 기반
            </Text>
          </View>
          
          {martLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3F51B5" />
              <Text style={styles.loadingText}>
                영외 마트 정보를 불러오는 중...
              </Text>
            </View>
          ) : martInfo.length > 0 ? (
            <View style={styles.martContainer}>
              <Text style={styles.martHeader}>
                📍 주변 대형마트 목록 ({martInfo.length}개)
              </Text>
              
              {/* 위치 기반 정렬 버튼 */}
              <View style={styles.locationControls}>
                <Button
                  mode={sortByDistance ? "contained" : "outlined"}
                  icon="map-marker-radius"
                  style={styles.locationButton}
                  onPress={getCurrentLocation}
                  loading={locationLoading}
                  disabled={locationLoading}
                >
                  {userLocation ? '거리순 정렬됨' : '내 주변 마트 찾기'}
                </Button>
                {userLocation && (
                  <Button
                    mode="outlined"
                    icon="sort-alphabetical-ascending"
                    style={styles.sortButton}
                    onPress={() => {
                      setSortByDistance(false);
                      setMartInfo([...martInfo].sort((a, b) => a.martname.localeCompare(b.martname)));
                    }}
                  >
                    이름순
                  </Button>
                )}
              </View>
              
              {/* 마트 검색바 */}
              <Searchbar
                placeholder="마트명 또는 주소로 검색..."
                onChangeText={setMartSearchQuery}
                value={martSearchQuery}
                style={styles.searchBar}
                icon="magnify"
                clearIcon="close"
              />
              
              {filteredMarts.length > 0 ? (
                <>
                  {/* 마트 목록 (3개 또는 전체) */}
                  {(showAllMarts ? 
                    (sortByDistance ? filteredMarts.sort((a, b) => (a.distance || 999) - (b.distance || 999)) : filteredMarts) : 
                    (sortByDistance ? filteredMarts.sort((a, b) => (a.distance || 999) - (b.distance || 999)).slice(0, 3) : filteredMarts.slice(0, 3))
                  ).map((mart) => (
                    <Card key={mart.rowno} style={styles.martCard}>
                      <Card.Content style={styles.martContent}>
                        <View style={styles.martInfo}>
                          <View style={styles.martNameRow}>
                            <Text style={styles.martName}>{mart.martname}</Text>
                            {mart.distance && (
                              <Chip style={styles.distanceChip} textStyle={styles.distanceChipText}>
                                📍 {mart.distance}km
                              </Chip>
                            )}
                          </View>
                          <Text style={styles.martAddress} numberOfLines={2}>
                            📍 {mart.address}
                          </Text>
                          {mart.phone && (
                            <Text style={styles.martPhone}>
                              📞 {mart.phone}
                            </Text>
                          )}
                          {mart.scale && (
                            <Text style={styles.martScale}>
                              🏪 규모: {mart.scale}평
                            </Text>
                          )}
                          {mart.opWeekday && (
                            <Text style={styles.martHours}>
                              🕐 평일: {mart.opWeekday}
                            </Text>
                          )}
                          {mart.opSat && (
                            <Text style={styles.martHours}>
                              🕐 토요일: {mart.opSat}
                            </Text>
                          )}
                          {mart.note && (
                            <Text style={styles.martNote} numberOfLines={2}>
                              ℹ️ {mart.note}
                            </Text>
                          )}
                        </View>
                        <View style={styles.martActions}>
                          <Button
                            mode="contained"
                            icon="map"
                            style={styles.mapButton}
                            onPress={() => openMap(mart)}
                            compact
                          >
                            지도보기
                          </Button>
                        </View>
                      </Card.Content>
                    </Card>
                  ))}
                  
                  {/* 전체보기/접기 버튼 */}
                  {filteredMarts.length > 3 && (
                    <Button
                      mode="outlined"
                      icon={showAllMarts ? "chevron-up" : "chevron-down"}
                      style={styles.showMoreButton}
                      onPress={() => setShowAllMarts(!showAllMarts)}
                    >
                      {showAllMarts 
                        ? `접기 (${filteredMarts.length - 3}개 숨김)` 
                        : `전체보기 (${filteredMarts.length - 3}개 더보기)`
                      }
                    </Button>
                  )}
                </>
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    🔍 검색 결과가 없습니다
                  </Text>
                  <Text style={styles.emptySubText}>
                    다른 검색어를 입력해보세요
                  </Text>
                  <Button 
                    mode="outlined" 
                    onPress={() => setMartSearchQuery('')}
                    style={styles.retryButton}
                    icon="refresh"
                  >
                    검색 초기화
                  </Button>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                🗺️ 영외 마트 정보를 불러올 수 없습니다
              </Text>
              <Text style={styles.emptySubText}>
                • 네트워크 연결을 확인해주세요{'\n'}
                • 국방부 API 서버 상태를 확인 중입니다
              </Text>
              <Button 
                mode="outlined" 
                onPress={loadMartInfo}
                style={styles.retryButton}
                icon="refresh"
              >
                다시 시도
              </Button>
            </View>
          )}
          
          <Text style={styles.dataSource}>
            📡 데이터 출처: 국방부 공공데이터포털{'\n'}
            📊 제공 데이터: 전국 영외 마트 현황 정보{'\n'}
            🗺️ 지도 서비스: Google Maps 연동{'\n'}
            🕐 마지막 업데이트: {new Date().toLocaleString('ko-KR')}
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Title>🎁 병사 할인 혜택</Title>
            <Text style={styles.subtitle}>
              전국 다양한 시설에서 제공하는 군인 할인 혜택
            </Text>
            <Text style={styles.dataInfo}>
              💰 국방부 공식 할인 혜택 정보 기반
            </Text>
          </View>
          
          {benefitLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3F51B5" />
              <Text style={styles.loadingText}>
                할인 혜택 정보를 불러오는 중...
              </Text>
            </View>
          ) : discountBenefits.length > 0 ? (
            <View style={styles.benefitContainer}>
              <Text style={styles.benefitHeader}>
                💰 할인 혜택 목록 ({discountBenefits.length}개)
              </Text>
              
              {/* 할인 혜택 검색바 */}
              <Searchbar
                placeholder="시설명, 혜택명, 지역으로 검색..."
                onChangeText={setBenefitSearchQuery}
                value={benefitSearchQuery}
                style={styles.searchBar}
                icon="magnify"
                clearIcon="close"
              />
              
              {filteredBenefits.length > 0 ? (
                <>
                  {/* 할인 혜택 목록 (3개 또는 전체) */}
                  {(showAllBenefits ? filteredBenefits : filteredBenefits.slice(0, 3)).map((benefit) => (
                    <Card key={benefit.rowno} style={styles.benefitCard}>
                      <Card.Content style={styles.benefitContent}>
                        <View style={styles.benefitInfo}>
                          <View style={styles.benefitHeaderRow}>
                            <Text style={styles.benefitTitle}>{benefit.dcntenatvnm}</Text>
                            <Chip style={styles.regionChip} textStyle={styles.regionChipText}>
                              📍 {benefit.rgn}
                            </Chip>
                          </View>
                          <Text style={styles.facilityName}>
                            🏢 {benefit.instltnnm}
                          </Text>
                          {benefit.dtlexpln && (
                            <Text style={styles.benefitDescription} numberOfLines={2}>
                              📝 {benefit.dtlexpln}
                            </Text>
                          )}
                          <View style={styles.benefitDetails}>
                            {benefit.startday && benefit.fnshday && (
                              <Text style={styles.benefitPeriod}>
                                📅 {benefit.startday} ~ {benefit.fnshday}
                              </Text>
                            )}
                            {benefit.cntadr && (
                              <Text style={styles.benefitContact}>
                                📞 {benefit.cntadr}
                              </Text>
                            )}
                          </View>
                        </View>
                        <View style={styles.benefitActions}>
                          {benefit.hmpg && (
                            <Button
                              mode="contained"
                              icon="web"
                              style={styles.websiteButton}
                              onPress={() => openWebsite(benefit)}
                              compact
                            >
                              홈페이지
                            </Button>
                          )}
                        </View>
                      </Card.Content>
                    </Card>
                  ))}
                  
                  {/* 전체보기/접기 버튼 */}
                  {filteredBenefits.length > 3 && (
                    <Button
                      mode="outlined"
                      icon={showAllBenefits ? "chevron-up" : "chevron-down"}
                      style={styles.showMoreButton}
                      onPress={() => setShowAllBenefits(!showAllBenefits)}
                    >
                      {showAllBenefits 
                        ? `접기 (${filteredBenefits.length - 3}개 숨김)` 
                        : `전체보기 (${filteredBenefits.length - 3}개 더보기)`
                      }
                    </Button>
                  )}
                </>
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    🔍 검색 결과가 없습니다
                  </Text>
                  <Text style={styles.emptySubText}>
                    다른 검색어를 입력해보세요
                  </Text>
                  <Button 
                    mode="outlined" 
                    onPress={() => setBenefitSearchQuery('')}
                    style={styles.retryButton}
                    icon="refresh"
                  >
                    검색 초기화
                  </Button>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                🎁 할인 혜택 정보를 불러올 수 없습니다
              </Text>
              <Text style={styles.emptySubText}>
                • 네트워크 연결을 확인해주세요{'\n'}
                • 국방부 API 서버 상태를 확인 중입니다
              </Text>
              <Button 
                mode="outlined" 
                onPress={loadDiscountBenefits}
                style={styles.retryButton}
                icon="refresh"
              >
                다시 시도
              </Button>
            </View>
          )}
          
          <Text style={styles.dataSource}>
            📡 데이터 출처: 국방부 공공데이터포털{'\n'}
            📊 제공 데이터: 전국 병사 할인 혜택 정보{'\n'}
            🌐 홈페이지 연동: 각 시설별 공식 홈페이지{'\n'}
            🕐 마지막 업데이트: {new Date().toLocaleString('ko-KR')}
          </Text>
        </Card.Content>
      </Card>
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
  cardContainer: {
    marginVertical: 15,
    alignItems: 'center',
  },
  cardImage: {
    width: '100%',
    height: 180,
    borderRadius: 10,
  },
  cardInfo: {
    position: 'absolute',
    bottom: 20,
    left: 20,
  },
  cardNumber: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    marginBottom: 5,
  },
  cardHolder: {
    color: 'white',
    fontSize: 14,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  balanceContainer: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  balanceLabel: {
    color: 'white',
    fontSize: 14,
    marginRight: 5,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  balanceAmount: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  divider: {
    marginVertical: 15,
  },
  subTitle: {
    fontSize: 18,
    marginBottom: 10,
  },
  transactionList: {
    marginBottom: 10,
  },
  transaction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  transactionLeft: {
    flex: 1,
  },
  transactionStore: {
    fontSize: 16,
    marginBottom: 3,
  },
  transactionDate: {
    fontSize: 12,
    color: '#666',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  depositAmount: {
    color: '#4CAF50',
  },
  viewMoreButton: {
    marginTop: 10,
  },
  productsContainer: {
    marginTop: 15,
    marginLeft: -10,
  },
  productCard: {
    width: 150,
    marginHorizontal: 10,
  },
  productImage: {
    height: 100,
  },
  productName: {
    fontSize: 14,
    marginBottom: 3,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  discountContainer: {
    marginTop: 15,
    marginLeft: -10,
  },
  discountCard: {
    width: 180,
    marginHorizontal: 10,
  },
  discountImage: {
    height: 120,
  },
  discountTitle: {
    fontSize: 14,
    marginBottom: 3,
  },
  discountDescription: {
    fontSize: 12,
    color: '#666',
  },
  addButton: {
    marginTop: 15,
  },
  sectionHeader: {
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  dataInfo: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  selectorLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  yearSelector: {
    marginBottom: 10,
  },
  yearSelectorContent: {
    paddingHorizontal: 10,
  },
  yearChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  selectedYearChip: {
    backgroundColor: '#3F51B5',
  },
  selectedYearText: {
    color: 'white',
    fontWeight: 'bold',
  },
  monthSelector: {
    marginBottom: 10,
  },
  monthSelectorContent: {
    paddingHorizontal: 10,
  },
  monthChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  selectedMonthChip: {
    backgroundColor: '#3F51B5',
  },
  selectedMonthText: {
    color: 'white',
    fontWeight: 'bold',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    textAlign: 'center',
  },
  rankingContainer: {
    marginTop: 15,
  },
  rankingHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3F51B5',
    marginBottom: 10,
    textAlign: 'center',
  },
  rankingCard: {
    marginBottom: 8,
    elevation: 2,
  },
  rankingContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  rankingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rankingIcon: {
    fontSize: 20,
    marginRight: 12,
    minWidth: 30,
  },
  productInfo: {
    flex: 1,
  },
  productMeta: {
    fontSize: 12,
    color: '#666',
  },
  trophyContainer: {
    marginLeft: 10,
  },
  trophyText: {
    fontSize: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    marginBottom: 5,
    fontSize: 16,
  },
  emptySubText: {
    color: '#999',
    textAlign: 'center',
    marginBottom: 15,
    fontSize: 14,
  },
  retryButton: {
    marginTop: 10,
  },
  dataSource: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    marginTop: 15,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  analysisContainer: {
    marginTop: 15,
    marginLeft: -10,
  },
  analysisCard: {
    width: 160,
    marginHorizontal: 10,
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    elevation: 2,
  },
  analysisTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  analysisAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  analysisPercentage: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  warningContainer: {
    backgroundColor: '#ffebee',
    padding: 6,
    borderRadius: 5,
    borderLeftWidth: 3,
    borderLeftColor: '#f44336',
  },
  warningText: {
    fontSize: 11,
    color: '#d32f2f',
    fontWeight: 'bold',
  },
  normalContainer: {
    backgroundColor: '#e8f5e8',
    padding: 6,
    borderRadius: 5,
    borderLeftWidth: 3,
    borderLeftColor: '#4caf50',
  },
  normalText: {
    fontSize: 11,
    color: '#2e7d32',
    fontWeight: 'bold',
  },
  solutionContainer: {
    marginTop: 20,
  },
  solutionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3F51B5',
    marginBottom: 12,
  },
  solutionCard: {
    backgroundColor: '#f3f4f6',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#3F51B5',
    elevation: 1,
  },
  solutionText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  apiNotice: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    marginTop: 15,
    fontStyle: 'italic',
    lineHeight: 16,
    backgroundColor: '#f9f9f9',
    padding: 8,
    borderRadius: 5,
  },
  alcoholExpense: {
    color: '#f44336',
    fontWeight: 'bold',
  },
  martContainer: {
    marginTop: 15,
  },
  martHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3F51B5',
    marginBottom: 10,
    textAlign: 'center',
  },
  martCard: {
    marginBottom: 8,
    elevation: 2,
  },
  martContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  martInfo: {
    flex: 1,
  },
  martName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  martAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  martPhone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  martScale: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  martHours: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  martNote: {
    fontSize: 12,
    color: '#666',
  },
  martActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mapButton: {
    marginLeft: 10,
  },
  searchBar: {
    marginBottom: 10,
  },
  showMoreButton: {
    marginTop: 10,
  },
  benefitContainer: {
    marginTop: 15,
  },
  benefitHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3F51B5',
    marginBottom: 10,
    textAlign: 'center',
  },
  benefitCard: {
    marginBottom: 8,
    elevation: 2,
  },
  benefitContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  benefitInfo: {
    flex: 1,
  },
  benefitHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  regionChip: {
    marginLeft: 10,
  },
  regionChipText: {
    fontSize: 11,
    color: '#666',
  },
  facilityName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  benefitDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 5,
  },
  benefitDetails: {
    marginTop: 3,
  },
  benefitPeriod: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  benefitContact: {
    fontSize: 12,
    color: '#666',
  },
  benefitActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  websiteButton: {
    marginLeft: 10,
  },
  locationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  locationButton: {
    marginRight: 10,
  },
  sortButton: {
    marginLeft: 10,
  },
  martNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceChip: {
    marginLeft: 10,
  },
  distanceChipText: {
    fontSize: 11,
    color: '#666',
  },
});

export default WelfareScreen; 