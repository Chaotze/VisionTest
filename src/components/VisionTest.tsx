/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  Play, Volume2, VolumeX, Keyboard, Mic, HelpCircle, 
  CheckCircle2, XCircle, RotateCcw, AlertTriangle, ArrowRight, Eye, ShieldAlert, Award,
  Camera, CameraOff
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  TestStage, EyeToTest, FeedbackMode, Direction, 
  ACUITY_LEVELS, CalibrationData, TestSession 
} from '../types';
import { calculateOptotypeSizePx } from '../lib/visionMath';
import CameraManager from './CameraManager';

interface VisionTestProps {
  calibration: CalibrationData;
  onRestart: () => void;
}

export default function VisionTest({ calibration, onRestart }: VisionTestProps) {
  // Configs
  const [eyeTested, setEyeTested] = useState<EyeToTest>(EyeToTest.Right);
  const [feedbackMode, setFeedbackMode] = useState<FeedbackMode>(FeedbackMode.Gesture);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [autoDistanceMode, setAutoDistanceMode] = useState<boolean>(true);
  const [manualDistanceCm, setManualDistanceCm] = useState<number>(100); // 1 meter default if manual

  // Tracker states
  const [distanceCm, setDistanceCm] = useState<number>(100);
  const [eyeOcclusion, setEyeOcclusion] = useState<{ left: boolean; right: boolean }>({ left: false, right: false });
  const [session, setSession] = useState<TestSession | null>(null);
  
  // Active test visual states
  const [currentEDirection, setCurrentEDirection] = useState<Direction>(Direction.Right);
  const [isAnswering, setIsAnswering] = useState<boolean>(false);
  const [answerResult, setAnswerResult] = useState<'correct' | 'wrong' | null>(null);
  
  // Voice state
  const [isListeningVoice, setIsListeningVoice] = useState<boolean>(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string>('');
  
  // Audio Context for sound synthesis
  const audioCtxRef = useRef<AudioContext | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  
  // Refs for consistent state access in async callbacks (Resolves Stale Closures)
  const sessionRef = useRef<TestSession | null>(null);
  const directionRef = useRef<Direction>(Direction.Right);
  const isAnsweringRef = useRef<boolean>(false);
  const eyeOcclusionRef = useRef<{ left: boolean; right: boolean }>({ left: false, right: false });
  const eyeTestedRef = useRef<EyeToTest>(EyeToTest.Right);

  // Synchronize actual distance
  useEffect(() => {
    if (!autoDistanceMode) {
      setDistanceCm(manualDistanceCm);
    }
  }, [autoDistanceMode, manualDistanceCm]);

  // Keep Refs in sync with current states for async handlers
  useEffect(() => {
    sessionRef.current = session;
    isAnsweringRef.current = isAnswering;
  }, [session, isAnswering]);

  useEffect(() => {
    eyeOcclusionRef.current = eyeOcclusion;
    eyeTestedRef.current = eyeTested;
  }, [eyeOcclusion, eyeTested]);

  // Handle Speech Guidance Speak helper
  const speak = (text: string) => {
    if (isMuted) return;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Sound effect generator using Web Audio API
  const playSound = (type: 'correct' | 'wrong' | 'complete') => {
    if (isMuted) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      if (type === 'correct') {
        // Double electronic bell chime
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else if (type === 'wrong') {
        // low dull synth buzz
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(130.81, ctx.currentTime); // C3
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.455);
      } else if (type === 'complete') {
        // Ascending major chord
        const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
          gain.gain.setValueAtTime(0.1, ctx.currentTime + idx * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.12 + 0.4);
          osc.start(ctx.currentTime + idx * 0.12);
          osc.stop(ctx.currentTime + idx * 0.12 + 0.5);
        });
      }
    } catch (e) {
      console.warn('Audio Context sound play failed:', e);
    }
  };

  // Set up and restart Web Speech Recognition
  const initSpeechRecognition = () => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      toast.error('当前浏览器不支持语音识别功能，请选择手势或键盘反馈！');
      return;
    }

    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (e) {}
    }

    const rec = new SpeechRecognitionAPI();
    rec.continuous = true;
    rec.lang = 'zh-CN';
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      setIsListeningVoice(true);
      setVoiceTranscript('正在倾听您的指令（上/下/左/右）...');
    };

    rec.onresult = (event: any) => {
      const lastIndex = event.results.length - 1;
      const originalText = event.results[lastIndex][0].transcript.trim().toLowerCase();
      setVoiceTranscript(`听到语音："${originalText}"`);
      
      let identifiedDir: Direction | null = null;
      if (originalText.includes('上') || originalText.includes('向') && originalText.includes('上') || originalText.includes('shang') || originalText === 'up') {
        identifiedDir = Direction.Up;
      } else if (originalText.includes('下') || originalText.includes('向') && originalText.includes('下') || originalText.includes('xia') || originalText === 'down') {
        identifiedDir = Direction.Down;
      } else if (originalText.includes('左') || originalText.includes('向') && originalText.includes('左') || originalText.includes('zuo') || originalText === 'left') {
        identifiedDir = Direction.Left;
      } else if (originalText.includes('右') || originalText.includes('向') && originalText.includes('右') || originalText.includes('you') || originalText === 'right') {
        identifiedDir = Direction.Right;
      }

      // Consistent check using Refs
      const currentSession = sessionRef.current;
      if (identifiedDir && currentSession && !currentSession.completed && !isAnsweringRef.current) {
        handleUserAnswer(identifiedDir);
      }
    };

    rec.onerror = (e: any) => {
      console.warn('Speech Recognition error:', e.error);
    };

    rec.onend = () => {
      // Auto restart if FeedbackMode is Voice and session is running
      const currentSession = sessionRef.current;
      if (feedbackMode === FeedbackMode.Voice && currentSession && !currentSession.completed) {
        try {
          rec.start();
        } catch (err) {}
      } else {
        setIsListeningVoice(false);
      }
    };

    speechRecognitionRef.current = rec;
    try {
      rec.start();
    } catch (err) {}
  };

  const handleUserAnswer = (userDir: Direction) => {
    const currentSession = sessionRef.current;
    if (!currentSession || currentSession.completed || isAnsweringRef.current) {
      return;
    }

    if (autoDistanceMode && !isEyeOcclusionCorrect()) {
      playSound('wrong');
      const targetEyeStr = eyeTested === EyeToTest.Right ? '左眼' : '右眼';
      speak(`校准警报。测试的是${eyeTested === EyeToTest.Right ? '右眼' : '左眼'}，请您牢牢挡住${targetEyeStr}后再作答！`);
      toast.warning(`遮挡纠正警告`, { description: `请闭上或遮挡住 ${targetEyeStr} 后继续测试` });
      return;
    }

    setIsAnswering(true);
    isAnsweringRef.current = true; // Lock immediately

    const correctDir = directionRef.current; // Get the absolute latest direction
    const isCorrect = userDir === correctDir;
    
    setAnswerResult(isCorrect ? 'correct' : 'wrong');
    playSound(isCorrect ? 'correct' : 'wrong');

    const currentAcuity = ACUITY_LEVELS[currentSession.currentLevelIndex];
    const newHistoryItem = {
      levelIndex: currentSession.currentLevelIndex,
      direction: correctDir,
      userResponse: userDir,
      isCorrect,
      distanceCm: Math.round(distanceCm),
      timestamp: Date.now()
    };

    const updatedHistory = [...currentSession.history, newHistoryItem];
    const currentLevelHistory = updatedHistory.filter(h => h.levelIndex === currentSession.currentLevelIndex);
    const correctCount = currentLevelHistory.filter(h => h.isCorrect).length;
    const wrongCount = currentLevelHistory.filter(h => !h.isCorrect).length;

    let nextLevelIndex = currentSession.currentLevelIndex;
    let isCompleted = false;
    let finalScore = currentSession.finalScore;

    if (correctCount >= 2) {
      if (currentSession.currentLevelIndex < ACUITY_LEVELS.length - 1) {
        nextLevelIndex = currentSession.currentLevelIndex + 1;
        speak(`正确。升级进入 ${ACUITY_LEVELS[nextLevelIndex].fivePoint} 级别。`);
      } else {
        isCompleted = true;
        finalScore = ACUITY_LEVELS[currentSession.currentLevelIndex];
        speak(`测试完成。您的视力达到上限 ${finalScore.fivePoint}！`);
        playSound('complete');
      }
    } else if (wrongCount >= 2) {
      isCompleted = true;
      const finalIndex = Math.max(0, currentSession.currentLevelIndex - 1);
      finalScore = ACUITY_LEVELS[finalIndex];
      speak(`测试结束。您的测试视力得分为 ${finalScore.fivePoint}。`);
      playSound('complete');
    } else {
      speak(isCorrect ? "正确" : "错误");
    }

    setTimeout(() => {
      if (isCompleted) {
        const finalSession = {
          ...currentSession,
          history: updatedHistory,
          completed: true,
          finalScore
        };
        setSession(finalSession);
        sessionRef.current = finalSession;
      } else {
        const nextEDir = getRandomDirection();
        setCurrentEDirection(nextEDir);
        directionRef.current = nextEDir; // Sync direction for next question
        
        const nextSession = {
          ...currentSession,
          history: updatedHistory,
          currentLevelIndex: nextLevelIndex,
          completed: false
        };
        setSession(nextSession);
        sessionRef.current = nextSession;
      }
      setIsAnswering(false);
      isAnsweringRef.current = false;
      setAnswerResult(null);
    }, 2000);
  };

  // Handler Ref to allow Keyboard useEffect to be defined once without stale closures
  const answerHandlerRef = useRef(handleUserAnswer);
  useEffect(() => {
    answerHandlerRef.current = handleUserAnswer;
  }, [handleUserAnswer]);

  // Keyboard handler for Fallback manual control
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      let direction: Direction | null = null;
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          direction = Direction.Up;
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          direction = Direction.Down;
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          direction = Direction.Left;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          direction = Direction.Right;
          break;
      }

      if (direction) {
        e.preventDefault();
        answerHandlerRef.current(direction);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []); // Only register once

  // Control Voice Recognition state based on Feedbacks Mode
  useEffect(() => {
    if (feedbackMode === FeedbackMode.Voice && session && !session.completed) {
      initSpeechRecognition();
    } else {
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch (e) {}
        speechRecognitionRef.current = null;
      }
      setIsListeningVoice(false);
    }
  }, [feedbackMode, session]);

  // Master Test Start trigger
  const handleStartTest = () => {
    const initialIndex = 3; 
    const randomDir = getRandomDirection();
    
    if (autoDistanceMode && cameraRef.current) {
      cameraRef.current.startCamera();
    }

    const newSession = {
      eye: eyeTested,
      history: [],
      currentLevelIndex: initialIndex,
      consecutiveCorrect: 0,
      consecutiveWrong: 0,
      completed: false,
      finalScore: null
    };

    setSession(newSession);
    sessionRef.current = newSession; 
    
    setCurrentEDirection(randomDir);
    directionRef.current = randomDir; // Sync Ref immediately

    setIsAnswering(false);
    isAnsweringRef.current = false;
    setAnswerResult(null);

    const label = eyeTested === EyeToTest.Right ? '右眼视力，请挡住左眼' : eyeTested === EyeToTest.Left ? '左眼视力，请挡住右眼' : '双眼视力';
    speak(`视力测试开始。当前检测为：${label}。请做出手势，或使用语音、键盘箭头控制。请看屏幕中央的字符，辨别其空缺的方向。`);
  };

  const getRandomDirection = (): Direction => {
    const dirs = [Direction.Up, Direction.Down, Direction.Left, Direction.Right];
    return dirs[Math.floor(Math.random() * dirs.length)];
  };

  // Eye Occlusion validation check
  const isEyeOcclusionCorrect = (): boolean => {
    const currentEyeTested = eyeTestedRef.current;
    const currentEyeOcclusion = eyeOcclusionRef.current;
    
    if (currentEyeTested === EyeToTest.Right) {
      return currentEyeOcclusion.left;
    } else if (currentEyeTested === EyeToTest.Left) {
      return currentEyeOcclusion.right;
    }
    return true; 
  };

  const handleStopTest = () => {
    if (cameraRef.current) {
      cameraRef.current.stopCamera();
    }
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (e) {}
    }
    setSession(null);
    sessionRef.current = null;
  };

  const activeAcuity = session ? ACUITY_LEVELS[session.currentLevelIndex] : ACUITY_LEVELS[3];
  const calculatedSizePx = calculateOptotypeSizePx(
    distanceCm,
    activeAcuity.decimal,
    calibration.ppi
  );

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col lg:flex-row gap-6 p-2">
      
      {/* LEFT COLUMN: Test Console & Visualized E Card */}
      <div className="flex-1 flex flex-col gap-6">
        
        {/* Visualized Optotype Display Panel */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/85 p-6 shadow-xl flex flex-col items-center justify-between min-h-[460px] relative overflow-hidden">
          
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-500" />
          
          <div className="w-full flex justify-between items-center text-sm mb-4">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold rounded-lg tracking-wider text-xs uppercase">
                检测级别 LEVEL
              </span>
              <span className="font-mono font-black text-slate-800 dark:text-slate-100 text-lg">
                {activeAcuity.fivePoint}
              </span>
              <span className="text-slate-400 dark:text-slate-500 text-xs">
                (小数: {activeAcuity.decimal} / Snellen: {activeAcuity.snellen})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const val = !isMuted;
                  setIsMuted(val);
                  if (!val) {
                    speak("语音功能已开启");
                  }
                }}
                className={`p-2 rounded-xl transition ${isMuted ? 'text-slate-400 hover:text-slate-500 bg-slate-100 dark:bg-slate-800' : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-400'}`}
                title={isMuted ? "静音中" : "声音已开启"}
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center p-6 min-h-[220px]">
            {session && !session.completed ? (
              <div className="relative flex items-center justify-center">
                {/* Visual Feedback on Answer */}
                {answerResult && (
                  <div className={`absolute inset-0 -m-8 rounded-full filter blur-xl opacity-20 animate-ping ${answerResult === 'correct' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                )}

                {/* Show animated check/X icon when answering, otherwise show E */}
                {answerResult ? (
                  <div className="flex items-center justify-center">
                    {answerResult === 'correct' ? (
                      <svg
                        width={60}
                        height={60}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-emerald-500"
                      >
                        <motion.path
                          d="M4 12 9 17L20 6"
                          initial={{ pathLength: 0, opacity: 0 }}
                          animate={{ pathLength: 1, opacity: 1 }}
                          transition={{ duration: 0.4, ease: "easeInOut" }}
                        />
                      </svg>
                    ) : (
                      <svg
                        width={60}
                        height={60}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-rose-500"
                      >
                        <motion.path
                          d="M18 6 6 18"
                          initial={{ pathLength: 0, opacity: 0 }}
                          animate={{ pathLength: 1, opacity: 1 }}
                          transition={{ duration: 0.4, ease: "easeInOut" }}
                        />
                        <motion.path
                          d="m6 6 12 12"
                          initial={{ pathLength: 0, opacity: 0 }}
                          animate={{ pathLength: 1, opacity: 1 }}
                          transition={{ duration: 0.4, delay: 0.2, ease: "easeInOut" }}
                        />
                      </svg>
                    )}
                  </div>
                ) : (
                  /* Mathematically precise medical standard Tumbling E SVG */
                  <div 
                    id="tumbling-e-container"
                    style={{
                      width: `${calculatedSizePx}px`,
                      height: `${calculatedSizePx}px`,
                      transform: `rotate(${currentEDirection === Direction.Up ? 270 : currentEDirection === Direction.Down ? 90 : currentEDirection === Direction.Left ? 180 : 0}deg)`,
                    }}
                    className="transition-transform duration-150 ease-out select-none flex items-center justify-center"
                  >
                    <svg 
                      viewBox="0 0 5 5" 
                      className="w-full h-full text-slate-900 dark:text-slate-100 fill-current"
                    >
                      <path d="M 0 0 L 5 0 L 5 1 L 1 1 L 1 2 L 5 2 L 5 3 L 1 3 L 1 4 L 5 4 L 5 5 L 0 5 Z" />
                    </svg>
                  </div>
                )}
              </div>
            ) : session?.completed ? (
              // Results Display
              <div className="text-center space-y-4 py-4 animate-fade-in max-w-sm">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/50 rounded-full flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400 animate-bounce">
                  <Award className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">测试完成！</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">诊断评定视力得分如下</p>
                </div>

                <div className="py-5 bg-emerald-50/50 dark:bg-slate-950/40 rounded-2xl border border-emerald-100/40 dark:border-slate-800/80">
                  <div className="text-5xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                    {session.finalScore?.fivePoint}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1">
                    (小数: {session.finalScore?.decimal} / Snellen: {session.finalScore?.snellen})
                  </div>
                  <div className="mt-3 inline-block px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full text-xs font-semibold text-slate-600 dark:text-slate-300">
                    评语: {session.finalScore?.label}
                  </div>
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    onClick={handleStartTest}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-md active:scale-95 transition"
                  >
                    重新测试
                  </button>
                  <button
                    onClick={onRestart}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-705 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-semibold active:scale-95 transition"
                  >
                    返回主页
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4 max-w-sm">
                <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/40 rounded-full flex items-center justify-center mx-auto text-indigo-500">
                  <Eye className="w-9 h-9" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">准备测定您的视力</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                  请闭上/遮住一只眼睛，然后坐在合适位置，辨认屏幕中央出现的<b>“E”字符的缺口方向</b>。点击下方开启智能检测。
                </p>
                <button
                  onClick={handleStartTest}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 hover:shadow-indigo-500/10 hover:shadow-lg text-white font-bold rounded-2xl active:scale-95 transition-all cursor-pointer"
                >
                  <Play className="w-5 h-5 fill-current" />
                  开始智慧测定 (Start)
                </button>
              </div>
            )}
          </div>

          {session && !session.completed && (
            <div className="w-full border-t border-slate-50 dark:border-slate-800/60 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 font-medium">
                <Keyboard className="w-4 h-4 text-slate-400" />
                <span>物理反馈支持：敲击键盘方向键 <kbd className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded border">↑</kbd> <kbd className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded border">↓</kbd> <kbd className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded border">←</kbd> <kbd className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded border">→</kbd> 或 WASD键</span>
              </div>

              {session && (
                <button
                  onClick={handleStopTest}
                  className="text-xs text-rose-500 hover:text-rose-600 font-semibold flex items-center gap-1 transition px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-955/20 rounded-lg"
                >
                  放弃测试
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Camera controls, Occlusion statuses & Calibration presets */}
      <div className="w-full lg:w-[380px] flex flex-col gap-6 shrink-0">
        
        {/* Settings Module Accordion Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/85 p-6 shadow-xl space-y-5">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight">智能检测设置 Panel</h3>
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">1. 选择测试眼 (Eye to test)</label>
            <div className="grid grid-cols-3 gap-1 bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-100 dark:border-slate-900/60">
              {[
                { eye: EyeToTest.Right, text: '测右眼', sub: '遮左眼' },
                { eye: EyeToTest.Left, text: '测左眼', sub: '遮右眼' },
                { eye: EyeToTest.Both, text: '测双眼', sub: '全部睁开' }
              ].map(({ eye, text, sub }) => (
                <button
                  key={eye}
                  disabled={session !== null && !session.completed}
                  onClick={() => setEyeTested(eye)}
                  className={`py-2 px-1 rounded-lg text-center transition cursor-pointer ${eyeTested === eye ? 'bg-indigo-600 shadow text-white font-semibold' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 hover:text-slate-700 bg-transparent text-xs'} ${session && !session.completed ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="text-xs font-semibold">{text}</div>
                  <div className={`text-[9px] ${eyeTested === eye ? 'text-white/80' : 'text-slate-400'}`}>{sub}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">2. 反馈识别模式 (Response Feedback)</label>
            <div className="grid grid-cols-3 gap-1 bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-100 dark:border-slate-900/60">
              {[
                { mode: FeedbackMode.Gesture, text: 'AI 指尖手势', icon: Play },
                { mode: FeedbackMode.Voice, text: '语音反馈', icon: Mic },
                { mode: FeedbackMode.Keyboard, text: '键盘按键', icon: Keyboard }
              ].map(({ mode, text, icon: Icon }) => (
                <button
                  key={mode}
                  onClick={() => setFeedbackMode(mode)}
                  className={`py-2.5 px-0.5 rounded-lg text-center transition flex flex-col items-center justify-center gap-1 cursor-pointer ${feedbackMode === mode ? 'bg-indigo-600 shadow text-white font-semibold border-indigo-600' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 hover:text-slate-700 bg-transparent'}`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-[10px] whitespace-nowrap">{text}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">3. 距离控制算法 (Distance)</label>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[10px] shadow-inner font-semibold border border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setAutoDistanceMode(true)}
                  className={`px-1.5 py-0.5 rounded transition ${autoDistanceMode ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  AI 自动测距
                </button>
                <button
                  onClick={() => setAutoDistanceMode(false)}
                  className={`px-1.5 py-0.5 rounded transition ${!autoDistanceMode ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  固定距离
                </button>
              </div>
            </div>

            {autoDistanceMode ? (
              <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-900/60 flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
                <span>当前 AI 抓拍人瞳测距:</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-black text-sm">{distanceCm} cm</span>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  id="manual-distance-range"
                  type="range"
                  min="50"
                  max="250"
                  value={manualDistanceCm}
                  onChange={(e) => setManualDistanceCm(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-ew-resize accent-indigo-600"
                />
                <div className="flex justify-between text-[11px] font-mono text-slate-400">
                  <span>50 cm</span>
                  <span className="text-indigo-500 font-bold">设定距离: {manualDistanceCm} cm</span>
                  <span>250 cm</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Real-time Camera Feed tracker view */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/85 p-5 shadow-xl space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Camera className="w-4 h-4 text-indigo-500" />
              AI 视觉跟踪显示 HUD
            </h4>
            {autoDistanceMode && (
              <span className="text-[10px] px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100/30 rounded-full font-mono">
                FaceMesh Live
              </span>
            )}
          </div>
          
          <CameraManager
            ref={cameraRef}
            onDistanceUpdate={(cm) => {
              if (autoDistanceMode) {
                setDistanceCm(Math.round(cm));
              }
            }}
            onEyeOcclusionUpdate={(occl) => setEyeOcclusion(occl)}
            onGestureDetected={(dir) => {
              // Get latest state from Ref to ensure we're not answering twice or in a completed session
              const s = sessionRef.current;
              if (s && !s.completed && !isAnsweringRef.current) {
                handleUserAnswer(dir);
              }
            }}
            eyeTested={eyeTested}
            feedbackMode={feedbackMode}
          />

          {feedbackMode === FeedbackMode.Voice && (
            <div className={`p-3 rounded-2xl text-xs font-medium border transition-all ${isListeningVoice ? 'bg-indigo-50/50 text-indigo-600 border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/35' : 'bg-slate-50 text-slate-500 border-slate-100 dark:bg-slate-950 dark:text-slate-400 dark:border-slate-900'}`}>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isListeningVoice ? 'bg-rose-500 animate-ping' : 'bg-slate-300'}`} />
                <span className="font-semibold text-[11px] uppercase tracking-wider">语音助手状态 Voice Assist</span>
              </div>
              <p className="mt-1 font-mono leading-relaxed text-[11px] break-words">{voiceTranscript || "准备倾听指令..."}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className={`p-3 rounded-2xl text-center border ${eyeOcclusion.left ? 'bg-emerald-50/30 border-emerald-100/40 dark:bg-emerald-950/10' : 'bg-slate-50/40 border-slate-100 dark:bg-slate-950/30'} dark:border-slate-800`}>
              <div className="text-[10px] text-slate-400 font-mono mb-1">左眼状态 (Left Eye)</div>
              <div className={`text-xs font-black ${eyeOcclusion.left ? 'text-emerald-500' : 'text-slate-600 dark:text-slate-300'}`}>
                {eyeOcclusion.left ? '● 已闭合/遮挡' : '○ 正常睁开'}
              </div>
            </div>

            <div className={`p-3 rounded-2xl text-center border ${eyeOcclusion.right ? 'bg-emerald-50/30 border-emerald-100/40 dark:bg-emerald-950/10' : 'bg-slate-50/40 border-slate-100 dark:bg-slate-950/30'} dark:border-slate-800`}>
              <div className="text-[10px] text-slate-400 font-mono mb-1">右眼状态 (Right Eye)</div>
              <div className={`text-xs font-black ${eyeOcclusion.right ? 'text-emerald-500' : 'text-slate-600 dark:text-slate-300'}`}>
                {eyeOcclusion.right ? '● 已闭合/遮挡' : '○ 正常睁开'}
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
