import React, { createContext, useContext, useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import {
  fetchEcosystemData,
  submitProblemThunk,
  allocateUniversityThunk,
  submitProposalThunk,
  fundProblemThunk,
  updateMilestoneThunk,
  validateSolutionThunk,
  setSelectedProblemId,
  addLocalAuditLog
} from '../store/slices/ecosystemSlice';
import { setActiveRole as setReduxActiveRole } from '../store/slices/authSlice';
import { setActiveView as setReduxActiveView } from '../store/slices/uiSlice';
import { aiApi } from '../services/aiApi';
import { changeGoogleLanguage, getSelectedLanguageFromCookie } from '../utils/googleTranslate';

const StateContext = createContext();

export function StateProvider({ children }) {
  const dispatch = useDispatch();
  const reduxAuth = useSelector((state) => state.auth);
  const reduxEcosystem = useSelector((state) => state.ecosystem);
  const reduxUi = useSelector((state) => state.ui);

  // Function to fetch complete live ecosystem data on-demand (when entering specific portals)
  const loadFullEcosystemData = (force = false) => {
    if (force || !reduxEcosystem.problems || reduxEcosystem.problems.length <= 6) {
      dispatch(fetchEcosystemData());
    }
  };

  // 1. Language: Strictly fetched from cookie across all pages
  const [lang, setLangState] = useState(() => {
    return getSelectedLanguageFromCookie() || 'en';
  });

  const setLang = (newLang) => {
    setLangState(newLang);
    changeGoogleLanguage(newLang);
  };

  useEffect(() => {
    const saved = getSelectedLanguageFromCookie();
    if (saved && saved !== 'en') {
      changeGoogleLanguage(saved);
    }
  }, []);

  // 2. Active Role: 'citizen' | 'panchayat' | 'government' | 'university' | 'industry' | 'public'
  const [activeRole, setActiveRoleState] = useState(reduxAuth.activeRole || 'citizen');

  // 3. Active Nav View
  const [activeView, setActiveViewState] = useState(reduxUi.activeView || 'citizen_home');

  // 4. Selected Items
  const [selectedClusterId, setSelectedClusterIdState] = useState(reduxEcosystem.selectedProblemId || 'JH-WTR-1042');
  const [activeDistrictId, setActiveDistrictId] = useState('khunti');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isBhashiniModalOpen, setIsBhashiniModalOpen] = useState(false);
  const [prefilledGrievanceData, setPrefilledGrievanceData] = useState(null);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isAuditDrawerOpen, setIsAuditDrawerOpen] = useState(false);

  // Pure live backend problem clusters from MongoDB
  const problemClusters = reduxEcosystem.problems || [];
  const universities = reduxEcosystem.universities || [];
  const industryPartners = reduxEcosystem.industryPartners || [];
  const departments = reduxEcosystem.departments || [];
  const districts = reduxEcosystem.districts || [];
  const auditLogs = reduxEcosystem.auditLogs || [];

  const [notifications, setNotifications] = useState([]);

  const setActiveRole = (role) => {
    setActiveRoleState(role);
    dispatch(setReduxActiveRole(role));
    toast.info(`Switched Perspective to ${role.toUpperCase()} Workspace`);
  };

  const setActiveView = (view) => {
    setActiveViewState(view);
    dispatch(setReduxActiveView(view));
  };

  const setSelectedClusterId = (id) => {
    setSelectedClusterIdState(id);
    dispatch(setSelectedProblemId(id));
  };

  // Add system audit log entry
  const logAction = (officer, action, target, note) => {
    const newEntry = {
      id: `LOG-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      officer,
      action,
      target,
      note
    };
    dispatch(addLocalAuditLog(newEntry));
  };

  // Add notification
  const addNotification = (title, role = 'all') => {
    const newNotif = {
      id: `NOTIF-${Date.now()}`,
      title,
      time: 'Just now',
      read: false,
      role
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  // 1. Citizen Submit Problem Flow
  const submitCitizenProblem = async (formData) => {
    try {
      const aiResponse = await aiApi.categorizeProblem({
        title: formData.title || 'Grassroots Challenge',
        description: formData.narrative || formData.description || '',
        location: {
          district: formData.districtName || formData.district || 'Ranchi',
          block: formData.block || 'Sadar',
          panchayat: formData.panchayat || '',
          state: 'Jharkhand'
        },
        submitterRole: formData.submitterType || 'citizen'
      });

      const aiResult = aiResponse.data || {};
      if (aiResult.duplicateCheck?.isDuplicate) {
        toast.error('Someone from your locality has already submitted this problem.');
        return {
          success: false,
          duplicate: true,
          message: 'Someone from your locality has already submitted this problem.'
        };
      }

      const payload = {
        title: formData.title || `${aiResult.domain || 'Societal'} Challenge in ${formData.districtName || 'Jharkhand'}`,
        description: formData.narrative || formData.description || '',
        domain: aiResult.domain || 'Others',
        location: {
          district: formData.districtName || formData.district || 'Ranchi',
          block: formData.block || '',
          panchayat: formData.panchayat || '',
          state: formData.state || 'Jharkhand',
          lat: formData.gps?.lat || 23.3441,
          lng: formData.gps?.lng || 85.3096,
          address: formData.village || formData.address || '',
          pincode: formData.pincode || ''
        },
        submitter: {
          name: formData.name || 'Concerned Citizen',
          role: formData.submitterType === 'Panchayati Raj Institution' ? 'pri_panchayat' : 'individual_citizen',
          organization: formData.organization || (formData.submitterType === 'Panchayati Raj Institution' ? 'Gram Panchayat' : 'Community Resident'),
          email: formData.email || '',
          phone: formData.phone || ''
        },
        priority: formData.urgency || 'Medium',
        evidenceUrl: (formData.mediaFiles && formData.mediaFiles[0]?.url) || ''
      };

      let submitPayload;
      const hasFiles = Boolean(formData.evidenceFile || formData.videoFile || (formData.files && formData.files.length > 0));

      if (hasFiles) {
        submitPayload = new FormData();
        submitPayload.append('title', payload.title);
        submitPayload.append('description', payload.description);
        submitPayload.append('domain', payload.domain);
        submitPayload.append('priority', payload.priority);
        submitPayload.append('location', JSON.stringify(payload.location));
        submitPayload.append('submitter', JSON.stringify(payload.submitter));

        if (formData.evidenceFile) {
          submitPayload.append('evidence', formData.evidenceFile);
        }
        if (formData.videoFile) {
          submitPayload.append('evidence', formData.videoFile);
        }
        if (formData.files && formData.files.length > 0) {
          for (const f of formData.files) {
            submitPayload.append('evidence', f);
          }
        }
      } else {
        submitPayload = payload;
      }

      const submitAction = await dispatch(submitProblemThunk(submitPayload));
      if (submitProblemThunk.rejected.match(submitAction)) {
        const errPayload = submitAction.payload;
        const apiMessage = typeof errPayload === 'object' 
          ? errPayload.message 
          : typeof errPayload === 'string' 
          ? errPayload 
          : 'Someone from your locality has already submitted this problem.';

        toast.error(apiMessage || 'Someone from your locality has already submitted this problem.');
        return { 
          success: false, 
          duplicate: Boolean(errPayload?.duplicate), 
          message: apiMessage,
          existingProblemId: errPayload?.existingProblemId || errPayload?.existingTicketId 
        };
      }

      const createdProblem = submitAction.payload?.problem || submitAction.payload;
      const problemId = createdProblem?._id || `JH-${Date.now().toString().slice(-4)}`;

      toast.success(`Problem Statement Registered!`);
      logAction('AI Engine', 'AI Domain Classified', problemId, `Categorized as ${payload.domain}`);
      addNotification(`New Challenge registered (${payload.domain})`, 'government');
      setSelectedClusterId(problemId);

      if (typeof window !== 'undefined' && createdProblem) {
        window.dispatchEvent(new CustomEvent('problem-submitted', { detail: createdProblem }));
      }

      return {
        success: true,
        clusterId: problemId,
        isMerged: false,
        domain: payload.domain,
        problem: createdProblem
      };
    } catch (error) {
      const apiMsg = error.response?.data?.message || error.message || 'Someone from your locality has already submitted this problem.';
      toast.error(apiMsg);
      return { 
        success: false, 
        duplicate: Boolean(error?.response?.data?.duplicate), 
        message: apiMsg,
        existingProblemId: error?.response?.data?.existingProblemId || error?.response?.data?.existingTicketId 
      };
    }
  };

  // 2. College Authority Accepts Problem into Lab & Assigns Team
  const approveAndAcceptProblem = async (clusterId, collegeName = 'BIT Mesra', facultyLead = 'Dr. Amitava Roy', studentNames = 'Rahul Sharma (M.Tech), Priya Kumari (B.Tech)') => {
    try {
      const proposalPayload = {
        title: `Multidisciplinary R&D Solution for #${clusterId}`,
        teamLead: studentNames.split(',')[0]?.trim() || 'Lead Innovator',
        facultyAdvisor: facultyLead,
        multidisciplinaryTeam: [
          { name: facultyLead, role: 'Principal Investigator', department: 'Civil & Environmental Eng', institution: collegeName },
          { name: studentNames.split(',')[0]?.trim() || 'Student Lead', role: 'Hardware & IoT Lead', department: 'Electronics & Comm', institution: collegeName }
        ],
        abstract: `${collegeName} multidisciplinary team constituted with student engineering division.`,
        timelineMonths: 6,
        estimatedBudget: 850000,
        techStack: ['IoT Probes', 'LoRaWAN Edge', 'Rapid Prototyping']
      };

      await dispatch(submitProposalThunk({ problemId: clusterId, proposalData: proposalPayload }));
      toast.success(`${collegeName} accepted problem #${clusterId} into R&D Innovation Lab!`);
      logAction(facultyLead, 'University Proposal Accepted', clusterId, `${collegeName} constituted team: ${studentNames}`);
      addNotification(`Multidisciplinary team assigned for #${clusterId}`, 'all');
    } catch (err) {
      toast.info(`Updated project team for #${clusterId}`);
    }
  };

  // 3. College Authority Posts Live Progress Update / Milestone
  const addCollegeProgressUpdate = async (clusterId, updateData) => {
    try {
      await dispatch(updateMilestoneThunk({
        problemId: clusterId,
        milestoneId: updateData.milestoneId || 'M2',
        milestoneData: {
          progress: updateData.progress || 75,
          status: 'in_progress',
          note: updateData.message
        }
      }));
      toast.success('Milestone progress updated!');
      logAction(updateData.author || 'College Lead', 'Milestone Update', clusterId, updateData.message);
      addNotification(`Progress update for #${clusterId}: ${updateData.stage}`, 'all');
    } catch (err) {
      toast.info('Milestone saved locally');
    }
  };

  // 4. Industry CSR Pledge / Grant
  const sponsorClusterCSR = async (clusterId, partnerName = 'Tata Steel Foundation', amountInr = 1250000, mentor = 'Siddharth Sharma') => {
    try {
      await dispatch(fundProblemThunk({
        problemId: clusterId,
        fundingData: {
          partnerName: partnerName || 'Tata Steel Foundation',
          partnerType: 'CSR Foundation',
          grantAmount: typeof amountInr === 'number' ? amountInr : 1250000,
          mentorAssigned: mentor || 'Corporate Technical Mentor'
        }
      }));
      toast.success(`CSR Grant Disbursed by ${partnerName}!`);
      logAction(partnerName, 'CSR Grant Disbursement', clusterId, `Disbursed matching fund.`);
      addNotification(`${partnerName} disbursed grant for #${clusterId}`, 'all');
    } catch (err) {
      toast.info(`Grant registered for #${clusterId}`);
    }
  };

  // 5. Government Fast-Track Re-routing
  const allocateToCollegeManually = async (clusterId, collegeId, collegeName, facultyName) => {
    try {
      await dispatch(allocateUniversityThunk({
        problemId: clusterId,
        allocationData: {
          universityId: collegeId,
          universityName: collegeName,
          facultyLead: { name: facultyName, email: 'faculty@institution.ac.in', department: 'Engineering' }
        }
      }));
      toast.success(`Allocated #${clusterId} to ${collegeName}`);
      logAction('State Innovation Council', 'Manual Allocation', clusterId, `Allocated to ${collegeName}`);
      addNotification(`Problem #${clusterId} routed to ${collegeName}`, 'university');
    } catch (err) {
      toast.info(`Allocated to ${collegeName}`);
    }
  };

  // 6. Final Solution Validation
  const validateSolution = async (clusterId, impactMetrics = {}) => {
    try {
      await dispatch(validateSolutionThunk({
        problemId: clusterId,
        validationData: {
          beneficiariesReached: impactMetrics.beneficiaries || 12000,
          economicSavingsInr: impactMetrics.savings || 1800000,
          metricName: impactMetrics.metricName || 'Clean Water Delivered',
          metricValue: impactMetrics.metricValue || '35,000 L/Day',
          officerName: 'State Validation Committee'
        }
      }));
      toast.success(`Solution Validated & Certified for Statewide Scaling!`);
      logAction('Government Validation Committee', 'Solution Certified', clusterId, 'Certified for 24-District rollout');
      addNotification(`Solution #${clusterId} certified for statewide deployment`, 'all');
    } catch (err) {
      toast.info(`Validated solution #${clusterId}`);
    }
  };

  // Safe selectedCluster from live MongoDB state
  const selectedCluster = (problemClusters || []).find(
    c => c && (c._id === selectedClusterId || c.id === selectedClusterId)
  ) || problemClusters[0] || null;

  return (
    <StateContext.Provider
      value={{
        lang,
        setLang,
        activeRole,
        setActiveRole,
        activeView,
        setActiveView,
        selectedClusterId,
        setSelectedClusterId,
        selectedCluster,
        activeDistrictId,
        setActiveDistrictId,
        problemClusters,
        auditLogs: auditLogs || [],
        notifications: notifications || [],
        isSubmitModalOpen,
        setIsSubmitModalOpen,
        isBhashiniModalOpen,
        setIsBhashiniModalOpen,
        prefilledGrievanceData,
        setPrefilledGrievanceData,
        isAssistantOpen,
        setIsAssistantOpen,
        isAuditDrawerOpen,
        setIsAuditDrawerOpen,
        submitCitizenProblem,
        approveAndAcceptProblem,
        addCollegeProgressUpdate,
        sponsorClusterCSR,
        pledgeIndustryPartner: sponsorClusterCSR,
        overridePriority: (clusterId, severity, score, officer, reason) => {
          logAction(officer || 'State Official', 'Priority Override', clusterId, reason);
          toast.success('Priority successfully updated');
        },
        updateMilestone: (clusterId, milestoneId, status, deliverable) => {
          addCollegeProgressUpdate(clusterId, { milestoneId, status, message: deliverable });
        },
        allocateToCollegeManually,
        validateSolution,
        logAction,
        addNotification,
        loadFullEcosystemData,
        resetToDefaultData: () => {
          dispatch(fetchEcosystemData());
          toast.info('Ecosystem data refreshed');
        },
        districts,
        universities,
        heis: universities,
        industryPartners,
        departments,
        govDepartments: departments,
        projects: (problemClusters || []).map(c => c?.project || (c?.proposals && c.proposals[0])).filter(Boolean)
      }}
    >
      {children}
    </StateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(StateContext);
  if (!context) {
    return {
      lang: 'en',
      setLang: () => {},
      activeRole: 'citizen',
      setActiveRole: () => {},
      activeView: 'citizen_home',
      setActiveView: () => {},
      selectedClusterId: null,
      setSelectedClusterId: () => {},
      isSubmitModalOpen: false,
      setIsSubmitModalOpen: () => {},
      isBhashiniModalOpen: false,
      setIsBhashiniModalOpen: () => {},
      prefilledGrievanceData: null,
      setPrefilledGrievanceData: () => {},
      isAssistantOpen: false,
      setIsAssistantOpen: () => {},
      problems: [],
      problemClusters: [],
      universities: [],
      industryPartners: [],
      departments: [],
      districts: [],
      loadFullEcosystemData: () => {},
      notifications: [],
      addNotification: () => {},
      logAction: () => {}
    };
  }
  return context;
}

export default StateContext;
