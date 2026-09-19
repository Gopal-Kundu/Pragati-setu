import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Check if the browser environment is mobile (Android, iOS)
 */
export function isMobileBrowser() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         (typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 1 && !/Windows NT/i.test(navigator.userAgent));
}

/**
 * Universal Audio MIME type detector for MediaRecorder fallback (Firefox, Brave)
 */
export function getSupportedAudioMimeType() {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    return '';
  }
  const candidateTypes = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/mp4',
    'audio/aac',
    'audio/wav'
  ];
  for (const type of candidateTypes) {
    try {
      if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    } catch {
      // Continue checking next
    }
  }
  return '';
}

/**
 * Smart Word-Level Overlap Merger
 * Merges base text with incoming speech text by eliminating identical phrases
 * or overlapping suffix-prefix word sequences (fixes mobile Android repetition bug!).
 */
export function mergeTranscriptWithOverlap(base, incoming) {
  const b = (base || '').trim();
  const inc = (incoming || '').trim();

  if (!b) return inc;
  if (!inc) return b;

  const bLower = b.toLowerCase();
  const incLower = inc.toLowerCase();

  // 1. Exact duplicate
  if (bLower === incLower) return b;

  // 2. Base already ends with incoming phrase (e.g. "Good morning" + incoming "Good morning")
  if (bLower.endsWith(incLower)) return b;

  // 3. Incoming contains the entire base as prefix (e.g. "Good morning" + incoming "Good morning sir")
  if (incLower.startsWith(bLower)) return inc;

  // 4. Word-level suffix/prefix overlap check
  const baseWords = b.split(/\s+/);
  const incWords = inc.split(/\s+/);

  const maxCheck = Math.min(baseWords.length, incWords.length);
  for (let len = maxCheck; len > 0; len--) {
    const baseSuffix = baseWords.slice(baseWords.length - len).map(w => w.toLowerCase()).join(' ');
    const incPrefix = incWords.slice(0, len).map(w => w.toLowerCase()).join(' ');
    if (baseSuffix === incPrefix) {
      const remainingWords = incWords.slice(len);
      return remainingWords.length > 0 ? `${b} ${remainingWords.join(' ')}` : b;
    }
  }

  return `${b} ${inc}`;
}

/**
 * Universal Custom Hook for Multilingual Voice Input
 *
 * Prevents text duplication on Android & Desktop Web Speech API:
 * 1. Uses mergeTranscriptWithOverlap to eliminate repeated phrases from Android Google Speech restarts.
 * 2. Derives session final text idempotently from event.results.
 * 3. Adds a 200ms debounce buffer on Android onend restarts to prevent audio queue replay.
 * 4. Merges interim text with transcript cleanly.
 */
export function useBhashiniVoice({ language = 'hi', speechCode = 'hi-IN' } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [volume, setVolume] = useState(0);
  const [audioBase64, setAudioBase64] = useState(null);
  const [audioMimeType, setAudioMimeType] = useState('');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [error, setError] = useState(null);
  const [speechEngine, setSpeechEngine] = useState('web-speech'); // 'web-speech' | 'media-recorder'
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);

  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioBase64Ref = useRef(null);
  const audioBlobRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const timerRef = useRef(null);
  const restartTimerRef = useRef(null);
  const streamRef = useRef(null);
  const isListeningRef = useRef(false);
  const mimeTypeRef = useRef('');
  const stopPromiseResolverRef = useRef(null);

  // Transcript tracking refs to eliminate Android duplication
  const baseTranscriptRef = useRef('');
  const sessionFinalRef = useRef('');

  // Check speech recognition capability
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      setIsSpeechSupported(Boolean(SpeechRecognition));
    }
  }, []);

  // Sync recognition language dynamically
  useEffect(() => {
    if (recognitionRef.current && isListeningRef.current) {
      recognitionRef.current.lang = speechCode || 'hi-IN';
    }
  }, [speechCode]);

  // Volume analysis loop for MediaRecorder mode (Web Audio API)
  const updateVolume = useCallback(() => {
    if (!analyserRef.current) return;
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const average = sum / dataArray.length;
    setVolume(Math.min(100, Math.round((average / 128) * 100)));

    animationFrameRef.current = requestAnimationFrame(updateVolume);
  }, []);

  // Volume simulation for Web Speech mode
  const startVolumeSimulation = useCallback(() => {
    let frameId;
    const animate = () => {
      if (!isListeningRef.current) {
        setVolume(0);
        return;
      }
      const time = Date.now() / 140;
      const base = Math.sin(time) * 25 + Math.cos(time * 1.9) * 20;
      const simulatedVol = Math.min(100, Math.max(20, Math.round(55 + base)));
      setVolume(simulatedVol);
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    animationFrameRef.current = frameId;
  }, []);

  // Helper to convert Blob to Base64
  const blobToBase64 = useCallback((blob) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result?.toString().split(',')[1] || null;
        resolve(base64String);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  }, []);

  // Cleanup all audio and recognition resources
  const cleanup = useCallback(() => {
    isListeningRef.current = false;
    setIsListening(false);

    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Ignore
      }
      mediaRecorderRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch {
        // Ignore
      }
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setVolume(0);
  }, []);

  // MediaRecorder fallback handler (used when SpeechRecognition is unsupported or blocked by Brave/Firefox)
  const startMediaRecorderFallback = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      streamRef.current = stream;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        try {
          const audioCtx = new AudioCtx();
          audioContextRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          analyserRef.current = analyser;
          updateVolume();
        } catch (audioErr) {
          console.warn('[AudioContext Warning]:', audioErr);
        }
      }

      if (typeof window !== 'undefined' && window.MediaRecorder) {
        const optimalMimeType = getSupportedAudioMimeType();
        mimeTypeRef.current = optimalMimeType;
        setAudioMimeType(optimalMimeType);

        const options = optimalMimeType ? { mimeType: optimalMimeType } : undefined;
        let mediaRecorder;
        try {
          mediaRecorder = new MediaRecorder(stream, options);
        } catch {
          mediaRecorder = new MediaRecorder(stream);
        }
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const chosenMime = mimeTypeRef.current || (audioChunksRef.current[0]?.type) || 'audio/webm';
          const blob = new Blob(audioChunksRef.current, { type: chosenMime });
          audioBlobRef.current = blob;

          const base64Str = await blobToBase64(blob);
          audioBase64Ref.current = base64Str;
          setAudioBase64(base64Str);

          if (stopPromiseResolverRef.current) {
            stopPromiseResolverRef.current({
              audioBase64: base64Str,
              mimeType: chosenMime,
              blob
            });
            stopPromiseResolverRef.current = null;
          }
        };

        mediaRecorder.start(250);
        setSpeechEngine('media-recorder');
      }
    } catch (err) {
      console.error('[MediaRecorder Fallback Error]:', err);
      setError('Microphone access denied. Please grant microphone permissions.');
      cleanup();
    }
  }, [cleanup, updateVolume, blobToBase64]);

  // Start Listening & Recording
  const startListening = useCallback(async (clearExisting = false) => {
    cleanup();
    setError(null);

    if (clearExisting) {
      baseTranscriptRef.current = '';
      sessionFinalRef.current = '';
      setTranscript('');
    } else {
      // Preserve current transcript as the base prefix for new words
      baseTranscriptRef.current = transcript.trim();
      sessionFinalRef.current = '';
    }
    setInterimTranscript('');

    audioChunksRef.current = [];
    audioBase64Ref.current = null;
    audioBlobRef.current = null;
    setRecordingDuration(0);

    const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = speechCode || 'hi-IN';

        recognition.onresult = (event) => {
          let sessionFinal = '';
          let sessionInterim = '';

          // Loop through all results and merge with overlap prevention
          for (let i = 0; i < event.results.length; i++) {
            const item = event.results[i];
            if (item && item[0]) {
              const text = item[0].transcript.trim();
              if (!text) continue;
              if (item.isFinal) {
                sessionFinal = mergeTranscriptWithOverlap(sessionFinal, text);
              } else {
                sessionInterim = text;
              }
            }
          }

          sessionFinalRef.current = sessionFinal;

          // Merge base transcript with current session text (eliminates duplicates!)
          const base = baseTranscriptRef.current ? baseTranscriptRef.current.trim() : '';
          const combinedFinal = mergeTranscriptWithOverlap(base, sessionFinal);

          setTranscript(combinedFinal);
          setInterimTranscript(sessionInterim);
          setSpeechEngine('web-speech');
        };

        recognition.onerror = (evt) => {
          console.warn('[SpeechRecognition Event]:', evt.error);
          if (evt.error === 'not-allowed') {
            setError('Microphone permission denied. Please allow microphone access in your browser settings.');
            cleanup();
          } else if (evt.error === 'network' || evt.error === 'service-not-allowed') {
            console.info('[SpeechRecognition Note]: Browser shield blocked cloud speech. Falling back to MediaRecorder audio.');
            startMediaRecorderFallback();
          } else if (evt.error !== 'no-speech') {
            // Silently handle non-fatal pauses
          }
        };

        recognition.onend = () => {
          // Commit finalized session text so restarted session appends cleanly without repeating
          if (sessionFinalRef.current) {
            const base = baseTranscriptRef.current ? baseTranscriptRef.current.trim() : '';
            baseTranscriptRef.current = mergeTranscriptWithOverlap(base, sessionFinalRef.current);
            sessionFinalRef.current = '';
            setTranscript(baseTranscriptRef.current);
          }
          setInterimTranscript('');

          // If still in listening mode, debounce restart to let Android audio buffer flush
          if (isListeningRef.current) {
            clearTimeout(restartTimerRef.current);
            restartTimerRef.current = setTimeout(() => {
              if (isListeningRef.current && recognitionRef.current) {
                try {
                  recognitionRef.current.start();
                } catch {
                  // Ignore if already active
                }
              }
            }, 200);
          }
        };

        recognition.start();
        isListeningRef.current = true;
        setIsListening(true);
        setSpeechEngine('web-speech');

        // Start dynamic visualizer wave animation
        startVolumeSimulation();

        // Start duration counter
        timerRef.current = setInterval(() => {
          setRecordingDuration(d => d + 1);
        }, 1000);

      } catch (recErr) {
        console.warn('[SpeechRecognition Start Failed]: Falling back to MediaRecorder.', recErr);
        isListeningRef.current = true;
        setIsListening(true);
        startMediaRecorderFallback();

        timerRef.current = setInterval(() => {
          setRecordingDuration(d => d + 1);
        }, 1000);
      }
    } else {
      // Fallback Path: MediaRecorder (Firefox and browsers without Web Speech API)
      isListeningRef.current = true;
      setIsListening(true);
      await startMediaRecorderFallback();

      timerRef.current = setInterval(() => {
        setRecordingDuration(d => d + 1);
      }, 1000);
    }
  }, [cleanup, transcript, speechCode, startVolumeSimulation, startMediaRecorderFallback]);

  // Stop Listening and commit transcript
  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    setIsListening(false);

    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }

    if (sessionFinalRef.current) {
      const base = baseTranscriptRef.current ? baseTranscriptRef.current.trim() : '';
      baseTranscriptRef.current = mergeTranscriptWithOverlap(base, sessionFinalRef.current);
      sessionFinalRef.current = '';
      setTranscript(baseTranscriptRef.current);
    }
    setInterimTranscript('');

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Ignore
      }
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch {
        // Ignore
      }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setVolume(0);
  }, []);

  // Stop and guarantee audio Base64 data is returned if in MediaRecorder mode
  const stopAndGetAudio = useCallback(async () => {
    if (!isListeningRef.current) {
      const finalT = mergeTranscriptWithOverlap(transcript, interimTranscript);
      return {
        audioBase64: audioBase64Ref.current,
        mimeType: mimeTypeRef.current || 'audio/webm',
        transcript: finalT,
        recordingDuration
      };
    }

    if (speechEngine === 'web-speech') {
      stopListening();
      const finalT = (baseTranscriptRef.current || transcript).trim();
      return {
        audioBase64: null,
        mimeType: '',
        transcript: finalT,
        recordingDuration
      };
    }

    return new Promise((resolve) => {
      stopPromiseResolverRef.current = resolve;
      stopListening();

      setTimeout(() => {
        if (stopPromiseResolverRef.current) {
          stopPromiseResolverRef.current({
            audioBase64: audioBase64Ref.current,
            mimeType: mimeTypeRef.current || 'audio/webm',
            transcript: mergeTranscriptWithOverlap(transcript, interimTranscript),
            recordingDuration
          });
          stopPromiseResolverRef.current = null;
        }
      }, 500);
    });
  }, [stopListening, speechEngine, transcript, interimTranscript, recordingDuration]);

  // Update transcript externally (e.g. typing or clearing)
  const updateTranscript = useCallback((val) => {
    const nextVal = typeof val === 'function' ? val(transcript) : val;
    baseTranscriptRef.current = (nextVal || '').trim();
    sessionFinalRef.current = '';
    setInterimTranscript('');
    setTranscript(nextVal || '');
  }, [transcript]);

  // Reset transcript and audio state
  const reset = useCallback(() => {
    cleanup();
    baseTranscriptRef.current = '';
    sessionFinalRef.current = '';
    setTranscript('');
    setInterimTranscript('');
    setAudioBase64(null);
    audioBase64Ref.current = null;
    audioBlobRef.current = null;
    audioChunksRef.current = [];
    setRecordingDuration(0);
    setError(null);
  }, [cleanup]);

  // Safe deduplicated full transcript
  const getFullTranscript = () => {
    return mergeTranscriptWithOverlap(transcript, interimTranscript);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return {
    isListening,
    transcript,
    interimTranscript,
    fullTranscript: getFullTranscript(),
    volume,
    audioBase64: audioBase64 || audioBase64Ref.current,
    audioMimeType: audioMimeType || mimeTypeRef.current,
    recordingDuration,
    speechEngine,
    error,
    isSpeechSupported,
    startListening,
    stopListening,
    stopAndGetAudio,
    reset,
    setTranscript: updateTranscript
  };
}

export default useBhashiniVoice;
