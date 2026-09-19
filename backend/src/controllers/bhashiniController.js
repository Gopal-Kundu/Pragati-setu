import Problem from '../models/Problem.js';
import {
  callBhashiniUlcaPipeline,
  extractProblemFromSpeech,
  SUPPORTED_LANGUAGES,
  JHARKHAND_DISTRICTS
} from '../ai/bhashiniService.js';
import { checkProblemDuplicateInLocation } from '../ai/aiService.js';

/**
 * @desc    Get List of Supported Languages for Bhashini Voice Input
 * @route   GET /api/bhashini/languages
 * @access  Public
 */
export const getSupportedLanguages = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      languages: SUPPORTED_LANGUAGES,
      bhashiniConfigured: Boolean(process.env.BHASHINI_API_KEY && process.env.BHASHINI_USER_ID),
      districts: JHARKHAND_DISTRICTS
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch Bhashini languages'
    });
  }
};

/**
 * @desc    Process Voice Audio via Bhashini ASR & NMT Pipeline
 * @route   POST /api/bhashini/asr-translate
 * @access  Public
 */
export const asrAndTranslate = async (req, res) => {
  try {
    const {
      audioBase64,
      audioFormat = 'wav',
      sourceLanguage = 'hi',
      targetLanguage = 'en'
    } = req.body;

    if (!audioBase64) {
      return res.status(400).json({
        success: false,
        message: 'audioBase64 string is required for Bhashini speech processing'
      });
    }

    const bhashiniResult = await callBhashiniUlcaPipeline({
      audioBase64,
      audioFormat,
      sourceLanguage,
      targetLanguage
    });

    return res.status(200).json(bhashiniResult);
  } catch (error) {
    console.error('[Bhashini ASR/Translate Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error executing Bhashini speech pipeline'
    });
  }
};

/**
 * @desc    Extract Structured Problem Entities from Spoken Speech / Transcript
 * @route   POST /api/bhashini/extract-problem
 * @access  Public
 */
export const extractProblem = async (req, res) => {
  try {
    const {
      transcript = '',
      translatedText = '',
      sourceLanguage = 'hi',
      audioBase64 = null,
      mimeType = 'audio/webm'
    } = req.body;

    if (!transcript && !translatedText && !audioBase64) {
      return res.status(400).json({
        success: false,
        message: 'Transcript, translated text, or voice audio is required to extract problem parameters'
      });
    }

    const extracted = await extractProblemFromSpeech({
      transcript,
      translatedText,
      sourceLanguage,
      audioBase64,
      mimeType
    });

    const desc = (extracted.description || extracted.narrative || transcript || 'Grassroots challenge reported via voice.').trim();
    const cleanTitle = (extracted.title || '').replace(/^["'\s]+|["'\s]+$/g, '').trim();
    const title = cleanTitle || 'Societal Grievance via Voice';

    const finalData = {
      ...extracted,
      title,
      description: desc,
      narrative: desc
    };

    return res.status(200).json({
      success: true,
      data: finalData,
      transcript: extracted.transcript || transcript
    });
  } catch (error) {
    console.error('[Bhashini Extract Problem Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to extract problem parameters from speech'
    });
  }
};

/**
 * @desc    End-to-End Voice Grievance Submission
 * @route   POST /api/bhashini/voice-submit
 * @access  Public / Authenticated
 */
export const voiceSubmitProblem = async (req, res) => {
  try {
    const {
      transcript = '',
      translatedText = '',
      sourceLanguage = 'hi',
      submitterName,
      submitterPhone,
      submitterEmail,
      submitterRole = 'individual_citizen',
      audioUrl = ''
    } = req.body;

    if (!transcript && !translatedText) {
      return res.status(400).json({
        success: false,
        message: 'Voice transcript is required for automated grievance registration'
      });
    }

    // 1. Extract structured problem fields from speech
    const extracted = await extractProblemFromSpeech({
      transcript,
      translatedText,
      sourceLanguage
    });

    const district = extracted.district || 'Ranchi';
    const block = extracted.block || '';
    const panchayat = extracted.panchayat || '';

    // 2. Check for duplicate complaints in that locality
    const locFilter = { 'location.district': new RegExp(`^${district}$`, 'i') };
    if (block) locFilter['location.block'] = new RegExp(`^${block}$`, 'i');

    const existingInLocality = await Problem.find(locFilter)
      .select('title description domain location status')
      .limit(15);

    const duplicateCheck = await checkProblemDuplicateInLocation(
      {
        title: extracted.title,
        description: extracted.narrative,
        location: { district, block, panchayat }
      },
      existingInLocality
    );

    if (duplicateCheck.isDuplicate) {
      return res.status(409).json({
        success: false,
        duplicate: true,
        message: duplicateCheck.explanation || 'A substantially similar problem is already registered in this locality.',
        existingProblemId: duplicateCheck.matchedProblemId,
        extracted
      });
    }

    // 3. Create standardized Problem document
    const evidenceList = [];
    if (audioUrl) {
      evidenceList.push({
        type: 'audio',
        url: audioUrl,
        caption: `Bhashini Voice Memo (${sourceLanguage.toUpperCase()})`
      });
    }

    const newProblem = new Problem({
      title: extracted.title,
      description: `${extracted.narrative}\n\n[Recorded via Bhashini Voice Assistant in ${sourceLanguage.toUpperCase()}]\nOriginal Transcript: "${transcript}"`,
      domain: extracted.domain || 'Others',
      location: {
        district,
        block,
        panchayat,
        state: 'Jharkhand'
      },
      submitter: {
        userId: req.user?._id || null,
        name: submitterName || (req.user ? req.user.name : 'Citizen via Bhashini Voice'),
        phone: submitterPhone || (req.user ? req.user.phone : ''),
        email: submitterEmail || (req.user ? req.user.email : ''),
        role: submitterRole
      },
      priority: extracted.urgency || 'Medium',
      evidence: evidenceList,
      status: 'submitted',
      resolutionStatus: 'unsolved'
    });

    const savedProblem = await newProblem.save();

    return res.status(201).json({
      success: true,
      message: 'Problem statement registered successfully via Bhashini Voice',
      problem: savedProblem,
      clusterId: savedProblem._id,
      ticketId: savedProblem.ticketId || savedProblem._id,
      extracted
    });
  } catch (error) {
    console.error('[Bhashini Voice Submit Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error processing voice problem submission'
    });
  }
};

export default {
  getSupportedLanguages,
  asrAndTranslate,
  extractProblem,
  voiceSubmitProblem
};
