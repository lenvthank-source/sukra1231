import { BirthDetails, AstrologyData, PlanetPosition, HouseDetails, DashaPeriod, YogaDetails } from '../types.js';
import { computeAstrology, getNakshatraDetails } from './astronomy.js';

// Map textual zodiac signs to visual unicode symbol characters for beautiful display UI
function getSignSymbol(signName: string): string {
  const name = signName.toLowerCase();
  if (name.includes('aries') || name.includes('mesha')) return '♈';
  if (name.includes('taurus') || name.includes('vrishabha')) return '♉';
  if (name.includes('gemini') || name.includes('mithuna')) return '♊';
  if (name.includes('cancer') || name.includes('karka')) return '♋';
  if (name.includes('leo') || name.includes('simha')) return '♌';
  if (name.includes('virgo') || name.includes('kanya')) return '♍';
  if (name.includes('libra') || name.includes('tula')) return '♎';
  if (name.includes('scorpio') || name.includes('vrischika')) return '♏';
  if (name.includes('sagittarius') || name.includes('dhanus')) return '♐';
  if (name.includes('capricorn') || name.includes('makara')) return '♑';
  if (name.includes('aquarius') || name.includes('kumbha')) return '♒';
  if (name.includes('pisces') || name.includes('meena')) return '♓';
  return '✨';
}

export async function computeAstrologyWithFreeAstroApi(details: BirthDetails): Promise<AstrologyData & { calculationSource: string }> {
  const apiKey = process.env.FREEASTROAPI_KEY;

  if (!apiKey || apiKey === 'MY_FREEASTROAPI_KEY' || apiKey.trim() === '') {
    console.log('[FreeAstroAPI] Missing or default FREEASTROAPI_KEY. Falling back to offline computation.');
    const fallbackData = computeAstrology(details);
    return {
      ...fallbackData,
      calculationSource: 'Local Vedic Engine (Offline fallback. Setup FREEASTROAPI_KEY in Secrets/Secrets panel to enable FreeAstroAPI).'
    };
  }

  // Extract year, month, day, hour, minute from details
  const [year, month, day] = details.dob.split('-').map(Number);
  const [hour, minute] = details.tob.split(':').map(Number);

  // Payload exactly matches the specified curl request format provided by user
  const bodyPayload = {
    name: 'Consultant',
    year,
    month,
    day,
    hour,
    minute,
    city: details.place,
    lat: details.lat,
    lng: details.lon, // FreeAstroAPI uses lng
    tz_str: 'AUTO',
    house_system: 'placidus',
    include_features: ['lilith', 'chiron'],
    zodiac_type: 'tropical'
  };

  try {
    console.log('[FreeAstroAPI] Querying Natal Calculate API...', JSON.stringify(bodyPayload, null, 2));
    
    const response = await fetch('https://api.freeastroapi.com/api/v1/natal/calculate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify(bodyPayload)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`API returned status ${response.status}: ${errText}`);
    }

    const rawData = await response.json() as any;
    console.log('[FreeAstroAPI] Response received successfully, auditing structure...');

    // Extract the core response object from variations (response, output, or data)
    const resultObj = rawData.response || rawData.output || rawData.data || rawData;

    if (!resultObj || (typeof resultObj !== 'object')) {
      throw new Error('Invalid or empty response object returned by FreeAstroAPI');
    }

    // Merge with full high-quality offline calculations as a structure baseline
    const mergedReport = computeAstrology(details);

    // Standardize planet positions from FreeAstroAPI
    let apiPlanets: any[] = [];
    if (resultObj.planets) {
      if (Array.isArray(resultObj.planets)) {
        apiPlanets = resultObj.planets;
      } else if (typeof resultObj.planets === 'object') {
        // Handle object style of planets e.g. { "sun": {...}, "moon": {...} }
        apiPlanets = Object.entries(resultObj.planets).map(([key, value]: [string, any]) => {
          return {
            name: value.name || value.planet || value.planet_name || key,
            ...value
          };
        });
      }
    }

    if (apiPlanets.length > 0) {
      console.log('[FreeAstroAPI] Overwriting planet positions with API calculations.');
      
      const mappedPlanets: PlanetPosition[] = apiPlanets.map((p: any) => {
        const rawName = p.name || p.planet || p.planet_name || 'Planet';
        // Capitalize Name correctly for display (e.g. 'sun' -> 'Sun')
        const name = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();
        
        const rashiName = p.sign || p.sign_name || 'Unknown';
        
        // Extract degree / full degree to calculate Vedic Nakshatras if missing
        const degree = p.norm_degree !== undefined ? p.norm_degree : (p.degree !== undefined ? p.degree % 30 : p.normDegree !== undefined ? p.normDegree : 0);
        const fullDegree = p.full_degree !== undefined ? p.full_degree : (p.fullDegree !== undefined ? p.fullDegree : (p.degree !== undefined ? p.degree : 0));
        
        // Calculate Vedic Nakshatras & Lords dynamically based on accurate degree
        const nakDetails = getNakshatraDetails(fullDegree);

        return {
          name,
          sign: rashiName,
          signSymbol: getSignSymbol(rashiName),
          degree: Number(degree.toFixed(2)),
          normDegree: fullDegree,
          combust: !!p.is_combust || !!p.combust,
          house: Number(p.house || p.house_number || 1),
          retrograde: !!(p.isRetrograde || p.is_retrograde || p.retrograde),
          nakshatra: nakDetails.name,
          pada: nakDetails.pada,
          nakshatraLord: nakDetails.lord
        };
      });

      if (mappedPlanets.length > 0) {
        mergedReport.planets = mappedPlanets;
      }

      // Map crucial attributes like sunSign, moonSign and ascendant text
      const sunObj = mappedPlanets.find((p) => p.name.toLowerCase() === 'sun');
      if (sunObj) mergedReport.sunSign = sunObj.sign;

      const moonObj = mappedPlanets.find((p) => p.name.toLowerCase() === 'moon');
      if (moonObj) {
        mergedReport.moonSign = moonObj.sign;
        const mainMoonDegree = apiPlanets.find((p: any) => {
          const nameLower = (p.name || p.planet || p.planet_name || '').toLowerCase();
          return nameLower === 'moon';
        });
        if (mainMoonDegree) {
          const fullMoonDeg = mainMoonDegree.full_degree || mainMoonDegree.fullDegree || mainMoonDegree.degree || 0;
          const nak = getNakshatraDetails(fullMoonDeg);
          mergedReport.nakshatra = `${nak.name} (Pada ${nak.pada}, Lord: ${nak.lord})`;
          mergedReport.nakshatraPada = nak.pada;
        }
      }
    }

    // Standardize houses from FreeAstroAPI if available
    let apiHouses: any[] = [];
    if (resultObj.houses) {
      if (Array.isArray(resultObj.houses)) {
        apiHouses = resultObj.houses;
      } else if (typeof resultObj.houses === 'object') {
        apiHouses = Object.entries(resultObj.houses).map(([key, value]: [string, any]) => {
          return {
            house: value.house || value.house_number || Number(key.replace(/[^0-9]/g, '')) || 1,
            ...value
          };
        });
      }
    }

    if (apiHouses.length > 0) {
      console.log('[FreeAstroAPI] Overwriting house cusps with API calculations.');
      
      const mappedHouses: HouseDetails[] = apiHouses.map((h: any) => {
        const hNum = Number(h.house || h.house_number || 1);
        const rashiName = h.sign || h.sign_name || 'Unknown';
        const deg = h.degree !== undefined ? h.degree : (h.norm_degree !== undefined ? h.norm_degree : (h.full_degree !== undefined ? h.full_degree % 30 : 0));
        const fullDeg = h.full_degree !== undefined ? h.full_degree : (h.fullDegree !== undefined ? h.fullDegree : 0);

        return {
          number: hNum,
          sign: rashiName,
          signSymbol: getSignSymbol(rashiName),
          lord: getNakshatraDetails(fullDeg).lord,
          degree: Number(deg.toFixed(2))
        };
      });

      // Sort by house number ascending
      mappedHouses.sort((a, b) => a.number - b.number);
      if (mappedHouses.length > 0) {
        mergedReport.houses = mappedHouses;
      }
    }

    // Direct Ascendant mapping if present
    if (resultObj.ascendant !== undefined) {
      const ascDegVal = typeof resultObj.ascendant === 'number' ? resultObj.ascendant : parseFloat(resultObj.ascendant.degree || resultObj.ascendant.norm_degree || 0);
      mergedReport.ascendantDegree = Number((ascDegVal % 30).toFixed(2));
      
      const ascSignVal = typeof resultObj.ascendant === 'object' ? (resultObj.ascendant.sign || resultObj.ascendant.sign_name) : null;
      if (ascSignVal) {
        mergedReport.ascendant = ascSignVal;
      }
    }

    return {
      ...mergedReport,
      calculationSource: 'FreeAstroAPI Live Calculations'
    };

  } catch (error: any) {
    console.error('[FreeAstroAPI] Live computation failed. Falling back to high-quality engine:', error.message);
    const offlineReport = computeAstrology(details);
    return {
      ...offlineReport,
      calculationSource: `Local Vedic Engine (Live call error: ${error.message})`
    };
  }
}
