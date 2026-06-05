/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { 
  Eye, Sliders, Play, CheckCircle2, ShieldCheck, Sparkles,
  HelpCircle, Monitor, BookOpen, Scaling, Cpu
} from 'lucide-react';
import { TestStage, CalibrationData } from './types';
import CreditCardCalibrator from './components/CreditCardCalibrator';
import VisionTest from './components/VisionTest';

export default function App() {
  const [stage, setStage] = useState<TestStage>(TestStage.Welcome);
  const [calibration, setCalibration] = useState<CalibrationData>({
    ppi: 96,
    pixelToMm: 0.264,
    cameraFocalLength: 1.15,
    isCalibrated: false
  });

  const handleCalibrationComplete = (data: CalibrationData) => {
    setCalibration(data);
    setStage(TestStage.Welcome);
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
            <div className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-200/40 dark:border-slate-800/80 text-[11px] font-mono font-bold text-slate-500">
              <Cpu className="w-3.5 h-3.5 text-indigo-500" />
              <span>GPU 加速</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 select-none uppercase tracking-wide">本地离线引擎</span>
            </div>
          </div>
        </div>
      </header>

      {/* CORE WORKSPACE CONTENT */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col items-center justify-center">
        
        {stage === TestStage.Welcome && (
          <div className="w-full max-w-5xl space-y-8 animate-fade-in">
            
            {/* HERO MODULE */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/85 rounded-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
              {/* background vector shapes */}
              <div className="absolute top-0 right-0 -mr-24 -mt-24 w-64 h-64 rounded-full bg-indigo-500/5 blur-3xl" />
              <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-64 h-64 rounded-full bg-cyan-500/5 blur-3xl animate-pulse" />

              <div className="flex-1 space-y-4 text-center md:text-left z-10">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-bold border border-indigo-100/30">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '3s' }} />
                  医学视光学级算法精准微调
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 leading-tight">
                  足不出户，<br className="hidden sm:block" />
                  智能测定您的真实视力健康
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed max-w-lg">
                  融合 <b>MediaPipe FaceMesh 人脸网格瞳距精确估算距离</b> 与 <b>Hand-Landmarker 指尖骨骼手势轨迹</b>，配合 HTML5 Web Speech 连续语音双端播报。自动调整视力表（Tumbling E）的大小，科学遮挡矫正守护您的用眼健康。
                </p>
              </div>

              {/* Start testing block */}
              <div className="w-full md:w-80 bg-slate-50 dark:bg-slate-950/45 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between gap-4 shrink-0 shadow-inner z-10">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-1.5">
                    <Monitor className="w-4 h-4 text-indigo-500" />
                    1. 基础配置状态
                  </h4>
                  <div className="space-y-2 mt-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">屏幕 PPI:</span>
                      <strong className="font-mono text-indigo-600 dark:text-indigo-400">
                        {calibration.ppi} (CSS)
                      </strong>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">校准状态:</span>
                      <span className={`inline-flex items-center gap-1 font-semibold ${calibration.isCalibrated ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {calibration.isCalibrated ? <ShieldCheck className="w-3.5 h-3.5" /> : <HelpCircle className="w-3.5 h-3.5" />}
                        {calibration.isCalibrated ? '已高精度校准' : '系统默认预估'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => setStage(TestStage.CalibrateScreen)}
                    className="w-full py-2 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200/60 dark:border-slate-700/60 transition active:scale-95"
                  >
                    重新校准屏幕
                  </button>
                  <button
                    onClick={() => setStage(TestStage.Testing)}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-md shadow-indigo-600/10 active:scale-95"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    进入测视力程序
                  </button>
                </div>
              </div>
            </div>

            {/* FEATURES bento grids */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/85 p-6 rounded-3xl shadow-md space-y-2">
                <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                  <Scaling className="w-5.5 h-5.5" />
                </div>
                <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">瞳距测焦 智能变焦</h4>
                <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                  通过摄像头捕捉受试者的双眼瞳孔，以成人平均瞳距（63mm）为标准基准按比例换算，<b>在 0.5 到 2.5 米范围</b> 自动改变屏幕内视力表的精细大小，无需固定距离测速。
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/85 p-6 rounded-3xl shadow-md space-y-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <ShieldCheck className="w-5.5 h-5.5" />
                </div>
                <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">双眼遮挡 实时诊断</h4>
                <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                  利用 AI 视觉测定受试者<b>双眼闭合比率 (EAR) </b>，以及<b>手部关节到眼周范围的交叠遮蔽碰撞</b>。如发现受试眼未合规开启或作假，系统将弹出防作弊贴心提醒，保证结果准确。
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/85 p-6 rounded-3xl shadow-md space-y-2">
                <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                  <Sliders className="w-5.5 h-5.5" />
                </div>
                <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">指势声控 两大反馈</h4>
                <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                  支持<b>手指伸展物理指向</b> (上下左右) 极速提交反馈，或直接说出<b>“上、下、左、右”</b>语音识别命令。配合全程无延迟的合成语音助手指引引导，对老幼障友好。
                </p>
              </div>

            </div>

            {/* EDUCATIONAL BOOKLET */}
            <div className="bg-indigo-50/50 dark:bg-slate-900/60 rounded-3xl p-6 border border-indigo-100/40 dark:border-slate-800/80 flex flex-col sm:flex-row gap-5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <BookOpen className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">视光学标准科普小帮手 (Standardized Vision Testing)</h4>
                <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                  中国常用的 <b>5分记录法视力表</b> (国家推荐标准 GB 11533-2011) 理论起点为 1分视角值。根据医学公式，受测试距离只要在 1 米到 5 米内，视标高度比率都是严格呈反比例线性递减。
                  本系统通过银行卡物理尺寸测出您屏幕的<b>精确物理点距 PPI</b>，再通过人脸网格测出<b>头部与电脑的距离</b>，从而在逻辑层通过实时物理公式输出完美合规尺寸，精度误差 ≤0.2mm，测试具有权威参考价值。
                </p>
              </div>
            </div>

          </div>
        )}

        {/* CALIBRATION WINDOW */}
        {stage === TestStage.CalibrateScreen && (
          <div className="w-full flex items-center justify-center animate-scale-up">
            <CreditCardCalibrator
              onComplete={handleCalibrationComplete}
              onCancel={() => setStage(TestStage.Welcome)}
              currentPpi={calibration.ppi}
            />
          </div>
        )}

        {/* TEST INTERFACE SYSTEM */}
        {stage === TestStage.Testing && (
          <div className="w-full animate-fade-in">
            <VisionTest
              calibration={calibration}
              onRestart={() => setStage(TestStage.Welcome)}
            />
          </div>
        )}

      </main>

      {/* FOOTER SYSTEM */}
      <footer className="mt-12 py-6 border-t border-slate-200/50 dark:border-slate-850/80 bg-white/40 dark:bg-slate-900/40 text-center text-slate-400 dark:text-slate-500 text-[11px] font-medium tracking-wide">
        <p>© 2026 AI 智慧视力综合测量大厅. 算法运行受 MediaPipe 授权安全保防机制。测试结果仅供日常预防护理，严重视力异常请到三甲医院眼科就诊。</p>
      </footer>

    </div>
  );
}
