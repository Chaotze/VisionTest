/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { BorderBeam } from 'border-beam';
import { CheckCircle, CreditCard } from 'lucide-react';
import { useState } from 'react';
import { CalibrationData } from '../types';

interface CreditCardCalibratorProps {
  onComplete: (data: CalibrationData) => void;
  onCancel?: () => void;
  currentPpi?: number;
}

export default function CreditCardCalibrator({
  onComplete,
  onCancel,
  currentPpi = 96,
}: CreditCardCalibratorProps) {
  // We'll set a standard default box width in CSS pixels
  // Standard full-HD screen CSS PPI ~96.
  // At 96 PPI, a 3.37 inches wide credit card should be approx 324 CSS pixels.
  const [boxWidth, setBoxWidth] = useState<number>(
    Math.round(3.37 * currentPpi)
  );

  const CARD_REAL_WIDTH_INCHES = 3.37007874; // 85.6mm in inches
  const CARD_REAL_WIDTH_MM = 85.6;
  const CARD_REAL_HEIGHT_MM = 53.98;
  const CARD_ASPECT_RATIO = CARD_REAL_WIDTH_MM / CARD_REAL_HEIGHT_MM; // ~1.586

  const boxHeight = boxWidth / CARD_ASPECT_RATIO;

  const handleSave = () => {
    // Calculcate PPI based on the width in pixels for 3.37 inches
    const ppi = boxWidth / CARD_REAL_WIDTH_INCHES;
    const pixelToMm = CARD_REAL_WIDTH_MM / boxWidth;

    onComplete({
      ppi: Math.round(ppi * 10) / 10,
      pixelToMm,
      cameraFocalLength: 1.0, // standard default horizontal focal factor
      isCalibrated: true,
    });
  };

  return (
    <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-slate-100 bg-white p-4 shadow-2xl md:p-6 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-2 flex items-center gap-2 text-xl font-semibold text-slate-600 dark:text-slate-100">
        {/* <Sparkles className="w-6 h-6 text-indigo-500 animate-pulse" /> */}
        PPI 校准
      </h2>
      {/* <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 leading-relaxed">
        为了保证物理视力表（E字符）在不同大小的显示器或笔记本上都具有<strong>极其标准、符合医学规范</strong>的真实尺寸，我们需要对您的屏幕进行一次简单校准
      </p> */}

      {/* Calibration Box */}
      <BorderBeam className="mb-6" strength={0.5}>
        <div className="relative flex min-h-[300px] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="absolute top-2 left-2.5 flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
            {/* <HelpCircle className="w-3.5 h-3.5" /> */}
            拿出校园卡/身份证，贴在屏幕对应框上微调
          </div>

          {/* Realistic Card UI */}
          <div
            id="calibration-target-card"
            style={{ width: `${boxWidth}px`, height: `${boxHeight}px` }}
            className="relative mt-3.5 mb-6 flex flex-col justify-between rounded-xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-4 shadow-lg transition-all duration-75 select-none"
          >
            {/* Card Chip & Type icon */}
            <div className="flex items-start justify-between">
              <div className="flex h-8 w-10 items-center justify-center rounded-md border border-amber-300 bg-amber-200/50 opacity-85">
                <div className="h-4 w-6 rounded-sm border border-indigo-900/10" />
              </div>
              <CreditCard className="h-8 w-8 text-white/50" />
            </div>

            {/* Hologram or Decal */}
            {/* <div className="flex justify-between items-end">
            <div className="flex flex-col gap-1">
              <div className="w-24 h-2 bg-white/20 rounded" />
              <div className="w-16 h-1.5 bg-white/20 rounded" />
            </div>
            <div className="w-10 h-6 bg-gradient-to-tr from-amber-400 to-rose-400 rounded-full opacity-60 filter blur-[1px]" />
          </div> */}

            {/* Left Ruler line */}
            {/* <div className="absolute left-0 top-0 bottom-0 border-l border-white/40" /> */}
            {/* Right Ruler line */}
            {/* <div className="absolute right-0 top-0 bottom-0 border-r border-white/40" /> */}

            {/* Measurement Label */}
          </div>
          <div className="absolute bottom-2.5 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs whitespace-nowrap text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            <span>宽度 = 实物校园卡/身份证 (8.56 cm / 3.37")</span>
          </div>
        </div>
      </BorderBeam>

      {/* Control Slider */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-slate-600 dark:text-slate-300">
            调节宽度
          </span>
          <span className="text-slate-500 dark:text-slate-400">
            {boxWidth} 像素 (PPI:{' '}
            {Math.round(boxWidth / CARD_REAL_WIDTH_INCHES)})
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setBoxWidth((prev) => Math.max(60, prev - 1))}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/50 bg-slate-100 text-xl text-slate-600 transition-all hover:bg-slate-200 active:scale-95 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            -
          </button>

          <input
            id="calibration-slider"
            type="range"
            min="60"
            max="500"
            value={boxWidth}
            onChange={(e) => setBoxWidth(parseInt(e.target.value))}
            className="h-2 flex-1 cursor-ew-resize appearance-none rounded-lg bg-slate-200 accent-indigo-600 dark:bg-slate-800"
          />

          <button
            onClick={() => setBoxWidth((prev) => Math.min(500, prev + 1))}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/50 bg-slate-100 text-xl text-slate-600 transition-all hover:bg-slate-200 active:scale-95 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            +
          </button>
        </div>

        {/* Preset values */}
        {/* <div className="flex flex-wrap gap-2 pt-2 justify-center">
          <button
            onClick={() => setBoxWidth(290)} // ~86 PPI (Smaller low-res desktop monitor)
            className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 text-xs font-medium border border-slate-200/50 dark:border-slate-800 transition"
          >
            19-21 寸显示器
          </button>
          <button
            onClick={() => setBoxWidth(324)} // ~96 PPI (Standard HD Monitor)
            className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 text-xs font-medium border border-slate-200/50 dark:border-slate-800 transition"
          >
            24 寸高清显示器
          </button>
          <button
            onClick={() => setBoxWidth(371)} // ~110 PPI (High Dens Monitor / 27" 2K)
            className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 text-xs font-medium border border-slate-200/50 dark:border-slate-800 transition"
          >
            27 寸 2K 显示器
          </button>
          <button
            onClick={() => setBoxWidth(414)} // ~123 PPI (15.6" Laptop Full HD)
            className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 text-xs font-medium border border-slate-200/50 dark:border-slate-800 transition"
          >
            14-15 寸笔记本
          </button>
        </div> */}
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        {onCancel && (
          <button
            onClick={onCancel}
            className="flex-100 rounded-2xl border border-slate-200/50 bg-slate-100 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            取消
          </button>
        )}
        <BorderBeam className="flex-110" strength={2.0}>
          <button
            onClick={handleSave}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 px-4 py-2.5 font-semibold text-white transition hover:from-indigo-700 hover:to-purple-700 hover:shadow-lg hover:shadow-indigo-500/10 dark:from-indigo-400 dark:to-purple-400 dark:hover:from-indigo-500 dark:hover:to-purple-500"
          >
            <CheckCircle className="h-5 w-5" />
            完成
          </button>
        </BorderBeam>
      </div>
    </div>
  );
}
