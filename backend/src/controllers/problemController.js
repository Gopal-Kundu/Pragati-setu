import Problem from '../models/Problem.js';
import University from '../models/University.js';
import User from '../models/User.js';
import Location from '../models/Location.js';
import Proposal from '../models/Proposal.js';
import IndustryPartner from '../models/IndustryPartner.js';
import { analyzeAndClassifyProblem, checkProblemDuplicateInLocation, translateProblemForm, containsVernacularOrNonAscii } from '../ai/aiService.js';
import { uploadMediaToCloudinary } from '../cloudinary/upload.js';
import { sendProblemSubmittedEmail, sendUniversityAllocationEmail } from '../email/emailService.js';

/**
 * @desc    Submit a new societal challenge statement (AI domain classification, location deduplication & university matching)
 * @route   POST /api/problems
 * @access  Public / Authenticated
 */
export const createProblem = async (req, res) => {
  try {
    let {
      title,
      description,
      location,
      submitter,
      priority = 'Medium',
      originalTitle = '',
      originalDescription = '',
      originalLanguage = ''
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Title and description are required to submit a problem statement'
      });
    }

    // 1. Parse nested JSON if sent via multipart/form-data
    const parsedLocation = typeof location === 'string' ? JSON.parse(location) : (location || { district: 'Ranchi', state: 'Jharkhand' });
    const parsedSubmitter = typeof submitter === 'string' ? JSON.parse(submitter) : (submitter || { name: 'Concerned Citizen', role: 'individual_citizen' });

    // 1b. Check if translation to English is needed if not already supplied
    let finalOriginalTitle = originalTitle || title;
    let finalOriginalDescription = originalDescription || description;
    let finalOriginalLanguage = originalLanguage || 'English';

    if (
      (!originalLanguage || originalLanguage === 'English') &&
      (containsVernacularOrNonAscii(title) || containsVernacularOrNonAscii(description) || containsVernacularOrNonAscii(parsedLocation.block) || containsVernacularOrNonAscii(parsedLocation.panchayat))
    ) {
      try {
        const transResult = await translateProblemForm({
          title,
          description,
          block: parsedLocation.block,
          panchayat: parsedLocation.panchayat,
          address: parsedLocation.address
        });
        if (transResult.wasTranslated) {
          finalOriginalTitle = transResult.originalTitle || title;
          finalOriginalDescription = transResult.originalDescription || description;
          finalOriginalLanguage = transResult.detectedLanguage || 'Hindi / Regional';
          title = transResult.title || title;
          description = transResult.description || description;
          if (transResult.block) parsedLocation.block = transResult.block;
          if (transResult.panchayat) parsedLocation.panchayat = transResult.panchayat;
          if (transResult.address) parsedLocation.address = transResult.address;
        }
      } catch (transErr) {
        console.warn('[Server-side Problem Translation Warning]:', transErr.message);
      }
    }

    const lat = Number(parsedLocation.lat) || 23.3441;
    const lng = Number(parsedLocation.lng) || 85.3096;

    const formattedLocation = {
      district: parsedLocation.district || 'Ranchi',
      block: parsedLocation.block || '',
      panchayat: parsedLocation.panchayat || '',
      state: parsedLocation.state || 'Jharkhand',
      lat,
      lng,
      address: parsedLocation.address || parsedLocation.village || '',
      pincode: parsedLocation.pincode || ''
    };

    // 2. Locality Deduplication Search (District, Block)
    const locFilter = { district: new RegExp(`^${formattedLocation.district}$`, 'i') };
    if (formattedLocation.block) {
      locFilter.block = new RegExp(`^${formattedLocation.block}$`, 'i');
    }

    const existingLocationRecords = await Location.find(locFilter).populate('problem').limit(15);
    const existingProblemsInLocality = existingLocationRecords
      .map(loc => loc.problem)
      .filter(p => p && p.title && p.status !== 'rejected');

    if (existingProblemsInLocality.length > 0) {
      const duplicateResult = await checkProblemDuplicateInLocation(
        { title, description, location: formattedLocation },
        existingProblemsInLocality
      );

      if (duplicateResult.isDuplicate) {
        return res.status(409).json({
          success: false,
          duplicate: true,
          message: 'Someone from your locality has already submitted this problem.',
          existingProblemId: duplicateResult.matchedProblemId || duplicateResult.matchedTicketId || null
        });
      }
    }

    // 3. AI Autonomous Domain Classification & Problem Analysis
    const aiAnalysisResult = await analyzeAndClassifyProblem(title, description, formattedLocation);
    const decidedDomain = aiAnalysisResult.domain || 'Water Resources';

    // 4. Upload multimedia evidence files if present via Multer & Cloudinary
    const evidenceList = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const isVideo = file.mimetype.startsWith('video');
        const isAudio = file.mimetype.startsWith('audio');
        const isDoc = file.mimetype === 'application/pdf' || file.mimetype.includes('document');

        const resourceType = isVideo ? 'video' : isDoc ? 'raw' : 'image';
        const fileType = isVideo ? 'video' : isAudio ? 'audio' : isDoc ? 'document' : 'photo';

        const uploadRes = await uploadMediaToCloudinary(file.buffer, {
          resourceType,
          fileName: `sih_${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9]/g, '_')}`
        });

        evidenceList.push({
          type: fileType,
          url: uploadRes.url,
          publicId: uploadRes.publicId,
          caption: file.originalname,
          uploadedAt: new Date()
        });
      }
    } else if (req.body.evidenceUrl) {
      evidenceList.push({
        type: 'photo',
        url: req.body.evidenceUrl,
        caption: 'Uploaded Evidence',
        uploadedAt: new Date()
      });
    }

    const formattedSubmitter = {
      userId: req.user ? req.user._id : (parsedSubmitter.userId || null),
      name: (req.user && req.user.name) || parsedSubmitter.name || 'Concerned Citizen',
      role: parsedSubmitter.role || 'individual_citizen',
      organization: parsedSubmitter.organization || 'Community Resident',
      email: (req.user && req.user.email) || parsedSubmitter.email || '',
      phone: (req.user && req.user.phone) || parsedSubmitter.phone || ''
    };

    // 5. Create Problem Record
    const newProblem = new Problem({
      title,
      description,
      domain: decidedDomain,
      location: formattedLocation,
      submitter: formattedSubmitter,
      evidence: evidenceList,
      status: 'submitted',
      priority: priority || 'Medium',
      auditHistory: [
        {
          timestamp: new Date(),
          officer: formattedSubmitter.name || 'Citizen / Local Body',
          role: formattedSubmitter.role || 'citizen',
          action: 'Problem Statement Registered',
          note: `Classified into '${decidedDomain}' by AI with ${evidenceList.length} evidence attachments from ${formattedLocation.district || 'Jharkhand'}`
        }
      ]
    });

    await newProblem.save();

    // 6. Create Location Document linking Problem
    try {
      await Location.create({
        problem: newProblem._id,
        district: formattedLocation.district,
        block: formattedLocation.block,
        state: formattedLocation.state,
        address: formattedLocation.address,
        pincode: formattedLocation.pincode
      });
    } catch (locErr) {
      console.warn('[Location Save Warning]:', locErr.message);
    }

    // 7. University Matching & Notification Dispatch based on availableDomains
    try {
      const matchedUniversities = await University.find({
        availableDomains: decidedDomain
      });

      const universitiesToNotify = matchedUniversities.length > 0
        ? matchedUniversities
        : await University.find().limit(3);

      const univNotification = {
        id: newProblem._id,
        schemaName: 'Problem',
        title: `New Challenge Statement Matched (${decidedDomain})`,
        description: `A new societal problem from ${formattedLocation.district} ('${newProblem.title}') was matched to your university domain capabilities.`,
        read: false,
        createdAt: new Date()
      };

      for (const univ of universitiesToNotify) {
        await University.findByIdAndUpdate(univ._id, {
          $push: {
            notifications: {
              $each: [univNotification],
              $position: 0
            }
          }
        });
      }
    } catch (univNotifErr) {
      console.warn('[University Notification Error]:', univNotifErr.message);
    }

    // 8. Push notification to Submitter User
    if (req.user) {
      try {
        await User.findByIdAndUpdate(req.user._id, {
          $push: {
            notifications: {
              $each: [{
                id: newProblem._id,
                schemaName: 'Problem',
                title: `Challenge Logged: ${decidedDomain}`,
                description: `Your challenge '${title}' was analyzed by AI and classified as '${decidedDomain}'. Sent for University R&D matching.`,
                read: false,
                createdAt: new Date()
              }],
              $position: 0
            }
          }
        });
      } catch (notifErr) {
        console.warn('[User Notification Error]:', notifErr.message);
      }
    }

    // 9. Trigger confirmation email if email provided
    if (formattedSubmitter.email) {
      sendProblemSubmittedEmail(newProblem, formattedSubmitter.email).catch(err =>
        console.warn('[Email Warning]:', err.message)
      );
    }

    return res.status(201).json({
      success: true,
      message: `Societal challenge registered successfully. AI classified domain: '${decidedDomain}'`,
      problem: newProblem
    });
  } catch (error) {
    console.error('[Problem Create Controller Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error submitting problem statement'
    });
  }
};

/**
 * @desc    Get all problems submitted by currently authenticated user
 * @route   GET /api/problems/user/my
 * @access  Private
 */
export const getMyProblems = async (req, res) => {
  try {
    const userId = req.user._id;
    const userEmail = req.user.email;
    const userPhone = req.user.phone;

    const queryConditions = [
      { 'submitter.userId': userId }
    ];
    if (userEmail) {
      queryConditions.push({ 'submitter.email': userEmail });
    }
    if (userPhone) {
      queryConditions.push({ 'submitter.phone': userPhone });
    }

    const problems = await Problem.find({ $or: queryConditions })
      .populate('allocatedUniversity')
      .populate('proposals')
      .populate('industryPartners')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: problems.length,
      problems
    });
  } catch (error) {
    console.error('[Get My Problems Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error fetching your submitted problems'
    });
  }
};

/**
 * @desc    Get all problems with filtering, search, and pagination
 * @route   GET /api/problems
 * @access  Public
 */
export const getProblems = async (req, res) => {
  try {
    const { domain, district, status, priority, resolutionStatus, search, sort = 'newest', page = 1, limit = 50 } = req.query;

    const filter = {};

    if (domain && domain !== 'all') {
      filter.domain = domain;
    }
    if (district && district !== 'all') {
      filter['location.district'] = new RegExp(district, 'i');
    }
    if (status && status !== 'all') {
      filter.status = status;
    }
    if (resolutionStatus && resolutionStatus !== 'all') {
      filter.resolutionStatus = resolutionStatus;
    }
    if (priority && priority !== 'all') {
      filter.priority = priority;
    }
    if (search) {
      const searchConditions = [
        { title: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { 'location.district': new RegExp(search, 'i') },
        { 'location.block': new RegExp(search, 'i') }
      ];
      if (/^[0-9a-fA-F]{24}$/.test(search)) {
        searchConditions.push({ _id: search });
      }
      filter.$or = searchConditions;
    }

    const sortOption = sort === 'oldest' || sort === 'asc' ? { createdAt: 1 } : { createdAt: -1 };

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const problems = await Problem.find(filter)
      .populate('allocatedUniversity')
      .populate('proposals')
      .populate('industryPartners')
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit, 10));

    const total = await Problem.countDocuments(filter);

    return res.status(200).json({
      success: true,
      count: problems.length,
      total,
      page: parseInt(page, 10),
      pages: Math.ceil(total / parseInt(limit, 10)),
      problems
    });
  } catch (error) {
    console.error('[Get Problems Controller Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error fetching problems'
    });
  }
};

/**
 * @desc    Get a single problem statement by ID
 * @route   GET /api/problems/:id
 * @access  Public
 */
export const getProblemById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid problem statement ID '${id}'`
      });
    }

    const problem = await Problem.findById(id)
      .populate('allocatedUniversity')
      .populate({
        path: 'proposals',
        populate: [{ path: 'university' }, { path: 'industryOffer.industry' }, { path: 'assignedIndustry' }]
      })
      .populate('proposalGivenUniversity')
      .populate('industryPartners');

    if (!problem) {
      return res.status(404).json({
        success: false,
        message: `Problem statement with ID '${id}' not found`
      });
    }

    return res.status(200).json({
      success: true,
      problem
    });
  } catch (error) {
    console.error('[Get Problem By ID Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error fetching problem details'
    });
  }
};

/**
 * @desc    Government Triage & Smart Institutional Allocation to a University
 * @route   PATCH /api/problems/:id/allocate
 * @access  Private (Government / Admin)
 */
export const triageAndAllocate = async (req, res) => {
  try {
    const { id } = req.params;
    const { universityId, universityName, facultyLead, note, officerName } = req.body;

    if (!universityId) {
      return res.status(400).json({
        success: false,
        message: 'University ID is required for allocation'
      });
    }

    const problem = await Problem.findById(id);

    if (!problem) {
      return res.status(404).json({
        success: false,
        message: `Problem statement '${id}' not found`
      });
    }

    // Resolve university
    const university = await University.findById(universityId);
    const resolvedName = universityName || university?.name || 'Higher Education Institution';

    // Update allocation details
    problem.status = 'allocated';
    problem.allocatedUniversity = university ? university._id : universityId;

    // Append to audit trail
    problem.auditHistory.unshift({
      timestamp: new Date(),
      officer: officerName || req.user?.name || 'Government Nodal Officer',
      role: 'government',
      action: `Institutional Allocation to ${resolvedName}`,
      note: note || `Routed based on research expertise in ${problem.domain}`
    });

    await problem.save();

    // Trigger email notification to University Lead
    if (university?.contactEmail || facultyLead?.email) {
      sendUniversityAllocationEmail(
        problem,
        facultyLead?.email || university?.contactEmail,
        resolvedName
      ).catch(err => console.warn('[Email Warning]:', err.message));
    }

    return res.status(200).json({
      success: true,
      message: `Problem successfully allocated to ${resolvedName}`,
      problem
    });
  } catch (error) {
    console.error('[Triage & Allocate Controller Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error allocating problem to university'
    });
  }
};

/**
 * @desc    University Submits Multidisciplinary Solution Proposal
 * @route   POST /api/problems/:id/proposal
 * @access  Private (University / Student Team)
 */
export const submitProposal = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      teamLead,
      facultyAdvisor,
      facultyMembers = [],
      teamMembers = [],
      abstract,
      description,
      timelineMonths = 6,
      estimatedBudget = 500000,
      industrySupportRequired = []
    } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Proposal title is required'
      });
    }

    const problem = await Problem.findById(id);

    if (!problem) {
      return res.status(404).json({
        success: false,
        message: `Problem statement '${id}' not found`
      });
    }

    let universityId = req.user?.university || problem.allocatedUniversity;
    if (!universityId) {
      const firstUniv = await University.findOne();
      universityId = firstUniv?._id;
    }

    const newProposal = await Proposal.create({
      problem: problem._id,
      university: universityId,
      title,
      description: description || abstract || 'Detailed multidisciplinary R&D proposal.',
      problemStatement: problem.title,
      domain: problem.domain,
      facultyMembers: facultyMembers.length > 0
        ? facultyMembers
        : [{ name: facultyAdvisor || req.user?.name || 'Lead PI', designation: 'Professor & Lead PI', department: 'Engineering', email: req.user?.email || '' }],
      teamMembers: teamMembers.length > 0
        ? teamMembers
        : [{ name: teamLead || 'Lead Innovator', rollNo: '', branch: 'Engineering', year: 'Final Year' }],
      projectDuration: `${timelineMonths} Months`,
      estimatedBudget: parseFloat(estimatedBudget) || 500000,
      industrySupportRequired: industrySupportRequired.length > 0 ? industrySupportRequired : ['IoT & Embedded Sensors'],
      status: 'submitted'
    });

    if (!problem.proposals.includes(newProposal._id)) {
      problem.proposals.push(newProposal._id);
    }
    if (universityId && !problem.proposalGivenUniversity.includes(universityId)) {
      problem.proposalGivenUniversity.push(universityId);
    }
    problem.status = 'in_progress';

    // Generate standard initial milestones if empty
    if (problem.milestones.length === 0) {
      problem.milestones = [
        { id: 'M1', title: 'Multidisciplinary laboratory simulation & design verification', progress: 100, status: 'completed', targetDate: 'Month 1', completionDate: new Date().toLocaleDateString() },
        { id: 'M2', title: 'Hardware-Software MVP prototyping & lab calibration', progress: 50, status: 'in_progress', targetDate: 'Month 3' },
        { id: 'M3', title: 'Field trial pilot deployment at local community site', progress: 0, status: 'pending', targetDate: 'Month 5' },
        { id: 'M4', title: 'Stakeholder validation & measurable social impact assessment', progress: 0, status: 'pending', targetDate: 'Month 6' }
      ];
    }

    problem.auditHistory.unshift({
      timestamp: new Date(),
      officer: teamLead || req.user?.name || 'University Lead',
      role: 'university',
      action: `Solution Proposal Submitted (${title})`,
      note: `Proposal registered with ₹${estimatedBudget} estimated budget`
    });

    await problem.save();

    return res.status(201).json({
      success: true,
      message: 'Multidisciplinary solution proposal successfully registered',
      proposal: newProposal,
      problem
    });
  } catch (error) {
    console.error('[Submit Proposal Controller Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error registering solution proposal'
    });
  }
};

/**
 * @desc    Industry / CSR Partner Pledges Matching Grant & Mentorship
 * @route   POST /api/problems/:id/fund
 * @access  Private (Industry / CSR)
 */
export const pledgeFunding = async (req, res) => {
  try {
    const { id } = req.params;
    const { partnerId, partnerName, partnerType, grantAmount, mentorAssigned } = req.body;

    if (!partnerName || !grantAmount) {
      return res.status(400).json({
        success: false,
        message: 'Partner name and grant amount are required'
      });
    }

    const problem = await Problem.findById(id);

    if (!problem) {
      return res.status(404).json({
        success: false,
        message: `Problem statement '${id}' not found`
      });
    }

    let industryPartnerDoc = null;
    if (partnerId && /^[0-9a-fA-F]{24}$/.test(partnerId)) {
      industryPartnerDoc = await IndustryPartner.findById(partnerId);
    } else if (req.user?.industry) {
      industryPartnerDoc = await IndustryPartner.findById(req.user.industry);
    }

    if (!industryPartnerDoc) {
      industryPartnerDoc = await IndustryPartner.findOne({ name: new RegExp(`^${partnerName}$`, 'i') });
    }

    if (industryPartnerDoc && !problem.industryPartners.includes(industryPartnerDoc._id)) {
      problem.industryPartners.push(industryPartnerDoc._id);
    }

    problem.auditHistory.unshift({
      timestamp: new Date(),
      officer: partnerName,
      role: 'industry',
      action: `CSR Matching Grant ₹${parseFloat(grantAmount).toLocaleString('en-IN')} Disbursed`,
      note: `Assigned technical mentor: ${mentorAssigned || 'Corporate Technical Mentor'}`
    });

    await problem.save();

    return res.status(200).json({
      success: true,
      message: `CSR Grant ₹${parseFloat(grantAmount).toLocaleString('en-IN')} successfully pledged & disbursed`,
      problem
    });
  } catch (error) {
    console.error('[Pledge Funding Controller Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error processing industry sponsorship'
    });
  }
};

/**
 * @desc    Update Milestone Progress & Deliverable Verification
 * @route   PATCH /api/problems/:id/milestones/:milestoneId
 * @access  Private (University / Govt / Industry)
 */
export const updateMilestone = async (req, res) => {
  try {
    const { id, milestoneId } = req.params;
    const { progress, status, deliverableUrl, note } = req.body;

    const problem = await Problem.findById(id);

    if (!problem) {
      return res.status(404).json({
        success: false,
        message: `Problem statement '${id}' not found`
      });
    }

    const milestone = problem.milestones.find(m => m.id === milestoneId || m._id?.toString() === milestoneId);
    if (!milestone) {
      return res.status(404).json({
        success: false,
        message: `Milestone '${milestoneId}' not found in this problem`
      });
    }

    if (progress !== undefined) milestone.progress = Math.min(100, Math.max(0, parseInt(progress, 10)));
    if (status) milestone.status = status;
    if (deliverableUrl) milestone.deliverableUrl = deliverableUrl;
    if (milestone.progress === 100) milestone.completionDate = new Date().toLocaleDateString();

    const allCompleted = problem.milestones.every(m => m.progress === 100);
    if (allCompleted) {
      problem.status = 'field_testing';
    }

    problem.auditHistory.unshift({
      timestamp: new Date(),
      officer: req.user?.name || 'Project Lead',
      role: req.user?.role || 'university',
      action: `Milestone Progress Updated: ${milestone.title} (${milestone.progress}%)`,
      note: note || `Status set to ${milestone.status}`
    });

    await problem.save();

    return res.status(200).json({
      success: true,
      message: 'Milestone progress updated successfully',
      problem
    });
  } catch (error) {
    console.error('[Update Milestone Controller Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error updating milestone progress'
    });
  }
};

/**
 * @desc    Final Solution Validation & Social Impact Certification
 * @route   PATCH /api/problems/:id/validate
 * @access  Private (Government / Admin)
 */
export const validateSolution = async (req, res) => {
  try {
    const { id } = req.params;
    const { beneficiariesReached, economicSavingsInr, metricName, metricValue, officerName } = req.body;

    const problem = await Problem.findById(id);

    if (!problem) {
      return res.status(404).json({
        success: false,
        message: `Problem statement '${id}' not found`
      });
    }

    problem.status = 'validated';
    problem.socialImpact = {
      beneficiariesReached: beneficiariesReached || problem.socialImpact?.beneficiariesReached || 10000,
      economicSavingsInr: economicSavingsInr || problem.socialImpact?.economicSavingsInr || 2000000,
      metricName: metricName || problem.socialImpact?.metricName || 'Lives Positively Impacted',
      metricValue: metricValue || problem.socialImpact?.metricValue || '10,000+',
      carbonReductionTons: problem.socialImpact?.carbonReductionTons || 25,
      sdgGoals: problem.socialImpact?.sdgGoals || [1, 3, 6, 9]
    };

    problem.auditHistory.unshift({
      timestamp: new Date(),
      officer: officerName || req.user?.name || 'State Validation Committee',
      role: 'government',
      action: 'Solution Certified & Deployed for Statewide Scaling',
      note: `Verified measurable social outcome: ${problem.socialImpact.metricValue} ${problem.socialImpact.metricName}`
    });

    await problem.save();

    return res.status(200).json({
      success: true,
      message: 'Solution officially validated and certified for statewide scaling',
      problem
    });
  } catch (error) {
    console.error('[Validate Solution Controller Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error validating solution'
    });
  }
};

/**
 * @desc    Get all problem hotspots with GPS coordinates for React Map rendering
 * @route   GET /api/problems/map/locations
 * @access  Public
 */
export const getMapLocations = async (req, res) => {
  try {
    const { domain, severity, district } = req.query;
    const filter = {};
    if (domain && domain !== 'all') filter.domain = domain;
    if (severity) filter.priority = severity;
    if (district) filter['location.district'] = new RegExp(district, 'i');

    const problems = await Problem.find(filter)
      .populate('allocatedUniversity', 'name')
      .populate('industryPartners', 'name')
      .lean();

    const hotspots = problems.map((p) => ({
      id: p._id,
      title: p.title,
      domain: p.domain,
      severity: p.priority || 'Medium',
      status: p.status,
      coordinates: {
        lat: p.location?.lat || 23.3441,
        lng: p.location?.lng || 85.3096
      },
      location: {
        district: p.location?.district || 'Ranchi',
        block: p.location?.block || '',
        panchayat: p.location?.panchayat || '',
        address: p.location?.address || ''
      },
      evidenceUrl: p.evidence?.[0]?.url || '',
      allocatedHei: p.allocatedUniversity?.name || '',
      csrPartner: p.industryPartners?.[0]?.name || ''
    }));

    return res.status(200).json({
      success: true,
      count: hotspots.length,
      hotspots
    });
  } catch (error) {
    console.error('[Map Locations Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error fetching map coordinates'
    });
  }
};

/**
 * @desc    Get problems near a specific GPS coordinate
 * @route   GET /api/problems/geo/nearby
 * @access  Public
 */
export const getNearbyProblems = async (req, res) => {
  try {
    const { lat, lng, radiusKm = 50 } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude (lat) and Longitude (lng) are required'
      });
    }

    const targetLat = parseFloat(lat);
    const targetLng = parseFloat(lng);
    const radius = parseFloat(radiusKm);

    // Approximate distance filter by bounding box (1 deg lat ~ 111km)
    const latDelta = radius / 111;
    const lngDelta = radius / (111 * Math.cos(targetLat * (Math.PI / 180)) || 1);

    const problems = await Problem.find({
      'location.lat': { $gte: targetLat - latDelta, $lte: targetLat + latDelta },
      'location.lng': { $gte: targetLng - lngDelta, $lte: targetLng + lngDelta }
    })
      .populate('allocatedUniversity')
      .populate('industryPartners')
      .limit(20);

    return res.status(200).json({
      success: true,
      count: problems.length,
      problems
    });
  } catch (error) {
    console.error('[Geo Nearby Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error querying nearby coordinates'
    });
  }
};

/**
 * @desc    Government reviews and sanctions a tripartite partnership proposal
 * @route   PATCH /api/problems/proposals/:proposalId/govt-approve
 * @access  Private (Government / Admin)
 */
export const approveTripartiteProposal = async (req, res) => {
  try {
    const { proposalId } = req.params;
    const { action = 'approve', remarks = '', sanctionOrderNumber = '' } = req.body;

    const proposal = await Proposal.findById(proposalId)
      .populate('problem')
      .populate('university')
      .populate('industryOffer.industry');

    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Proposal not found' });
    }

    const problem = await Problem.findById(proposal.problem._id || proposal.problem);
    if (!problem) {
      return res.status(404).json({ success: false, message: 'Associated problem not found' });
    }

    if (action === 'approve') {
      const generatedSanction = sanctionOrderNumber || `JH-SANCTION-${Date.now().toString().slice(-6)}`;
      proposal.status = 'approved_by_govt';
      proposal.govtApproval = {
        approvedBy: req.user?._id || null,
        status: 'approved',
        remarks: remarks || 'Tripartite Project sanctioned and approved by Government Authority.',
        sanctionOrderNumber: generatedSanction,
        approvedAt: new Date()
      };
      await proposal.save();

      // Update Problem status & allocation
      problem.status = 'in_progress';
      if (proposal.university) {
        problem.allocatedUniversity = proposal.university._id || proposal.university;
      }
      if (proposal.industryOffer?.industry) {
        const indId = proposal.industryOffer.industry._id || proposal.industryOffer.industry;
        if (!problem.industryPartners.includes(indId)) {
          problem.industryPartners.push(indId);
        }
      }

      // Initialize milestones if empty
      if (!problem.milestones || problem.milestones.length === 0) {
        problem.milestones = [
          { id: 'M1', title: 'Multidisciplinary laboratory simulation & design verification', progress: 100, status: 'completed', targetDate: 'Month 1', completionDate: new Date().toLocaleDateString() },
          { id: 'M2', title: 'Hardware-Software MVP prototyping & lab calibration', progress: 50, status: 'in_progress', targetDate: 'Month 3' },
          { id: 'M3', title: 'Field trial pilot deployment at local community site', progress: 0, status: 'pending', targetDate: 'Month 5' },
          { id: 'M4', title: 'Stakeholder validation & measurable social impact assessment', progress: 0, status: 'pending', targetDate: 'Month 6' }
        ];
      }

      const sanctionNote = `Government approved research implementation by ${proposal.university?.name || 'HEI'} with CSR co-sponsorship from ${proposal.industryOffer?.industry?.name || 'Industry Sponsor'} (Sanction: ${generatedSanction}).`;

      problem.auditHistory.unshift({
        timestamp: new Date(),
        officer: req.user?.name || 'Govt Secretary / Triage Officer',
        role: 'government',
        action: 'Tripartite Partnership Sanctioned by Government',
        note: sanctionNote
      });

      await problem.save();

      // Notify University
      if (proposal.university) {
        await University.findByIdAndUpdate(proposal.university._id || proposal.university, {
          $push: {
            notifications: {
              $each: [{
                id: proposal._id,
                schemaName: 'Proposal',
                title: `Project Sanction Approved by Government!`,
                description: `Government has approved and sanctioned the tripartite project with ${proposal.industryOffer?.industry?.name || 'Industry Sponsor'}. Implementation is now active.`,
                read: false,
                createdAt: new Date()
              }],
              $position: 0
            }
          }
        });
      }

      // Notify Industry
      if (proposal.industryOffer?.industry) {
        await IndustryPartner.findByIdAndUpdate(proposal.industryOffer.industry._id || proposal.industryOffer.industry, {
          $push: {
            notifications: {
              $each: [{
                id: proposal._id,
                schemaName: 'Proposal',
                title: `Govt Sanction Order Issued for Co-Sponsorship`,
                description: `Tripartite project with ${proposal.university?.name || 'University'} has been sanctioned by Government under Section 135 CSR mandate.`,
                read: false,
                createdAt: new Date()
              }],
              $position: 0
            }
          }
        });
      }

      // Notify Submitter Citizen
      if (problem.submitter?.userId) {
        await User.findByIdAndUpdate(problem.submitter.userId, {
          $push: {
            notifications: {
              $each: [{
                id: problem._id,
                schemaName: 'Problem',
                title: `Your Challenge is Now In Progress!`,
                description: `Your challenge '${problem.title}' has been matched with ${proposal.university?.name || 'University'} and co-sponsored by ${proposal.industryOffer?.industry?.name || 'Industry Partner'}.`,
                read: false,
                createdAt: new Date()
              }],
              $position: 0
            }
          }
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Tripartite project approved and sanctioned by Government!',
        problem,
        proposal
      });
    } else {
      proposal.status = 'rejected_by_govt';
      proposal.govtApproval = {
        approvedBy: req.user?._id || null,
        status: 'rejected',
        remarks: remarks || 'Declined by Government Review Committee',
        approvedAt: new Date()
      };
      await proposal.save();

      const declineNote = `Government review committee declined the proposal from ${proposal.university?.name || 'HEI'}. Remarks: ${remarks || 'Review committee decision'}`;

      problem.auditHistory.unshift({
        timestamp: new Date(),
        officer: req.user?.name || 'Govt Secretary / Review Committee',
        role: 'government',
        action: 'Tripartite Proposal Declined by Government',
        note: declineNote
      });

      await problem.save();

      return res.status(200).json({
        success: true,
        message: 'Proposal declined by Government',
        proposal
      });
    }
  } catch (error) {
    console.error('[Approve Tripartite Proposal Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error approving proposal'
    });
  }
};

/**
 * @desc    Get all tripartite proposals forwarded for Government sanction
 * @route   GET /api/problems/proposals/tripartite-packages
 * @access  Private (Government / Admin)
 */
export const getTripartiteProposalsForGovt = async (req, res) => {
  try {
    const proposals = await Proposal.find()
      .populate({
        path: 'problem',
        select: 'title description domain location evidence status priority resolutionStatus submitter createdAt'
      })
      .populate({
        path: 'university',
        select: 'name location type contactEmail availableDomains'
      })
      .populate({
        path: 'industryOffer.industry',
        select: 'name type hqLocation contactEmail availableDomains supportCapabilities csrAnnualBudgetInr leadMentors'
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: proposals.length,
      proposals
    });
  } catch (error) {
    console.error('[Get Tripartite Proposals For Govt Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error fetching tripartite proposals'
    });
  }
};

export default {
  createProblem,
  getMyProblems,
  getProblems,
  getProblemById,
  triageAndAllocate,
  submitProposal,
  pledgeFunding,
  updateMilestone,
  validateSolution,
  getMapLocations,
  getNearbyProblems,
  approveTripartiteProposal,
  getTripartiteProposalsForGovt
};
