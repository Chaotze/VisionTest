/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import {
  BookOpen,
  HelpCircle,
  Monitor,
  Play,
  Scaling,
  ShieldCheck,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { CalibrationData } from '../types';

interface WelcomeProps {
  calibration: CalibrationData;
  onCalibrating: () => void;
  onTesting: () => void;
}

export default function WelcomePage({
  calibration,
  onCalibrating,
  onTesting,
}: WelcomeProps) {
  return (
    <>
      {/* HERO MODULE */}
      <div className="relative flex flex-col items-center justify-between gap-8 overflow-hidden rounded-3xl border border-slate-100 bg-white p-6 shadow-xl sm:p-10 md:flex-row dark:border-slate-800/85 dark:bg-slate-900">
        {/* background vector shapes */}
        <div className="absolute top-0 right-0 -mt-24 -mr-24 h-64 w-64 rounded-full bg-indigo-500/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 -mb-24 -ml-24 h-64 w-64 animate-pulse rounded-full bg-cyan-500/5 blur-3xl" />

        <div className="z-10 flex-1 space-y-4 text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100/30 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
            <Sparkles
              className="h-3.5 w-3.5 animate-spin"
              style={{ animationDuration: '3s' }}
            />
            医学视光学级算法精准微调
          </div>
          <h2 className="text-3xl leading-tight font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-slate-100">
            足不出户，
            <br className="hidden sm:block" />
            智能测定您的真实视力健康
          </h2>
          <p className="max-w-lg text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            融合 <b>MediaPipe FaceMesh 人脸网格瞳距精确估算距离</b> 与{' '}
            <b>Hand-Landmarker 指尖骨骼手势轨迹</b>，配合 HTML5 Web Speech
            连续语音双端播报。自动调整视力表（Tumbling
            E）的大小，科学遮挡矫正守护您的用眼健康。
          </p>
        </div>

        {/* Start testing block */}
        <div className="z-10 flex w-full shrink-0 flex-col justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-6 shadow-inner md:w-80 dark:border-slate-800 dark:bg-slate-950/45">
          <div>
            <h4 className="mb-1.5 flex items-center gap-2 text-sm font-extrabold text-slate-700 dark:text-slate-300">
              <Monitor className="h-4 w-4 text-indigo-500" />
              基础配置状态
            </h4>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">屏幕 PPI:</span>
                <strong className="text-indigo-600 dark:text-indigo-400">
                  {calibration.ppi}
                </strong>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">校准状态:</span>
                <span
                  className={`inline-flex items-center gap-1 font-semibold ${calibration.isCalibrated ? 'text-emerald-500' : 'text-amber-500'}`}
                >
                  {calibration.isCalibrated ? (
                    <ShieldCheck className="h-3.5 w-3.5" />
                  ) : (
                    <HelpCircle className="h-3.5 w-3.5" />
                  )}
                  {calibration.isCalibrated ? '已高精度校准' : '系统默认预估'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={onCalibrating}
              className="w-full rounded-xl border border-slate-200/60 bg-white py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 active:scale-95 dark:border-slate-700/60 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              重新校准屏幕
            </button>
            <button
              onClick={onTesting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-md shadow-indigo-600/10 transition hover:bg-indigo-500 active:scale-95"
            >
              <Play className="h-4 w-4 fill-current" />
              进入测视力程序
            </button>
          </div>
        </div>
      </div>

      {/* FEATURES bento grids */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="space-y-2 rounded-3xl border border-slate-100 bg-white p-6 shadow-md dark:border-slate-800/85 dark:bg-slate-900">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400">
            <Scaling className="h-5.5 w-5.5" />
          </div>
          <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">
            瞳距测焦 智能变焦
          </h4>
          <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            通过摄像头捕捉受试者的双眼瞳孔，以成人平均瞳距（63mm）为标准基准按比例换算，
            <b>在 0.5 到 2.5 米范围</b>{' '}
            自动改变屏幕内视力表的精细大小，无需固定距离测速。
          </p>
        </div>

        <div className="space-y-2 rounded-3xl border border-slate-100 bg-white p-6 shadow-md dark:border-slate-800/85 dark:bg-slate-900">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
            <ShieldCheck className="h-5.5 w-5.5" />
          </div>
          <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">
            双眼遮挡 实时诊断
          </h4>
          <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            利用 AI 视觉测定受试者<b>双眼闭合比率 (EAR) </b>，以及
            <b>手部关节到眼周范围的交叠遮蔽碰撞</b>
            。如发现受试眼未合规开启或作假，系统将弹出防作弊贴心提醒，保证结果准确。
          </p>
        </div>

        <div className="space-y-2 rounded-3xl border border-slate-100 bg-white p-6 shadow-md dark:border-slate-800/85 dark:bg-slate-900">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-400">
            <Sliders className="h-5.5 w-5.5" />
          </div>
          <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">
            指势声控 两大反馈
          </h4>
          <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            支持<b>手指伸展物理指向</b> (上下左右) 极速提交反馈，或直接说出
            <b>“上、下、左、右”</b>
            语音识别命令。配合全程无延迟的合成语音助手指引引导，对老幼障友好。
          </p>
        </div>
      </div>

      {/* EDUCATIONAL BOOKLET */}
      <div className="flex flex-col gap-5 rounded-3xl border border-indigo-100/40 bg-indigo-50/50 p-6 sm:flex-row dark:border-slate-800/80 dark:bg-slate-900/60">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950/80 dark:text-indigo-400">
          <BookOpen className="h-6 w-6 animate-pulse" />
        </div>
        <div className="space-y-1.5">
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
            视光学标准科普小帮手 (Standardized VisionTesting)
          </h4>
          <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            中国常用的 <b>5分记录法视力表</b> (国家推荐标准 GB 11533-2011)
            理论起点为 1分视角值。根据医学公式，受测试距离只要在 1 米到 5
            米内，视标高度比率都是严格呈反比例线性递减。
            本系统通过银行卡物理尺寸测出您屏幕的<b>精确物理点距 PPI</b>
            ，再通过人脸网格测出<b>头部与电脑的距离</b>
            ，从而在逻辑层通过实时物理公式输出完美合规尺寸，精度误差
            ≤0.2mm，测试具有权威参考价值。
          </p>
        </div>
      </div>
    </>
  );
}
