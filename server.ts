import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { getJulianDate, getAyanamsha, computeAstrology } from './src/utils/astronomy.js';
import { computeAstrologyWithFreeAstroApi } from './src/utils/freeastroapi.js';
import { BirthDetails } from './src/types.js';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Gemini AI Client
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('WARNING: GEMINI_API_KEY environment variable is missing.');
  }

  const ai = new GoogleGenAI({
    apiKey: apiKey || '',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });

  // Helper to retry and fallback when Gemini API endpoints are unavailable/under high demand (503 & 429)
  async function generateContentWithRetryAndFallback(
    params: {
      model: string;
      contents: any;
      config?: any;
    }
  ) {
    const modelsToTry = [
      params.model,
      'gemini-flash-latest',
      'gemini-3.1-flash-lite'
    ];
    const uniqueModels = Array.from(new Set(modelsToTry));
    let lastError: any = null;

    for (const currentModel of uniqueModels) {
      const maxRetries = 2;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`[AI] Attempting generateContent using model: ${currentModel} (Attempt ${attempt}/${maxRetries})`);
          const response = await ai.models.generateContent({
            ...params,
            model: currentModel
          });
          return response;
        } catch (err: any) {
          lastError = err;
          const errMessage = err.message || '';
          const isTransient = 
            errMessage.includes('503') || 
            errMessage.includes('temporary') || 
            errMessage.includes('demand') || 
            errMessage.includes('UNAVAILABLE') || 
            errMessage.includes('429') ||
            (err.status === 503) ||
            (err.code === 503) ||
            (err.status === 429);

          if (isTransient) {
            console.warn(`[AI] Transient error on model ${currentModel}: ${errMessage}. Retrying...`);
            await new Promise(resolve => setTimeout(resolve, attempt * 1000));
            continue;
          } else {
            console.error(`[AI] Non-transient or critical error with model ${currentModel}: ${errMessage}`);
            break;
          }
        }
      }
      console.warn(`[AI] Model ${currentModel} failed or exhausted. Trying next fallback...`);
    }

    throw lastError || new Error('All models failed to generate content');
  }

  // API Route: Geocoding (Convert Place of Birth to Coordinates and guessed timezone offset)
  app.post('/api/geocode', async (req, res) => {
    try {
      const { place } = req.body;
      if (!place || typeof place !== 'string') {
        return res.status(400).json({ error: 'Birth place query is required' });
      }

      // Fast-dictionary memory to bypass rate-limited Nominatim
      const p = place.toLowerCase().replace(/[^a-z]/g, '');
      const cityDict: Record<string, any> = {
        'newyork': { lat: 40.71, lon: -74.00, tz: -5 },
        'london': { lat: 51.50, lon: -0.12, tz: 0 },
        'mumbai': { lat: 18.97, lon: 72.82, tz: 5.5 },
        'delhi': { lat: 28.61, lon: 77.20, tz: 5.5 },
        'bangalore': { lat: 12.97, lon: 77.59, tz: 5.5 },
        'chennai': { lat: 13.08, lon: 80.27, tz: 5.5 },
        'kolkata': { lat: 22.57, lon: 88.36, tz: 5.5 },
        'pune': { lat: 18.52, lon: 73.85, tz: 5.5 },
        'hyderabad': { lat: 17.38, lon: 78.48, tz: 5.5 },
        'ahmedabad': { lat: 23.02, lon: 72.57, tz: 5.5 },
        'losangeles': { lat: 34.05, lon: -118.24, tz: -8 },
        'chicago': { lat: 41.87, lon: -87.62, tz: -6 },
        'toronto': { lat: 43.65, lon: -79.38, tz: -5 },
        'sydney': { lat: -33.86, lon: 151.20, tz: 10 },
        'melbourne': { lat: -37.81, lon: 144.96, tz: 10 },
        'dubai': { lat: 25.20, lon: 55.27, tz: 4 },
        'singapore': { lat: 1.35, lon: 103.81, tz: 8 },
        'tokyo': { lat: 35.67, lon: 139.65, tz: 9 },
        'paris': { lat: 48.85, lon: 2.35, tz: 1 },
        'berlin': { lat: 52.52, lon: 13.40, tz: 1 },
        'rome': { lat: 41.90, lon: 12.49, tz: 1 }
      };
      
      for (const [key, val] of Object.entries(cityDict)) {
        if (p.includes(key) || key.includes(p)) {
          return res.json({
            place: place,
            lat: val.lat,
            lon: val.lon,
            timezone: val.tz,
            confidence: 'high-dict'
          });
        }
      }

      // We'll perform free geocoding using OpenStreetMap Nominatim
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place)}&format=json&limit=1`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'AIAstrologyChatbotPrototype/1.0 (lenvthank@gmail.com)'
        }
      });

      if (!response.ok) {
        throw new Error('Geocoding service returned status: ' + response.status);
      }

      const results = await response.json();
      
      if (!results || results.length === 0) {
        // Safe defaults if city not found
        return res.json({
          place,
          lat: 18.975, // Default Mumbai, IN coordinates
          lon: 72.825,
          timezone: 5.5,
          confidence: 'fallback',
          displayName: `${place} (Coordinates estimated)`
        });
      }

      const geo = results[0];
      const lat = parseFloat(geo.lat);
      const lon = parseFloat(geo.lon);
      const displayName = geo.display_name;

      // Guess timezone offset on the server based on longitude:
      // Physics calculation: ~15 degrees of longitude = 1 hour.
      // We also verify country specific overrides to make common locations super accurate.
      let timezone = Math.round((lon / 15) * 2) / 2; // round to nearest 0.5 hours

      // Refining common locations
      const nameLower = displayName.toLowerCase();
      if (nameLower.includes('india') || nameLower.includes(', in')) {
        timezone = 5.5;
      } else if (nameLower.includes('united kingdom') || nameLower.includes(', uk') || nameLower.includes('london')) {
        timezone = 1.0; // Default BST/GMT approximate
      } else if (nameLower.includes('japan')) {
        timezone = 9.0;
      } else if (nameLower.includes('china')) {
        timezone = 8.0;
      } else if (nameLower.includes('united states') || nameLower.includes(', us')) {
        // Approximations of US timezones
        if (lon < -114) timezone = -8.0; // Pacific
        else if (lon < -104) timezone = -7.0; // Mountain
        else if (lon < -90) timezone = -6.0; // Central
        else timezone = -5.0; // Eastern
      }

      return res.json({
        place: displayName,
        lat,
        lon,
        timezone,
        confidence: 'high'
      });
    } catch (error: any) {
      console.error('Geocoding error:', error.message);
      return res.json({
        place: req.body.place,
        lat: 18.975,
        lon: 72.825,
        timezone: 5.5,
        confidence: 'estimated_due_to_error'
      });
    }
  });

  // API Route: Calculate Astrology Data given Birth details
  app.post('/api/astrology/calculate', async (req, res) => {
    try {
      const details: BirthDetails = req.body;
      if (!details.dob || !details.tob || !details.place) {
        return res.status(400).json({ error: 'Missing required birth details' });
      }

      // We explicitly bypass FreeAstroAPI to avoid tropical vs sidereal contamination,
      // relying entirely on our local precision Astronomy Engine setup.
      const { computeAstrology } = await import('./src/utils/astronomy.js');
      const report = computeAstrology(details);
      
      return res.json({
        ...report,
        calculationSource: 'Precision Sidereal Vedic Engine'
      });
    } catch (err: any) {
      console.error('Core calculation error:', err);
      return res.status(500).json({ error: 'Failed to calculate astrological data' });
    }
  });

  // API Route: Orchestrate Astrologer Chat
  app.post('/api/chat/message', async (req, res) => {
    try {
      const { messages, birthDetails, astrologyData } = req.body;

      if (!apiKey) {
        return res.status(500).json({ 
          error: 'Gemini API Key is not configured in Secrets. Please add GEMINI_API_KEY in the Secrets panel.' 
        });
      }

      // Check if birthDetails are fully satisfied, if not, ask for fields
      const isMissingDetails = !birthDetails || !birthDetails.dob || !birthDetails.tob || !birthDetails.place || !birthDetails.gender;
      
      const latestMessage = messages[messages.length - 1]?.content || '';

      if (isMissingDetails) {
        // If birthDetails are missing, run a fast extraction & collection pass
        const missingPrompt = `
You are a Professional Vedic Astrologer's onboarding intelligence.
We are in the middle of onboarding a user so we can generate their birth chart and answer their astrological questions.

The current gathered properties:
- DOB: ${birthDetails?.dob || 'Not provided'}
- TOB: ${birthDetails?.tob || 'Not provided'}
- Place: ${birthDetails?.place || 'Not provided'}
- Gender: ${birthDetails?.gender || 'Not provided'}

The user's latest statement: "${latestMessage}"

Your goals:
1. Examine if the user's latest statement provides any of the missing fields (Date of birth, Time of birth, place of birth, or Gender).
   - DOB could be written in English (e.g., Nov 25 1995) or standard format (DD/MM/YYYY or YYYY-MM-DD). If it matches, extract it as YYYY-MM-DD.
   - TOB is exact time (e.g. 8:15 PM or 15:30). If found, extract as HH:MM formats.
   - Place has a city and optional country.
   - Gender: Male, Female, or Other.
2. Formulate a conversational response that acknowledges fields the user provided and asks for the NEXT single missing field, or asks for them if they haven't provided any.
   Be friendly, conversational, and respectful like a professional astrologer.
3. Keep the prompt helpful and structured. Return a response JSON containing:
   {
     "updatedDetails": { "dob": string or null, "tob": string or null, "place": string or null, "gender": string or null },
     "response": "Your astrologer onboarding response text"
   }
Respond ONLY with the raw JSON string inside \`\`\`json \`\`\` block. Avoid any extra words.
`;

        try {
          const extractionResponse = await generateContentWithRetryAndFallback({
            model: 'gemini-3.5-flash',
            contents: extractionResponseContext(messages, missingPrompt),
            config: {
              responseMimeType: 'application/json'
            }
          });

          const rawText = extractionResponse.text || '{}';
          const data = JSON.parse(rawText.trim());
          return res.json(data);
        } catch (extractionErr: any) {
          console.error('Extraction pass failed:', extractionErr);
          // Fallback simple collection
          let nextField: 'dob' | 'tob' | 'place' | 'gender' = 'dob';
          if (birthDetails?.dob) nextField = 'tob';
          if (birthDetails?.dob && birthDetails?.tob) nextField = 'place';
          if (birthDetails?.dob && birthDetails?.tob && birthDetails?.place) nextField = 'gender';

          const questionMap = {
            dob: "To prepare your precise astrological chart, please provide your Date of Birth (DD/MM/YYYY).",
            tob: "Thank you. Now, please share your exact Time of Birth (HH:MM AM/PM).",
            place: "Wonderful. Please provide your Place of Birth (City, State, Country) to calculate planetary alignments.",
            gender: "Lastly, please provide your Gender (Male, Female, Other) to complete the profile."
          };

          return res.json({
            updatedDetails: {},
            response: questionMap[nextField]
          });
        }
      }

      // Birth Details are fully satisfied! We are in interpretive consultation mode.
      const systemInstruction = `
You are a highly revered, professional Vedic Astrologer (Jyotishi) of elite training, deep wisdom, and respectful demeanor.
Your behavior rules:
- Base all astrological claims and interpretations strictly on the generated Birth Chart data provided below.
- Do NOT fabricate chart coordinates, degrees, yogas, or planet positions. Refer precisely to what is in the data.
- Explain your astrological reasoning clearly in beautiful, easily comprehensible human language.
- Mention the houses, planets, rashi signs (e.g., Saturn in Aquarius in the 10th house), planetary strengths, nakshatra influences, active dashas, or yogas (such as Gaja Kesari or Budhaditya) that support your findings.
- Always use probabilistic language ("tends to inspire", "encourages tendencies toward", "likely outlines paths").
- Never state future events as absolute, unalterable facts or guarantees.
- Strictly avoid diagnosing medical conditions, giving binding legal advice, or making guaranteed financial gains. Mention that Vedic astrology is interpretive guidance only, empowering their free will.
- Keep your tone knowledgeable, warm, deeply conversational, reassuring, and dignified.

Astrophysical context provided for this user:
- Gender: ${birthDetails.gender}
- Place: ${birthDetails.place}
- Coordinates: Lat ${birthDetails.lat}, Lon ${birthDetails.lon}, Timezone GMT ${birthDetails.timezone}
- DOB/TOB: ${birthDetails.dob} at ${birthDetails.tob}

ASTROLOGY CALCULATIONS FROM INDEPENDENT VEDIC ORBIT ENGINE (API OUTPUT):
${JSON.stringify(astrologyData, null, 2)}

Respond with detailed, naturally formatted Markdown. Engage in a natural conversational Q&A flow with the user.
`;

      // Orchestrate standard conversation with the custom context
      const chatHistoryForGemini = messages.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      const geminiResponse = await generateContentWithRetryAndFallback({
        model: 'gemini-3.5-flash',
        contents: chatHistoryForGemini,
        config: {
          systemInstruction,
          temperature: 0.7
        }
      });

      return res.json({
        response: geminiResponse.text
      });

    } catch (error: any) {
      console.error('Chat orchestration error:', error);
      return res.status(500).json({ error: error.message || 'Error occurred during AI interpretation' });
    }
  });

  // Helper helper to build a extraction prompt history
  function extractionResponseContext(messages: any[], promptText: string) {
    const subset = messages.slice(-5); // feed last few messages for core extraction
    const parts = subset.map((m: any) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
    return `${parts}\n\nSystem Instruction prompt:\n${promptText}`;
  }

  // Vite Integration for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
