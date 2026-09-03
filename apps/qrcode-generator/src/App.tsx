import React, { useState, useEffect } from 'react';
import {
  MainTab,
  QRDataState,
  QRContentType,
  QRStyleConfig,
  HistoryItem,
} from './types';
import { generateQRPayload } from './utils/qrPayload';
import { ContentForms } from './components/ContentForms';
import { StylingStudio } from './components/StylingStudio';
import { QRCodeRenderer } from './components/QRCodeRenderer';
import { BarcodeStudio } from './components/BarcodeStudio';
import { BatchGenerator } from './components/BatchGenerator';
import { ScannerView } from './components/ScannerView';
import { TemplatesGallery } from './components/TemplatesGallery';
import { HistoryView } from './components/HistoryView';

export default function App() {
  // Theme state with day/night tokens
  const [theme, setTheme] = useState<'day' | 'night'>(() => {
    try {
      const saved = localStorage.getItem('workshop-theme');
      return saved === 'night' ? 'night' : 'day';
    } catch {
      return 'day';
    }
  });

  const [showLightFlood, setShowLightFlood] = useState(false);

  // Synchronize theme to document attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('workshop-theme', theme);
    } catch (e) {
      console.warn(e);
    }
  }, [theme]);

  const toggleTheme = () => {
    setShowLightFlood(true);
    setTimeout(() => setShowLightFlood(false), 450);
    setTheme((prev) => (prev === 'day' ? 'night' : 'day'));
  };

  // URL query parameter and hash synchronization for Workshop Quick Find actions
  const getTabFromURL = (): MainTab => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const mode = searchParams.get('mode') || searchParams.get('tab') || hashParams.get('mode') || hashParams.get('tab');
      if (mode && ['qr', 'barcode', 'batch', 'scan', 'templates', 'history'].includes(mode)) {
        return mode as MainTab;
      }
    } catch {}
    return 'qr';
  };

  const [activeTab, setActiveTab] = useState<MainTab>(getTabFromURL);

  useEffect(() => {
    const syncFromURL = () => {
      const tab = getTabFromURL();
      setActiveTab(tab);
    };

    window.addEventListener('popstate', syncFromURL);
    window.addEventListener('hashchange', syncFromURL);
    return () => {
      window.removeEventListener('popstate', syncFromURL);
      window.removeEventListener('hashchange', syncFromURL);
    };
  }, []);

  const handleTabChange = (tab: MainTab) => {
    setActiveTab(tab);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('mode', tab);
      url.searchParams.delete('tab');
      window.history.replaceState({}, '', url.toString());
    } catch {}
  };

  // QR Code Form Payload Data State
  const [qrData, setQrData] = useState<QRDataState>(() => {
    const base: QRDataState = {
      type: 'url',
      url: { url: 'https://workshop.dev/spec' },
      text: 'SPEC-7729-ALPHA // WORKSHOP LABS',
      wifi: { ssid: 'Workshop_Drafting_5G', password: 'ArchivalPass2026', encryption: 'WPA', hidden: false },
      vcard: {
        firstName: 'Arthur',
        lastName: 'Dent',
        organization: 'Workshop Systems Ltd',
        title: 'Principal Systems Architect',
        phone: '+1 (555) 019-2834',
        mobile: '+1 (555) 789-0123',
        email: 'arthur.dent@workshop.dev',
        website: 'https://workshop.dev',
        street: '42 Blueprint Way',
        city: 'London',
        state: 'LDN',
        zip: 'EC1A 1BB',
        country: 'UK',
        note: 'Technical Drafting Archive 2026',
      },
      email: { email: 'inbox@workshop.dev', subject: '[SPEC] Engineering Ingestion', body: 'Dispatching telemetry specifications.' },
      sms: { phone: '+15550192834', message: 'ACTIVATE SPEC_90' },
      phone: { phone: '+18005550199' },
      whatsapp: { countryCode: '+44', phone: '7911123456', message: 'Connecting to workshop telemetry channel.' },
      location: { latitude: '51.4769', longitude: '-0.0005', query: 'Royal Observatory Greenwich, London' },
      event: {
        title: 'Workshop Technical Assembly 2026',
        location: 'Sector 7 Technical Floor, Drafting Hall',
        description: 'Annual technology briefing and developer blueprint review.',
        startDate: '2026-10-15',
        startTime: '10:00',
        endDate: '2026-10-15',
        endTime: '12:00',
        allDay: false,
      },
      crypto: {
        currency: 'bitcoin',
        address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        amount: '0.005',
        label: 'Archival Grant',
        message: 'Verified on-chain contribution',
      },
      social: { platform: 'github', username: 'workshop-labs' },
      appstore: { iosAppId: '123456789', androidPackage: 'com.workshop.engine', fallbackUrl: 'https://workshop.dev' },
    };

    try {
      const p = new URLSearchParams(window.location.search);
      const urlVal = p.get('url');
      const textVal = p.get('text');
      const typeVal = p.get('type') as QRContentType | null;
      if (urlVal) {
        base.url.url = urlVal;
        base.type = 'url';
      } else if (textVal) {
        base.text = textVal;
        base.type = 'text';
      } else if (typeVal && [
        'url', 'text', 'wifi', 'vcard', 'email', 'sms', 'phone', 'whatsapp', 'location', 'event', 'crypto', 'social', 'appstore'
      ].includes(typeVal)) {
        base.type = typeVal;
      }
    } catch {}

    return base;
  });

  // QR Styling State
  const [qrStyle, setQrStyle] = useState<QRStyleConfig>({
    dotType: 'rounded',
    dotColor: { type: 'linear', color1: '#b8441f', color2: '#23261f', rotation: 45 },
    cornerSquareType: 'extra-rounded',
    cornerSquareColor: '#23261f',
    cornerDotType: 'dot',
    cornerDotColor: '#b8441f',
    backgroundColor: '#f8f4e8',
    isTransparent: false,
    margin: 16,
    errorCorrectionLevel: 'Q',
    resolution: 1024,
    logo: {
      src: null,
      presetIcon: null,
      size: 0.24,
      margin: 4,
      backgroundColor: '#ffffff',
      borderRadius: 4,
      hideBackgroundDots: true,
    },
    frame: {
      type: 'bottom-banner',
      text: 'SPECIFICATION // SCAN',
      subtext: '',
      bgColor: '#23261f',
      textColor: '#f8f4e8',
      fontFamily: 'monospace',
      fontSize: 13,
    },
  });

  // Local Storage Generation History
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('qr_barcode_studio_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('qr_barcode_studio_history', JSON.stringify(history));
    } catch (e) {
      console.warn('Could not save history to localStorage', e);
    }
  }, [history]);

  const addHistoryItem = (item: HistoryItem) => {
    setHistory((prev) => [item, ...prev.filter((i) => i.rawPayload !== item.rawPayload).slice(0, 49)]);
  };

  const clearHistory = () => setHistory([]);

  const toggleFavorite = (id: string) => {
    setHistory((prev) =>
      prev.map((item) => (item.id === id ? { ...item, favorite: !item.favorite } : item))
    );
  };

  const deleteHistoryItem = (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  };

  const loadFromHistory = (payload: string, category: 'qr' | 'barcode') => {
    if (category === 'qr') {
      if (/^https?:\/\//i.test(payload)) {
        setQrData((p) => ({ ...p, type: 'url', url: { ...p.url, url: payload } }));
      } else {
        setQrData((p) => ({ ...p, type: 'text', text: payload }));
      }
      handleTabChange('qr');
    } else {
      handleTabChange('barcode');
    }
  };

  const applyPresetTheme = (presetConfig: Partial<QRStyleConfig>) => {
    setQrStyle((prev) => ({
      ...prev,
      ...presetConfig,
      dotColor: { ...prev.dotColor, ...presetConfig.dotColor },
      logo: { ...prev.logo, ...presetConfig.logo },
      frame: { ...prev.frame, ...presetConfig.frame },
    }));
  };

  const currentQRPayload = generateQRPayload(qrData);

  return (
    <div className="workshop-grid-bg min-h-screen text-[var(--ink)] flex flex-col relative selection:bg-[var(--accent)] selection:text-white">
      {/* Light Flood Overlay on switch flip */}
      {showLightFlood && <div className="light-flood" />}

      {/* Top Application Header / Drawing Title Block */}
      <header className="border-b border-[var(--line)] bg-[var(--paper)]/95 backdrop-blur-sm sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          {/* Identity & Drawn Underline Title */}
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-mono-code text-[10px] font-bold tracking-widest text-[var(--accent)] uppercase">
                DRAWING SPECIFICATION
              </span>
              <span className="badge-tag">
                REV 2026.09
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-[var(--ink)] draw-underline inline-block leading-none">
              QR & BARCODE STUDIO PRO
            </h1>
          </div>

          {/* Physical Light Switch & Ledger Quick Stats */}
          <div className="flex items-center gap-4">
            {/* Physical Wall Light Switch Toggle */}
            <div className="flex flex-col items-center">
              <span className="font-mono-code text-[9px] font-bold tracking-widest text-[var(--ink-soft)] uppercase mb-1 select-none">
                LIGHTS
              </span>
              <button
                type="button"
                id="workshop-light-switch"
                onClick={toggleTheme}
                title={`Switch to ${theme === 'day' ? 'Night Cyanotype' : 'Day Drafting'} mode`}
                className="w-[76px] h-[40px] bg-[var(--paper)] border-2 border-[var(--ink)] rounded-[6px] relative p-1 cursor-pointer transition-shadow hover:shadow-md select-none flex items-center justify-between"
              >
                {/* 4 Mounting Screws */}
                <span className="absolute top-1 left-1.5 w-1 h-1 rounded-full bg-[var(--line)]" />
                <span className="absolute top-1 right-1.5 w-1 h-1 rounded-full bg-[var(--line)]" />
                <span className="absolute bottom-1 left-1.5 w-1 h-1 rounded-full bg-[var(--line)]" />
                <span className="absolute bottom-1 right-1.5 w-1 h-1 rounded-full bg-[var(--line)]" />

                {/* Sliding Rocker Block */}
                <div
                  className={`w-[32px] h-[28px] bg-[var(--ink)] rounded-[3px] flex items-center justify-center transition-all duration-300 ${
                    theme === 'night' ? 'translate-x-[32px]' : 'translate-x-0'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                </div>
              </button>
              <div className="flex justify-between w-full font-mono-code text-[8px] text-[var(--ink-faint)] font-bold px-1 mt-0.5 select-none">
                <span>DAY</span>
                <span>NIGHT</span>
              </div>
            </div>

            {/* Ledger Pill */}
            <button
              type="button"
              id="nav-tab-history-pill"
              onClick={() => handleTabChange('history')}
              className={`font-mono-code text-xs font-bold px-3 py-2 rounded border transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--accent)]'
                  : 'bg-[var(--bg-deep)] border-[var(--line)] text-[var(--ink-soft)] hover:border-[var(--ink)]'
              }`}
            >
              <span>[ LEDGER: {history.length} ]</span>
            </button>
          </div>
        </div>

        {/* Technical Sheet Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex overflow-x-auto scrollbar-none border-t border-[var(--line-soft)] font-mono-code text-xs">
          {[
            { id: 'qr', code: '01', label: 'QR MATRIX STUDIO' },
            { id: 'barcode', code: '02', label: '1D BARCODE STUDIO' },
            { id: 'batch', code: '03', label: 'BULK BATCH MATRIX' },
            { id: 'scan', code: '04', label: 'OPTICAL SCANNER' },
            { id: 'templates', code: '05', label: 'DESIGN SHEETS' },
            { id: 'history', code: '06', label: 'REGISTRY LEDGER' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                id={`nav-tab-${tab.id}`}
                onClick={() => handleTabChange(tab.id as MainTab)}
                className={`py-2.5 px-4 font-bold whitespace-nowrap border-b-2 transition-all cursor-pointer ${
                  isActive
                    ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--bg-deep)]'
                    : 'border-transparent text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--bg-deep)]/50'
                }`}
              >
                <span className="text-[10px] text-[var(--ink-faint)] mr-1.5">{tab.code}/</span>
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main App Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {activeTab === 'qr' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Form & Styling Studio (7 Cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Content Form Inputs */}
              <ContentForms data={qrData} onChange={setQrData} />

              {/* Advanced Custom Styling Studio */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="font-mono-code text-[11px] uppercase tracking-widest text-[var(--ink-soft)] font-bold">
                    SECTION 02 — DESIGN SPECIFICATION & CHROMATICS
                  </label>
                  <button
                    type="button"
                    onClick={() => handleTabChange('templates')}
                    className="font-mono-code text-xs text-[var(--accent)] hover:underline font-bold cursor-pointer"
                  >
                    [ BROWSE PRESET SHEETS → ]
                  </button>
                </div>
                <StylingStudio style={qrStyle} onChange={setQrStyle} />
              </div>
            </div>

            {/* Right Column: Live QR Preview & Export Center (5 Cols) */}
            <div className="lg:col-span-5 lg:sticky lg:top-20">
              <QRCodeRenderer
                payload={currentQRPayload}
                style={qrStyle}
                title={qrData.type === 'url' ? qrData.url.url : qrData.type.toUpperCase()}
                onSaveToHistory={addHistoryItem}
              />
            </div>
          </div>
        )}

        {activeTab === 'barcode' && <BarcodeStudio onSaveToHistory={addHistoryItem} />}

        {activeTab === 'batch' && <BatchGenerator currentStyle={qrStyle} />}

        {activeTab === 'scan' && <ScannerView />}

        {activeTab === 'templates' && (
          <TemplatesGallery
            currentStyle={qrStyle}
            onApplyPreset={applyPresetTheme}
            onNavigateToStudio={() => handleTabChange('qr')}
          />
        )}

        {activeTab === 'history' && (
          <HistoryView
            history={history}
            onClearHistory={clearHistory}
            onToggleFavorite={toggleFavorite}
            onDeleteItem={deleteHistoryItem}
            onLoadPayload={loadFromHistory}
          />
        )}
      </main>

      {/* Footer Title Block */}
      <footer className="border-t border-[var(--line)] bg-[var(--paper)] py-4 px-4 text-center font-mono-code text-xs text-[var(--ink-soft)]">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <span>QR & BARCODE STUDIO PRO // ARCHIVAL DRAFTING SPECIFICATION</span>
          <span className="text-[var(--ink-faint)]">ISO/IEC 18004 COMPLIANT • ULTRA-HD VECTOR ENGINE</span>
        </div>
      </footer>
    </div>
  );
}
