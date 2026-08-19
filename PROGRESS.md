# 딥페이크 탐지 게임 — 진행 현황

## 완료된 작업

### 프로젝트 초기화
- Next.js 15 (App Router) + TypeScript + Tailwind CSS 로 프로젝트 생성
- 경로: `C:\Users\bbk\Desktop\졸작\deepgame`

### 생성된 파일
| 파일 | 설명 |
|---|---|
| `src/types/game.ts` | TypeScript 타입 정의 (`VideoClip`, `RoundResult`, `GameSession`) |
| `public/data/videos.json` | 게임 데이터 15개 (easy 5 / medium 5 / hard 5), 메타데이터 완성 |
| `src/app/globals.css` | 다크 테마 + 커스텀 애니메이션 (score-pop, reveal-in, glow 효과) |
| `src/app/layout.tsx` | 앱 메타데이터 (한국어 title/description) |
| `public/videos/` | 영상 파일 놓을 폴더 (비어있음, 직접 채워야 함) |

---

## 다음 단계 (해야 할 것)

### 1. 코드 완성 (Claude한테 이어서 시켜도 됨)

다음 파일 3개가 아직 없음:

```
src/app/page.tsx        → 랜딩 페이지 (난이도 선택 + 시작)
src/app/game/page.tsx   → 게임 화면 (영상 + 타이머 + Real/Fake 버튼)
src/app/result/page.tsx → 결과 화면 (점수 + 라운드별 결과)
```

### 2. 영상 파일 추가 (가장 중요)

`public/videos/` 폴더에 MP4 파일을 넣으면 바로 작동함.

파일명은 `public/data/videos.json`의 `"src"` 필드와 일치해야 함:

```
public/videos/
  ff_real_001.mp4        ← FaceForensics++ real
  ff_fake_fs_001.mp4     ← FaceForensics++ FaceSwap
  ff_fake_f2f_001.mp4    ← Face2Face
  ff_fake_nt_001.mp4     ← NeuralTextures
  ff_fake_df_001.mp4     ← DeepFakes
  ff_real_002.mp4
  ff_real_003.mp4
  ff_real_004.mp4
  ff_real_005.mp4
  celeb_fake_001.mp4     ← Celeb-DF v2
  celeb_fake_002.mp4
  celeb_fake_003.mp4
  celeb_real_001.mp4
  ff_fake_fs_002.mp4
  ff_fake_df_002.mp4
```

**FaceForensics++ 클립 잘라내는 방법:**
```bash
# 5초짜리 클립 추출 (시작 10초부터)
ffmpeg -i original.mp4 -ss 10 -t 5 -vf "crop=512:512" output.mp4
```

### 3. 썸네일 추가 (선택사항)

`public/thumbnails/` 폴더에 `.jpg` 파일 추가.
없어도 게임 작동에는 문제 없음.

### 4. 실행 및 테스트

```bash
cd C:\Users\bbk\Desktop\졸작\deepgame
npm run dev
# → http://localhost:3000
```

---

## 게임 구조 (설계)

```
랜딩 페이지 (/)
  └─ 난이도 선택: 쉬움 / 보통 / 어려움
  └─ 라운드 수: 5 / 10 / 15
  └─ 시작 버튼 → /game?difficulty=medium&rounds=10

게임 화면 (/game)
  └─ 헤더: 라운드 카운터 / 점수 / 연속 정답
  └─ 영상 플레이어 (autoplay + loop)
  └─ 타이머바 (15초, 초록→노랑→빨강)
  └─ [REAL] [FAKE] 버튼
  └─ 정답 공개 오버레이 (2.5초)
  └─ 마지막 라운드 → /result

결과 화면 (/result)
  └─ 등급 (S/A/B/C/D)
  └─ 최종 점수 (카운트업 애니메이션)
  └─ 라운드별 정답/오답 브레이크다운
  └─ 결과 공유 / 다시 하기
```

## 점수 체계

| 조건 | 점수 |
|---|---|
| 정답 | +100 |
| 5초 내 정답 | +50 추가 |
| 5~10초 내 정답 | +25 추가 |
| 연속 정답 n개 | +10×n 추가 |
| 오답 / 시간 초과 | 0점, 연속 리셋 |

---

## 데이터 추가 방법 (videos.json 포맷)

```json
{
  "id": "고유_ID",
  "src": "/videos/파일명.mp4",
  "poster": "/thumbnails/파일명.jpg",
  "label": "real",
  "explanation": "정답 공개 시 보여줄 한국어 설명",
  "cues": ["판별 단서1", "판별 단서2", "판별 단서3"],
  "difficulty": "easy",
  "technique": null
}
```

`label`: `"real"` 또는 `"fake"`  
`difficulty`: `"easy"`, `"medium"`, `"hard"`  
`technique`: FaceSwap / Face2Face / NeuralTextures / DeepFakes / null (real인 경우)
