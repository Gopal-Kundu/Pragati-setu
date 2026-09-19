import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { CANONICAL_DOMAINS, fallbackClassify } from './aiService.js';

dotenv.config();

/**
 * 24 Jharkhand Districts Catalog for Geographic Entity Extraction
 */
export const JHARKHAND_DISTRICTS = [
  'Ranchi', 'Dhanbad', 'East Singhbhum', 'Bokaro', 'Hazaribagh',
  'Deoghar', 'Giridih', 'Ramgarh', 'Palamu', 'Gumla',
  'Khunti', 'Latehar', 'West Singhbhum', 'Seraikela Kharsawan',
  'Dumka', 'Godda', 'Sahebganj', 'Pakur', 'Jamtara',
  'Chatra', 'Koderma', 'Garhwa', 'Lohardaga', 'Simdega'
];

/**
 * Common Jharkhand Blocks & Key Localities
 */
export const NOTABLE_BLOCKS = [
  'Torpa', 'Kanke', 'Ormanjhi', 'Namkum', 'Ratu', 'Mandar',
  'Bero', 'Itki', 'Nagri', 'Silli', 'Sonahatu', 'Tamar',
  'Bundu', 'Murhu', 'Karra', 'Rania', 'Arki', 'Khunti',
  'Topchanchi', 'Govindpur', 'Nirsa', 'Baghmara', 'Jharia',
  'Chas', 'Bermo', 'Gomia', 'Chandankiyari', 'Jaridih',
  'Barhi', 'Barkagaon', 'Chouparan', 'Katkamsandi', 'Ichak'
];

/**
 * Supported Languages for Bhashini & Speech Recognition
 */
export const SUPPORTED_LANGUAGES = [
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', speechCode: 'hi-IN' },
  { code: 'sat', name: 'Santhali', native: 'संथाली / ᱥᱟᱱᱛᱟᱲᱤ', speechCode: 'sat-IN' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা', speechCode: 'bn-IN' },
  { code: 'bho', name: 'Bhojpuri', native: 'भोजपुरी', speechCode: 'hi-IN' },
  { code: 'mai', name: 'Maithili', native: 'मैथिली', speechCode: 'hi-IN' },
  { code: 'ory', name: 'Odia', native: 'ଓଡ଼ିଆ', speechCode: 'or-IN' },
  { code: 'ur', name: 'Urdu', native: 'اردو', speechCode: 'ur-IN' },
  { code: 'mr', name: 'Marathi', native: 'मराठी', speechCode: 'mr-IN' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు', speechCode: 'te-IN' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்', speechCode: 'ta-IN' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી', speechCode: 'gu-IN' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ', speechCode: 'pa-IN' },
  { code: 'en', name: 'English', native: 'English', speechCode: 'en-IN' }
];

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const configuredModelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

/**
 * Call Bhashini ULCA Dhruva Inference API if credentials are provided
 */
export const callBhashiniUlcaPipeline = async ({
  audioBase64,
  audioFormat = 'wav',
  sourceLanguage = 'hi',
  targetLanguage = 'en'
}) => {
  const bhashiniUserId = process.env.BHASHINI_USER_ID;
  const bhashiniApiKey = process.env.BHASHINI_API_KEY;
  const bhashiniInferenceKey = process.env.BHASHINI_INFERENCE_KEY;
  const bhashiniPipelineId = process.env.BHASHINI_PIPELINE_ID;

  if (!bhashiniApiKey || !bhashiniUserId) {
    return {
      success: false,
      isConfigured: false,
      message: 'Bhashini credentials (BHASHINI_USER_ID, BHASHINI_API_KEY) not configured in .env'
    };
  }

  const pipelineEndpoint = 'https://dhruva-api.bhashini.gov.in/services/inference/pipeline';

  const payload = {
    pipelineTasks: [
      {
        taskType: 'asr',
        config: {
          language: { sourceLanguage }
        }
      },
      {
        taskType: 'translation',
        config: {
          language: {
            sourceLanguage,
            targetLanguage
          }
        }
      }
    ],
    inputData: {
      audio: [
        {
          audioContent: audioBase64
        }
      ]
    }
  };

  try {
    const response = await fetch(pipelineEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: bhashiniInferenceKey || bhashiniApiKey,
        ulcaApiKey: bhashiniApiKey,
        userId: bhashiniUserId
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        success: false,
        isConfigured: true,
        status: response.status,
        message: `Bhashini ULCA API error (${response.status}): ${errText}`
      };
    }

    const data = await response.json();
    const asrTaskOutput = data.pipelineResponse?.find(t => t.taskType === 'asr');
    const nmtTaskOutput = data.pipelineResponse?.find(t => t.taskType === 'translation');

    const transcript = asrTaskOutput?.output?.[0]?.source || '';
    const translated = nmtTaskOutput?.output?.[0]?.target || transcript;

    return {
      success: true,
      isConfigured: true,
      transcript,
      translated,
      raw: data
    };
  } catch (error) {
    return {
      success: false,
      isConfigured: true,
      message: error.message || 'Network error calling Bhashini ULCA API'
    };
  }
};

/**
 * Extract structured problem data from spoken voice transcript using Gemini AI + regex fallback
 */
export const extractProblemFromSpeech = async ({
  transcript = '',
  translatedText = '',
  sourceLanguage = 'hi'
}) => {
  const combinedText = `${transcript} ${translatedText}`.trim();
  if (!combinedText) {
    return {
      title: 'Societal Grievance via Voice',
      description: '',
      domain: 'Water Resources',
      district: 'Ranchi',
      block: '',
      panchayat: '',
      urgency: 'Medium',
      affectedPopulation: '100+ Households'
    };
  }

  // 1. First attempt with Gemini AI if available
  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: configuredModelName });
      const prompt = `
You are the AI Grievance Extraction Engine for Jharkhand Pragati Setu (Smart India Hackathon 2026).
A citizen or Gram Panchayat Mukhiya has submitted a problem report using voice speech in ${sourceLanguage}.

Spoken Vernacular Transcript: "${transcript}"
English Translation / Context: "${translatedText}"

TASK:
Analyze the speech and extract the structured problem statement parameters.
1. "title": A concise, formal problem title in English (max 10 words).
2. "narrative": Detailed description of what is happening, what is damaged/needed, and how people are suffering.
3. "domain": Must be EXACTLY ONE of: ${CANONICAL_DOMAINS.map(d => `"${d}"`).join(', ')}.
4. "district": Detect if any Jharkhand district is mentioned (${JHARKHAND_DISTRICTS.join(', ')}). Default to "Ranchi" if unknown.
5. "block": The administrative block or locality mentioned, or empty string.
6. "panchayat": The Gram Panchayat or village mentioned, or empty string.
7. "urgency": "Critical" (hazards, immediate disaster), "High" (acute seasonal crisis, health threat), "Medium" (recurring infrastructure breakdown), or "Low" (general improvement).
8. "affectedPopulation": Estimated number of households, students, or citizens affected (e.g. "300 Households", "500 Farmers").
9. "keyNeeds": Array of 2-4 technical/infrastructural items needed (e.g. ["Solar Deep Borewell", "Water Filter Unit"]).

Return ONLY a valid JSON object without markdown fences or additional explanation:
{
  "title": "Concise English title",
  "narrative": "Detailed narrative description",
  "domain": "One canonical domain",
  "district": "Detected District",
  "block": "Detected Block",
  "panchayat": "Detected Panchayat or village",
  "urgency": "Medium",
  "affectedPopulation": "Estimated affected population",
  "keyNeeds": ["item1", "item2"]
}
`;

      const result = await model.generateContent(prompt);
      const rawText = result.response.text().trim();
      const cleanJson = rawText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed = JSON.parse(cleanJson);

      const validDomain = CANONICAL_DOMAINS.find(
        d => d.toLowerCase() === (parsed.domain || '').toLowerCase()
      ) || fallbackClassify(parsed.title || '', combinedText);

      return {
        title: parsed.title || generateDefaultTitle(combinedText),
        narrative: parsed.narrative || combinedText,
        domain: validDomain,
        district: matchDistrict(parsed.district || combinedText),
        block: parsed.block || matchBlock(combinedText),
        panchayat: parsed.panchayat || '',
        urgency: ['Critical', 'High', 'Medium', 'Low'].includes(parsed.urgency) ? parsed.urgency : 'High',
        affectedPopulation: parsed.affectedPopulation || extractPopulation(combinedText),
        keyNeeds: Array.isArray(parsed.keyNeeds) ? parsed.keyNeeds : []
      };
    } catch (err) {
      console.warn('[Bhashini Speech AI Extraction Fallback]:', err.message);
    }
  }

  // 2. High-Quality Deterministic Fallback Extractor
  return deterministicExtract(combinedText, transcript);
};

/**
 * Deterministic fallback extractor for offline / rate-limited situations
 */
const deterministicExtract = (combinedText, rawTranscript) => {
  const domain = fallbackClassify('', combinedText);
  const district = matchDistrict(combinedText);
  const block = matchBlock(combinedText);
  const urgency = /danger|emergency|maternal|death|flood|collapse|poison|fluoride|critical|urgent/i.test(combinedText)
    ? 'Critical'
    : /broken|scarcity|shortage|dry|kharab|pareshan|problem/i.test(combinedText)
    ? 'High'
    : 'Medium';

  const affectedPopulation = extractPopulation(combinedText);

  // Formulate a clean title
  let title = '';
  if (domain === 'Water Resources') {
    title = `Drinking Water & Borewell Scarcity in ${block || district}`;
  } else if (domain === 'Agriculture') {
    title = `Crop Irrigation & Cold Storage Challenge in ${block || district}`;
  } else if (domain === 'Healthcare') {
    title = `Primary Health Center & Diagnostic Infrastructure Issue in ${block || district}`;
  } else if (domain === 'Energy') {
    title = `Power Transformer & Rural Solar Grid Failure in ${block || district}`;
  } else if (domain === 'Environment') {
    title = `Mine Dust & Watershed Pollution in ${block || district}`;
  } else {
    title = `Societal Infrastructure Grievance in ${block || district}`;
  }

  return {
    title,
    narrative: combinedText || rawTranscript || 'Grassroots challenge reported via Bhashini voice interface.',
    domain,
    district,
    block,
    panchayat: '',
    urgency,
    affectedPopulation,
    keyNeeds: [
      domain === 'Water Resources' ? 'Deep Borewell with Solar Pump' : 'Field Diagnostic Kit',
      'Community Sensor Telemetry'
    ]
  };
};

const matchDistrict = (text) => {
  for (const d of JHARKHAND_DISTRICTS) {
    const reg = new RegExp(`\\b${d}\\b`, 'i');
    if (reg.test(text)) return d;
  }
  return 'Ranchi';
};

const matchBlock = (text) => {
  for (const b of NOTABLE_BLOCKS) {
    const reg = new RegExp(`\\b${b}\\b`, 'i');
    if (reg.test(text)) return b;
  }
  return '';
};

const extractPopulation = (text) => {
  const match = text.match(/(\d+)\s*(families|households|homes|people|villagers|ghar|kisan|students)/i);
  if (match) {
    return `${match[1]} ${match[2]}`;
  }
  return '250+ Households';
};

const generateDefaultTitle = (text) => {
  const words = text.split(/\s+/).slice(0, 8).join(' ');
  return words ? `${words}...` : 'Societal Grievance via Bhashini Voice';
};

export default {
  SUPPORTED_LANGUAGES,
  JHARKHAND_DISTRICTS,
  callBhashiniUlcaPipeline,
  extractProblemFromSpeech
};
