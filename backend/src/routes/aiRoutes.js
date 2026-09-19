import express from 'express';
import { categorizeProblem, aiChat, translateForm } from '../controllers/aiController.js';

const router = express.Router();

// AI Automatic 10-Domain Categorization, Deduplication, and University Matching
router.post('/categorize', categorizeProblem);

// Live AI Assistant Chat Endpoint
router.post('/chat', aiChat);

// Multilingual Form Value Translation (Vernacular/Regional to English)
router.post('/translate-form', translateForm);

export default router;
