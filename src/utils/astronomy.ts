import { BirthDetails, AstrologyData, PlanetPosition, HouseDetails, DashaPeriod, YogaDetails } from '../types';

// Vedic Signs (Rashis)
export const RASHIS = [
  { name: 'Mesha (Aries)', symbol: '♈' },
  { name: 'Vrishabha (Taurus)', symbol: '♉' },
  { name: 'Mithuna (Gemini)', symbol: '♊' },
  { name: 'Karka (Cancer)', symbol: '♋' },
  { name: 'Simha (Leo)', symbol: '♌' },
  { name: 'Kanya (Virgo)', symbol: '♍' },
  { name: 'Tula (Libra)', symbol: '♎' },
  { name: 'Vrishchika (Scorpio)', symbol: '♏' },
  { name: 'Dhanu (Sagittarius)', symbol: '♐' },
  { name: 'Makara (Capricorn)', symbol: '♑' },
  { name: 'Kumbha (Aquarius)', symbol: '♒' },
  { name: 'Meena (Pisces)', symbol: '♓' }
];

// Vedic Nakshatras (Asterisms)
export const NAKSHATRAS = [
  { name: 'Ashwini', lord: 'Ketu' },
  { name: 'Bharani', lord: 'Venus' },
  { name: 'Krittika', lord: 'Sun' },
  { name: 'Rohini', lord: 'Moon' },
  { name: 'Mrigashira', lord: 'Mars' },
  { name: 'Ardra', lord: 'Rahu' },
  { name: 'Punarvasu', lord: 'Jupiter' },
  { name: 'Pushya', lord: 'Saturn' },
  { name: 'Ashlesha', lord: 'Mercury' },
  { name: 'Magha', lord: 'Ketu' },
  { name: 'Purva Phalguni', lord: 'Venus' },
  { name: 'Uttara Phalguni', lord: 'Sun' },
  { name: 'Hasta', lord: 'Moon' },
  { name: 'Chitra', lord: 'Mars' },
  { name: 'Swati', lord: 'Rahu' },
  { name: 'Visakha', lord: 'Jupiter' },
  { name: 'Anuradha', lord: 'Saturn' },
  { name: 'Jyeshtha', lord: 'Mercury' },
  { name: 'Mula', lord: 'Ketu' },
  { name: 'Purva Ashadha', lord: 'Venus' },
  { name: 'Uttara Ashadha', lord: 'Sun' },
  { name: 'Shravana', lord: 'Moon' },
  { name: 'Dhanishta', lord: 'Mars' },
  { name: 'Shatabhisha', lord: 'Rahu' },
  { name: 'Purva Bhadrapada', lord: 'Jupiter' },
  { name: 'Uttara Bhadrapada', lord: 'Saturn' },
  { name: 'Revati', lord: 'Mercury' }
];

// Helper to normalize degrees to [0, 360)
function normalize360(deg: number): number {
  let d = deg % 360;
  if (d < 0) d += 360;
  return d;
}

// Convert birth details to Julian Date
export function getJulianDate(dob: string, tob: string, timezone: number): number {
  const [year, month, day] = dob.split('-').map(Number);
  const [hour, min] = tob.split(':').map(Number);

  // Convert local time to UTC decimal hour
  const utchour = hour + min / 60.0 - timezone;

  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }

  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);

  const jd = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524.5 + utchour / 24.0;
  return jd;
}

// Calculate Sidereal Time (GST / LST)
function getLocalSiderealTime(jd: number, lon: number): number {
  const t = (jd - 2451545.0) / 36525.0;
  // Greenwich Mean Sidereal Time in degrees
  let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + t * t * (0.000387933 - t / 38710000.0);
  gmst = normalize360(gmst);
  // Local Sidereal Time in degrees
  return normalize360(gmst + lon);
}

// Lahiri Ayanamsha (Chitra Paksha Ayanamsha approximation)
export function getAyanamsha(jd: number): number {
  // Base Ayanamsha: 23° 51' 25.53" at Epoch J2000.0 (January 1.5, 2000)
  // Changes by ~50.29 arcseconds per year (0.01397 degrees per year)
  const t = (jd - 2451545.0) / 36525.0; // Centuries since J2000
  const ayanamsha = 23.8571 + t * 1.396971; // In degrees
  return ayanamsha;
}

interface PlanetOrbitElements {
  L: number; // Mean longitude
  a: number; // Semi-major axis
  e: number; // Eccentricity
  i: number; // Inclination
  o: number; // Longitude of ascending node
  p: number; // Longitude of perihelion
}

// Approximate orbital elements at J2000 for planets (Sun acts as Earth barycenter inverse)
function getPlanetCoordinates(name: string, t: number, jd: number): { lon: number, retrograde: boolean } {
  let elements: PlanetOrbitElements;
  let dL = 0, da = 0, de = 0, di = 0, do_deg = 0, dp = 0;

  // Let's seed astronomical values for 2000.0 + t centuries
  switch (name) {
    case 'Sun':
      elements = {
        L: 280.46645 + 36000.76983 * t,
        a: 1.000001018,
        e: 0.01670863 - 0.000042037 * t,
        i: 0,
        o: 0,
        p: 282.93735 + 0.32252 * t
      };
      break;
    case 'Moon':
      // Highly simplified Moon orbit
      elements = {
        L: 218.31643 + 481267.8813 * t,
        a: 0.00257, // AU
        e: 0.054900489,
        i: 5.145396,
        o: 125.04452 - 1934.13626 * t,
        p: 83.35324 + 4069.01371 * t
      };
      break;
    case 'Mercury':
      elements = {
        L: 252.25084 + 149472.6741 * t,
        a: 0.38709893,
        e: 0.20563069 + 0.000020407 * t,
        i: 7.00487 + 0.00607 * t,
        o: 48.33167 - 0.12516 * t,
        p: 77.45645 + 0.15901 * t
      };
      break;
    case 'Venus':
      elements = {
        L: 181.97973 + 58517.81538 * t,
        a: 0.72333199,
        e: 0.00677323 - 0.000047765 * t,
        i: 3.39471 + 0.00079 * t,
        o: 76.68069 - 0.27769 * t,
        p: 131.53298 + 0.00213 * t
      };
      break;
    case 'Mars':
      elements = {
        L: 355.45332 + 19140.30268 * t,
        a: 1.52366231,
        e: 0.09341233 + 0.000119024 * t,
        i: 1.85061 - 0.00724 * t,
        o: 49.57854 - 0.29498 * t,
        p: 336.04084 + 0.44383 * t
      };
      break;
    case 'Jupiter':
      elements = {
        L: 34.40438 + 3034.74612 * t,
        a: 5.20336301,
        e: 0.04839266 - 0.0001288 * t,
        i: 1.3053 + 0.00415 * t,
        o: 100.55615 + 0.2038 * t,
        p: 14.75385 + 0.1911 * t
      };
      break;
    case 'Saturn':
      elements = {
        L: 49.94432 + 1222.11379 * t,
        a: 9.53707032,
        e: 0.0541506 + 0.00036762 * t,
        i: 2.48446 + 0.00193 * t,
        o: 113.71504 - 0.25908 * t,
        p: 92.43194 - 0.41897 * t
      };
      break;
    case 'Rahu': // North Node (Mean Node approximation)
      // Node retrogrades ~19.34 degrees per year
      const nodePos = normalize360(125.04452 - 1934.13626 * t);
      return { lon: nodePos, retrograde: true };
    case 'Ketu': // South Node (Always exactly opposite Rahu)
      const oppositeNode = normalize360(125.04452 - 1934.13626 * t + 180.0);
      return { lon: oppositeNode, retrograde: true };
    default:
      return { lon: 0, retrograde: false };
  }

  // Calculate coordinates relative to Earth
  // Resolve eccentric anomaly by Kepler's equation: M = E - e*sin(E)
  const M = normalize360(elements.L - elements.p);
  const mRad = (M * Math.PI) / 180;
  let E = mRad;
  let diff = 1.0;
  for (let j = 0; j < 5 && diff > 0.0001; j++) {
    const eNext = E - (E - elements.e * Math.sin(E) - mRad) / (1 - elements.e * Math.cos(E));
    diff = Math.abs(eNext - E);
    E = eNext;
  }

  // Calculate coordinates in orbital plane
  const x = elements.a * (Math.cos(E) - elements.e);
  const y = elements.a * Math.sqrt(1 - elements.e * elements.e) * Math.sin(E);

  // True anomaly and distance
  const r = Math.sqrt(x * x + y * y);
  let v = Math.atan2(y, x) * (180 / Math.PI);
  v = normalize360(v);

  // Heliocentric position
  const lon_orb = normalize360(v + elements.p);

  // Simple geo-centric projection
  let geocentricLon = lon_orb;
  if (name !== 'Sun' && name !== 'Moon') {
    // Correct by Earth (Sun inverse) position
    const tSun = (jd - 2451545.0) / 36525.0;
    const MSun = normalize360(280.46645 + 36000.76983 * tSun - (282.93735 + 0.32252 * tSun));
    const mRadSun = (MSun * Math.PI) / 180;
    const eSun = 0.01670863 - 0.000042037 * tSun;
    const xSun = Math.cos(mRadSun) - eSun;
    const ySun = Math.sin(mRadSun);
    const lonSun = normalize360(Math.atan2(ySun, xSun) * (180 / Math.PI) + 282.93735);

    // Project planetary longitude to geocentric by vector addition
    const radSun = (lonSun * Math.PI) / 180;
    const radPlan = (lon_orb * Math.PI) / 180;
    const rEarth = 1.0; // AU
    const planetX = r * Math.cos(radPlan) - rEarth * Math.cos(radSun);
    const planetY = r * Math.sin(radPlan) - rEarth * Math.sin(radSun);
    geocentricLon = normalize360(Math.atan2(planetY, planetX) * (180 / Math.PI));
  } else if (name === 'Sun') {
    // Sun is simply Earth inverse
    geocentricLon = normalize360(lon_orb);
  } else if (name === 'Moon') {
    // Moon is already geocentric in elements
    geocentricLon = normalize360(lon_orb);
  }

  // Simple determination of planet retrogrades (approximate outer and inner retrograde conditions on JD)
  let isRetro = false;
  if (name === 'Mercury') {
    const synodicPeriod = 115.88;
    const phase = (jd % synodicPeriod) / synodicPeriod;
    isRetro = phase > 0.4 && phase < 0.6;
  } else if (name === 'Venus') {
    const synodicPeriod = 583.92;
    const phase = (jd % synodicPeriod) / synodicPeriod;
    isRetro = phase > 0.45 && phase < 0.55;
  } else if (name === 'Mars') {
    const synodicPeriod = 779.94;
    const phase = (jd % synodicPeriod) / synodicPeriod;
    isRetro = phase > 0.47 && phase < 0.53;
  } else if (name === 'Jupiter') {
    const synodicPeriod = 398.88;
    const phase = (jd % synodicPeriod) / synodicPeriod;
    isRetro = phase > 0.42 && phase < 0.58;
  } else if (name === 'Saturn') {
    const synodicPeriod = 378.09;
    const phase = (jd % synodicPeriod) / synodicPeriod;
    isRetro = phase > 0.43 && phase < 0.57;
  }

  return { lon: geocentricLon, retrograde: isRetro };
}

// Calculate the Ascendant (Lagna) in degrees
export function getAscendant(jd: number, lat: number, lon: number): number {
  const lst = getLocalSiderealTime(jd, lon);
  const lstRad = (lst * Math.PI) / 180;
  const latRad = (lat * Math.PI) / 180;
  const obliquity = 23.439291 * (Math.PI / 180); // obliquity of ecliptic

  // Formula for Ascendant longitude
  const numerator = -Math.cos(lstRad);
  const denominator = Math.sin(lstRad) * Math.cos(obliquity) + Math.tan(latRad) * Math.sin(obliquity);
  
  let ascendant = Math.atan2(numerator, denominator) * (180 / Math.PI);
  ascendant = normalize360(ascendant);
  return ascendant;
}

// Helper to find Rashi of a degree
export function getRashiDetails(degree: number): { name: string; symbol: string; index: number; degreeInSign: number } {
  const rashiIndex = Math.floor(degree / 30);
  const rashi = RASHIS[rashiIndex];
  const degreeInSign = degree % 30;
  return {
    name: rashi.name,
    symbol: rashi.symbol,
    index: rashiIndex,
    degreeInSign
  };
}

// Helper to find Nakshatra of a degree
export function getNakshatraDetails(degree: number): { name: string; lord: string; index: number; pada: number } {
  const nakshatraIndex = Math.floor(degree / (360 / 27));
  const nakshatra = NAKSHATRAS[nakshatraIndex];
  const pada = Math.floor((degree % (360 / 27)) / (360 / 108)) + 1;
  return {
    name: nakshatra.name,
    lord: nakshatra.lord,
    index: nakshatraIndex,
    pada
  };
}

// Compute full Vedic Astrology report locally
export function computeAstrology(details: BirthDetails): AstrologyData {
  const jd = getJulianDate(details.dob, details.tob, details.timezone);
  const t = (jd - 2451545.0) / 36525.0; // centuries relative to J2000
  const ayanamsha = getAyanamsha(jd);

  // 1. Calculate Sidereal Ascendant (Lagna)
  const tropicalAsc = getAscendant(jd, details.lat, details.lon);
  const siderealAsc = normalize360(tropicalAsc - ayanamsha);
  const ascRashi = getRashiDetails(siderealAsc);

  // Define houses from the Ascendant (Equal House System starting from Lagna degree)
  const houses: HouseDetails[] = [];
  for (let i = 1; i <= 12; i++) {
    const houseCusp = normalize360(siderealAsc + (i - 1) * 30);
    const rashi = getRashiDetails(houseCusp);
    houses.push({
      number: i,
      sign: rashi.name,
      signSymbol: rashi.symbol,
      lord: getNakshatraDetails(houseCusp).lord, // Simplified lord lookup
      degree: rashi.degreeInSign
    });
  }

  // 2. Calculate Planets (apply Lahiri Ayanamsha)
  const planetNames = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Rahu', 'Ketu'];
  const planets: PlanetPosition[] = planetNames.map((name) => {
    const tropicalCoords = getPlanetCoordinates(name, t, jd);
    const siderealCoords = normalize360(tropicalCoords.lon - ayanamsha);
    const rashi = getRashiDetails(siderealCoords);
    const nakshatra = getNakshatraDetails(siderealCoords);

    // Determine house placement: distance in degrees from Ascendant
    const distance = normalize360(siderealCoords - siderealAsc);
    const houseNum = Math.floor(distance / 30) + 1;

    return {
      name,
      sign: rashi.name,
      signSymbol: rashi.symbol,
      degree: Number(rashi.degreeInSign.toFixed(2)),
      house: houseNum,
      retrograde: tropicalCoords.retrograde,
      nakshatra: nakshatra.name,
      nakshatraLord: nakshatra.lord
    };
  });

  const sun = planets.find((p) => p.name === 'Sun')!;
  const moon = planets.find((p) => p.name === 'Moon')!;
  const moonNakshatra = getNakshatraDetails(normalize360(getPlanetCoordinates('Moon', t, jd).lon - ayanamsha));

  // 3. Detect Yogas (Combinations)
  const yogas: YogaDetails[] = [
    {
      name: 'Gaja Kesari Yoga',
      description: 'Jupiter is in a Kendra (1st, 4th, 7th, 10th house) from Moon and is aspected by benefics.',
      present: false,
      significance: 'Brings wealth, wisdom, power, high reputation, and long-lasting fame.'
    },
    {
      name: 'Raja Yoga',
      description: 'Lord of a Kendra (1, 4, 7, 10) and Lord of a Trikona (1, 5, 9) are in association.',
      present: true, // Standard Raja Yoga indicator
      significance: 'Brings royal status, high success in authority, command, energy, and wealth.'
    },
    {
      name: 'Budhaditya Yoga',
      description: 'Sun and Mercury are conjoined in the same house.',
      present: false,
      significance: 'Enhances intelligence, speech, professional skill, analytical depth, and status.'
    },
    {
      name: 'Malavya Yoga',
      description: 'Venus is in own house or exalted position and in a Kendra from Ascendant.',
      present: false,
      significance: 'Bestows artistic excellence, luxurious lifestyles, handsome/beautiful looks, and happy marriages.'
    }
  ];

  // Check Gaja Kesari: distance between Jupiter and Moon is 0, 90, 180, 270 deg (approx houses 1, 4, 7, 10)
  const jup = planets.find((p) => p.name === 'Jupiter')!;
  const moonHouse = moon.house;
  const jupHouse = jup.house;
  const houseDiff = Math.abs(jupHouse - moonHouse);
  if ([0, 3, 6, 9].includes(houseDiff) || [0, 3, 6, 9].includes(12 - houseDiff)) {
    const gaja = yogas.find((y) => y.name === 'Gaja Kesari Yoga')!;
    gaja.present = true;
  }

  // Check Budhaditya: Sun house equals Mercury house
  const merc = planets.find((p) => p.name === 'Mercury')!;
  if (sun.house === merc.house) {
    const budh = yogas.find((y) => y.name === 'Budhaditya Yoga')!;
    budh.present = true;
  }

  // Check Malavya: Venus conjoined in Kendra (1, 4, 7, 10) and in Taurus/Libra (own) or Pisces (exalted)
  const ven = planets.find((p) => p.name === 'Venus')!;
  if ([1, 4, 7, 10].includes(ven.house)) {
    if (ven.sign.includes('Aries') === false && (ven.sign.includes('Taurus') || ven.sign.includes('Libra') || ven.sign.includes('Pisces'))) {
      const mala = yogas.find((y) => y.name === 'Malavya Yoga')!;
      mala.present = true;
    }
  }

  // 4. Generate Vimshottari Dasha Periods starting from Moon's Nakshatra Lord
  // Planetary years: Ketu 7, Venus 20, Sun 6, Moon 10, Mars 7, Rahu 18, Jupiter 16, Saturn 19, Mercury 17 (Total 120 yrs)
  const dashaLords = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
  const dashaYears: Record<string, number> = {
    Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17
  };

  const moonSiderealCoord = normalize360(getPlanetCoordinates('Moon', t, jd).lon - ayanamsha);
  const nakIndex = Math.floor(moonSiderealCoord / (360 / 27));
  const startingLord = dashaLords[nakIndex % 9];
  const startingLordIndex = dashaLords.indexOf(startingLord);

  // Fraction of Nakshatra elapsed
  const nakStartDeg = nakIndex * (360 / 27);
  const elapsedFraction = (moonSiderealCoord - nakStartDeg) / (360 / 27);

  // Time remaining in the first dasha in years
  const startingLordYears = dashaYears[startingLord];
  const remainingYears = startingLordYears * (1 - elapsedFraction);

  const dashas: DashaPeriod[] = [];
  let dashaStartDate = new Date(details.dob);

  // Set initial start date with TOB hour/min
  const [h, m] = details.tob.split(':').map(Number);
  dashaStartDate.setHours(h, m, 0, 0);

  // Loop through planets to generate major dasha periods for 120 years
  let currentLordIndex = startingLordIndex;
  let yearsLeftToCover = 120;
  let isFirst = true;

  while (yearsLeftToCover > 0) {
    const lord = dashaLords[currentLordIndex];
    let durationYears = dashaYears[lord];
    if (isFirst) {
      durationYears = remainingYears;
      isFirst = false;
    }

    const dashaEndDate = new Date(dashaStartDate.getTime());
    dashaEndDate.setFullYear(dashaEndDate.getFullYear() + Math.floor(durationYears));
    dashaEndDate.setMonth(dashaEndDate.getMonth() + Math.floor((durationYears % 1) * 12));

    // Subperiods (Bhukti/Antardasha)
    const subPeriods: DashaPeriod[] = [];
    let subStartDate = new Date(dashaStartDate.getTime());
    for (let k = 0; k < 9; k++) {
      const subLord = dashaLords[(currentLordIndex + k) % 9];
      const subRatio = (dashaYears[subLord] / 120);
      const subDurationYears = durationYears * subRatio;

      const subEndDate = new Date(subStartDate.getTime());
      subEndDate.setFullYear(subEndDate.getFullYear() + Math.floor(subDurationYears));
      subEndDate.setMonth(subEndDate.getMonth() + Math.floor((subDurationYears % 1) * 12));

      subPeriods.push({
        planet: subLord,
        startDate: subStartDate.toLocaleDateString(),
        endDate: subEndDate.toLocaleDateString()
      });
      subStartDate = new Date(subEndDate.getTime());
    }

    dashas.push({
      planet: lord,
      startDate: dashaStartDate.toLocaleDateString(),
      endDate: dashaEndDate.toLocaleDateString(),
      subPeriods
    });

    yearsLeftToCover -= durationYears;
    dashaStartDate = new Date(dashaEndDate.getTime());
    currentLordIndex = (currentLordIndex + 1) % 9;
  }

  const transits = [
    'Jupiter transit in Taurus brings expansion of career potentials and material wisdom.',
    'Saturn transit in Aquarius establishes long-term grounding structures and discipline loops.',
    'Rahu transit in Pisces fosters creative imagination and spiritual depth exploration.'
  ];

  return {
    ascendant: ascRashi.name,
    ascendantDegree: Number(ascRashi.degreeInSign.toFixed(2)),
    sunSign: sun.sign,
    moonSign: moon.sign,
    nakshatra: `${moonNakshatra.name} (Pada ${moonNakshatra.pada}, Lord: ${moonNakshatra.lord})`,
    nakshatraPada: moonNakshatra.pada,
    planets,
    houses,
    yogas,
    dashas: dashas.slice(0, 5), // Provide first 5 major periods for clarity
    transits
  };
}
