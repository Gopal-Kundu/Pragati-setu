import React, { useState, useEffect } from 'react';
import { problemApi } from '../../services/problemApi';
import ProblemDetailsModal from '../common/ProblemDetailsModal';
import { useAppState } from '../../context/StateContext';
import {
  PlusCircle,
  Search,
  MapPin,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  Filter,
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
  Eye,
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

export default function CitizenPortal() {
  const { setIsBhashiniModalOpen } = useAppState() || {};
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedProblemId, setSelectedProblemId] = useState(null);
  const [submittedTicket, setSubmittedTicket] = useState(null);

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Form State conforming to Problem Schema
  const [formData, setFormData] = useState({
    title: '',
    domain: 'Water Resources',
    description: '',
    district: 'Ranchi',
    block: '',
    panchayat: '',
    address: '',
    submitterName: '',
    submitterPhone: '',
    submitterEmail: '',
    submitterRole: 'individual_citizen',
    evidenceFile: null,
    evidencePreview: null,
    evidenceUrl: ''
  });

  // Fetch all problems for live tracking
  const loadProblems = async () => {
    try {
      setLoading(true);
      const data = await problemApi.getProblems({ limit: 100 });
      setProblems(data.problems || []);
    } catch (err) {
      console.error('Error fetching problems for tracking:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProblems();
  }, []);

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
      submissionData.append('domain', formData.domain);
      submissionData.append('description', formData.description);

      const locationObj = {
        district: formData.district,
        block: formData.block,
        panchayat: formData.panchayat,
        address: formData.address,
        state: 'Jharkhand'
      };
      submissionData.append('location', JSON.stringify(locationObj));

      const submitterObj = {
        name: formData.submitterName || 'Concerned Citizen',
        phone: formData.submitterPhone || '',
        email: formData.submitterEmail || '',
        role: formData.submitterRole
      };
      submissionData.append('submitter', JSON.stringify(submitterObj));

      if (formData.evidenceFile) {
        submissionData.append('files', formData.evidenceFile);
      } else if (formData.evidenceUrl) {
        submissionData.append('evidenceUrl', formData.evidenceUrl);
      }

      const res = await problemApi.submitProblem(submissionData);
      if (res && (res.success === false || res.duplicate)) {
        toast.error(res.message || 'Someone from your locality has already submitted this problem.');
        return;
      }
      
      const newProblem = res.problem || res;
      setSubmittedTicket(newProblem.ticketId || 'JH-WTR-1042');
      toast.success(`Problem successfully reported!`);
      
      // Reset Form
      setFormData({
        title: '',
        domain: 'Water Resources',
        description: '',
        district: 'Ranchi',
        block: '',
        panchayat: '',
        address: '',
        submitterName: '',
        submitterPhone: '',
        submitterEmail: '',
        submitterRole: 'individual_citizen',
        evidenceFile: null,
        evidencePreview: null,
        evidenceUrl: ''
      });

      setIsFormOpen(false);
      loadProblems();
    } catch (err) {
      console.error('Error submitting problem statement:', err);
      const apiMessage = err.response?.data?.message || err.data?.message || err.message || 'Someone from your locality has already submitted this problem.';
      toast.error(apiMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter problems for tracking section
  const filteredProblems = problems.filter(p => {
    const matchesSearch = 
      !searchQuery.trim() ||
      p.ticketId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.location?.district?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.location?.block?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.submitter?.phone?.includes(searchQuery);

    const matchesDomain = selectedDomain === 'All' || p.domain === selectedDomain;
    
    let matchesStatus = true;
    if (selectedStatus === 'Solved') {
      matchesStatus = p.resolutionStatus === 'solved' || p.status === 'validated';
    } else if (selectedStatus === 'In Progress') {
      matchesStatus = p.status === 'in_progress' || p.status === 'allocated' || p.status === 'funded';
    } else if (selectedStatus === 'AI Triage') {
      matchesStatus = p.status === 'submitted' || p.status === 'ai_triage';
    }

    return matchesSearch && matchesDomain && matchesStatus;
  });

  return (
    <div className="space-y-10 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      {/* 1. Header & Report Problem Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 font-heading">
            Citizen Problem Portal
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Report grassroots societal challenges across Jharkhand and track live resolution progress.
          </p>
        </div>

        <div className="flex items-center space-x-3 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setIsBhashiniModalOpen && setIsBhashiniModalOpen(true)}
            className="flex items-center space-x-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white font-bold text-sm shadow-md shadow-teal-700/20 transition-all hover:scale-105 cursor-pointer whitespace-nowrap"
            title="Bhashini Voice Grievance (बोलकर समस्या दर्ज करें)"
          >
            <Mic className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>भाषिणी Voice</span>
          </button>
          <button
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="flex items-center space-x-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition-all hover:scale-105 cursor-pointer whitespace-nowrap"
          >
            <PlusCircle className="w-5 h-5" />
            <span>{isFormOpen ? 'Close Form' : 'Report a Problem'}</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner when a ticket is created */}
      {submittedTicket && (
        <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
            <div>
              <div className="font-bold text-sm">Challenge Statement Logged Successfully!</div>
              <div className="text-xs text-emerald-800">
                Your Tracking Ticket ID is <strong className="font-mono font-black text-emerald-950">#{submittedTicket}</strong>. You can search this ID anytime below.
              </div>
            </div>
          </div>
          <button
            onClick={() => setSubmittedTicket(null)}
            className="text-emerald-700 hover:text-emerald-950 text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 2. Report a Problem Form (Collapsible / Expandable) */}
      {isFormOpen && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xl shadow-slate-200/50 space-y-6 animate-in fade-in">
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
            
            {/* Title & Domain */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Problem Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Geogenic Fluoride Contamination in Village Handpumps"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full text-sm text-slate-900 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Domain Category *</label>
                <select
                  value={formData.domain}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                  className="w-full text-sm text-slate-900 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  {DOMAINS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Problem Description */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">Problem Description</label>
                <button
                  type="button"
                  onClick={() => setIsBhashiniModalOpen && setIsBhashiniModalOpen(true)}
                  className="flex items-center space-x-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded cursor-pointer transition-colors"
                >
                  <Mic className="w-3.5 h-3.5 text-emerald-600" />
                  <span>भाषिणी Voice Assist</span>
                </button>
              </div>
              <textarea
                required
                rows={4}
                placeholder="Explain the local problem, who is impacted, current severe consequences, and any previous attempts to resolve it..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full text-sm text-slate-900 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            {/* Location Section */}
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

            {/* Submitter Details */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex items-center space-x-2 text-xs font-bold font-mono uppercase text-slate-600">
                <User className="w-4 h-4 text-emerald-600" />
                <span>Submitter Information</span>
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile / Phone</label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={formData.submitterPhone}
                    onChange={(e) => setFormData({ ...formData, submitterPhone: e.target.value })}
                    className="w-full text-xs text-slate-900 bg-white border border-slate-200 focus:border-emerald-500 rounded-xl px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Reporting Role</label>
                  <select
                    value={formData.submitterRole}
                    onChange={(e) => setFormData({ ...formData, submitterRole: e.target.value })}
                    className="w-full text-xs text-slate-900 bg-white border border-slate-200 focus:border-emerald-500 rounded-xl px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="individual_citizen">Individual Citizen / Resident</option>
                    <option value="pri_panchayat">Gram Panchayat / Mukhiya</option>
                    <option value="community_org">Community Group / SHG</option>
                    <option value="ngo">NGO / Social Worker</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Evidence Photo Upload */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">Photo / Video Evidence (Optional)</label>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <label className="flex items-center space-x-2 px-4 py-2.5 rounded-xl border border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer transition-colors">
                  <Upload className="w-4 h-4 text-emerald-600" />
                  <span>Choose Image File</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>

                {formData.evidencePreview && (
                  <div className="flex items-center space-x-2 bg-slate-100 p-2 rounded-xl border border-slate-200">
                    <img
                      src={formData.evidencePreview}
                      alt="Preview"
                      className="w-10 h-10 object-cover rounded-lg"
                    />
                    <span className="text-xs text-slate-600 font-medium">{formData.evidenceFile?.name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Action */}
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
                    <span>Submit Problem Statement</span>
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      )}

      {/* 3. Track Submitted Problems Section */}
      <section className="space-y-6">
        
        {/* Section Heading & Filter Bar */}
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 font-heading">
              Track Submitted Challenges
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Monitor real-time progress from submission and AI triage through university R&D to field deployment.
            </p>
          </div>

          {/* Search & Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
            
            {/* Search Input */}
            <div className="md:col-span-6 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search by Ticket ID (e.g. JH-WTR-1042), keyword, district..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs text-slate-900 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            {/* Domain Filter */}
            <div className="md:col-span-3">
              <select
                value={selectedDomain}
                onChange={(e) => setSelectedDomain(e.target.value)}
                className="w-full text-xs text-slate-900 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="All">All Domains</option>
                {DOMAINS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="md:col-span-3">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full text-xs text-slate-900 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="All">All Statuses</option>
                <option value="AI Triage">AI Triage / Submitted</option>
                <option value="In Progress">Allocated &amp; In Progress</option>
                <option value="Solved">Field Tested &amp; Solved</option>
              </select>
            </div>

          </div>
        </div>

        {/* Problems List Grid */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
            <span className="text-xs font-bold text-slate-600 font-mono">Loading problem statements...</span>
          </div>
        ) : filteredProblems.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-500 space-y-2">
            <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="font-bold text-sm text-slate-700">No matching problem statements found</p>
            <p className="text-xs text-slate-500">Try adjusting your search query or domain filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProblems.map((p) => {
              const ticket = p.ticketId || p.id;
              const isSolved = p.resolutionStatus === 'solved' || p.status === 'validated';
              const isInProgress = p.status === 'in_progress' || p.status === 'allocated' || p.status === 'funded';
              const Icon = DOMAIN_ICONS[p.domain] || Droplets;

              return (
                <div
                  key={ticket}
                  onClick={() => setSelectedProblemId(ticket)}
                  className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm hover:border-emerald-500/60 hover:shadow-lg hover:shadow-emerald-500/10 transition-all cursor-pointer flex flex-col justify-between space-y-4 hover:-translate-y-0.5"
                >
                  
                  {/* Card Header: Ticket & Domain */}
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
                      #{ticket}
                    </span>
                    
                    <span className="flex items-center space-x-1 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                      <Icon className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{p.domain}</span>
                    </span>
                  </div>

                  {/* Title & Location */}
                  <div className="space-y-1.5 flex-1">
                    <h3 className="font-bold text-slate-900 text-base font-heading line-clamp-2 leading-snug">
                      {p.title}
                    </h3>
                    
                    <div className="flex items-center space-x-1.5 text-xs text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      <span className="truncate">
                        {p.location?.panchayat ? `${p.location.panchayat}, ` : ''}
                        {p.location?.block ? `${p.location.block}, ` : ''}
                        {p.location?.district || 'Jharkhand'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 pt-1 leading-relaxed">
                      {p.description}
                    </p>
                  </div>

                  {/* Lifecycle Status Stepper */}
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium text-[11px]">Resolution Stage</span>
                      <span className={`font-bold px-2 py-0.5 rounded-md text-[11px] ${
                        isSolved 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : isInProgress 
                            ? 'bg-indigo-100 text-indigo-800' 
                            : 'bg-amber-100 text-amber-800'
                      }`}>
                        {isSolved ? '✓ Solved & Deployed' : isInProgress ? '🔬 College R&D Active' : '🤖 AI Triage & Review'}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          isSolved ? 'w-full bg-emerald-600' : isInProgress ? 'w-2/3 bg-indigo-600' : 'w-1/3 bg-amber-500'
                        }`} 
                      />
                    </div>

                    {/* Footer Row: University / View Details */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-slate-500 truncate max-w-[170px] text-[11px]">
                        {p.allocatedUniversity?.name || 'In Allocation'}
                      </span>
                      <span className="text-emerald-700 font-bold flex items-center space-x-1 group-hover:translate-x-1 transition-transform">
                        <span>View Status</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>

                  </div>

                </div>
              );
            })}
          </div>
        )}

      </section>

      {/* On-Demand Details Modal */}
      {selectedProblemId && (
        <ProblemDetailsModal
          problemId={selectedProblemId}
          onClose={() => setSelectedProblemId(null)}
        />
      )}

    </div>
  );
}
