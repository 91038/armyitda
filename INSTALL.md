# 아미잇다(AMIITDA) 설치 및 실행 가이드

본 문서는 "아미잇다" 프로젝트의 설치 및 실행을 위한 상세 가이드입니다. 심사위원 및 평가자를 위해 작성되었습니다.

## 목차
1. [사전 준비 사항](#사전-준비-사항)
2. [웹 플랫폼 설치 및 실행](#웹-플랫폼-설치-및-실행)
3. [모바일 앱 설치 및 실행](#모바일-앱-설치-및-실행)
4. [데이터베이스 설정](#데이터베이스-설정)
5. [문제 해결](#문제-해결)

## 사전 준비 사항

### 필수 소프트웨어
- Node.js 18.0.0 이상 ([다운로드 링크](https://nodejs.org/))
- npm 9.0.0 이상 (Node.js와 함께 설치됨)
- Git ([다운로드 링크](https://git-scm.com/downloads))

### 선택 소프트웨어
- Android Studio (안드로이드 에뮬레이터 사용 시) ([다운로드 링크](https://developer.android.com/studio))
- Xcode (iOS 시뮬레이터 사용 시, Mac 전용) ([App Store 링크](https://apps.apple.com/us/app/xcode/id497799835))

### 권장 사항
- 최소 8GB RAM
- 최소 50GB 여유 디스크 공간
- 윈도우 10 이상, macOS 10.15 이상, 또는 Ubuntu 20.04 이상

## 웹 플랫폼 설치 및 실행

### 1단계: 소스코드 다운로드
```bash
git clone https://github.com/91038/armyitda.git
cd military-platform
```

### 2단계: 의존성 패키지 설치
```bash
npm install
```

### 3단계: 개발 서버 실행
```bash
npm run dev
```

### 4단계: 웹 애플리케이션 접속
- 브라우저에서 [http://localhost:3000](http://localhost:3000) 접속


### 주요 페이지 안내
- 대시보드: `/` (홈)
- 병사 관리: `/soldiers`
- 배차 관리: `/vehicles`
- 휴가 관리: `/leaves`
- 설정: `/settings`

## 모바일 앱 설치 및 실행

### 1단계: 소스코드 다운로드
```bash
git clone https://github.com/91038/armyitda.git
cd military-mobile-app/my-app
```

### 2단계: 의존성 패키지 설치
```bash
npm install
```

### 3단계: Expo 개발 서버 실행
```bash
npx expo start
```

### 4단계: 모바일 앱 실행
**에뮬레이터에서 실행:**
- Android: 터미널에 표시된 메뉴에서 `a` 키를 누름
- iOS: 터미널에 표시된 메뉴에서 `i` 키를 누름 (Mac 환경만 가능)

**실제 기기에서 실행:**
1. 스마트폰에 Expo Go 앱 설치:
   - [Android용 Expo Go](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - [iOS용 Expo Go](https://apps.apple.com/app/expo-go/id982107779)
2. 개발 PC와 스마트폰이 동일한 Wi-Fi 네트워크에 연결되어 있는지 확인
3. Expo 개발 서버가 실행된 터미널에 표시된 QR 코드를 스캔:
   - Android: Expo Go 앱에서 "Scan QR Code" 선택
   - iOS: 기본 카메라 앱으로 QR 코드 스캔

## 데이터베이스 설정

본 프로젝트는 Firebase Firestore를 사용합니다. 기본 설정은 이미 완료되어 있어 별도의 설정 없이 사용 가능합니다.

만약 "Missing or insufficient permissions" 오류가 발생할 경우:

1. Firebase 규칙 업데이트
```bash
# 웹 플랫폼 디렉토리에서
cd military-platform
firebase deploy --only firestore:rules

# 모바일 앱 디렉토리에서
cd military-mobile-app/my-app
firebase deploy --only firestore:rules
```

## 문제 해결

### 일반적인 문제

1. **"Node.js 버전 오류"**
   - 증상: "Your Node.js version is not supported"
   - 해결: Node.js 18.0.0 이상 버전 설치

2. **"의존성 패키지 설치 오류"**
   - 증상: npm install 실행 시 오류 발생
   - 해결: 
   ```bash
   # 캐시 삭제 후 재시도
   npm cache clean --force
   npm install
   ```

3. **"Firebase 연결 오류"**
   - 증상: "Missing or insufficient permissions" 메시지
   - 해결: 앞서 설명한 Firebase 규칙 업데이트 절차 수행

### 윈도우 환경 특화 문제

1. **"명령어 실행 오류"**
   - 증상: "&&" 연산자 관련 오류
   - 해결: 윈도우 명령 프롬프트에서는 "&&" 대신 개별 명령어를 순차적으로 실행
   ```bash
   # 이렇게 실행
   npm run first-command
   npm run second-command
   ```

2. **"포트 충돌 문제"**
   - 증상: "Port 3000 is already in use"
   - 해결: 다른 포트 지정하여 실행
   ```bash
   # 웹 플랫폼
   npm run dev -- -p 3001
   
   # 또는 기존 프로세스 종료
   netstat -ano | findstr :3000
   taskkill /PID <프로세스ID> /F
   ```

추가 지원이 필요하신 경우, 010-3708-1947으로 문의 부탁드립니다. 