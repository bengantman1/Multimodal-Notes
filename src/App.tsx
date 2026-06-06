/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Sparkles, 
  CheckSquare, 
  FileText, 
  Clock, 
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  HelpCircle,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import Flowchart from './components/Flowchart';
import { SummaryResult } from './types';

// Minimal elegant sample transcript chips to let users test instantly
const SUGGESTED_PRESETS = [
  {
    title: "Project Orion: Core Tech Sync",
    badge: "Database Spec",
    text: "Sarah: Let's align on our strategic data architecture. James: I suggest using a vector store index for the real-time recommendations pipeline to minimize lookup latency. Sarah: Agreed. We should also generate high-fidelity diagram cards with our internal Nano Banana rendering engine. Let's task Sarah to build the database schemas before next Monday."
  },
  {
    title: "Executive Launch Strategy",
    badge: "Marketing Flow",
    text: "Sarah: We need to coordinate the visual launch checklist. John can design the presentation flowcards. James: Yes, and we need John to complete the review of user interface drafts before Thursday. Let's ensure top priority is set on the interactive models."
  }
];

export default function App() {
  const [meetingTitle, setMeetingTitle] = useState<string>("Project Orion: Technical sync");
  const [meetingContext, setMeetingContext] = useState<string>("Design guidelines and model workflows");
  const [transcriptInput, setTranscriptInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [summaryData, setSummaryData] = useState<SummaryResult | null>(null);
  
  // Voice recording state & simulation fallback
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [lastRecordedDuration, setLastRecordedDuration] = useState<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<any>(null);

  // Nano Banana generated layout structure
  const [nanoBananaImage, setNanoBananaImage] = useState<string>("");
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
  const [imagePrompt, setImagePrompt] = useState<string>("Abstract minimal flat golden node graph, dark slate blueprint layout");

  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    // Select the first preset by default as initial input helper
    setTranscriptInput(SUGGESTED_PRESETS[0].text);
  }, []);

  // Update voice timer
  useEffect(() => {
    if (isRecording) {
      setRecordingSeconds(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
    return () => {
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    };
  }, [isRecording]);

  const selectPreset = (preset: typeof SUGGESTED_PRESETS[0]) => {
    setTranscriptInput(preset.text);
    setMeetingTitle(preset.title);
    setErrorMessage("");
    setLastRecordedDuration(null);
  };

  // Browser-native Audio Recording Setup
  const startRecording = async () => {
    setErrorMessage("");
    setLastRecordedDuration(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      const chunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Data = (reader.result as string).split(',')[1];
          // Save the final elapsed recording duration
          const currentDuration = recordingSeconds || 5; 
          setLastRecordedDuration(currentDuration);
          await submitAudioData(base64Data, 'audio/webm;codecs=opus', undefined, currentDuration);
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
    } catch (err: any) {
      console.warn("Real mic failed or blocked inside preview container. Using automated simulation.", err);
      setIsRecording(true);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    } else {
      // Audio simulation triggers
      setIsRecording(false);
      // Simulate 12 seconds recording
      setLastRecordedDuration(12);
      submitAudioData(
        "", 
        "", 
        "Sarah: Welcome sync. Let's outline research metrics and deliver critical layouts to our team.",
        12
      );
    }
  };

  const submitAudioData = async (base64Audio: string, mime: string, simulated?: string, secondsRecorded?: number) => {
    setIsLoading(true);
    setErrorMessage("");
    const systemDate = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    try {
      const resp = await fetch('/api/summarize-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioData: base64Audio,
          mimeType: mime,
          alternateTranscriptionText: simulated,
          currentDate: systemDate,
          durationSeconds: secondsRecorded
        })
      });
      const data = await resp.json();
      if (data.error) {
        setErrorMessage(data.error);
      } else {
        setSummaryData(data);
        if (data.title) setMeetingTitle(data.title);
        if (data.highlights && data.highlights.length > 0) {
          setImagePrompt(`Neural network grid layout representing: ${data.highlights[0]}`);
        }
      }
    } catch (err) {
      setErrorMessage("Voice translation endpoint is unavailable.");
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Text Transcript Process
  const processTranscript = async () => {
    if (!transcriptInput.trim()) {
      setErrorMessage("Please select a preset chip or write a conversation text transcript first.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    const systemDate = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    try {
      const resp = await fetch('/api/summarize-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: transcriptInput,
          meetingContext: meetingContext,
          currentDate: systemDate
        })
      });
      const data = await resp.json();
      if (data.error) {
        setErrorMessage(data.error);
      } else {
        setSummaryData(data);
        if (data.title) setMeetingTitle(data.title);
        if (data.highlights && data.highlights.length > 0) {
          setImagePrompt(`Golden minimal concept block explaining ${data.highlights[0]}`);
        }
      }
    } catch (err) {
      setErrorMessage("Unable to parse pasted text segment. Please check container API.");
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger Gemini Banana graphic generation
  const generateBananaIllustration = async () => {
    setIsGeneratingImage(true);
    try {
      const resp = await fetch('/api/generate-diagram-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themePrompt: imagePrompt })
      });
      const data = await resp.json();
      if (data.imageUrl) {
        setNanoBananaImage(data.imageUrl);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const toggleActionItem = (id: string) => {
    if (!summaryData) return;
    const items = summaryData.actionItems.map(item => {
      if (item.id === id) {
        return { ...item, done: !item.done };
      }
      return item;
    });
    setSummaryData({ ...summaryData, actionItems: items });
  };

  return (
    <div className="w-full min-h-screen bg-[#050505] text-[#e0e0e0] font-sans flex flex-col justify-start overflow-x-hidden antialiased" id="app-viewport">
      
      {/* SOLID SOPHISTICATED TOP HEADER */}
      <header className="h-20 border-b border-white/10 flex items-center justify-between px-6 sm:px-12 bg-[#0c0c0c] shrink-0 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-gradient-to-tr from-[#c5a059] to-[#8d713c] rounded-xs rotate-45 flex items-center justify-center">
            <div className="w-2.5 h-2.5 bg-black rounded-full"></div>
          </div>
          <div>
            <h1 className="font-display font-semibold tracking-[0.16em] text-xs text-white">ORION NOTES</h1>
            <p className="text-[9px] text-[#c5a059] uppercase tracking-wider font-mono">Dynamic Meeting Insights</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setTranscriptInput("");
              setSummaryData(null);
              setErrorMessage("");
              setNanoBananaImage("");
              setLastRecordedDuration(null);
            }}
            className="px-4 py-1.5 border border-white/10 hover:border-white/20 rounded-md text-[10px] tracking-wider uppercase font-mono text-white/50 hover:text-white transition-all cursor-pointer"
          >
            Clear Screen
          </button>
        </div>
      </header>

      {/* COMPACT DASHBOARD GRID */}
      <main className="max-w-7xl mx-auto w-full p-4 sm:p-10 flex-1 flex flex-col gap-8">
        
        {/* Error Notification Alert */}
        {errorMessage && (
          <div className="p-4 bg-red-955/30 border border-red-900 text-red-200 rounded-lg flex items-center gap-3 text-xs" id="err-alert">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <p>{errorMessage}</p>
          </div>
        )}

        {/* TOP STATION: Transcription Entry point Panel */}
        <section className="bg-[#0c0c0c] rounded-xl border border-white/10 p-6 flex flex-col gap-5">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/5 pb-3">
            <div>
              <p className="text-[9px] uppercase tracking-[0.2em] text-[#c5a059] font-mono font-semibold">Inputs</p>
              <h2 className="text-xl font-serif italic text-white mt-1">Provide a transcript or record audio</h2>
            </div>

            {/* Quick Suggested Chips list */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[9px] text-white/30 mr-1 uppercase">Examples:</span>
              {SUGGESTED_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => selectPreset(p)}
                  className="px-2.5 py-1 text-[10px] bg-white/5 hover:bg-white/10 hover:text-[#c5a059] text-white/70 rounded-full border border-white/15 transition-all text-left cursor-pointer font-sans"
                >
                  ✦ {p.badge}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Recording module Box */}
            <div className="lg:col-span-4 bg-black/40 border border-white/5 p-4 rounded-xl flex flex-col justify-between gap-4">
              <div>
                <span className="text-[9px] uppercase tracking-wider text-white/30 font-mono">Record Audio</span>
                <h4 className="text-xs font-semibold text-white mt-1.5">Quick Voice Recorder</h4>
                <p className="text-[10px] text-white/50 mt-1 leading-relaxed">
                  Record from your microphone or use the simulation mode for instant testing.
                </p>
              </div>

              <div className="flex items-center gap-3 bg-[#050505] p-3 rounded-lg border border-white/5">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`w-10 h-10 rounded-full cursor-pointer flex items-center justify-center transition-all shrink-0 ${isRecording ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 'bg-[#c5a059] text-black hover:bg-[#8d713c]'}`}
                  id="btn-voice-recorder"
                  title={isRecording ? "Stop recording" : "Start speaking"}
                >
                  {isRecording ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4" />}
                </button>
                <div className="min-w-0">
                  <span className="block text-[11px] font-semibold text-white truncate">
                    {isRecording ? `Recording active` : 'Ready'}
                  </span>
                  <span className="block font-mono text-[9px] text-white/40">
                    {isRecording ? `${recordingSeconds}s elapsed` : 'Click to speak'}
                  </span>
                </div>
              </div>
            </div>

            {/* Pasted text Area column */}
            <div className="lg:col-span-8 flex flex-col gap-3">
              <div className="flex items-center justify-between text-[10px] font-mono tracking-wider text-white/40">
                <span>TRANSCRIPT OR DISCUSSION RAW TEXT</span>
                <span>{transcriptInput.length} characters</span>
              </div>

              <textarea
                value={transcriptInput}
                onChange={(e) => setTranscriptInput(e.target.value)}
                placeholder="Sarah: Let's focus our presentation design sync on minimal layout specifications..."
                className="w-full h-36 bg-black/60 border border-white/5 hover:border-white/10 focus:border-[#c5a059] rounded-xl p-4 font-mono text-xs text-white/80 leading-relaxed outline-hidden focus:ring-1 focus:ring-[#c5a059]/30 resize-none"
                id="transcript-raw-textarea"
                title="Enter your meeting raw chat log here"
              />

              <div className="flex justify-between items-center mt-1">
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-mono text-white/30 uppercase">Focus:</span>
                  <input
                    type="text"
                    value={meetingContext}
                    onChange={(e) => setMeetingContext(e.target.value)}
                    className="bg-transparent text-white/60 font-mono text-[10px] border-b border-white/5 focus:border-[#c5a059] outline-hidden px-1.5 py-0.5"
                    placeholder="e.g. general context"
                  />
                </div>

                <button
                  onClick={processTranscript}
                  disabled={isLoading || !transcriptInput.trim()}
                  className="px-6 py-2.5 bg-[#c5a059] hover:bg-[#8d713c] text-black font-semibold text-xs tracking-widest uppercase rounded-sm cursor-pointer disabled:bg-white/5 disabled:text-white/30 transition-all flex items-center gap-2 shadow-md"
                  id="btn-process-summarize"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Synthesizing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Synthesize Takeaways</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </section>        {/* RESULTS HUB PANEL */}
        {summaryData ? (
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fadeIn" id="synthesis-hub">
            
            {/* Left Box: Text synthesis & actions */}
            <div className="lg:col-span-7 bg-[#0c0c0c] border border-white/10 rounded-xl p-6 space-y-6">
              
              {/* Card Header title */}
              <div className="border-b border-white/5 pb-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-[#c5a059] font-mono font-semibold">Takeaways</span>
                    <h3 className="text-2xl font-serif italic text-white leading-tight mt-1">
                      {summaryData.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-sm text-[9px] font-mono text-white/50">
                      📅 {summaryData.date || new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                    {(lastRecordedDuration !== null || summaryData.duration) && (
                      <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-sm text-[9px] font-mono text-white/50">
                        ⏱️ {lastRecordedDuration !== null 
                          ? (lastRecordedDuration < 60 ? `${lastRecordedDuration} seconds` : `${Math.floor(lastRecordedDuration/60)}m ${lastRecordedDuration%60}s`)
                          : summaryData.duration
                        }
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Cohesive paragraph */}
              {summaryData.summaryText && (
                <div className="border-l-2 border-[#c5a059]/75 pl-5 py-0.5">
                  <span className="block text-[10px] font-mono uppercase tracking-widest text-[#c5a059] mb-1.5">Summary</span>
                  <p className="text-sm text-white/80 leading-relaxed font-sans">
                    {summaryData.summaryText}
                  </p>
                </div>
              )}

              {/* Bullet highlights block - rendered only if present */}
              {summaryData.highlights && summaryData.highlights.length > 0 && (
                <div className="space-y-3 pt-2">
                  <span className="block text-[10px] font-mono uppercase tracking-wider text-white/40">Key Points</span>
                  <div className="space-y-2">
                    {summaryData.highlights.map((h, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs text-white/70">
                        <span className="text-[#c5a059] shrink-0 font-medium font-mono text-[9px] mt-0.5">✦</span>
                        <p className="leading-relaxed">{h}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Incremental segment detail notes - rendered only if present */}
              {summaryData.segments && summaryData.segments.length > 0 && (
                <div className="space-y-3 pt-2">
                  <span className="block text-[10px] font-mono uppercase tracking-wider text-white/40">Thematic Highlights</span>
                  <div className="space-y-3">
                    {summaryData.segments.map((seg, i) => (
                      <div key={i} className="p-4 bg-[#050505] rounded-lg border border-white/5">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-xs text-[#c5a059]">{seg.title}</h4>
                          {seg.timeRange && (
                            <span className="text-[9px] font-mono bg-white/5 text-white/40 px-2 py-0.5 rounded-sm">
                              {seg.timeRange}
                            </span>
                          )}
                        </div>
                        <ul className="space-y-1.5 pl-1">
                          {seg.bullets && seg.bullets.map((bullet, k) => (
                            <li key={k} className="text-xs text-white/60 list-disc list-inside leading-loose pl-1">
                              {bullet}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Interactive Checklist Actions directly aligned here */}
              <div className="border-t border-white/5 pt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#c5a059]">Action Items</span>
                  <span className="text-[9px] font-mono text-white/30 uppercase">Click box to check</span>
                </div>

                {summaryData.actionItems && summaryData.actionItems.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {summaryData.actionItems.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => toggleActionItem(item.id)}
                        className={`p-3 rounded-lg border transition-all cursor-pointer select-none flex items-start gap-2.5 ${item.done ? 'bg-black/40 border-white/5 opacity-50' : 'bg-[#050505] border-white/5 hover:border-white/15'}`}
                        id={`action-item-${item.id}`}
                      >
                        <button className="text-[#c5a059] shrink-0 mt-0.5 font-bold" id={`btn-done-${item.id}`}>
                          {item.done ? (
                            <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono text-[9px] border border-emerald-500/30">✓</span>
                          ) : (
                            <div className="w-4 h-4 rounded-sm border border-white/20 hover:border-[#c5a059]"></div>
                          )}
                        </button>
                        <div className="min-w-0">
                          <p className={`text-xs text-white/90 truncate block ${item.done ? 'line-through text-white/40' : ''}`} title={item.task}>
                            {item.task}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] font-mono text-white/40">Responsible: {item.owner || "Unassigned"}</span>
                            {item.priority && (
                              <span className={`text-[8px] font-mono rounded px-1 ${item.priority === 'High' ? 'bg-rose-950/40 text-rose-300' : 'bg-slate-800 text-slate-300'}`}>
                                {item.priority}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-white/40 italic font-mono">No action metrics extracted from this meeting segment.</p>
                )}
              </div>

            </div>

            {/* Right Box: Dynamic SVG Cognitive Flowchart & generative layout */}
            <div className="lg:col-span-5 space-y-8">
              
              {/* Cognitive SVG Mind Map */}
              {summaryData.diagramData && summaryData.diagramData.nodes && summaryData.diagramData.nodes.length > 0 && (
                <Flowchart data={summaryData.diagramData} />
              )}

              {/* Generative Blueprint Artwork */}
              <div className="bg-[#0c0c0c] border border-white/10 rounded-xl p-6 space-y-4">
                <div>
                  <h3 className="font-display font-semibold text-white text-sm flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-[#c5a059]" />
                    Visual Concepts
                  </h3>
                  <p className="font-sans text-[11px] text-white/40 mt-1">
                    Optionally render an abstract flat vector representing the core ideas generated from this session.
                  </p>
                </div>

                {nanoBananaImage ? (
                  <div className="rounded-lg overflow-hidden border border-white/10 bg-[#050505] flex flex-col">
                    <div className="relative aspect-video w-full flex items-center justify-center overflow-hidden">
                      {nanoBananaImage === "MOCK_IMAGE_FALLBACK" ? (
                        <div className="p-6 text-center text-slate-100">
                          <div className="w-12 h-12 bg-gradient-to-tr from-[#c5a059] to-[#8d713c] rotate-45 rounded-xs mx-auto mb-4 opacity-40"></div>
                          <span className="text-xs uppercase tracking-wider text-[#c5a059] block font-semibold">Visual Layout Model</span>
                          <p className="text-[9px] text-white/40 font-mono mt-2 leading-relaxed max-w-[280px]">
                            Conceptual illustration prepared. Clean node paths rendered on deep slate.
                          </p>
                        </div>
                      ) : (
                        <img src={nanoBananaImage} alt="Generative representation" className="w-full h-full object-cover" />
                      )}
                    </div>
                    
                    <div className="p-3 bg-white/5 flex items-center justify-between text-[10px] font-mono text-white/50 border-t border-white/5">
                      <span className="truncate max-w-[200px]">Prompt: {imagePrompt}</span>
                      <button
                        onClick={() => setNanoBananaImage("")}
                        className="text-rose-400 hover:underline cursor-pointer"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-white/40 font-mono mb-1 font-semibold">Creative Style Prompt</label>
                      <input
                        type="text"
                        className="w-full bg-[#050505] text-white font-mono text-xs border border-white/5 focus:border-[#c5a059] rounded-lg p-2.5 outline-hidden"
                        value={imagePrompt}
                        onChange={(e) => setImagePrompt(e.target.value)}
                      />
                    </div>

                    <button
                      onClick={generateBananaIllustration}
                      disabled={isGeneratingImage}
                      className="w-full py-2.5 bg-[#c5a059]/10 hover:bg-[#c5a059]/20 text-[#c5a059] border border-[#c5a059]/30 rounded-lg text-xs font-semibold tracking-wider uppercase transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:bg-white/5 disabled:text-[#c5a059]/40"
                    >
                      {isGeneratingImage ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Generating illustration...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3" />
                          <span>Visualize Concepts</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

              </div>

            </div>

          </section>
        ) : (
          /* Empty placeholder box */
          <div className="text-center py-20 px-6 bg-[#0c0c0c] rounded-2xl border border-dashed border-white/10 max-w-2xl mx-auto" id="dashboard-setup-empty">
            <div className="w-14 h-14 bg-[#c5a059]/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-[#c5a059]/20">
              <Sparkles className="w-6 h-6 text-[#c5a059]" />
            </div>
            
            <h3 className="font-serif italic text-2xl text-white mb-2">System Ready</h3>
            <p className="font-sans text-xs text-white/50 max-w-md mx-auto leading-relaxed mb-6">
              Paste meeting discussion logs or use the microphone recorder to synthesize structured takeaways, key action lists, and flow diagrams.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={() => selectPreset(SUGGESTED_PRESETS[0])}
                className="px-4 py-2 border border-white/10 hover:border-white/20 hover:text-white rounded-lg text-white/70 text-xs transition-all cursor-pointer"
              >
                Load Example ✦
              </button>

              <button
                onClick={() => {
                  setIsLoading(true);
                  setTimeout(() => {
                    setLastRecordedDuration(15);
                    submitAudioData("", "", "Sarah: Welcome workspace sync. Let's outline the diagram workflow models and execute deliverables.", 15);
                  }, 500);
                }}
                className="px-5 py-2.5 bg-[#c5a059] hover:bg-[#8d713c] text-black font-semibold text-xs rounded-sm transition-all shadow-md cursor-pointer"
              >
                🚀 Quick Simulation
              </button>
            </div>
          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="h-10 mt-auto border-t border-white/10 flex items-center justify-between px-6 sm:px-12 bg-[#0c0c0c] text-white/30 font-mono text-[9px] shrink-0">
        <span>System Status: Operational</span>
        <span>Powered by Gemini AI</span>
      </footer>

    </div>
  );
}
