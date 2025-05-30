# 군사 플랫폼 앱 - 휴가 관리 모듈

## 휴가 관리 및 일정 관리 오류 해결 가이드

### 자주 발생하는 오류 및 해결 방법

#### 1. "휴가 정보를 불러오는데 실패했습니다: not-found" 오류

이 오류는 Firebase Cloud Functions에서 사용자 휴가 정보를 가져오지 못할 때 발생합니다.

**해결 방법:**

1. **Firebase 연결 확인**
   ```bash
   # Firebase 프로젝트 연결 확인
   firebase projects:list
   
   # 현재 연결된 프로젝트 확인
   cat .firebaserc
   ```

2. **사용자 데이터 초기화**
   ```bash
   # Firebase 함수 배포로 유저 기본 데이터 생성 함수 활성화
   cd functions
   npm install
   firebase deploy --only functions:getUserLeaveTypes
   ```

3. **앱 재시작**
   ```bash
   # 앱 캐시 지우기 후 재시작
   npm start -- --reset-cache
   ```

#### 2. "디자인 레이아웃 깨짐" 현상

이 문제는 일부 기기에서 UI 컴포넌트가 제대로 렌더링되지 않는 경우입니다.

**해결 방법:**

1. **의존성 패키지 재설치**
   ```bash
   npm install
   ```

2. **Expo 설정 업데이트**
   ```bash
   expo update
   ```

#### 3. "RNCMaterialDatePicker could not be found" 오류

이 오류는 날짜 선택 컴포넌트 라이브러리가 올바르게 설치되지 않았을 때 발생합니다.

**해결 방법:**
```bash
# 날짜 선택 컴포넌트 재설치
npx expo install @react-native-community/datetimepicker@8.2.0
```

#### 4. "휴가 신청 오류: [FirebaseError: not-found]" 오류

이 오류는 휴가 신청 시 Firebase에서 사용자 정보나 휴가 정보를 찾지 못할 때 발생합니다.

**해결 방법:**

1. **Firebase Functions 배포**
   ```bash
   # Firebase 함수 최신화
   cd functions
   npm install
   firebase deploy --only functions
   ```

2. **사용자 인증 재로그인**
   ```bash
   # 앱에서 로그아웃 후 재로그인 필요
   ```

3. **휴가 정보 데이터베이스 초기화**
   관리자가 Firebase Console에서 다음 작업 수행:
   - Authentication에서 해당 사용자 확인
   - Firestore Database에서 userLeaves 컬렉션에 해당 사용자 ID로 문서 생성
   - 기본 휴가 정보 추가 (연가 24일)

4. **디버깅 로그 확인**
   ```bash
   # Firebase Functions 로그 확인
   firebase functions:log
   ```

### Firebase 설정 문제 디버깅

Firebase 연결 문제가 발생할 경우:

1. **Firebase config 파일 확인**
   - `src/firebase/config.ts` 파일에서 올바른 Firebase 프로젝트 정보가 설정되어 있는지 확인
   - apiKey, projectId, appId 등의 값이 올바른지 확인

2. **Firebase Functions 리전 확인**
   - 함수가 `asia-northeast3` 리전을 사용하는지 확인
   - 서버와 클라이언트 모두 동일한 리전을 사용해야 함

3. **네트워크 연결 확인**
   - 디바이스나 에뮬레이터가 인터넷에 연결되어 있고 Firebase에 접근할 수 있는지 확인

### 앱 완전 초기화 방법

모든 방법이 실패한 경우 앱을 완전히 초기화:

```bash
# 1. 캐시 및 임시 파일 삭제
rm -rf node_modules
rm -rf .expo
rm -rf ios/build
rm -rf android/build
rm -rf android/app/build

# 2. 의존성 패키지 재설치
npm install

# 3. 캐시 초기화 후 재시작
npm start -- --reset-cache
```

### Firebase 데이터베이스 설정

휴가 관리 모듈은 다음 Firebase 컬렉션을 사용합니다:

- `users`: 사용자 기본 정보
- `userLeaves`: 사용자별 휴가 유형 및 일수 정보 
- `schedules`: 휴가 신청 및 승인 정보

### 테스트 데이터 생성

개발 및 테스트 목적으로 기본 휴가 데이터를 생성할 수 있습니다:

```bash
# 테스트 데이터 생성 스크립트 실행
node scripts/generate-test-data.js
```

## 앱 실행 방법

```bash
# 의존성 설치
npm install

# 앱 시작
npm start

# 안드로이드에서 실행
npm run android

# iOS에서 실행
npm run ios
```

주의: Firebase 설정 파일(`src/firebase/config.ts`)이 올바르게 구성되어 있는지 확인하세요. 

## 주요 기능
- 병사 관리 및 정보 제공
- 휴가 신청 및 관리
- 일정 관리
- 교육 및 훈련 관리
- 통계 및 리포트

## 휴가 관리 기능 최적화 (2023-11-20)

### 개선된 사항
1. **데이터 캐싱 구현**
   - AsyncStorage를 활용한 휴가 정보 로컬 캐싱 (5분 유효기간)
   - 캐시 데이터 우선 표시 후 백그라운드에서 실제 데이터 갱신

2. **병렬 데이터 로딩**
   - 필요한 데이터 요청을 병렬로 처리하여 로딩 시간 단축
   - Promise.all을 활용한 사용자 정보, 휴가 정보 동시 조회

3. **중복 요청 방지**
   - ref 기반 요청 관리로 중복 API 호출 차단
   - 이미 진행 중인 동일 요청은 재사용하여 리소스 절약

4. **타임아웃 최적화**
   - 타임아웃 시간 단축 (5초 → 3초)
   - 더 빠른 기본 데이터 표시로 사용자 경험 개선

5. **단계적 데이터 로딩**
   - 필수 데이터 먼저 표시 후 세부 정보 로드
   - 최근 5개 휴가 내역만 빠르게 로드

6. **새로고침 기능 추가**
   - 사용자가 필요할 때 데이터 갱신 가능
   - 캐시 무시하고 강제 리로드 옵션 제공

## 설정 및 실행 방법

### 필수 요구사항
- Node.js 14 이상
- Firebase 계정 및 설정
- Expo CLI

### 설정

1. 패키지 설치
```bash
npm install
```

2. Firebase 설정 (firebase.json 필요)

3. 앱 실행
```bash
npm start
``` 