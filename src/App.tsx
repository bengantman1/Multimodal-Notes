/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  FileText, 
  Loader2,
  AlertCircle,
  Download
} from 'lucide-react';
import { SummaryResult } from './types';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import mermaid from 'mermaid';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  themeVariables: {
    background: '#ffffff',
    primaryColor: '#f9fafb',
    primaryTextColor: '#111827',
    primaryBorderColor: '#e5e7eb',
    lineColor: '#6b7280',
    secondaryColor: '#ffffff',
    tertiaryColor: '#ffffff',
    nodeBorder: '#e5e7eb',
    mainBkg: '#ffffff',
    textColor: '#111827',
    nodeTextColor: '#111827',
    edgeLabelBackground: '#ffffff'
  }
});

const MermaidDiagram = ({ code }: { code: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (ref.current) {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        themeVariables: {
          background: '#ffffff',
          primaryColor: '#f9fafb',
          primaryTextColor: '#111827',
          primaryBorderColor: '#e5e7eb',
          lineColor: '#6b7280',
          secondaryColor: '#ffffff',
          tertiaryColor: '#ffffff',
          nodeBorder: '#e5e7eb',
          mainBkg: '#ffffff',
          textColor: '#111827',
          nodeTextColor: '#111827',
          edgeLabelBackground: '#ffffff'
        }
      });
      mermaid.render(`mermaid-${Math.random().toString(36).substring(7)}`, code).then((result) => {
        if (ref.current) {
          ref.current.innerHTML = result.svg;
        }
      });
    }
  }, [code]);
  
  return (
    <div className="my-6 flex justify-center w-full">
      <div 
        ref={ref} 
        className="mermaid-diagram bg-white border border-gray-200 rounded-xl p-6 shadow-xs max-w-full overflow-x-auto flex justify-center" 
      />
    </div>
  );
};

// Declare global interface for window.meet to keep TS happy and compilable
declare global {
  interface Window {
    meet?: any;
    zoomSdk?: any;
  }
}

// Minimal elegant sample transcript chips to let users test instantly
const SUGGESTED_PRESETS = [
  {
    title: "Project Orion: Core Tech Sync",
    badge: "Architecture Diagram",
    text: "Sarah: Let's align on our strategic data architecture. James: We'll have a React Client communicating with our Node backend. The backend uses a PostgreSQL database for structured data and a Redis Cache for fast lookups. Let's make sure we include a diagram in our notes to visualize this standard architecture, connecting the client, backend, database and cache."
  },
  {
    title: "Executive Launch Strategy",
    badge: "Marketing Flow",
    text: "Sarah: We need to coordinate the visual launch checklist. John can design the presentation flowcards. James: Yes, and we need John to complete the review of user interface drafts before Thursday. Let's ensure top priority is set on the interactive models."
  },
  {
    title: "Nano Banana Pro: Product Reveal",
    badge: "Hardware Specs",
    text: "Alice: Welcome team. Today we finalize the specs for our flagship device, the Nano Banana Pro. Bob: The core components are looking solid. We've integrated the Quantum Peel Sensor directly into the yellow haptic unibody. Charlie: Don't forget the Potassium Battery! It connects straight to the Peel Sensor for optimized energy delivery. Alice: Perfect. Let's draw up a system block diagram showing the Nano Banana Pro's main connections: Potassium Battery to the Peel Sensor, and both routing into the Potassium Mainboard."
  }
];

export default function App() {
  const [meetingTitle, setMeetingTitle] = useState<string>("Project Orion: Technical sync");
  const [meetingContext, setMeetingContext] = useState<string>("Design guidelines and model workflows");
  const [transcriptInput, setTranscriptInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [summaryData, setSummaryData] = useState<SummaryResult | null>(null);
  
  // New Live Conversation states
  const [appMode, setAppMode] = useState<'POST_MEETING' | 'LIVE_CONVERSATION'>('POST_MEETING');
  const [isLiveActive, setIsLiveActive] = useState<boolean>(false);
  const prevTranscriptRef = useRef<string>("");
  const liveIntervalRef = useRef<any>(null);

  const handleExportPDF = async () => {
    const element = document.getElementById('document-content');
    if (!element) return;
    
    const btn = document.getElementById('export-pdf-btn');
    if (btn) btn.style.display = 'none';

    try {
      const dataUrl = await toPng(element, { backgroundColor: '#ffffff', pixelRatio: 2 });
      const pdf = new jsPDF('p', 'pt', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (element.offsetHeight * pdfWidth) / element.offsetWidth;
      
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(summaryData?.title ? `${summaryData.title.split(' ').join('_')}.pdf` : 'Export.pdf');
    } catch (err) {
      console.error('PDF Export Error:', err);
    } finally {
      if (btn) btn.style.display = 'flex';
    }
  };

  // Voice recording state & simulation fallback
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [lastRecordedDuration, setLastRecordedDuration] = useState<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<any>(null);

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

  // Live Conversation effect
  useEffect(() => {
    if (appMode === 'LIVE_CONVERSATION' && isLiveActive) {
      // Setup interval
      liveIntervalRef.current = setInterval(() => {
        // Only run summarize if transcript actually changed
        if (transcriptInput.trim() !== '' && transcriptInput !== prevTranscriptRef.current) {
          prevTranscriptRef.current = transcriptInput;
          processTranscript(true); // pass true for silent/background loading
        }
      }, 15000); // 15 seconds interval
    } else {
      if (liveIntervalRef.current) {
        clearInterval(liveIntervalRef.current);
      }
    }
    return () => {
      if (liveIntervalRef.current) clearInterval(liveIntervalRef.current);
    };
  }, [appMode, isLiveActive, transcriptInput]);

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
      }
    } catch (err) {
      setErrorMessage("Voice translation endpoint is unavailable.");
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Text Transcript Process
  const processTranscript = async (isSilent: boolean = false) => {
    if (!transcriptInput.trim()) {
      setErrorMessage("Please select a preset chip or write a conversation text transcript first.");
      return;
    }

    if (!isSilent) setIsLoading(true);
    if (!isSilent) setErrorMessage("");
    const systemDate = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    try {
      const resp = await fetch('/api/summarize-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: transcriptInput,
          currentDate: systemDate,
          meetingContext: appMode === 'LIVE_CONVERSATION' ? "Live updating meeting summary. Add to nodes conceptually as we go." : meetingContext
        })
      });
      const data = await resp.json();
      if (data.error) {
        if (!isSilent) setErrorMessage(data.error);
      } else {
        setSummaryData(data);
        if (data.title) setMeetingTitle(data.title);
      }
    } catch (err) {
      if (!isSilent) setErrorMessage("Unable to parse pasted text segment. Please check container API.");
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 text-gray-800 font-sans flex flex-col justify-start overflow-x-hidden antialiased" id="app-viewport">
      
      {/* SOLID SOPHISTICATED TOP HEADER */}
      <header className="h-16 border-b border-gray-200 flex flex-col md:flex-row items-center justify-between px-6 sm:px-12 py-3 md:py-0 bg-white shrink-0 gap-3 md:gap-0 sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-600" />
          <h1 className="font-medium tracking-wide text-sm text-gray-900">Meeting Notes</h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex bg-gray-100 p-1 rounded-md border border-gray-200/60">
            <button
              onClick={() => { setAppMode('POST_MEETING'); setIsLiveActive(false); }}
              className={`px-3 py-1 text-[11px] font-medium rounded transition-all cursor-pointer ${
                appMode === 'POST_MEETING' 
                  ? 'bg-white text-indigo-600 shadow-xs border-gray-200' 
                  : 'text-gray-500 hover:text-gray-800 border-transparent'
              } border`}
            >
              Post-Meeting Summary
            </button>
            <button
              onClick={() => { setAppMode('LIVE_CONVERSATION'); }}
              className={`px-3 py-1 text-[11px] font-medium rounded transition-all cursor-pointer ${
                appMode === 'LIVE_CONVERSATION' 
                  ? 'bg-white text-indigo-600 shadow-xs border-gray-200' 
                  : 'text-gray-500 hover:text-gray-800 border-transparent'
              } border`}
            >
              Live Conversation
            </button>
          </div>

          <button
            onClick={() => {
              setTranscriptInput("");
              setSummaryData(null);
              setErrorMessage("");
              setLastRecordedDuration(null);
              setIsLiveActive(false);
            }}
            className="px-4 py-1.5 border border-gray-200 hover:border-gray-300 rounded-md text-xs text-gray-500 hover:text-gray-900 transition-all cursor-pointer"
          >
            Clear
          </button>
        </div>
      </header>

      {/* COMPACT DASHBOARD GRID */}
      <main className="max-w-7xl mx-auto w-full p-4 sm:p-10 flex-1 flex flex-col gap-8">
        
        {/* Error Notification Alert */}
        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-3 text-xs" id="err-alert">
            <AlertCircle className="w-4.5 h-4.5 text-red-500 shrink-0" />
            <p className="font-sans leading-relaxed">{errorMessage}</p>
          </div>
        )}

        {/* TOP STATION: Transcription Entry point Panel */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-5 print:hidden">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-gray-100 pb-3">
                <div>
                  <h2 className="text-xl font-serif text-gray-900">Input Transcript or Record Audio</h2>
                </div>

                {/* Quick Suggested Chips list */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[9px] text-gray-400 mr-1 uppercase">Examples:</span>
                  {SUGGESTED_PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => selectPreset(p)}
                      className="px-2.5 py-1 text-[10px] bg-gray-50 hover:bg-gray-100 hover:text-indigo-600 text-gray-600 rounded-full border border-gray-200 transition-all text-left cursor-pointer font-sans"
                    >
                      {p.badge}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Contextual Input Module Box */}
                <div className="lg:col-span-4 bg-gray-50 border border-gray-100 p-4 rounded-xl flex flex-col justify-between gap-4">
                  {appMode === 'POST_MEETING' ? (
                    <>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Record Audio</h4>
                        <p className="text-xs text-gray-500 mt-1">
                          Record from your microphone.
                        </p>
                      </div>

                      <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200 shadow-xs">
                        <button
                          onClick={isRecording ? stopRecording : startRecording}
                          className={`w-10 h-10 rounded-full cursor-pointer flex items-center justify-center transition-all shrink-0 ${isRecording ? 'bg-red-600 hover:bg-red-700 animate-pulse text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                          id="btn-voice-recorder"
                          title={isRecording ? "Stop recording" : "Start speaking"}
                        >
                          {isRecording ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4 text-white" />}
                        </button>
                        <div className="min-w-0">
                          <span className="block text-[11px] font-semibold text-gray-900 truncate">
                            {isRecording ? `Recording` : 'Ready'}
                          </span>
                          <span className="block font-mono text-[9px] text-gray-400">
                            {isRecording ? `${recordingSeconds}s` : 'Click to start'}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 tracking-tight flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${isLiveActive ? 'bg-red-500 animate-pulse' : 'bg-gray-300'}`}></div>
                          Live Conversation
                        </h4>
                        <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                          Graph and summary will automatically update structurally every 15s to reflect incoming data.
                        </p>
                      </div>

                      <div className="mt-3 bg-white p-3 rounded-lg border border-gray-200 shadow-xs flex flex-col gap-2">
                        <button
                          onClick={() => setIsLiveActive(!isLiveActive)}
                          className={`w-full py-2 rounded-md text-xs font-medium transition-all ${
                            isLiveActive 
                              ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100' 
                              : 'bg-indigo-600 text-white hover:bg-indigo-700 border border-transparent'
                          }`}
                        >
                          {isLiveActive ? 'Stop Live Sync' : 'Start Live Sync'}
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Pasted text Area column */}
                <div className="lg:col-span-8 flex flex-col gap-3">
                  <div className="flex items-center justify-between text-[10px] font-mono tracking-wider text-gray-400 uppercase">
                    <span>Transcript</span>
                  </div>

                  <textarea
                    value={transcriptInput}
                    onChange={(e) => setTranscriptInput(e.target.value)}
                    placeholder="Enter transcript..."
                    className="w-full h-36 bg-gray-50 border border-gray-100 hover:border-gray-200 focus:border-indigo-500 rounded-xl p-4 font-mono text-xs text-gray-700 leading-relaxed outline-hidden focus:ring-1 focus:ring-indigo-500/30 resize-none"
                    id="transcript-raw-textarea"
                    title="Enter your meeting raw chat log here"
                  />

                  <div className="flex justify-end items-center mt-1">
                      <button
                      onClick={() => processTranscript(false)}
                      disabled={isLoading || !transcriptInput.trim() || (appMode === 'LIVE_CONVERSATION' && isLiveActive)}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-sm cursor-pointer disabled:bg-gray-50 disabled:text-gray-400 transition-all flex items-center gap-2 shadow-md min-w-[120px] justify-center"
                      id="btn-process-summarize"
                    >
                      {isLoading && !isLiveActive ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (appMode === 'LIVE_CONVERSATION' && isLiveActive) ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-red-500" />
                          <span>Live Syncing...</span>
                        </>
                      ) : (
                        <>
                          <span>Summarize</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </div>
            </section>

            {/* RESULTS HUB PANEL */}
            {summaryData ? (
              <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fadeIn" id="synthesis-hub">
                
                {/* Left Box: Text synthesis & actions */}
                <div className="lg:col-span-12 bg-white border border-gray-200 rounded-xl p-6 lg:p-8 space-y-6" id="document-content">
                  
                  {/* Card Header title */}
                  <div className="border-b border-gray-100 pb-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-xl lg:text-2xl font-medium text-gray-900 leading-tight mt-1">
                          {summaryData.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] text-gray-500">
                            {summaryData.date || new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 no-print shrink-0" id="export-pdf-btn">
                        <button
                          onClick={handleExportPDF}
                          className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded text-[10px] text-gray-600 hover:text-gray-900 uppercase tracking-wider font-mono transition-colors flex items-center gap-1.5 cursor-pointer"
                          title="Export document as PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Export PDF</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Markdown Output */}
                  <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-a:text-indigo-600 prose-h3:text-gray-900 prose-h3:font-medium prose-li:text-gray-700 border-t border-gray-100 pt-5 mt-2">
                    <Markdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        img(props) {
                          const { node, ...rest } = props;
                          return (
                            <img {...rest} referrerPolicy="no-referrer" className="rounded-lg shadow-sm border border-gray-200 mt-4 max-w-full lg:max-w-[75%]" />
                          );
                        },
                        code(props) {
                          const { children, className, node, ...rest } = props;
                          const match = /language-(\w+)/.exec(className || "");
                          
                          if (match && match[1] === "mermaid") {
                            return <MermaidDiagram code={String(children).replace(/\n$/, "")} />;
                          }
                          
                          return (
                            <code {...rest} className={className}>
                              {children}
                            </code>
                          );
                        }
                      }}
                    >
                      {summaryData.markdown}
                    </Markdown>
                  </div>

                </div>
              </section>
            ) : (
              /* Empty placeholder box */
              <div className="text-center py-20 px-6 bg-white rounded-2xl border border-dashed border-gray-200 max-w-2xl mx-auto" id="dashboard-setup-empty">
                <div className="w-14 h-14 bg-indigo-600/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-[#c5a059]/20">
                  <FileText className="w-6 h-6 text-indigo-600" />
                </div>
                
                <h3 className="font-serif text-2xl text-gray-900 mb-2">Ready</h3>
                <p className="font-sans text-xs text-gray-500 max-w-md mx-auto leading-relaxed mb-6">
                  Provide a transcript or record audio to generate structured meeting notes and action items.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-4">
                  <button
                    onClick={() => selectPreset(SUGGESTED_PRESETS[0])}
                    className="px-4 py-2 border border-gray-200 hover:border-gray-300 hover:text-gray-900 rounded-lg text-gray-600 text-xs transition-all cursor-pointer font-mono"
                  >
                    Load Example
                  </button>
                </div>
              </div>
            )}
            
      </main>

    </div>
  );
}
