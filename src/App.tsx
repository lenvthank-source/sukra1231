/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Message, BirthDetails, AstrologyData } from './types.js';
import ChatInterface from './components/ChatInterface.js';
import AstrologySidebar from './components/AstrologySidebar.js';
import { Compass, Sparkles, MessageCircle, AlertTriangle } from 'lucide-react';

const INITIAL_WELCOME_MESSAGE: Message = {
  id: 'welcome-message',
  role: 'assistant',
  content: 'Pranam. I am your Jyotishi AI Astrologer. To prepare your personal Vedic birth chart (Kundli) and provide accurate, planetary alignments and mahadasha interpretations, please share your Date of Birth (DD/MM/YYYY).',
  timestamp: new Date().toISOString(),
  metadata: {
    requestFieldName: 'dob'
  }
};

export default function App() {
  // Session details stored in localStorage
  const [birthDetails, setBirthDetails] = useState<Partial<BirthDetails>>({});
  const [astrologyData, setAstrologyData] = useState<AstrologyData | null>(null);
  const [messages, setMessages] = useState<Message[]>([INITIAL_WELCOME_MESSAGE]);

  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true); // Default open on desktop
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Handle updating birth details
  const updateBirthDetails = (newDetails: Partial<BirthDetails>) => {
    setBirthDetails((prev) => {
      const updated = { ...prev, ...newDetails };
      return updated;
    });
  };

  // Trigger chart calculations when all fields including coordinates are collected
  useEffect(() => {
    const triggerCalculation = async () => {
      if (
        birthDetails.dob &&
        birthDetails.tob &&
        birthDetails.place &&
        birthDetails.gender &&
        birthDetails.lat !== undefined && 
        birthDetails.lon !== undefined &&
        !astrologyData
      ) {
        setIsLoading(true);
        setErrorMessage(null);
        try {
          const response = await fetch('/api/astrology/calculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(birthDetails)
          });
          if (!response.ok) {
            throw new Error('ASTRO_CALCULATION_FAILED');
          }
          const results: AstrologyData = await response.json();
          setAstrologyData(results);

          // Add a system welcome greeting showing the calculated ascendant
          const systemLog: Message = {
            id: `system-calc-${Date.now()}`,
            role: 'assistant',
            content: `✨ **Excellent! I have cast your Natal Vedic Birth Kundli.**

Your Lagna (Ascendant) is placed in **${results.ascendant}** at ${results.ascendantDegree}°. Your Moon is positioned in **${results.moonSign}**, residing under the constellation of **${results.nakshatra}**. 

I am now fully aligned with your cosmic charts. Ask me anything about your career path, relationship compatibility, health, financial forecasts, active dasha periods, or planetary influences!`,
            timestamp: new Date().toISOString(),
            metadata: {
              chartCalculated: true,
              astrologyData: results
            }
          };
          setMessages((prev) => [...prev, systemLog]);
        } catch (err: any) {
          console.error(err);
          setErrorMessage('Failed to compute orbital alignments. Please check your inputs or try again.');
        } finally {
          setIsLoading(false);
        }
      }
    };

    triggerCalculation();
  }, [birthDetails, astrologyData]);

  // Handle quick local onboarding without pinging the backend
  const handleQuickOnboarding = (field: keyof BirthDetails, value: string, userText: string) => {
    // 1. Instantly update birth details and clear old chart if re-running
    const currentUpdates: Partial<BirthDetails> = { [field]: value as any };
    updateBirthDetails(currentUpdates);
    
    if (astrologyData) {
      setAstrologyData(null);
    }

    // 2. Determine instant bot response
    let botResponse = '';
    if (field === 'dob') {
      botResponse = `I have securely noted your Date of Birth: **${value}**. Next, precisely when were you born? Please select your Time of Birth.`;
    } else if (field === 'tob') {
      botResponse = `Time of Birth recorded as **${value}**. Now, what is your Place of Birth? This gives us your exact Earth coordinates.`;
    } else if (field === 'place') {
      botResponse = `Place of Birth set to **${value}**. Finally, please select your Gender for the Vedic chart alignment.`;
    } else if (field === 'gender') {
      botResponse = `Gender recorded. Generating your cosmic chart...`;
    }

    // 3. Inject local messages instantly
    const userMsg: Message = {
      id: `m-${Date.now()}-user`,
      role: 'user',
      content: userText,
      timestamp: new Date().toISOString()
    };
    
    const botMsg: Message = {
      id: `m-${Date.now() + 1}-astrologer`,
      role: 'assistant',
      content: botResponse,
      timestamp: new Date().toISOString()
    };
    
    setMessages((prev) => [...prev, userMsg, botMsg]);

    // If place was updated, try to geocode it in the background silently
    if (field === 'place') {
      fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ place: value })
      })
      .then(r => r.json())
      .then(geo => {
        updateBirthDetails({
          lat: geo.lat,
          lon: geo.lon,
          timezone: geo.timezone
        });
      })
      .catch(err => console.error('Silent geocode error', err));
    }
  };

  // Send message to chatbot endpoint
  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    // 1. Append user message locally
    const userMsg: Message = {
      id: `m-${Date.now()}-user`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // 2. Call backend orchestrator
      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          birthDetails,
          astrologyData
        })
      });

      if (!response.ok) {
        throw new Error('ASTRO_CHAT_MESSAGE_FAILED');
      }

      const responseBody = await response.json();

      // Check if we extracted missing details in onboarding phase
      if (responseBody.updatedDetails) {
        const ext = responseBody.updatedDetails;
        const currentUpdates: Partial<BirthDetails> = {};
        if (ext.dob && ext.dob !== birthDetails.dob) currentUpdates.dob = ext.dob;
        if (ext.tob && ext.tob !== birthDetails.tob) currentUpdates.tob = ext.tob;
        if (ext.place && ext.place !== birthDetails.place) currentUpdates.place = ext.place;
        if (ext.gender && ext.gender !== birthDetails.gender) currentUpdates.gender = ext.gender;

        if (Object.keys(currentUpdates).length > 0) {
          // If a place was updated, we try to geocode it in the background
          if (currentUpdates.place) {
            try {
              const geoResponse = await fetch('/api/geocode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ place: currentUpdates.place })
              });
              if (geoResponse.ok) {
                const geo = await geoResponse.json();
                currentUpdates.lat = geo.lat;
                currentUpdates.lon = geo.lon;
                currentUpdates.timezone = geo.timezone;
              }
            } catch (geoErr) {
              console.error('Failed backgrounds geocode', geoErr);
            }
          }
          updateBirthDetails(currentUpdates);
        }
      }

      // Append assistant's text response
      const assistantMsg: Message = {
        id: `m-${Date.now()}-astrologer`,
        role: 'assistant',
        content: responseBody.response || 'Please forgive me, the astrological channels are temporarily congested. Say again?',
        timestamp: new Date().toISOString()
      };
      setMessages((prev) => [...prev, assistantMsg]);

    } catch (err: any) {
      console.error(err);
      setErrorMessage('The cosmic frequencies are interrupted. Please try again in a moment.');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset session to start fresh
  const handleResetSession = () => {
    setShowResetConfirm(true);
  };

  const confirmResetSession = () => {
    setBirthDetails({});
    setAstrologyData(null);
    setMessages([INITIAL_WELCOME_MESSAGE]);
    setErrorMessage(null);
    setShowResetConfirm(false);
  };

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-[#f4f6f8] font-sans antialiased text-slate-800 select-none">
      {/* Celestial Mesh Background Overlay */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-100/30 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-100/20 rounded-full blur-[150px]"></div>
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-amber-50/50 rounded-full blur-[100px]"></div>
      </div>

      {/* Mobile Sidebar backdrop */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)} 
          className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm z-30 md:hidden animate-fade-in transition-all"
        />
      )}

      {/* Sidebar - Collapsible on small devices, fixed panel on large */}
      <div className={`
        fixed inset-y-0 right-0 md:static shrink-0 h-full w-full max-w-[340px] md:max-w-[380px]
        transition-transform duration-300 ease-in-out md:translate-x-0 md:block
        ${sidebarOpen ? 'translate-x-0 z-40' : 'translate-x-full md:translate-x-0 z-0'}
      `}>
        <AstrologySidebar
          data={astrologyData}
          details={birthDetails}
          onReset={handleResetSession}
          onCloseMobile={() => setSidebarOpen(false)}
        />
      </div>

      {/* Main Chat Interface */}
      <div className="relative z-10 flex-1 flex flex-col h-full overflow-hidden">
        {errorMessage && (
          <div className="absolute top-0 inset-x-0 z-50 bg-rose-50 border-b border-rose-200 px-6 py-2.5 flex items-center justify-between text-xs text-rose-850 font-bold backdrop-blur-md shadow-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 animate-pulse" />
              <span>{errorMessage}</span>
            </div>
            <button 
              onClick={() => setErrorMessage(null)} 
              className="text-rose-600 hover:text-rose-900 font-bold ml-4 border-none bg-transparent cursor-pointer"
              id="clear-error-btn"
            >
              ✕
            </button>
          </div>
        )}

        <ChatInterface
          messages={messages}
          birthDetails={birthDetails}
          onSendMessage={sendMessage}
          onQuickOnboarding={handleQuickOnboarding}
          onUpdateBirthDetails={updateBirthDetails}
          isLoading={isLoading}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
          chartCalculated={!!astrologyData}
        />
      </div>

      {/* Custom Confirmation Dialog for Resetting Session / Switching to New Chat */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-5 shadow-2xl relative overflow-hidden animate-zoom-in text-slate-800">
            {/* Ambient gold glow in modal background */}
            <div className="absolute top-0 left-0 w-32 h-32 bg-amber-50/70 rounded-full blur-2xl pointer-events-none"></div>
            
            <div className="flex items-center gap-3 mb-3 relative z-10">
              <div className="w-8 h-8 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <Sparkles className="w-4 h-4 animate-pulse" />
              </div>
              <h3 className="font-sans font-bold text-sm text-slate-900">Start a New Chat?</h3>
            </div>
            
            <p className="text-xs text-slate-600 font-sans leading-relaxed mb-5 relative z-10">
              Would you like to clear your current birth details and start a brand new astrological consultation? You will be able to enter custom birth details to cast a new chart.
            </p>
            
            <div className="flex gap-2.5 justify-end relative z-10 font-sans">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-all outline-none cursor-pointer"
                id="reset-cancel-btn"
              >
                Cancel
              </button>
              <button
                onClick={confirmResetSession}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-xs text-white shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 transition-all outline-none cursor-pointer"
                id="reset-confirm-btn"
              >
                Yes, Start New Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
