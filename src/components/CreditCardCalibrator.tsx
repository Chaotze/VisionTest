/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { CreditCard, Check, HelpCircle, Sparkles } from 'lucide-react';
import { CalibrationData } from '../types';

interface CreditCardCalibratorProps {
  onComplete: (data: CalibrationData) => void;
  onCancel?: () => void;
  currentPpi?: number;
}

export default function CreditCardCalibrator({
  onComplete,
  onCancel,
  currentPpi = 96
}: CreditCardCalibratorProps) {
  // We'll set a standard default box width in CSS pixels
  // Standard full-HD screen CSS PPI ~96. 
  // At 96 PPI, a 3.37 inches wide credit card should be approx 324 CSS pixels.
  const [boxWidth, setBoxWidth] = useState<number>(Math.round(3.37 * currentPpi));

  const CARD_REAL_WIDTH_INCHES = 3.37007874; // 85.6mm in inches
  const CARD_REAL_WIDTH_MM = 85.6;

  const handleSave = () => {
    // Calculcate PPI based on the width in pixels for 3.37 inches
    const ppi = boxWidth / CARD_REAL_WIDTH_INCHES;
    const pixelToMm = CARD_REAL_WIDTH_MM / boxWidth;
    
    onComplete({
      ppi: Math.round(ppi * 10) / 10,
      pixelToMm,
      cameraFocalLength: 1.15, // standard default horizontal focal factor
      isCalibrated: true
    });
  };

  return (
    <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl p-6 md:p-8 overflow-hidden relative">
      {/* Background radial glow */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-violet-500/10 blur-3xl" />

      <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-2">
        <Sparkles className="w-6 h-6 text-indigo-500 animate-pulse" />
        屏幕尺寸精确校准 (PPI)
      </h2>
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 leading-relaxed">
        为了保证物理视力表（E字符）在不同大小的显示器或笔记本上都具有<strong>极其标准、符合医学规范</strong>的真实尺寸，我们需要对您的屏幕进行一次简单校准。
      </p>

      {/* Calibration Box */}
      <div className="w-full h-56 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-4 flex flex-col items-center justify-center relative mb-6">
        <div className="absolute top-2 left-3 text-xs font-mono text-slate-400 dark:text-slate-500 flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5" />
          拿出一张标准银行卡/身份证，贴在屏幕对应框上微调
        </div>

        {/* Realistic Card UI */}
        <div
          id="calibration-target-card"
          style={{ width: `${boxWidth}px` }}
          className="h-32 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 rounded-xl relative shadow-lg flex flex-col justify-between p-4 transition-all duration-75 select-none"
        >
          {/* Card Chip & Type icon */}
          <div className="flex justify-between items-start">
            <div className="w-10 h-8 bg-amber-200/50 rounded-md border border-amber-300 opacity-85 flex items-center justify-center">
              <div className="w-6 h-4 border border-indigo-900/10 rounded-sm" />
            </div>
            <CreditCard className="w-8 h-8 text-white/50" />
          </div>

          {/* Hologram or Decal */}
          <div className="flex justify-between items-end">
            <div className="flex flex-col gap-1">
              <div className="w-24 h-2 bg-white/20 rounded" />
              <div className="w-16 h-1.5 bg-white/20 rounded" />
            </div>
            <div className="w-10 h-6 bg-gradient-to-tr from-amber-400 to-rose-400 rounded-full opacity-60 filter blur-[1px]" />
          </div>

          {/* Left Ruler line */}
          <div className="absolute left-0 top-0 bottom-0 border-l border-white/40" />
          {/* Right Ruler line */}
          <div className="absolute right-0 top-0 bottom-0 border-r border-white/40" />
          
          {/* Measurement Label */}
          <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 font-mono text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap bg-slate-100 dark:bg-slate-900 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-1.5">
            <span>宽度 = 实物银行卡 (8.56 cm / 3.37")</span>
          </div>
        </div>
      </div>

      {/* Control Slider */}
      <div className="space-y-4 mb-8">
        <div className="flex justify-between items-center text-sm">
          <span className="font-semibold text-slate-700 dark:text-slate-300">调节宽度</span>
          <span className="font-mono text-slate-500 dark:text-slate-400">
            {boxWidth} 像素 (PPI: {Math.round(boxWidth / CARD_REAL_WIDTH_INCHES)})
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setBoxWidth(prev => Math.max(200, prev - 1))}
            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all text-xl font-mono flex items-center justify-center shadow-sm"
          >
            -
          </button>
          
          <input
            id="calibration-slider"
            type="range"
            min="200"
            max="480"
            value={boxWidth}
            onChange={(e) => setBoxWidth(parseInt(e.target.value))}
            className="flex-1 h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-ew-resize accent-indigo-600"
          />
          
          <button
            onClick={() => setBoxWidth(prev => Math.min(480, prev + 1))}
            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all text-xl font-mono flex items-center justify-center shadow-sm"
          >
            +
          </button>
        </div>

        {/* Preset values */}
        <div className="flex flex-wrap gap-2 pt-2 justify-center">
          <button
            onClick={() => setBoxWidth(290)} // ~86 PPI (Smaller low-res desktop monitor)
            className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 text-xs font-medium border border-slate-200/50 dark:border-slate-800 transition"
          >
            19-21寸显示器
          </button>
          <button
            onClick={() => setBoxWidth(324)} // ~96 PPI (Standard HD Monitor)
            className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 text-xs font-medium border border-slate-200/50 dark:border-slate-800 transition"
          >
            24寸高清显示器
          </button>
          <button
            onClick={() => setBoxWidth(371)} // ~110 PPI (High Dens Monitor / 27" 2K)
            className="px-3 py-1.5 rounded-lg bg-slate-55 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 text-xs font-medium border border-slate-200/50 dark:border-slate-800 transition"
          >
            27寸 2K显示器
          </button>
          <button
            onClick={() => setBoxWidth(414)} // ~123 PPI (15.6" Laptop Full HD)
            className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 text-xs font-medium border border-slate-200/50 dark:border-slate-800 transition"
          >
            14-15寸笔记本
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        {onCancel && (
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-2xl transition"
          >
            取消
          </button>
        )}
        <button
          onClick={handleSave}
          className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 hover:shadow-indigo-500/10 hover:shadow-lg text-white font-semibold rounded-2xl transition flex items-center justify-center gap-2"
        >
          <Check className="w-5 h-5" />
          完成校准
        </button>
      </div>
    </div>
  );
}
