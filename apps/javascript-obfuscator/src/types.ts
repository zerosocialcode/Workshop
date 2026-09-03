/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ObfuscationPreset = 'draft' | 'balanced' | 'industrial' | 'max_armor';

export type IdentifierNamesGenerator = 'hexadecimal' | 'mangled' | 'dictionary';

export type StringArrayEncoding = 'none' | 'base64' | 'rc4';

export interface ObfuscationOptions {
  seed: number;
  compact: boolean;
  controlFlowFlattening: boolean;
  controlFlowFlatteningThreshold: number; // 0.0 to 1.0
  deadCodeInjection: boolean;
  deadCodeInjectionThreshold: number; // 0.0 to 1.0
  debugProtection: boolean;
  debugProtectionInterval: number; // 0 or ms
  disableConsoleOutput: boolean;
  identifierNamesGenerator: IdentifierNamesGenerator;
  numbersToExpressions: boolean;
  renameGlobals: boolean;
  selfDefending: boolean;
  simplify: boolean;
  splitStrings: boolean;
  splitStringsChunkLength: number;
  stringArray: boolean;
  stringArrayCallsTransform: boolean;
  stringArrayCallsTransformThreshold: number;
  stringArrayEncoding: StringArrayEncoding[];
  stringArrayIndexesChaining: boolean;
  stringArrayIndexShift: boolean;
  stringArrayRotate: boolean;
  stringArrayShuffle: boolean;
  stringArrayThreshold: number; // 0.0 to 1.0
  transformObjectKeys: boolean;
  unicodeEscapeSequence: boolean;
  reservedNames: string[];
}

export interface ObfuscationMetrics {
  originalSize: number; // bytes
  obfuscatedSize: number; // bytes
  sizeRatio: number; // e.g. +240%
  originalLines: number;
  obfuscatedLines: number;
  originalEntropy: number; // Shannon entropy bits
  obfuscatedEntropy: number; // Shannon entropy bits
  coverageScore: number; // out of 10
  coverageRating: string; // e.g. "9.2/10 HIGH COVERAGE"
  stringTableEntriesCount: number;
  cffBlocksCount: number;
  transformationDurationMs: number;
  sha256Checksum: string;
}

export interface AstPassStage {
  id: string;
  name: string;
  codeName: string;
  description: string;
  active: boolean;
  sampleCodeSnippet: string;
}

export interface PreviewExecutionResult {
  status: 'idle' | 'running' | 'success' | 'failed' | 'mismatch' | 'timeout';
  originalLogs: string[];
  obfuscatedLogs: string[];
  originalResult: string;
  obfuscatedResult: string;
  originalTimeMs: number;
  obfuscatedTimeMs: number;
  error?: string;
  isEquivalent: boolean;
  isolated: boolean;
}

export interface ResistanceTestItem {
  id: string;
  name: string;
  targetVector: string;
  status: 'PASSED' | 'WARNING' | 'FAILED';
  description: string;
  findings: string;
}

export interface ResistanceReport {
  overallScore: number; // 0-100%
  grade: 'TIER-A' | 'TIER-B' | 'TIER-C' | 'TIER-D';
  items: ResistanceTestItem[];
  restringerResistance: string;
  staticEntropyLevel: string;
  originalStringsExtracted: number;
  totalOriginalStrings: number;
}

export interface SampleScript {
  id: string;
  name: string;
  category: string;
  code: string;
}
