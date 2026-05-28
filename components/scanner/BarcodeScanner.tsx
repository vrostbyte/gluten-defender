"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";

/**
 * BarcodeScanner
 * --------------
 * Opens the rear camera and watches for a food barcode. It uses two engines:
 *
 *   1. The browser's native `BarcodeDetector` API (fast, built-in) when present.
 *   2. A `@zxing/browser` fallback for browsers without it (notably iOS Safari).
 *
 * Developer override: add `?scanner=zxing` to the URL to force the ZXing path
 * even on browsers that have the native API. This lets us exercise the iOS code
 * path on an Android phone during testing.
 *
 * When a barcode is read, we stop the camera and call `onDetected(barcode)`.
 */

// Native BarcodeDetector is not yet in TypeScript's built-in DOM types, so we
// describe the tiny bit of it we use.
type DetectedBarcode = { rawValue: string };
interface BarcodeDetectorInstance {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}
interface BarcodeDetectorCtor {
  new (options?: { formats?: string[] }): BarcodeDetectorInstance;
}

// The food barcode formats we care about, named for each engine.
const NATIVE_FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e"];
const ZXING_FORMATS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
];

type Engine = "native" | "zxing";
type Status = "starting" | "scanning" | "denied" | "error";

export default function BarcodeScanner({
  onDetected,
}: {
  onDetected: (barcode: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [engine, setEngine] = useState<Engine | null>(null);
  const [status, setStatus] = useState<Status>("starting");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // We use refs (not state) to hold things the cleanup function must touch, so
  // that changing them never triggers a re-render or restarts the effect.
  const detectedRef = useRef(false); // ensures we only report one barcode
  const streamRef = useRef<MediaStream | null>(null); // native camera stream
  const zxingControlsRef = useRef<IScannerControls | null>(null); // zxing stopper
  const rafRef = useRef<number | null>(null); // native detection loop handle

  // Stop the camera and any detection loop. Safe to call multiple times.
  const stopEverything = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    zxingControlsRef.current?.stop();
    zxingControlsRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  // Called once when a barcode is read. Guards against duplicate firings.
  const handleResult = useCallback(
    (raw: string) => {
      if (detectedRef.current) return;
      const barcode = raw.replace(/\D/g, ""); // keep digits only
      if (!barcode) return;
      detectedRef.current = true;
      stopEverything();
      onDetected(barcode);
    },
    [onDetected, stopEverything],
  );

  // Turn a getUserMedia/camera error into a friendly message + status.
  const handleCameraError = useCallback((err: unknown) => {
    const name = err instanceof DOMException ? err.name : "";
    if (name === "NotAllowedError" || name === "SecurityError") {
      setStatus("denied");
      setErrorMessage(
        "Camera access was blocked. Allow camera access in your browser settings, or type the barcode below.",
      );
    } else if (name === "NotFoundError" || name === "OverconstrainedError") {
      setStatus("error");
      setErrorMessage(
        "No usable camera was found. You can type the barcode below instead.",
      );
    } else {
      setStatus("error");
      setErrorMessage(
        "Could not start the camera. You can type the barcode below instead.",
      );
    }
  }, []);

  useEffect(() => {
    // Decide which engine to use (reads the ?scanner=zxing override from the URL).
    const override = new URLSearchParams(window.location.search).get("scanner");
    const hasNative = "BarcodeDetector" in window;
    const chosen: Engine = override === "zxing" ? "zxing" : hasNative ? "native" : "zxing";

    let cancelled = false; // becomes true if the component unmounts mid-start

    // --- Native BarcodeDetector path ---
    async function startNative() {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      setEngine("native");
      setStatus("scanning");

      const Detector = (window as unknown as { BarcodeDetector: BarcodeDetectorCtor })
        .BarcodeDetector;
      const detector = new Detector({ formats: NATIVE_FORMATS });

      // Check each animation frame for a barcode in the live video.
      const tick = async () => {
        if (cancelled || detectedRef.current) return;
        try {
          const codes = await detector.detect(video);
          if (codes.length > 0) {
            handleResult(codes[0].rawValue);
            return;
          }
        } catch {
          // Occasional per-frame detect errors are harmless; keep looping.
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    }

    // --- ZXing fallback path ---
    async function startZxing() {
      const hints = new Map<DecodeHintType, unknown>();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, ZXING_FORMATS);
      const reader = new BrowserMultiFormatReader(hints);

      // decodeFromConstraints opens the camera itself and calls us back on each
      // successful read.
      const controls = await reader.decodeFromConstraints(
        { video: { facingMode: "environment" } },
        videoRef.current!,
        (result) => {
          if (result) handleResult(result.getText());
        },
      );
      if (cancelled) {
        controls.stop();
        return;
      }
      zxingControlsRef.current = controls;
      setEngine("zxing");
      setStatus("scanning");
    }

    (chosen === "native" ? startNative() : startZxing()).catch(handleCameraError);

    // Cleanup: when the scanner unmounts (e.g. we navigate away or show a
    // result), turn the camera off.
    return () => {
      cancelled = true;
      stopEverything();
    };
  }, [handleResult, handleCameraError, stopEverything]);

  // --- Camera blocked / errored: explain and point to manual entry ---
  if (status === "denied" || status === "error") {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center">
        <p className="text-base font-medium text-amber-900">{errorMessage}</p>
      </div>
    );
  }

  // --- Live camera view ---
  return (
    <div className="relative overflow-hidden rounded-2xl bg-black">
      {/* The live camera feed. `playsInline` + `muted` are required for autoplay
          on iOS Safari. */}
      <video
        ref={videoRef}
        className="aspect-[3/4] w-full object-cover"
        playsInline
        muted
      />

      {/* A simple viewfinder frame to guide the user where to aim. */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-32 w-4/5 rounded-xl border-2 border-white/80 shadow-[0_0_0_100vmax_rgba(0,0,0,0.25)]" />
      </div>

      {/* Status + which engine is active (small + unobtrusive). */}
      <div className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
        {status === "starting" ? "Starting camera…" : "Point at a barcode"}
      </div>
      {engine && (
        <div className="absolute right-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
          {engine}
        </div>
      )}
    </div>
  );
}
