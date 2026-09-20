import React, { useState, useEffect } from 'react';
import { problemApi } from '../../services/problemApi';
import { authApi } from '../../services/authApi';
import ProblemDetailsModal from '../common/ProblemDetailsModal';
import NotificationsModal from '../common/NotificationsModal';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { useAppState } from '../../context/StateContext';
import {
  PlusCircle,
  Bell,
  MapPin,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  FileText,
  User,
  Phone,
  Mail,
  Upload,
  AlertCircle,
  Building,
  Layers,
  GraduationCap,
  Briefcase,
  ChevronRight,
  Loader2,
  X,
  CheckCircle,
  TrendingUp,
  Droplets,
  Sprout,
  HeartPulse,
  BookOpen,
  Flame,
  Sun,
  FileCheck,
  Footprints,
  Eye,
  LogIn,
  Video,
  Film,
  Play,
  Mic
} from 'lucide-react';
import { toast } from 'sonner';

const JHARKHAND_DISTRICTS = [
  'Ranchi',
  'Dhanbad',
  'East Singhbhum (Jamshedpur)',
  'Bokaro',
  'Hazaribagh',
  'Deoghar',
  'Giridih',
  'Ramgarh',
  'Palamu',
  'Gumla',
  'Khunti',
  'Latehar',
  'West Singhbhum (Chaibasa)',
  'Seraikela Kharsawan',
  'Dumka',
  'Godda',
  'Sahebganj',
  'Pakur',
  'Jamtara',
  'Chatra',
  'Koderma',
  'Garhwa',
  'Lohardaga',
  'Simdega'
];

const DOMAINS = [
  'Water Resources',
  'Agriculture',
  'Healthcare',
  'Education',
  'Environment',
  'Energy',
  'Urban Development',
  'Accessibility',
  'Public Administration',
  'Rural Livelihoods',
  'Others'
];

const DOMAIN_ICONS = {
  'Water Resources': Droplets,
  'Agriculture': Sprout,
  'Healthcare': HeartPulse,
  'Education': BookOpen,
  'Environment': Flame,
  'Energy': Sun,
  'Urban Development': Building,
  'Accessibility': Eye,
  'Public Administration': FileCheck,
  'Rural Livelihoods': Footprints,
  'Others': Layers
};


export default function CommunityPortal() {
  const { setIsBhashiniModalOpen, prefilledGrievanceData, setPrefilledGrievanceData } = useAppState() || {};
  const authState = useSelector((state) => state.auth);
  const authUser = authState?.user;
  const isAuthenticated = authState?.isAuthenticated;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedProblemId, setSelectedProblemId] = useState(null);
  
  // User's own reported problems
  const [myProblems, setMyProblems] = useState([]);
  const [loadingMyProblems, setLoadingMyProblems] = useState(false);

  // User notifications & unread badge count
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);

  // Form State conforming to Problem Schema (Domain decided automatically by AI)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    district: 'Ranchi',
    block: '',
    panchayat: '',
    address: '',
    submitterName: authUser?.name || '',
    submitterPhone: authUser?.phone || '',
    submitterEmail: authUser?.email || '',
    submitterRole: authUser?.role === 'panchayat' ? 'pri_panchayat' : 'individual_citizen',
    evidenceFile: null,
    evidencePreview: null,
    videoFile: null,
    videoPreview: null,
    evidenceUrl: ''
  });

  // Automatically fetch problems and notifications associated with the authenticated user
  const loadUserProblems = async () => {
    try {
      setLoadingMyProblems(true);
      if (isAuthenticated) {
        const data = await problemApi.getMyProblems();
        const serverProblems = data.problems || [];
        setMyProblems((prev) => {
          const combined = [...serverProblems];
          for (const p of prev) {
            const id = p._id || p.id;
            if (!combined.some(cp => (cp._id && cp._id === id) || (cp.id && cp.id === id))) {
              combined.unshift(p);
            }
          }
          return combined;
        });
      } else {
        // Load recent problems from localStorage for guest / citizen
        try {
          const cached = localStorage.getItem('jharkhand_recent_problems');
          if (cached) {
            setMyProblems(JSON.parse(cached));
          }
        } catch (err) {}
      }
    } catch (err) {
      console.error('Error fetching user reported problems:', err);
    } finally {
      setLoadingMyProblems(false);
    }
  };

  // Listen for real-time problem submissions from Bhashini Voice or modal
  useEffect(() => {
    const handleProblemSubmitted = (e) => {
      const newProb = e.detail;
      if (newProb) {
        setMyProblems((prev) => {
          const id = newProb._id || newProb.id;
          const exists = prev.some((p) => (p._id && p._id === id) || (p.id && p.id === id));
          if (exists) return prev;
          const updated = [newProb, ...prev];
          try {
            localStorage.setItem('jharkhand_recent_problems', JSON.stringify(updated.slice(0, 20)));
          } catch (err) {}
          return updated;
        });
      }
    };

    window.addEventListener('problem-submitted', handleProblemSubmitted);
    return () => window.removeEventListener('problem-submitted', handleProblemSubmitted);
  }, []);

  useEffect(() => {
    loadUserProblems();

    if (isAuthenticated) {
      // Load user notifications
      async function loadUserNotifications() {
        try {
          const res = await authApi.getNotifications();
          if (res.notifications) {
            setNotifications(res.notifications);
            setUnreadCount(res.unreadCount ?? res.notifications.filter(n => !n.read).length);
          }
        } catch (e) {
          // silently catch
        }
      }
      loadUserNotifications();
    } else {
      setUnreadCount(0);
    }
  }, [isAuthenticated, authUser]);

  // Populate form if data was pre-extracted by Voice Assistant
  useEffect(() => {
    if (prefilledGrievanceData) {
      const matchedDistrict = JHARKHAND_DISTRICTS.find(
        (d) => d.toLowerCase() === (prefilledGrievanceData.districtName || prefilledGrievanceData.district || '').toLowerCase()
      ) || prefilledGrievanceData.district || 'Ranchi';

      setFormData((prev) => ({
        ...prev,
        title: prefilledGrievanceData.title || prev.title,
        description: prefilledGrievanceData.description || prefilledGrievanceData.narrative || prev.description,
        district: matchedDistrict,
        block: prefilledGrievanceData.block || prev.block,
        panchayat: prefilledGrievanceData.panchayat || prev.panchayat
      }));

      setIsFormOpen(true);
      if (setPrefilledGrievanceData) {
        setPrefilledGrievanceData(null);
      }

      // Smoothly scroll down to the form
      setTimeout(() => {
        const formEl = document.getElementById('community-problem-form');
        if (formEl) {
          formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);
    }
  }, [prefilledGrievanceData, setPrefilledGrievanceData]);

  // Notification button click handler: clears unread count to 0, updates UI, no toaster, opens modal
  const handleOpenNotifications = () => {
    setUnreadCount(0);
    if (isAuthenticated) {
      authApi.markNotificationsAsRead().catch(() => {});
    }
    setIsNotificationsModalOpen(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        evidenceFile: file,
        evidencePreview: URL.createObjectURL(file)
      }));
    }
  };

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 80 * 1024 * 1024) {
        toast.error('Video size must be less than 80MB');
        return;
      }
      setFormData(prev => ({
        ...prev,
        videoFile: file,
        videoPreview: URL.createObjectURL(file)
      }));
    }
  };

  const removeImage = () => {
    setFormData(prev => ({
      ...prev,
      evidenceFile: null,
      evidencePreview: null
    }));
  };

  const removeVideo = () => {
    setFormData(prev => ({
      ...prev,
      videoFile: null,
      videoPreview: null
    }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error('Please fill in the problem title and description');
      return;
    }

    try {
      setSubmitting(true);

      const submissionData = new FormData();
      submissionData.append('title', formData.title);
      submissionData.append('description', formData.description);
      // Note: Domain is not sent manually; AI analyzes and classifies the domain in backend

      const locationObj = {
        district: formData.district,
        block: formData.block,
        panchayat: formData.panchayat,
        address: formData.address,
        state: 'Jharkhand'
      };
      submissionData.append('location', JSON.stringify(locationObj));

      const submitterObj = {
        name: formData.submitterName || authUser?.name || 'Concerned Citizen',
        phone: formData.submitterPhone || authUser?.phone || '',
        email: formData.submitterEmail || authUser?.email || '',
        role: formData.submitterRole
      };
      submissionData.append('submitter', JSON.stringify(submitterObj));

      // Append multimedia evidence (Image & Video)
      if (formData.evidenceFile) {
        submissionData.append('evidence', formData.evidenceFile);
      }
      if (formData.videoFile) {
        submissionData.append('evidence', formData.videoFile);
      }
      if (formData.evidenceUrl && !formData.evidenceFile && !formData.videoFile) {
        submissionData.append('evidenceUrl', formData.evidenceUrl);
      }

      const res = await problemApi.submitProblem(submissionData);
      if (res && (res.success === false || res.duplicate)) {
        toast.error(res.message || 'Someone from your locality has already submitted this problem.');
        return;
      }

      const newProblem = res.problem || res;
      const decidedDomain = newProblem.domain || 'Innovation Intervention';

      toast.success(`Problem reported!`);
      
      // Add directly to user's problems list and localStorage
      setMyProblems(prev => {
        const updated = [newProblem, ...prev];
        try {
          localStorage.setItem('jharkhand_recent_problems', JSON.stringify(updated.slice(0, 20)));
        } catch (e) {}
        return updated;
      });
      window.dispatchEvent(new CustomEvent('problem-submitted', { detail: newProblem }));

      // Reset Form
      setFormData({
        title: '',
        description: '',
        district: 'Ranchi',
        block: '',
        panchayat: '',
        address: '',
        submitterName: authUser?.name || '',
        submitterPhone: authUser?.phone || '',
        submitterEmail: authUser?.email || '',
        submitterRole: authUser?.role === 'panchayat' ? 'pri_panchayat' : 'individual_citizen',
        evidenceFile: null,
        evidencePreview: null,
        videoFile: null,
        videoPreview: null,
        evidenceUrl: ''
      });

      setIsFormOpen(false);
    } catch (err) {
      console.error('Submission error:', err);
      const apiMessage = err.response?.data?.message || err.data?.message || err.message || 'Someone from your locality has already submitted this problem.';
      toast.error(apiMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-10 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 font-heading">
            Your Community. Your Voice.
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Submit societal challenges and track progress for reported issues.
          </p>
        </div>

        <div className="flex items-center space-x-3 self-start sm:self-auto">
          {/* Bhashini Voice Report Action */}
          <button
            type="button"
            onClick={() => setIsBhashiniModalOpen && setIsBhashiniModalOpen(true)}
            className="flex items-center space-x-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white font-bold text-sm shadow-md shadow-teal-700/20 transition-all hover:scale-105 cursor-pointer whitespace-nowrap"
            title="Bhashini Voice Grievance (बोलकर समस्या दर्ज करें)"
          >
            <Mic className="w-5 h-5 text-amber-300" />
            <span>Voice Report</span>
          </button>

          {/* Report a Problem Action */}
          <button
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="flex items-center space-x-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition-all hover:scale-105 cursor-pointer whitespace-nowrap"
          >
            <PlusCircle className="w-5 h-5" />
            <span>{isFormOpen ? 'Close Form' : 'Report a Problem'}</span>
          </button>
        </div>
      </div>

      {/* 2. Problem Submission Form (Schema-Conforming with AI Domain Classification) */}
      {isFormOpen && (
        <div id="community-problem-form" className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xl shadow-slate-200/50 space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <PlusCircle className="w-5 h-5 text-emerald-600" />
              <h2 className="text-xl font-bold text-slate-900 font-heading">
                Submit Societal Problem Statement
              </h2>
            </div>
            <button
              onClick={() => setIsFormOpen(false)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-6">
            
            {/* Title & AI Domain Tag */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">Problem Title *</label>

              </div>
              <input
                type="text"
                required
                placeholder="e.g. Geogenic Fluoride Contamination in Village Handpumps"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full text-sm text-slate-900 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">Problem Description</label>
                <button
                  type="button"
                  onClick={() => setIsBhashiniModalOpen && setIsBhashiniModalOpen(true)}
                  className="flex items-center space-x-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded cursor-pointer transition-colors"
                >
                  <Mic className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Click for Voice Assist</span>
                </button>
              </div>
              <textarea
                required
                rows={4}
                placeholder="Explain the local problem, impacted villagers, acute hazards, and any prior Panchayat/administrative notices..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full text-sm text-slate-900 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            {/* Geographical Location */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex items-center space-x-2 text-xs font-bold font-mono uppercase text-slate-600">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span>Geographical Location (Jharkhand)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">District *</label>
                  <select
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    className="w-full text-xs text-slate-900 bg-white border border-slate-200 focus:border-emerald-500 rounded-xl px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    {JHARKHAND_DISTRICTS.map(dist => (
                      <option key={dist} value={dist}>{dist}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Block</label>
                  <input
                    type="text"
                    placeholder="e.g. Torpa / Karra"
                    value={formData.block}
                    onChange={(e) => setFormData({ ...formData, block: e.target.value })}
                    className="w-full text-xs text-slate-900 bg-white border border-slate-200 focus:border-emerald-500 rounded-xl px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Panchayat / Village</label>
                  <input
                    type="text"
                    placeholder="e.g. Dormba / Siladon"
                    value={formData.panchayat}
                    onChange={(e) => setFormData({ ...formData, panchayat: e.target.value })}
                    className="w-full text-xs text-slate-900 bg-white border border-slate-200 focus:border-emerald-500 rounded-xl px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>
            </div>

            {/* Submitter Info */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex items-center space-x-2 text-xs font-bold font-mono uppercase text-slate-600">
                <User className="w-4 h-4 text-emerald-600" />
                <span>Submitter / PRI Representative Details</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    placeholder="Your Name"
                    value={formData.submitterName}
                    onChange={(e) => setFormData({ ...formData, submitterName: e.target.value })}
                    className="w-full text-xs text-slate-900 bg-white border border-slate-200 focus:border-emerald-500 rounded-xl px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile / Phone Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={formData.submitterPhone}
                    onChange={(e) => setFormData({ ...formData, submitterPhone: e.target.value })}
                    className="w-full text-xs text-slate-900 bg-white border border-slate-200 focus:border-emerald-500 rounded-xl px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Submitter Role</label>
                  <select
                    value={formData.submitterRole}
                    onChange={(e) => setFormData({ ...formData, submitterRole: e.target.value })}
                    className="w-full text-xs text-slate-900 bg-white border border-slate-200 focus:border-emerald-500 rounded-xl px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="individual_citizen">Concerned Citizen / Resident</option>
                    <option value="pri_panchayat">Gram Panchayat Mukhiya / Ward Member</option>
                    <option value="community_org">Village Water &amp; Sanitation Committee (VWSC)</option>
                    <option value="ngo">NGO / Social Worker</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Media Upload (Dual Photo & Video Evidence) */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                Field Evidence Attachments (Photo &amp; Video Evidence - Optional)
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Field Photo Upload Box */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                      <Upload className="w-4 h-4 text-emerald-600" />
                      <span>1. Attach Field Photo</span>
                    </span>
                    {formData.evidenceFile && (
                      <button
                        type="button"
                        onClick={removeImage}
                        className="text-[11px] text-rose-600 hover:underline font-bold cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {!formData.evidencePreview ? (
                    <label className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-white text-slate-600 text-xs font-semibold cursor-pointer transition-colors text-center space-y-1">
                      <Upload className="w-5 h-5 text-emerald-600" />
                      <span>Click to select an image</span>
                      <span className="text-[10px] text-slate-400">JPG, PNG, WebP (Up to 10MB)</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  ) : (
                    <div className="flex items-center space-x-3 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                      <img
                        src={formData.evidencePreview}
                        alt="Field Preview"
                        className="w-14 h-14 object-cover rounded-lg border border-slate-200 flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1 text-xs">
                        <p className="font-bold text-slate-800 truncate">{formData.evidenceFile?.name}</p>
                        <span className="text-[10px] text-slate-400">{(formData.evidenceFile?.size / (1024 * 1024)).toFixed(2)} MB</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Field Video Upload Box */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                      <Video className="w-4 h-4 text-indigo-600" />
                      <span>2. Attach Field Video</span>
                    </span>
                    {formData.videoFile && (
                      <button
                        type="button"
                        onClick={removeVideo}
                        className="text-[11px] text-rose-600 hover:underline font-bold cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {!formData.videoPreview ? (
                    <label className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-white text-slate-600 text-xs font-semibold cursor-pointer transition-colors text-center space-y-1">
                      <Film className="w-5 h-5 text-indigo-600" />
                      <span>Click to select a video clip</span>
                      <span className="text-[10px] text-slate-400">MP4, WebM, MOV (Up to 80MB)</span>
                      <input
                        type="file"
                        accept="video/*,video/mp4,video/webm,video/quicktime"
                        onChange={handleVideoChange}
                        className="hidden"
                      />
                    </label>
                  ) : (
                    <div className="space-y-2 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                      <video
                        src={formData.videoPreview}
                        controls
                        className="w-full h-24 object-cover rounded-lg border border-slate-200 bg-black"
                      />
                      <div className="flex items-center justify-between text-xs px-1">
                        <span className="font-bold text-slate-800 truncate text-[11px]">{formData.videoFile?.name}</span>
                        <span className="text-[10px] text-slate-400">{(formData.videoFile?.size / (1024 * 1024)).toFixed(2)} MB</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting Problem...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Submit Problem</span>
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      )}

      {/* 3. Reported Challenges Section (Associated with Authenticated User) */}
      <section className="space-y-6">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 font-heading">
              Reported Challenges
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Live status and research milestone updates
            </p>
          </div>

          {isAuthenticated && (
            <button
              onClick={loadUserProblems}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-900 self-start sm:self-auto cursor-pointer"
            >
              ↻ Refresh Challenges
            </button>
          )}
        </div>

        {/* Not Authenticated Prompt */}
        {!isAuthenticated && myProblems.length === 0 ? (
          <div className="p-8 bg-white border border-slate-200 rounded-3xl text-center space-y-4 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <User className="w-6 h-6" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="font-bold text-base text-slate-900 font-heading">Sign in to View Your Reported Challenges</h3>
              <p className="text-xs text-slate-600">
                Sign in with your citizen account to automatically track your reported problems, view AI triage feedback, and see assigned university labs.
              </p>
            </div>
            <Link
              to="/auth"
              className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all hover:scale-105"
            >
              <LogIn className="w-4 h-4" />
              <span>Login to View My Challenges</span>
            </Link>
          </div>
        ) : loadingMyProblems && myProblems.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
            <span className="text-xs font-bold text-slate-600 font-mono">Loading your reported challenges...</span>
          </div>
        ) : myProblems.length > 0 ? (
          <div className="space-y-4">
            {!isAuthenticated && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 sm:p-4 flex items-center justify-between text-xs text-emerald-900">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Showing challenges reported in this session. <Link to="/auth" className="underline font-bold hover:text-emerald-950">Sign in</Link> to permanently track and sync them across all devices.</span>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {myProblems.map((p) => {
              const problemId = p._id || p.id;
              const isSolved = p.resolutionStatus === 'solved' || p.status === 'validated';
              const isInProgress = p.status === 'in_progress' || p.status === 'allocated' || p.status === 'funded';
              const Icon = DOMAIN_ICONS[p.domain] || Droplets;
              const imageUrl = p.evidence?.[0]?.url || p.evidenceUrl || '';
              const ticket = p.ticketId || (p._id ? p._id.slice(-6).toUpperCase() : p.id || 'PRB');

              return (
                <div
                  key={problemId}
                  onClick={() => setSelectedProblemId(problemId)}
                  className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:border-emerald-500/60 hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between group hover:-translate-y-1"
                >
                  {/* Evidence Photo Banner or Domain Header */}
                  {imageUrl ? (
                    <div className="relative h-48 w-full overflow-hidden bg-slate-100">
                      <img
                        src={imageUrl}
                        alt={p.title}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

                      <div className="absolute top-3 right-3 flex items-center space-x-1.5">
                        {p.evidence?.some(e => e.type === 'video' || e.url?.endsWith('.mp4') || e.url?.includes('/video/')) && (
                          <span className="flex items-center space-x-1 text-[11px] font-bold text-white bg-indigo-600/90 backdrop-blur-md px-2 py-1 rounded-xl border border-white/20">
                            <Play className="w-3 h-3 fill-current text-white" />
                            <span>Video</span>
                          </span>
                        )}
                        <span className="flex items-center space-x-1 text-xs font-bold text-white bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/20">
                          <Icon className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{p.domain}</span>
                        </span>
                      </div>

                      {/* Location Overlay Badge */}
                      <div className="absolute bottom-3 left-3 flex items-center">
                        <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md text-white text-xs font-medium border border-white/20">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                          <span>
                            {p.location?.panchayat ? `${p.location.panchayat}, ` : ''}
                            {p.location?.block ? `${p.location.block}, ` : ''}
                            {p.location?.district || 'Jharkhand'}
                          </span>
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="relative h-32 w-full bg-gradient-to-br from-slate-800 via-slate-900 to-emerald-950 p-4 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center space-x-1.5 text-xs font-bold text-emerald-300 bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/10">
                          <Icon className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{p.domain}</span>
                        </span>
                        <span className="text-[10px] font-bold text-slate-300 bg-black/40 px-2 py-0.5 rounded-lg">
                          #{ticket}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1.5 text-slate-300 text-xs font-medium">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                        <span>
                          {p.location?.panchayat ? `${p.location.panchayat}, ` : ''}
                          {p.location?.block ? `${p.location.block}, ` : ''}
                          {p.location?.district || 'Jharkhand'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Card Content Body */}
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <h3 className="font-bold text-slate-900 text-lg font-heading leading-snug group-hover:text-emerald-800 transition-colors">
                        {p.title}
                      </h3>

                      <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                        {p.description}
                      </p>
                    </div>

                    {/* Resolution Progress Bar */}
                    <div className="pt-4 border-t border-slate-100 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">Current Status</span>
                        <span className={`font-bold px-2.5 py-1 rounded-lg text-xs ${
                          isSolved 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : isInProgress 
                              ? 'bg-indigo-100 text-indigo-800' 
                              : 'bg-amber-100 text-amber-800'
                        }`}>
                          {isSolved ? '✓ Solved & Field Deployed' : isInProgress ? '🔬 University R&D In Progress' : 'Under Review'}
                        </span>
                      </div>

                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            isSolved ? 'w-full bg-emerald-600' : isInProgress ? 'w-2/3 bg-indigo-600' : 'w-1/3 bg-amber-500'
                          }`} 
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-slate-500 text-xs">
                          Allocated: <strong>{p.allocatedUniversity?.name || 'Department Review'}</strong>
                        </span>
                        <span className="text-emerald-700 font-bold flex items-center space-x-1 group-hover:translate-x-1 transition-transform">
                          <span>View Full Details</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>

                </div>
              );
            })}
            </div>
          </div>
        ) : (
          <div className="p-8 bg-white border border-slate-200 rounded-3xl text-center space-y-3 shadow-sm">
            <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="font-bold text-sm text-slate-800">You haven't reported any challenges yet</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Click <strong>"Report a Problem"</strong> above to submit a local problem from your village or town.
            </p>
          </div>
        )}

      </section>

      {/* All Notifications Modal */}
      <NotificationsModal
        isOpen={isNotificationsModalOpen}
        onClose={() => setIsNotificationsModalOpen(false)}
        notifications={notifications}
        onViewProblem={(ticketId) => setSelectedProblemId(ticketId)}
      />

      {/* On-Demand Problem Details Modal */}
      {selectedProblemId && (
        <ProblemDetailsModal
          problemId={selectedProblemId}
          onClose={() => setSelectedProblemId(null)}
        />
      )}

    </div>
  );
}
