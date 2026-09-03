/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ObfuscationOptions, ObfuscationPreset, SampleScript } from '../types';

export function generateRandomSeed(): number {
  return Math.floor(Math.random() * 9000000) + 1000000;
}

export const PRESET_CONFIGS: Record<ObfuscationPreset, ObfuscationOptions> = {
  draft: {
    seed: 1234567,
    compact: true,
    controlFlowFlattening: false,
    controlFlowFlatteningThreshold: 0,
    deadCodeInjection: false,
    deadCodeInjectionThreshold: 0,
    debugProtection: false,
    debugProtectionInterval: 0,
    disableConsoleOutput: false,
    identifierNamesGenerator: 'mangled',
    numbersToExpressions: false,
    renameGlobals: false,
    selfDefending: false,
    simplify: true,
    splitStrings: false,
    splitStringsChunkLength: 10,
    stringArray: false,
    stringArrayCallsTransform: false,
    stringArrayCallsTransformThreshold: 0,
    stringArrayEncoding: ['none'],
    stringArrayIndexesChaining: false,
    stringArrayIndexShift: false,
    stringArrayRotate: false,
    stringArrayShuffle: false,
    stringArrayThreshold: 0,
    transformObjectKeys: false,
    unicodeEscapeSequence: false,
    reservedNames: ['window', 'document', 'module', 'exports', 'require'],
  },
  balanced: {
    seed: 2345678,
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.45,
    deadCodeInjection: false,
    deadCodeInjectionThreshold: 0,
    debugProtection: false,
    debugProtectionInterval: 0,
    disableConsoleOutput: false,
    identifierNamesGenerator: 'hexadecimal',
    numbersToExpressions: true,
    renameGlobals: false,
    selfDefending: false,
    simplify: true,
    splitStrings: true,
    splitStringsChunkLength: 8,
    stringArray: true,
    stringArrayCallsTransform: true,
    stringArrayCallsTransformThreshold: 0.5,
    stringArrayEncoding: ['base64'],
    stringArrayIndexesChaining: true,
    stringArrayIndexShift: true,
    stringArrayRotate: true,
    stringArrayShuffle: true,
    stringArrayThreshold: 0.75,
    transformObjectKeys: true,
    unicodeEscapeSequence: false,
    reservedNames: ['window', 'document', 'module', 'exports', 'require'],
  },
  industrial: {
    seed: 3456789,
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.70, // Tuned for optimal resistance without bloated fingerprinting
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.35, // Modest threshold to defeat naive decompilers without bloat
    debugProtection: false,
    debugProtectionInterval: 0,
    disableConsoleOutput: false,
    identifierNamesGenerator: 'hexadecimal',
    numbersToExpressions: true,
    renameGlobals: false,
    selfDefending: true,
    simplify: true,
    splitStrings: true,
    splitStringsChunkLength: 6,
    stringArray: true,
    stringArrayCallsTransform: true,
    stringArrayCallsTransformThreshold: 0.75,
    stringArrayEncoding: ['rc4'],
    stringArrayIndexesChaining: true,
    stringArrayIndexShift: true,
    stringArrayRotate: true,
    stringArrayShuffle: true,
    stringArrayThreshold: 0.85,
    transformObjectKeys: true,
    unicodeEscapeSequence: true,
    reservedNames: ['window', 'document', 'module', 'exports', 'require'],
  },
  max_armor: {
    seed: 4567890,
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.75, // Layered sweet spot: resists static CFF unrollers without exponential size explosion
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.40, // Opaque predicates layered with CFF
    debugProtection: false, // Keep disabled by default in browser to prevent devtools freezing
    debugProtectionInterval: 0,
    disableConsoleOutput: false,
    identifierNamesGenerator: 'hexadecimal',
    numbersToExpressions: true,
    renameGlobals: true,
    selfDefending: true,
    simplify: true,
    splitStrings: true,
    splitStringsChunkLength: 5,
    stringArray: true,
    stringArrayCallsTransform: true,
    stringArrayCallsTransformThreshold: 0.9,
    stringArrayEncoding: ['rc4', 'base64'], // Multi-layer cipher: defeats single-pass string unpackers like restringer
    stringArrayIndexesChaining: true,
    stringArrayIndexShift: true,
    stringArrayRotate: true,
    stringArrayShuffle: true,
    stringArrayThreshold: 1.0,
    transformObjectKeys: true,
    unicodeEscapeSequence: true,
    reservedNames: ['window', 'document', 'module', 'exports', 'require'],
  },
};

export const COMMON_RESERVED_PRESETS: { name: string; items: string[] }[] = [
  {
    name: 'Browser DOM / Global',
    items: ['window', 'document', 'navigator', 'location', 'localStorage', 'sessionStorage', 'fetch', 'setTimeout', 'setInterval', 'console'],
  },
  {
    name: 'Node.js / CommonJS',
    items: ['module', 'exports', 'require', '__dirname', '__filename', 'process', 'global', 'Buffer'],
  },
  {
    name: 'Modern Web APIs',
    items: ['atob', 'btoa', 'crypto', 'SubtleCrypto', 'TextEncoder', 'TextDecoder', 'WebSocket', 'Worker'],
  },
  {
    name: 'React / Component Exports',
    items: ['default', 'Component', 'useState', 'useEffect', 'useCallback', 'useMemo', 'useRef', 'props'],
  },
];

export const SAMPLE_SCRIPTS: SampleScript[] = [
  {
    id: 'auth_jwt',
    name: 'AUTH_TOKEN_VERIFIER.JS',
    category: 'CRYPTOGRAPHY & SECURITY',
    code: `// Auth Token Verification & Scope Signature Engine
function verifyTokenSignature(token, secretKey) {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('INVALID_TOKEN_STRUCTURE');
  }

  const [headerB64, payloadB64, signature] = parts;
  const rawPayload = JSON.parse(atob(payloadB64));
  
  // Expiration boundary check
  const now = Math.floor(Date.now() / 1000);
  if (rawPayload.exp && rawPayload.exp < now) {
    return { valid: false, reason: 'TOKEN_EXPIRED', expiresAt: rawPayload.exp };
  }

  // Simulated HMAC SHA-256 Digest Verification
  let digest = 0x811c9dc5;
  const payloadStr = headerB64 + '.' + payloadB64 + ':' + secretKey;
  for (let i = 0; i < payloadStr.length; i++) {
    digest ^= payloadStr.charCodeAt(i);
    digest = Math.imul(digest, 0x01000193) >>> 0;
  }
  
  const computedSig = digest.toString(16).padStart(8, '0');
  const isValid = computedSig === signature;

  return {
    valid: isValid,
    userId: rawPayload.sub,
    roles: rawPayload.roles || ['anonymous'],
    issuedAt: rawPayload.iat,
    checksum: computedSig
  };
}

// Test harness execution
const sampleToken = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c3JfOGZkOTM4YTkiLCJyb2xlcyI6WyJhZG1pbiIsImRldmVsb3BlciJdLCJpYXQiOjE3MDk4MTAwMDAsImV4cCI6MjAwMDAwMDAwMH0.1a8c9b2f';
const verificationResult = verifyTokenSignature(sampleToken, 'super_secret_workshop_vault_key');
console.log('[SECURITY HARNESS] Verification Result:', JSON.stringify(verificationResult));
return verificationResult.valid ? 'TOKEN_AUTHENTICATED' : 'TOKEN_REJECTED';`,
  },
  {
    id: 'aes_cipher',
    name: 'KEY_DERIVATION_ENGINE.JS',
    category: 'ALGORITHMS & MATH',
    code: `// Key Derivation & S-Box Bitwise Transformation Routine
function deriveSubkeys(masterKey, rounds) {
  const sBox = [
    0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76,
    0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0
  ];

  const subkeys = [];
  let currentKey = 0;
  
  for (let i = 0; i < masterKey.length; i++) {
    currentKey = (currentKey << 5) - currentKey + masterKey.charCodeAt(i);
    currentKey |= 0;
  }

  for (let r = 0; r < rounds; r++) {
    const roundKey = [];
    for (let j = 0; j < 4; j++) {
      const idx = Math.abs((currentKey ^ (r * 31 + j * 7))) % sBox.length;
      const sVal = sBox[idx];
      const mixed = ((sVal << 3) | (sVal >>> 5)) ^ 0x5a;
      roundKey.push(mixed & 0xff);
    }
    subkeys.push('0x' + roundKey.map(b => b.toString(16).padStart(2, '0')).join(''));
    currentKey = (currentKey * 1664525 + 1013904223) | 0;
  }

  return subkeys;
}

const keys = deriveSubkeys('VAULT_STAMP_SECRET_2026', 8);
console.log('[CRYPTO] Derived 8-round subkeys:', keys.join(' :: '));
return keys;`,
  },
  {
    id: 'api_client',
    name: 'SECURE_GATEWAY_CLIENT.JS',
    category: 'NETWORKING & DATA',
    code: `// Secure API Gateway Dispatcher with In-Flight Tamper Defense
class SecureGatewayDispatcher {
  constructor(endpoint, clientId, apiSecret) {
    this.endpoint = endpoint;
    this.clientId = clientId;
    this.apiSecret = apiSecret;
    this.nonceCounter = 1000;
  }

  generateRequestHeaders(payload) {
    this.nonceCounter++;
    const timestamp = Date.now();
    const rawSignature = this.clientId + ':' + this.nonceCounter + ':' + timestamp + ':' + JSON.stringify(payload);
    
    // Hash signature calculation
    let hash = 5381;
    for (let i = 0; i < rawSignature.length; i++) {
      hash = ((hash << 5) + hash) + rawSignature.charCodeAt(i);
      hash = hash & hash;
    }

    return {
      'X-Client-Id': this.clientId,
      'X-Nonce': this.nonceCounter.toString(),
      'X-Timestamp': timestamp.toString(),
      'X-Signature-Digest': Math.abs(hash).toString(16)
    };
  }

  prepareTelemetry(sensorData) {
    const payload = {
      device: 'SPEC-R34-PROTOTYPE',
      readings: sensorData.map(v => Math.round(v * 100) / 100),
      status: 'OPERATIONAL'
    };

    const headers = this.generateRequestHeaders(payload);
    return {
      url: this.endpoint + '/v2/telemetry/stream',
      headers: headers,
      body: payload
    };
  }
}

const client = new SecureGatewayDispatcher('https://api.internal-workshop.corp', 'SPEC_AGENT_009', 'k89f023kd_92');
const requestPacket = client.prepareTelemetry([23.4, 45.1, 88.9, 12.0]);
console.log('[NETWORK DISPATCHER] Formatted Packet:', JSON.stringify(requestPacket));
return requestPacket.headers['X-Client-Id'] + ' // ' + requestPacket.headers['X-Signature-Digest'];`,
  },
  {
    id: 'license_validator',
    name: 'LICENSE_KEY_VALIDATOR.JS',
    category: 'LICENSING & ENTITLEMENTS',
    code: `// Hardware-Bound License Key Entitlement Validator
function validateLicenseKey(licenseKey, machineHardwareId) {
  // Expected format: WKS-XXXX-XXXX-XXXX-XXXX
  const pattern = /^WKS-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  if (!pattern.test(licenseKey)) {
    return { valid: false, code: 'ERR_INVALID_LICENSE_FORMAT' };
  }

  const chunks = licenseKey.split('-').slice(1);
  const rawSum = chunks.reduce((acc, chunk) => {
    let chunkVal = 0;
    for (let i = 0; i < chunk.length; i++) {
      chunkVal += chunk.charCodeAt(i);
    }
    return acc + chunkVal;
  }, 0);

  // Compute Machine Fingerprint Hash
  let hwChecksum = 0;
  for (let i = 0; i < machineHardwareId.length; i++) {
    hwChecksum = (hwChecksum + machineHardwareId.charCodeAt(i) * 17) % 9999;
  }

  const tier = (rawSum % 3 === 0) ? 'ENTERPRISE_UNLIMITED' : (rawSum % 2 === 0 ? 'PROFESSIONAL' : 'COMMUNITY');
  const valid = (rawSum > 1000);

  return {
    valid: valid,
    tier: tier,
    entitlements: ['AST_OBFUSCATION_PASS_10', 'CONTROL_FLOW_FLATTEN', 'RC4_STRING_ENCRYPT'],
    machineBinding: machineHardwareId,
    fingerprintValid: hwChecksum > 0
  };
}

const result = validateLicenseKey('WKS-89FA-31BC-72ED-4009', 'HWID_MAC_88_4F_12_9A_00');
console.log('[LICENSE] Evaluation:', JSON.stringify(result));
return result;`,
  },
];
