import React, { useState } from 'react';
import { AstrologyData, BirthDetails, PlanetPosition } from '../types';
import { Compass, Sparkles, Table, Calendar, Eye, Moon, Sun, ArrowUp, RefreshCw, X } from 'lucide-react';

interface SidebarProps {
  data: AstrologyData | null;
  details: Partial<BirthDetails>;
  onReset: () => void;
  className?: string;
  onCloseMobile?: () => void;
}

export default function AstrologySidebar({ data, details, onReset, className = '', onCloseMobile }: SidebarProps) {
  const [activeTab, setActiveTab] = useState<'chart' | 'planets' | 'dashas' | 'yogas'>('chart');
  const [showPopout, setShowPopout] = useState(false);

  // Format date readable
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatLongitude = (degree?: number) => {
    if (degree === undefined) return '';
    const signDeg = degree % 30;
    const d = Math.floor(signDeg);
    const m = Math.floor((signDeg - d) * 60);
    const s = Math.floor((signDeg - d - m / 60) * 3600);
    return `${d.toString().padStart(2, '0')}-${m.toString().padStart(2, '0')}-${s.toString().padStart(2, '0')}`;
  };

  if (!data) {
    return (
      <div className={`flex flex-col items-center justify-center h-full p-8 text-center bg-white md:border-l border-slate-300 text-slate-600 relative overflow-y-auto ${className} shadow-inner`}>
        {onCloseMobile && (
          <button 
            onClick={onCloseMobile} 
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-800 md:hidden border-none bg-transparent"
            id="close-sidebar-btn"
          >
            <X className="w-6 h-6" />
          </button>
        )}
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-full bg-indigo-50 blur-xl animate-pulse"></div>
          <Compass className="w-16 h-16 text-indigo-600 stroke-[1.5] relative animate-spin-slow" />
        </div>
        <h3 className="font-sans text-xl font-bold tracking-tight text-slate-900 mb-2">Vedic Birth Chart</h3>
        <p className="max-w-xs font-sans text-sm text-slate-500 leading-relaxed mb-6">
          Provide your birthday, birth time, and exact birthplace in the chat to draw your custom Kundli and unlock planetary interpretations.
        </p>
        <div className="flex flex-col gap-2 w-full text-left bg-slate-50 p-4 rounded-xl border border-slate-300 shadow-sm font-mono text-xs text-slate-500 divide-y divider-slate-200">
          <div className="flex justify-between pb-2">
            <span>Lat/Lon:</span>
            <span className="text-slate-700 font-semibold font-sans">Awaiting Input...</span>
          </div>
          <div className="flex justify-between py-2">
            <span>Ayanamsha:</span>
            <span className="text-slate-700 font-semibold font-sans">Lahiri (Sidereal)</span>
          </div>
          <div className="flex justify-between pt-2">
            <span>Coordinate System:</span>
            <span className="text-slate-700 font-semibold font-sans">Equal House Cusp</span>
          </div>
        </div>

        {/* Prokerala integration guide block */}
        <div className="mt-5 p-4 bg-indigo-50/50 rounded-xl border border-indigo-200 text-xs text-slate-600 leading-relaxed font-sans shadow-sm text-left w-full relative overflow-hidden">
          <p className="font-bold text-indigo-700 mb-1.5 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
            Vedic API Integration
          </p>
          <span className="text-slate-500 text-[11px] leading-relaxed block mb-2.5">
            This app uses a dual-engine architecture. By default, it runs on our offline celestial math engine. To activate live calculations from the official <strong>Prokerala Astrology API</strong>, add your credentials in AI Studio's <strong>Settings (or Secrets)</strong> menu as:
          </span>
          <div className="space-y-1 font-mono text-[9px] bg-slate-100/80 p-2.5 rounded border border-slate-200 text-indigo-750 select-all font-semibold">
            <div>PROKERALA_CLIENT_ID</div>
            <div>PROKERALA_CLIENT_SECRET</div>
          </div>
        </div>
      </div>
    );
  }

  // Define compartments for the North Indian Kundli chart (D1)
  // Houses are mapped into specific compartment spaces in our 300x300 canvas
  // Houses go counter-clockwise starting from the top-center diamond (House 1)
  const houseCompartments = [
    { num: 1, label: '1st (Lagna)', x: 150, y: 85, align: 'center' },
    { num: 2, label: '2nd', x: 85, y: 50, align: 'center' },
    { num: 3, label: '3rd', x: 50, y: 85, align: 'center' },
    { num: 4, label: '4th', x: 85, y: 150, align: 'center' },
    { num: 5, label: '5th', x: 50, y: 215, align: 'center' },
    { num: 6, label: '6th', x: 85, y: 250, align: 'center' },
    { num: 7, label: '7th', x: 150, y: 215, align: 'center' },
    { num: 8, label: '8th', x: 215, y: 250, align: 'center' },
    { num: 9, label: '9th', x: 250, y: 215, align: 'center' },
    { num: 10, label: '10th', x: 215, y: 150, align: 'center' },
    { num: 11, label: '11th', x: 250, y: 85, align: 'center' },
    { num: 12, label: '12th', x: 215, y: 50, align: 'center' }
  ];

  // Group planets residing in each house
  const getPlanetsInHouse = (houseNum: number): PlanetPosition[] => {
    return data.planets.filter(p => p.house === houseNum);
  };

  // Abbreviations for planet names
  const getPlanetAbbr = (name: string): string => {
    switch (name) {
      case 'Sun': return 'Su';
      case 'Moon': return 'Mo';
      case 'Mercury': return 'Me';
      case 'Venus': return 'Ve';
      case 'Mars': return 'Ma';
      case 'Jupiter': return 'Ju';
      case 'Saturn': return 'Sa';
      case 'Rahu': return 'Ra';
      case 'Ketu': return 'Ke';
      default: return name.slice(0, 2);
    }
  };

  // We assign a Rashi index (number 1-12) to each compartment
  // The 1st house has the Ascendant Rashi index
  // Each subsequent house has (AscendantRashiIndex + HouseNum - 1) % 12
  const getHouseRashiNum = (houseNum: number): number => {
    const ascSign = data.ascendant;
    // Find index of Ascendant sign in RASHIS array
    const ascIndex = RASHIS_LIST.indexOf(ascSign);
    if (ascIndex === -1) return 1;
    return ((ascIndex + houseNum - 1) % 12) + 1;
  };

  return (
    <div className={`flex flex-col h-full bg-white border-l border-slate-300 text-slate-700 relative ${className} shadow-lg`}>
      {/* Mobile close button */}
      {onCloseMobile && (
        <button 
          onClick={onCloseMobile} 
          className="absolute top-4 right-4 p-2 text-slate-500 hover:text-slate-800 md:hidden z-30 border-none bg-transparent"
          id="close-sidebar-mobile-btn"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* Header Profile Summary */}
      <div className="p-5 border-b border-slate-300 bg-slate-50/75">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2 text-indigo-700 text-xs font-bold tracking-wider uppercase font-sans">
            <Compass className="w-4 h-4 animate-spin-slow text-indigo-600" />
            <span>Natal Alignment (Sidereal)</span>
          </div>
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-700 hover:text-indigo-805 bg-white hover:bg-slate-100 rounded-lg transition-all font-sans border border-slate-300 shadow-sm"
            id="update-chart-btn"
          >
            <RefreshCw className="w-3 h-3 text-indigo-600 animate-pulse" />
            <span>Start New Chat</span>
          </button>
        </div>
        <h2 className="font-sans text-base font-extrabold text-slate-800 tracking-tight uppercase truncate">
          {details.gender === 'Male' ? 'Shri' : details.gender === 'Female' ? 'Shrimati' : ''} {details.place?.split(',')[0]} native
        </h2>
        
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2.5 text-xs text-slate-500 font-mono">
          <div><span className="text-slate-400">DOB:</span> <span className="text-slate-800 font-sans font-semibold">{formatDate(details.dob)}</span></div>
          <div><span className="text-slate-400">TOB:</span> <span className="text-slate-800 font-sans font-semibold">{details.tob}</span></div>
          <div className="col-span-2 truncate"><span className="text-slate-400">Place:</span> <span className="text-slate-800 font-sans font-semibold" title={details.place}>{details.place}</span></div>
        </div>

        {data.calculationSource && (
          <div className="mt-3 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-xl text-[10px] font-mono text-indigo-800 flex items-center justify-between shadow-sm">
            <span className="text-slate-500 uppercase tracking-widest text-[9px] font-bold">API Source:</span>
            <span className="text-right truncate max-w-[150px] font-sans font-bold text-indigo-700" title={data.calculationSource}>
              {data.calculationSource}
            </span>
          </div>
        )}

        {/* Ascendant, Moon & Sun badges */}
        <div className="grid grid-cols-3 gap-2.5 mt-4 text-center">
          <div className="bg-white p-2.5 rounded-xl border border-slate-350 shadow-md">
            <div className="text-[10px] text-slate-500 font-mono uppercase font-bold">Ascendant</div>
            <div className="text-xs font-extrabold text-indigo-800 font-sans truncate mt-0.5" style={{ color: '#312e81' }}>{data.ascendant.split(' ')[0]}</div>
            <div className="text-[10px] font-mono text-slate-600 mt-0.5 font-bold">{data.ascendantDegree}°</div>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-slate-350 shadow-md">
            <div className="text-[10px] text-slate-500 font-mono uppercase font-bold flex items-center justify-center gap-0.5">
              <Moon className="w-2.5 h-2.5 text-indigo-600" />
              <span>Moon Sign</span>
            </div>
            <div className="text-xs font-extrabold text-indigo-700 font-sans truncate mt-0.5">{data.moonSign.split(' ')[0]}</div>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-slate-350 shadow-md">
            <div className="text-[10px] text-slate-500 font-mono uppercase font-bold flex items-center justify-center gap-0.5">
              <Sun className="w-2.5 h-2.5 text-rose-500" />
              <span>Sun Sign</span>
            </div>
            <div className="text-xs font-extrabold text-amber-800 font-sans truncate mt-0.5">{data.sunSign.split(' ')[0]}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-50 border-b border-slate-200 text-xs font-sans tracking-wide">
        <button
          onClick={() => setActiveTab('chart')}
          className={`flex-1 py-3 text-center font-extrabold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'chart'
              ? 'border-indigo-600 text-indigo-900 bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-200/50'
          }`}
          id="tab-chart"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Kundli (D1)</span>
        </button>
        <button
          onClick={() => setActiveTab('planets')}
          className={`flex-1 py-3 text-center font-extrabold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'planets'
              ? 'border-indigo-600 text-indigo-900 bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-200/50'
          }`}
          id="tab-planets"
        >
          <Table className="w-3.5 h-3.5" />
          <span>Positions</span>
        </button>
        <button
          onClick={() => setActiveTab('dashas')}
          className={`flex-1 py-3 text-center font-extrabold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'dashas'
              ? 'border-indigo-600 text-indigo-900 bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-200/50'
          }`}
          id="tab-dashas"
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Dashas</span>
        </button>
        <button
          onClick={() => setActiveTab('yogas')}
          className={`flex-1 py-3 text-center font-extrabold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'yogas'
              ? 'border-indigo-600 text-indigo-900 bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-200/50'
          }`}
          id="tab-yogas"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Yogas</span>
        </button>
      </div>

      {/* Main Tab Content Panel */}
      <div className="flex-1 overflow-y-auto p-5 scrollbar-thin bg-slate-100">
        {activeTab === 'chart' && (
          <div className="flex flex-col items-center h-full">
            
            {/* North Indian style Kundli SVG chart with Light High-Contrast Colors */}
            <div className="relative w-full max-w-[280px] aspect-square bg-white rounded-2xl border-2 border-indigo-950 p-2 shadow-lg group">
              {/* Eye Button Over Chart */}
              <button
                onClick={() => setShowPopout(true)}
                className="absolute top-3 right-3 bg-white/95 border-2 border-indigo-950 hover:bg-slate-100 text-indigo-950 p-1.5 rounded-xl transition-all shadow-md cursor-pointer z-10 flex items-center justify-center gap-1 hover:scale-105 active:scale-95"
                title="Full Screen Classic Report"
                id="pop-out-chart-btn"
              >
                <Eye className="w-4 h-4 text-indigo-700 animate-pulse" />
                <span className="text-[10px] font-bold font-sans pr-0.5 whitespace-nowrap">Full Report</span>
              </button>

              <svg viewBox="0 0 300 300" className="w-full h-full stroke-indigo-950 stroke-[1.8] fill-none font-sans font-bold">
                {/* Diagonals */}
                <line x1="0" y1="0" x2="300" y2="300" style={{ stroke: '#0f172a', strokeWidth: '1.8px' }} />
                <line x1="300" y1="0" x2="0" y2="300" style={{ stroke: '#0f172a', strokeWidth: '1.8px' }} />
                
                {/* Inner Diamond */}
                <polygon points="150,0 300,150 150,300 0,150" style={{ stroke: '#0f172a', strokeWidth: '1.8px' }} />
                
                {/* Outer frame */}
                <rect x="0" y="0" width="300" height="300" className="stroke-slate-900" style={{ stroke: '#0f172a', strokeWidth: '2.5px' }} />

                {/* Draw House Numbers and Planet Lists */}
                {houseCompartments.map((comp) => {
                  const occupants = getPlanetsInHouse(comp.num);
                  const rashiNum = getHouseRashiNum(comp.num);
                  
                  return (
                    <g key={comp.num}>
                      {/* Compact Compartment Label H1-H12 */}
                      <text 
                        x={comp.x} 
                        y={comp.y - 12} 
                        textAnchor="middle" 
                        fontSize="9" 
                        className="fill-slate-500 font-semibold font-mono"
                      >
                        H{comp.num}
                      </text>

                      {/* Rashi Number in high readability amber/slate style */}
                      <text 
                        x={comp.x} 
                        y={comp.y} 
                        textAnchor="middle" 
                        fontSize="11" 
                        className="fill-amber-700 font-extrabold"
                      >
                        {rashiNum}
                      </text>

                      {/* Individual Planet Abbreviations placed inside */}
                      {occupants.length > 0 && (
                        <g>
                          {occupants.map((pl, idx) => {
                            const offsetX = occupants.length === 1 ? 0 : (idx - (occupants.length - 1) / 2) * 22;
                            return (
                              <text
                                key={pl.name}
                                x={comp.x + offsetX}
                                y={comp.y + 16}
                                textAnchor="middle"
                                fontSize="10"
                                className="font-extrabold tracking-tighter"
                                style={{
                                  fontWeight: '900',
                                  fill: pl.name === 'Sun' ? '#b45309' :
                                        pl.name === 'Moon' ? '#1e40af' :
                                        pl.name === 'Jupiter' ? '#065f46' :
                                        ['Rahu', 'Ketu'].includes(pl.name) ? '#701a75' : '#0f172a'
                                }}
                              >
                                {getPlanetAbbr(pl.name)}{pl.retrograde ? 'ᴿ' : ''}
                              </text>
                            );
                          })}
                        </g>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
            
            <div className="mt-4 text-center text-xs text-slate-500 italic font-sans leading-snug">
              * The integers represent Rashi indices (e.g. 1=Mesha, 10=Makara). H1 is the Lagna (top center). Click <span className="font-semibold text-indigo-700">Zoom</span> to pop out.
            </div>

            {/* Custom Pop-out High Contrast Full Screen Report */}
            {showPopout && (
              <div 
                className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-slate-900/60 backdrop-blur-sm animate-fade-in text-slate-800"
                onClick={() => setShowPopout(false)}
                id="chart-popout-overlay"
              >
                <div 
                  className="relative w-full max-w-[1000px] h-full max-h-[90vh] bg-[#fdfcf8] border-4 border-slate-300 rounded overflow-y-auto shadow-2xl flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="sticky top-0 bg-[#fdfcf8] border-b border-slate-300 p-4 flex items-center justify-between z-20 shadow-sm">
                    <h3 className="font-serif font-bold text-xl text-slate-900 tracking-wide">
                      Comprehensive Vedic Report
                    </h3>
                    <button
                      onClick={() => setShowPopout(false)}
                      className="px-4 py-1.5 text-sm bg-slate-200 hover:bg-slate-300 border border-slate-400 font-bold text-slate-800 rounded cursor-pointer transition-all tracking-wide shadow-sm"
                      id="close-popout-btn"
                    >
                      Close ✕
                    </button>
                  </div>

                  <div className="p-4 md:p-6 flex flex-col gap-8">
                    {/* Charts Row */}
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="flex-1 bg-white p-4 justify-items-center">
                        <h4 className="font-bold font-serif text-lg mb-4 text-slate-800 text-left w-full max-w-[340px]">Lagna Chart</h4>
                        <div className="relative w-full max-w-[340px] aspect-square mx-auto">
                          <svg viewBox="0 0 300 300" className="w-full h-full stroke-orange-500 stroke-[1.5] fill-none font-sans font-bold">
                            <rect x="0" y="0" width="300" height="300" className="stroke-orange-500" strokeWidth="2" />
                            <line x1="0" y1="0" x2="300" y2="300" />
                            <line x1="300" y1="0" x2="0" y2="300" />
                            <polygon points="150,0 300,150 150,300 0,150" strokeWidth="1.5" />
                            
                            {houseCompartments.map((comp) => {
                              const rashiNum = getHouseRashiNum(comp.num);
                              const occupants = getPlanetsInHouse(comp.num);
                              
                              return (
                                <g key={`pop-h-${comp.num}`}>
                                  <text x={comp.x} y={comp.y - 12} textAnchor="middle" fontSize="12" className="fill-orange-600 font-serif">
                                    {rashiNum}
                                  </text>
                                  <g>
                                    {occupants.map((pl, i) => {
                                      // Arrange planets in a small grid if there are many
                                      let ox = 0;
                                      let oy = 10;
                                      if (occupants.length === 2) {
                                        ox = i === 0 ? -12 : 12;
                                      } else if (occupants.length === 3) {
                                        ox = i === 0 ? -14 : i === 1 ? 14 : 0;
                                        oy += i === 2 ? 16 : 0;
                                      } else if (occupants.length > 3) {
                                        ox = (i % 2 === 0 ? -14 : 14);
                                        oy += Math.floor(i / 2) * 16;
                                      }
                                      
                                      return (
                                      <text 
                                        key={pl.name}
                                        x={comp.x + ox} 
                                        y={comp.y + oy}
                                        textAnchor="middle" 
                                        fontSize="13" 
                                        className="font-sans tracking-tight font-black"
                                        style={{ 
                                          fill: pl.name === 'Sun' ? '#ef4444' :
                                                pl.name === 'Moon' ? '#8b5cf6' :
                                                pl.name === 'Jupiter' ? '#c026d3' :
                                                pl.name === 'Venus' ? '#22c55e' :
                                                pl.name === 'Mars' ? '#16a34a' :
                                                pl.name === 'Mercury' ? '#3b82f6' :
                                                pl.name === 'Saturn' ? '#ef4444' :
                                                ['Rahu', 'Ketu'].includes(pl.name) ? '#d97706' : '#1e293b'
                                        }}
                                      >
                                        {getPlanetAbbr(pl.name)}
                                        {pl.retrograde ? <tspan dy="-6" fontSize="9">ᴿ</tspan> : ''}
                                        {pl.combust ? <tspan dy="-6" fontSize="9">ᶜ</tspan> : ''}
                                        {pl.retrograde || pl.combust ? <tspan dy="6"></tspan> : ''}
                                      </text>
                                      );
                                    })}
                                  </g>
                                </g>
                              );
                            })}
                          </svg>
                        </div>
                      </div>

                      <div className="flex-1 bg-white p-4 flex flex-col justify-items-center opacity-70 grayscale sepia-[.3]">
                         <h4 className="font-bold font-serif text-lg mb-4 text-slate-800 text-left w-full max-w-[340px]">Navamsa Chart</h4>
                         <div className="relative w-full max-w-[340px] aspect-square mx-auto flex items-center justify-center border border-slate-300">
                           <p className="text-center font-serif text-slate-500 font-bold px-8">(D9 Navamsa Chart under development. Please rely on Lagna positions for now.)</p>
                         </div>
                      </div>
                    </div>

                    {/* Tables Row */}
                    <div className="flex flex-col lg:flex-row gap-6 mt-4">
                      
                      {/* Planetary Table */}
                      <div className="flex-[5] bg-white border border-slate-300 shadow-sm overflow-x-auto">
                        <table className="w-full text-left font-sans whitespace-nowrap">
                          <thead className="bg-[#fef3c7] border-b border-slate-300 text-amber-900 border-t border-t-amber-100">
                            <tr className="text-[13px]">
                              <th className="p-3 font-bold border-r border-slate-300">Planets</th>
                              <th className="p-3 font-bold border-r border-slate-300 text-center">C</th>
                              <th className="p-3 font-bold border-r border-slate-300 text-center">R</th>
                              <th className="p-3 font-bold border-r border-slate-300">Rashi</th>
                              <th className="p-3 font-bold border-r border-slate-300">Longitude</th>
                              <th className="p-3 font-bold border-r border-slate-300">Nakshatra</th>
                              <th className="p-3 font-bold border-r border-slate-300 text-center">Pada</th>
                              <th className="p-3 font-bold">Relation</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 text-slate-800 text-sm">
                            <tr className="hover:bg-slate-50">
                              <td className="p-3 border-r border-slate-200 font-medium">Asc</td>
                              <td className="p-3 border-r border-slate-200 text-center"></td>
                              <td className="p-3 border-r border-slate-200 text-center"></td>
                              <td className="p-3 border-r border-slate-200">{data.ascendant.split(' ')[0]}</td>
                              <td className="p-3 border-r border-slate-200 font-mono tracking-tighter text-[13px]">{formatLongitude(data.ascendantDegree)}</td>
                              <td className="p-3 border-r border-slate-200">{data.nakshatra}</td>
                              <td className="p-3 border-r border-slate-200 text-center">{data.nakshatraPada}</td>
                              <td className="p-3"></td>
                            </tr>
                            {data.planets.map((p) => (
                              <tr key={p.name} className="hover:bg-slate-50">
                                <td className="p-3 border-r border-slate-200 font-medium">
                                  {p.name === 'Sun' || p.name === 'Moon' || p.name === 'Mars' ? p.name : 
                                   p.name === 'Mercury' ? 'Merc' : 
                                   p.name === 'Jupiter' ? 'Jupt' :
                                   p.name === 'Venus' ? 'Venu' :
                                   p.name === 'Saturn' ? 'Satn' : p.name}
                                </td>
                                <td className="p-3 border-r border-slate-200 text-center font-bold text-amber-800">
                                  {p.combust ? 'C' : ''}
                                </td>
                                <td className="p-3 border-r border-slate-200 text-center font-bold text-indigo-800 opacity-80">
                                  {p.retrograde ? 'R' : 'D'} 
                                </td>
                                <td className="p-3 border-r border-slate-200">{p.sign.split(' ')[0]}</td>
                                <td className="p-3 border-r border-slate-200 font-mono tracking-tighter text-[13px]">{formatLongitude(p.normDegree)}</td>
                                <td className="p-3 border-r border-slate-200">{p.nakshatra}</td>
                                <td className="p-3 border-r border-slate-200 text-center">{p.pada}</td>
                                <td className="p-3">{p.relation || 'Neutral'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Dashas Table */}
                      <div className="flex-[2] bg-white border border-slate-300 shadow-sm overflow-hidden flex flex-col min-w-[240px]">
                        <div className="bg-[#fef3c7] text-amber-900 border-b border-slate-300 p-3 font-semibold text-[15px]">
                          Vimshottari Dasha
                        </div>
                        <div className="p-4 border-b border-slate-200 text-center text-sm flex-1 bg-slate-50">
                          Balance Of Dasha : <br/>
                          <span className="text-slate-700 font-mono uppercase font-bold mt-1 inline-block">
                            {data.dashas[0]?.planet.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 overflow-auto max-h-[460px]">
                          <table className="w-full text-left font-sans text-[13px]">
                            <tbody className="divide-y divide-slate-100 text-slate-800">
                              {data.dashas.map((dasha) => (
                                <tr key={dasha.planet} className="hover:bg-slate-50 transition-colors">
                                  <td className="p-3 w-1/2 font-medium border-r border-slate-100">
                                    {getPlanetAbbr(dasha.planet)}
                                  </td>
                                  <td className="p-3 w-1/2 font-mono text-xs opacity-90 text-right">
                                    {new Date(dasha.endDate.split('/').reverse().join('-')).toLocaleDateString('en-GB')}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* General Nakshatra details card */}
            <div className="w-full mt-4 bg-white p-4 rounded-xl border border-slate-300 shadow-md">
              <h4 className="text-xs font-bold text-slate-650 font-sans uppercase mb-2 tracking-wide">Nakshatra & Pada</h4>
              <div className="flex justify-between items-center bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-250 font-sans text-xs">
                <span className="text-indigo-900 font-extrabold">{data.nakshatra}</span>
                <span className="text-slate-600 font-mono font-bold">Pada {data.nakshatraPada}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'planets' && (
          <div className="flex flex-col gap-4">
            <div className="-mx-5 px-5 overflow-x-auto scrollbar-thin">
              <table className="w-full text-left text-xs font-sans tracking-wide">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold font-mono">
                    <th className="pb-2">Planet</th>
                    <th className="pb-2 text-center">House</th>
                    <th className="pb-2">Vedic Rashi</th>
                    <th className="pb-2 text-right">Degree</th>
                    <th className="pb-2 pl-2">Nakshatra</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {data.planets.map((p) => (
                    <tr key={p.name} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 font-bold text-slate-900 flex items-center gap-1.5">
                        {p.name === 'Sun' && <Sun className="w-3.5 h-3.5 text-amber-600" />}
                        {p.name === 'Moon' && <Moon className="w-3.5 h-3.5 text-indigo-600" />}
                        {p.name !== 'Sun' && p.name !== 'Moon' && <span className="w-4 h-4 inline-block text-center text-[10px] font-mono font-bold leading-3.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">{getPlanetAbbr(p.name)}</span>}
                        <span>{p.name}</span>
                        {p.retrograde && <span className="text-[9px] font-mono font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded shadow-sm">R</span>}
                      </td>
                      <td className="py-2.5 text-center font-bold text-indigo-700 font-mono bg-indigo-50/10">
                        {p.house}
                      </td>
                      <td className="py-2.5 text-slate-800 font-medium">
                        <span className="inline-block mr-1 text-slate-600 font-sans">{p.signSymbol}</span>
                        <span>{p.sign.split(' ')[0]}</span>
                      </td>
                      <td className="py-2.5 text-right font-mono text-slate-500 font-semibold">
                        {p.degree}°
                      </td>
                      <td className="py-2.5 pl-2 truncate text-slate-600 text-[11px] font-mono max-w-[90px]" title={`${p.nakshatra} (Lord: ${p.nakshatraLord})`}>
                        {p.nakshatra}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* House Cusps placement list */}
            <div className="bg-white p-4 rounded-xl border border-slate-350 shadow-md">
              <h4 className="text-xs font-bold text-slate-600 font-sans uppercase mb-3 tracking-wide">House Cusps Placement</h4>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                {data.houses.map((house) => (
                  <div key={house.number} className="flex justify-between p-1.5 border-b border-slate-200">
                    <span className="text-slate-550 font-bold">Cusp {house.number}:</span>
                    <span className="text-slate-900 font-sans font-bold">
                      {house.signSymbol} {house.sign.split(' ')[0]} ({house.degree.toFixed(0)}°)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'dashas' && (
          <div className="flex flex-col gap-4">
            <h4 className="text-xs font-bold text-slate-500 font-sans uppercase tracking-wide">Vimshottari Mahadasha Timeline</h4>
            <div className="relative border-l-2 border-indigo-100 pl-4 ml-2 flex flex-col gap-5 mt-2">
              {data.dashas.map((d, index) => {
                const now = new Date();
                const startDate = new Date(d.startDate);
                const endDate = new Date(d.endDate);
                const isActive = now >= startDate && now <= endDate;

                return (
                  <div key={d.planet} className="relative group">
                    {/* Circle timeline Node */}
                    <div className={`absolute -left-[23px] top-1 w-2.5 h-2.5 rounded-full border-2 transition-all ${
                      isActive 
                        ? 'bg-indigo-600 border-indigo-600 ring-4 ring-indigo-100 scale-125' 
                        : 'bg-white border-indigo-200 group-hover:border-indigo-400'
                    }`} />
                    
                    <div className={`p-3 rounded-xl border transition-all ${
                      isActive 
                        ? 'bg-indigo-50 border-indigo-300 shadow-md text-slate-800' 
                        : 'bg-white border-slate-300 hover:border-slate-400 shadow-sm text-slate-700'
                    }`}>
                      <div className="flex justify-between items-center">
                        <span className="font-sans font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                          {d.planet} Mahadasha
                          {isActive && <span className="text-[9px] font-extrabold text-indigo-750 bg-indigo-100 uppercase px-1.5 py-0.5 rounded-lg tracking-wider animate-pulse">Active</span>}
                        </span>
                        <span className="text-[10px] text-indigo-700 font-bold font-mono">
                          {d.planet === 'Ketu' ? '7 yrs' :
                           d.planet === 'Venus' ? '20 yrs' :
                           d.planet === 'Sun' ? '6 yrs' :
                           d.planet === 'Moon' ? '10 yrs' :
                           d.planet === 'Mars' ? '7 yrs' :
                           d.planet === 'Rahu' ? '18 yrs' :
                           d.planet === 'Jupiter' ? '16 yrs' :
                           d.planet === 'Saturn' ? '19 yrs' : '17 yrs'}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-450 mt-1 flex justify-between font-medium">
                        <span>Start: {d.startDate}</span>
                        <span>End: {d.endDate}</span>
                      </div>

                      {/* Display first few sub-dashas (Antardasha) */}
                      {d.subPeriods && (
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap gap-1">
                          <span className="text-[10px] text-slate-400 block w-full mb-1">Antardashas within {d.planet}:</span>
                          {d.subPeriods.slice(0, 4).map((sub) => (
                            <span key={sub.planet} className="text-[10px] bg-slate-50 font-mono text-slate-600 px-1.5 py-0.5 rounded border border-slate-150 max-w-[65px] truncate font-semibold" title={`${sub.planet} till ${sub.endDate}`}>
                              {sub.planet}
                            </span>
                          ))}
                          <span className="text-[10px] text-slate-400 self-center pl-1 font-mono">...</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'yogas' && (
          <div className="flex flex-col gap-4">
            <h4 className="text-xs font-bold text-slate-500 font-sans uppercase tracking-wide">Important Vedic Yogas</h4>
            <div className="flex flex-col gap-3">
              {data.yogas.map((yoga) => (
                <div key={yoga.name} className={`p-4 rounded-xl border transition-all ${
                  yoga.present 
                    ? 'bg-amber-50/90 border-amber-300 shadow-md text-amber-950' 
                    : 'bg-white border-slate-250 text-slate-400 opacity-60'
                }`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-sans font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                      {yoga.name}
                      {yoga.present && <Sparkles className="w-3.5 h-3.5 text-amber-700 fill-amber-500/10" />}
                    </span>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg uppercase tracking-wider border ${
                      yoga.present 
                        ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-inner' 
                        : 'bg-slate-50 text-slate-500 border-slate-200'
                    }`}>
                      {yoga.present ? 'Present' : 'Not Active'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-sans leading-relaxed mt-1.5">
                    {yoga.description}
                  </p>
                  {yoga.present && (
                    <div className="mt-2.5 pt-2.5 border-t border-amber-200/80 text-xs text-amber-900 font-sans leading-snug flex gap-1.5">
                      <span className="font-bold text-amber-950">Effect:</span>
                      <span className="font-medium">{yoga.significance}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Vedic Sign Names matching order for relative indices
const RASHIS_LIST = [
  'Mesha (Aries)',
  'Vrishabha (Taurus)',
  'Mithuna (Gemini)',
  'Karka (Cancer)',
  'Simha (Leo)',
  'Kanya (Virgo)',
  'Tula (Libra)',
  'Vrishchika (Scorpio)',
  'Dhanu (Sagittarius)',
  'Makara (Capricorn)',
  'Kumbha (Aquarius)',
  'Meena (Pisces)'
];
