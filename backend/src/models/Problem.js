import mongoose from 'mongoose';

/**
 * Problem Schema
 * 
 * Standardized Problem Registry for SIH 2026:
 * - Domain is assigned by AI from 10 canonical domains
 * - Duplicates by location are checked upon submission (if duplicate found, submission is rejected)
 * - Triage, multidisciplinary proposal formulation, CSR industry matching, and milestone tracking
 */
const problemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Problem title is required'],
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Problem description is required'],
      trim: true
    },
    originalTitle: {
      type: String,
      default: '',
      trim: true
    },
    originalDescription: {
      type: String,
      default: '',
      trim: true
    },
    originalLanguage: {
      type: String,
      default: 'English'
    },
    domain: {
      type: String,
      required: [true, 'Domain is required'],
      enum: [
        'Education',
        'Agriculture',
        'Healthcare',
        'Water Resources',
        'Environment',
        'Energy',
        'Urban Development',
        'Accessibility',
        'Public Administration',
        'Rural Livelihoods',
        'Others'
      ],
      index: true
    },
    location: {
      district: { type: String, required: true },
      block: { type: String, default: '' },
      panchayat: { type: String, default: '' },
      state: { type: String, default: 'Jharkhand' },
      lat: { type: Number, default: 23.3441 },
      lng: { type: Number, default: 85.3096 },
      address: { type: String, default: '' },
      pincode: { type: String, default: '' }
    },
    submitter: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      name: { type: String, default: 'Concerned Citizen' },
      role: {
        type: String,
        enum: ['individual_citizen', 'community_org', 'pri_panchayat', 'ulb_urban_body', 'govt_department', 'ngo'],
        default: 'individual_citizen'
      },
      organization: { type: String, default: 'Community Resident' },
      email: { type: String, default: '' },
      phone: { type: String, default: '' }
    },
    evidence: [
      {
        type: { type: String, enum: ['photo', 'video', 'document', 'audio'], default: 'photo' },
        url: { type: String, required: true },
        publicId: { type: String, default: '' },
        caption: { type: String, default: '' },
        uploadedAt: { type: Date, default: Date.now }
      }
    ],
    status: {
      type: String,
      enum: [
        'submitted',
        'govt_review',
        'allocated',
        'proposal_submitted',
        'in_progress',
        'prototyping',
        'field_testing',
        'deployed',
        'validated',
        'rejected'
      ],
      default: 'submitted',
      index: true
    },
    resolutionStatus: {
      type: String,
      enum: ['unsolved', 'solved'],
      default: 'unsolved',
      index: true
    },
    priority: {
      type: String,
      enum: ['Critical', 'High', 'Medium', 'Low'],
      default: 'Medium'
    },
    allocatedUniversity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'University',
      default: null
    },
    proposals: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Proposal'
      }
    ],
    proposalGivenUniversity: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'University'
      }
    ],
    industryPartners: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'IndustryPartner'
      }
    ],
    milestones: [
      {
        id: { type: String, required: true },
        title: { type: String, required: true },
        targetDate: { type: String, default: '' },
        completionDate: { type: String, default: null },
        progress: { type: Number, min: 0, max: 100, default: 0 },
        status: { type: String, enum: ['pending', 'in_progress', 'completed', 'delayed'], default: 'pending' },
        deliverableUrl: { type: String, default: '' },
        verifiedBy: { type: String, default: '' }
      }
    ],
    peopleImpacted: {
      type: Number,
      default: 1000
    },
    socialImpact: {
      beneficiariesReached: { type: Number, default: 0 },
      economicSavingsInr: { type: Number, default: 0 },
      metricName: { type: String, default: 'Lives Impacted' },
      metricValue: { type: String, default: '0' },
      carbonReductionTons: { type: Number, default: 0 },
      sdgGoals: [Number]
    },
    auditHistory: [
      {
        timestamp: { type: Date, default: Date.now },
        officer: { type: String, default: 'System' },
        role: { type: String, default: 'citizen' },
        action: { type: String, required: true },
        note: { type: String, default: '' }
      }
    ],
    timeline: [
      {
        title: { type: String, required: true },
        description: { type: String, default: '' },
        colour: { type: String, default: 'green' },
        createdAt: { type: Date, default: Date.now }
      }
    ]
  },
  {
    timestamps: true
  }
);

// Search indexes for text and geospatial coordinates
problemSchema.index({ title: 'text', description: 'text' });
problemSchema.index({ 'location.lat': 1, 'location.lng': 1 });
problemSchema.index({ 'location.district': 1, 'location.block': 1, 'location.panchayat': 1 });

export const Problem = mongoose.model('Problem', problemSchema);
export default Problem;
