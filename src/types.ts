/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum TestStage {
  Welcome = 'WELCOME',
  CalibrateScreen = 'CALIBRATE_SCREEN',
  CalibrateDistance = 'CALIBRATE_DISTANCE',
  Testing = 'TESTING',
  Result = 'RESULT'
}

export enum EyeToTest {
  Right = 'RIGHT',  // Testing Right eye (Left eye should be closed/covered)
  Left = 'LEFT',    // Testing Left eye (Right eye should be closed/covered)
  Both = 'BOTH'     // Testing Both eyes
}

export enum FeedbackMode {
  Gesture = 'GESTURE',
  Voice = 'VOICE',
  Keyboard = 'KEYBOARD'
}

export enum Direction {
  Up = 'UP',
  Down = 'DOWN',
  Left = 'LEFT',
  Right = 'RIGHT'
}

export interface AcuityLevel {
  decimal: number;       // e.g., 0.1, 0.5, 1.0, 1.5
  fivePoint: number;     // e.g., 4.0, 4.7, 5.0, 5.2
  snellen: string;       // e.g., "20/200", "20/40", "20/20", "20/13"
  label: string;         // Descriptive label like "Low Vision", "Normal"
}

// Full standard ophthalmic acuity chart levels
export const ACUITY_LEVELS: AcuityLevel[] = [
  { decimal: 0.1, fivePoint: 4.0, snellen: '20/200', label: '重度低视力 (Low Vision)' },
  { decimal: 0.12, fivePoint: 4.1, snellen: '20/160', label: '低视力 (Low Vision)' },
  { decimal: 0.15, fivePoint: 4.2, snellen: '20/125', label: '低视力 (Low Vision)' },
  { decimal: 0.2, fivePoint: 4.3, snellen: '20/100', label: '中度低视力 (Low Vision)' },
  { decimal: 0.25, fivePoint: 4.4, snellen: '20/80', label: '轻度视力损伤 (Mild Impairment)' },
  { decimal: 0.3, fivePoint: 4.5, snellen: '20/66', label: '轻度视力损伤 (Mild Impairment)' },
  { decimal: 0.4, fivePoint: 4.6, snellen: '20/50', label: '轻度视力异常 (Sub-normal)' },
  { decimal: 0.5, fivePoint: 4.7, snellen: '20/40', label: '正常边缘 (Near Normal)' },
  { decimal: 0.6, fivePoint: 4.8, snellen: '20/33', label: '正常视力 (Normal)' },
  { decimal: 0.8, fivePoint: 4.9, snellen: '20/25', label: '正常视力 (Normal)' },
  { decimal: 1.0, fivePoint: 5.0, snellen: '20/20', label: '标准健壮视力 (Standard)' },
  { decimal: 1.2, fivePoint: 5.1, snellen: '20/16', label: '优秀视力 (Excellent)' },
  { decimal: 1.5, fivePoint: 5.2, snellen: '20/13', label: '超常视力 (Superior)' }
];

export interface CalibrationData {
  ppi: number;                 // Screen pixels per inch (CSS-based)
  pixelToMm: number;           // Calculated width of 1 CSS pixel in millimeters
  cameraFocalLength: number;   // Normal focal factor f_norm
  isCalibrated: boolean;
}

export interface TestSession {
  eye: EyeToTest;
  history: Array<{
    levelIndex: number;
    direction: Direction;
    userResponse: Direction | null;
    isCorrect: boolean;
    distanceCm: number;
    timestamp: number;
  }>;
  currentLevelIndex: number;
  consecutiveCorrect: number;
  consecutiveWrong: number;
  completed: boolean;
  finalScore: AcuityLevel | null;
}
