
import React, { useRef, useEffect, useState } from 'react';
import { GameItem } from '../types';
import { Eraser, Pencil } from 'lucide-react';

interface TracingGameProps {
  item: GameItem;
  onComplete: () => void;
  speak: (text: string) => void;
}

export const TracingGame: React.FC<TracingGameProps> = ({ item, onComplete, speak }) => {
  // Layer 1: The Visual Guide (Bottom)
  const guideCanvasRef = useRef<HTMLCanvasElement>(null);
  // Layer 2: The User Drawing (Top)
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Logic Layers (Hidden)
  const maskCanvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas')); // Solid shape for hit testing
  const userLogicCanvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas')); // Copy of user stroke for logic

  const lastPos = useRef<{x: number, y: number} | null>(null);
  const totalShapePixels = useRef<number>(0);

  // Initialize Canvases and Guide
  useEffect(() => {
    const container = containerRef.current;
    const guideCanvas = guideCanvasRef.current;
    const drawingCanvas = drawingCanvasRef.current;
    
    if (!container || !guideCanvas || !drawingCanvas) return;

    const resizeAndDraw = () => {
      if (!container) return;
      
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      // Dimensions
      const width = rect.width;
      const height = rect.height;

      // CRITICAL FIX: Prevent IndexSizeError if dimensions are 0 (hidden or initializing)
      if (width === 0 || height === 0) return;

      // 1. Setup Display Canvases (Scaled for Retina)
      [guideCanvas, drawingCanvas].forEach(cvs => {
          cvs.width = width * dpr;
          cvs.height = height * dpr;
          cvs.style.width = `${width}px`;
          cvs.style.height = `${height}px`;
          const ctx = cvs.getContext('2d');
          if(ctx) {
              ctx.scale(dpr, dpr);
              ctx.lineCap = 'round';
              ctx.lineJoin = 'round';
          }
      });

      // 2. Setup Logic Canvases (1:1 with Display buffer for easier pixel reading)
      [maskCanvasRef.current, userLogicCanvasRef.current].forEach(cvs => {
          cvs.width = width * dpr; // Use physical pixels for logic
          cvs.height = height * dpr;
      });

      // 3. Draw The Guide (Visual Layer)
      const gCtx = guideCanvas.getContext('2d');
      if (gCtx) {
          gCtx.clearRect(0, 0, width, height);
          
          // Font Config - Larger Size (0.85)
          const fontSize = Math.min(width, height) * 0.85; 
          gCtx.font = `900 ${fontSize}px 'Fredoka', sans-serif`;
          gCtx.textAlign = 'center';
          gCtx.textBaseline = 'middle';
          const cx = width / 2;
          const cy = height / 2 + (fontSize * 0.05);

          // Inner Fill (Gray)
          gCtx.fillStyle = '#f1f5f9'; 
          gCtx.fillText(item.text, cx, cy);

          // Dashed Outline - Thinner (2px)
          gCtx.strokeStyle = '#cbd5e1';
          gCtx.lineWidth = 3; 
          gCtx.setLineDash([10, 10]);
          gCtx.strokeText(item.text, cx, cy);
          gCtx.setLineDash([]);
      }

      // 4. Draw The Mask (Logic Layer - Hidden)
      const mCtx = maskCanvasRef.current.getContext('2d');
      if (mCtx) {
          mCtx.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
          // Logic uses physical pixels, so scale logic is manual or font size needs adjustment
          // Since we set width/height to *dpr, we treat it as a big canvas.
          
          const fontSize = Math.min(width * dpr, height * dpr) * 0.85;
          mCtx.font = `900 ${fontSize}px 'Fredoka', sans-serif`;
          mCtx.textAlign = 'center';
          mCtx.textBaseline = 'middle';
          mCtx.fillStyle = '#FF0000'; // Pure Red for mask
          mCtx.fillText(item.text, (width * dpr)/2, (height * dpr)/2 + (fontSize * 0.05));

          // Calculate Total Pixels in Shape
          try {
            const imgData = mCtx.getImageData(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
            let count = 0;
            // Sample every 4th pixel (step 16 in array) for speed
            for(let i = 3; i < imgData.data.length; i += 16) {
                if (imgData.data[i] > 128) count++;
            }
            totalShapePixels.current = count;
          } catch (e) {
            console.error("Error calculating shape pixels:", e);
          }
      }
      
      // Clear user logic canvas
      const uCtx = userLogicCanvasRef.current.getContext('2d');
      if(uCtx) uCtx.clearRect(0,0, userLogicCanvasRef.current.width, userLogicCanvasRef.current.height);
    };

    // Use ResizeObserver to handle container sizing updates reliably
    const resizeObserver = new ResizeObserver(() => {
        resizeAndDraw();
    });
    
    resizeObserver.observe(container);
    
    // Announce
    const timeout = setTimeout(() => speak(`Vamos desenhar: ${item.spokenText || item.text}`), 500);

    return () => {
      resizeObserver.disconnect();
      clearTimeout(timeout);
    };
  }, [item, speak]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    // Return visual coordinates (CSS pixels)
    return {
      x: (clientX - rect.left),
      y: (clientY - rect.top)
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    lastPos.current = { x, y };
    drawStep(e);
  };

  const drawStep = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault(); // Prevent scroll

    const { x, y } = getCoordinates(e);
    const dpr = window.devicePixelRatio || 1;

    // 1. Draw Visual (CSS Pixels context)
    const vCtx = drawingCanvasRef.current?.getContext('2d');
    if (vCtx && lastPos.current) {
        vCtx.beginPath();
        vCtx.lineWidth = 35; // Thicker brush for easier filling
        vCtx.strokeStyle = item.color;
        vCtx.moveTo(lastPos.current.x, lastPos.current.y);
        vCtx.lineTo(x, y);
        vCtx.stroke();
    }

    // 2. Draw Logic (Physical Pixels context)
    const lCtx = userLogicCanvasRef.current.getContext('2d');
    if (lCtx && lastPos.current) {
        lCtx.beginPath();
        lCtx.lineCap = 'round';
        lCtx.lineJoin = 'round';
        lCtx.lineWidth = 35 * dpr; // Scale stroke for logic
        lCtx.strokeStyle = '#00FF00'; // Green for user
        lCtx.moveTo(lastPos.current.x * dpr, lastPos.current.y * dpr);
        lCtx.lineTo(x * dpr, y * dpr);
        lCtx.stroke();
    }

    lastPos.current = { x, y };
  };

  const checkScore = () => {
      setIsDrawing(false);
      lastPos.current = null;

      // Validate Score
      const w = maskCanvasRef.current.width;
      const h = maskCanvasRef.current.height;
      
      // Safety check
      if (w === 0 || h === 0) return;

      const mCtx = maskCanvasRef.current.getContext('2d');
      const uCtx = userLogicCanvasRef.current.getContext('2d');

      if (!mCtx || !uCtx) return;

      try {
          const maskData = mCtx.getImageData(0, 0, w, h).data;
          const userData = uCtx.getImageData(0, 0, w, h).data;

          let insideHits = 0;
          let outsideMisses = 0;
          
          // Sample every 4th pixel (step 16) for performance
          for (let i = 0; i < maskData.length; i += 16) {
              const isGuide = maskData[i + 3] > 128; // Is this pixel part of the letter?
              const isUser = userData[i + 3] > 128;  // Did the user draw here?

              if (isUser) {
                  if (isGuide) {
                      insideHits++;
                  } else {
                      outsideMisses++;
                  }
              }
          }

          // Total pixels in the letter (estimated from sample)
          const total = totalShapePixels.current;
          
          if (total === 0) return;

          const coverage = insideHits / total;
          
          // Logic Rules:
          // 1. Coverage must be at least 70% (Forgiving)
          // 2. Outside Misses must not exceed Inside Hits (Prevents full screen scribbling)
          //    If you draw twice as much outside as inside, you fail.
          
          const isCleanEnough = outsideMisses < (insideHits * 1.5); 
          const isFilledEnough = coverage > 0.70;

          console.log(`Coverage: ${(coverage*100).toFixed(0)}%, Hits: ${insideHits}, Misses: ${outsideMisses}`);

          if (isFilledEnough && isCleanEnough) {
              onComplete();
          }

      } catch (e) {
          console.error(e);
      }
  };

  const clearCanvas = () => {
      const drawingCanvas = drawingCanvasRef.current;
      const userLogicCanvas = userLogicCanvasRef.current;
      
      // Only clear the drawing layers, leave the guide layer alone
      if (drawingCanvas) {
          const ctx = drawingCanvas.getContext('2d');
          // Scale aware clear
          ctx?.save();
          ctx?.setTransform(1, 0, 0, 1, 0, 0);
          ctx?.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
          ctx?.restore();
      }
      
      if (userLogicCanvas) {
          const ctx = userLogicCanvas.getContext('2d');
          ctx?.clearRect(0, 0, userLogicCanvas.width, userLogicCanvas.height);
      }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative animate-in fade-in zoom-in">
      <div 
        ref={containerRef}
        className="relative w-[min(70vh,85vw)] aspect-square bg-white rounded-3xl shadow-xl border-4 border-slate-100 overflow-hidden touch-none"
      >
        {/* Layer 1: Guide (Static) */}
        <canvas
            ref={guideCanvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none z-0"
        />
        
        {/* Layer 2: User Drawing (Interactive) */}
        <canvas
          ref={drawingCanvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair touch-none z-10"
          onMouseDown={startDrawing}
          onMouseMove={drawStep}
          onMouseUp={checkScore}
          onMouseLeave={checkScore}
          onTouchStart={startDrawing}
          onTouchMove={drawStep}
          onTouchEnd={checkScore}
        />
        
        {/* Helper Icon */}
        <div className="absolute top-4 right-4 pointer-events-none opacity-50 animate-pulse z-20">
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
