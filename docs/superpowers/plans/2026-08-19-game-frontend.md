# Game Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 딥페이크 탐지 게임의 세 페이지(랜딩, 게임, 결과)를 Next.js App Router + TypeScript + Tailwind CSS 4로 구현한다.

**Architecture:** Landing → Game은 URL 쿼리 파라미터(`?difficulty=X&rounds=N`), Game → Result는 `sessionStorage`로 `GameSession` JSON을 전달한다. 세 페이지 모두 독립적인 Client Component이며 공유 컴포넌트를 별도로 추출하지 않는다.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, Tailwind CSS 4, `useSearchParams` (Suspense 필수)

**Spec:** PROGRESS.md (프로젝트 루트)

## Global Constraints

- 모든 페이지: `'use client'` 선언 필수 (hooks 사용)
- import alias: `@/*` → `./src/*` (tsconfig 확인 완료)
- `useSearchParams()` 사용 시 반드시 `<Suspense>`로 감싸야 함 (Next.js App Router 요구사항)
- 타입: `src/types/game.ts`의 `VideoClip`, `RoundResult`, `GameSession`, `Difficulty`, `Label` 사용
- 애니메이션 클래스: `animate-score-pop`, `animate-reveal-in`, `animate-slide-up`, `animate-glow-green`, `animate-glow-red` — `globals.css`에 정의됨
- 데이터: `public/data/videos.json` → `fetch('/data/videos.json')` 로 로드
- 타이머: 15초, `TIMER_MAX = 15`
- 정답 공개 오버레이 지속: 2500ms, `REVEAL_MS = 2500`
- 점수 체계: 정답 +100, 5초 내 +50, 5~10초 내 +25, 연속 n개 +10×n

---

## Task 1: Landing Page

**Files:**
- Modify: `src/app/page.tsx` (기존 Next.js 보일러플레이트 전체 교체)

**Interfaces:**
- Produces: `/game?difficulty={easy|medium|hard}&rounds={5|10|15}` 라우트로 이동

- [ ] **Step 1: `src/app/page.tsx` 전체 교체**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Difficulty } from '@/types/game';

const DIFFICULTIES: { value: Difficulty; label: string; desc: string }[] = [
  { value: 'easy',   label: '쉬움',   desc: '명확한 아티팩트' },
  { value: 'medium', label: '보통',   desc: '미묘한 단서' },
  { value: 'hard',   label: '어려움', desc: '거의 완벽한 딥페이크' },
];

const ROUND_OPTIONS = [5, 10, 15];

export default function LandingPage() {
  const router = useRouter();
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [rounds, setRounds] = useState(10);

  const start = () =>
    router.push(`/game?difficulty=${difficulty}&rounds=${rounds}`);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-12 px-4">
      {/* Title */}
      <div className="text-center animate-slide-up">
        <h1 className="text-4xl font-bold tracking-tight mb-3">
          DEEPFAKE OR NOT?
        </h1>
        <p className="text-zinc-400 text-sm">
          영상을 보고 진짜인지 딥페이크인지 판별하세요
        </p>
      </div>

      {/* Difficulty */}
      <div className="w-full max-w-md">
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">
          난이도
        </p>
        <div className="grid grid-cols-3 gap-3">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.value}
              onClick={() => setDifficulty(d.value)}
              className={`py-4 rounded-xl border transition-all ${
                difficulty === d.value
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                  : 'border-zinc-800 text-zinc-400 hover:border-zinc-600'
              }`}
            >
              <div className="font-semibold">{d.label}</div>
              <div className="text-xs mt-1 opacity-60">{d.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Rounds */}
      <div className="w-full max-w-md">
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">
          라운드 수
        </p>
        <div className="grid grid-cols-3 gap-3">
          {ROUND_OPTIONS.map((n) => (
            <button
              key={n}
              onClick={() => setRounds(n)}
              className={`py-4 rounded-xl border text-2xl font-bold transition-all ${
                rounds === n
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                  : 'border-zinc-800 text-zinc-400 hover:border-zinc-600'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Start */}
      <button
        onClick={start}
        className="px-14 py-4 bg-emerald-600 hover:bg-emerald-500 active:scale-95
                   text-white font-bold text-lg rounded-full transition-all"
      >
        시작하기
      </button>
    </div>
  );
}
```

- [ ] **Step 2: 개발 서버 실행 및 확인**

```bash
npm run dev
```

브라우저 `http://localhost:3000` 에서:
- 난이도 버튼 3개가 선택 가능하고, 선택 시 초록색 하이라이트가 됨
- 라운드 수 버튼 3개 (5/10/15) 선택 가능
- 시작하기 클릭 시 `/game?difficulty=medium&rounds=10` (선택값) 으로 이동

---

## Task 2: Game Page

**Files:**
- Create: `src/app/game/page.tsx`

**Interfaces:**
- Consumes: URL params `difficulty: Difficulty`, `rounds: number`; `public/data/videos.json`; `@/types/game` 타입들
- Produces: `sessionStorage.setItem('gameSession', JSON.stringify(GameSession))` 후 `/result` 이동

핵심 설계:
- `answeredRef`: double-submit 방지 (버튼 클릭 + 타이머 만료 동시 발생 가드)
- `submitAnswerRef`: 타임아웃 effect에서 stale closure 없이 최신 `submitAnswer` 호출
- `startTimeRef`: 경과 시간을 `timeLeft` 대신 `Date.now()` 기준으로 계산 (timer jitter 회피)
- `useSearchParams()`는 `<Suspense>` 안에서만 사용 가능 → 내부 컴포넌트 분리

- [ ] **Step 1: `src/app/game/page.tsx` 생성**

```tsx
'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Difficulty, Label, VideoClip, RoundResult, GameSession } from '@/types/game';

// ── 유틸 ───────────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 정답인 경우의 획득 점수. streak은 이번 답변 이전의 연속 정답 수. */
function calcPoints(timeUsed: number, streak: number): number {
  let pts = 100;
  if (timeUsed < 5) pts += 50;
  else if (timeUsed < 10) pts += 25;
  pts += 10 * streak;
  return pts;
}

const TIMER_MAX = 15;
const REVEAL_MS = 2500;

// ── 게임 본체 ─────────────────────────────────────────────────────────────────

function GameInner() {
  const router = useRouter();
  const params = useSearchParams();
  const difficulty = (params.get('difficulty') ?? 'medium') as Difficulty;
  const totalRounds = parseInt(params.get('rounds') ?? '10', 10);

  // ── State ──────────────────────────────────────────────────────────────────
  const [clips, setClips] = useState<VideoClip[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [phase, setPhase] = useState<'loading' | 'watching' | 'revealing'>('loading');
  const [timeLeft, setTimeLeft] = useState(TIMER_MAX);
  const [lastResult, setLastResult] = useState<RoundResult | null>(null);
  const [allResults, setAllResults] = useState<RoundResult[]>([]);

  // ── Refs (stale closure 방지) ───────────────────────────────────────────────
  const videoRef    = useRef<HTMLVideoElement>(null);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const revealRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number>(0);
  const answeredRef  = useRef(false);           // double-submit 방지

  // mutable snapshot refs — submitAnswer에서 stale state 방지
  const scoreRef      = useRef(0);
  const streakRef     = useRef(0);
  const maxStreakRef  = useRef(0);
  const allResultsRef = useRef<RoundResult[]>([]);
  const clipsRef      = useRef<VideoClip[]>([]);
  const currentRoundRef = useRef(0);

  useEffect(() => { scoreRef.current      = score;      }, [score]);
  useEffect(() => { streakRef.current     = streak;     }, [streak]);
  useEffect(() => { maxStreakRef.current  = maxStreak;  }, [maxStreak]);
  useEffect(() => { allResultsRef.current = allResults; }, [allResults]);
  useEffect(() => { clipsRef.current      = clips;      }, [clips]);
  useEffect(() => { currentRoundRef.current = currentRound; }, [currentRound]);

  // ── 영상 로드 (마운트 1회) ──────────────────────────────────────────────────
  useEffect(() => {
    fetch('/data/videos.json')
      .then((r) => r.json())
      .then((data: { videos: VideoClip[] }) => {
        const filtered = data.videos.filter((v) => v.difficulty === difficulty);
        const picked = shuffle(filtered).slice(0, Math.min(totalRounds, filtered.length));
        setClips(picked);
        clipsRef.current = picked;
        setPhase('watching');
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 타이머 (watching 페이즈 시작마다) ─────────────────────────────────────
  useEffect(() => {
    if (phase !== 'watching') return;
    answeredRef.current = false;
    startTimeRef.current = Date.now();
    setTimeLeft(TIMER_MAX);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentRound, phase]); // phase 포함: 첫 라운드(round=0, phase: loading→watching) 대응

  // ── 시간 초과 트리거 ────────────────────────────────────────────────────────
  const submitAnswerRef = useRef<((answer: Label | null) => void)>(() => {});

  useEffect(() => {
    if (timeLeft === 0 && phase === 'watching') {
      submitAnswerRef.current(null);
    }
  }, [timeLeft, phase]);

  // ── 영상 재생 ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase === 'watching' && videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
    }
  }, [currentRound, phase]);

  // ── 언마운트 정리 ───────────────────────────────────────────────────────────
  useEffect(
    () => () => {
      if (timerRef.current)  clearInterval(timerRef.current);
      if (revealRef.current) clearTimeout(revealRef.current);
    },
    [],
  );

  // ── 답변 처리 ───────────────────────────────────────────────────────────────
  const submitAnswer = useCallback(
    (answer: Label | null) => {
      if (answeredRef.current) return;
      answeredRef.current = true;
      if (timerRef.current) clearInterval(timerRef.current);

      const clip = clipsRef.current[currentRoundRef.current];
      if (!clip) return;

      const timeUsed = Math.min(
        TIMER_MAX,
        Math.round((Date.now() - startTimeRef.current) / 1000),
      );
      const correct  = answer !== null && answer === clip.label;
      const newStreak  = correct ? streakRef.current + 1 : 0;
      const points     = correct ? calcPoints(timeUsed, streakRef.current) : 0;
      const newScore   = scoreRef.current + points;
      const newMax     = Math.max(maxStreakRef.current, newStreak);

      const result: RoundResult = {
        videoId:    clip.id,
        label:      clip.label,
        userAnswer: answer,
        correct,
        timeUsed,
        points,
      };
      const newAllResults = [...allResultsRef.current, result];

      // 상태 일괄 업데이트
      setScore(newScore);
      setStreak(newStreak);
      setMaxStreak(newMax);
      setLastResult(result);
      setAllResults(newAllResults);
      setPhase('revealing');

      revealRef.current = setTimeout(() => {
        const isLast = currentRoundRef.current + 1 >= clipsRef.current.length;
        if (isLast) {
          const session: GameSession = {
            results:     newAllResults,
            score:       newScore,
            maxStreak:   newMax,
            difficulty,
            totalRounds: clipsRef.current.length,
          };
          sessionStorage.setItem('gameSession', JSON.stringify(session));
          router.push('/result');
        } else {
          setCurrentRound((r) => r + 1);
          setPhase('watching');
        }
      }, REVEAL_MS);
    },
    [difficulty, router],
  );

  // submitAnswerRef 항상 최신값 유지
  useEffect(() => { submitAnswerRef.current = submitAnswer; }, [submitAnswer]);

  // ── 로딩 ────────────────────────────────────────────────────────────────────
  if (phase === 'loading' || clips.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center text-zinc-500">
        로딩 중...
      </div>
    );
  }

  const clip = clips[currentRound];
  const timerPct = (timeLeft / TIMER_MAX) * 100;
  const timerColor =
    timeLeft > 10 ? 'bg-emerald-500' : timeLeft > 5 ? 'bg-yellow-500' : 'bg-rose-500';

  // ── 렌더 ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col">
      {/* 헤더 */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
        <div className="text-sm text-zinc-400">
          라운드{' '}
          <span className="text-white font-bold">{currentRound + 1}</span>
          /{clips.length}
        </div>
        <div className="text-lg font-bold tabular-nums">{score.toLocaleString()}</div>
        <div className="text-sm text-zinc-400">
          연속 <span className="text-emerald-400 font-bold">{streak}</span>
        </div>
      </header>

      {/* 타이머 바 */}
      <div className="h-1 bg-zinc-800">
        <div
          className={`h-full ${timerColor}`}
          style={{
            width: `${timerPct}%`,
            transition: 'width 1s linear, background-color 0.5s',
          }}
        />
      </div>

      {/* 영상 영역 */}
      <div className="relative flex-1 bg-black flex items-center justify-center">
        <video
          key={clip.src}
          ref={videoRef}
          src={clip.src}
          poster={clip.poster}
          autoPlay
          loop
          muted
          playsInline
          className="max-h-[60vh] w-full object-contain"
        />

        {/* 정답 공개 오버레이 */}
        {phase === 'revealing' && lastResult && (
          <div
            className={`absolute inset-0 flex items-center justify-center animate-reveal-in ${
              lastResult.correct ? 'animate-glow-green' : 'animate-glow-red'
            }`}
          >
            <div
              className={`mx-4 px-8 py-6 rounded-2xl bg-black/80 backdrop-blur-sm text-center max-w-sm border ${
                lastResult.correct ? 'border-emerald-500' : 'border-rose-500'
              }`}
            >
              {/* 결과 헤드라인 */}
              <div
                className={`text-2xl font-bold mb-2 ${
                  lastResult.correct ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {lastResult.userAnswer === null
                  ? '시간 초과'
                  : lastResult.correct
                    ? '정답!'
                    : '오답'}
              </div>

              {/* 점수 */}
              {lastResult.points > 0 && (
                <div className="text-emerald-400 font-bold text-lg mb-2">
                  +{lastResult.points}점
                </div>
              )}

              {/* 정답 표시 */}
              <div className="text-sm text-zinc-300 mb-3">
                정답:{' '}
                <span className="font-bold text-white">
                  {clip.label === 'real' ? '진짜 (REAL)' : '가짜 (FAKE)'}
                </span>
                {clip.technique && (
                  <span className="text-zinc-500 ml-1">· {clip.technique}</span>
                )}
              </div>

              {/* 설명 */}
              <p className="text-xs text-zinc-400 leading-relaxed mb-3">
                {clip.explanation}
              </p>

              {/* 단서 태그 */}
              {clip.cues.length > 0 && (
                <div className="flex flex-wrap gap-1 justify-center">
                  {clip.cues.map((cue) => (
                    <span
                      key={cue}
                      className="text-xs bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-300"
                    >
                      {cue}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 버튼 */}
      <div className="grid grid-cols-2 gap-4 p-6">
        <button
          onClick={() => submitAnswer('real')}
          disabled={phase !== 'watching'}
          className="py-5 rounded-xl border-2 border-emerald-600 text-emerald-400
                     font-bold text-xl hover:bg-emerald-600/20 active:scale-95
                     transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          REAL
        </button>
        <button
          onClick={() => submitAnswer('fake')}
          disabled={phase !== 'watching'}
          className="py-5 rounded-xl border-2 border-rose-600 text-rose-400
                     font-bold text-xl hover:bg-rose-600/20 active:scale-95
                     transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          FAKE
        </button>
      </div>
    </div>
  );
}

// ── 페이지 export (Suspense 필수) ─────────────────────────────────────────────

export default function GamePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-zinc-500">
          로딩 중...
        </div>
      }
    >
      <GameInner />
    </Suspense>
  );
}
```

- [ ] **Step 2: 게임 페이지 확인**

`http://localhost:3000/game?difficulty=easy&rounds=5` 직접 접근 또는 랜딩에서 시작 클릭 후:
- 헤더에 라운드 카운터, 점수(0), 연속(0) 표시됨
- 타이머 바가 15초 동안 줄어들며 초록→노랑→빨강으로 변함
- REAL / FAKE 버튼이 활성화됨
- 버튼 클릭 시 오버레이(정답·설명·단서)가 2.5초간 표시됨
- 모든 라운드 완료 후 `/result`로 이동 (아직 result 페이지 없으면 404 정상)

---

## Task 3: Result Page

**Files:**
- Create: `src/app/result/page.tsx`

**Interfaces:**
- Consumes: `sessionStorage.getItem('gameSession')` → `GameSession` JSON; `@/types/game`
- Produces: 없음 (최종 화면). 다시 하기 → `/`

등급 기준 (정답률):
| 정답률 | 등급 | 색상 |
|---|---|---|
| 90%+ | S | yellow-400 |
| 70%+ | A | emerald-400 |
| 50%+ | B | blue-400 |
| 30%+ | C | zinc-400 |
| ~30% | D | rose-400 |

- [ ] **Step 1: `src/app/result/page.tsx` 생성**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { GameSession } from '@/types/game';

// ── 등급 계산 ──────────────────────────────────────────────────────────────────

interface Grade { letter: string; color: string }

function getGrade(accuracy: number): Grade {
  if (accuracy >= 0.9) return { letter: 'S', color: 'text-yellow-400' };
  if (accuracy >= 0.7) return { letter: 'A', color: 'text-emerald-400' };
  if (accuracy >= 0.5) return { letter: 'B', color: 'text-blue-400' };
  if (accuracy >= 0.3) return { letter: 'C', color: 'text-zinc-400' };
  return { letter: 'D', color: 'text-rose-400' };
}

const DIFFICULTY_LABELS: Record<string, string> = {
  easy:   '쉬움',
  medium: '보통',
  hard:   '어려움',
};

// ── 컴포넌트 ───────────────────────────────────────────────────────────────────

export default function ResultPage() {
  const router = useRouter();
  const [session, setSession] = useState<GameSession | null>(null);
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    const raw = sessionStorage.getItem('gameSession');
    if (!raw) {
      router.replace('/');
      return;
    }
    const s: GameSession = JSON.parse(raw);
    setSession(s);

    // 점수 카운트업 애니메이션 (1500ms, 60fps)
    const TARGET = s.score;
    const DURATION = 1500;
    const STEPS = 60;
    const increment = TARGET / STEPS;
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= TARGET) {
        setDisplayScore(TARGET);
        clearInterval(interval);
      } else {
        setDisplayScore(Math.round(current));
      }
    }, DURATION / STEPS);

    return () => clearInterval(interval);
  }, [router]);

  if (!session) return null;

  const correctCount = session.results.filter((r) => r.correct).length;
  const accuracy     = correctCount / session.totalRounds;
  const grade        = getGrade(accuracy);

  return (
    <div className="min-h-screen flex flex-col items-center py-16 px-4 gap-10 max-w-lg mx-auto">
      {/* 등급 */}
      <div className="text-center animate-slide-up">
        <div className={`text-9xl font-black leading-none ${grade.color}`}>
          {grade.letter}
        </div>
        <div className="text-zinc-500 text-sm mt-3">
          {DIFFICULTY_LABELS[session.difficulty] ?? session.difficulty}
          &nbsp;·&nbsp;
          {session.totalRounds}라운드
        </div>
      </div>

      {/* 점수 */}
      <div className="text-center">
        <div className="text-5xl font-bold tabular-nums">
          {displayScore.toLocaleString()}
        </div>
        <div className="text-zinc-500 text-sm mt-1">점</div>
      </div>

      {/* 통계 3개 */}
      <div className="grid grid-cols-3 gap-8 text-center w-full">
        <div>
          <div className="text-2xl font-bold text-emerald-400">
            {correctCount}/{session.totalRounds}
          </div>
          <div className="text-xs text-zinc-500 mt-1">정답</div>
        </div>
        <div>
          <div className="text-2xl font-bold">
            {Math.round(accuracy * 100)}%
          </div>
          <div className="text-xs text-zinc-500 mt-1">정확도</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-yellow-400">
            {session.maxStreak}
          </div>
          <div className="text-xs text-zinc-500 mt-1">최고 연속</div>
        </div>
      </div>

      {/* 라운드별 결과 */}
      <div className="w-full">
        <h2 className="text-xs text-zinc-500 uppercase tracking-widest mb-3">
          라운드별 결과
        </h2>
        <div className="flex flex-col gap-2">
          {session.results.map((r, i) => (
            <div
              key={`${r.videoId}-${i}`}
              className={`flex items-center justify-between px-4 py-3 rounded-xl border animate-slide-up ${
                r.correct
                  ? 'border-emerald-900/60 bg-emerald-950/20'
                  : 'border-rose-900/60 bg-rose-950/20'
              }`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-center gap-3">
                <span className="text-zinc-600 text-xs w-4 text-right">{i + 1}</span>
                <span
                  className={`text-sm font-bold ${
                    r.correct ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {r.correct ? '✓' : '✗'}
                </span>
                <div className="text-sm text-zinc-300">
                  <span className="font-semibold">
                    {r.label === 'real' ? 'REAL' : 'FAKE'}
                  </span>
                  {!r.correct && r.userAnswer !== null && (
                    <span className="text-zinc-600 ml-2 text-xs">
                      (선택: {r.userAnswer === 'real' ? 'REAL' : 'FAKE'})
                    </span>
                  )}
                  {r.userAnswer === null && (
                    <span className="text-zinc-600 ml-2 text-xs">(시간 초과)</span>
                  )}
                </div>
              </div>
              <div className="text-sm font-semibold tabular-nums text-zinc-300">
                {r.points > 0 ? `+${r.points}` : '—'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 액션 */}
      <button
        onClick={() => router.push('/')}
        className="px-10 py-3 rounded-full border border-zinc-700 text-zinc-300
                   hover:border-zinc-400 hover:text-white transition-colors"
      >
        다시 하기
      </button>
    </div>
  );
}
```

- [ ] **Step 2: 전체 플로우 확인**

게임을 처음부터 끝까지 진행하거나, 개발용 테스트:

```js
// 브라우저 콘솔에서 실행 (빠른 확인용)
sessionStorage.setItem('gameSession', JSON.stringify({
  results: [
    { videoId: 'ff_real_001', label: 'real', userAnswer: 'real', correct: true, timeUsed: 4, points: 150 },
    { videoId: 'ff_fake_fs_001', label: 'fake', userAnswer: 'real', correct: false, timeUsed: 8, points: 0 },
    { videoId: 'ff_real_002', label: 'real', userAnswer: 'real', correct: true, timeUsed: 7, points: 125 },
  ],
  score: 275,
  maxStreak: 2,
  difficulty: 'easy',
  totalRounds: 3,
}));
```

그 후 `http://localhost:3000/result` 접근하여:
- 등급 문자와 점수 카운트업 애니메이션이 보임
- 라운드별 결과가 순서대로 표시됨
- "다시 하기" 클릭 시 `/`로 이동

- [ ] **Step 3: sessionStorage 없이 result 직접 접근 시 확인**

브라우저 콘솔에서 `sessionStorage.clear()` 후 `/result` 접근 → `/`로 redirect 됨

- [ ] **Step 4: 커밋**

```bash
git add src/app/page.tsx src/app/game/page.tsx src/app/result/page.tsx docs/
git commit -m "feat: implement game frontend (landing, game, result pages)"
```
