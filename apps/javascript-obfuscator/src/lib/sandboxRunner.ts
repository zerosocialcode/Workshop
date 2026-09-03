/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PreviewExecutionResult } from '../types';

/**
 * Executes JavaScript code in a truly isolated Sandboxed iFrame.
 * The iframe is created with `sandbox="allow-scripts"` (no allow-same-origin),
 * completely blocking access to parent DOM, cookies, storage, and cross-origin network.
 */
function runCodeInIsolatedFrame(
  code: string,
  timeoutMs: number = 2500
): Promise<{ logs: string[]; result: string; timeMs: number; error?: string }> {
  return new Promise((resolve) => {
    const executionId = 'exec_' + Math.random().toString(36).slice(2, 9);
    const iframe = document.createElement('iframe');

    // Security: Only allow-scripts, explicitly disallow allow-same-origin
    iframe.setAttribute('sandbox', 'allow-scripts');
    iframe.style.position = 'fixed';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';

    let isResolved = false;
    let timer: any = null;

    const cleanup = () => {
      window.removeEventListener('message', handleMessage);
      if (timer) clearTimeout(timer);
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    };

    const handleMessage = (event: MessageEvent) => {
      if (!event.data || event.data.executionId !== executionId) return;
      if (isResolved) return;
      isResolved = true;
      cleanup();

      if (event.data.type === 'SUCCESS') {
        resolve({
          logs: event.data.logs || [],
          result: event.data.result || 'undefined',
          timeMs: event.data.timeMs || 0,
        });
      } else {
        resolve({
          logs: event.data.logs || [],
          result: 'Error',
          timeMs: event.data.timeMs || 0,
          error: event.data.error || 'Execution failed',
        });
      }
    };

    window.addEventListener('message', handleMessage);

    timer = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        cleanup();
        resolve({
          logs: ['[SANDBOX TIMEOUT] Execution exceeded ' + timeoutMs + 'ms safety limit.'],
          result: 'TIMEOUT',
          timeMs: timeoutMs,
          error: 'Execution timed out (infinite loop or debug protection active)',
        });
      }
    }, timeoutMs);

    // Prepare HTML payload for isolated runner iframe
    // Escape script tag termination
    const safeCode = JSON.stringify(code);
    const htmlContent = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
<script>
(function() {
  const executionId = "${executionId}";
  const capturedLogs = [];
  
  const customConsole = {
    log: function(...args) {
      capturedLogs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
    },
    info: function(...args) { customConsole.log(...args); },
    warn: function(...args) { customConsole.log('[WARN]', ...args); },
    error: function(...args) { customConsole.log('[ERROR]', ...args); }
  };

  const codeToRun = ${safeCode};
  const startTime = performance.now();

  try {
    // Create execution scope with isolated console
    const runner = new Function('console', 'atob', 'btoa', codeToRun);
    const evalResult = runner(customConsole, window.atob ? window.atob.bind(window) : undefined, window.btoa ? window.btoa.bind(window) : undefined);
    const elapsed = Math.round(performance.now() - startTime);

    let displayResult = 'undefined';
    if (evalResult !== undefined) {
      displayResult = typeof evalResult === 'object' ? JSON.stringify(evalResult) : String(evalResult);
    }

    window.parent.postMessage({
      executionId: executionId,
      type: 'SUCCESS',
      logs: capturedLogs,
      result: displayResult,
      timeMs: elapsed
    }, '*');
  } catch (err) {
    const elapsed = Math.round(performance.now() - startTime);
    window.parent.postMessage({
      executionId: executionId,
      type: 'ERROR',
      logs: capturedLogs,
      error: err && err.message ? err.message : String(err),
      timeMs: elapsed
    }, '*');
  }
})();
</script>
</body>
</html>`;

    document.body.appendChild(iframe);
    iframe.srcdoc = htmlContent;
  });
}

/**
 * Runs comparative execution harness inside isolated preview frames
 * to verify equivalence and functional stability.
 */
export async function executeInPreviewRunner(
  originalCode: string,
  obfuscatedCode: string
): Promise<PreviewExecutionResult> {
  try {
    // Execute original in isolated iframe
    const originalRun = await runCodeInIsolatedFrame(originalCode, 2000);
    // Execute obfuscated in isolated iframe
    const obfuscatedRun = await runCodeInIsolatedFrame(obfuscatedCode, 2500);

    const hasErrors = !!originalRun.error || !!obfuscatedRun.error;
    const isTimeout = originalRun.result === 'TIMEOUT' || obfuscatedRun.result === 'TIMEOUT';

    // Verify equivalence of output & console logs
    const resultMatches = originalRun.result === obfuscatedRun.result;
    const logsMatch =
      originalRun.logs.length === obfuscatedRun.logs.length &&
      originalRun.logs.every((l, i) => l === obfuscatedRun.logs[i]);

    const isEquivalent = !hasErrors && resultMatches && logsMatch;

    let status: PreviewExecutionResult['status'] = 'success';
    if (isTimeout) status = 'timeout';
    else if (hasErrors) status = 'failed';
    else if (!isEquivalent) status = 'mismatch';

    return {
      status,
      originalLogs: originalRun.logs,
      obfuscatedLogs: obfuscatedRun.logs,
      originalResult: originalRun.result,
      obfuscatedResult: obfuscatedRun.result,
      originalTimeMs: originalRun.timeMs,
      obfuscatedTimeMs: obfuscatedRun.timeMs,
      error: obfuscatedRun.error || originalRun.error,
      isEquivalent,
      isolated: true,
    };
  } catch (err: any) {
    return {
      status: 'failed',
      originalLogs: [],
      obfuscatedLogs: [],
      originalResult: 'Error',
      obfuscatedResult: 'Error',
      originalTimeMs: 0,
      obfuscatedTimeMs: 0,
      error: err?.message || 'Failed to initialize preview runner',
      isEquivalent: false,
      isolated: true,
    };
  }
}
