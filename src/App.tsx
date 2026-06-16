/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Cpu, Download, Eye, MonitorDot } from 'lucide-react';
import { useEffect, useState } from 'react';
import CreditCardCalibrator from './components/CreditCardCalibrator';
import VisionTest from './components/VisionTest';
import WelcomePage from './components/WelcomePage';
import { Toaster } from './components/ui/sonner';
import { CalibrationData, TestStage } from './types';

export default function App() {
  const [stage, setStage] = useState<TestStage>(TestStage.Testing);
  const [calibration, setCalibration] = useState<CalibrationData>({
    ppi: 96,
    pixelToMm: 0.264,
    cameraFocalLength: 1.0,
    isCalibrated: false,
  });
  const [isWails, setIsWails] = useState(false);
  const [isDarwin, setIsDarwin] = useState(false);

  // Check localStorage for first run and calibration data
  useEffect(() => {
    const savedCalibration = localStorage.getItem('visionCalibration');

    if (savedCalibration) {
      setCalibration(JSON.parse(savedCalibration));
    } else {
      setStage(TestStage.Calibrating);
    }

    const userAgent = navigator.userAgent;
    const wailsCheck = /wails.io/.test(userAgent);
    const darwinCheck = /Macintosh|Mac OS X|Mac/.test(userAgent);
    setIsWails(wailsCheck);
    setIsDarwin(darwinCheck);
  }, []);

  // Save calibration data to localStorage
  const handleCalibrationComplete = (data: CalibrationData) => {
    setCalibration(data);
    localStorage.setItem('visionCalibration', JSON.stringify(data));
    setStage(TestStage.Testing);
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-800 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      {/* HEADER BAR */}
      <header className="sticky top-0 z-30 border-b border-slate-200/50 bg-white/50 backdrop-blur-xl transition-colors dark:border-slate-800/80 dark:bg-slate-900/80">
        <div
          className={`${isWails && isDarwin ? 'mr-16 ml-16' : 'max-w-7xl'} mx-auto flex items-center justify-between px-4 py-3 sm:px-6 lg:px-8`}
        >
          <a
            href="/"
            className={`flex items-center gap-3.5 transition-opacity ${
              isWails ? 'cursor-default' : 'cursor-pointer hover:opacity-80'
            }`}
            onClick={(e) => isWails && e.preventDefault()}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-300 to-indigo-600 text-white shadow-lg shadow-indigo-500/30">
              <Eye className="h-5.5 w-5.5 stroke-[2.5]" />
            </div>
            <div>
              {/* <h1 className="text-md sm:text-lg font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-1.5 leading-none">
                AI 智慧测视力 <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200/30">V2.0</span>
              </h1>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium tracking-tight">基于 MediaPipe 计算机视觉与 WebSpeech 语音技术</span> */}
              <h1 className="font-semilight flex items-center gap-1.5 font-[Montserrat_Variable] text-lg leading-none tracking-[0.3em] text-slate-900 uppercase select-none dark:text-slate-100">
                VisionTest
              </h1>
            </div>
          </a>

          <div className="flex items-center gap-3">
            {/* <div className="hidden md:flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-xs text-slate-500 dark:text-slate-400 select-none uppercase tracking-wide">本地离线引擎</span>
            </div> */}

            <div className="hidden items-center gap-1.5 rounded-xl py-1 pr-2 pl-3 text-xs tracking-wide text-slate-500 md:flex dark:text-slate-400">
              <Cpu className="h-3.5 w-3.5 text-indigo-500" />
              <span>已启用 GPU 加速</span>
            </div>

            <button
              onClick={() => setStage(TestStage.Calibrating)}
              className="dark:text-slate-350 flex items-center gap-1.5 rounded-xl border border-indigo-200/50 bg-indigo-50 px-3 py-1 text-xs text-slate-500 transition hover:bg-indigo-100 dark:border-indigo-800/50 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/60"
              title="校准屏幕 PPI"
            >
              <MonitorDot className="h-3.5 w-3.5 text-indigo-500" />
              <span className="hidden sm:inline">PPI 校准</span>
            </button>

            {!isWails && (
              <a
                href="https://github.com/Chaotze/VisionTest/releases/latest"
                target="_blank"
                rel="noopener noreferrer"
                className="dark:text-slate-350 flex items-center gap-1.5 rounded-xl border border-indigo-200/50 bg-indigo-50 px-3 py-1 text-xs text-slate-500 transition hover:bg-indigo-100 dark:border-indigo-800/50 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/60"
                title="下载 VisionTest"
              >
                <Download className="h-3.5 w-3.5 text-indigo-500" />
                <span className="hidden sm:inline">APP 下载</span>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* CORE WORKSPACE CONTENT */}
      <main
        className={`flex-1 ${isWails ? '' : 'max-w-7xl'} mx-auto flex w-full flex-col items-center justify-center px-4 py-8 sm:px-6 lg:px-8`}
      >
        {/* WELCOMING PAGE */}
        {stage === TestStage.Welcome && (
          <div className="animate-fade-in w-full max-w-5xl space-y-8">
            <WelcomePage
              calibration={calibration}
              onCalibrating={() => setStage(TestStage.Calibrating)}
              onTesting={() => setStage(TestStage.Testing)}
            />
          </div>
        )}

        {/* CALIBRATION WINDOW */}
        {stage === TestStage.Calibrating && (
          <div className="animate-scale-up flex w-full items-center justify-center">
            <CreditCardCalibrator
              onComplete={handleCalibrationComplete}
              onCancel={() => setStage(TestStage.Testing)}
              currentPpi={calibration.ppi}
            />
          </div>
        )}

        {/* TEST INTERFACE SYSTEM */}
        {stage === TestStage.Testing && (
          <div className="animate-fade-in w-full">
            <VisionTest
              calibration={calibration}
              onRestart={() => setStage(TestStage.Testing)}
            />
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="dark:border-slate-850/80 font-semilight border-t border-slate-200/50 bg-white/40 p-4 text-center text-[11px] tracking-wide text-slate-400 dark:bg-slate-900/40 dark:text-slate-500">
        <span className="font-[Montserrat_Variable]">Copyright © 2026 </span>
        <span className="font-[Montserrat_Variable] font-semibold">
          VisionTest
        </span>
        <span>
          .&nbsp;&nbsp;保留所有权利。测试结果仅供日常预防护理，正规检查请前往三甲医院视光中心或眼科就诊
        </span>
      </footer>

      <Toaster position="top-center" />
    </div>
  );
}
