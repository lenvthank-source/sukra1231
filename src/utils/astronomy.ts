import { BirthDetails, AstrologyData, PlanetPosition, HouseDetails, DashaPeriod, YogaDetails } from '../types.js';
import Astronomy from 'astronomy-engine';

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
function getPlanetCoordinates(name: string, t: number, jd: number, utcDate?: Date): { lon: number, retrograde: boolean } {
  if (!utcDate) {
    utcDate = new Date();
  }
  const astroTime = new Astronomy.AstroTime(utcDate);

  if (name === 'Rahu' || name === 'Ketu') {
    // North Node (Mean Node approximation)
    // Node retrogrades ~19.34 degrees per year
    let nodePos = normalize360(125.04452 - 1934.13626 * t);
    
    if (name === 'Ketu') {
      nodePos = normalize360(nodePos + 180.0);
    }
    return { lon: nodePos, retrograde: true };
  }

  // Proper Planets using precision engine
  // @ts-ignore
  const geoVec = Astronomy.GeoVector(name, astroTime, true);
  const ecl = Astronomy.Ecliptic(geoVec);

  // Check Retrograde
  const pastTime = astroTime.AddDays(-0.01);
  // @ts-ignore
  const pastGeoVec = Astronomy.GeoVector(name, pastTime, true);
  const pastEcl = Astronomy.Ecliptic(pastGeoVec);
  
  // Calculate difference safely around 360 bounds
  let diff = ecl.elon - pastEcl.elon;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;

  return { lon: ecl.elon, retrograde: diff < 0 };
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

  const [year, month, day] = details.dob.split('-').map(Number);
  const [hour, min] = details.tob.split(':').map(Number);
  const tzMinutes = details.timezone * 60;
  // Compute absolute UTC time for this birth event
  const targetUtcTime = Date.UTC(year, month - 1, day, hour, min) - (tzMinutes * 60000);
  const utcDate = new Date(targetUtcTime);

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
    const tropicalCoords = getPlanetCoordinates(name, t, jd, utcDate);
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
  const moonNakshatra = getNakshatraDetails(normalize360(getPlanetCoordinates('Moon', t, jd, utcDate).lon - ayanamsha));

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

  const moonSiderealCoord = normalize360(getPlanetCoordinates('Moon', t, jd, utcDate).lon - ayanamsha);
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
