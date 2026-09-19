import express from 'express';
import {
  getSupportedLanguages,
  asrAndTranslate,
  extractProblem,
  voiceSubmitProblem
} from '../controllers/bhashiniController.js';

const router = express.Router();

// Supported Bhashini languages & configuration
router.get('/languages', getSupportedLanguages);

// Bhashini ULCA ASR (Speech to text) & NMT (Translation)
router.post('/asr-translate', asrAndTranslate);

// AI Entity & Grievance Parameter Extraction from Spoken Speech
router.post('/extract-problem', extractProblem);

// Direct 1-Click Voice Grievance Registration
router.post('/voice-submit', voiceSubmitProblem);

export default router;
