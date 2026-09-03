export type QRContentType =
  | 'url'
  | 'text'
  | 'wifi'
  | 'vcard'
  | 'email'
  | 'sms'
  | 'phone'
  | 'whatsapp'
  | 'location'
  | 'event'
  | 'crypto'
  | 'social'
  | 'appstore';

export type MainTab = 'qr' | 'barcode' | 'batch' | 'scan' | 'templates' | 'history';

export type DotType =
  | 'square'
  | 'dots'
  | 'rounded'
  | 'extra-rounded'
  | 'classy'
  | 'classy-rounded';

export type CornerSquareType = 'square' | 'dot' | 'extra-rounded' | 'classy';
export type CornerDotType = 'square' | 'dot';

export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

export type GradientType = 'none' | 'linear' | 'radial';

export interface ColorConfig {
  type: GradientType;
  color1: string;
  color2: string;
  rotation: number; // degrees
}

export type FrameType =
  | 'none'
  | 'bottom-banner'
  | 'top-banner'
  | 'polaroid'
  | 'pill'
  | 'badge'
  | 'bubble';

export interface FrameConfig {
  type: FrameType;
  text: string;
  subtext?: string;
  bgColor: string;
  textColor: string;
  fontFamily: string;
  fontSize: number;
}

export interface LogoConfig {
  src: string | null;
  presetIcon?: string | null;
  size: number; // 0.15 to 0.4
  margin: number;
  backgroundColor: string; // 'transparent' or '#ffffff' etc.
  borderRadius: number;
  hideBackgroundDots: boolean;
}

export interface QRStyleConfig {
  // Dots
  dotType: DotType;
  dotColor: ColorConfig;
  // Corner Eyes
  cornerSquareType: CornerSquareType;
  cornerSquareColor: string;
  cornerDotType: CornerDotType;
  cornerDotColor: string;
  // Background
  backgroundColor: string;
  isTransparent: boolean;
  // Dimensions & Quality
  margin: number;
  errorCorrectionLevel: ErrorCorrectionLevel;
  resolution: number; // px size for export (512, 1024, 2048, 4096)
  // Logo
  logo: LogoConfig;
  // Frame / CTA
  frame: FrameConfig;
}

export type BarcodeFormat =
  | 'CODE128'
  | 'EAN13'
  | 'EAN8'
  | 'UPC'
  | 'CODE39'
  | 'ITF14'
  | 'MSI'
  | 'pharmacode'
  | 'codabar';

export type BarcodeSymbology = BarcodeFormat;

export interface BarcodeConfig {
  format: BarcodeFormat;
  value: string;
  displayValue: boolean;
  lineColor: string;
  background: string;
  width: number;
  height: number;
  margin: number;
  fontSize: number;
  textMargin: number;
  textAlign: 'left' | 'center' | 'right';
  textPosition: 'bottom' | 'top';
  font?: string;
  fontOptions?: string;
}

// Content Payload Forms
export interface UrlPayload {
  url: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export interface WifiPayload {
  ssid: string;
  password: string;
  encryption: 'WPA' | 'WEP' | 'WPA3' | 'nopass';
  hidden: boolean;
}

export interface VCardPayload {
  firstName: string;
  lastName: string;
  organization: string;
  title: string;
  phone: string;
  mobile: string;
  email: string;
  website: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  note: string;
}

export interface EmailPayload {
  email: string;
  subject: string;
  body: string;
}

export interface SmsPayload {
  phone: string;
  message: string;
}

export interface PhonePayload {
  phone: string;
}

export interface WhatsAppPayload {
  countryCode: string;
  phone: string;
  message: string;
}

export interface LocationPayload {
  latitude: string;
  longitude: string;
  query?: string;
}

export interface EventPayload {
  title: string;
  location: string;
  description: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  allDay: boolean;
}

export interface CryptoPayload {
  currency: 'bitcoin' | 'ethereum' | 'solana' | 'usdt' | 'litecoin';
  address: string;
  amount: string;
  label: string;
  message: string;
}

export interface SocialPayload {
  platform:
    | 'instagram'
    | 'twitter'
    | 'youtube'
    | 'tiktok'
    | 'linkedin'
    | 'facebook'
    | 'github'
    | 'telegram'
    | 'discord'
    | 'spotify';
  username: string;
}

export interface AppStorePayload {
  iosAppId: string;
  androidPackage: string;
  fallbackUrl: string;
}

export interface QRDataState {
  type: QRContentType;
  url: UrlPayload;
  text: string;
  wifi: WifiPayload;
  vcard: VCardPayload;
  email: EmailPayload;
  sms: SmsPayload;
  phone: PhonePayload;
  whatsapp: WhatsAppPayload;
  location: LocationPayload;
  event: EventPayload;
  crypto: CryptoPayload;
  social: SocialPayload;
  appstore: AppStorePayload;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  category: 'qr' | 'barcode';
  title: string;
  type: string;
  rawPayload: string;
  previewDataUrl?: string;
  favorite?: boolean;
}

export interface StylePreset {
  id: string;
  name: string;
  description: string;
  badge?: string;
  config: Partial<QRStyleConfig>;
}

export interface BatchItem {
  id: string;
  content: string;
  filename: string;
  status: 'idle' | 'generating' | 'ready' | 'error';
  dataUrl?: string;
  error?: string;
}
