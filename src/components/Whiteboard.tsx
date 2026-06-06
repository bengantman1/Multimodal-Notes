/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { Pencil, Square, Eraser, Sparkles, Trash2, ArrowRight, Loader2, Info } from 'lucide-react';

interface WhiteboardProps {
  onSuggestNotes?: (notesText: string) => void;
}

export default function Whiteboard({ onSuggestNotes }: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'pencil' | 'rectangle' | 'eraser'>('pencil');
  const [color, setColor] = useState('#0f172a'); // Default slate-900
  const [lineWidth, setLineWidth] = useState(3);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Maintain starting coords for rectangles
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [snapshot, setSnapshot] = useState<ImageData | null>(null);

  const colors = [
    { value: '#0f172a', label: 'Slate' },
    { value: '#10b981', label: 'Emerald' },
    { value: '#3b82f6', label: 'Blue' },
    { value: '#f59e0b', label: 'Amber' },
    { value: '#ef4444', label: 'Rose' },
    { value: '#8b5cf6', label: 'Violet' },
  ];

  useEffect(() => {
    initCanvas();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Get parent bounds
    const rect = canvas.parentElement?.getBoundingClientRect();
    canvas.width = (rect?.width || 500) * 2; // high res
    canvas.height = (rect?.height || 360) * 2;
    canvas.style.width = '100%';
    canvas.style.height = '100%';

    const context = canvas.getContext('2d');
    if (!context) return;

    context.scale(2, 2);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    contextRef.current = context;

    // Clear with clean off-white background so vision models can read it perfectly
    context.fillStyle = '#f8fafc'; // slate-50
    context.fillRect(0, 0, canvas.width, canvas.height);
  };

  const handleResize = () => {
    // Keep drawings if possible, but resize canvas
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = contextRef.current;
    if (!context) return;

    // Save temporary state
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      tempCtx.drawImage(canvas, 0, 0);
    }

    const rect = canvas.parentElement?.getBoundingClientRect();
    canvas.width = (rect?.width || 500) * 2;
    canvas.height = (rect?.height || 360) * 2;
    
    // Scale reset
    context.scale(2, 2);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.fillStyle = '#f8fafc';
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Redraw what we had
    context.drawImage(tempCanvas, 0, 0, canvas.width / 2, canvas.height / 2);
  };

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    // Check if touch event
    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    // Prevent scrolling for mobile touch
    if (e.cancelable) {
      e.preventDefault();
    }

    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;

    // Save snapshot for rectangle preview
    if (tool === 'rectangle') {
      const liveContext = canvas.getContext('2d');
      if (liveContext) {
        setSnapshot(liveContext.getImageData(0, 0, canvas.width, canvas.height));
      }
    }

    context.beginPath();
    context.moveTo(x, y);
    setStartX(x);
    setStartY(y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    // Prevent scrolling for mobile touch
    if (e.cancelable) {
      e.preventDefault();
    }

    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;

    context.strokeStyle = tool === 'eraser' ? '#f8fafc' : color;
    context.lineWidth = tool === 'eraser' ? lineWidth * 4 : lineWidth;

    if (tool === 'pencil' || tool === 'eraser') {
      context.lineTo(x, y);
      context.stroke();
    } else if (tool === 'rectangle' && snapshot) {
      // Restore state
      const liveContext = canvas.getContext('2d');
      if (liveContext) {
        liveContext.putImageData(snapshot, 0, 0);
      }
      context.beginPath();
      // Draw preview matching current properties
      context.strokeStyle = color;
      context.lineWidth = lineWidth;
      context.rect(startX, startY, x - startX, y - startY);
      context.stroke();
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    const context = contextRef.current;
    if (context) {
      context.closePath();
    }
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;
    context.fillStyle = '#f8fafc';
    context.fillRect(0, 0, canvas.width, canvas.height);
  };

  // Capture canvas state as Base64 and send to Gemini Vision API
  const analyzeWithGemini = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsAnalyzing(true);
    setAiAnalysis('');

    try {
      // Export at scaled preview resolution
      const dataUrl = canvas.toDataURL('image/png');

      const response = await fetch('/api/analyse-whiteboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageData: dataUrl }),
      });

      const data = await response.json();
      if (data.analysis) {
        setAiAnalysis(data.analysis);
        if (onSuggestNotes) {
          // Push key outputs to the main summary board if desired!
          onSuggestNotes(data.analysis);
        }
      } else {
        setAiAnalysis('Gemini analyzed the sketch but returned no textual insights.');
      }
    } catch (err) {
      console.error(err);
      setAiAnalysis('Failed to reach Gemini vision engine. Please verify network or variables.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex flex-col h-full" id="whiteboard-card">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
        <div>
          <h3 className="font-display text-lg font-semibold text-slate-800 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Active Zoom Interactive Whiteboard
          </h3>
          <p className="font-sans text-xs text-slate-500 mt-1">
            Draw flow ideas during call. Request Gemini to explain drawing!
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={analyzeWithGemini}
            disabled={isAnalyzing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-sans text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            title="Multimodal visual review with Gemini"
            id="btn-gemini-vision"
          >
            {isAnalyzing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            {isAnalyzing ? 'Analyzing Drawing...' : 'Ask Gemini to Parse Sketch'}
          </button>
        </div>
      </div>

      {/* Canvas workspace container */}
      <div className="relative flex-1 min-h-[220px] bg-slate-50 rounded-xl overflow-hidden border border-slate-200">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="cursor-crosshair block whiteboard-dots"
          id="drawing-canvas"
        />

        {/* Toolbar floating bottom right */}
        <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-xs p-3 rounded-xl border border-slate-200/80 shadow-md flex flex-wrap items-center justify-between gap-4">
          
          {/* Tools */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setTool('pencil')}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${tool === 'pencil' ? 'bg-slate-100 text-indigo-600 font-bold' : 'text-slate-500 hover:bg-slate-50'}`}
              title="Pencil Tool"
              id="tool-pencil"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTool('rectangle')}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${tool === 'rectangle' ? 'bg-slate-100 text-indigo-600 font-bold' : 'text-slate-500 hover:bg-slate-50'}`}
              title="Rectangle Tool"
              id="tool-rectangle"
            >
              <Square className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTool('eraser')}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${tool === 'eraser' ? 'bg-slate-100 text-indigo-600 font-bold' : 'text-slate-500 hover:bg-slate-50'}`}
              title="Eraser"
              id="tool-eraser"
            >
              <Eraser className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-slate-200 mx-1"></div>
            <button
              onClick={clearCanvas}
              className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Clear Canvas"
              id="tool-clear"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Color palette */}
          {tool !== 'eraser' && (
            <div className="flex items-center gap-1.5">
              {colors.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  className={`w-5 h-5 rounded-full border transition-all cursor-pointer ${color === c.value ? 'ring-2 ring-indigo-505 scale-110 border-white' : 'border-slate-300'}`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                  id={`color-${c.label.toLowerCase()}`}
                />
              ))}
            </div>
          )}

          {/* stroke width */}
          <div className="flex items-center gap-2">
            <span className="font-sans text-[10px] text-slate-400 font-medium whitespace-nowrap">Size</span>
            <input
              type="range"
              min="1"
              max="12"
              value={lineWidth}
              onChange={(e) => setLineWidth(Number(e.target.value))}
              className="w-16 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>
        </div>
      </div>

      {/* AI Vision Feedback Panel */}
      {aiAnalysis && (
        <div className="mt-4 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 overflow-y-auto max-h-[140px] font-sans text-xs text-slate-700" id="ai-vision-report">
          <div className="flex items-center gap-1.5 text-indigo-800 font-semibold mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Gemini Vision Sketch Synthesis</span>
          </div>
          <p className="whitespace-pre-line leading-relaxed">{aiAnalysis}</p>
        </div>
      )}
    </div>
  );
}
