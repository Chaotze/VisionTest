/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Eye, Sliders, Play, CheckCircle2, ShieldCheck, Sparkles,
  HelpCircle, Monitor, BookOpen, Scaling, Cpu, MonitorDot
} from 'lucide-react';
import { TestStage, CalibrationData } from './types';
import CreditCardCalibrator from './components/CreditCardCalibrator';
import VisionTest from './components/VisionTest';
import WelcomePage from './components/WelcomePage';
import { Toaster } from './components/ui/sonner';

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
      <header className="sticky top-0 z-30 bg-white/50 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/80 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3.5 hover:opacity-80 transition-opacity">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-300 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
              <Eye className="w-5.5 h-5.5 stroke-[2.5]" />
            </div>
            <div>
              {/* <h1 className="text-md sm:text-lg font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-1.5 leading-none">
                AI 智慧测视力 <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200/30">V2.0</span>
              </h1>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium tracking-tight">基于 MediaPipe 计算机视觉与 WebSpeech 语音技术</span> */}
              <h1 className="text-lg text-slate-900 dark:text-slate-100 flex items-center gap-1.5 select-none leading-none font-sans font-thin tracking-[0.3em] uppercase">
                VISIONTEST
              </h1>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {/* <div className="hidden md:flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-xs text-slate-500 dark:text-slate-400 select-none uppercase tracking-wide">本地离线引擎</span>
            </div> */}

            <div className="hidden md:flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-xl text-xs tracking-wide text-slate-500 dark:text-slate-400">
              <Cpu className="w-3.5 h-3.5 text-indigo-500" />
              <span>已启用 GPU 加速</span>
            </div>

            <button
              onClick={() => setStage(TestStage.Calibrating)}
              className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 text-slate-500 dark:text-slate-350 rounded-xl border border-indigo-200/50 dark:border-indigo-800/50 text-xs transition"
              title="校准屏幕 PPI"
            >
              <MonitorDot className="w-3.5 h-3.5 text-indigo-500" />
              <span className="hidden sm:inline">PPI 校准</span>
            </button>
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
      <footer className="py-4 border-t border-slate-200/50 dark:border-slate-850/80 bg-white/40 dark:bg-slate-900/40 text-center text-slate-400 dark:text-slate-500 text-[11px] font-semilight tracking-wide">
        <span>Copyright © 2026 </span>
        <span className="font-semibold font-sans">VISIONTEST</span>
        <span>.&nbsp;&nbsp;保留所有权利。测试结果仅供日常预防护理，正规检查请前往三甲医院视光中心或眼科就诊。</span>
      </footer>

      <Toaster position="top-center" />
    </div>
  );
}
