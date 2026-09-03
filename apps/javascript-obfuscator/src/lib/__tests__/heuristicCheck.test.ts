/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Automated Test Suite for JavaScript Obfuscator Engine & Heuristic Self-Checks
 */

import { describe, it, expect } from 'vitest';
import { obfuscateJavaScript, runDeobfuscationResistanceAudit } from '../obfuscationEngine';
import { PRESET_CONFIGS } from '../presets';

describe('JavaScript Obfuscator Engine & Heuristic Self-Checks', () => {
  it('extracts static template literal segments and flags plaintext leaks when string protection is disabled', async () => {
    const templateSource = 'const greeting = `Hello ${user}, your token is SECRET_SESSION_KEY_999`;';

    // 1a. String Protection Disabled (Draft)
    const draftResult = await obfuscateJavaScript(templateSource, PRESET_CONFIGS.draft);
    const draftAudit = runDeobfuscationResistanceAudit(templateSource, draftResult.obfuscatedCode, PRESET_CONFIGS.draft);
    const strCheckDraft = draftAudit.items.find((i) => i.id === 'string_leak_check');
    expect(strCheckDraft).toBeDefined();
    expect(['FAILED', 'WARNING']).toContain(strCheckDraft?.status);

    // 1b. String Protection Active (Industrial - RC4)
    const indResult = await obfuscateJavaScript(templateSource, PRESET_CONFIGS.industrial);
    const indAudit = runDeobfuscationResistanceAudit(templateSource, indResult.obfuscatedCode, PRESET_CONFIGS.industrial);
    const strCheckInd = indAudit.items.find((i) => i.id === 'string_leak_check');
    expect(strCheckInd?.status).toBe('PASSED');
  });

  it('correctly evaluates arrow functions and class methods in lexical identifier mangling checks', async () => {
    const funcSource = `
      const calculateSum = (a, b) => a + b;
      class DataStore {
        fetchRecord(id) { return "rec_" + id; }
      }
    `;
    const indFuncRes = await obfuscateJavaScript(funcSource, PRESET_CONFIGS.industrial);
    const indFuncAudit = runDeobfuscationResistanceAudit(funcSource, indFuncRes.obfuscatedCode, PRESET_CONFIGS.industrial);
    const symCheckInd = indFuncAudit.items.find((i) => i.id === 'symbol_mangling');
    expect(symCheckInd).toBeDefined();
    expect(['WARNING', 'PASSED']).toContain(symCheckInd?.status);
  });

  it('correctly maps debugProtectionInterval numeric parameter into the compiled output', async () => {
    const customOpts = {
      ...PRESET_CONFIGS.draft,
      debugProtection: true,
      debugProtectionInterval: 4500,
      numbersToExpressions: false,
    };
    const dbgResult = await obfuscateJavaScript('console.log("secure");', customOpts);
    expect(dbgResult.obfuscatedCode.length).toBeGreaterThan(0);
    const hasInterval = dbgResult.obfuscatedCode.includes('4500') || dbgResult.obfuscatedCode.includes('0x1194');
    expect(hasInterval).toBe(true);
  });

  it('detects control flow flattening (CFF) dispatchers in structured code', async () => {
    const loopSource = `
      function processOrder(items) {
        let total = 0;
        for (let i = 0; i < items.length; i++) {
          if (items[i] > 100) {
            total += items[i] * 0.9;
          } else {
            total += items[i];
          }
        }
        return total;
      }
    `;
    const cffResult = await obfuscateJavaScript(loopSource, PRESET_CONFIGS.industrial);
    const cffAudit = runDeobfuscationResistanceAudit(loopSource, cffResult.obfuscatedCode, PRESET_CONFIGS.industrial);
    const cffCheck = cffAudit.items.find((i) => i.id === 'cfg_dispersion');
    expect(cffCheck).toBeDefined();
    expect(['PASSED', 'WARNING']).toContain(cffCheck?.status);
  });

  it('evaluates anti-tamper safeguards and dynamic RC4 decoders in Max Armor profile', async () => {
    const tamperSource = 'function verifySession() { return true; }';
    const maxResult = await obfuscateJavaScript(tamperSource, PRESET_CONFIGS.max_armor);
    const maxAudit = runDeobfuscationResistanceAudit(tamperSource, maxResult.obfuscatedCode, PRESET_CONFIGS.max_armor);

    const tamperCheck = maxAudit.items.find((i) => i.id === 'anti_tamper');
    expect(tamperCheck).toBeDefined();
    expect(tamperCheck?.status).toBe('PASSED');

    const restringerCheck = maxAudit.items.find((i) => i.id === 'restringer_sim');
    expect(restringerCheck).toBeDefined();
    expect(restringerCheck?.status).toBe('PASSED');
  });
});
