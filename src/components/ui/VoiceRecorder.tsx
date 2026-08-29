// ============================================================
// VoiceRecorder — Audio memo capture & Speech-to-Text transcript
// Member 2 — Multimodal Field Evidence (Voice)
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { Mic, Square, Play, Pause, RotateCcw, AlertCircle, Sparkles, Check } from 'lucide-react';

interface VoiceRecorderProps {
  onRecordingComplete: (data: {
    audioBlob: Blob | null;
    audioUrl: string | null;
    transcript: string;
  }) => void;
  onClear?: () => void;
  initialTranscript?: string;
  isHindi?: boolean;
}

export function VoiceRecorder({
  onRecordingComplete,
  onClear,
  initialTranscript = '',
  isHindi = false,
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcript, setTranscript] = useState(initialTranscript);
  const [isPlaying, setIsPlaying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [speechSupported, setSpeechSupported] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // Check speech recognition capability
  useEffect(() => {
    const hasSpeech =
      typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
    setSpeechSupported(hasSpeech);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    setErrorMsg(null);
    audioChunksRef.current = [];
    setRecordingDuration(0);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone access is not supported on this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        // Stop all tracks to turn off mic indicator
        stream.getTracks().forEach((track) => track.stop());

        onRecordingComplete({
          audioBlob: blob,
          audioUrl: url,
          transcript,
        });
      };

      // Start MediaRecorder
      mediaRecorder.start();
      setIsRecording(true);

      // Start ~15s timer
      let seconds = 0;
      timerRef.current = window.setInterval(() => {
        seconds += 1;
        setRecordingDuration(seconds);
        if (seconds >= 15) {
          stopRecording();
        }
      }, 1000);

      // Start Web Speech Recognition if available
      if (
        typeof window !== 'undefined' &&
        ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
      ) {
        try {
          const SpeechRec =
            (window as any).SpeechRecognition ||
            (window as any).webkitSpeechRecognition;
          const recognition = new SpeechRec();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = isHindi ? 'hi-IN' : 'en-IN';

          recognition.onresult = (event: any) => {
            let currentText = '';
            for (let i = 0; i < event.results.length; i++) {
              currentText += event.results[i][0].transcript + ' ';
            }
            if (currentText.trim()) {
              setTranscript(currentText.trim());
            }
          };

          recognition.onerror = (err: any) => {
            console.warn('Speech recognition error:', err);
          };

          recognition.start();
          recognitionRef.current = recognition;
        } catch (recErr) {
          console.warn('Speech recognition init error:', recErr);
        }
      }
    } catch (err: any) {
      console.error('Microphone error:', err);
      if (
        err.name === 'NotAllowedError' ||
        err.name === 'PermissionDeniedError'
      ) {
        setErrorMsg(
          isHindi
            ? 'माइक्रोफ़ोन की अनुमति अस्वीकृत है। कृपया नीचे सीधे लक्षण लिखें।'
            : 'Microphone permission was denied. You can still type your notes below.'
        );
      } else {
        setErrorMsg(
          isHindi
            ? 'ऑडियो रिकॉर्डिंग उपलब्ध नहीं है। कृपया विवरण टाइप करें।'
            : 'Audio recording is unavailable. Please type your notes manually below.'
        );
      }
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === 'recording'
    ) {
      mediaRecorderRef.current.stop();
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }

    setIsRecording(false);
  };

  const togglePlayback = () => {
    if (!audioElementRef.current && audioUrl) {
      audioElementRef.current = new Audio(audioUrl);
      audioElementRef.current.onended = () => setIsPlaying(false);
    }

    if (audioElementRef.current) {
      if (isPlaying) {
        audioElementRef.current.pause();
        setIsPlaying(false);
      } else {
        audioElementRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const resetRecording = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
    }
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setAudioBlob(null);
    setIsPlaying(false);
    setRecordingDuration(0);
    setTranscript('');
    setErrorMsg(null);
    onClear?.();
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="card p-4 space-y-3 bg-gradient-to-br from-emerald-50/50 to-white border-emerald-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <Mic size={18} />
          </div>
          <div>
            <h4 className="text-xs font-700 uppercase tracking-wider text-emerald-950">
              {isHindi ? 'ध्वनि संदेश / Voice Note (15s)' : 'Voice Memo / Audio Note (15s)'}
            </h4>
            <p className="text-[11px] text-gray-500">
              {isHindi
                ? 'लक्षणों का विवरण बोलकर रिकॉर्ड करें'
                : 'Speak to describe symptoms in local language'}
            </p>
          </div>
        </div>

        {speechSupported && (
          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-600 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Sparkles size={11} /> Auto-Transcript
          </span>
        )}
      </div>

      {/* Permission or hardware error */}
      {errorMsg && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-xs text-amber-900">
          <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p>{errorMsg}</p>
        </div>
      )}

      {/* Recording / Controls Area */}
      <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-200">
        {!audioUrl ? (
          // Recording in progress or idle
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-300'
                }`}
              />
              <span className="font-mono text-sm font-700 text-gray-700">
                {formatSeconds(recordingDuration)} / 00:15
              </span>
              {isRecording && (
                <span className="text-xs text-red-600 font-600 animate-pulse">
                  {isHindi ? 'रिकॉर्डिंग चालू है…' : 'Recording audio…'}
                </span>
              )}
            </div>

            {isRecording ? (
              <button
                type="button"
                onClick={stopRecording}
                className="btn btn-sm bg-red-600 hover:bg-red-700 text-white flex items-center gap-1 shadow-sm"
              >
                <Square size={14} /> {isHindi ? 'रोकें' : 'Stop'}
              </button>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                className="btn btn-sm btn-primary flex items-center gap-1 shadow-sm"
              >
                <Mic size={14} /> {isHindi ? 'बोलें (रिकॉर्ड करें)' : 'Start Recording'}
              </button>
            )}
          </div>
        ) : (
          // Audio recorded — Playback & Reset
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={togglePlayback}
                className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 transition-colors shadow-sm"
                aria-label={isPlaying ? 'Pause voice memo' : 'Play voice memo'}
              >
                {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
              </button>
              <div className="text-xs">
                <p className="font-700 text-gray-800 flex items-center gap-1">
                  <Check size={12} className="text-emerald-600" />
                  {isHindi ? 'ऑडियो सुरक्षित' : 'Audio Note Attached'}
                </p>
                <p className="text-gray-400 font-mono text-[10px]">
                  {formatSeconds(recordingDuration)} · WebM Audio
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={resetRecording}
              className="btn btn-sm btn-secondary flex items-center gap-1 text-xs text-gray-600"
            >
              <RotateCcw size={12} /> {isHindi ? 'पुनः रिकॉर्ड करें' : 'Re-record'}
            </button>
          </div>
        )}
      </div>

      {/* Editable Transcript Area */}
      <div>
        <label className="text-[11px] font-600 text-gray-600 flex justify-between mb-1">
          <span>
            {isHindi
              ? 'आवाज का ट्रांसक्रिप्ट / विवरण (संपादित करें):'
              : 'Voice Transcript / Audio Notes (Editable):'}
          </span>
          <span className="text-[10px] text-gray-400">
            {isHindi ? 'वैकल्पिक' : 'Optional'}
          </span>
        </label>
        <textarea
          value={transcript}
          onChange={(e) => {
            setTranscript(e.target.value);
            onRecordingComplete({
              audioBlob,
              audioUrl,
              transcript: e.target.value,
            });
          }}
          placeholder={
            isHindi
              ? 'बोलने पर यहाँ टेक्स्ट दिखाई देगा, या सीधे टाइप करें (उदा. मुंह में छाले, लार गिरना...)'
              : 'Speech transcript will appear here, or type symptom notes manually (e.g. mouth blisters, heavy salivation)...'
          }
          className="form-textarea text-xs bg-white/80"
          rows={2}
        />
      </div>
    </div>
  );
}
