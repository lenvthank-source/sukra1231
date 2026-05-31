import React, { useState, useRef, useEffect } from 'react';
import { Message, BirthDetails, GenderType } from '../types';
import { Send, MapPin, Calendar, Clock, Sparkles, User, RefreshCw, AlertCircle, Compass, AlignLeft } from 'lucide-react';

interface ChatInterfaceProps {
  messages: Message[];
  birthDetails: Partial<BirthDetails>;
  onSendMessage: (text: string) => void;
  onQuickOnboarding: (field: keyof BirthDetails, value: string, userText: string) => void;
  onUpdateBirthDetails: (details: Partial<BirthDetails>) => void;
  isLoading: boolean;
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
  chartCalculated?: boolean;
}

export default function ChatInterface({
  messages,
  birthDetails,
  onSendMessage,
  onQuickOnboarding,
  onUpdateBirthDetails,
  isLoading,
  onToggleSidebar,
  sidebarOpen,
  chartCalculated
}: ChatInterfaceProps) {
  const [inputText, setInputText] = useState('');
  
  // Local state for auto-completing birthplace
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeSuggestions, setPlaceSuggestions] = useState<any[]>([]);
  const [isSearchingPlace, setIsSearchingPlace] = useState(false);
  const [showPlaceDropdown, setShowPlaceDropdown] = useState(false);

  // Custom states for Birth Time select lists
  const [selHour, setSelHour] = useState('12');
  const [selMinute, setSelMinute] = useState('00');
  const [selDate, setSelDate] = useState('');

  // References
  const chatEndRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<any>(null);

  // Auto scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Handle Birthplace Autocomplete Input typing
  const handlePlaceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPlaceQuery(val);
    
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (val.trim().length < 3) {
      setPlaceSuggestions([]);
      setShowPlaceDropdown(false);
      return;
    }

    setIsSearchingPlace(true);
    setShowPlaceDropdown(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const response = await fetch('/api/geocode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ place: val })
        });
        if (response.ok) {
          const result = await response.json();
          setPlaceSuggestions([result]);
        }
      } catch (err) {
        console.error('Failed to suggestion geocode', err);
      } finally {
        setIsSearchingPlace(false);
      }
    }, 600);
  };

  const selectPlace = (sug: any) => {
    onQuickOnboarding('place', sug.place, `Born in: ${sug.place}`);
    // Geocode will run in background in App.tsx
    setPlaceQuery('');
    setPlaceSuggestions([]);
    setShowPlaceDropdown(false);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    onSendMessage(inputText);
    setInputText('');
  };

  // Convert simple markdown markers safely to React Virtual Nodes in light theme
  const renderMessageContent = (content: string, isUser: boolean) => {
    const paragraphs = content.split('\n\n');
    return paragraphs.map((p, idx) => {
      // Process bold fields
      const parts = p.split(/(\*\*.*?\*\*)/g);
      const parsedText = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong 
              key={pIdx} 
              className={`font-semibold ${isUser ? 'text-white' : 'text-slate-900'}`}
            >
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });

      // Check if bullet point list
      if (p.trim().startsWith('* ') || p.trim().startsWith('- ')) {
        const lines = p.split('\n');
        return (
          <ul 
            key={idx} 
            className={`list-disc pl-5 my-2.5 space-y-1.5 font-sans text-[14px] ${
              isUser ? 'text-white' : 'text-slate-900 font-medium'
            }`}
          >
            {lines.map((l, lIdx) => (
              <li key={lIdx}>
                {l.replace(/^[-*]\s+/, '').split(/(\*\*.*?\*\*)/g).map((subPart, sIdx) => {
                  if (subPart.startsWith('**') && subPart.endsWith('**')) {
                    return (
                      <strong 
                        key={sIdx} 
                        className={`font-extrabold ${isUser ? 'text-white' : 'text-slate-950'}`}
                      >
                        {subPart.slice(2, -2)}
                      </strong>
                    );
                  }
                  return subPart;
                })}
              </li>
            ))}
          </ul>
        );
      }

      return (
        <p 
          key={idx} 
          className={`leading-relaxed mb-3 text-[14px] font-sans ${
            isUser ? 'text-white' : 'text-slate-900 font-medium'
          }`}
        >
          {parsedText}
        </p>
      );
    });
  };

  // Check which details are currently missing
  const nextMissingField = (): 'dob' | 'tob' | 'place' | 'gender' | null => {
    if (!birthDetails.dob) return 'dob';
    if (!birthDetails.tob) return 'tob';
    if (!birthDetails.place) return 'place';
    if (!birthDetails.gender) return 'gender';
    return null;
  };

  const missing = nextMissingField();

  // Pre-generate hours and minutes array for select element
  const hoursArray = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutesArray = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-900 flex-1 relative overflow-hidden font-sans antialiased">
      
      {/* Top Bar Navigation Header */}
      <header className="flex justify-between items-center px-6 py-4 border-b border-slate-350 bg-white z-20 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center shadow-sm">
            <Compass className="w-5 h-5 text-indigo-600 animate-spin-slow" />
          </div>
          <div>
            <h1 className="font-sans font-bold text-base text-slate-900 tracking-tight flex items-center gap-2">
              Jyotishi AI Astrologer
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </h1>
            <p className="text-[10px] text-indigo-600 uppercase tracking-[0.2em] font-semibold">
              {chartCalculated ? 'Astrology Consultation Active' : 'Establishing Birth Coordinates'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className={`flex items-center justify-center px-4 py-2 rounded-xl transition-all border-2 text-xs font-bold shadow-md ${
                sidebarOpen 
                  ? 'bg-indigo-50 border-indigo-550 text-indigo-700 hover:bg-indigo-100/70' 
                  : 'bg-white border-slate-350 text-slate-700 hover:bg-slate-50'
              }`}
              id="mobile-sidebar-toggle"
              title="View Birth Chart"
            >
              <Compass className="w-4 h-4 mr-1.5" />
              <span>{sidebarOpen ? 'Hide Kundli' : 'Show Kundli'}</span>
            </button>
          )}
        </div>
      </header>

      {/* Completion Status Pills */}
      <div className="bg-slate-100 border-b-2 border-slate-300 px-6 py-3 flex flex-wrap items-center justify-between gap-3 shadow-inner">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
          <span className="text-xs font-sans text-slate-700 font-bold flex items-center">Profile completeness for Kundli calculation:</span>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] font-mono">
          <span className={`px-3 py-1 rounded-full border-2 flex items-center gap-1 shadow-sm transition-all duration-300 ${
            birthDetails.dob 
              ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold' 
              : 'bg-white border-slate-350 text-slate-500 font-bold hover:border-slate-400'
          }`}>
            <span className={birthDetails.dob ? 'text-emerald-600' : 'text-slate-400'}>●</span> DOB {birthDetails.dob ? '✓' : ''}
          </span>
          <span className={`px-3 py-1 rounded-full border-2 flex items-center gap-1 shadow-sm transition-all duration-300 ${
            birthDetails.tob 
              ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold' 
              : 'bg-white border-slate-350 text-slate-500 font-bold'
          }`}>
            <span className={birthDetails.tob ? 'text-emerald-600' : 'text-slate-400'}>●</span> TOB {birthDetails.tob ? '✓' : ''}
          </span>
          <span className={`px-3 py-1 rounded-full border-2 flex items-center gap-1 shadow-sm transition-all duration-300 ${
            birthDetails.place 
              ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold' 
              : 'bg-white border-slate-350 text-slate-500 font-bold'
          }`}>
            <span className={birthDetails.place ? 'text-emerald-600' : 'text-slate-400'}>●</span> PLACE {birthDetails.place ? '✓' : ''}
          </span>
          <span className={`px-3 py-1 rounded-full border-2 flex items-center gap-1 shadow-sm transition-all duration-300 ${
            birthDetails.gender 
              ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold' 
              : 'bg-white border-slate-350 text-slate-500 font-bold'
          }`}>
            <span className={birthDetails.gender ? 'text-emerald-600' : 'text-slate-400'}>●</span> GENDER {birthDetails.gender ? '✓' : ''}
          </span>
        </div>
      </div>

      {/* Chat Messages Timeline */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 scrollbar-thin bg-slate-50">
        {messages.map((m) => {
          const isUser = m.role === 'user';
          return (
            <div key={m.id} className={`flex gap-4 max-w-2xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
              
              {/* Avatar Icon */}
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border-2 uppercase font-mono text-xs font-bold shadow-md ${
                isUser 
                  ? 'bg-indigo-900 text-white border-indigo-950' 
                  : 'bg-white text-indigo-850 border-slate-400'
              }`}>
                {isUser ? <User className="w-4 h-4 text-white" /> : 'Jy'}
              </div>

              {/* Message Block Card */}
              <div className="flex flex-col gap-1.5">
                <div className={`px-5 py-3.5 rounded-2xl border-2 text-sm shadow-md leading-relaxed ${
                  isUser 
                    ? 'bg-indigo-700 border-indigo-900 text-white rounded-tr-none font-semibold' 
                    : 'bg-white border-slate-300 text-slate-900 rounded-tl-none font-semibold shadow-sm'
                }`}>
                  {renderMessageContent(m.content, isUser)}
                </div>
                <span className={`text-[10px] font-mono text-slate-500 px-1 font-bold ${isUser ? 'text-right' : 'text-left'}`}>
                  {new Date(m.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </span>
              </div>
            </div>
          );
        })}

        {/* Interactive Guided Inputs based on missing field context */}
        {missing && !isLoading && (
          <div className="flex gap-4 max-w-xl mr-auto animate-fade-in text-slate-800">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border bg-white text-indigo-600 border-slate-200 uppercase font-mono text-xs font-bold shadow-sm">
              ✨
            </div>

            <div className="flex-1 bg-white border border-slate-200/80 px-5 py-4 rounded-2xl shadow-md">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-slate-500">Secure Astrological Onboarding</h4>
              </div>

              {/* Date of Birth Input Block */}
              {missing === 'dob' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600 leading-snug">Please select your Date of Birth by clicking the calendar:</p>
                  
                  {/* Clickable container box that automatically opens calendar picker programmatically or natively */}
                  <div 
                    onClick={(e) => {
                      try {
                        const inputEl = document.getElementById('form-input-dob') as HTMLInputElement | null;
                        if (inputEl && typeof inputEl.showPicker === 'function') {
                          inputEl.showPicker();
                        }
                      } catch (err) {
                        console.debug(err);
                      }
                    }}
                    className="relative flex-1 group cursor-pointer"
                  >
                    <Calendar className="w-4 h-4 text-indigo-500 absolute left-3 top-3.5 group-hover:text-indigo-600 transition-colors z-10" />
                    <input
                      type="date"
                      max="2100-12-31"
                      min="1900-01-01"
                      value={selDate}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 hover:border-slate-300 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer font-sans transition-all shadow-inner"
                      onChange={(e) => setSelDate(e.target.value)}
                      id="form-input-dob"
                    />
                  </div>
                  
                  <button
                    onClick={() => {
                      if (selDate) {
                        onQuickOnboarding('dob', selDate, `Birth date chosen: ${selDate}`);
                      }
                    }}
                    disabled={!selDate}
                    className={`w-full mt-2 py-2.5 text-white text-xs font-bold font-sans rounded-xl transition-all flex items-center justify-center gap-1.5 outline-none ${selDate ? 'bg-indigo-700 hover:bg-indigo-600 shadow-md hover:shadow-lg hover:shadow-indigo-600/10 cursor-pointer' : 'bg-indigo-300 cursor-not-allowed'}`}
                    id="confirm-dob-btn"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Confirm Date ({selDate || 'Select...'})</span>
                  </button>
                </div>
              )}

              {/* Time of Birth Custom List Dropdown Select Block */}
              {missing === 'tob' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600 leading-snug">Choose your exact birth time using the hours and minutes lists below:</p>
                  
                  <div className="grid grid-cols-2 gap-3 relative z-10">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase tracking-wider font-mono text-slate-400 font-semibold">Select Hour</label>
                      <select
                        value={selHour}
                        onChange={(e) => setSelHour(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 hover:bg-slate-100/50 cursor-pointer font-sans transition-all shadow-sm"
                        id="form-select-hour"
                      >
                        {hoursArray.map((hour) => {
                          const display = Number(hour) === 0 ? '00 (Midnight)' : Number(hour) === 12 ? '12 (Noon)' : `${hour}`;
                          return (
                            <option key={hour} value={hour}>
                              {display}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase tracking-wider font-mono text-slate-400 font-semibold">Select Minute</label>
                      <select
                        value={selMinute}
                        onChange={(e) => setSelMinute(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 hover:bg-slate-100/50 cursor-pointer font-sans transition-all shadow-sm"
                        id="form-select-minute"
                      >
                        {minutesArray.map((min) => (
                          <option key={min} value={min}>
                            {min}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      const combined = `${selHour}:${selMinute}`;
                      onQuickOnboarding('tob', combined, `Time of birth set: ${combined}`);
                    }}
                    className="w-full mt-2 py-2.5 bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-bold font-sans rounded-xl shadow-md hover:shadow-lg hover:shadow-indigo-600/10 transition-all flex items-center justify-center gap-1.5 outline-none cursor-pointer"
                    id="confirm-custom-time-btn"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Confirm Birth Time ({selHour}:{selMinute})</span>
                  </button>
                </div>
              )}

              {/* Birth Place Input Block */}
              {missing === 'place' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600 leading-snug">Type your Place of Birth (City/Town, State, Country):</p>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                    <input
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 hover:border-slate-300 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans transition-all shadow-inner"
                      placeholder="e.g. Mumbai, Maharashtra, India"
                      value={placeQuery}
                      onChange={handlePlaceChange}
                      id="form-input-place"
                    />
                  </div>

                  {showPlaceDropdown && (
                    <div className="mt-1.5 bg-white rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100 text-xs shadow-xl relative z-30">
                      {isSearchingPlace ? (
                        <div className="p-3 text-slate-400 italic flex items-center gap-2">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                          Locating geographic coordinates...
                        </div>
                      ) : placeSuggestions.length > 0 ? (
                        placeSuggestions.map((sug, idx) => (
                          <button
                            key={idx}
                            onClick={() => selectPlace(sug)}
                            className="w-full p-3 text-left hover:bg-indigo-50 hover:text-indigo-950 transition-all text-slate-700 flex items-start gap-2 group border-none outline-none"
                            id={`place-suggestion-${idx}`}
                          >
                            <MapPin className="w-3.5 h-3.5 text-indigo-500 mt-0.5" />
                            <div>
                              <div className="font-semibold text-slate-800 group-hover:text-indigo-900">{sug.place}</div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">Lat: {sug.lat.toFixed(3)}, Lon: {sug.lon.toFixed(3)} (GMT {sug.timezone >= 0 ? '+' : ''}{sug.timezone})</div>
                            </div>
                          </button>
                        ))
                      ) : placeQuery.length >= 3 ? (
                        <button
                          onClick={() => {
                            const estPlace = placeQuery;
                            selectPlace({
                              place: estPlace,
                              lat: 18.975,
                              lon: 72.825,
                              timezone: 5.5
                            });
                          }}
                          className="w-full p-3 text-left hover:bg-slate-50 transition-all text-slate-400 italic border-none outline-none"
                          id="place-estimate-btn"
                        >
                          Use "{placeQuery}" (Coordinates will be estimated)
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>
              )}

              {/* Gender input */}
              {missing === 'gender' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600 leading-snug">Please select your Gender to complete chart computations:</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Male', 'Female', 'Other'] as GenderType[]).map((gen) => (
                      <button
                        key={gen}
                        onClick={() => {
                          onQuickOnboarding('gender', gen, `Gender: ${gen}`);
                        }}
                        className="bg-slate-50 border-2 border-slate-350 hover:border-indigo-500 text-xs text-center font-bold rounded-xl py-2.5 cursor-pointer text-slate-700 hover:text-indigo-950 hover:bg-indigo-50 transition-all focus:outline-none shadow-md"
                        id={`gender-select-${gen}`}
                      >
                        {gen === 'Male' && 'Male'}
                        {gen === 'Female' && 'Female'}
                        {gen === 'Other' && 'Other'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Server loading state */}
        {isLoading && (
          <div className="flex gap-4 max-w-xl mr-auto animate-pulse flex-row">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border bg-white text-indigo-600 border-slate-200 font-bold text-xs shadow-sm">
              ✨
            </div>
            <div className="flex-1 bg-white border border-slate-200 px-5 py-4 rounded-2xl text-slate-600 text-sm italic flex items-center gap-3 shadow-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce"></span>
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce delay-150"></span>
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce delay-300"></span>
              </div>
              <span className="text-xs font-sans text-slate-500">Consulting cosmic alignments and ancient sutras...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Message input Tray bottom */}
      <div className="p-6 pt-2 bg-white border-t-2 border-slate-350 z-10 shadow-lg">
        <form onSubmit={handleSend} className="max-w-3xl mx-auto relative flex items-center">
          <input
            type="text"
            className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-500 outline-none rounded-2xl px-6 py-4 pr-16 text-sm transition-all text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 shadow-inner font-sans"
            placeholder={
              missing 
                ? "Click options above to supply birth context..." 
                : "Ask about career path, love compatibility, dasha periods..."
            }
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isLoading}
            id="chat-message-input"
          />
          <button
            type="submit"
            className={`absolute right-3 px-5 py-2.5 text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 ${
              inputText.trim() && !isLoading
                ? 'bg-indigo-750 hover:bg-indigo-600 text-white cursor-pointer hover:shadow-indigo-600/10 text-slate-50 shadow-md'
                : 'bg-slate-100 border border-slate-200 text-slate-450 cursor-not-allowed'
            }`}
            disabled={!inputText.trim() || isLoading}
            id="chat-submit-btn"
          >
            <span>SEND</span>
            <Send className="w-3 h-3" />
          </button>
        </form>
        <p className="text-center text-[10px] text-slate-400 mt-4 uppercase tracking-[0.12em] font-mono">
          Vedic interpretations are probabilistic. Destiny is guided by cosmic energy and personal free will.
        </p>
      </div>
    </div>
  );
}
export {};
