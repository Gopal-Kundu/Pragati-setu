import React, { useState, useEffect } from 'react';
import { useAppState } from '../../context/StateContext';
import { bhashiniApi } from '../../services/bhashiniApi';
import { useBhashiniVoice } from '../../utils/useBhashiniVoice';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import {
  Mic,
  MicOff,
  Volume2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  X,
  Globe,
  Radio,
  RefreshCw,
  Send,
  Check,
  Loader2,
  MapPin,
  Users,
  Droplets,
  Sprout,
  HeartPulse,
  Zap,
  Building,
  Layers,
  FileText,
  AlertTriangle
} from 'lucide-react';

const SAMPLE_VOICE_PROMPTS = [
  {
    lang: 'hi',
    label: 'पेयजल संकट (खूंटी/तोरपा)',
    text: 'हमार गांव तोरपा खूंटी में पिछला 2 साल से चापाकल खराब है, पानी का बहुत किल्लत हो रहा है, लगभग 300 परिवार परेशान हैं।'
  },
  {
    lang: 'hi',
    label: 'फसल कीट व सिंचाई (कांके/रांची)',
    text: 'कांके ब्लॉक में आलू और सब्जी की फसल में कीड़ा लग गया है और नहर में पानी नहीं आ रहा है, 200 किसान परेशान हैं।'
  },
  {
    lang: 'bn',
    label: 'স্বাস্থ্যকেন্দ্র সমস্যা (ধানবাদ)',
    text: 'ধানবাদের তোপচাঁচি গ্রামে প্রাথমিক স্বাস্থ্যকেন্দ্রে ডাক্তার নেই এবং ওষুধের খুব অভাব, প্রায় ৫০০ লোক সমস্যায় পড়েছে।'
  },
  {
    lang: 'en',
    label: 'Transformer Failure (Bokaro)',
    text: 'Our village transformer in Gomia Bokaro burned down 3 weeks ago, leaving 450 homes in total blackout.'
  }
];

export default function BhashiniVoiceModal() {
  const {
    isBhashiniModalOpen,
    setIsBhashiniModalOpen,
    setIsSubmitModalOpen,
    setPrefilledGrievanceData,
    setSelectedClusterId,
    setActiveView,
    lang
  } = useAppState();

  const [supportedLangs, setSupportedLangs] = useState([
    { code: 'hi', name: 'Hindi', native: 'हिन्दी', speechCode: 'hi-IN' },
    { code: 'sat', name: 'Santhali', native: 'संथाली / ᱥᱟᱱᱛᱟᱲᱤ', speechCode: 'hi-IN' },
    { code: 'bn', name: 'Bengali', native: 'বাংলা', speechCode: 'bn-IN' },
    { code: 'bho', name: 'Bhojpuri', native: 'भोजपुरी', speechCode: 'hi-IN' },
    { code: 'mai', name: 'Maithili', native: 'मैथिली', speechCode: 'hi-IN' },
    { code: 'ory', name: 'Odia', native: 'ଓଡ଼ିଆ', speechCode: 'or-IN' },
    { code: 'ur', name: 'Urdu', native: 'اردو', speechCode: 'ur-IN' },
    { code: 'mr', name: 'Marathi', native: 'मराठी', speechCode: 'mr-IN' },
    { code: 'en', name: 'English', native: 'English', speechCode: 'en-IN' }
  ]);

  const [selectedLang, setSelectedLang] = useState('hi');
  const activeLangObj = supportedLangs.find(l => l.code === selectedLang) || supportedLangs[0];

  const {
    isListening,
    fullTranscript,
    transcript,
    volume,
    recordingDuration,
    error: micError,
    startListening,
    stopListening,
    reset: resetVoice,
    setTranscript
  } = useBhashiniVoice({
    language: activeLangObj.code,
    speechCode: activeLangObj.speechCode
  });

  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);

  // Fetch backend supported languages on mount
  useEffect(() => {
    async function loadLangs() {
      try {
        const res = await bhashiniApi.getSupportedLanguages();
        if (res.success && res.languages?.length) {
          setSupportedLangs(res.languages);
        }
      } catch (err) {
        // use fallback
      }
    }
    loadLangs();
  }, []);

  if (!isBhashiniModalOpen) return null;

  // Trigger AI extraction from speech
  const handleExtractProblem = async (textToExtract) => {
    const speechText = textToExtract || fullTranscript;
    if (!speechText.trim()) {
      toast.error('Please record or enter a spoken problem description first.');
      return;
    }

    setIsExtracting(true);
    try {
      const res = await bhashiniApi.extractProblem({
        transcript: speechText,
        translatedText: speechText,
        sourceLanguage: selectedLang
      });

      if (res.success && res.data) {
        setExtractedData(res.data);
        toast.success('Bhashini AI extracted grievance parameters!');
      } else {
        toast.info('Extracted grievance with default parameters.');
      }
    } catch (err) {
      console.warn('Bhashini extraction warning:', err);
      // Client-side fallback extraction
      setExtractedData({
        title: `Grassroots Challenge via Bhashini Voice`,
        narrative: speechText,
        domain: 'Water Resources',
        district: 'Khunti',
        block: 'Torpa',
        panchayat: '',
        urgency: 'High',
        affectedPopulation: '250+ Households',
        keyNeeds: ['Deep Borewell with Solar Pump', 'Community Inspection']
      });
    } finally {
      setIsExtracting(false);
    }
  };

  // When recording stops, auto-extract if transcript is substantial
  const handleToggleRecord = () => {
    if (isListening) {
      stopListening();
      if (fullTranscript.trim().length > 10) {
        handleExtractProblem(fullTranscript);
      }
    } else {
      setExtractedData(null);
      setSubmissionResult(null);
      startListening();
    }
  };

  // Use Sample Prompt for instant test / demo
  const handleApplySample = (sample) => {
    setSelectedLang(sample.lang);
    setTranscript(sample.text);
    handleExtractProblem(sample.text);
  };

  // 1. Auto-fill into Multi-Step Submission Modal
  const handleOpenInSubmissionModal = () => {
    const dataToPreload = extractedData || {
      title: 'Societal Challenge via Voice',
      narrative: fullTranscript,
      district: 'Khunti',
      block: 'Torpa',
      urgency: 'High'
    };

    setPrefilledGrievanceData({
      title: dataToPreload.title,
      narrative: dataToPreload.narrative || fullTranscript,
      districtName: dataToPreload.district || 'Ranchi',
      district: (dataToPreload.district || 'ranchi').toLowerCase(),
      block: dataToPreload.block || '',
      panchayat: dataToPreload.panchayat || '',
      urgency: dataToPreload.urgency || 'High',
      affectedPopulation: dataToPreload.affectedPopulation || '',
      mediaFiles: []
    });

    setIsBhashiniModalOpen(false);
    setIsSubmitModalOpen(true);
    toast.success('Voice details loaded into challenge submission form!');
  };

  // 2. Direct 1-Click Voice Grievance Registration
  const handleDirectVoiceSubmit = async () => {
    if (!fullTranscript && !extractedData?.narrative) {
      toast.error('Please record or enter a problem first.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await bhashiniApi.voiceSubmitProblem({
        transcript: fullTranscript,
        translatedText: extractedData?.narrative || fullTranscript,
        sourceLanguage: selectedLang,
        submitterRole: 'individual_citizen'
      });

      if (res.duplicate) {
        toast.error(res.message || 'Someone from your locality has already submitted this problem.');
        return;
      }

      if (res.success) {
        setSubmissionResult(res);
        toast.success('Problem registered successfully via Bhashini Voice!');
        try {
          confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 } });
        } catch {
          // fallback
        }
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to submit voice problem';
      toast.error(errMsg);
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
      <div className="bg-white text-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-emerald-100 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header with National Bhashini Banner */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-emerald-700/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-inner">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="bg-amber-400/20 text-amber-300 text-[10px] font-black uppercase px-2 py-0.5 rounded border border-amber-300/30">
                  MeitY &bull; Bhashini AI
                </span>
                <span className="text-[10px] text-emerald-200 font-mono">NLTM Model v2.4</span>
              </div>
              <h3 className="font-black text-base sm:text-lg tracking-tight flex items-center gap-1.5 mt-0.5">
                भाषिणी वाणी शिकायत प्रणाली
                <span className="text-xs font-medium text-emerald-200/90 hidden sm:inline">
                  (Bhashini Multilingual Voice Grievance)
                </span>
              </h3>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-slate-300 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">

          {/* Submission Success Screen */}
          {submissionResult ? (
            <div className="text-center py-6 space-y-4 animate-in zoom-in-95">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner ring-4 ring-emerald-50">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h4 className="text-xl font-black text-slate-900">
                  {lang === 'hi' ? 'समस्या सफलतापूर्वक पंजीकृत!' : 'Voice Grievance Registered Successfully!'}
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Assigned Domain: <strong className="text-emerald-700 font-bold">{submissionResult.extracted?.domain || 'Water Resources'}</strong>
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-w-md mx-auto space-y-2.5 text-left text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">Tracking Challenge ID:</span>
                  <span className="font-mono font-black text-emerald-700 text-sm bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    #{submissionResult.ticketId || submissionResult.clusterId}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Locality:</span>
                  <span className="font-semibold text-slate-800">
                    {submissionResult.extracted?.district || 'Ranchi'}, {submissionResult.extracted?.block || 'Block'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Source Input:</span>
                  <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold text-[10px]">
                    Bhashini Voice ASR ({selectedLang.toUpperCase()})
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-center space-x-3">
                <button
                  onClick={() => {
                    handleClose();
                    setSelectedClusterId(submissionResult.ticketId || submissionResult.clusterId);
                    setActiveView('map');
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow transition-all cursor-pointer"
                >
                  View on Live State Map
                </button>
                <button
                  onClick={handleClose}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Language Selection Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-emerald-600" />
                    अपनी भाषा चुनें (Choose Spoken Language):
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">22 Scheduled Languages Supported</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {supportedLangs.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => setSelectedLang(l.code)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        selectedLang === l.code
                          ? 'bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-300'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <span>{l.native}</span>
                      <span className="ml-1 text-[10px] opacity-75 font-normal">({l.name})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Central Mic & Live Audio Visualizer */}
              <div className="bg-gradient-to-b from-slate-50 to-emerald-50/40 border border-emerald-100 rounded-2xl p-6 text-center space-y-4 relative overflow-hidden">
                
                {/* Visualizer Waves */}
                <div className="flex items-center justify-center gap-1 h-8">
                  {[40, 70, 90, 60, 80, 100, 70, 50, 85, 65, 45].map((h, i) => (
                    <div
                      key={i}
                      className={`w-1 rounded-full transition-all duration-150 ${
                        isListening ? 'bg-emerald-600' : 'bg-slate-300'
                      }`}
                      style={{
                        height: isListening ? `${Math.max(6, (h * volume) / 100)}px` : '4px'
                      }}
                    />
                  ))}
                </div>

                {/* Main Mic Button */}
                <div className="relative inline-flex items-center justify-center">
                  {isListening && (
                    <>
                      <div className="absolute w-24 h-24 rounded-full bg-rose-500/20 animate-ping" />
                      <div className="absolute w-20 h-20 rounded-full bg-rose-500/30 animate-pulse" />
                    </>
                  )}
                  <button
                    type="button"
                    onClick={handleToggleRecord}
                    className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg transition-all transform hover:scale-105 active:scale-95 cursor-pointer ${
                      isListening
                        ? 'bg-rose-600 ring-4 ring-rose-300'
                        : 'bg-emerald-700 hover:bg-emerald-800 ring-4 ring-emerald-200'
                    }`}
                  >
                    {isListening ? (
                      <MicOff className="w-7 h-7 animate-bounce" />
                    ) : (
                      <Mic className="w-7 h-7" />
                    )}
                  </button>
                </div>

                {/* Status Indicator */}
                <div>
                  <h4 className="font-extrabold text-sm text-slate-800">
                    {isListening
                      ? `Listening in ${activeLangObj.name} (${recordingDuration}s)... Tap to Stop`
                      : 'माइक बटन दबाएं और समस्या बोलकर बताएं (Tap to Speak)'}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isListening
                      ? 'स्पष्ट रूप से बताएं: क्या समस्या है, कौन सा जिला/प्रखंड, और कितने लोग प्रभावित हैं।'
                      : 'Speak naturally: What is broken, location (District/Block), and how many families are affected.'}
                  </p>
                </div>

                {micError && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-2.5 rounded-lg flex items-center space-x-2 text-left">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600" />
                    <span>{micError}</span>
                  </div>
                )}
              </div>

              {/* Real-Time Transcript Display */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-600" />
                    वाणी प्रतिलेख (Spoken Speech Transcript):
                  </label>
                  {fullTranscript && (
                    <button
                      type="button"
                      onClick={resetVoice}
                      className="text-[11px] text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="relative">
                  <textarea
                    rows={3}
                    value={fullTranscript}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder="आपके बोले गए शब्द यहाँ दिखाई देंगे... (Your spoken words will appear here in real-time)"
                    className="w-full text-xs p-3 rounded-xl border border-slate-300 text-slate-900 bg-white placeholder:text-slate-400 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  {isExtracting && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-xs rounded-xl flex items-center justify-center space-x-2 text-emerald-800 text-xs font-bold">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                      <span>Bhashini &amp; Gemini AI Analyzing Grievance...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Sample Demonstrations for Quick Evaluation */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5">
                <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  त्वरित परीक्षण उदाहरण (Click sample to test instant AI parsing):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {SAMPLE_VOICE_PROMPTS.map((samp, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplySample(samp)}
                      className="text-[11px] bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-700 px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer"
                    >
                      {samp.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Extracted Structured Problem Card */}
              {extractedData && (
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60">
                    <div className="flex items-center space-x-1.5 text-xs font-black text-emerald-900">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>AI द्वारा निष्कर्षित समस्या विवरण (AI Extracted Card)</span>
                    </div>
                    <span className="bg-emerald-700 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                      {extractedData.domain || 'Water Resources'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Title:</span>
                      <strong className="text-slate-900">{extractedData.title}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Location:</span>
                      <span className="text-slate-800 font-semibold flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-emerald-600" />
                        {extractedData.district} {extractedData.block ? `(${extractedData.block})` : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Urgency:</span>
                      <span className={`inline-block font-bold text-[10px] px-2 py-0.5 rounded ${
                        extractedData.urgency === 'Critical'
                          ? 'bg-rose-100 text-rose-800'
                          : extractedData.urgency === 'High'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {extractedData.urgency} Urgency
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Affected Population:</span>
                      <span className="text-slate-800 font-semibold flex items-center gap-1">
                        <Users className="w-3 h-3 text-slate-500" />
                        {extractedData.affectedPopulation || '250+ Households'}
                      </span>
                    </div>
                  </div>

                  {extractedData.keyNeeds && extractedData.keyNeeds.length > 0 && (
                    <div className="text-[11px] text-slate-600 pt-1 border-t border-emerald-200/50">
                      <span className="font-bold text-slate-700">Key Technology / R&amp;D Needs:</span>{' '}
                      {extractedData.keyNeeds.join(', ')}
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleOpenInSubmissionModal}
                  disabled={!fullTranscript && !extractedData}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Edit in Full Challenge Form</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                </button>

                <button
                  type="button"
                  onClick={handleDirectVoiceSubmit}
                  disabled={isSubmitting || (!fullTranscript && !extractedData)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs shadow-md shadow-emerald-700/20 flex items-center justify-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>पंजीकरण हो रहा है...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>सीधे दर्ज करें (1-Click Voice Submit)</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
