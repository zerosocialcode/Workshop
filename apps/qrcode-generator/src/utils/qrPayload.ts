import { QRDataState } from '../types';

export function generateQRPayload(state: QRDataState): string {
  switch (state.type) {
    case 'url': {
      let finalUrl = state.url.url.trim();
      if (!finalUrl) return 'https://example.com';
      if (!/^https?:\/\//i.test(finalUrl)) {
        finalUrl = 'https://' + finalUrl;
      }
      try {
        const urlObj = new URL(finalUrl);
        if (state.url.utmSource) urlObj.searchParams.set('utm_source', state.url.utmSource);
        if (state.url.utmMedium) urlObj.searchParams.set('utm_medium', state.url.utmMedium);
        if (state.url.utmCampaign) urlObj.searchParams.set('utm_campaign', state.url.utmCampaign);
        return urlObj.toString();
      } catch {
        return finalUrl;
      }
    }

    case 'text':
      return state.text || 'Welcome to QR Studio Pro';

    case 'wifi': {
      const { ssid, password, encryption, hidden } = state.wifi;
      const enc = encryption === 'nopass' ? 'nopass' : encryption;
      // Escape special characters: \ ; , : "
      const escape = (v: string) => v.replace(/([\\;,:"'])/g, '\\$1');
      return `WIFI:S:${escape(ssid || 'My_WiFi_Network')};T:${enc};P:${escape(password || '')};H:${hidden ? 'true' : 'false'};;`;
    }

    case 'vcard': {
      const v = state.vcard;
      const fullName = `${v.firstName} ${v.lastName}`.trim() || 'Contact Name';
      const lines = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `N:${v.lastName || ''};${v.firstName || ''};;;`,
        `FN:${fullName}`,
      ];

      if (v.organization) lines.push(`ORG:${v.organization}`);
      if (v.title) lines.push(`TITLE:${v.title}`);
      if (v.phone) lines.push(`TEL;TYPE=WORK,VOICE:${v.phone}`);
      if (v.mobile) lines.push(`TEL;TYPE=CELL,VOICE:${v.mobile}`);
      if (v.email) lines.push(`EMAIL;TYPE=INTERNET:${v.email}`);
      if (v.website) lines.push(`URL:${v.website}`);
      if (v.street || v.city || v.state || v.zip || v.country) {
        lines.push(`ADR;TYPE=WORK:;;${v.street || ''};${v.city || ''};${v.state || ''};${v.zip || ''};${v.country || ''}`);
      }
      if (v.note) lines.push(`NOTE:${v.note.replace(/\n/g, '\\n')}`);
      lines.push('END:VCARD');
      return lines.join('\n');
    }

    case 'email': {
      const { email, subject, body } = state.email;
      const params = new URLSearchParams();
      if (subject) params.set('subject', subject);
      if (body) params.set('body', body);
      const query = params.toString();
      return `mailto:${email || 'contact@example.com'}${query ? `?${query}` : ''}`;
    }

    case 'sms': {
      const { phone, message } = state.sms;
      return `smsto:${phone || ''}:${message || ''}`;
    }

    case 'phone':
      return `tel:${state.phone.phone || '+1234567890'}`;

    case 'whatsapp': {
      const { countryCode, phone, message } = state.whatsapp;
      const cleanPhone = `${countryCode.replace(/\+/g, '')}${phone.replace(/[\s\-()]/g, '')}`;
      const msg = message ? `?text=${encodeURIComponent(message)}` : '';
      return `https://wa.me/${cleanPhone || '1234567890'}${msg}`;
    }

    case 'location': {
      const { latitude, longitude, query } = state.location;
      const lat = latitude.trim() || '37.7749';
      const lng = longitude.trim() || '-122.4194';
      if (query && query.trim()) {
        return `https://maps.google.com/?q=${encodeURIComponent(query.trim())}`;
      }
      return `geo:${lat},${lng}?q=${lat},${lng}`;
    }

    case 'event': {
      const ev = state.event;
      const formatDT = (date: string, time: string) => {
        if (!date) return '';
        const d = date.replace(/-/g, '');
        if (ev.allDay || !time) return d;
        const t = time.replace(/:/g, '') + '00';
        return `${d}T${t}`;
      };

      const start = formatDT(ev.startDate, ev.startTime) || '20261015T180000';
      const end = formatDT(ev.endDate, ev.endTime) || '20261015T200000';

      const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//QR Studio Pro//EN',
        'BEGIN:VEVENT',
        `SUMMARY:${ev.title || 'Important Meeting / Event'}`,
      ];

      if (start) lines.push(`DTSTART:${start}`);
      if (end) lines.push(`DTEND:${end}`);
      if (ev.location) lines.push(`LOCATION:${ev.location}`);
      if (ev.description) lines.push(`DESCRIPTION:${ev.description.replace(/\n/g, '\\n')}`);
      lines.push('END:VEVENT');
      lines.push('END:VCALENDAR');
      return lines.join('\n');
    }

    case 'crypto': {
      const { currency, address, amount, label, message } = state.crypto;
      const addr = address || '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
      const params = new URLSearchParams();
      if (amount) params.set('amount', amount);
      if (label) params.set('label', label);
      if (message) params.set('message', message);
      const query = params.toString();

      if (currency === 'bitcoin') {
        return `bitcoin:${addr}${query ? `?${query}` : ''}`;
      } else if (currency === 'ethereum') {
        return `ethereum:${addr}${query ? `?${query}` : ''}`;
      } else if (currency === 'solana') {
        return `solana:${addr}${query ? `?${query}` : ''}`;
      } else if (currency === 'usdt') {
        return `tether:${addr}${query ? `?${query}` : ''}`;
      }
      return `${currency}:${addr}${query ? `?${query}` : ''}`;
    }

    case 'social': {
      const { platform, username } = state.social;
      const cleanUser = username.replace(/^@/, '').trim();
      switch (platform) {
        case 'instagram':
          return `https://instagram.com/${cleanUser || 'username'}`;
        case 'twitter':
          return `https://x.com/${cleanUser || 'username'}`;
        case 'youtube':
          return cleanUser.startsWith('UC') || cleanUser.startsWith('@')
            ? `https://youtube.com/${cleanUser}`
            : `https://youtube.com/@${cleanUser || 'channel'}`;
        case 'tiktok':
          return `https://tiktok.com/@${cleanUser || 'username'}`;
        case 'linkedin':
          return `https://linkedin.com/in/${cleanUser || 'username'}`;
        case 'github':
          return `https://github.com/${cleanUser || 'username'}`;
        case 'telegram':
          return `https://t.me/${cleanUser || 'username'}`;
        case 'discord':
          return cleanUser.includes('http') ? cleanUser : `https://discord.gg/${cleanUser || 'invite'}`;
        case 'spotify':
          return `https://open.spotify.com/user/${cleanUser || 'user'}`;
        case 'facebook':
          return `https://facebook.com/${cleanUser || 'profile'}`;
        default:
          return `https://${platform}.com/${cleanUser}`;
      }
    }

    case 'appstore': {
      const { iosAppId, androidPackage, fallbackUrl } = state.appstore;
      if (iosAppId && !androidPackage) {
        return `https://apps.apple.com/app/id${iosAppId.replace(/^id/i, '')}`;
      }
      if (androidPackage && !iosAppId) {
        return `https://play.google.com/store/apps/details?id=${androidPackage}`;
      }
      return fallbackUrl || (androidPackage ? `https://play.google.com/store/apps/details?id=${androidPackage}` : 'https://apps.apple.com');
    }

    default:
      return 'QR Studio Pro';
  }
}

export interface ParsedQRResult {
  type: string;
  displayTitle: string;
  summary: string;
  rawText: string;
  actionLabel?: string;
  actionUrl?: string;
  copyableValue?: string;
  metadata?: Record<string, string>;
}

export function parseDecodedQR(text: string): ParsedQRResult {
  const trimmed = text.trim();

  // Wi-Fi
  if (trimmed.startsWith('WIFI:')) {
    const ssidMatch = trimmed.match(/S:([^;]+)/);
    const passMatch = trimmed.match(/P:([^;]+)/);
    const typeMatch = trimmed.match(/T:([^;]+)/);
    const ssid = ssidMatch ? ssidMatch[1].replace(/\\([\\;,:"'])/g, '$1') : 'Unknown Network';
    const password = passMatch ? passMatch[1].replace(/\\([\\;,:"'])/g, '$1') : '';
    const encryption = typeMatch ? typeMatch[1] : 'WPA';

    return {
      type: 'Wi-Fi Network',
      displayTitle: `Wi-Fi: ${ssid}`,
      summary: `Security: ${encryption} • Password: ${password ? '••••••••' : 'Open'}`,
      rawText: trimmed,
      copyableValue: password,
      actionLabel: password ? 'Copy Wi-Fi Password' : undefined,
      metadata: { SSID: ssid, Password: password, Security: encryption },
    };
  }

  // vCard
  if (trimmed.startsWith('BEGIN:VCARD')) {
    const fnMatch = trimmed.match(/FN:([^\r\n]+)/);
    const orgMatch = trimmed.match(/ORG:([^\r\n]+)/);
    const telMatch = trimmed.match(/TEL[^:]*:([^\r\n]+)/);
    const emailMatch = trimmed.match(/EMAIL[^:]*:([^\r\n]+)/);

    const name = fnMatch ? fnMatch[1] : 'Contact Card';
    return {
      type: 'Contact Card (vCard)',
      displayTitle: name,
      summary: `${orgMatch ? orgMatch[1] + ' • ' : ''}${telMatch ? telMatch[1] : emailMatch ? emailMatch[1] : ''}`,
      rawText: trimmed,
      copyableValue: trimmed,
      actionLabel: 'Download .VCF Card',
      metadata: {
        Name: name,
        ...(orgMatch && { Organization: orgMatch[1] }),
        ...(telMatch && { Phone: telMatch[1] }),
        ...(emailMatch && { Email: emailMatch[1] }),
      },
    };
  }

  // URLs
  if (/^https?:\/\//i.test(trimmed)) {
    return {
      type: 'Website Link',
      displayTitle: trimmed,
      summary: 'Web link ready to open in browser',
      rawText: trimmed,
      actionLabel: 'Open Link',
      actionUrl: trimmed,
      copyableValue: trimmed,
    };
  }

  // Email
  if (trimmed.startsWith('mailto:')) {
    const email = trimmed.replace('mailto:', '').split('?')[0];
    return {
      type: 'Email Address',
      displayTitle: email,
      summary: 'Send email message',
      rawText: trimmed,
      actionLabel: 'Compose Email',
      actionUrl: trimmed,
      copyableValue: email,
    };
  }

  // Phone
  if (trimmed.startsWith('tel:')) {
    const phone = trimmed.replace('tel:', '');
    return {
      type: 'Phone Number',
      displayTitle: phone,
      summary: 'Direct telephone dialing',
      rawText: trimmed,
      actionLabel: 'Dial Number',
      actionUrl: trimmed,
      copyableValue: phone,
    };
  }

  // SMS
  if (trimmed.startsWith('smsto:')) {
    const parts = trimmed.replace('smsto:', '').split(':');
    const phone = parts[0];
    const msg = parts.slice(1).join(':');
    return {
      type: 'SMS Message',
      displayTitle: `SMS to ${phone}`,
      summary: msg || 'Send text message',
      rawText: trimmed,
      actionLabel: 'Send SMS',
      actionUrl: `sms:${phone}`,
      copyableValue: phone,
    };
  }

  // Geo
  if (trimmed.startsWith('geo:')) {
    const coords = trimmed.replace('geo:', '').split('?')[0];
    return {
      type: 'Map Coordinates',
      displayTitle: `Location: ${coords}`,
      summary: 'Open in Map application',
      rawText: trimmed,
      actionLabel: 'Open in Maps',
      actionUrl: `https://maps.google.com/?q=${coords}`,
      copyableValue: coords,
    };
  }

  // Crypto
  if (/^(bitcoin|ethereum|solana|tether):/i.test(trimmed)) {
    const [scheme, rest] = trimmed.split(':');
    const [addr] = rest.split('?');
    return {
      type: `${scheme.toUpperCase()} Payment`,
      displayTitle: `${scheme.toUpperCase()}: ${addr.slice(0, 8)}...${addr.slice(-6)}`,
      summary: `Crypto wallet address: ${addr}`,
      rawText: trimmed,
      actionLabel: 'Copy Address',
      copyableValue: addr,
    };
  }

  // Plain Text / Generic
  return {
    type: 'Plain Text',
    displayTitle: trimmed.length > 50 ? trimmed.substring(0, 50) + '...' : trimmed,
    summary: `${trimmed.length} characters of plain text`,
    rawText: trimmed,
    actionLabel: 'Copy Text',
    copyableValue: trimmed,
  };
}
