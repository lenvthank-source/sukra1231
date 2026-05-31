export type GenderType = 'Male' | 'Female' | 'Other';

export interface BirthDetails {
  dob: string; // YYYY-MM-DD
  tob: string; // HH:MM (24-hour)
  place: string; // Name of place
  lat: number; // Latitude
  lon: number; // Longitude
  timezone: number; // Offset from UTC in hours (e.g., 5.5)
  gender: GenderType;
}

export interface PlanetPosition {
  name: string;
  sign: string;
  signSymbol: string;
  degree: number;
  normDegree: number;
  house: number;
  retrograde: boolean;
  combust: boolean;
  nakshatra: string;
  pada: number;
  nakshatraLord: string;
  relation?: string;
}

export interface HouseDetails {
  number: number;
  sign: string;
  signSymbol: string;
  lord: string;
  degree: number;
}

export interface DashaPeriod {
  planet: string;
  startDate: string;
  endDate: string;
  subPeriods?: DashaPeriod[];
}

export interface YogaDetails {
  name: string;
  description: string;
  present: boolean;
  significance: string;
}

export interface AstrologyData {
  ascendant: string;
  ascendantDegree: number;
  sunSign: string;
  moonSign: string;
  nakshatra: string;
  nakshatraPada: number;
  planets: PlanetPosition[];
  houses: HouseDetails[];
  yogas: YogaDetails[];
  dashas: DashaPeriod[];
  transits: string[];
  calculationSource?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  // Metadata for custom structured elements in chat (forms, pickers, graphs)
  metadata?: {
    requestFieldName?: 'dob' | 'tob' | 'place' | 'gender';
    birthDetails?: Partial<BirthDetails>;
    chartCalculated?: boolean;
    astrologyData?: AstrologyData;
    error?: string;
  };
}

export interface ChatSession {
  id: string;
  messages: Message[];
  birthDetails: Partial<BirthDetails>;
  astrologyData: AstrologyData | null;
  status: 'collecting' | 'ready' | 'calculating' | 'error';
  currentFieldToCollect: 'dob' | 'tob' | 'place' | 'gender' | null;
}
