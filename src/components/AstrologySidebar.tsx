import React, { useState } from 'react';
import { createPortal } from 'react-dom';
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

        <div className="mt-5">
           <button
             onClick={() => setShowPopout(true)}
             className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
           >
             <Eye className="w-5 h-5" />
             View Full Ascendant Report
           </button>
        </div>
      </div>


                  {/* Custom Pop-out High Contrast Full Screen Report */}
            {showPopout && createPortal(
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
                      <div className="flex-[3] bg-white p-4 mx-auto w-full md:max-w-md flex flex-col items-center">
                        <h4 className="font-bold font-serif text-lg mb-4 text-slate-800 text-left w-full max-w-[300px]">Lagna Chart</h4>
                        <div className="relative w-full max-w-[300px] aspect-square mx-auto">
                          <svg viewBox="0 0 300 300" className="w-full h-full fill-none font-sans font-bold">
                            <rect x="0" y="0" width="300" height="300" className="stroke-orange-500" strokeWidth="2" />
                            <line x1="0" y1="0" x2="300" y2="300" className="stroke-orange-500" strokeWidth="1.5" />
                            <line x1="300" y1="0" x2="0" y2="300" className="stroke-orange-500" strokeWidth="1.5" />
                            <polygon points="150,0 300,150 150,300 0,150" className="stroke-orange-500" strokeWidth="1.5" />
                            
                            {houseCompartments.map((comp) => {
                              const rashiNum = getHouseRashiNum(comp.num);
                              const occupants = getPlanetsInHouse(comp.num);
                              
                              return (
                                <g key={`pop-h-${comp.num}`}>
                                  <text x={comp.x} y={comp.y - 12} textAnchor="middle" fontSize="12" stroke="none" className="fill-orange-600 font-serif">
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
                                        stroke="none"
                                        className="font-sans tracking-tight font-bold"
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
                    </div>

                    {/* Tables Row */}
                    <div className="flex flex-col gap-6 mt-4 pb-8">
                      
                      {/* Planetary Table */}
                      <div className="bg-white border border-slate-300 shadow-sm overflow-x-auto pb-2 scrollbar-thin">
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
                      <div className="bg-white border border-slate-300 shadow-sm overflow-hidden flex flex-col min-w-[240px]">
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
              </div>,
              document.body
            )}

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
