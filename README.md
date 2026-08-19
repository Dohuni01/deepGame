# 딥페이크 포렌식 (Deepfake Forensics)

실제 영상과 AI가 생성한 딥페이크 영상을 구분하는 탐지 훈련 게임입니다.

## 소개

FaceForensics++ 데이터셋의 실제 영상과 Deepfakes 기법으로 생성된 조작 영상을 보고, 진짜인지 가짜인지 판별하는 게임입니다. 플레이어는 영상을 보는 동안 언제든 REAL 또는 FAKE를 선택할 수 있으며, 연속 정답 시 콤보 보너스가 부여됩니다.

## 주요 기능

- **24개 영상 클립**: 실제 영상 12개 + 딥페이크 영상 12개 (각 5초)
- **타이머 없음**: 영상 재생 중 언제든 답변 선택 가능
- **라운드 선택**: 5 / 10 / 15 라운드 중 선택
- **콤보 시스템**: 연속 정답 시 추가 점수
- **결과 리포트**: 정확도 기반 등급(S~D) 및 증거 로그 제공
- **키보드 단축키**: `R` = REAL, `F` = FAKE, `Space` = 다음 라운드

## 기술 스택

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Dataset**: FaceForensics++ (FF++) — youtube 원본 + Deepfakes 조작 영상

## 로컬 실행

```bash
npm install
npm run dev
```

브라우저에서 http://localhost:3000 접속

## 데이터셋

영상 클립은 [FaceForensics++](https://github.com/ondyari/FaceForensics) 데이터셋에서 가져왔습니다.

- **실제 영상**: `original_sequences/youtube/c23/videos/` — 12명의 개별 인물
- **딥페이크 영상**: `manipulated_sequences/Deepfakes/c23/videos/` — Deepfakes 오토인코더 기법

데이터셋 원본 파일은 용량 문제로 저장소에 포함되지 않습니다 (`Datasets/` 폴더는 `.gitignore` 처리).

## 프로젝트 구조

```
deepGame/
├── public/
│   ├── videos/          # 5초 클립 24개 (MP4)
│   └── data/
│       └── videos.json  # 영상 메타데이터
└── src/
    ├── app/
    │   ├── page.tsx        # 랜딩 페이지
    │   ├── game/page.tsx   # 게임 페이지
    │   └── result/page.tsx # 결과 페이지
    └── types/
        └── game.ts         # 타입 정의
```

