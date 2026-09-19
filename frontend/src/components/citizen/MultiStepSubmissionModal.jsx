import React, { useState, useRef } from 'react';
import { useAppState } from '../../context/StateContext';
import { aiApi } from '../../services/aiApi';
import { analyzeProblemSubmission } from '../../services/aiIntelligenceEngine';
import InteractiveMapPicker from '../common/InteractiveMapPicker';
import { toast } from 'sonner';
import { 
  X, 
  Sparkles, 
  MapPin, 
  UploadCloud, 
  Mic, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  ArrowLeft, 
  FileText, 
  Image as ImageIcon,
  Radio,
  Users,
  Layers,
  Check,
  Trash2,
  Film,
  FileCheck,
  ShieldCheck,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function MultiStepSubmissionModal() {
  const { 
    isSubmitModalOpen, 
    setIsSubmitModalOpen, 
    districts, 
    submitCitizenProblem, 
    setSelectedClusterId,
    setActiveView,
    lang,
    setIsBhashiniModalOpen,
    prefilledGrievanceData,
    setPrefilledGrievanceData
  } = useAppState();

  const [step, setStep] = useState(1);
  const [isRecording, setIsRecording] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  // Form State initialized empty with clear placeholders
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    submitterType: 'Citizen', // Citizen, Community Group, Gram Panchayat, SHG
    title: '',
    narrative: '',
    frequency: '',
    urgency: 'Medium',
    duration: '',
    previousAttempts: '',
    
    // Evidence
    mediaFiles: [],

    // Location
    district: 'ranchi',
    districtName: 'Ranchi',
    block: '',
    panchayat: '',
    village: '',
    state: 'Jharkhand',
    pincode: '',
    gps: { lat: 23.3441, lng: 85.3096 },

    // Impact
    affectedPopulation: '',
    economicImpact: '',
    healthImpact: '',
    vulnerableGroup: ''
  });

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newMedia = files.map(file => {
      const isVid = file.type.startsWith('video/');
      const isPdf = file.type === 'application/pdf';
      const fileType = isVid ? 'video' : isPdf ? 'document' : 'image';
      return {
        type: fileType,
        caption: file.name,
        url: URL.createObjectURL(file),
        size: (file.size / (1024 * 1024)).toFixed(2) + ' MB'
      };
    });

    setFormData(prev => ({
      ...prev,
      mediaFiles: [...prev.mediaFiles, ...newMedia]
    }));
    // Reset file input so same file can be re-uploaded if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveMedia = (indexToRemove) => {
    setFormData(prev => ({
      ...prev,
      mediaFiles: prev.mediaFiles.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  const [aiPreview, setAiPreview] = useState(null);
  const [submissionResult, setSubmissionResult] = useState(null);

  if (!isSubmitModalOpen) return null;

  const currentDistrictObj = districts.find(d => d.id === formData.district) || districts[0];

  const handleDistrictChange = (dId) => {
    const dObj = districts.find(d => d.id === dId);
    setFormData(prev => ({
      ...prev,
      district: dId,
      districtName: dObj ? dObj.name : 'Ranchi',
      block: dObj && dObj.blocks ? dObj.blocks[0] : ''
    }));
  };

  // Populate form if data was pre-extracted by Bhashini Voice Assistant
  React.useEffect(() => {
    if (prefilledGrievanceData) {
      setFormData(prev => ({
        ...prev,
        ...prefilledGrievanceData
      }));
      setPrefilledGrievanceData(null);
    }
  }, [prefilledGrievanceData, setPrefilledGrievanceData]);

  const handleOpenBhashiniVoice = () => {
    setIsBhashiniModalOpen(true);
  };

  // Run AI analysis on step 4 transition via backend AI API (Only Assigns Domain & Checks Location Duplicates)
  const handleProceedToReview = async () => {
    setIsValidating(true);
    try {
      const response = await aiApi.categorizeProblem({
        title: formData.title || `${formData.narrative.slice(0, 50)}...`,
        description: formData.narrative,
        location: {
          district: formData.districtName,
          block: formData.block,
          panchayat: formData.panchayat
        },
        submitterRole: formData.submitterType
      });

      if (response.success && response.data) {
        const aiData = response.data;
        const isDup = Boolean(aiData.duplicateCheck?.isDuplicate);
        setAiPreview({
          domain: aiData.domain || 'Others',
          isDuplicate: isDup,
          duplicateTicketId: aiData.duplicateCheck?.matchedTicketId || '',
          duplicateReason: aiData.duplicateCheck?.reason || ''
        });

        if (isDup) {
          toast.error('Someone from your locality has already submitted this problem.');
        }
      } else {
        const preview = analyzeProblemSubmission(formData, []);
        setAiPreview({
          domain: preview.domain || 'Others',
          isDuplicate: preview.isDuplicate,
          duplicateTicketId: preview.duplicateTicketId,
          duplicateReason: preview.duplicateReason
        });
      }
    } catch (err) {
      const preview = analyzeProblemSubmission(formData, []);
      setAiPreview({
        domain: preview.domain || 'Others',
        isDuplicate: preview.isDuplicate,
        duplicateTicketId: preview.duplicateTicketId,
        duplicateReason: preview.duplicateReason
      });
    } finally {
      setIsValidating(false);
      setStep(5);
    }
  };

  const handleFinalSubmit = async () => {
    if (aiPreview?.isDuplicate) {
      toast.error('Someone from your locality has already submitted this problem.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitCitizenProblem(formData);
      if (!res || !res.success || res.duplicate) {
        toast.error(res?.message || 'Someone from your locality has already submitted this problem.');
        return;
      }

      setSubmissionResult(res);
      try {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      } catch {
        // Confetti fallback
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/65 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white text-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-amber-300">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight">
                {lang === 'hi' ? 'नागरिक समस्या रिपोर्टिंग प्रणाली' : 'Citizen Problem Intake & AI Categorization'}
              </h3>
              <p className="text-xs text-emerald-200/80 font-medium">
                {lang === 'hi' ? 'सरल भाषा में समस्या दर्ज करें - AI डोमेन निर्धारित करेगा' : 'Submit societal challenge — AI will assign the domain and check location duplicates'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsSubmitModalOpen(false)}
            className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        {!submissionResult && (
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex items-center justify-between">
            {[
              { s: 1, label: 'Describe' },
              { s: 2, label: 'Evidence' },
              { s: 3, label: 'Location' },
              { s: 4, label: 'Impact' },
              { s: 5, label: 'AI Review' }
            ].map((st) => (
              <div key={st.s} className="flex items-center space-x-1.5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step === st.s
                    ? 'bg-emerald-600 text-white ring-2 ring-emerald-300'
                    : step > st.s
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-200 text-slate-500'
                }`}>
                  {step > st.s ? <Check className="w-3.5 h-3.5" /> : st.s}
                </div>
                <span className={`text-[11px] font-semibold hidden sm:inline ${
                  step === st.s ? 'text-emerald-900' : 'text-slate-500'
                }`}>
                  {st.label}
                </span>
                {st.s < 5 && <span className="text-slate-300 text-xs mx-1 hidden sm:inline">&rarr;</span>}
              </div>
            ))}
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Submission Success Screen */}
          {submissionResult ? (
            <div className="text-center py-6 space-y-4 animate-in zoom-in-95">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h4 className="text-xl font-extrabold text-slate-900">
                  {lang === 'hi' ? 'समस्या सफलतापूर्वक पंजीकृत!' : 'Problem Statement Successfully Registered!'}
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Assigned Domain: <strong className="text-emerald-700 font-bold">{submissionResult.domain || aiPreview?.domain || 'Others'}</strong>
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-w-md mx-auto space-y-2 text-left text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">Tracking Challenge ID:</span>
                  <span className="font-mono font-black text-emerald-700 text-sm bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    #{submissionResult.clusterId}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Target Locality:</span>
                  <span className="font-semibold text-slate-800">{formData.districtName}, {formData.block || 'Block'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Status:</span>
                  <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold text-[10px]">
                    Submitted & Queued for Triage
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-center space-x-3">
                <button
                  onClick={() => {
                    setIsSubmitModalOpen(false);
                    setSelectedClusterId(submissionResult.clusterId);
                    setActiveView('map');
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow transition-all cursor-pointer"
                >
                  View on Live State Map
                </button>
                <button
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* STEP 1: Describe the Problem */}
              {step === 1 && (
                <div className="space-y-3.5 animate-in fade-in">
                  <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 text-xs text-emerald-900 flex items-start space-x-2">
                    <Sparkles className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" />
                    <p>
                      <strong>Simple Language Prompt:</strong> Describe what you see in your own words. Our AI will automatically assign the appropriate societal domain.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Your Name / Group</label>
                      <input
                        type="text"
                        placeholder="e.g. Sombari Devi / Local Group"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-300 text-slate-900 bg-white placeholder:text-slate-400 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Stakeholder Category</label>
                      <select
                        value={formData.submitterType}
                        onChange={(e) => setFormData({ ...formData, submitterType: e.target.value })}
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-300 text-slate-900 bg-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      >
                        <option value="Citizen">Individual Citizen / Farmer</option>
                        <option value="Community Organization">Community Organization / SHG</option>
                        <option value="Panchayati Raj Institution">Gram Panchayat / Mukhiya</option>
                        <option value="School / Health Official">School Educator / Health Worker</option>
                      </select>
                    </div>
                  </div>

                  {/* Contact Email & Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                      <input
                        type="email"
                        placeholder="e.g. citizen@jharkhand.in"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-300 text-slate-900 bg-white placeholder:text-slate-400 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone Number</label>
                      <input
                        type="tel"
                        placeholder="e.g. +91 94311 00000"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-300 text-slate-900 bg-white placeholder:text-slate-400 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Problem Title (Short)</label>
                    <input
                      type="text"
                      placeholder="e.g. Village check-dam pond drying up in summer"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 text-slate-900 bg-white placeholder:text-slate-400 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">
                        What is happening? Describe the problem in detail:
                      </label>
                      <button
                        type="button"
                        onClick={handleOpenBhashiniVoice}
                        className="flex items-center space-x-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 transition-all cursor-pointer shadow-xs group"
                        title="Speak in any Indian language with Bhashini AI"
                      >
                        <Mic className="w-3.5 h-3.5 text-emerald-700 group-hover:scale-110 transition-transform" />
                        <span>भाषिणी Voice Assist (बोलकर फॉर्म भरें)</span>
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      placeholder="Describe the issue in detail (e.g. The check-dam pond dries up every summer, causing water scarcity for 400 households...)"
                      value={formData.narrative}
                      onChange={(e) => setFormData({ ...formData, narrative: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 text-slate-900 bg-white placeholder:text-slate-400 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Urgency</label>
                      <select
                        value={formData.urgency}
                        onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-300 text-slate-900 bg-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      >
                        <option value="Critical">Critical (Immediate Hazard)</option>
                        <option value="High">High (Seasonal/Urgent Threat)</option>
                        <option value="Medium">Medium (Recurring Need)</option>
                        <option value="Low">Low (General Improvement)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">How long has it existed?</label>
                      <input
                        type="text"
                        placeholder="e.g. Over 3 years / Recurring seasonally"
                        value={formData.duration}
                        onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-300 text-slate-900 bg-white placeholder:text-slate-400 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Evidence */}
              {step === 2 && (
                <div className="space-y-3.5 animate-in fade-in">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700">
                    <p className="font-semibold text-slate-900 mb-1">Attach Multimedia Evidence (Optional):</p>
                    <p className="text-slate-500">Upload ground photos, mobile video clips, test reports, or audio voice memos from the site.</p>
                  </div>

                  {/* Hidden File Input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    multiple
                    accept="image/*,video/*,application/pdf,audio/*"
                    className="hidden"
                  />

                  {/* Upload Drop Zone */}
                  <div 
                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50/80 rounded-2xl p-6 text-center cursor-pointer transition-all space-y-2 group"
                  >
                    <div className="w-12 h-12 bg-white text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm group-hover:scale-110 transition-transform">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        Click to browse or drop local files here
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Supports Photos (JPG, PNG), Videos (MP4), PDFs & Audio Recordings (Max 25MB each)
                      </p>
                    </div>
                  </div>

                  {/* Selected / Uploaded Files List */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Attached Media ({formData.mediaFiles.length} items):
                    </label>

                    {formData.mediaFiles.length === 0 ? (
                      <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                        No files attached yet. You may proceed or click above to add photos/videos.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {formData.mediaFiles.map((m, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                            <div className="flex items-center space-x-2.5 overflow-hidden">
                              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                                {m.type === 'video' ? <Film className="w-4 h-4" /> : m.type === 'document' ? <FileCheck className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                              </div>
                              <div className="overflow-hidden">
                                <p className="text-xs font-bold text-slate-800 truncate">{m.caption || `Evidence File ${idx + 1}`}</p>
                                <p className="text-[10px] text-slate-500 uppercase">{m.type}</p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveMedia(idx)}
                              title="Remove item"
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer ml-1 flex-shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 3: Geographic Pinpoint */}
              {step === 3 && (
                <div className="space-y-3.5 animate-in fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">District</label>
                      <select
                        value={formData.district}
                        onChange={(e) => handleDistrictChange(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-300 text-slate-900 bg-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      >
                        {districts.map(d => (
                          <option key={d.id} value={d.id}>{d.name} ({d.nameHi})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Block / Taluk</label>
                      <input
                        type="text"
                        placeholder="e.g. Torpa / Sadar / Kanke"
                        value={formData.block}
                        onChange={(e) => setFormData({ ...formData, block: e.target.value })}
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-300 text-slate-900 bg-white placeholder:text-slate-400 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Interactive Leaflet GPS Map Pinpoint */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Interactive GPS Map Pinpoint & Live Geolocation:
                    </label>
                    <InteractiveMapPicker
                      initialLat={formData.gps.lat}
                      initialLng={formData.gps.lng}
                      districtName={formData.districtName}
                      blockName={formData.block}
                      onLocationChange={({ lat, lng }) => {
                        setFormData(prev => ({
                          ...prev,
                          gps: { lat, lng }
                        }));
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Panchayat / Urban Ward</label>
                      <input
                        type="text"
                        placeholder="e.g. Dormba Panchayat"
                        value={formData.panchayat}
                        onChange={(e) => setFormData({ ...formData, panchayat: e.target.value })}
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-300 text-slate-900 bg-white placeholder:text-slate-400 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Village / Tola / Landmark</label>
                      <input
                        type="text"
                        placeholder="e.g. Near Primary School Well"
                        value={formData.village}
                        onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-300 text-slate-900 bg-white placeholder:text-slate-400 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">State</label>
                      <input
                        type="text"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-300 text-slate-900 bg-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Pincode</label>
                      <input
                        type="text"
                        placeholder="e.g. 835227"
                        value={formData.pincode}
                        onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-300 text-slate-900 bg-white placeholder:text-slate-400 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: Impact on Community */}
              {step === 4 && (
                <div className="space-y-3.5 animate-in fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">People / Households Affected</label>
                      <input
                        type="text"
                        placeholder="e.g. 400 families / entire village"
                        value={formData.affectedPopulation}
                        onChange={(e) => setFormData({ ...formData, affectedPopulation: e.target.value })}
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-300 text-slate-900 bg-white placeholder:text-slate-400 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Most Affected Groups</label>
                      <input
                        type="text"
                        placeholder="e.g. Women fetching water, Small farmers"
                        value={formData.vulnerableGroup}
                        onChange={(e) => setFormData({ ...formData, vulnerableGroup: e.target.value })}
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-300 text-slate-900 bg-white placeholder:text-slate-400 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Livelihood & Economic Consequence</label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Second crop cannot be planted, causing 40% income loss during winter & summer..."
                      value={formData.economicImpact}
                      onChange={(e) => setFormData({ ...formData, economicImpact: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 text-slate-900 bg-white placeholder:text-slate-400 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Health & Daily Life Consequence</label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Villagers forced to drink untreated river water leading to waterborne illnesses..."
                      value={formData.healthImpact}
                      onChange={(e) => setFormData({ ...formData, healthImpact: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 text-slate-900 bg-white placeholder:text-slate-400 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* STEP 5: AI Review & Categorization */}
              {step === 5 && aiPreview && (
                <div className="space-y-4 animate-in fade-in">
                  {/* AI Domain Assignment Card */}
                  <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white rounded-2xl p-4 border border-emerald-500/30 shadow-lg space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-white/10">
                      <div className="flex items-center space-x-2">
                        <Sparkles className="w-5 h-5 text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
                        <span className="font-extrabold text-sm text-amber-300 tracking-wide">
                          AI Autonomous Domain Classification
                        </span>
                      </div>
                      <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-400/30">
                        AI Processed
                      </span>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                      <span className="text-slate-400 text-xs font-medium block">AI Decided Domain:</span>
                      <div className="text-white text-lg font-black tracking-tight mt-0.5">
                        {aiPreview.domain || 'Others'}
                      </div>
                    </div>
                  </div>

                  {/* Locality Deduplication Status Card */}
                  {aiPreview.isDuplicate ? (
                    <div className="bg-red-50 border border-red-300 rounded-xl p-4 space-y-2 text-xs animate-in shake">
                      <div className="flex items-center space-x-2 text-red-700 font-bold text-sm">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                        <span>Duplicate Problem Detected in Locality</span>
                      </div>
                      <p className="text-red-800 text-xs leading-relaxed">
                        Someone from your locality has already submitted this problem{aiPreview.duplicateTicketId ? ` (Challenge ID #${aiPreview.duplicateTicketId})` : ''}.
                      </p>
                      <p className="text-red-700 text-[11px]">
                        To prevent duplicate tickets, submission is disabled. You can track the active ticket on the portal.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-1.5 text-xs">
                      <div className="flex items-center space-x-2 text-emerald-800 font-bold text-sm">
                        <ShieldCheck className="w-5 h-5 flex-shrink-0 text-emerald-600" />
                        <span>Locality Deduplication Verified</span>
                      </div>
                      <p className="text-emerald-700 text-xs">
                        No duplicate problems found in <strong>{formData.districtName}</strong>{formData.block ? `, ${formData.block}` : ''}. This is a unique problem statement.
                      </p>
                    </div>
                  )}

                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-1 text-xs">
                    <span className="text-slate-500 text-[11px] font-medium block">Problem Title:</span>
                    <strong className="text-slate-900 block">{formData.title || 'Untitled Societal Challenge'}</strong>
                    <span className="text-slate-500 text-[11px] font-medium block pt-1">Location:</span>
                    <span className="text-slate-800 font-semibold">{formData.districtName}, {formData.block || 'Block'}{formData.panchayat ? `, ${formData.panchayat}` : ''}</span>
                  </div>
                </div>
              )}

              {/* Navigation Controls */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={() => setStep(step - 1)}
                    disabled={isValidating || isSubmitting}
                    className="flex items-center space-x-1 text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                ) : <div />}

                {step < 4 && (
                  <button
                    type="button"
                    onClick={() => setStep(step + 1)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition-all flex items-center space-x-1 cursor-pointer"
                  >
                    <span>Next</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}

                {step === 4 && (
                  <button
                    type="button"
                    onClick={handleProceedToReview}
                    disabled={isValidating}
                    className="bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs px-4 py-2 rounded-xl shadow transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isValidating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                        <span>Analyzing with AI...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>Review & Assign Domain</span>
                      </>
                    )}
                  </button>
                )}

                {step === 5 && (
                  <button
                    type="button"
                    onClick={handleFinalSubmit}
                    disabled={aiPreview?.isDuplicate || isSubmitting}
                    className={`${
                      aiPreview?.isDuplicate || isSubmitting
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed' 
                        : 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold shadow-md hover:shadow-lg cursor-pointer'
                    } text-xs px-5 py-2.5 rounded-xl transition-all flex items-center space-x-1.5`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Registering Challenge...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{aiPreview?.isDuplicate ? 'Duplicate - Submission Disabled' : 'Confirm & Register Challenge'}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
