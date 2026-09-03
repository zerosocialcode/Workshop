import React from 'react';
import { QRDataState, QRContentType } from '../types';

interface ContentFormsProps {
  data: QRDataState;
  onChange: (updater: (prev: QRDataState) => QRDataState) => void;
}

export const CONTENT_TYPES: {
  id: QRContentType;
  code: string;
  label: string;
  description: string;
}[] = [
  { id: 'url', code: '01/URL', label: 'Website URL', description: 'HTTPS link with optional UTM parameters' },
  { id: 'wifi', code: '02/NET', label: 'Wi-Fi Network', description: 'Instant network handshake protocol' },
  { id: 'vcard', code: '03/VCF', label: 'Contact Card', description: 'vCard 3.0 identity specification' },
  { id: 'text', code: '04/RAW', label: 'Plain Text', description: 'Raw ascii, serial, or telemetry log' },
  { id: 'email', code: '05/MSG', label: 'Email Envelope', description: 'Pre-filled mailto dispatch header' },
  { id: 'whatsapp', code: '06/WAP', label: 'WhatsApp', description: 'Direct cellular chat protocol' },
  { id: 'sms', code: '07/SMS', label: 'SMS Payload', description: 'Cellular SMS dispatch string' },
  { id: 'phone', code: '08/TEL', label: 'Telephone', description: 'Instant dialer telecommunication URI' },
  { id: 'event', code: '09/CAL', label: 'Calendar Event', description: 'iCal ISO-8601 schedule entry' },
  { id: 'location', code: '10/GEO', label: 'GPS Location', description: 'WGS84 latitude & longitude coordinates' },
  { id: 'social', code: '11/SOC', label: 'Social Profile', description: 'Developer & social network links' },
  { id: 'crypto', code: '12/BTC', label: 'Crypto Address', description: 'Bitcoin, Ethereum, Solana payment URI' },
  { id: 'appstore', code: '13/APP', label: 'App Stores', description: 'iOS App Store & Android package routing' },
];

export const ContentForms: React.FC<ContentFormsProps> = ({ data, onChange }) => {
  const setType = (type: QRContentType) => {
    onChange((prev) => ({ ...prev, type }));
  };

  return (
    <div className="space-y-4">
      {/* Content Type Selector Grid */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="font-mono-code text-[11px] uppercase tracking-widest text-[var(--ink-soft)] font-bold">
            SECTION 01 — PAYLOAD DATA SCHEMA
          </label>
          <span className="badge-tag">
            SELECTED: {CONTENT_TYPES.find((c) => c.id === data.type)?.code}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
          {CONTENT_TYPES.map((item) => {
            const isSelected = data.type === item.id;
            return (
              <button
                key={item.id}
                type="button"
                id={`content-type-${item.id}`}
                onClick={() => setType(item.id)}
                className={`p-2 rounded text-left transition cursor-pointer border ${
                  isSelected
                    ? 'bg-[var(--paper)] border-[var(--accent)] shadow-sm'
                    : 'bg-transparent border-[var(--line)] hover:border-[var(--ink-soft)] hover:bg-[var(--paper)]'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span
                    className={`font-mono-code text-[9px] font-bold px-1 rounded ${
                      isSelected
                        ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                        : 'bg-[var(--bg-deep)] text-[var(--ink-soft)]'
                    }`}
                  >
                    {item.code}
                  </span>
                </div>
                <div className="font-mono-code text-xs font-bold text-[var(--ink)] truncate">
                  {item.label}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Form Content Card */}
      <div className="spec-card p-4 space-y-4">
        {data.type === 'url' && (
          <div className="space-y-3">
            <div>
              <label className="block font-mono-code text-[11px] font-bold uppercase text-[var(--ink-soft)] mb-1">
                TARGET WEBSITE URL <span className="text-[var(--accent)]">*</span>
              </label>
              <input
                type="text"
                id="input-qr-url"
                value={data.url.url}
                onChange={(e) =>
                  onChange((prev) => ({
                    ...prev,
                    url: { ...prev.url, url: e.target.value },
                  }))
                }
                placeholder="https://example.com/spec-sheet"
                className="input-spec"
              />
            </div>

            {/* UTM Parameters */}
            <div className="border-t border-[var(--line-soft)] pt-3">
              <span className="font-mono-code text-[10px] font-bold uppercase tracking-wider text-[var(--ink-soft)] block mb-2">
                OPTIONAL UTM CAMPAIGN TELEMETRY
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block font-mono-code text-[10px] text-[var(--ink-soft)] mb-0.5">
                    UTM_SOURCE
                  </label>
                  <input
                    type="text"
                    id="input-utm-source"
                    value={data.url.utmSource || ''}
                    onChange={(e) =>
                      onChange((prev) => ({
                        ...prev,
                        url: { ...prev.url, utmSource: e.target.value },
                      }))
                    }
                    placeholder="blueprint_sheet"
                    className="input-spec text-xs py-1.5"
                  />
                </div>
                <div>
                  <label className="block font-mono-code text-[10px] text-[var(--ink-soft)] mb-0.5">
                    UTM_MEDIUM
                  </label>
                  <input
                    type="text"
                    id="input-utm-medium"
                    value={data.url.utmMedium || ''}
                    onChange={(e) =>
                      onChange((prev) => ({
                        ...prev,
                        url: { ...prev.url, utmMedium: e.target.value },
                      }))
                    }
                    placeholder="print_label"
                    className="input-spec text-xs py-1.5"
                  />
                </div>
                <div>
                  <label className="block font-mono-code text-[10px] text-[var(--ink-soft)] mb-0.5">
                    UTM_CAMPAIGN
                  </label>
                  <input
                    type="text"
                    id="input-utm-campaign"
                    value={data.url.utmCampaign || ''}
                    onChange={(e) =>
                      onChange((prev) => ({
                        ...prev,
                        url: { ...prev.url, utmCampaign: e.target.value },
                      }))
                    }
                    placeholder="v1_release"
                    className="input-spec text-xs py-1.5"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {data.type === 'wifi' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-mono-code text-[11px] font-bold uppercase text-[var(--ink-soft)] mb-1">
                  NETWORK SSID (NAME) <span className="text-[var(--accent)]">*</span>
                </label>
                <input
                  type="text"
                  id="input-wifi-ssid"
                  value={data.wifi.ssid}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      wifi: { ...prev.wifi, ssid: e.target.value },
                    }))
                  }
                  placeholder="Workshop_Lab_5G"
                  className="input-spec"
                />
              </div>

              <div>
                <label className="block font-mono-code text-[11px] font-bold uppercase text-[var(--ink-soft)] mb-1">
                  SECURITY KEY / PASSPHRASE
                </label>
                <input
                  type="text"
                  id="input-wifi-password"
                  value={data.wifi.password}
                  disabled={data.wifi.encryption === 'nopass'}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      wifi: { ...prev.wifi, password: e.target.value },
                    }))
                  }
                  placeholder={data.wifi.encryption === 'nopass' ? 'OPEN NETWORK (NO KEY)' : 'Key Passphrase'}
                  className="input-spec disabled:opacity-50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div>
                <label className="block font-mono-code text-[11px] font-bold uppercase text-[var(--ink-soft)] mb-1">
                  ENCRYPTION STANDARD
                </label>
                <select
                  id="select-wifi-encryption"
                  value={data.wifi.encryption}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      wifi: {
                        ...prev.wifi,
                        encryption: e.target.value as any,
                        ...(e.target.value === 'nopass' ? { password: '' } : {}),
                      },
                    }))
                  }
                  className="input-spec"
                >
                  <option value="WPA">WPA / WPA2 (Standard & Universal)</option>
                  <option value="WPA3">WPA3 (High-Security SAE)</option>
                  <option value="WEP">WEP (Legacy Protocol)</option>
                  <option value="nopass">None (Open Unsecured Network)</option>
                </select>
              </div>

              <div className="pt-4">
                <label className="flex items-center gap-2 cursor-pointer select-none font-mono-code text-xs text-[var(--ink)]">
                  <input
                    type="checkbox"
                    id="checkbox-wifi-hidden"
                    checked={data.wifi.hidden}
                    onChange={(e) =>
                      onChange((prev) => ({
                        ...prev,
                        wifi: { ...prev.wifi, hidden: e.target.checked },
                      }))
                    }
                    className="accent-[var(--accent)] w-4 h-4 cursor-pointer"
                  />
                  <span>HIDDEN SSID (NON-BROADCASTING)</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {data.type === 'vcard' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block font-mono-code text-[10px] font-bold uppercase text-[var(--ink-soft)] mb-0.5">
                  FIRST NAME
                </label>
                <input
                  type="text"
                  id="input-vcard-firstname"
                  value={data.vcard.firstName}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      vcard: { ...prev.vcard, firstName: e.target.value },
                    }))
                  }
                  placeholder="Arthur"
                  className="input-spec text-xs py-1.5"
                />
              </div>
              <div>
                <label className="block font-mono-code text-[10px] font-bold uppercase text-[var(--ink-soft)] mb-0.5">
                  LAST NAME
                </label>
                <input
                  type="text"
                  id="input-vcard-lastname"
                  value={data.vcard.lastName}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      vcard: { ...prev.vcard, lastName: e.target.value },
                    }))
                  }
                  placeholder="Dent"
                  className="input-spec text-xs py-1.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block font-mono-code text-[10px] font-bold uppercase text-[var(--ink-soft)] mb-0.5">
                  ORGANIZATION / ENTITY
                </label>
                <input
                  type="text"
                  id="input-vcard-org"
                  value={data.vcard.organization}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      vcard: { ...prev.vcard, organization: e.target.value },
                    }))
                  }
                  placeholder="Workshop Systems Ltd"
                  className="input-spec text-xs py-1.5"
                />
              </div>
              <div>
                <label className="block font-mono-code text-[10px] font-bold uppercase text-[var(--ink-soft)] mb-0.5">
                  ROLE / TITLE
                </label>
                <input
                  type="text"
                  id="input-vcard-title"
                  value={data.vcard.title}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      vcard: { ...prev.vcard, title: e.target.value },
                    }))
                  }
                  placeholder="Principal Architect"
                  className="input-spec text-xs py-1.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block font-mono-code text-[10px] font-bold uppercase text-[var(--ink-soft)] mb-0.5">
                  MOBILE TEL
                </label>
                <input
                  type="tel"
                  id="input-vcard-mobile"
                  value={data.vcard.mobile}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      vcard: { ...prev.vcard, mobile: e.target.value },
                    }))
                  }
                  placeholder="+1 (555) 014-9988"
                  className="input-spec text-xs py-1.5"
                />
              </div>
              <div>
                <label className="block font-mono-code text-[10px] font-bold uppercase text-[var(--ink-soft)] mb-0.5">
                  EMAIL ADDRESS
                </label>
                <input
                  type="email"
                  id="input-vcard-email"
                  value={data.vcard.email}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      vcard: { ...prev.vcard, email: e.target.value },
                    }))
                  }
                  placeholder="arthur@workshop.dev"
                  className="input-spec text-xs py-1.5"
                />
              </div>
              <div>
                <label className="block font-mono-code text-[10px] font-bold uppercase text-[var(--ink-soft)] mb-0.5">
                  URI / WEBSITE
                </label>
                <input
                  type="text"
                  id="input-vcard-website"
                  value={data.vcard.website}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      vcard: { ...prev.vcard, website: e.target.value },
                    }))
                  }
                  placeholder="https://workshop.dev"
                  className="input-spec text-xs py-1.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-2">
                <label className="block font-mono-code text-[10px] font-bold uppercase text-[var(--ink-soft)] mb-0.5">
                  STREET ADDRESS
                </label>
                <input
                  type="text"
                  id="input-vcard-street"
                  value={data.vcard.street}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      vcard: { ...prev.vcard, street: e.target.value },
                    }))
                  }
                  placeholder="42 Blueprint Way"
                  className="input-spec text-xs py-1.5"
                />
              </div>
              <div>
                <label className="block font-mono-code text-[10px] font-bold uppercase text-[var(--ink-soft)] mb-0.5">
                  CITY, POSTCODE
                </label>
                <input
                  type="text"
                  id="input-vcard-city"
                  value={data.vcard.city}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      vcard: { ...prev.vcard, city: e.target.value },
                    }))
                  }
                  placeholder="London, EC1A 1BB"
                  className="input-spec text-xs py-1.5"
                />
              </div>
            </div>
          </div>
        )}

        {data.type === 'text' && (
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-mono-code text-[11px] font-bold uppercase text-[var(--ink-soft)]">
                RAW TEXT / SERIAL TELEMETRY <span className="text-[var(--accent)]">*</span>
              </label>
              <span className="font-mono-code text-[10px] text-[var(--ink-faint)]">
                {data.text.length} BYTES
              </span>
            </div>
            <textarea
              id="input-qr-text"
              rows={4}
              value={data.text}
              onChange={(e) => onChange((prev) => ({ ...prev, text: e.target.value }))}
              placeholder="SPEC-9984 // BATCH-ALPHA // VOLT-240"
              className="input-spec"
            />
          </div>
        )}

        {data.type === 'email' && (
          <div className="space-y-3">
            <div>
              <label className="block font-mono-code text-[11px] font-bold uppercase text-[var(--ink-soft)] mb-1">
                DISPATCH EMAIL ADDRESS <span className="text-[var(--accent)]">*</span>
              </label>
              <input
                type="email"
                id="input-email-to"
                value={data.email.email}
                onChange={(e) =>
                  onChange((prev) => ({
                    ...prev,
                    email: { ...prev.email, email: e.target.value },
                  }))
                }
                placeholder="inbox@workshop.dev"
                className="input-spec"
              />
            </div>
            <div>
              <label className="block font-mono-code text-[11px] font-bold uppercase text-[var(--ink-soft)] mb-1">
                SUBJECT LINE
              </label>
              <input
                type="text"
                id="input-email-subject"
                value={data.email.subject}
                onChange={(e) =>
                  onChange((prev) => ({
                    ...prev,
                    email: { ...prev.email, subject: e.target.value },
                  }))
                }
                placeholder="[TELEMETRY] Report Inquiry"
                className="input-spec"
              />
            </div>
            <div>
              <label className="block font-mono-code text-[11px] font-bold uppercase text-[var(--ink-soft)] mb-1">
                MESSAGE BODY TEMPLATE
              </label>
              <textarea
                rows={3}
                id="input-email-body"
                value={data.email.body}
                onChange={(e) =>
                  onChange((prev) => ({
                    ...prev,
                    email: { ...prev.email, body: e.target.value },
                  }))
                }
                placeholder="Requested specification documents regarding..."
                className="input-spec"
              />
            </div>
          </div>
        )}

        {data.type === 'whatsapp' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block font-mono-code text-[10px] font-bold uppercase text-[var(--ink-soft)] mb-0.5">
                  COUNTRY CODE
                </label>
                <input
                  type="text"
                  id="input-wa-code"
                  value={data.whatsapp.countryCode}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      whatsapp: { ...prev.whatsapp, countryCode: e.target.value },
                    }))
                  }
                  placeholder="+44"
                  className="input-spec text-xs py-1.5"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-mono-code text-[10px] font-bold uppercase text-[var(--ink-soft)] mb-0.5">
                  PHONE DIGITS ONLY <span className="text-[var(--accent)]">*</span>
                </label>
                <input
                  type="tel"
                  id="input-wa-phone"
                  value={data.whatsapp.phone}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      whatsapp: { ...prev.whatsapp, phone: e.target.value },
                    }))
                  }
                  placeholder="7911123456"
                  className="input-spec text-xs py-1.5"
                />
              </div>
            </div>

            <div>
              <label className="block font-mono-code text-[10px] font-bold uppercase text-[var(--ink-soft)] mb-0.5">
                DISPATCH CHAT MESSAGE
              </label>
              <textarea
                rows={3}
                id="input-wa-message"
                value={data.whatsapp.message}
                onChange={(e) =>
                  onChange((prev) => ({
                    ...prev,
                    whatsapp: { ...prev.whatsapp, message: e.target.value },
                  }))
                }
                placeholder="Hello, I scanned the spec QR code and want to initialize connection."
                className="input-spec text-xs"
              />
            </div>
          </div>
        )}

        {data.type === 'sms' && (
          <div className="space-y-3">
            <div>
              <label className="block font-mono-code text-[11px] font-bold uppercase text-[var(--ink-soft)] mb-1">
                CELLULAR NUMBER <span className="text-[var(--accent)]">*</span>
              </label>
              <input
                type="tel"
                id="input-sms-phone"
                value={data.sms.phone}
                onChange={(e) =>
                  onChange((prev) => ({
                    ...prev,
                    sms: { ...prev.sms, phone: e.target.value },
                  }))
                }
                placeholder="+1 555-0199"
                className="input-spec"
              />
            </div>
            <div>
              <label className="block font-mono-code text-[11px] font-bold uppercase text-[var(--ink-soft)] mb-1">
                SMS TEXT STRING
              </label>
              <textarea
                rows={3}
                id="input-sms-message"
                value={data.sms.message}
                onChange={(e) =>
                  onChange((prev) => ({
                    ...prev,
                    sms: { ...prev.sms, message: e.target.value },
                  }))
                }
                placeholder="ACTIVATE SPEC_90"
                className="input-spec"
              />
            </div>
          </div>
        )}

        {data.type === 'phone' && (
          <div>
            <label className="block font-mono-code text-[11px] font-bold uppercase text-[var(--ink-soft)] mb-1">
              TELEPHONE DIALER TARGET <span className="text-[var(--accent)]">*</span>
            </label>
            <input
              type="tel"
              id="input-phone-number"
              value={data.phone.phone}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  phone: { ...prev.phone, phone: e.target.value },
                }))
              }
              placeholder="+1 (800) 555-0199"
              className="input-spec"
            />
            <p className="font-mono-code text-[11px] text-[var(--ink-faint)] mt-1.5">
              // Direct tel: URI invoking instant device dialer on scan.
            </p>
          </div>
        )}

        {data.type === 'event' && (
          <div className="space-y-3">
            <div>
              <label className="block font-mono-code text-[11px] font-bold uppercase text-[var(--ink-soft)] mb-1">
                EVENT SPEC TITLE <span className="text-[var(--accent)]">*</span>
              </label>
              <input
                type="text"
                id="input-event-title"
                value={data.event.title}
                onChange={(e) =>
                  onChange((prev) => ({
                    ...prev,
                    event: { ...prev.event, title: e.target.value },
                  }))
                }
                placeholder="Workshop Technical Assembly 2026"
                className="input-spec"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block font-mono-code text-[10px] font-bold uppercase text-[var(--ink-soft)] mb-0.5">
                  START DATE
                </label>
                <input
                  type="date"
                  id="input-event-start-date"
                  value={data.event.startDate}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      event: { ...prev.event, startDate: e.target.value },
                    }))
                  }
                  className="input-spec text-xs py-1.5"
                />
              </div>
              <div>
                <label className="block font-mono-code text-[10px] font-bold uppercase text-[var(--ink-soft)] mb-0.5">
                  START TIME
                </label>
                <input
                  type="time"
                  id="input-event-start-time"
                  value={data.event.startTime}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      event: { ...prev.event, startTime: e.target.value },
                    }))
                  }
                  className="input-spec text-xs py-1.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block font-mono-code text-[10px] font-bold uppercase text-[var(--ink-soft)] mb-0.5">
                  END DATE
                </label>
                <input
                  type="date"
                  id="input-event-end-date"
                  value={data.event.endDate}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      event: { ...prev.event, endDate: e.target.value },
                    }))
                  }
                  className="input-spec text-xs py-1.5"
                />
              </div>
              <div>
                <label className="block font-mono-code text-[10px] font-bold uppercase text-[var(--ink-soft)] mb-0.5">
                  END TIME
                </label>
                <input
                  type="time"
                  id="input-event-end-time"
                  value={data.event.endTime}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      event: { ...prev.event, endTime: e.target.value },
                    }))
                  }
                  className="input-spec text-xs py-1.5"
                />
              </div>
            </div>

            <div>
              <label className="block font-mono-code text-[10px] font-bold uppercase text-[var(--ink-soft)] mb-0.5">
                VENUE / SECTOR LOCATION
              </label>
              <input
                type="text"
                id="input-event-location"
                value={data.event.location}
                onChange={(e) =>
                  onChange((prev) => ({
                    ...prev,
                    event: { ...prev.event, location: e.target.value },
                  }))
                }
                placeholder="Sector 7 Technical Floor, Drafting Hall"
                className="input-spec text-xs py-1.5"
              />
            </div>
          </div>
        )}

        {data.type === 'location' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block font-mono-code text-[10px] font-bold uppercase text-[var(--ink-soft)] mb-0.5">
                  LATITUDE (WGS84)
                </label>
                <input
                  type="text"
                  id="input-loc-lat"
                  value={data.location.latitude}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      location: { ...prev.location, latitude: e.target.value },
                    }))
                  }
                  placeholder="51.5074"
                  className="input-spec text-xs py-1.5"
                />
              </div>
              <div>
                <label className="block font-mono-code text-[10px] font-bold uppercase text-[var(--ink-soft)] mb-0.5">
                  LONGITUDE (WGS84)
                </label>
                <input
                  type="text"
                  id="input-loc-lng"
                  value={data.location.longitude}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      location: { ...prev.location, longitude: e.target.value },
                    }))
                  }
                  placeholder="-0.1278"
                  className="input-spec text-xs py-1.5"
                />
              </div>
            </div>

            <div>
              <label className="block font-mono-code text-[10px] font-bold uppercase text-[var(--ink-soft)] mb-0.5">
                GEO SEARCH QUERY / FALLBACK ADDRESS
              </label>
              <input
                type="text"
                id="input-loc-query"
                value={data.location.query || ''}
                onChange={(e) =>
                  onChange((prev) => ({
                    ...prev,
                    location: { ...prev.location, query: e.target.value },
                  }))
                }
                placeholder="Royal Observatory Greenwich, London"
                className="input-spec text-xs py-1.5"
              />
            </div>
          </div>
        )}

        {data.type === 'social' && (
          <div className="space-y-3">
            <div>
              <label className="block font-mono-code text-[10px] font-bold uppercase text-[var(--ink-soft)] mb-1">
                PLATFORM TARGET
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                {[
                  { id: 'github', name: 'GitHub' },
                  { id: 'twitter', name: 'X / Twitter' },
                  { id: 'linkedin', name: 'LinkedIn' },
                  { id: 'youtube', name: 'YouTube' },
                  { id: 'discord', name: 'Discord' },
                  { id: 'telegram', name: 'Telegram' },
                  { id: 'instagram', name: 'Instagram' },
                  { id: 'spotify', name: 'Spotify' },
                  { id: 'tiktok', name: 'TikTok' },
                  { id: 'facebook', name: 'Facebook' },
                ].map((plat) => (
                  <button
                    key={plat.id}
                    type="button"
                    onClick={() =>
                      onChange((prev) => ({
                        ...prev,
                        social: { ...prev.social, platform: plat.id as any },
                      }))
                    }
                    className={`p-1.5 rounded border text-[11px] font-mono-code font-bold transition cursor-pointer text-center ${
                      data.social.platform === plat.id
                        ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--accent)]'
                        : 'bg-transparent border-[var(--line)] text-[var(--ink-soft)] hover:border-[var(--ink)]'
                    }`}
                  >
                    {plat.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-mono-code text-[10px] font-bold uppercase text-[var(--ink-soft)] mb-0.5">
                ACCOUNT IDENTIFIER / HANDLE <span className="text-[var(--accent)]">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 font-mono-code text-xs text-[var(--ink-faint)]">@</span>
                <input
                  type="text"
                  id="input-social-user"
                  value={data.social.username}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      social: { ...prev.social, username: e.target.value },
                    }))
                  }
                  placeholder="engineering_lab"
                  className="input-spec pl-7 text-xs py-1.5"
                />
              </div>
            </div>
          </div>
        )}

        {data.type === 'crypto' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {[
                { id: 'bitcoin', label: 'BTC / BITCOIN' },
                { id: 'ethereum', label: 'ETH / ETHEREUM' },
                { id: 'solana', label: 'SOL / SOLANA' },
                { id: 'usdt', label: 'USDT / TETHER' },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() =>
                    onChange((prev) => ({
                      ...prev,
                      crypto: { ...prev.crypto, currency: c.id as any },
                    }))
                  }
                  className={`p-1.5 rounded border font-mono-code text-[10px] font-bold text-center cursor-pointer transition ${
                    data.crypto.currency === c.id
                      ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--accent)]'
                      : 'bg-transparent border-[var(--line)] text-[var(--ink-soft)] hover:border-[var(--ink)]'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <div>
              <label className="block font-mono-code text-[10px] font-bold uppercase text-[var(--ink-soft)] mb-0.5">
                PUBLIC WALLET HASH <span className="text-[var(--accent)]">*</span>
              </label>
              <input
                type="text"
                id="input-crypto-address"
                value={data.crypto.address}
                onChange={(e) =>
                  onChange((prev) => ({
                    ...prev,
                    crypto: { ...prev.crypto, address: e.target.value },
                  }))
                }
                placeholder="1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
                className="input-spec text-xs py-1.5"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block font-mono-code text-[10px] font-bold uppercase text-[var(--ink-soft)] mb-0.5">
                  REQUEST AMOUNT
                </label>
                <input
                  type="text"
                  id="input-crypto-amount"
                  value={data.crypto.amount}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      crypto: { ...prev.crypto, amount: e.target.value },
                    }))
                  }
                  placeholder="0.05"
                  className="input-spec text-xs py-1.5"
                />
              </div>
              <div>
                <label className="block font-mono-code text-[10px] font-bold uppercase text-[var(--ink-soft)] mb-0.5">
                  LABEL / INVOICE REF
                </label>
                <input
                  type="text"
                  id="input-crypto-label"
                  value={data.crypto.label}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      crypto: { ...prev.crypto, label: e.target.value },
                    }))
                  }
                  placeholder="INVOICE-SPEC-1042"
                  className="input-spec text-xs py-1.5"
                />
              </div>
            </div>
          </div>
        )}

        {data.type === 'appstore' && (
          <div className="space-y-3">
            <div>
              <label className="block font-mono-code text-[10px] font-bold uppercase text-[var(--ink-soft)] mb-0.5">
                APPLE APP STORE IDENTIFIER (NUMERIC ID)
              </label>
              <input
                type="text"
                id="input-app-ios"
                value={data.appstore.iosAppId}
                onChange={(e) =>
                  onChange((prev) => ({
                    ...prev,
                    appstore: { ...prev.appstore, iosAppId: e.target.value },
                  }))
                }
                placeholder="1234567890"
                className="input-spec text-xs py-1.5"
              />
            </div>
            <div>
              <label className="block font-mono-code text-[10px] font-bold uppercase text-[var(--ink-soft)] mb-0.5">
                GOOGLE PLAY PACKAGE STRING
              </label>
              <input
                type="text"
                id="input-app-android"
                value={data.appstore.androidPackage}
                onChange={(e) =>
                  onChange((prev) => ({
                    ...prev,
                    appstore: { ...prev.appstore, androidPackage: e.target.value },
                  }))
                }
                placeholder="com.workshop.engine"
                className="input-spec text-xs py-1.5"
              />
            </div>
            <div>
              <label className="block font-mono-code text-[10px] font-bold uppercase text-[var(--ink-soft)] mb-0.5">
                UNIVERSAL WEB FALLBACK URI
              </label>
              <input
                type="text"
                id="input-app-fallback"
                value={data.appstore.fallbackUrl}
                onChange={(e) =>
                  onChange((prev) => ({
                    ...prev,
                    appstore: { ...prev.appstore, fallbackUrl: e.target.value },
                  }))
                }
                placeholder="https://workshop.dev/download"
                className="input-spec text-xs py-1.5"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
