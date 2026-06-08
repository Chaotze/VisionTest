/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { Camera, CameraOff, VideoOff, Info, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { BorderBeam } from 'border-beam';
import { FilesetResolver, FaceLandmarker, HandLandmarker } from '@mediapipe/tasks-vision';
import { estimateDistanceCm, calculateEAR, detectPointingGesture } from '../lib/visionMath';
import { Direction, EyeToTest, FeedbackMode } from '../types';

interface CameraManagerProps {
  onDistanceUpdate: (distanceCm: number) => void;
  onEyeOcclusionUpdate: (occluded: { left: boolean; right: boolean }) => void;
  onGestureDetected: (direction: Direction) => void;
  eyeTested: EyeToTest;
  feedbackMode: FeedbackMode;
}

export interface CameraManagerRef {
  startCamera: () => Promise<void>;
  stopCamera: () => void;
}

const CameraManager = forwardRef<CameraManagerRef, CameraManagerProps>(({
  onDistanceUpdate,
  onEyeOcclusionUpdate,
  onGestureDetected,
  eyeTested,
  feedbackMode
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadStatus, setLoadStatus] = useState<string>('正在初始化相机和视觉引擎 ...');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isStartingCamera, setIsStartingCamera] = useState<boolean>(false);
  const [currentDistance, setCurrentDistance] = useState<number>(60);

  // MediaPipe Models
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef<number | null>(null);

  const lastGestureRef = useRef<{ direction: Direction; timestamp: number } | null>(null);
  const lastToastRef = useRef<string | null>(null);

  // Initialize MediaPipe Models once
  useEffect(() => {
    let active = true;

    async function loadModels() {
      try {
        setIsLoading(true);
        setLoadStatus('正在获取运行时组件(WASM) ...');

        const filesetResolver = await FilesetResolver.forVisionTasks(
          '/mediapipe/tasks-vision/wasm'
        );

        if (!active) return;
        setLoadStatus('1/2 正在加载人脸测距与眼部状态诊断模型 ...');

        const faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: '/mediapipe/face_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFaceBlendshapes: false
        });

        if (!active) return;
        faceLandmarkerRef.current = faceLandmarker;

        setLoadStatus('2/2 正在加载手部动作方向识别模型 ...');
        const handLandmarker = await HandLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: '/mediapipe/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 2
        });

        if (!active) return;
        handLandmarkerRef.current = handLandmarker;

        setIsLoading(false);
        setLoadStatus('');
      } catch (err) {
        console.error('Error loading MediaPipe models: ', err);
        setLoadStatus('算法模型加载失败，请检查网络网络或刷新页面重试');
      }
    }

    loadModels();

    return () => {
      active = false;
      // Don't stop camera - keep it running unless permission is denied
    };
  }, []);

  useImperativeHandle(ref, () => ({
    startCamera: async () => {
      await startCameraInternal();
    },
    stopCamera: () => {
      stopCamera();
    }
  }));

  const startCameraInternal = async () => {
    // Don't stop camera - keep it running unless permission is denied
    lastToastRef.current = null;
    toast.dismiss();
    setIsStartingCamera(true);
    try {
      setHasPermission(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.addEventListener('loadeddata', onVideoLoaded);
        // Explicitly play to kick off streaming inside iframe contexts and ensure prompt drawing
        videoRef.current.play()
          .then(() => {
            // Don't set isStartingCamera to false here - let onVideoLoaded handle it
            // when the video frame is actually ready to display
          })
          .catch(err => {
            console.warn("Video playback was deferred/interrupted: ", err);
          });
      }
      setHasPermission(true);
      setIsCameraActive(true);
      // Don't set isStartingCamera to false here - wait for video to actually display
    } catch (err) {
      console.error('Error accessing camera: ', err);
      setHasPermission(false);
      setIsCameraActive(false);
      setIsStartingCamera(false);
    }
  };

  const stopCamera = () => {
    setIsCameraActive(false);
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // Clear canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const onVideoLoaded = () => {
    // Start tracking loop
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
    requestRef.current = requestAnimationFrame(processingLoop);
    // Now that video frame is ready to display, hide the starting camera overlay
    setIsStartingCamera(false);
  };

  // Processing loop that drives Face + Hand assessment frame-by-frame
  const processingLoop = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.paused || video.ended) {
      requestRef.current = requestAnimationFrame(processingLoop);
      return;
    }

    const timestamp = performance.now();
    const width = video.videoWidth;
    const height = video.videoHeight;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      requestRef.current = requestAnimationFrame(processingLoop);
      return;
    }

    // Clear previous drawing
    ctx.clearRect(0, 0, width, height);

    // If we have video frame, draw mirrored on canvas as user background feed
    ctx.save();
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, width, height);
    ctx.restore();

    let faceDetailsDetected = false;
    let computedDistance = currentDistance;
    let leftEyeClosed = false;
    let rightEyeClosed = false;
    let leftEyeCoveredByHand = false;
    let rightEyeCoveredByHand = false;
    let detectedHandPoints: any[] = [];

    // 1. Process Hands (always active to allow hand eye-occlusion checking regardless of input mode)
    if (handLandmarkerRef.current) {
      try {
        const handResults = handLandmarkerRef.current.detectForVideo(video, timestamp);
        if (handResults && handResults.landmarks && handResults.landmarks.length > 0) {
          // Gather points from all hands detected (supporting up to 2 hands)
          for (const handPoints of handResults.landmarks) {
            detectedHandPoints.push(...handPoints);
          }

          // Draw Hand Landmarks for all detected hands so they get beautiful visual response
          for (const handPoints of handResults.landmarks) {
            drawHand(ctx, handPoints, width);
          }

          // Detect Gesture Pointing (check all hands to support one hand covering eye while other gestures)
          let detectedDirection: Direction | null = null;
          let gestureHandIndex = -1;

          for (let i = 0; i < handResults.landmarks.length; i++) {
            const handPoints = handResults.landmarks[i];
            const direction = detectPointingGesture(handPoints, true);
            if (direction) {
              detectedDirection = direction;
              gestureHandIndex = i;
              break; // Use the first hand that makes a valid pointing gesture
            }
          }

          if (detectedDirection && gestureHandIndex >= 0) {
            const handPointsForGesture = handResults.landmarks[gestureHandIndex];
            // Draw gestured arrow
            drawGestureArrow(ctx, handPointsForGesture[5], handPointsForGesture[8], detectedDirection, width);

            // ONLY trigger selection if the feedback mode is set to Gesture
            if (feedbackMode === FeedbackMode.Gesture) {
              const now = Date.now();
              if (!lastGestureRef.current ||
                lastGestureRef.current.direction !== detectedDirection ||
                now - lastGestureRef.current.timestamp > 2000) {
                lastGestureRef.current = { direction: detectedDirection, timestamp: now };
                onGestureDetected(detectedDirection);
              }
            }
          }
        }
      } catch (err) {
        console.error('HandLandmarker processing error:', err);
      }
    }

    // 2. Process Face Mesh (always active for distance and occlusion detection)
    if (faceLandmarkerRef.current) {
      try {
        const faceResults = faceLandmarkerRef.current.detectForVideo(video, timestamp);
        if (faceResults && faceResults.faceLandmarks && faceResults.faceLandmarks.length > 0) {
          faceDetailsDetected = true;
          const landmarks = faceResults.faceLandmarks[0];

          // Left/Right eye centers
          const leftEyeCenter = {
            x: (landmarks[362].x + landmarks[263].x) / 2,
            y: (landmarks[362].y + landmarks[263].y) / 2
          };
          const rightEyeCenter = {
            x: (landmarks[33].x + landmarks[133].x) / 2,
            y: (landmarks[33].y + landmarks[133].y) / 2
          };

          // Left Eye points center & pupil tracking
          const leftPupil = landmarks[473] || leftEyeCenter; // 473 exists in iris model 
          const rightPupil = landmarks[468] || rightEyeCenter; // 468 exists in iris model

          // Compute Distance in cm
          computedDistance = estimateDistanceCm(leftPupil, rightPupil, 1.0); // standard horizontal focal length scale
          setCurrentDistance(Math.round(computedDistance));
          onDistanceUpdate(computedDistance);

          // Detect Eye Aspects Ratio (EAR) for closures
          const leftEAR = calculateEAR(
            landmarks[362], landmarks[263], // corners
            landmarks[386], landmarks[385], // top lid points
            landmarks[374], landmarks[380]  // bottom lid points
          );

          const rightEAR = calculateEAR(
            landmarks[33], landmarks[133], // corners
            landmarks[159], landmarks[158], // top lid points
            landmarks[145], landmarks[153]  // bottom lid points
          );

          // Standard blink thresholds for EAR (increased from 0.14 to 0.17 for better light/squint tolerance)
          leftEyeClosed = leftEAR < 0.17;
          rightEyeClosed = rightEAR < 0.17;

          // Check if hand landmarks are close to iris centers
          if (detectedHandPoints.length > 0) {
            // Dynamic threshold scaled by the physical distance between pupil landmarks on screen (IPD scale)
            const pupilDist = Math.max(0.01, Math.sqrt(
              (leftEyeCenter.x - rightEyeCenter.x) ** 2 +
              (leftEyeCenter.y - rightEyeCenter.y) ** 2
            ));
            const coverThreshold = pupilDist * 0.85;

            for (const pt of detectedHandPoints) {
              const dxLeft = pt.x - leftEyeCenter.x;
              const dyLeft = pt.y - leftEyeCenter.y;
              const distLeft = Math.sqrt(dxLeft * dxLeft + dyLeft * dyLeft);

              const dxRight = pt.x - rightEyeCenter.x;
              const dyRight = pt.y - rightEyeCenter.y;
              const distRight = Math.sqrt(dxRight * dxRight + dyRight * dyRight);

              if (distLeft < coverThreshold) {
                leftEyeCoveredByHand = true;
              }
              if (distRight < coverThreshold) {
                rightEyeCoveredByHand = true;
              }
            }
          }

          // Draw face markers (HUD)
          drawFaceDiagnostic(
            ctx,
            landmarks,
            width,
            leftEyeClosed || leftEyeCoveredByHand,
            rightEyeClosed || rightEyeCoveredByHand
          );
        }
      } catch (err) {
        console.error('FaceLandmarker processing error:', err);
      }
    }

    // Determine aggregate occlusion status
    const isLeftOccluded = leftEyeClosed || leftEyeCoveredByHand;
    const isRightOccluded = rightEyeClosed || rightEyeCoveredByHand;

    onEyeOcclusionUpdate({ left: isLeftOccluded, right: isRightOccluded });

    // 3. Clinical Warning Flags & Assist Guidance
    if (!faceDetailsDetected) {
      const msg = '未检测到面部，请确保光线充足并正对相机。';
      if (lastToastRef.current !== msg) {
        lastToastRef.current = msg;
        toast.warning(msg);
      }
    } else {
      if (lastToastRef.current !== null) {
        lastToastRef.current = null;
        toast.dismiss();
      }
    }

    requestRef.current = requestAnimationFrame(processingLoop);
  };

  // Diagnostic face overlay rendering (cyan/orange/ruby lines depending on health states)
  const drawFaceDiagnostic = (
    ctx: CanvasRenderingContext2D,
    landmarks: any[],
    width: number,
    leftEyeOccluded: boolean,
    rightEyeOccluded: boolean
  ) => {
    const scaleX = (x: number) => width - x * width; // mirrored
    const scaleY = (y: number) => y * ctx.canvas.height;

    // Draw pupils
    const lp = landmarks[473];
    const rp = landmarks[468];

    // Left Pupil (Observer's right, since mirrored)
    if (lp) {
      ctx.beginPath();
      ctx.arc(scaleX(lp.x), scaleY(lp.y), 6, 0, 2 * Math.PI);
      ctx.fillStyle = leftEyeOccluded ? '#ef4444' : '#10b981';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Right Pupil (Observer's left, since mirrored)
    if (rp) {
      ctx.beginPath();
      ctx.arc(scaleX(rp.x), scaleY(rp.y), 6, 0, 2 * Math.PI);
      ctx.fillStyle = rightEyeOccluded ? '#ef4444' : '#10b981';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Draw bounds for eyebrows & bridge to look stylish
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)';
    ctx.lineWidth = 1.5;

    // Draw simple eyebrows, chin trace
    const faceContourIndices = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
    ctx.beginPath();
    ctx.moveTo(scaleX(landmarks[faceContourIndices[0]].x), scaleY(landmarks[faceContourIndices[0]].y));
    for (let i = 1; i < faceContourIndices.length; i++) {
      ctx.lineTo(scaleX(landmarks[faceContourIndices[i]].x), scaleY(landmarks[faceContourIndices[i]].y));
    }
    ctx.closePath();
    ctx.stroke();

    // Eye status labels overlay
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.textAlign = 'center';

    // Left Eye Label (Right side in observer scope)
    if (lp) {
      ctx.fillStyle = leftEyeOccluded ? '#ef4444' : '#10b981';
      ctx.fillText(
        leftEyeOccluded ? '左眼：已遮挡/闭合' : '左眼：正常睁开',
        scaleX(lp.x),
        scaleY(lp.y) - 24
      );
    }

    // Right Eye Label (Left side in observer scope)
    if (rp) {
      ctx.fillStyle = rightEyeOccluded ? '#ef4444' : '#10b981';
      ctx.fillText(
        rightEyeOccluded ? '右眼：已遮挡/闭合' : '右眼：正常睁开',
        scaleX(rp.x),
        scaleY(rp.y) - 24
      );
    }
  };

  // Draw hand bones & connections in real time
  const drawHand = (ctx: CanvasRenderingContext2D, landmarks: any[], width: number) => {
    const scaleX = (x: number) => width - x * width; // mirrored
    const scaleY = (y: number) => y * ctx.canvas.height;

    // Joints index connections
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4], // thumb
      [0, 5], [5, 6], [6, 7], [7, 8], // index
      [5, 9], [9, 10], [10, 11], [11, 12], // middle
      [9, 13], [13, 14], [14, 15], [15, 16], // ring
      [13, 17], [17, 18], [18, 19], [19, 20], // pinky
      [0, 17] // palm boundary
    ];

    ctx.strokeStyle = '#818cf8';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';

    connections.forEach(([s, e]) => {
      ctx.beginPath();
      ctx.moveTo(scaleX(landmarks[s].x), scaleY(landmarks[s].y));
      ctx.lineTo(scaleX(landmarks[e].x), scaleY(landmarks[e].y));
      ctx.stroke();
    });

    // Joints points
    landmarks.forEach((pt, idx) => {
      ctx.beginPath();
      ctx.arc(scaleX(pt.x), scaleY(pt.y), idx === 8 ? 7 : 4, 0, 2 * Math.PI);
      ctx.fillStyle = idx === 8 ? '#f43f5e' : '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#4f46e5';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  };

  // Overlay an gorgeous neon feedback arrow illustrating hand pointing direction
  const drawGestureArrow = (
    ctx: CanvasRenderingContext2D,
    basePt: any,
    tipPt: any,
    direction: Direction,
    width: number
  ) => {
    const scaleX = (x: number) => width - x * width;
    const scaleY = (y: number) => y * ctx.canvas.height;

    const x1 = scaleX(basePt.x);
    const y1 = scaleY(basePt.y);
    const x2 = scaleX(tipPt.x);
    const y2 = scaleY(tipPt.y);

    // Render glow vector arrow 
    ctx.strokeStyle = '#fb7185';
    ctx.shadowColor = '#f43f5e';
    ctx.shadowBlur = 10;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Arrow Head
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const r = 15;
    ctx.fillStyle = '#fb7185';
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - r * Math.cos(angle - Math.PI / 6), y2 - r * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - r * Math.cos(angle + Math.PI / 6), y2 - r * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();

    // Direction text caption
    ctx.shadowBlur = 0; // reset
    ctx.font = 'black 16px Inter, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#e11d48';
    ctx.lineWidth = 3;
    ctx.textAlign = 'center';

    let label = '';
    switch (direction) {
      case Direction.Up: label = '👆 指向上 (UP)'; break;
      case Direction.Down: label = '👇 指向下 (DOWN)'; break;
      case Direction.Left: label = '👈 指向左 (LEFT)'; break;
      case Direction.Right: label = '👉 指向右 (RIGHT)'; break;
    }
    ctx.strokeText(label, x2, y2 - 20);
    ctx.fillText(label, x2, y2 - 20);
  };

  return (
    <div className="w-full rounded-2xl overflow-hidden relative">
      {isLoading ? (
        <BorderBeam>
          <div className="w-full max-h-[280px] aspect-video flex flex-col items-center justify-center bg-slate-950 p-6 text-center">
            <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
            <div className="text-slate-200 font-medium mb-1">{loadStatus}</div>
            <div className="text-slate-500 text-xs text-center max-w-sm">
              AI 组件文件由 Google Cloud Storage 静态下发。首次加载可能需要 5-15 秒。
            </div>
          </div>
        </BorderBeam>
      ) : (
        <div className="relative">
          {/* Active webcam stream element hidden visually but layout-active so browser plays stream */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute -z-10 opacity-0 pointer-events-none w-1 h-1"
          />

          {/* Canvas where composite mirroring and HUD overlays occur */}
          <BorderBeam active={isStartingCamera}>
            <div className="relative w-full aspect-video overflow-hidden">
              <canvas
                ref={canvasRef}
                className="w-full h-full object-cover"
              />

              {/* Loading prompt when camera is starting */}
              {isStartingCamera && (
                <div className="absolute inset-0 bg-slate-50/80 rounded-2xl border border-slate-100 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                  <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
                  <div className="text-slate-600 font-semibold mb-1">正在启动相机 ...</div>
                  <div className="text-slate-400 text-xs text-center max-w-xs">
                    请允许浏览器访问摄像头权限
                  </div>
                </div>
              )}

              {/* Prompt when camera permission is denied */}
              {hasPermission === false && (
                <div className="absolute inset-0 bg-slate-50/80 rounded-2xl border border-slate-100 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center space-y-3">
                  <VideoOff className="w-12 h-12 text-rose-500 mx-auto" />
                  <h4 className="text-slate-700 font-bold text-lg">相机访问被拒绝</h4>
                  <p className="text-slate-500 text-xs text-center max-w-xs">
                    需要相机访问授权来自动估算<b>面部与屏幕距离</b>、检查您<b>是否捂住了一只眼</b>，及接收<b>手势划动字符反馈</b>。请在浏览器地址栏顶端恢复相机授权许可
                  </p>
                </div>
              )}

              {/* Float HUD Details */}
              {/* {isCameraActive && (
              <div className="absolute top-4 left-4 right-4 flex justify-between gap-4 pointer-events-none">
                <div className="bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-white font-mono text-xs flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>AI 自动测距: <strong className="text-indigo-400 text-sm">{currentDistance}</strong> cm</span>
                </div>

                <div className="bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-white font-mono text-xs flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-indigo-400" />
                  <span>
                    测试眼: {eyeTested === EyeToTest.Right ? <strong className="text-emerald-400">右眼 (遮左眼)</strong> : eyeTested === EyeToTest.Left ? <strong className="text-emerald-400">左眼 (遮右眼)</strong> : <strong className="text-cyan-400">双眼同时</strong>}
                  </span>
                </div>
              </div>
            )} */}

            </div>
          </BorderBeam>
        </div>
      )}
    </div>
  );
});

CameraManager.displayName = 'CameraManager';
export default CameraManager;
