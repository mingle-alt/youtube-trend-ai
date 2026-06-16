# YouTube 트렌드 분석기

국가별·카테고리별 YouTube 급상승 영상을 분석하고, 전세계 통합 순위를 제공하는 Next.js 대시보드 툴입니다.

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| 🔥 급상승 TOP 100 | 국가·카테고리 필터 조합으로 최신 급상승 영상 최대 100개 조회 |
| 🌍 전세계 TOP 100 | US·KR·JP·GB·IN·DE·BR·FR 8개국 데이터를 병렬 수집, 가중 점수로 통합 순위 산정 |
| 📚 교육 TOP 30 | 교육 카테고리(ID 27) 급상승 영상 TOP 30 |
| 🌐 국가 선택 | 15개국 지원 (한국·미국·일본·영국·독일·프랑스·인도·브라질 등) |
| 💬 댓글 패널 | 영상 클릭 → 댓글 슬라이드 패널, 더 보기(페이지네이션) |
| 📥 CSV 내보내기 | 현재 리스트를 `유튜브_트렌드_{탭}_{날짜}.csv`로 다운로드 (Excel 한글 호환) |
| 🔑 멀티 API 키 | 여러 키 등록, 쿼터 초과 시 자동 다음 키로 전환(Key Rotation) |
| 📊 쿼터 위젯 | 헤더에 오늘 소모 쿼터 / 10,000 실시간 표시 |
| ⚡ 1시간 캐싱 | 동일 요청 반복 시 API 재호출 없이 캐시 반환, 쿼터 절약 |

---

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. YouTube Data API v3 키 발급

[Google Cloud Console](https://console.cloud.google.com/apis/credentials)에서 API 키를 발급하고 **YouTube Data API v3**를 활성화합니다.

### 3. 환경 변수 설정 (선택)

`.env.local` 파일에 키를 넣으면 앱 실행 시 자동으로 사용됩니다.

```bash
YOUTUBE_API_KEY=AIza...
```

> 환경 변수 없이도 앱 첫 실행 시 입력 모달에서 직접 등록할 수 있습니다.  
> 등록한 키는 브라우저 **localStorage**에 영구 저장됩니다.

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열면 바로 사용할 수 있습니다.

---

## API 키 멀티 등록 방법

모달의 텍스트 영역에 줄바꿈 또는 쉼표(,)로 키를 구분해 입력합니다.

```
AIzaKey1...
AIzaKey2...
AIzaKey3...
```

쿼터 초과(403) 발생 시 백엔드가 자동으로 다음 키로 재시도하며, 헤더에 전환 알림이 표시됩니다.

---

## 전세계 통합 순위 알고리즘

8개국에서 각각 TOP 50을 병렬로 수집한 뒤 다음 공식으로 점수를 산정합니다.

```
globalScore = viewCount × (1 + 0.2 × (등장 국가 수 − 1))
```

여러 나라에서 동시에 급상승한 영상일수록 가중치가 높아집니다.  
VideoCard에 등장한 국가의 국기 뱃지가 표시됩니다.

---

## API 쿼터 비용

| 엔드포인트 | 단위 비용 |
|-----------|---------|
| `videos.list` | 1 unit / 호출 |
| `commentThreads.list` | 10 unit / 호출 |
| 급상승 TOP 100 1회 | ≈ 2 unit |
| 전세계 TOP 100 1회 | ≈ 8 unit |
| 일일 한도 | 10,000 unit |

동일 요청은 **1시간** 동안 서버 메모리에 캐시되어 쿼터를 소모하지 않습니다.

---

## 프로젝트 구조

```
src/
├── app/
│   ├── api/
│   │   ├── trending/route.ts   # 급상승 영상 (캐싱 포함)
│   │   ├── global/route.ts     # 전세계 통합 순위 (캐싱 포함)
│   │   ├── categories/route.ts # 카테고리 목록
│   │   └── comments/route.ts   # 댓글
│   ├── layout.tsx
│   └── page.tsx                # 메인 대시보드
├── components/
│   ├── ApiKeyModal.tsx          # 멀티키 입력 모달
│   ├── QuotaWidget.tsx          # 쿼터 게이지 위젯
│   ├── VideoCard.tsx            # 영상 카드 (국기 뱃지 포함)
│   ├── VideoDetailModal.tsx     # 영상 상세 모달
│   └── CommentsPanel.tsx        # 댓글 슬라이드 패널
├── lib/
│   ├── youtube.ts              # YouTube API v3 래퍼 + 키 로테이션
│   ├── cache.ts                # 서버사이드 TTL 캐시
│   ├── quota.ts                # 클라이언트 쿼터 추적 (localStorage)
│   └── countries.ts            # 지원 국가 목록
└── types/
    └── youtube.ts              # TypeScript 타입 정의
```

---

## 기술 스택

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **API:** YouTube Data API v3
