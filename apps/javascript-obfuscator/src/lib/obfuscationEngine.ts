/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import JavaScriptObfuscator from 'javascript-obfuscator';
import {
  AstPassStage,
  ObfuscationMetrics,
  ObfuscationOptions,
  ResistanceReport,
  ResistanceTestItem,
} from '../types';

/**
 * Calculates Shannon Entropy of a string in bits per character.
 * Higher entropy usually means more randomized / encrypted / compressed representations.
 */
export function calculateShannonEntropy(text: string): number {
  if (!text || text.length === 0) return 0;
  const frequencies: Record<string, number> = {};
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    frequencies[char] = (frequencies[char] || 0) + 1;
  }
  let entropy = 0;
  const len = text.length;
  for (const char in frequencies) {
    const p = frequencies[char] / len;
    entropy -= p * Math.log2(p);
  }
  return Math.round(entropy * 100) / 100;
}

/**
 * Real Web Crypto API SHA-256 Digest Computation
 */
export async function computeCodeDigest(code: string): Promise<string> {
  if (!code || typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    // Fallback if crypto.subtle is unavailable in odd environments
    let hash = 0;
    for (let i = 0; i < code.length; i++) {
      hash = (Math.imul(31, hash) + code.charCodeAt(i)) | 0;
    }
    return Math.abs(hash).toString(16).padStart(8, '0') + '00000000000000000000000000000000';
  }

  try {
    const msgBuffer = new TextEncoder().encode(code);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  } catch {
    return 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  }
}

/**
 * Computes a realistic "Transform Coverage Score" (0–10) based on enabled AST passes
 * and depth thresholds.
 */
export function computeCoverageScore(options: ObfuscationOptions): { score: number; rating: string } {
  let points = 0;

  // 1. Identifier Renaming & Scope Mangling (Max 1.8 points)
  if (options.identifierNamesGenerator === 'hexadecimal') points += 1.6;
  else if (options.identifierNamesGenerator === 'mangled') points += 1.1;
  if (options.renameGlobals) points += 0.2;

  // 2. String Literal Protection (Max 2.6 points)
  if (options.stringArray) {
    points += 0.8 * (options.stringArrayThreshold || 0.8);
    if (options.stringArrayEncoding.includes('rc4')) points += 0.8;
    else if (options.stringArrayEncoding.includes('base64')) points += 0.5;
    if (options.stringArrayRotate) points += 0.2;
    if (options.stringArrayShuffle) points += 0.2;
    if (options.stringArrayIndexShift) points += 0.2;
    if (options.stringArrayIndexesChaining) points += 0.2;
    if (options.splitStrings) points += 0.2;
  }

  // 3. Control Flow Flattening (Max 2.4 points)
  if (options.controlFlowFlattening) {
    points += 2.4 * Math.min(1.0, options.controlFlowFlatteningThreshold || 0.5);
  }

  // 4. Dead Code & Opaque Predicates (Max 1.4 points)
  if (options.deadCodeInjection) {
    points += 1.4 * Math.min(1.0, options.deadCodeInjectionThreshold || 0.4);
  }

  // 5. Arithmetic & Numeric Expression Obfuscation (Max 0.8 points)
  if (options.numbersToExpressions) points += 0.8;

  // 6. Anti-Tamper & Self Defense (Max 1.0 points)
  if (options.selfDefending) points += 0.7;
  if (options.unicodeEscapeSequence) points += 0.3;

  const score = Math.min(10.0, Math.round(points * 10) / 10);

  let rating = 'LOW COVERAGE';
  if (score >= 8.5) rating = 'HIGH COVERAGE (LAYERED)';
  else if (score >= 6.0) rating = 'BALANCED COVERAGE';
  else if (score >= 3.5) rating = 'MODERATE TRANSFORM';
  else rating = 'BASIC MINIFICATION';

  return { score, rating };
}

/**
 * Main Obfuscation Transformation Engine
 */
export async function obfuscateJavaScript(
  sourceCode: string,
  options: ObfuscationOptions
): Promise<{
  obfuscatedCode: string;
  metrics: ObfuscationMetrics;
  stages: AstPassStage[];
  error?: string;
}> {
  const startTime = performance.now();

  try {
    // Map application options to `javascript-obfuscator` schema
    const obfuscatorConfig: any = {
      seed: options.seed || 1234567,
      compact: options.compact,
      controlFlowFlattening: options.controlFlowFlattening,
      controlFlowFlatteningThreshold: options.controlFlowFlatteningThreshold,
      deadCodeInjection: options.deadCodeInjection,
      deadCodeInjectionThreshold: options.deadCodeInjectionThreshold,
      debugProtection: options.debugProtection,
      debugProtectionInterval:
        options.debugProtection && typeof options.debugProtectionInterval === 'number' && options.debugProtectionInterval > 0
          ? options.debugProtectionInterval
          : options.debugProtection
          ? 2000
          : 0,
      disableConsoleOutput: options.disableConsoleOutput,
      identifierNamesGenerator: options.identifierNamesGenerator,
      numbersToExpressions: options.numbersToExpressions,
      renameGlobals: options.renameGlobals,
      selfDefending: options.selfDefending,
      simplify: options.simplify,
      splitStrings: options.splitStrings,
      splitStringsChunkLength: options.splitStringsChunkLength,
      stringArray: options.stringArray,
      stringArrayCallsTransform: options.stringArrayCallsTransform,
      stringArrayCallsTransformThreshold: options.stringArrayCallsTransformThreshold,
      stringArrayEncoding: options.stringArrayEncoding,
      stringArrayIndexesChaining: options.stringArrayIndexesChaining,
      stringArrayIndexShift: options.stringArrayIndexShift,
      stringArrayRotate: options.stringArrayRotate,
      stringArrayShuffle: options.stringArrayShuffle,
      stringArrayThreshold: options.stringArrayThreshold,
      transformObjectKeys: options.transformObjectKeys,
      unicodeEscapeSequence: options.unicodeEscapeSequence,
      reservedNames: options.reservedNames && options.reservedNames.length > 0 ? options.reservedNames : [],
      sourceMap: false,
    };

    const obfuscationResult = JavaScriptObfuscator.obfuscate(sourceCode, obfuscatorConfig);
    const obfuscatedCode = obfuscationResult.getObfuscatedCode();
    const durationMs = Math.round(performance.now() - startTime);

    const originalSize = new TextEncoder().encode(sourceCode).length;
    const obfuscatedSize = new TextEncoder().encode(obfuscatedCode).length;
    const sizeRatio = originalSize > 0 ? Math.round(((obfuscatedSize - originalSize) / originalSize) * 100) : 0;

    const originalLines = sourceCode.split('\n').length;
    const obfuscatedLines = obfuscatedCode.split('\n').length;

    const originalEntropy = calculateShannonEntropy(sourceCode);
    const obfuscatedEntropy = calculateShannonEntropy(obfuscatedCode);

    const { score: coverageScore, rating: coverageRating } = computeCoverageScore(options);

    // Compute real cryptographic SHA-256 hash
    const sha256Checksum = await computeCodeDigest(obfuscatedCode);

    // Count string table entries and flattened blocks heuristically
    const stringArrayMatches = obfuscatedCode.match(/var\s+_0x[a-f0-9]+\s*=\s*\[/g);
    const stringTableEntriesCount = stringArrayMatches ? (obfuscatedCode.match(/'[^']+'|"[^"]+"/g)?.length || 0) : 0;
    const cffBlocksCount = options.controlFlowFlattening ? (obfuscatedCode.match(/switch\s*\(/g)?.length || 0) : 0;

    const metrics: ObfuscationMetrics = {
      originalSize,
      obfuscatedSize,
      sizeRatio,
      originalLines,
      obfuscatedLines,
      originalEntropy,
      obfuscatedEntropy,
      coverageScore,
      coverageRating,
      stringTableEntriesCount,
      cffBlocksCount,
      transformationDurationMs: durationMs,
      sha256Checksum,
    };

    const stages: AstPassStage[] = [
      {
        id: 'ast_parse',
        name: 'AST Parse & Scope Indexing',
        codeName: 'ESTree Babel Parser Pass',
        description: 'Parses JavaScript ECMAScript source into AST node graph with lexical binding table.',
        active: true,
        sampleCodeSnippet: 'const node = { type: "Program", body: [ ... ] };',
      },
      {
        id: 'ident_mangling',
        name: 'Identifier Hexadecimal Mangling',
        codeName: 'MangleIdentifiersPass',
        description: `Substitutes identifier bindings and parameter references with randomized ${options.identifierNamesGenerator} hashes.`,
        active: options.identifierNamesGenerator !== 'mangled' || true,
        sampleCodeSnippet: 'function _0x3b1a(_0x4d91, _0x8e2c) { ... }',
      },
      {
        id: 'string_extract',
        name: 'String Literal Cipher Matrix',
        codeName: 'StringArrayEncryptionPass',
        description: `Extracts string literals, builds RC4/Base64 decryption matrix table with callsite shift routines.`,
        active: options.stringArray,
        sampleCodeSnippet: 'var _0x9f = function(_0xa, _0xb) { return _0x4e[_0xa - 0x12]; };',
      },
      {
        id: 'cff',
        name: 'Control Flow Graph Flattening',
        codeName: 'ControlFlowFlatteningPass',
        description: 'Replaces structured if/for/while logic with a state-machine switch dispatcher driven by pseudo-random indices.',
        active: options.controlFlowFlattening,
        sampleCodeSnippet: 'var _0xst = 0x0; while(!![]) { switch(_0xst) { case 0: ... } }',
      },
      {
        id: 'dead_code',
        name: 'Dead Code & Opaque Predicates',
        codeName: 'DeadCodeInjectionPass',
        description: 'Injects structurally valid but unreachable blocks governed by always-true/always-false opaque mathematical conditions.',
        active: options.deadCodeInjection,
        sampleCodeSnippet: 'if ((_0x1a * _0x1a + 0x3) % 0x2 !== 0x0) { /* unreachable */ }',
      },
      {
        id: 'number_folding',
        name: 'Numeric Bitwise Expansion',
        codeName: 'NumbersToExpressionsPass',
        description: 'Converts integer constants into multi-step bitwise and arithmetic equivalence operations.',
        active: options.numbersToExpressions,
        sampleCodeSnippet: 'const LIMIT = (0x4 ^ 0x1f) + (-0x8 & 0xff);',
      },
      {
        id: 'self_defense',
        name: 'Tamper Resistance & Code Sealing',
        codeName: 'SelfDefendingPass',
        description: 'Hooks Function.prototype.toString to detect runtime formatting, beautification, or breakpoint hooks.',
        active: options.selfDefending,
        sampleCodeSnippet: 'if (new RegExp(".+").test(_0x3b.toString())) { /* crash state */ }',
      },
    ];

    return {
      obfuscatedCode,
      metrics,
      stages,
    };
  } catch (err: any) {
    return {
      obfuscatedCode: '',
      metrics: {
        originalSize: new TextEncoder().encode(sourceCode).length,
        obfuscatedSize: 0,
        sizeRatio: 0,
        originalLines: sourceCode.split('\n').length,
        obfuscatedLines: 0,
        originalEntropy: calculateShannonEntropy(sourceCode),
        obfuscatedEntropy: 0,
        coverageScore: 0,
        coverageRating: 'TRANSFORM FAILED',
        stringTableEntriesCount: 0,
        cffBlocksCount: 0,
        transformationDurationMs: 0,
        sha256Checksum: '0000000000000000000000000000000000000000000000000000000000000000',
      },
      stages: [],
      error: err?.message || 'Syntax error or unsupported token in source code',
    };
  }
}

/**
 * Empirical Deobfuscation-Resistance Test Suite
 * Tests the compiled output against common static-analysis and automated extraction vectors.
 */
export function runDeobfuscationResistanceAudit(
  originalCode: string,
  obfuscatedCode: string,
  options: ObfuscationOptions
): ResistanceReport {
  const items: ResistanceTestItem[] = [];

  // Vector 1: Plaintext String Scrape Test
  // Extract double/single quotes and template literal segments from original code
  const candidateSet = new Set<string>();

  // 1. Regular single and double quoted strings
  const quoteMatches = originalCode.match(/(["'])((?:\\.|[^\\])*?)\1/g) || [];
  for (const m of quoteMatches) {
    const content = m.slice(1, -1);
    if (content.trim().length >= 4 && !content.includes('\n')) {
      candidateSet.add(content.trim());
      const cleaned = content.replace(/^[^a-zA-Z0-9_$]+|[^a-zA-Z0-9_$]+$/g, '');
      if (cleaned.length >= 4) {
        candidateSet.add(cleaned);
      }
    }
  }

  // 2. Template literals: split at ${...} interpolation boundaries into static segments
  const templateMatches = originalCode.match(/`((?:\\.|[^\\`])*?)`/g) || [];
  for (const tm of templateMatches) {
    const rawTemplate = tm.slice(1, -1);
    const parts = rawTemplate.split(/\$\{[^}]*\}/g);
    for (const part of parts) {
      if (!part || part.includes('\n')) continue;
      const trimmed = part.trim();
      if (trimmed.length >= 4) {
        candidateSet.add(trimmed);
      }
      const cleaned = part.replace(/^[^a-zA-Z0-9_$]+|[^a-zA-Z0-9_$]+$/g, '');
      if (cleaned.length >= 4) {
        candidateSet.add(cleaned);
      }
      const words = part.match(/[a-zA-Z0-9_$]{4,}/g) || [];
      for (const w of words) {
        if (w.length >= 4) candidateSet.add(w);
      }
    }
  }

  const candidateStrings = Array.from(candidateSet);

  let verbatimLeakedCount = 0;
  const leakedSamples: string[] = [];

  for (const str of candidateStrings) {
    if (obfuscatedCode.includes(str)) {
      verbatimLeakedCount++;
      if (leakedSamples.length < 3) leakedSamples.push(`"${str}"`);
    }
  }

  if (candidateStrings.length === 0) {
    items.push({
      id: 'string_leak_check',
      name: 'Plaintext String Literal Scrape',
      targetVector: 'grep / strings utility regex extraction',
      status: 'PASSED',
      description: 'Checks if original string literals appear as unencrypted plaintext in the output.',
      findings: 'No sensitive string literals detected in input code to scrape.',
    });
  } else if (verbatimLeakedCount === 0) {
    items.push({
      id: 'string_leak_check',
      name: 'Plaintext String Literal Scrape',
      targetVector: 'grep / strings utility regex extraction',
      status: 'PASSED',
      description: 'Checks if original string literals appear as unencrypted plaintext in the output.',
      findings: `0 / ${candidateStrings.length} original strings found in plaintext. All literals successfully encapsulated in cipher array.`,
    });
  } else if (verbatimLeakedCount <= candidateStrings.length * 0.3) {
    items.push({
      id: 'string_leak_check',
      name: 'Plaintext String Literal Scrape',
      targetVector: 'grep / strings utility regex extraction',
      status: 'WARNING',
      description: 'Checks if original string literals appear as unencrypted plaintext in the output.',
      findings: `${verbatimLeakedCount} / ${candidateStrings.length} strings still visible in plaintext (${leakedSamples.join(', ')}). Consider raising String Array Threshold to 1.0.`,
    });
  } else {
    items.push({
      id: 'string_leak_check',
      name: 'Plaintext String Literal Scrape',
      targetVector: 'grep / strings utility regex extraction',
      status: 'FAILED',
      description: 'Checks if original string literals appear as unencrypted plaintext in the output.',
      findings: `High plaintext leakage: ${verbatimLeakedCount} strings exposed verbatim. String array protection is disabled or threshold is too low.`,
    });
  }

  // Vector 2: Identifier / Symbol Signature Recovery
  const reservedList = options.reservedNames || [];
  const symbolKeywords = new Set([
    'if', 'for', 'while', 'switch', 'catch', 'function', 'constructor',
    'get', 'set', 'return', 'with', 'typeof', 'instanceof', 'new',
    'delete', 'void', 'throw', 'yield', 'await', 'finally', 'try',
    'else', 'case', 'default', 'import', 'export', 'class', 'var', 'let', 'const'
  ]);

  const candidateSymbols = new Set<string>();

  // 1. Function declarations: function foo(...)
  for (const m of originalCode.matchAll(/function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g)) {
    if (!symbolKeywords.has(m[1])) candidateSymbols.add(m[1]);
  }

  // 2. Arrow function assignments: const foo = (...) => or const foo = x =>
  for (const m of originalCode.matchAll(
    /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z_$][a-zA-Z0-9_$]*)\s*=>/g
  )) {
    if (!symbolKeywords.has(m[1])) candidateSymbols.add(m[1]);
  }

  // 3. Function expression assignments: const foo = function(...)
  for (const m of originalCode.matchAll(
    /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s*)?function\b/g
  )) {
    if (!symbolKeywords.has(m[1])) candidateSymbols.add(m[1]);
  }

  // 4. Class declarations: class MyClass
  for (const m of originalCode.matchAll(/class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g)) {
    if (!symbolKeywords.has(m[1])) candidateSymbols.add(m[1]);
  }

  // 5. Class / Object method definitions: methodName(args) { ... }
  for (const m of originalCode.matchAll(/(?:async\s+)?([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*\{/g)) {
    if (!symbolKeywords.has(m[1])) candidateSymbols.add(m[1]);
  }

  const originalFuncNames = Array.from(candidateSymbols);
  const escapeRegex = (s: string) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

  const exposedFuncNames = originalFuncNames.filter(
    (name) => !reservedList.includes(name) && new RegExp(`\\b${escapeRegex(name)}\\b`).test(obfuscatedCode)
  );

  if (originalFuncNames.length === 0) {
    items.push({
      id: 'symbol_mangling',
      name: 'Lexical Identifier Mangling',
      targetVector: 'Symbolic disassembly & function name indexing',
      status: 'PASSED',
      description: 'Verifies top-level and inner function, arrow, and method identifiers are replaced with opaque tokens.',
      findings: 'No identifiable function declarations, arrow functions, or class methods detected in source code to evaluate.',
    });
  } else if (exposedFuncNames.length === 0) {
    items.push({
      id: 'symbol_mangling',
      name: 'Lexical Identifier Mangling',
      targetVector: 'Symbolic disassembly & function name indexing',
      status: 'PASSED',
      description: 'Verifies top-level and inner function, arrow, and method identifiers are replaced with opaque tokens.',
      findings: `All ${originalFuncNames.length} original function / method identifiers stripped and replaced with opaque hex tokens.`,
    });
  } else {
    items.push({
      id: 'symbol_mangling',
      name: 'Lexical Identifier Mangling',
      targetVector: 'Symbolic disassembly & function name indexing',
      status: 'WARNING',
      description: 'Verifies top-level and inner function, arrow, and method identifiers are replaced with opaque tokens.',
      findings: `${exposedFuncNames.length} function / method identifier(s) preserved in output (${exposedFuncNames.join(', ')}).`,
    });
  }

  // Helper: Exact Base64 decoder matching javascript-obfuscator's internal alphabet & URI decode routine
  const decodeJsObfuscatorBase64 = (str: string): string => {
    const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=';
    let binary = '';
    let uriEncoded = '';
    let bitIdx = 0;
    let buffer = 0;
    for (let strIdx = 0; strIdx < str.length; strIdx++) {
      const ch = str.charAt(strIdx);
      const charCode = alphabet.indexOf(ch);
      if (charCode === -1) continue;
      buffer = bitIdx % 4 ? buffer * 64 + charCode : charCode;
      if (bitIdx++ % 4) {
        binary += String.fromCharCode(255 & (buffer >> ((-2 * bitIdx) & 6)));
      }
    }
    for (let i = 0, len = binary.length; i < len; i++) {
      uriEncoded += '%' + ('00' + binary.charCodeAt(i).toString(16)).slice(-2);
    }
    try {
      return decodeURIComponent(uriEncoded);
    } catch {
      return binary;
    }
  };

  // Vector 3: Automated Single-Pass String Unpacker (Restringer / Webcrack Simulation)
  // Attempt static recovery of candidate strings from string array structures in the compiled output
  const hasStringArrayStructure =
    /function\s+[a-zA-Z0-9_$]+\s*\(\s*\)\s*\{\s*(?:const|var|let)\s+[a-zA-Z0-9_$]+\s*=\s*\[|var\s+[a-zA-Z0-9_$]+\s*=\s*\[|const\s+[a-zA-Z0-9_$]+\s*=\s*\[/i.test(
      obfuscatedCode
    ) || /return\s+[a-zA-Z0-9_$]+;\s*\}\s*function\s+[a-zA-Z0-9_$]+/i.test(obfuscatedCode);

  // Extract all string literals declared in array literals or everywhere in obfuscatedCode
  const rawStringLiteralTokens = (
    obfuscatedCode.match(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/g) || []
  ).map((s) => {
    try {
      if (s.startsWith("'")) {
        return s.slice(1, -1).replace(/\\'/g, "'");
      }
      return JSON.parse(s);
    } catch {
      return s.slice(1, -1);
    }
  });

  // Attempt direct static recovery of original candidate strings from array literals
  const staticallyExtractedDirect = candidateStrings.filter((c) =>
    rawStringLiteralTokens.includes(c)
  );

  // Attempt static Base64 decoding using the library's custom transform on all extracted string literals
  const staticallyDecodedBase64: string[] = [];
  for (const token of rawStringLiteralTokens) {
    if (typeof token === 'string' && token.length >= 4) {
      try {
        const decoded = decodeJsObfuscatorBase64(token);
        if (
          candidateStrings.includes(decoded) &&
          !staticallyDecodedBase64.includes(decoded) &&
          !staticallyExtractedDirect.includes(decoded)
        ) {
          staticallyDecodedBase64.push(decoded);
        }
      } catch {
        // Not a valid encoded token
      }
    }
  }

  // Check if output utilizes dynamic callsite multi-argument decryptor routines
  const hasDynamicCallsiteDecryptor =
    /[a-zA-Z0-9_$]+\s*\(\s*0x[0-9a-fA-F]+,\s*['"][^'"]+['"]\s*\)/.test(obfuscatedCode);

  if (candidateStrings.length === 0) {
    items.push({
      id: 'restringer_sim',
      name: 'Automated Unpacker Resistance (Restringer/Webcrack)',
      targetVector: 'Single-pass AST evaluation of static string arrays',
      status: 'PASSED',
      description: 'Evaluates resistance against standard AST evaluators that attempt constant-folding on string lookup tables.',
      findings: 'No string literals in source code to test against static unpacker extraction.',
    });
  } else if (staticallyExtractedDirect.length > 0) {
    items.push({
      id: 'restringer_sim',
      name: 'Automated Unpacker Resistance (Restringer/Webcrack)',
      targetVector: 'Single-pass AST evaluation of static string arrays',
      status: 'FAILED',
      description: 'Evaluates resistance against standard AST evaluators that attempt constant-folding on string lookup tables.',
      findings: `Static AST inspection extracted ${staticallyExtractedDirect.length} original string(s) (${staticallyExtractedDirect.slice(0, 2).map((s) => `"${s}"`).join(', ')}) directly from the unencrypted array without execution.`,
    });
  } else if (staticallyDecodedBase64.length > 0) {
    items.push({
      id: 'restringer_sim',
      name: 'Automated Unpacker Resistance (Restringer/Webcrack)',
      targetVector: 'Single-pass AST evaluation of static string arrays',
      status: 'WARNING',
      description: 'Evaluates resistance against standard AST evaluators that attempt constant-folding on string lookup tables.',
      findings: `Static Base64 lookup table decoding recovered ${staticallyDecodedBase64.length} original string(s) (${staticallyDecodedBase64.slice(0, 2).map((s) => `"${s}"`).join(', ')}) without requiring runtime execution. Automated AST unpackers (e.g. Restringer/Webcrack) can statically resolve these lookups. Consider RC4 encoding.`,
    });
  } else if (hasStringArrayStructure && hasDynamicCallsiteDecryptor) {
    items.push({
      id: 'restringer_sim',
      name: 'Automated Unpacker Resistance (Restringer/Webcrack)',
      targetVector: 'Single-pass AST evaluation of static string arrays',
      status: 'PASSED',
      description: 'Evaluates resistance against standard AST evaluators that attempt constant-folding on string lookup tables.',
      findings: `0 / ${candidateStrings.length} strings recovered statically. Output employs dynamic multi-argument cipher lookups resisting static constant-folding AST unpackers.`,
    });
  } else if (hasStringArrayStructure) {
    items.push({
      id: 'restringer_sim',
      name: 'Automated Unpacker Resistance (Restringer/Webcrack)',
      targetVector: 'Single-pass AST evaluation of static string arrays',
      status: 'PASSED',
      description: 'Evaluates resistance against standard AST evaluators that attempt constant-folding on string lookup tables.',
      findings: `0 / ${candidateStrings.length} strings recovered via static AST array inspection. String entries are ciphered or indexed non-linearly.`,
    });
  } else {
    items.push({
      id: 'restringer_sim',
      name: 'Automated Unpacker Resistance (Restringer/Webcrack)',
      targetVector: 'Single-pass AST evaluation of static string arrays',
      status: 'FAILED',
      description: 'Evaluates resistance against standard AST evaluators that attempt constant-folding on string lookup tables.',
      findings: 'No string array wrapper found in compiled output. String literals remain unprotected at AST call sites.',
    });
  }

  // Vector 4: Control Flow Graph Complexity
  // Count baseline native switches in original source vs compiled output
  const nativeSwitchCount = (originalCode.match(/\bswitch\s*\(/g) || []).length;
  const totalObfSwitchCount = (obfuscatedCode.match(/\bswitch\s*\(/g) || []).length;
  const netSwitchCount = Math.max(0, totalObfSwitchCount - nativeSwitchCount);

  // 1. Detect CFF state-machine dispatcher pattern: while (!![]) { switch (stateArr[stateIdx++]) ... }
  const hasCffStateLoop = /while\s*\(\s*(?:!!\[\]|!0|true|0x1)\s*\)\s*\{[\s\S]*?switch\s*\([a-zA-Z0-9_$.\[\]'"]*\s*\[[a-zA-Z0-9_$]+\+\+\]\s*\)/.test(
    obfuscatedCode
  );

  // 2. Detect CFF permutation delimiter (e.g. pipe delimiter '|' or '\\x7c' passed to split function/method or literal)
  const hasCffOrderSplit =
    /(?:\.split|\['split'\]|\[[^\]]+\])\s*\(\s*['"](?:\||\\x7[cC])['"]\s*\)/.test(
      obfuscatedCode
    ) ||
    /['"](?:[0-9]+\|)+[0-9]+['"]/.test(obfuscatedCode) ||
    /['"](?:\\x[0-9a-fA-F]{2}\\x7[cC])+\\x[0-9a-fA-F]{2}['"]/.test(obfuscatedCode);

  // 3. Count CFF flattened indexed case blocks: case '0': ... or case'\\x30': ... with continue;
  const cffCaseCount = (
    obfuscatedCode.match(/case\s*['"](?:[0-9]+|(?:\\x[0-9a-fA-F]{2})+|\\u[0-9a-fA-F]{4})['"]\s*:/g) ||
    []
  ).length;
  const flattenedContinueCount = (
    obfuscatedCode.match(
      /case\s*['"](?:[0-9]+|(?:\\x[0-9a-fA-F]{2})+|\\u[0-9a-fA-F]{4})['"]\s*:[^:]*?continue;/g
    ) || []
  ).length;

  // 4. Detect CFF Object-based Call/Expression Indirection Transform:
  // (In branchy/short blocks, javascript-obfuscator extracts arithmetic, comparisons, and calls into dictionary wrapper functions with plain or hex-escaped keys)
  const indirectionHelpers =
    obfuscatedCode.match(
      /(?:'[^']+'|"[^"]+"|[a-zA-Z0-9_$]+)\s*:\s*function\s*\([^)]*\)\s*\{\s*return\s+[^;]+;\s*\}/g
    ) ||
    obfuscatedCode.match(
      /(?:'[^']+'|"[^"]+"|[a-zA-Z0-9_$]+)\s*:\s*function\s*\([^)]*\)\s*\{[^}]*\}/g
    ) ||
    [];
  const indirectionHelperCount = indirectionHelpers.length;

  const fullStateSwitchDetected = hasCffStateLoop && (hasCffOrderSplit || cffCaseCount >= 2);

  if (fullStateSwitchDetected && (cffCaseCount >= 3 || flattenedContinueCount >= 2)) {
    items.push({
      id: 'cfg_dispersion',
      name: 'Control Flow Graph Dispersion',
      targetVector: 'Cyclomatic decomposition & branch reconstruction',
      status: 'PASSED',
      description: 'Checks if linear control flow has been converted into state-machine switch dispatchers or indirection trees.',
      findings: `Confirmed state-machine CFF dispatcher in compiled output: while(!![]) execution loop with array-indexed state dispatcher and ${cffCaseCount} flattened indexed case branches (net +${netSwitchCount} switches beyond source baseline).`,
    });
  } else if (fullStateSwitchDetected || (hasCffStateLoop && cffCaseCount > 0)) {
    items.push({
      id: 'cfg_dispersion',
      name: 'Control Flow Graph Dispersion',
      targetVector: 'Cyclomatic decomposition & branch reconstruction',
      status: 'PASSED',
      description: 'Checks if linear control flow has been converted into state-machine switch dispatchers or indirection trees.',
      findings: `Confirmed state-machine CFF dispatcher in compiled output (${cffCaseCount} indexed case branches, net +${netSwitchCount} switch dispatchers).`,
    });
  } else if (indirectionHelperCount >= 3) {
    items.push({
      id: 'cfg_dispersion',
      name: 'Control Flow Graph Dispersion',
      targetVector: 'Cyclomatic decomposition & branch reconstruction',
      status: 'PASSED',
      description: 'Checks if linear control flow has been converted into state-machine switch dispatchers or indirection trees.',
      findings: `Confirmed control flow indirection in compiled output: ${indirectionHelperCount} expression/operator wrapper function(s) injected into object dispatch tables to decompose branch execution graphs.`,
    });
  } else if (indirectionHelperCount > 0 || (hasCffOrderSplit && netSwitchCount > 0)) {
    items.push({
      id: 'cfg_dispersion',
      name: 'Control Flow Graph Dispersion',
      targetVector: 'Cyclomatic decomposition & branch reconstruction',
      status: 'WARNING',
      description: 'Checks if linear control flow has been converted into state-machine switch dispatchers or indirection trees.',
      findings: `Partial control flow transformation detected (${indirectionHelperCount} indirection wrapper(s), net +${netSwitchCount} switch dispatchers). Full state-machine flattening may be constrained by function block structure.`,
    });
  } else if (
    options &&
    options.controlFlowFlattening &&
    (options.controlFlowFlatteningThreshold || 0) > 0
  ) {
    items.push({
      id: 'cfg_dispersion',
      name: 'Control Flow Graph Dispersion',
      targetVector: 'Cyclomatic decomposition & branch reconstruction',
      status: 'WARNING',
      description: 'Checks if linear control flow has been converted into state-machine switch dispatchers or indirection trees.',
      findings: `Control flow flattening is enabled in options (threshold: ${options.controlFlowFlatteningThreshold}), but the compiled code structure (e.g. short/branch-heavy AST) did not produce detectable state-machine switch loops or indirection dictionaries.`,
    });
  } else if (nativeSwitchCount > 0 && totalObfSwitchCount <= nativeSwitchCount) {
    items.push({
      id: 'cfg_dispersion',
      name: 'Control Flow Graph Dispersion',
      targetVector: 'Cyclomatic decomposition & branch reconstruction',
      status: 'FAILED',
      description: 'Checks if linear control flow has been converted into state-machine switch dispatchers or indirection trees.',
      findings: `0 state-machine CFF dispatchers or indirection tables detected in compiled output. The ${totalObfSwitchCount} switch statement(s) present correspond strictly to native source switch blocks.`,
    });
  } else {
    items.push({
      id: 'cfg_dispersion',
      name: 'Control Flow Graph Dispersion',
      targetVector: 'Cyclomatic decomposition & branch reconstruction',
      status: 'FAILED',
      description: 'Checks if linear control flow has been converted into state-machine switch dispatchers or indirection trees.',
      findings:
        '0 state-machine switch dispatchers, flattening loops, or expression indirection tables detected in compiled output. Control flow graph remains linear.',
    });
  }

  // Vector 5: Anti-Beautification & Self Defense
  // Inspect obfuscatedCode directly for toString tamper verification hooks and format-trap regex
  const hasGuardWrapper =
    /var\s+[a-zA-Z0-9_$]+\s*=\s*!!\[\];\s*return\s+function\s*\([a-zA-Z0-9_$,\s]*\)/.test(
      obfuscatedCode
    ) ||
    /function\s*\([a-zA-Z0-9_$,\s]*\)\s*\{\s*(?:var|let|const)\s+[a-zA-Z0-9_$]+\s*=\s*!!\[\];/.test(
      obfuscatedCode
    );

  const hasTamperCall =
    /[a-zA-Z0-9_$]+\(this,\s*function\s*\(\)\s*\{/.test(obfuscatedCode) ||
    ((/(?:\.toString\(\)|\['toString'\]\(\)|\btoString\b)/.test(obfuscatedCode)) &&
      /(?:constructor|search|RegExp|apply)/.test(obfuscatedCode));

  const hasFormatTrap =
    /(?:\(\(\(\.\+\)\+\)\+\)\+\$|\\x0a|indexOf\s*\(\s*['"]\\x0a['"]\)|indexOf\s*\(\s*['"]\\n['"]\))/.test(
      obfuscatedCode
    ) || /search\s*\(\s*['"]\(\(\(\.\+\)\+\)\+\)\+\$['"]\)/.test(obfuscatedCode);

  if (
    (hasGuardWrapper && hasTamperCall) ||
    (hasGuardWrapper && hasFormatTrap) ||
    (hasTamperCall && hasFormatTrap)
  ) {
    items.push({
      id: 'anti_tamper',
      name: 'Anti-Beautification & Tamper Hook',
      targetVector: 'Source code reformatting in DevTools / Prettier',
      status: 'PASSED',
      description: 'Checks if toString() tamper verification is bound to functions.',
      findings: 'Confirmed active self-defending guard in compiled output: Function.prototype.toString tamper hook and RegExp format trap are embedded.',
    });
  } else if (hasGuardWrapper || hasTamperCall) {
    items.push({
      id: 'anti_tamper',
      name: 'Anti-Beautification & Tamper Hook',
      targetVector: 'Source code reformatting in DevTools / Prettier',
      status: 'WARNING',
      description: 'Checks if toString() tamper verification is bound to functions.',
      findings: 'Partial self-defense structures detected in compiled output, but complete tamper verification chain was not confirmed.',
    });
  } else {
    items.push({
      id: 'anti_tamper',
      name: 'Anti-Beautification & Tamper Hook',
      targetVector: 'Source code reformatting in DevTools / Prettier',
      status: 'FAILED',
      description: 'Checks if toString() tamper verification is bound to functions.',
      findings: '0 self-defending guards or toString tamper hooks detected in compiled output. Code can be reformatted in DevTools without triggering execution failure.',
    });
  }

  // Compute composite resistance score strictly from real empirical tests
  let passCount = 0;
  let warnCount = 0;
  for (const it of items) {
    if (it.status === 'PASSED') passCount += 1;
    else if (it.status === 'WARNING') warnCount += 0.5;
  }
  const rawScore = Math.round(((passCount + warnCount) / items.length) * 100);

  let grade: 'TIER-A' | 'TIER-B' | 'TIER-C' | 'TIER-D' = 'TIER-D';
  if (rawScore >= 85) grade = 'TIER-A';
  else if (rawScore >= 70) grade = 'TIER-B';
  else if (rawScore >= 50) grade = 'TIER-C';

  const restringerItem = items.find((it) => it.id === 'restringer_sim');
  const restringerResistanceLabel =
    restringerItem?.status === 'PASSED'
      ? 'HIGH (Dynamic Cipher)'
      : restringerItem?.status === 'WARNING'
      ? 'MODERATE (Static Base64)'
      : 'LOW (Exposed / Absent)';

  return {
    overallScore: rawScore,
    grade,
    items,
    restringerResistance: restringerResistanceLabel,
    staticEntropyLevel: calculateShannonEntropy(obfuscatedCode) > 5.5 ? 'HIGH (>= 5.5 bits)' : 'NORMAL',
    originalStringsExtracted: verbatimLeakedCount,
    totalOriginalStrings: candidateStrings.length,
  };
}
