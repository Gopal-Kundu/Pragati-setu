import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
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
  RotateCcw,
  User,
  Phone,
  Upload,
  Video,
  Film,
  Image as ImageIcon,
  Trash2
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

const JHARKHAND_DISTRICTS = [
  { id: 'bokaro', name: 'Bokaro', nameHi: 'बोकारो' },
  { id: 'chatra', name: 'Chatra', nameHi: 'चतरा' },
  { id: 'deoghar', name: 'Deoghar', nameHi: 'देवघर' },
  { id: 'dhanbad', name: 'Dhanbad', nameHi: 'धनबाद' },
  { id: 'dumka', name: 'Dumka', nameHi: 'दुमका' },
  { id: 'east_singhbhum', name: 'East Singhbhum', nameHi: 'पूर्वी सिंहभूम' },
  { id: 'garhwa', name: 'Garhwa', nameHi: 'गढ़वा' },
  { id: 'giridih', name: 'Giridih', nameHi: 'गिरिडीह' },
  { id: 'godda', name: 'Godda', nameHi: 'गोड्डा' },
  { id: 'gumla', name: 'Gumla', nameHi: 'गुमला' },
  { id: 'hazaribagh', name: 'Hazaribagh', nameHi: 'हजारीबाग' },
  { id: 'jamtara', name: 'Jamtara', nameHi: 'जामताड़ा' },
  { id: 'khunti', name: 'Khunti', nameHi: 'खूंटी' },
  { id: 'koderma', name: 'Koderma', nameHi: 'कोडरमा' },
  { id: 'latehar', name: 'Latehar', nameHi: 'लातेहार' },
  { id: 'lohardaga', name: 'Lohardaga', nameHi: 'लोहरदगा' },
  { id: 'pakur', name: 'Pakur', nameHi: 'पाकुड़' },
  { id: 'palamu', name: 'Palamu', nameHi: 'पलामू' },
  { id: 'ramgarh', name: 'Ramgarh', nameHi: 'रामगढ़' },
  { id: 'ranchi', name: 'Ranchi', nameHi: 'राँची' },
  { id: 'sahibganj', name: 'Sahibganj', nameHi: 'साहिबगंज' },
  { id: 'saraikela_kharsawan', name: 'Saraikela Kharsawan', nameHi: 'सरायकेला खरसावां' },
  { id: 'simdega', name: 'Simdega', nameHi: 'सिमडेगा' },
  { id: 'west_singhbhum', name: 'West Singhbhum', nameHi: 'पश्चिमी सिंहभूम' }
];

export default function BhashiniVoiceModal() {
  const {
    isBhashiniModalOpen,
    setIsBhashiniModalOpen,
    districts,
    submitCitizenProblem
  } = useAppState();

  const currentUser = useSelector((state) => state.auth?.user);
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('Ranchi');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Evidence Attachments (Photo and Video)
  const [evidenceImage, setEvidenceImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [evidenceVideo, setEvidenceVideo] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be under 10MB');
      return;
    }
    setEvidenceImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleVideoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 80 * 1024 * 1024) {
      toast.error('Video size must be under 80MB');
      return;
    }
    setEvidenceVideo(file);
    setVideoPreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setEvidenceImage(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
  };

  const removeVideo = () => {
    setEvidenceVideo(null);
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoPreview(null);
  };

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

  const districtList = (districts && districts.length > 0) ? districts : JHARKHAND_DISTRICTS;

  // Sync user info if authenticated
  useEffect(() => {
    if (currentUser) {
      if (currentUser.name && !userName) setUserName(currentUser.name);
      if (currentUser.phone && !userPhone) setUserPhone(currentUser.phone);
    }
  }, [currentUser]);

  // Pre-select district if extracted by AI
  useEffect(() => {
    if (extractedData?.district) {
      const match = districtList.find((d) => {
        const name = typeof d === 'string' ? d : d.name;
        const id = typeof d === 'string' ? d : d.id;
        return (
          name.toLowerCase() === extractedData.district.toLowerCase() ||
          id.toLowerCase() === extractedData.district.toLowerCase()
        );
      });
      if (match) {
        setSelectedDistrict(typeof match === 'string' ? match : match.name);
      }
    }
  }, [extractedData, districtList]);

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

  // Directly submit problem via submitCitizenProblem API without navigating to another form
  const handleSubmitProblem = async () => {
    if (!userName.trim()) {
      toast.error('Please enter your name.');
      return;
    }
    if (!userPhone.trim()) {
      toast.error('Please enter your phone number.');
      return;
    }
    const cleanPhone = userPhone.trim().replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      toast.error('Please enter a valid 10-digit phone number.');
      return;
    }

    setIsSubmitting(true);
    try {
      const rawSpeech = fullTranscript.trim();
      const cleanWords = rawSpeech ? rawSpeech.split(/\s+/) : [];
      const defaultTitle = cleanWords.length > 0 
        ? (cleanWords.length > 8 ? cleanWords.slice(0, 8).join(' ') + '...' : cleanWords.join(' '))
        : 'Voice Reported Challenge';
      const finalTitle = (extractedData?.title || '').trim() || (defaultTitle.charAt(0).toUpperCase() + defaultTitle.slice(1));
      const finalDesc = (extractedData?.description || extractedData?.narrative || rawSpeech || 'Societal grievance reported via voice.').trim();

      const res = await submitCitizenProblem({
        title: finalTitle,
        narrative: finalDesc,
        description: finalDesc,
        district: selectedDistrict,
        districtName: selectedDistrict,
        block: extractedData?.block || '',
        panchayat: extractedData?.panchayat || '',
        state: 'Jharkhand',
        name: userName.trim(),
        phone: userPhone.trim(),
        submitterType: 'Citizen',
        urgency: extractedData?.urgency || 'High',
        evidenceFile: evidenceImage,
        videoFile: evidenceVideo
      });

      if (res && res.success) {
        toast.success('Problem submitted successfully!');
        if (res.problem) {
          window.dispatchEvent(new CustomEvent('problem-submitted', { detail: res.problem }));
        }
        resetVoice();
        setExtractedData(null);
        setUserName(currentUser?.name || '');
        setUserPhone(currentUser?.phone || '');
        removeImage();
        removeVideo();
        setIsBhashiniModalOpen(false);
      } else {
        toast.error(res?.message || 'Failed to submit problem. Please try again.');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'An error occurred while submitting.');
    } finally {
      setIsSubmitting(false);
    }
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
                  onClick={() => { resetVoice(); setExtractedData(null); removeImage(); removeVideo(); }}
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

              {/* Location & Submitter Details */}
              <div className="pt-2 border-t border-emerald-200/60 space-y-3">
                {/* Location Dropdown */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1 mb-1">
                    <MapPin className="w-3 h-3 text-emerald-600" />
                    Location (District)
                  </label>
                  <select
                    value={selectedDistrict}
                    onChange={(e) => setSelectedDistrict(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 text-slate-900 bg-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all shadow-xs cursor-pointer"
                  >
                    {districtList.map((d) => {
                      const dName = typeof d === 'string' ? d : (d.name || d.id);
                      const dLabel = typeof d === 'object' && d.nameHi ? `${d.name} (${d.nameHi})` : dName;
                      return (
                        <option key={typeof d === 'object' ? d.id || d.name : d} value={dName}>
                          {dLabel}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Submitter Name and Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1 mb-1">
                      <User className="w-3 h-3 text-emerald-600" />
                      Your Name
                    </label>
                    <input
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="e.g. Ramesh Kumar"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 text-slate-900 bg-white placeholder:text-slate-400 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all shadow-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1 mb-1">
                      <Phone className="w-3 h-3 text-emerald-600" />
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={userPhone}
                      onChange={(e) => setUserPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 text-slate-900 bg-white placeholder:text-slate-400 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all shadow-xs"
                    />
                  </div>
                </div>

                {/* Field Evidence Attachments (Photo & Video - Optional) */}
                <div className="space-y-2 pt-2 border-t border-emerald-200/60">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                    <Upload className="w-3 h-3 text-emerald-600" />
                    Field Evidence Attachments (Optional)
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* 1. Field Photo Box */}
                    <div className="bg-white/80 border border-emerald-100 rounded-xl p-3 space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Attach Photo</span>
                        </span>
                        {evidenceImage && (
                          <button
                            type="button"
                            onClick={removeImage}
                            className="text-[11px] text-rose-600 hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>

                      {!imagePreview ? (
                        <label className="flex flex-col items-center justify-center p-3 rounded-lg border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 text-slate-600 text-xs font-semibold cursor-pointer transition-colors text-center space-y-1">
                          <Upload className="w-4 h-4 text-emerald-600" />
                          <span className="text-[11px]">Select image (Max 10MB)</span>
                          <span className="text-[9px] text-slate-400">JPG, PNG, WebP</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="hidden"
                          />
                        </label>
                      ) : (
                        <div className="flex items-center space-x-2.5 bg-slate-50 p-2 rounded-lg border border-slate-200">
                          <img
                            src={imagePreview}
                            alt="Evidence Preview"
                            className="w-12 h-12 object-cover rounded-md border border-slate-200 flex-shrink-0"
                          />
                          <div className="min-w-0 flex-1 text-xs">
                            <p className="font-bold text-slate-800 truncate text-[11px]">{evidenceImage?.name}</p>
                            <span className="text-[10px] text-slate-400">{(evidenceImage?.size / (1024 * 1024)).toFixed(2)} MB</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 2. Field Video Box */}
                    <div className="bg-white/80 border border-emerald-100 rounded-xl p-3 space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                          <Video className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Attach Video</span>
                        </span>
                        {evidenceVideo && (
                          <button
                            type="button"
                            onClick={removeVideo}
                            className="text-[11px] text-rose-600 hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>

                      {!videoPreview ? (
                        <label className="flex flex-col items-center justify-center p-3 rounded-lg border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50 text-slate-600 text-xs font-semibold cursor-pointer transition-colors text-center space-y-1">
                          <Film className="w-4 h-4 text-indigo-600" />
                          <span className="text-[11px]">Select video (Max 80MB)</span>
                          <span className="text-[9px] text-slate-400">MP4, WebM, MOV</span>
                          <input
                            type="file"
                            accept="video/*,video/mp4,video/webm,video/quicktime"
                            onChange={handleVideoChange}
                            className="hidden"
                          />
                        </label>
                      ) : (
                        <div className="space-y-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200">
                          <video
                            src={videoPreview}
                            controls
                            className="w-full h-20 object-cover rounded-md border border-slate-200 bg-black"
                          />
                          <div className="flex items-center justify-between text-xs px-0.5">
                            <span className="font-bold text-slate-800 truncate text-[10px] max-w-[140px]">{evidenceVideo?.name}</span>
                            <span className="text-[10px] text-slate-400">{(evidenceVideo?.size / (1024 * 1024)).toFixed(2)} MB</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Problem Button */}
              <div className="pt-3 border-t border-emerald-200/60 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleSubmitProblem}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 hover:shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting Problem...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Submit Problem</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
