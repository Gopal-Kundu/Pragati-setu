import apiClient from './api';

/**
 * Bhashini AI Voice API Service
 * Handles multilingual speech-to-text, translation, grievance parameter extraction,
 * and automated direct voice challenge submissions.
 */
export const bhashiniApi = {
  // Fetch list of supported Indian languages
  getSupportedLanguages: async () => {
    try {
      const res = await apiClient.get('/bhashini/languages');
      return res.data;
    } catch (err) {
      console.warn('[bhashiniApi.getSupportedLanguages] Using local fallback languages:', err.message);
      return {
        success: true,
        languages: [
          { code: 'hi', name: 'Hindi', native: 'हिन्दी', speechCode: 'hi-IN' },
          { code: 'sat', name: 'Santhali', native: 'संथाली / ᱥᱟᱱᱛᱟᱲᱤ', speechCode: 'sat-IN' },
          { code: 'bn', name: 'Bengali', native: 'বাংলা', speechCode: 'bn-IN' },
          { code: 'bho', name: 'Bhojpuri', native: 'भोजपुरी', speechCode: 'hi-IN' },
          { code: 'mai', name: 'Maithili', native: 'मैथिली', speechCode: 'hi-IN' },
          { code: 'ory', name: 'Odia', native: 'ଓଡ଼ିଆ', speechCode: 'or-IN' },
          { code: 'ur', name: 'Urdu', native: 'اردو', speechCode: 'ur-IN' },
          { code: 'mr', name: 'Marathi', native: 'मराठी', speechCode: 'mr-IN' },
          { code: 'en', name: 'English', native: 'English', speechCode: 'en-IN' }
        ],
        bhashiniConfigured: false
      };
    }
  },

  // Process raw audio via Bhashini ULCA Pipeline (ASR + NMT)
  asrAndTranslate: async ({ audioBase64, audioFormat = 'wav', sourceLanguage = 'hi', targetLanguage = 'en' }) => {
    const res = await apiClient.post('/bhashini/asr-translate', {
      audioBase64,
      audioFormat,
      sourceLanguage,
      targetLanguage
    });
    return res.data;
  },

  // Extract structured problem fields from spoken speech, transcript, or audio recording
  extractProblem: async ({ transcript, translatedText, sourceLanguage = 'hi', audioBase64, mimeType }) => {
    const res = await apiClient.post('/bhashini/extract-problem', {
      transcript,
      translatedText,
      sourceLanguage,
      audioBase64,
      mimeType
    });
    return res.data;
  },

  // Direct 1-click voice grievance registration
  voiceSubmitProblem: async (payload) => {
    const res = await apiClient.post('/bhashini/voice-submit', payload);
    return res.data;
  }
};

export default bhashiniApi;
