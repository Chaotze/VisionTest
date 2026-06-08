/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import {
  Play, Volume2, VolumeX, Keyboard, Mic, HelpCircle,
  CheckCircle2, XCircle, RotateCcw, AlertTriangle, ArrowRight, Eye, ShieldAlert, Award,
  Camera, CameraOff, Settings2, HandFist, Bolt, ScanEye, Pointer, Check, Undo2, CheckCircle,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';
import { BorderBeam } from 'border-beam';
import {
  TestStage, EyeToTest, FeedbackMode, Direction,
  ACUITY_LEVELS, CalibrationData, TestSession
} from '../types';
import { calculateOptotypeSizePx } from '../lib/visionMath';
import CameraManager from './CameraManager';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';

interface VisionTestProps {
  calibration: CalibrationData;
  onRestart: () => void;
}

export default function VisionTest({ calibration, onRestart }: VisionTestProps) {
  // Configs
  const [eyeTested, setEyeTested] = useState<EyeToTest>(EyeToTest.Left);
  const [feedbackMode, setFeedbackMode] = useState<FeedbackMode>(FeedbackMode.Gesture);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [autoDistanceMode, setAutoDistanceMode] = useState<boolean>(true);
  const [manualDistanceCm, setManualDistanceCm] = useState<number>(100); // 1 meter default if manual
  const [activeTab, setActiveTab] = useState<'settings' | 'hud'>('settings');

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
      } catch (e) { }
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
      setVoiceTranscript(`${originalText}`);

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
        } catch (err) { }
      } else {
        setIsListeningVoice(false);
      }
    };

    speechRecognitionRef.current = rec;
    try {
      rec.start();
    } catch (err) { }
  };

  const handleUserAnswer = (userDir: Direction) => {
    const currentSession = sessionRef.current;
    if (!currentSession || currentSession.completed || isAnsweringRef.current) {
      return;
    }

    if (autoDistanceMode && !isEyeOcclusionCorrect()) {
      playSound('wrong');
      const targetEyeStr = eyeTested === EyeToTest.Right ? '左眼' : '右眼';
      speak(`测试的是${eyeTested === EyeToTest.Right ? '右眼' : '左眼'}，请闭上或遮住${targetEyeStr}后再作答！`);
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
        speak(`正确。进入${ACUITY_LEVELS[nextLevelIndex].fivePoint === 5 ? '五点零' : String(ACUITY_LEVELS[nextLevelIndex].fivePoint)}。`);
      } else {
        isCompleted = true;
        finalScore = ACUITY_LEVELS[currentSession.currentLevelIndex];
        speak(`测试完成。您的视力达到${finalScore.fivePoint === 5 ? '五点零' : String(finalScore.fivePoint)}！`);
        playSound('complete');
      }
    } else if (wrongCount >= 2) {
      isCompleted = true;
      const finalIndex = Math.max(0, currentSession.currentLevelIndex - 1);
      finalScore = ACUITY_LEVELS[finalIndex];
      speak(`测试结束。您的视力测试结果为${finalScore.fivePoint === 5 ? '五点零' : String(finalScore.fivePoint)}。`);
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
    }, 1800);
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
        } catch (e) { }
        speechRecognitionRef.current = null;
      }
      setIsListeningVoice(false);
    }
  }, [feedbackMode, session]);

  // Control Camera based on activeTab
  useEffect(() => {
    if (activeTab === 'hud' && cameraRef.current) {
      cameraRef.current.startCamera();
    } else if (activeTab !== 'hud' && cameraRef.current) {
      cameraRef.current.stopCamera();
    }
  }, [activeTab]);

  // Master Test Start trigger
  const handleStartTest = () => {
    const initialIndex = 3;
    const randomDir = getRandomDirection();

    // Auto-start camera in gesture mode
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

    // Auto switch to HUD tab when test starts
    setActiveTab('hud');

    const label = eyeTested === EyeToTest.Right ? '右眼视力，请挡住左眼' : eyeTested === EyeToTest.Left ? '左眼视力，请挡住右眼' : '双眼视力';
    speak(`视力测试开始。当前测试${label}。请做出手势或使用语音，或键盘方向键作答。`);
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
    // Don't stop camera - keep it running unless permission is denied
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (e) { }
    }
    setSession(null);
    sessionRef.current = null;
    speak('视力测试结束。');
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
        <BorderBeam
          active={session}
          className="border border-slate-100 dark:border-slate-800/85 shadow-xl"
          size={session?.completed ? undefined : "pulse-outside"}
        >
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 flex flex-col items-center justify-between min-h-[460px] relative overflow-hidden">

            {/* <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-500" /> */}

            {/* Background radial glow */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 rounded-full bg-indigo-500/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-violet-500/10 blur-3xl" />

            <div className="w-full flex justify-between items-center text-sm mb-4">
              {session && (
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold rounded-lg tracking-wider text-xs uppercase">
                    当前视力等级
                  </span>
                  <span className="font-mono font-black text-slate-800 dark:text-slate-100 text-lg">
                    {Number(activeAcuity.fivePoint).toFixed(1)}
                  </span>
                  <div className="flex items-center gap-1 bg-slate-100 rounded-lg px-2 py-1">
                    <span className="font-mono text-slate-400 hover:text-slate-500 text-xs">
                      小数: {activeAcuity.decimal}，Snellen: {activeAcuity.snellen}
                    </span>
                  </div>
                </div>
              )}

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
                // Compact Results Display
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center space-y-4 py-2 w-full"
                >
                  {/* Trophy & Score */}
                  <div className="relative inline-block">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 15 }}
                      className="w-20 h-20 mx-auto bg-gradient-to-br from-amber-300 to-orange-600 rounded-full flex items-center justify-center shadow-lg"
                    >
                      <Award className="w-12 h-12 text-white" />
                    </motion.div>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring" }}
                      className="absolute -top-1 -right-1 w-7 h-7 bg-gradient-to-bl from-emerald-300 to-emerald-600 rounded-full flex items-center justify-center shadow-sm"
                    >
                      <CheckCircle className="w-4 h-4 text-white" />
                    </motion.div>
                  </div>

                  {/* Main Score */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <div className="text-6xl font-black bg-gradient-to-br from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent font-mono">
                      {session.finalScore ? Number(session.finalScore.fivePoint).toFixed(1) : '—'}
                    </div>
                  </motion.div>

                  {/* Compact Stats */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="flex items-center justify-center gap-2 text-sm font-mono text-slate-500 dark:text-slate-400"
                  >
                    <span>小数：{session.finalScore?.decimal}</span>
                    <span className="text-slate-300 dark:text-slate-600">|</span>
                    <span>Snellen：{session.finalScore?.snellen}</span>
                    <span className="text-slate-300 dark:text-slate-600">|</span>
                    <span>{session.finalScore?.label}</span>
                  </motion.div>
                </motion.div>
              ) : (
                <div className="text-center space-y-4 max-w-sm">
                  <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/40 rounded-full flex items-center justify-center mx-auto text-indigo-500">
                    <Eye className="w-9 h-9" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">视力测试</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                    请闭上或遮住一只眼睛，辨认屏幕中央出现的<b> E 字符缺口 </b>的方向<br />点击下方按钮开启视力测试
                  </p>
                  <BorderBeam
                    className="shadow-sm hover:shadow-xl hover:-translate-y-[1px] shadow-indigo-500/20 transition-all duration-300"
                    strength={2.0}
                  >
                    <button
                      onClick={handleStartTest}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-br from-violet-500 via-indigo-500 to-cyan-500 text-white font-bold rounded-2xl active:scale-98 transition-all duration-300 cursor-pointer"
                    >
                      <Activity className="w-5 h-5" />
                      开始测试
                    </button>
                  </BorderBeam>
                </div>
              )}
            </div>

            {session && !session.completed ? (
              <div className="w-full h-8 border-t border-slate-50 dark:border-slate-800/60 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                {feedbackMode === FeedbackMode.Gesture && (
                  <div className="flex items-center text-xs text-slate-500 dark:text-slate-500 font-medium">
                    <Pointer className="w-4 h-4 text-slate-500 mr-2" />
                    <span>用<b> 食指 </b>指示方向，手背朝屏可提高识别正确率</span>
                  </div>
                )}

                {feedbackMode === FeedbackMode.Keyboard && (
                  <div className="flex items-center text-xs text-slate-500 dark:text-slate-500 font-medium">
                    <Keyboard className="w-4 h-4 text-slate-500 mr-2" />
                    <span>敲击键盘方向键 <kbd className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded border">↑</kbd> <kbd className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded border">↓</kbd> <kbd className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded border">←</kbd> <kbd className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded border">→</kbd> 或使用</span><span className="font-mono ml-1">WASD</span>
                  </div>
                )}

                {session && (
                  <button
                    onClick={handleStopTest}
                    className="absolute right-6 text-xs text-rose-500 hover:text-rose-600 font-semibold flex items-center gap-1 transition px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-955/20 rounded-full"
                  >
                    结束测试
                  </button>
                )}
              </div>
            ) : session?.completed && (
              // <button
              //   onClick={handleStopTest}
              //   className="px-6 py-2 hover:bg-slate-100/50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-full text-sm font-semibold active:scale-95 transition"
              // >
              //   返回
              // </button>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex items-center justify-center gap-3 pt-2"
              >
                <button
                  onClick={handleStartTest}
                  className="flex items-center gap-2 px-5 py-2 bg-gradient-to-br from-violet-500 via-indigo-500 to-cyan-500 hover:from-violet-600 hover:via-indigo-600 hover:to-cyan-600 text-white text-sm font-semibold rounded-full shadow-lg shadow-indigo-500/25 active:scale-95 transition-all duration-200"
                >
                  重新测试
                </button>
                {/* <button
                onClick={handleStopTest}
                className="flex items-center gap-2 px-5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-xl active:scale-95 transition-all duration-200"
              >
                <Undo2 className="w-4 h-4" />
                返回
              </button> */}
              </motion.div>
            )}
          </div>
        </BorderBeam>
      </div>

      {/* RIGHT COLUMN: Camera controls, Occlusion statuses & Calibration presets */}
      <div className="w-full lg:w-[480px] flex flex-col gap-6 shrink-0">

        {/* Unified Settings & HUD Panel with Tabs */}
        <BorderBeam
          className="border border-slate-100 dark:border-slate-800/85 shadow-xl"
          size={!session || session.completed ? undefined : 'pulse-outside'}
          strength={session && !session.completed ? undefined : 0.5}
        >
          <div className="bg-white dark:bg-slate-900 rounded-3xl px-5 py-6">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'settings' | 'hud')}>
              <TabsList className="w-full mb-4">
                <TabsTrigger value="hud" className="flex items-center gap-2">
                  <ScanEye className="w-4 h-4" />
                  视觉跟踪
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4" />
                  检测设置
                </TabsTrigger>
              </TabsList>

              {/* CameraManager - always mounted inside Tabs to avoid model reload */}
              <div className={`${activeTab === 'hud' ? 'block' : 'hidden'}`}>
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
              </div>

              <TabsContent value="settings" className="space-y-5 -mt-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-slate-600 dark:text-slate-500 tracking-wider block">测试眼 (Eye to Test)</label>
                  <Tabs value={eyeTested} onValueChange={(value) => setEyeTested(value as EyeToTest)}>
                    <TabsList className="w-full">
                      <TabsTrigger value={EyeToTest.Left} disabled={session !== null && !session.completed} className="flex items-center gap-2 py-2">
                        <span className="font-semibold">L</span>
                        <span>左眼</span>
                      </TabsTrigger>
                      <TabsTrigger value={EyeToTest.Right} disabled={session !== null && !session.completed} className="flex items-center gap-2 py-2">
                        <span className="font-semibold">R</span>
                        <span>右眼</span>
                      </TabsTrigger>
                      <TabsTrigger value={EyeToTest.Both} disabled={session !== null && !session.completed} className="flex items-center gap-2 py-2">
                        <span className="font-semibold">D</span>
                        <span>双眼</span>
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-slate-600 dark:text-slate-500 tracking-wider block">反馈识别模式 (Response Feedback)</label>
                  <Tabs value={feedbackMode} onValueChange={(value) => setFeedbackMode(value as FeedbackMode)} disabled={session !== null && !session.completed}>
                    <TabsList className="w-full">
                      <TabsTrigger value={FeedbackMode.Gesture} disabled={session !== null && !session.completed} className="flex items-center gap-1 py-2.5">
                        <HandFist className="w-4 h-4" />
                        <span className="whitespace-nowrap">手势</span>
                      </TabsTrigger>
                      <TabsTrigger value={FeedbackMode.Voice} disabled={session !== null && !session.completed} className="flex items-center gap-1 py-2.5">
                        <Mic className="w-4 h-4" />
                        <span className="whitespace-nowrap">语音</span>
                      </TabsTrigger>
                      <TabsTrigger value={FeedbackMode.Keyboard} disabled={session !== null && !session.completed} className="flex items-center gap-1 py-2.5">
                        <Keyboard className="w-4 h-4" />
                        <span className="whitespace-nowrap">键盘</span>
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-slate-600 dark:text-slate-500 tracking-wider block">距离检测方式 (Distance Detection)</label>
                  <Tabs value={autoDistanceMode ? 'auto' : 'manual'} onValueChange={(value) => setAutoDistanceMode(value === 'auto')} disabled={session !== null && !session.completed}>
                    <TabsList className="w-full">
                      <TabsTrigger value="auto" disabled={session !== null && !session.completed} className="flex items-center gap-2 py-2">
                        <span className="font-semibold">AI</span>
                        <span>自动测距</span>
                      </TabsTrigger>
                      <TabsTrigger value="manual" disabled={session !== null && !session.completed} className="flex items-center gap-2 py-2">
                        <Bolt className="w-4 h-4" />
                        <span>固定距离</span>
                      </TabsTrigger>
                    </TabsList>
                    {/* <TabsContent value="auto" className="mt-2">
                    <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-900/60 flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
                      <span>当前 AI 抓拍人瞳测距:</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-black text-sm">{distanceCm} cm</span>
                    </div>
                  </TabsContent> */}
                    <TabsContent value="manual" className="mt-2">
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
                        <div className="flex justify-between text-[13px] font-mono text-slate-400">
                          <span>50 cm</span>
                          <span className="text-slate-600 font-bold"> {manualDistanceCm} cm</span>
                          <span>250 cm</span>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </TabsContent>

              <TabsContent value="hud" className="space-y-4 mt-1.5">
                <div className="flex justify-between items-center mb-3.5">
                  {/* <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-indigo-500" />
                  AI 视觉跟踪显示 HUD
                </h4> */}
                  <h4 className="text-sm font-bold text-slate-600 dark:text-slate-500 tracking-wider block">
                    当前距离屏幕 {distanceCm} cm
                  </h4>
                  {autoDistanceMode && (
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100/30 rounded-full font-mono">
                      FaceMesh Live
                    </span>
                  )}
                </div>

                {feedbackMode === FeedbackMode.Voice && (
                  <BorderBeam active={isListeningVoice} className="mb-2">
                    <div className={`p-3 rounded-2xl text-center border transition-all ${isListeningVoice ? 'bg-indigo-50/50 text-indigo-600 border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/35' : 'bg-slate-50/40 border-slate-100 dark:bg-slate-950/30 dark:border-slate-800'}`}>
                      <div className="flex items-center justify-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${isListeningVoice ? 'bg-rose-500 animate-ping' : 'hidden'}`} />
                        <span className="text-xs text-slate-400 uppercase tracking-wider">语音交互</span>
                      </div>
                      <p className={`text-xs font-black leading-relaxed break-words ${isListeningVoice ? 'text-indigo-600' : 'text-slate-600 dark:text-slate-300'}`}>{voiceTranscript || "准备倾听指令 ..."}</p>
                    </div>
                  </BorderBeam>
                )}

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className={`p-3 rounded-2xl text-center border ${eyeOcclusion.left ? 'bg-emerald-50/30 border-emerald-100/40 dark:bg-emerald-950/10' : 'bg-slate-50/40 border-slate-100 dark:bg-slate-950/30'} dark:border-slate-800`}>
                    <div className="text-xs text-slate-400 mb-1 tracking-wider">左眼状态</div>
                    <div className={`text-xs font-black ${eyeOcclusion.left ? 'text-emerald-500' : 'text-slate-600 dark:text-slate-300'}`}>
                      {eyeOcclusion.left ? '● 已闭合 / 遮挡' : '○ 正常睁开'}
                    </div>
                  </div>

                  <div className={`p-3 rounded-2xl text-center border ${eyeOcclusion.right ? 'bg-emerald-50/30 border-emerald-100/40 dark:bg-emerald-950/10' : 'bg-slate-50/40 border-slate-100 dark:bg-slate-950/30'} dark:border-slate-800`}>
                    <div className="text-xs text-slate-400 mb-1 tracking-wider">右眼状态</div>
                    <div className={`text-xs font-black ${eyeOcclusion.right ? 'text-emerald-500' : 'text-slate-600 dark:text-slate-300'}`}>
                      {eyeOcclusion.right ? '● 已闭合 / 遮挡' : '○ 正常睁开'}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </BorderBeam>

      </div>

    </div>
  );
}
