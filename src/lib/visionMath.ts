/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Direction } from '../types';

/**
 * Calculates the height of a Tumbling E optotype in CSS pixels.
 * Uses the formula:
 *   Height (mm) = (Distance (mm) * tan(5 arcminutes)) / AcuityDecimal
 *   Height (pixels) = (Height (mm) / 25.4) * ScreenPPI
 *
 * @param distanceCm User distance from screen in centimeters
 * @param decimalAcuity Visual acuity decimal score (e.g. 1.0, 0.5)
 * @param ppi Screen Pixels Per Inch (CSS-scaled)
 */
export function calculateOptotypeSizePx(
  distanceCm: number,
  decimalAcuity: number,
  ppi: number
): number {
  const distanceMm = distanceCm * 10;
  // tan(5 arcminutes) = tan(5/60 degrees) = tan(0.0833333 degrees) = 0.00145444
  const tanFiveArcMin = 0.00145444104;
  
  // Height of E at 1.0 Visual Acuity in millimeters
  const baseHeightMm = distanceMm * tanFiveArcMin;
  
  // Height for targeted visual acuity (inversely proportional)
  const targetHeightMm = baseHeightMm / decimalAcuity;
  
  // Convert millimeters to CSS pixels
  const sizePx = (targetHeightMm / 25.4) * ppi;
  
  // Return minimum size of 5px to avoid render crashes, but typically it will be larger
  return Math.max(5, sizePx);
}

interface Landmark {
  x: number;
  y: number;
  z?: number;
}

/**
 * Estimates distance in centimeters from the camera using the standard average Interpupillary Distance (IPD)
 * of 63mm (6.3 cm) and a pinhole camera projection model.
 *
 * Formula: Distance (cm) = (6.3 * FocalFactor) / d_norm
 * Where d_norm is the normalized coordinate distance between eyes in the video frame.
 */
export function estimateDistanceCm(
  leftPupil: Landmark,
  rightPupil: Landmark,
  focalFactor: number = 1.0
): number {
  const dx = leftPupil.x - rightPupil.x;
  const dy = leftPupil.y - rightPupil.y;
  const dNorm = Math.sqrt(dx * dx + dy * dy);
  
  if (dNorm === 0) return 60; // default fallback 60cm
  
  const distanceCm = (6.3 * focalFactor) / dNorm;
  
  // Bound to a reasonable indoor webcam tracking range (20cm to 300cm)
  return Math.min(Math.max(distanceCm, 20), 300);
}

/**
 * Calculate Euclidean distance between two landmarks.
 */
function getDistance(a: Landmark, b: Landmark): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = (a.z ?? 0) - (b.z ?? 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calculates the Eye Aspect Ratio (EAR) for a given set of eye landmarks.
 * Landmarks order should correspond to:
 * - p1: Left/Right corner
 * - p2: Top-left eyelid
 * - p3: Top-right eyelid
 * - p4: Right/Left corner
 * - p5: Bottom-right eyelid
 * - p6: Bottom-left eyelid
 * 
 * EAR formula: (||p2 - p6|| + ||p3 - p5||) / (2 * ||p1 - p4||)
 */
export function calculateEAR(
  corner1: Landmark,
  corner2: Landmark,
  eyelidTop1: Landmark,
  eyelidTop2: Landmark,
  eyelidBottom1: Landmark,
  eyelidBottom2: Landmark
): number {
  const width = getDistance(corner1, corner2);
  const height1 = getDistance(eyelidTop1, eyelidBottom1);
  const height2 = getDistance(eyelidTop2, eyelidBottom2);
  
  if (width === 0) return 0;
  return (height1 + height2) / (2.0 * width);
}

/**
 * Analyzes hand landmarks to detect if the hand is pointing in a specific direction.
 * Finger indexing inside MediaPipe:
 * - Wrist: 0
 * - Thumb: 1, 2, 3, 4
 * - Index finger: 5, 6, 7, 8
 * - Middle finger: 9, 10, 11, 12
 * - Ring finger: 13, 14, 15, 16
 * - Pinky: 17, 18, 19, 20
 *
 * To recognize UP, DOWN, LEFT, RIGHT:
 * 1. Checks if index finger is fully extended.
 * 2. Checks if other fingers (Middle, Ring, Pinky) are closed.
 * 3. Uses the vector from Index MCP (5) to Index Tip (8) to determine pointing angle.
 */
export function detectPointingGesture(
  landmarks: Landmark[],
  mirrored: boolean = true
): Direction | null {
  if (!landmarks || landmarks.length < 21) return null;
  
  const mcpIndex = landmarks[5];
  const tipIndex = landmarks[8];
  
  // Basic finger extension lengths
  const indexExtend = getDistance(mcpIndex, tipIndex);
  
  // Compare to other fingers to ensure they are folded
  const isMiddleFolded = getDistance(landmarks[9], landmarks[12]) < indexExtend * 0.5;
  const isRingFolded = getDistance(landmarks[13], landmarks[16]) < indexExtend * 0.5;
  const isPinkyFolded = getDistance(landmarks[17], landmarks[20]) < indexExtend * 0.5;
  
  // Make sure index finger is sufficiently extended relative to knuckle spans
  const wrist = landmarks[0];
  const mcpIndexToWrist = getDistance(wrist, mcpIndex);
  
  const isIndexExtended = getDistance(landmarks[6], tipIndex) > mcpIndexToWrist * 0.35;
  
  // Strict check: Index is extended, others are bent to avoid trigger on random open hand
  if (!isIndexExtended || (!isMiddleFolded && !isRingFolded)) {
    return null;
  }
  
  // We have a pointing finger! Analyze direction vector
  const dx = tipIndex.x - mcpIndex.x;
  const dy = tipIndex.y - mcpIndex.y; // note y is negative going up on screen
  
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  const threshold = 0.05; // minimum displacement
  
  if (absDx < threshold && absDy < threshold) {
    return null;
  }
  
  if (absDy > absDx) {
    // Vertical gesture
    if (dy < 0) {
      return Direction.Up;
    } else {
      return Direction.Down;
    }
  } else {
    // Horizontal gesture - take mirroring into account
    // If mirrored is true (typical webcam display), pointing left on camera (tip.x < mcp.x)
    // actually corresponds to pointing RIGHT relative to the observer, but we want to map it
    // so that pointing physically towards the left of the image goes LEFT on the screen, etc.
    // Let's standardise: if client sees their hand pointing to their left (toward left edge of screen) 
    // it corresponds to x being smaller in mirrored coordinates.
    // If the image is mirrored:
    // User points to their physical right -> finger goes towards screen left of mirrored webcam.
    // Therefore let's map: 
    // physical direction user wants to select.
    if (mirrored) {
      // In a mirrored webcam, when pointing left of screen (dx < 0), physical finger points to user's left.
      // dx < 0 means pointing to client-view-left!
      return dx < 0 ? Direction.Right : Direction.Left;
    } else {
      return dx < 0 ? Direction.Left : Direction.Right;
    }
  }
}
