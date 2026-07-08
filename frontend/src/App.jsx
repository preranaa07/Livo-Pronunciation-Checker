import React, { useState, useRef, useCallback } from "react";
import axios from "axios";
import {
  UploadCloud,
  Mic,
  Loader2,
  FileAudio,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ChevronDown,
} from "lucide-react";

const API_URL = "http://127.0.0.1:8000/upload";
const MIN_DURATION = 30;
const MAX_DURATION = 45;

export default function App() {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);

  const clearFile = () => {
    setFile(null);
    setResult(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const showInvalidDurationToast = () => {
    const message =
      "Please upload an English audio recording between 30 and 45 seconds.";
    setError(message);
    setToast(message);
    clearFile();
    setTimeout(() => setToast(""), 4000);
  };

  // Reads audio duration natively via the HTML5 Audio element (no extra packages)
  const getAudioDuration = (f) =>
    new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(f);
      const audio = new Audio();
      audio.preload = "metadata";
      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(audio.duration);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Could not read audio metadata."));
      };
      audio.src = objectUrl;
    });

  const handleFiles = useCallback(async (files) => {
    const f = files?.[0];
    if (!f) return;

    if (!f.type.startsWith("audio/")) {
      setError("Please upload an audio file (mp3, wav, m4a, etc.).");
      clearFile();
      return;
    }

    setError("");
    setResult(null);
    setValidating(true);

    try {
      const duration = await getAudioDuration(f);
      if (
        !isFinite(duration) ||
        duration < MIN_DURATION ||
        duration > MAX_DURATION
      ) {
        showInvalidDurationToast();
        return;
      }
      setError("");
      setFile(f);
    } catch (err) {
      setError("Could not read this audio file. Please try a different file.");
      clearFile();
    } finally {
      setValidating(false);
    }
  }, []);

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const onAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axios.post(API_URL, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(res.data);
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          "Something went wrong while analyzing your audio. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = (score) => {
    if (score > 90) return { ring: "#34d399", text: "text-emerald-400", label: "Excellent" };
    if (score >= 70) return { ring: "#fbbf24", text: "text-amber-400", label: "Good" };
    return { ring: "#f87171", text: "text-rose-400", label: "Needs Improvement" };
  };

  const scoreInfo = result ? scoreColor(result.score) : null;

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-4 py-12"
      style={{
        background: "linear-gradient(160deg, #0f172a 0%, #1e293b 100%)",
      }}
    >
      {/* Toast notification */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md">
          <div className="flex items-center gap-3 rounded-xl border border-rose-500/40 bg-[#1e293b]/95 backdrop-blur-xl px-4 py-3.5 shadow-2xl shadow-black/50 animate-in fade-in slide-in-from-top-2">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <p className="text-rose-200 text-sm font-medium">❌ {toast}</p>
          </div>
        </div>
      )}

      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center gap-2 mb-4">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-900/40">
              <Mic className="w-6 h-6 text-white" />
            </div>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-gradient-to-r from-white via-indigo-100 to-cyan-200 bg-clip-text text-transparent">
            PronounceAI
          </h1>
          <p className="mt-3 text-slate-400 text-sm sm:text-base">
            AI-powered English Pronunciation Analysis
          </p>
        </div>

        {/* Upload Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl shadow-black/30 p-6 sm:p-8">
          <label
            htmlFor="audio-upload"
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            className={`group flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 cursor-pointer transition-all duration-200 ${
              isDragging
                ? "border-cyan-400 bg-cyan-400/10"
                : "border-white/15 hover:border-indigo-400/60 hover:bg-white/[0.03]"
            }`}
          >
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500/20 to-cyan-400/20 flex items-center justify-center group-hover:scale-105 transition-transform">
              <UploadCloud className="w-7 h-7 text-indigo-300" />
            </div>
            <div className="text-center">
              <p className="text-slate-200 font-medium">
                Drag &amp; drop your audio file here
              </p>
              <p className="text-slate-500 text-sm mt-1">
                Upload an English audio recording between 30 and 45 seconds.
              </p>
              <p className="text-slate-600 text-xs mt-2 tracking-wide">
                English speech only • 30–45 seconds
              </p>
            </div>
            <input
              id="audio-upload"
              ref={inputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </label>

          {validating && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-4 py-3">
              <Loader2 className="w-4 h-4 text-indigo-300 animate-spin shrink-0" />
              <span className="text-slate-400 text-sm">Checking audio duration...</span>
            </div>
          )}

          {file && !validating && (
            <div className="mt-4 rounded-lg bg-white/5 border border-white/10 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
                  <FileAudio className="w-4.5 h-4.5 text-cyan-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-emerald-400 text-xs font-medium">✓ Selected File</p>
                  <p className="text-slate-200 text-sm truncate">{file.name}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-emerald-400 text-sm">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Audio ready for analysis</span>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-500/30 px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="text-rose-300 text-sm">❌ {error}</span>
            </div>
          )}

          <button
            onClick={onAnalyze}
            disabled={!file || loading || validating}
            className="mt-6 w-full flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-medium text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 shadow-lg shadow-indigo-900/30 active:scale-[0.98]"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Analyzing pronunciation...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Analyze Pronunciation
              </>
            )}
          </button>
        </div>

        {/* Results */}
        {result && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl shadow-black/30 p-6 sm:p-8 space-y-6">
            {/* Score */}
            <div className="flex flex-col items-center text-center">
              <div
                className="relative w-32 h-32 rounded-full flex items-center justify-center"
                style={{
                  background: `conic-gradient(${scoreInfo.ring} ${
                    (result.score / 100) * 360
                  }deg, rgba(255,255,255,0.08) 0deg)`,
                }}
              >
                <div className="w-24 h-24 rounded-full bg-[#131c2f] flex flex-col items-center justify-center">
                  <span className={`text-3xl font-bold ${scoreInfo.text}`}>
                    {result.score}
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wide">
                    score
                  </span>
                </div>
              </div>
              <p className={`mt-3 font-semibold ${scoreInfo.text}`}>
                {scoreInfo.label}
              </p>

              {/* Progress bar */}
              <div className="w-full mt-4 h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(result.score, 100)}%`,
                    backgroundColor: scoreInfo.ring,
                  }}
                />
              </div>
            </div>

            {/* Words to Improve */}
            {result.mistakes && result.mistakes.length > 0 ? (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <h3 className="font-semibold text-rose-300">Words to Improve</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.mistakes.map((word, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-200 text-sm"
                    >
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <p className="text-emerald-300 text-sm font-medium">
                  No significant pronunciation issues detected.
                </p>
              </div>
            )}

            {/* AI Feedback */}
            <div className="rounded-xl border-l-4 border-indigo-400 bg-indigo-500/5 p-5">
              <h3 className="font-semibold text-indigo-300 mb-2">AI Feedback</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                {result.feedback}
              </p>
            </div>

            {/* Transcript */}
            <details className="group rounded-xl border border-white/10 bg-white/[0.03] p-5">
              <summary className="flex items-center justify-between cursor-pointer list-none font-medium text-slate-200">
                Transcript
                <ChevronDown className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-sm text-slate-400 leading-relaxed whitespace-pre-wrap">
                {result.transcript}
              </p>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}