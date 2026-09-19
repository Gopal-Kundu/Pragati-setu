import React, { useState, useEffect } from 'react';
import { useAppState } from '../../context/StateContext';
import { bhashiniApi } from '../../services/bhashiniApi';
import { useBhashiniVoice } from '../../utils/useBhashiniVoice';
import { getSelectedLanguageFromCookie } from '../../utils/googleTranslate';
import { toast } from 'sonner';
import {
  Mic,
  MicOff,
  Sparkles,
  Check,
  X,
  Loader2,
  MapPin,
  FileText,
  AlertTriangle,
  ArrowRight,
  RotateCcw
} from 'lucide-react';

// Speech code mapping for Indian languages with fallback to English
const LANGUAGE_SPEECH_MAP = {
  en: { code: 'en', name: 'English', speechCode: 'en-IN' },
  hi: { code: 'hi', name: 'Hindi (हिन्दी)', speechCode: 'hi-IN' },
  bn: { code: 'bn', name: 'Bengali (বাংলা)', speechCode: 'bn-IN' },
  sat: { code: 'sat', name: 'Santali (ᱥᱟᱱᱛᱟᱲᱤ)', speechCode: 'hi-IN' },
  te: { code: 'te', name: 'Telugu (తెలుగు)', speechCode: 'te-IN' },
  mr: { code: 'mr', name: 'Marathi (मराठी)', speechCode: 'mr-IN' },
  ta: { code: 'ta', name: 'Tamil (தமிழ்)', speechCode: 'ta-IN' },
  ur: { code: 'ur', name: 'Urdu (اردو)', speechCode: 'ur-IN' },
  gu: { code: 'gu', name: 'Gujarati (ગુજરાતી)', speechCode: 'gu-IN' },
  kn: { code: 'kn', name: 'Kannada (ಕನ್ನಡ)', speechCode: 'kn-IN' },
  or: { code: 'or', name: 'Odia (ଓଡ଼ିଆ)', speechCode: 'or-IN' },
  ml: { code: 'ml', name: 'Malayalam (മലയാളം)', speechCode: 'ml-IN' },
  pa: { code: 'pa', name: 'Punjabi (ਪੰਜਾਬੀ)', speechCode: 'pa-IN' },
  as: { code: 'as', name: 'Assamese (অসমীয়া)', speechCode: 'as-IN' },
  mai: { code: 'mai', name: 'Maithili (मैथिली)', speechCode: 'hi-IN' },
  ho: { code: 'ho', name: 'Ho (ᱦᱳ)', speechCode: 'hi-IN' },
  unr: { code: 'unr', name: 'Mundari (ᱢᱩᱱᱰᱟᱨᱤ)', speechCode: 'hi-IN' },
  kru: { code: 'kru', name: 'Kurukh (कुड़ुख़)', speechCode: 'hi-IN' },
  kht: { code: 'kht', name: 'Khortha (खोरठा)', speechCode: 'hi-IN' },
  sck: { code: 'sck', name: 'Nagpuri (नागपुरी)', speechCode: 'hi-IN' },
  ks: { code: 'ks', name: 'Kashmiri (کٲشُر)', speechCode: 'ks-IN' },
  ne: { code: 'ne', name: 'Nepali (नेपाली)', speechCode: 'ne-NP' },
  sd: { code: 'sd', name: 'Sindhi (سنڌي)', speechCode: 'sd-IN' },
  kok: { code: 'kok', name: 'Konkani (कोंकणी)', speechCode: 'kok-IN' },
  doi: { code: 'doi', name: 'Dogri (डोगरी)', speechCode: 'doi-IN' },
  mni: { code: 'mni', name: 'Manipuri (ꯃꯩꯇꯩ)', speechCode: 'mni-IN' },
  brx: { code: 'brx', name: 'Bodo (बर’)', speechCode: 'brx-IN' },
  sa: { code: 'sa', name: 'Sanskrit (संस्कृतम्)', speechCode: 'sa-IN' }
};

export default function BhashiniVoiceModal() {
  const {
    isBhashiniModalOpen,
    setIsBhashiniModalOpen,
    setIsSubmitModalOpen,
    setPrefilledGrievanceData
  } = useAppState();

  // Fetch language from cookie, if not selected fallback strictly to English
  const [activeLang, setActiveLang] = useState(() => {
    const cookieLang = getSelectedLanguageFromCookie();
    return (cookieLang && LANGUAGE_SPEECH_MAP[cookieLang]) ? LANGUAGE_SPEECH_MAP[cookieLang] : LANGUAGE_SPEECH_MAP.en;
  });

  // Keep language in sync whenever modal opens
  useEffect(() => {
    if (isBhashiniModalOpen) {
      const cookieLang = getSelectedLanguageFromCookie();
      const resolved = (cookieLang && LANGUAGE_SPEECH_MAP[cookieLang]) ? LANGUAGE_SPEECH_MAP[cookieLang] : LANGUAGE_SPEECH_MAP.en;
      setActiveLang(resolved);
    }
  }, [isBhashiniModalOpen]);

  const {
    isListening,
    fullTranscript,
    volume,
    audioBase64,
    audioMimeType,
    recordingDuration,
    speechEngine,
    error: micError,
    startListening,
    stopListening,
    stopAndGetAudio,
    reset: resetVoice,
    setTranscript
  } = useBhashiniVoice({
    language: activeLang.code,
    speechCode: activeLang.speechCode
  });

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [extractedData, setExtractedData] = useState(null);

  if (!isBhashiniModalOpen) return null;

  const handleToggleRecord = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening(false);
    }
  };

  // Called when user clicks "Done" after speaking (Universal Chrome, Brave, Firefox, Mobile & Desktop)
  const handleDone = async () => {
    let speechText = fullTranscript.trim();
    let currentAudio = audioBase64;
    let currentMime = audioMimeType;

    // If still actively recording, finalize audio capture
    if (isListening) {
      const audioResult = await stopAndGetAudio();
      speechText = (audioResult.transcript || speechText).trim();
      currentAudio = audioResult.audioBase64 || currentAudio;
      currentMime = audioResult.mimeType || currentMime;
    }

    if (!speechText && !currentAudio && recordingDuration === 0) {
      toast.error('Please tap the mic and speak your problem first.');
      return;
    }

    setIsAnalyzing(true);
    try {
      // Call backend Gemini AI extraction endpoint with transcript AND/OR audioBase64
      const res = await bhashiniApi.extractProblem({
        transcript: speechText,
        translatedText: speechText,
        sourceLanguage: activeLang.code,
        audioBase64: currentAudio,
        mimeType: currentMime
      });

      if (res.success && res.data) {
        const rawSpeech = speechText || res.transcript || '';
        const cleanTitle = (res.data.title || '').replace(/^["'\s]+|["'\s]+$/g, '').trim();
        const title = cleanTitle || (rawSpeech ? (rawSpeech.split(/\s+/).length > 8 ? rawSpeech.split(/\s+/).slice(0, 8).join(' ') + '...' : rawSpeech) : 'Voice Reported Challenge');
        const description = (res.data.description || res.data.narrative || rawSpeech || 'Societal grievance reported via voice.').trim();

        setExtractedData({
          ...res.data,
          title,
          description,
          narrative: description
        });

        if (res.transcript && !speechText) {
          setTranscript(res.transcript);
        }
        toast.success('Speech analyzed and problem description generated!');
      } else {
        // Fallback problem parameters
        const cleanWords = speechText ? speechText.trim().split(/\s+/) : [];
        const defaultTitle = cleanWords.length > 0 
          ? (cleanWords.length > 8 ? cleanWords.slice(0, 8).join(' ') + '...' : cleanWords.join(' '))
          : 'Voice Reported Challenge';
        const desc = speechText ? speechText.trim() : 'Societal grievance reported via voice audio';
        setExtractedData({
          title: defaultTitle.charAt(0).toUpperCase() + defaultTitle.slice(1),
          narrative: desc,
          description: desc,
          domain: 'Water Resources',
          district: 'Ranchi',
          block: '',
          urgency: 'High'
        });
        toast.info('Problem description generated from voice.');
      }
    } catch (err) {
      console.warn('Gemini speech extraction warning:', err);
      const cleanWords = speechText ? speechText.trim().split(/\s+/) : [];
      const defaultTitle = cleanWords.length > 0 
        ? (cleanWords.length > 8 ? cleanWords.slice(0, 8).join(' ') + '...' : cleanWords.join(' '))
        : 'Voice Reported Grievance';
      const desc = speechText ? speechText.trim() : 'Societal grievance reported via voice audio';
      setExtractedData({
        title: defaultTitle.charAt(0).toUpperCase() + defaultTitle.slice(1),
        narrative: desc,
        description: desc,
        domain: 'Water Resources',
        district: 'Ranchi',
        block: '',
        urgency: 'Medium'
      });
      toast.info('Problem description generated from speech.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Transfer extracted problem to Community Portal Form via Context
  const handleSubmitToReportModal = () => {
    const rawSpeech = fullTranscript.trim();
    const cleanWords = rawSpeech ? rawSpeech.split(/\s+/) : [];
    const defaultTitle = cleanWords.length > 0 
      ? (cleanWords.length > 8 ? cleanWords.slice(0, 8).join(' ') + '...' : cleanWords.join(' '))
      : 'Voice Reported Challenge';
    const finalTitle = (extractedData?.title || '').trim() || (defaultTitle.charAt(0).toUpperCase() + defaultTitle.slice(1));
    const finalDesc = (extractedData?.description || extractedData?.narrative || rawSpeech || 'Societal grievance reported via voice.').trim();

    setPrefilledGrievanceData({
      title: finalTitle,
      narrative: finalDesc,
      description: finalDesc,
      districtName: extractedData?.district || 'Ranchi',
      district: extractedData?.district || 'Ranchi',
      block: extractedData?.block || '',
      panchayat: extractedData?.panchayat || '',
      domain: extractedData?.domain || 'Others'
    });

    // Close voice modal (transfers directly to CommunityPortal form)
    setIsBhashiniModalOpen(false);
    toast.success('Problem details transferred to report form!');
  };

  const handleClose = () => {
    if (isListening) stopListening();
    setIsBhashiniModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in">
      <div className="bg-white text-slate-900 w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="bg-white border-b border-slate-200 p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight">
                Voice Problem Report
              </h3>
              
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          
          {/* Central Mic & Audio Visualizer */}
          <div className="bg-gradient-to-b from-slate-50 to-emerald-50/30 border border-slate-200/80 rounded-3xl p-6 text-center space-y-4 relative overflow-hidden">
            
            {/* Visualizer Waves */}
            <div className="flex items-center justify-center gap-1 h-7">
              {[30, 60, 90, 50, 80, 100, 75, 45, 85, 60, 40].map((h, i) => (
                <div
                  key={i}
                  className={`w-1 rounded-full transition-all duration-150 ${
                    isListening ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                  style={{
                    height: isListening ? `${Math.max(5, (h * volume) / 100)}px` : '4px'
                  }}
                />
              ))}
            </div>

            {/* Tap to Speak Mic Button */}
            <div className="relative inline-flex items-center justify-center">
              {isListening && (
                <>
                  <div className="absolute w-28 h-28 rounded-full bg-rose-500/20 animate-ping" />
                  <div className="absolute w-24 h-24 rounded-full bg-rose-500/30 animate-pulse" />
                </>
              )}
              <button
                type="button"
                onClick={handleToggleRecord}
                className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center text-white shadow-xl transition-all transform hover:scale-105 active:scale-95 cursor-pointer ${
                  isListening
                    ? 'bg-rose-600 ring-4 ring-rose-200'
                    : 'bg-emerald-600 hover:bg-emerald-700 ring-4 ring-emerald-100'
                }`}
              >
                {isListening ? (
                  <MicOff className="w-8 h-8 animate-bounce" />
                ) : (
                  <Mic className="w-8 h-8" />
                )}
              </button>
            </div>

            {/* Tap To Speak Caption */}
            <div>
              <h4 className="font-extrabold text-base text-slate-800">
                {isListening
                  ? (speechEngine === 'web-speech' ? 'Listening... Tap to Pause' : 'Recording Audio... Tap to Pause')
                  : 'Tap to Speak'}
              </h4>
              <p className="text-sm font-semibold text-emerald-800 mt-1">
                Please tell us your problem and location
              </p>
              
            </div>

            {micError && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 rounded-xl flex items-center space-x-2 text-left">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600" />
                <span>{micError}</span>
              </div>
            )}
          </div>

          {/* Real-time Spoken Transcript Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                Spoken Transcript:
              </label>
              {(fullTranscript || audioBase64) && (
                <button
                  type="button"
                  onClick={() => { resetVoice(); setExtractedData(null); }}
                  className="text-[11px] text-slate-400 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            <div className="relative">
              <textarea
                rows={3}
                value={fullTranscript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Please tell us your problem and location (words appear here as you speak or after clicking Done)..."
                className="w-full text-xs sm:text-sm p-3.5 rounded-2xl border border-slate-300 text-slate-900 bg-slate-50 placeholder:text-slate-400 font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition-all"
              />

              {isAnalyzing && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-xs rounded-2xl flex items-center justify-center space-x-2 text-emerald-800 text-xs sm:text-sm font-bold shadow-inner">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                  <span>Analyzing Speech with AI...</span>
                </div>
              )}
            </div>
          </div>

          {/* Done Button: Visible whenever transcript has text, user recorded audio, or is currently recording */}
          {((fullTranscript && fullTranscript.trim().length > 0) || recordingDuration >= 1 || isListening || audioBase64) && !isAnalyzing && (
            <div className="flex justify-end pt-1 animate-in fade-in">
              <button
                type="button"
                onClick={handleDone}
                className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 hover:shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Done</span>
                
              </button>
            </div>
          )}

          {/* Extracted Problem Description Card (Generated by Gemini) */}
          {extractedData && (
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 sm:p-5 space-y-3 animate-in zoom-in-95">
              <div className="flex items-center space-x-2 pb-2 border-b border-emerald-200/60 text-xs font-black text-emerald-900">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Generated Problem Description</span>
              </div>

              {/* Title */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Problem Title
                </span>
                <p className="text-sm font-extrabold text-slate-900 mt-0.5">
                  {extractedData.title}
                </p>
              </div>

              {/* Description */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Description
                </span>
                <p className="text-xs text-slate-700 font-medium mt-0.5 leading-relaxed bg-white/70 p-3 rounded-xl border border-emerald-100">
                  {extractedData.description || extractedData.narrative}
                </p>
              </div>
              {/* Submit Problem Button */}
              <div className="pt-3 border-t border-emerald-200/60 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleSubmitToReportModal}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 hover:shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <span>Submit to Problem Form</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
