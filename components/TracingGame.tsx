
import React, { useRef, useEffect, useState } from 'react';
import { GameItem } from '../types';
import { Eraser, Pencil } from 'lucide-react';

interface TracingGameProps {
  item: GameItem;
  onComplete: () => void;
  speak: (text: string) => void;
}

export const TracingGame: React.FC<TracingGameProps> = ({ item, onComplete, speak }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  // Stores the set of pixels (as string "x,y") that belong to the letter and have been covered
  const coveredPixelsRef = useRef<Set<string>>(new Set());
  const totalPixelsRef = useRef<number>(0);
  const guidePixelsRef = useRef<Set<string>>(new Set()); // Map of "x,y" strings that are part of the letter
  const [progress, setProgress] = useState(0);

  // Initialize Canvas and Draw Guide
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const resizeAndDraw = () => {
      // Set canvas size to match container
      const rect = container.getBoundingClientRect();
      // Double resolution for retina displays
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      
      ctx.scale(dpr, dpr);
      drawGuide(ctx, rect.width, rect.height);
    };

    // Calculate guide pixels for hit testing
    const drawGuide = (context: CanvasRenderingContext2D, width: number, height: number) => {
      context.clearRect(0, 0, width, height);
      
      // Font settings
      const fontSize = Math.min(width, height) * 0.7;
      context.font = `900 ${fontSize}px 'Fredoka', sans-serif`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      const x = width / 2;
      const y = height / 2 + (fontSize * 0.05); // Visual adjustment

      // 1. Draw solid text on an offscreen canvas (or mentally) to calculate hit area
      // We do this by drawing on the main canvas first, reading data, then clearing
      context.fillStyle = '#000000';
      context.fillText(item.text, x, y);
      
      const imageData = context.getImageData(0, 0, width * window.devicePixelRatio, height * window.devicePixelRatio);
      const data = imageData.data;
      const guideSet = new Set<string>();
      let pixelCount = 0;
      
      // Sampling rate to improve performance (check every 4th pixel)
      const step = 4; 
      const widthPx = canvas.width;

      for (let i = 0; i < data.length; i += 4 * step) {
         // Check alpha channel > 0
         if (data[i + 3] > 128) {
            const pixelIndex = i / 4;
            const px = pixelIndex % widthPx;
            const py = Math.floor(pixelIndex / widthPx);
            // Store logical coordinates (divided by DPR if we were tracking logical, but let's track physical)
            guideSet.add(`${px},${py}`);
            pixelCount++;
         }
      }
      
      guidePixelsRef.current = guideSet;
      totalPixelsRef.current = pixelCount;
      coveredPixelsRef.current = new Set();
      setProgress(0);

      // 2. Clear and Draw the Visual Guide (Dashed)
      context.clearRect(0, 0, width, height);
      
      // Draw inner fill (light gray)
      context.fillStyle = '#f1f5f9'; // slate-100
      context.fillText(item.text, x, y);

      // Draw dashed outline
      context.strokeStyle = '#cbd5e1'; // slate-300
      context.lineWidth = 4;
      context.setLineDash([15, 15]);
      context.strokeText(item.text, x, y);
      context.setLineDash([]); // Reset
    };

    resizeAndDraw();
    window.addEventListener('resize', resizeAndDraw);
    
    // Announce letter on mount
    const timeout = setTimeout(() => speak(`Vamos desenhar: ${item.spokenText || item.text}`), 500);

    return () => {
      window.removeEventListener('resize', resizeAndDraw);
      clearTimeout(timeout);
    };
  }, [item, speak]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: (clientX - rect.left) * dpr,
      y: (clientY - rect.top) * dpr
    };
  };

  const checkCoverage = (x: number, y: number, radius: number) => {
    // Check pixels around the brush cursor against the guide set
    const rSq = radius * radius;
    const guide = guidePixelsRef.current;
    const covered = coveredPixelsRef.current;
    let newCoverage = 0;

    for (let dx = -radius; dx <= radius; dx+=2) {
      for (let dy = -radius; dy <= radius; dy+=2) {
        if (dx*dx + dy*dy <= rSq) {
          const px = Math.floor(x + dx);
          const py = Math.floor(y + dy);
          
          // Check sampling keys nearby
          // Since we sampled every 4 pixels in setup, we check loosely
          const key = `${px},${py}`;
          // Also check neighborhood due to sampling grid
          // Simple heuristic: if we paint over the area, we assume we hit the sampled pixels
          // To be precise: find the nearest sampled pixel
          
          // Optimized: Just map brush to guide space. 
          // Actually, let's just use the brush to "paint" into the set.
          
          // Re-approach: Iterate through guide pixels? No, too slow.
          // Correct approach: We need to map the brush stroke to the guide keys.
          // Since guide keys are sparse (step=4), we should quantize user input too.
          const qx = Math.floor(px / 4) * 4; 
          // Note: The loop in useEffect was flat `i += 4*step`.
          // Let's stick to a simpler hit test.
        }
      }
    }
  };

  // Simplified Hit Logic:
  // Instead of complex pixel matching, we just track "painted points" relative to bounding box?
  // No, let's stick to the pixel mask but optimize.
  // We will perform the check in `draw`.

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault(); // Prevent scrolling on touch

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const { x, y } = getCoordinates(e);
    const dpr = window.devicePixelRatio || 1;
    // Scale visual brush size
    const brushSize = 25 * dpr;

    // Draw Line
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = item.color; // Use item color
    
    // Smooth drawing would require tracking previous point, 
    // but for simple "filling" detection, dots/short lines are okay.
    // For standard tracing visuals, we need paths.
    // We'll rely on the default path behavior if we tracked prev coords, 
    // but here we just draw circles/lines for simplicity of the "Game" component logic wrapper
    // Let's implement lineTo if we had prev coords. 
    // For now, simple "dot" painting is easier to implement robustly without state lag.
    
    // To make it look like a line, we connect dots.
    // However, to keep this component concise, we'll assume high event rate.
    ctx.beginPath();
    ctx.arc(x / dpr, y / dpr, 15, 0, Math.PI * 2); // Visual draw in CSS pixels context (scaled by transform usually, but here we scaled ctx)
    // Actually ctx is scaled by dpr. so input x,y (physical) needs to be divided by dpr to match ctx logical coords?
    // Wait, in useEffect we did `ctx.scale(dpr, dpr)`. 
    // So drawing commands use CSS pixels (logical).
    // `getCoordinates` returns PHYSICAL pixels.
    // So we pass x/dpr, y/dpr.
    ctx.fillStyle = item.color;
    ctx.fill();

    // Hit Testing Logic
    // We check a grid around the touch point
    const guide = guidePixelsRef.current;
    const covered = coveredPixelsRef.current;
    const checkRadius = 15 * dpr; // Physical radius
    
    // Optimization: Only check every few pixels in the brush
    for (let cx = x - checkRadius; cx <= x + checkRadius; cx += 4) {
       for (let cy = y - checkRadius; cy <= y + checkRadius; cy += 4) {
          // Check if this physical pixel is in our guide set
          // The guide set keys are "x,y" physical
          // We need to snap to the grid used in generation (step = 4)
          // The generation loop was just i+=16. 
          // Let's just check exact matches or near matches.
          // To ensure matches, let's broaden the key check or standardise keys.
          // Simplest: `Math.round(cx/4)*4`
          const key = `${Math.floor(cx)},${Math.floor(cy)}`; // This is too strict without alignment
          
          // Let's check the sampling logic again. 
          // guideSet.add(`${px},${py}`); where px/py are exact from data array.
          // The data array iterates simply.
          
          // Let's just iterate the Guide Set? No, huge.
          // Let's assume if the user draws near the center, it counts.
          
          // Working approach: Check if `cx, cy` exists in Set.
          // Since set is sparse (step 4), we search neighborhood?
          // No, let's make the Set dense in `useEffect` (remove step) OR make brush check dense.
          // Let's make the Set dense (remove step in useEffect) for accuracy,
          // but limit loop to bounds.
       }
    }
  };
  
  // RE-IMPLEMENTATION OF DRAW/LOGIC FOR PERFORMANCE AND ACCURACY
  // 1. We track the `lastPos` to draw continuous lines.
  // 2. We use a hidden canvas for the hit test calculation to avoid reading pixel data constantly.

  const lastPos = useRef<{x: number, y: number} | null>(null);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const coords = getCoordinates(e);
    // Adjust for context scale
    const dpr = window.devicePixelRatio || 1;
    lastPos.current = { x: coords.x / dpr, y: coords.y / dpr };
    drawStep(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    lastPos.current = null;
    
    // Check win condition on lift
    if (progress > 85) {
        onComplete();
    }
  };

  const drawStep = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const coords = getCoordinates(e);
    const dpr = window.devicePixelRatio || 1;
    const currentX = coords.x / dpr;
    const currentY = coords.y / dpr;

    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && lastPos.current) {
        ctx.beginPath();
        ctx.lineWidth = 25;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = item.color;
        ctx.moveTo(lastPos.current.x, lastPos.current.y);
        ctx.lineTo(currentX, currentY);
        ctx.stroke();
    }
    
    lastPos.current = { x: currentX, y: currentY };
    
    // Hit Test (Statistical)
    // Instead of precise pixel matching which is slow, we can just calculate
    // distance from center path if we had paths. 
    // Since we have raster text, let's use a simpler "Paint bucket" metric?
    // Or just count valid painted pixels.
    
    // Efficient Hit Test:
    // Only check the new segment drawn.
    // Calculate painted pixels in the guide.
    // Given the complexity of "erasing" guide pixels from a Set in JS on `touchmove` (high freq),
    // let's do a probabilistic check or periodic check.
    
    // Let's update progress simply based on "amount of drawing events" inside the box? 
    // Too hacky.
    
    // Let's use the `globalCompositeOperation` trick!
    // 1. Canvas layer 1: The Guide (Filled, Black).
    // 2. Canvas layer 2: The User Drawing (Red).
    // 3. To check score: Draw Layer 2 onto Layer 1 with `source-in`.
    //    The result is only the pixels where *both* exist.
    //    Count those pixels. Compare to total pixels in Layer 1.
    // This is fast enough to do on `touchend`.
  };
  
  // We need a secondary hidden canvas for the "Score Logic"
  const scoreCanvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const userCanvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas')); // Holds user stroke only

  useEffect(() => {
     // Init Score Canvases
     const rect = containerRef.current?.getBoundingClientRect();
     if (rect) {
         const dpr = window.devicePixelRatio || 1;
         
         // Setup Guide Mask Canvas
         scoreCanvasRef.current.width = rect.width * dpr;
         scoreCanvasRef.current.height = rect.height * dpr;
         const scoreCtx = scoreCanvasRef.current.getContext('2d');
         if (scoreCtx) {
             const fontSize = Math.min(rect.width, rect.height) * 0.7;
             scoreCtx.scale(dpr, dpr);
             scoreCtx.font = `900 ${fontSize}px 'Fredoka', sans-serif`;
             scoreCtx.textAlign = 'center';
             scoreCtx.textBaseline = 'middle';
             scoreCtx.fillStyle = '#FF0000'; // Mask color
             scoreCtx.fillText(item.text, rect.width/2, rect.height/2 + (fontSize * 0.05));
             
             // Calculate Total Pixels
             // Only scan a smaller bounding box for performance? No, scan all once.
             const id = scoreCtx.getImageData(0,0, scoreCanvasRef.current.width, scoreCanvasRef.current.height);
             let count = 0;
             for(let i=3; i<id.data.length; i+=4) { if(id.data[i] > 100) count++; }
             totalPixelsRef.current = count;
         }

         // Setup User Stroke Canvas
         userCanvasRef.current.width = rect.width * dpr;
         userCanvasRef.current.height = rect.height * dpr;
         const userCtx = userCanvasRef.current.getContext('2d');
         if (userCtx) {
             userCtx.scale(dpr, dpr);
             userCtx.lineCap = 'round';
             userCtx.lineJoin = 'round';
             userCtx.lineWidth = 25;
             userCtx.strokeStyle = '#FF0000';
         }
     }
  }, [item]);

  const drawStepOptimized = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing) return;
      const coords = getCoordinates(e);
      const dpr = window.devicePixelRatio || 1;
      const currentX = coords.x / dpr;
      const currentY = coords.y / dpr;

      // Draw visual feedback on main canvas
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx && lastPos.current) {
        ctx.beginPath();
        ctx.lineWidth = 30; // Thicker for forgiving feel
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = item.color;
        ctx.moveTo(lastPos.current.x, lastPos.current.y);
        ctx.lineTo(currentX, currentY);
        ctx.stroke();
      }

      // Draw logical stroke on User Canvas
      const userCtx = userCanvasRef.current.getContext('2d');
      if (userCtx && lastPos.current) {
          userCtx.beginPath();
          userCtx.moveTo(lastPos.current.x, lastPos.current.y);
          userCtx.lineTo(currentX, currentY);
          userCtx.stroke();
      }
      
      lastPos.current = { x: currentX, y: currentY };
  };

  const checkScore = () => {
      stopDrawing();
      
      // Perform pixel analysis
      // Create a temporary canvas to composite
      const w = scoreCanvasRef.current.width;
      const h = scoreCanvasRef.current.height;
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = w;
      tempCanvas.height = h;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;

      // 1. Draw Guide Mask
      tempCtx.drawImage(scoreCanvasRef.current, 0, 0);
      
      // 2. Composite User Drawing (Keep only overlapping)
      tempCtx.globalCompositeOperation = 'source-in';
      tempCtx.drawImage(userCanvasRef.current, 0, 0);
      
      // 3. Count pixels
      // Optimization: Downscale for counting? 
      // Reading 1000x1000 pixels is ~4MB data. It's okay on modern devices once per stroke end.
      try {
          const imageData = tempCtx.getImageData(0, 0, w, h);
          let hits = 0;
          // Step 8 for speed
          for(let i=3; i<imageData.data.length; i+=32) { 
              if(imageData.data[i] > 50) hits++; 
          }
          
          // We stepped by 8 (indices) = 32 bytes (4 bytes per pixel * 8 pixels)
          // So totalPixels should also be estimated by step 8 or we normalize.
          // Let's just compare raw hits to estimated total.
          // To be safe, let's just count total with same step.
          
          // Re-calculate total with same step for fairness
          const guideData = scoreCanvasRef.current.getContext('2d')?.getImageData(0,0,w,h);
          let total = 0;
          if (guideData) {
            for(let i=3; i<guideData.data.length; i+=32) { 
                if(guideData.data[i] > 50) total++; 
            }
          }
          
          const percentage = total > 0 ? (hits / total) * 100 : 0;
          setProgress(percentage);
          
          if (percentage > 85) {
              onComplete();
          }
      } catch (e) {
          console.error("Pixel read error", e);
      }
  };

  const clearCanvas = () => {
      const canvas = canvasRef.current;
      const userCtx = userCanvasRef.current.getContext('2d');
      const w = userCanvasRef.current.width;
      const h = userCanvasRef.current.height;
      
      // Clear visual
      if (canvas && containerRef.current) {
          const ctx = canvas.getContext('2d');
          const rect = containerRef.current.getBoundingClientRect();
          // Redraw guide logic (simplified copy paste or extract function)
          // Triggering a resize event or state change is cleaner
          // Let's just force a re-render of effect by toggling a dummy state or calling init
          // Simply clearing the rect isn't enough cause we lost the guide.
          // We need to redraw the guide.
          // Easiest: clear userCanvas and force update
      }
      
      // Clear Logic
      userCtx?.clearRect(0,0, w, h);
      
      // Hack to redraw guide: 
      // We will rely on the parent or a refresh key, but actually we can just redraw the guide here.
      // But `drawGuide` is inside useEffect.
      // Let's simple utilize the `item` dependency of useEffect.
      // But we are in same item. 
      // Let's just re-fire effect? No.
      // We can manually clear Main Canvas and re-call drawing code if we extracted it.
      // For now, let's keep it simple: The eraser button just re-renders the component? 
      // No, that flashes. 
      
      // Let's just clear rect and fill text again.
      const ctx = canvasRef.current?.getContext('2d');
      const rect = containerRef.current?.getBoundingClientRect();
      if (ctx && rect) {
         const dpr = window.devicePixelRatio || 1;
         ctx.clearRect(0,0, rect.width*dpr, rect.height*dpr);
         // Quick Redraw Guide (Code Duplication from useEffect but acceptable for isolation)
         const fontSize = Math.min(rect.width, rect.height) * 0.7;
         ctx.font = `900 ${fontSize}px 'Fredoka', sans-serif`;
         ctx.textAlign = 'center';
         ctx.textBaseline = 'middle';
         const x = (rect.width*dpr) / 2;
         const y = (rect.height*dpr) / 2 + (fontSize * 0.05);
         ctx.fillStyle = '#f1f5f9';
         ctx.fillText(item.text, x, y);
         ctx.strokeStyle = '#cbd5e1';
         ctx.lineWidth = 4;
         ctx.setLineDash([15, 15]);
         ctx.strokeText(item.text, x, y);
         ctx.setLineDash([]);
      }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative animate-in fade-in zoom-in">
      <div 
        ref={containerRef}
        className="relative w-[min(70vh,85vw)] aspect-square bg-white rounded-3xl shadow-xl border-4 border-slate-100 overflow-hidden touch-none"
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={drawStepOptimized}
          onMouseUp={checkScore}
          onMouseLeave={checkScore}
          onTouchStart={startDrawing}
          onTouchMove={drawStepOptimized}
          onTouchEnd={checkScore}
        />
        
        {/* Helper Icon */}
        <div className="absolute top-4 right-4 pointer-events-none opacity-50 animate-pulse">
            <Pencil size={32} className="text-slate-400" />
        </div>
      </div>

      {/* Controls */}
      <div className="mt-6 flex gap-4">
          <button 
            onClick={clearCanvas}
            className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-slate-200 rounded-full text-slate-500 font-bold shadow-sm active:scale-95 transition-all hover:bg-slate-50"
          >
              <Eraser size={20} />
              Limpar
          </button>
      </div>
    </div>
  );
};
