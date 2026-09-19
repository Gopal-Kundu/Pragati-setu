import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for Bhashini Multilingual Voice Input
 * Combines Web Speech API (SpeechRecognition) + MediaRecorder + Web Audio API Analyser
 */
export function useBhashiniVoice({ language = 'hi', speechCode = 'hi-IN' } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [volume, setVolume] = useState(0);
  const [audioBase64, setAudioBase64] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [error, setError] = useState(null);
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);

  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  // Check speech recognition support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSpeechSupported(Boolean(SpeechRecognition));
  }, []);

  // Update recognition language dynamically
  useEffect(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.lang = speechCode || 'hi-IN';
    }
  }, [speechCode, isListening]);

  // Volume analysis loop
  const updateVolume = useCallback(() => {
    if (!analyserRef.current) return;
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const average = sum / dataArray.length;
    // Normalize volume between 0 and 100
    setVolume(Math.min(100, Math.round((average / 128) * 100)));

    animationFrameRef.current = requestAnimationFrame(updateVolume);
  }, []);

  // Clean up recording resources
  const cleanup = useCallback(() => {
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
        // Ignore already stopped
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
    setIsListening(false);
    setVolume(0);
  }, []);

  // Start Listening & Recording (Preserves existing transcript)
  const startListening = useCallback(async (clearExisting = false) => {
    cleanup();
    setError(null);
    if (clearExisting) {
      setTranscript('');
    }
    setInterimTranscript('');
    setAudioBase64(null);
    setRecordingDuration(0);
    audioChunksRef.current = [];

    try {
      // 1. Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // 2. Setup AudioContext for volume analyzer
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        const audioCtx = new AudioContext();
        audioContextRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;
        updateVolume();
      }

      // 3. Setup MediaRecorder for raw audio capture
      if (window.MediaRecorder) {
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64String = reader.result?.toString().split(',')[1];
            setAudioBase64(base64String);
          };
          reader.readAsDataURL(blob);
        };

        mediaRecorder.start(250);
      }

      // 4. Setup Speech Recognition
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = speechCode || 'hi-IN';

        recognition.onresult = (event) => {
          let finalStr = '';
          let interimStr = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const result = event.results[i];
            if (result.isFinal) {
              finalStr += result[0].transcript + ' ';
            } else {
              interimStr += result[0].transcript;
            }
          }

          if (finalStr) {
            setTranscript(prev => (prev ? prev.trim() + ' ' + finalStr.trim() : finalStr.trim()));
          }
          setInterimTranscript(interimStr);
        };

        recognition.onerror = (evt) => {
          console.warn('[SpeechRecognition Error]:', evt.error);
          if (evt.error === 'not-allowed') {
            setError('Microphone permission denied. Please allow microphone access in your browser.');
          } else if (evt.error !== 'no-speech') {
            setError(`Speech recognition notice: ${evt.error}`);
          }
        };

        recognition.onend = () => {
          // If still marked as listening, restart (some browsers timeout after short pauses)
          if (streamRef.current && streamRef.current.active) {
            try {
              recognition.start();
            } catch {
              // Ignore
            }
          }
        };

        recognition.start();
      }

      setIsListening(true);

      // Start duration timer
      timerRef.current = setInterval(() => {
        setRecordingDuration(d => d + 1);
      }, 1000);

    } catch (err) {
      console.error('[startListening error]:', err);
      setError(err.message || 'Could not start microphone recording');
      cleanup();
    }
  }, [cleanup, speechCode, updateVolume]);

  // Stop Listening & Recording
  const stopListening = useCallback(() => {
    cleanup();
  }, [cleanup]);

  // Reset transcript and state
  const reset = useCallback(() => {
    cleanup();
    setTranscript('');
    setInterimTranscript('');
    setAudioBase64(null);
    setRecordingDuration(0);
    setError(null);
  }, [cleanup]);

  // Unmount cleanup
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return {
    isListening,
    transcript,
    interimTranscript,
    fullTranscript: (transcript + ' ' + interimTranscript).trim(),
    volume,
    audioBase64,
    recordingDuration,
    error,
    isSpeechSupported,
    startListening,
    stopListening,
    reset,
    setTranscript
  };
}

export default useBhashiniVoice;
