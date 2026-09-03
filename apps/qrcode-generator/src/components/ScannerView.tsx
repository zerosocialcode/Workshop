import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import confetti from 'canvas-confetti';
import { parseDecodedQR, ParsedQRResult } from '../utils/qrPayload';

export const ScannerView: React.FC = () => {
  const [mode, setMode] = useState<'camera' | 'upload'>('upload');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [decodedResult, setDecodedResult] = useState<ParsedQRResult | null>(null);
  const [copied, setCopied] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const animationFrameId = useRef<number | null>(null);

  const stopCamera = () => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    setCameraError(null);
    setDecodedResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setCameraActive(true);
        requestAnimationFrame(tick);
      }
    } catch (err: any) {
      setCameraError(
        'Camera permission was denied or no camera device is available. You can still scan by uploading an image.'
      );
      setCameraActive(false);
    }
  };

  const tick = () => {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data) {
          handleSuccessfulScan(code.data);
          stopCamera();
          return;
        }
      }
    }
    animationFrameId.current = requestAnimationFrame(tick);
  };

  const handleSuccessfulScan = (rawText: string) => {
    const parsed = parseDecodedQR(rawText);
    setDecodedResult(parsed);
    confetti({ particleCount: 35, spread: 60, origin: { y: 0.8 } });
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDecodedResult(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data) {
          handleSuccessfulScan(code.data);
        } else {
          alert('Could not find or decode a valid QR code in this image. Please try a clearer picture.');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadVCard = (vcardText: string, name: string) => {
    const blob = new Blob([vcardText], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name.replace(/[^a-z0-9]/gi, '_')}.vcf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Scanner Mode Selector */}
      <div className="spec-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--line-soft)] pb-3">
          <div>
            <h3 className="font-display text-2xl font-extrabold uppercase tracking-tight text-[var(--ink)]">
              OPTICAL SCANNER & CODE DECODER
            </h3>
            <p className="font-mono-code text-xs text-[var(--ink-soft)] mt-0.5">
              Decode 2D QR matrix patterns directly via live video feed or local image analysis.
            </p>
          </div>

          <div className="flex bg-[var(--bg-deep)] p-1 rounded border border-[var(--line)] font-mono-code text-xs">
            <button
              type="button"
              onClick={() => {
                stopCamera();
                setMode('upload');
              }}
              className={`px-3 py-1.5 rounded font-bold transition cursor-pointer ${
                mode === 'upload'
                  ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                  : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
              }`}
            >
              [ 01/UPLOAD FILE ]
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('camera');
                startCamera();
              }}
              className={`px-3 py-1.5 rounded font-bold transition cursor-pointer ${
                mode === 'camera'
                  ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                  : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
              }`}
            >
              [ 02/LIVE WEBCAM ]
            </button>
          </div>
        </div>

        {/* Upload Mode Box */}
        {mode === 'upload' && (
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-[var(--line)] hover:border-[var(--accent)] bg-[var(--bg-deep)] rounded p-10 cursor-pointer transition text-center group">
            <span className="font-mono-code text-sm font-bold text-[var(--ink)] mb-1">
              [ SELECT OR DROP QR CODE IMAGE ]
            </span>
            <span className="font-mono-code text-xs text-[var(--ink-soft)]">
              Supports PNG, JPG, WEBP, and raw photo captures
            </span>
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </label>
        )}

        {/* Live Camera Box */}
        {mode === 'camera' && (
          <div className="space-y-3">
            <div className="relative bg-[var(--bg-deep)] rounded overflow-hidden aspect-video max-h-[360px] flex items-center justify-center border border-[var(--line)]">
              <video
                ref={videoRef}
                className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
              />

              {cameraActive && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-56 h-56 border-2 border-[var(--accent)] rounded relative">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[var(--accent)] -mt-0.5 -ml-0.5" />
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[var(--accent)] -mt-0.5 -mr-0.5" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[var(--accent)] -mb-0.5 -ml-0.5" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[var(--accent)] -mb-0.5 -mr-0.5" />

                    {/* Animated laser scan line */}
                    <div className="w-full h-0.5 bg-[var(--accent)] absolute top-1/2 -translate-y-1/2 animate-pulse" />
                  </div>
                </div>
              )}

              {!cameraActive && (
                <div className="p-6 text-center">
                  {cameraError ? (
                    <div className="text-[var(--fail)] font-mono-code text-xs flex flex-col items-center gap-2">
                      <span>[ ERROR: {cameraError} ]</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={startCamera}
                      className="btn-primary"
                    >
                      [ INITIALIZE WEBCAM SENSOR ]
                    </button>
                  )}
                </div>
              )}
            </div>

            {cameraActive && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={stopCamera}
                  className="btn-ghost"
                >
                  [ TERMINATE CAMERA STREAM ]
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Decoded Result Card */}
      {decodedResult && (
        <div className="spec-card p-5 space-y-4 border-[var(--accent)] animate-in fade-in duration-300">
          <div className="flex items-start justify-between gap-3 border-b border-[var(--line-soft)] pb-3">
            <div>
              <span className="badge-tag badge-ok mb-1">
                DECODED: {decodedResult.type.toUpperCase()}
              </span>
              <h4 className="font-display text-2xl font-bold text-[var(--ink)]">
                {decodedResult.displayTitle}
              </h4>
            </div>
            <span className="badge-tag badge-accent">
              CRC VERIFIED
            </span>
          </div>

          <p className="font-mono-code text-xs text-[var(--ink)] bg-[var(--bg-deep)] p-3 rounded border border-[var(--line)] select-all break-all">
            {decodedResult.summary}
          </p>

          {/* Structured metadata list if applicable */}
          {decodedResult.metadata && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-[var(--bg-deep)] p-3 rounded border border-[var(--line)] font-mono-code text-xs">
              {Object.entries(decodedResult.metadata).map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-[var(--line-soft)] py-1">
                  <span className="text-[var(--ink-soft)] uppercase">{k}:</span>
                  <span className="text-[var(--ink)] font-bold">{v}</span>
                </div>
              ))}
            </div>
          )}

          {/* Action Trigger Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            {decodedResult.actionUrl && (
              <a
                href={decodedResult.actionUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-primary"
              >
                [ {decodedResult.actionLabel ? decodedResult.actionLabel.toUpperCase() : 'DISPATCH URI'} ]
              </a>
            )}

            {decodedResult.type === 'Contact Card (vCard)' && (
              <button
                type="button"
                onClick={() =>
                  downloadVCard(decodedResult.rawText, decodedResult.displayTitle)
                }
                className="btn-primary"
              >
                [ DOWNLOAD .VCF IDENTITY ]
              </button>
            )}

            <button
              type="button"
              onClick={() => handleCopy(decodedResult.copyableValue || decodedResult.rawText)}
              className="btn-dark"
            >
              {copied ? '[ CONTENT COPIED ]' : '[ COPY RAW PAYLOAD ]'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
