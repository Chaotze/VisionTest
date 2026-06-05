/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import {
  Eye, Sliders, Play, CheckCircle2, ShieldCheck, Sparkles,
  HelpCircle, Monitor, BookOpen, Scaling, Cpu, MonitorDot
} from 'lucide-react';
import { TestStage, CalibrationData } from './types';
import CreditCardCalibrator from './components/CreditCardCalibrator';
import VisionTest from './components/VisionTest';
import WelcomePage from './components/WelcomePage';

export default function App() {
  const [stage, setStage] = useState<TestStage>(TestStage.Testing);
  const [calibration, setCalibration] = useState<CalibrationData>({
    ppi: 96,
    pixelToMm: 0.264,
    cameraFocalLength: 1.0,
    isCalibrated: false
  });

  // Check localStorage for first run and calibration data
  useEffect(() => {
    const savedCalibration = localStorage.getItem('visionCalibration');
    
    if (savedCalibration) {
      setCalibration(JSON.parse(savedCalibration));
    } else {
      setStage(TestStage.Calibrating);
    }
  }, []);

  // Save calibration data to localStorage
  const handleCalibrationComplete = (data: CalibrationData) => {
    setCalibration(data);
    localStorage.setItem('visionCalibration', JSON.stringify(data));
    setStage(TestStage.Testing);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">

      {/* HEADER BAR */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/80 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Eye className="w-5.5 h-5.5 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-md sm:text-lg font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-1.5 leading-none">
                AI 智慧测视力 <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200/30">V2.0</span>
              </h1>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium tracking-tight">基于 MediaPipe 计算机视觉与 WebSpeech语音技术</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-200/40 dark:border-slate-800/80 text-[11px] font-mono font-semibold text-slate-500">
              <Cpu className="w-3.5 h-3.5 text-indigo-500" />
              <span>GPU 加速</span>
            </div>

            <button
              onClick={() => setStage(TestStage.Calibrating)}
              className="flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg border border-indigo-200/50 dark:border-indigo-800/50 transition text-xs font-semibold"
              title="校准屏幕 PPI"
            >
              <MonitorDot className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">PPI 校准</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 select-none uppercase tracking-wide">本地离线引擎</span>
            </div>
          </div>
        </div>
      </header>

      {/* CORE WORKSPACE CONTENT */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col items-center justify-center">

        {/* WELCOMING PAGE */}
        {stage === TestStage.Welcome && (
          <div className="w-full max-w-5xl space-y-8 animate-fade-in">
            <WelcomePage
              calibration={calibration}
              onCalibrating={() => setStage(TestStage.Calibrating)}
              onTesting={() => setStage(TestStage.Testing)}
            />
          </div>
        )}

        {/* CALIBRATION WINDOW */}
        {stage === TestStage.Calibrating && (
          <div className="w-full flex items-center justify-center animate-scale-up">
            <CreditCardCalibrator
              onComplete={handleCalibrationComplete}
              onCancel={() => setStage(TestStage.Testing)}
              currentPpi={calibration.ppi}
            />
          </div>
        )}

        {/* TEST INTERFACE SYSTEM */}
        {stage === TestStage.Testing && (
          <div className="w-full animate-fade-in">
            <VisionTest
              calibration={calibration}
              onRestart={() => setStage(TestStage.Testing)}
            />
          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="mt-12 py-6 border-t border-slate-200/50 dark:border-slate-850/80 bg-white/40 dark:bg-slate-900/40 text-center text-slate-400 dark:text-slate-500 text-[11px] font-medium tracking-wide">
        <p>© 2026 AI 智慧视力综合测量大厅. 算法运行受 MediaPipe 授权安全保防机制。测试结果仅供日常预防护理，严重视力异常请到三甲医院眼科就诊。</p>
      </footer>

    </div>
  );
}
