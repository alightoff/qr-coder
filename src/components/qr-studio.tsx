"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  Camera,
  Copy,
  Download,
  ExternalLink,
  Film,
  History,
  Link2,
  LoaderCircle,
  PlayCircle,
  QrCode,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  Type,
} from "lucide-react";
import {
  assessUrlSafety,
  buildGeneratorValue,
  describePayload,
  isLikelyVideoUrl,
  type GeneratorMode,
  type HistoryEntry,
  type PayloadDescriptor,
} from "@/lib/qr-utils";

const HISTORY_KEY = "qr-studio-history";
const MAX_HISTORY_ITEMS = 18;

const tabs = [
  { id: "scan", label: "Scan", icon: Camera },
  { id: "create", label: "Create", icon: QrCode },
  { id: "history", label: "History", icon: History },
  { id: "info", label: "Info", icon: Sparkles },
] as const;

type TabId = (typeof tabs)[number]["id"];

type ScannerInstance = {
  stop: () => Promise<void>;
  clear: () => void | Promise<void>;
};

const generatorModes: Array<{
  id: GeneratorMode;
  label: string;
  description: string;
  icon: typeof Type;
}> = [
  { id: "text", label: "Text", description: "Notes, coupons, custom content", icon: Type },
  { id: "link", label: "Safe link", description: "Clickable URL with safety check", icon: Link2 },
  { id: "video", label: "Video", description: "Direct video file or YouTube link", icon: Film },
];

function getEmptyState(mode: GeneratorMode) {
  if (mode === "link") {
    return {
      title: "Launch page",
      value: "https://example.com",
    };
  }

  if (mode === "video") {
    return {
      title: "Promo reel",
      value: "https://samplelib.com/lib/preview/mp4/sample-5s.mp4",
    };
  }

  return {
    title: "Event pass",
    value: "Show this QR at the entrance for a surprise drop.",
  };
}

function makeHistoryEntry(action: HistoryEntry["action"], rawValue: string, title?: string): HistoryEntry {
  return {
    id: crypto.randomUUID(),
    action,
    rawValue,
    title: title?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };
}

function persistHistory(entries: HistoryEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY_ITEMS)));
}

function HistoryBadge({ entry }: { entry: HistoryEntry }) {
  const descriptor = describePayload(entry.rawValue);
  const isCreate = entry.action === "created";

  return (
    <article className="rounded-[28px] border border-white/12 bg-white/8 p-5 shadow-[0_20px_70px_rgba(15,23,42,0.25)] backdrop-blur-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-white/55">
            {isCreate ? "Generated" : "Scanned"}
          </p>
          <h3 className="mt-2 text-lg font-semibold text-white">
            {entry.title || descriptor.label}
          </h3>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            isCreate ? "bg-cyan-400/15 text-cyan-100" : "bg-emerald-400/15 text-emerald-100"
          }`}
        >
          {descriptor.kind}
        </span>
      </div>

      <p className="line-clamp-3 text-sm leading-6 text-white/72">{entry.rawValue}</p>

      <div className="mt-4 flex items-center justify-between text-xs text-white/45">
        <span>{new Date(entry.createdAt).toLocaleString()}</span>
        <span>{isCreate ? "Saved locally" : "Captured in browser"}</span>
      </div>
    </article>
  );
}

function ResultPreview({
  descriptor,
  copied,
  onCopy,
}: {
  descriptor: PayloadDescriptor | null;
  copied: boolean;
  onCopy: () => void;
}) {
  if (!descriptor) {
    return (
      <div className="rounded-[28px] border border-dashed border-white/18 bg-black/15 p-6 text-sm leading-7 text-white/55">
        Nothing to preview yet.
      </div>
    );
  }

  const safety = descriptor.url ? assessUrlSafety(descriptor.url) : null;

  return (
    <div className="space-y-4 rounded-[28px] border border-white/12 bg-white/8 p-6 shadow-[0_20px_70px_rgba(15,23,42,0.25)] backdrop-blur-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-white/50">Detected</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">{descriptor.label}</h3>
        </div>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm text-white transition hover:bg-white/14"
        >
          <Copy className="h-4 w-4" />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <p className="break-words text-sm leading-7 text-white/80">{descriptor.rawValue}</p>

      {descriptor.url && safety ? (
        <div className="rounded-[24px] border border-white/10 bg-slate-950/35 p-4">
          <div className="flex items-center gap-2 text-sm">
            {safety.safe ? (
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
            ) : (
              <ShieldAlert className="h-4 w-4 text-amber-300" />
            )}
            <span className={safety.safe ? "text-emerald-100" : "text-amber-100"}>
              {safety.safe ? "This link looks safe enough to open" : "This link is blocked by local safety rules"}
            </span>
          </div>
          <p className="mt-2 text-xs leading-6 text-white/55">{safety.reason}</p>
          <div className="mt-4">
            <a
              href={safety.safe ? descriptor.url : undefined}
              target="_blank"
              rel="noreferrer noopener"
              aria-disabled={!safety.safe}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                safety.safe
                  ? "bg-cyan-300 text-slate-950 hover:bg-cyan-200"
                  : "cursor-not-allowed bg-white/8 text-white/40"
              }`}
            >
              <ExternalLink className="h-4 w-4" />
              Open link
            </a>
          </div>
        </div>
      ) : null}

      {descriptor.videoEmbed ? (
        <div className="overflow-hidden rounded-[24px] border border-white/10 bg-black/35">
          <iframe
            src={descriptor.videoEmbed}
            className="aspect-video w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Video preview"
          />
        </div>
      ) : null}

      {descriptor.videoUrl ? (
        <video
          controls
          playsInline
          preload="metadata"
          className="aspect-video w-full rounded-[24px] border border-white/10 bg-black/40 object-cover"
          src={descriptor.videoUrl}
        />
      ) : null}
    </div>
  );
}

function InfoPanel({ showVideoHint }: { showVideoHint: boolean }) {
  return (
    <section className="rounded-[32px] border border-white/10 bg-white/6 p-5 backdrop-blur-xl sm:p-6">
      <div>
        <p className="text-xs uppercase tracking-[0.28em] text-white/45">Info</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">How this version works</h2>
      </div>

      <div className="mt-5 grid gap-4">
        <article className="rounded-[24px] border border-white/10 bg-slate-950/28 p-5">
          <h3 className="text-lg font-semibold text-white">Main features</h3>
          <p className="mt-2 text-sm leading-7 text-white/65">
            Scan QR codes with the camera, generate new codes for text, links and video, and keep recent activity in local history.
          </p>
        </article>

        <article className="rounded-[24px] border border-white/10 bg-slate-950/28 p-5">
          <h3 className="text-lg font-semibold text-white">Safe links</h3>
          <p className="mt-2 text-sm leading-7 text-white/65">
            Links become clickable only when they pass browser-side checks: https only, no localhost, no private network hosts, no suspicious punycode.
          </p>
        </article>

        <article className="rounded-[24px] border border-white/10 bg-slate-950/28 p-5">
          <h3 className="text-lg font-semibold text-white">No backend</h3>
          <p className="mt-2 text-sm leading-7 text-white/65">
            Everything runs on the device: camera decoding, QR generation, previews and history in localStorage.
          </p>
          {showVideoHint ? (
            <p className="mt-3 text-sm leading-7 text-cyan-100/80">
              The current generated payload looks like a direct video URL, so preview should work in most modern browsers.
            </p>
          ) : null}
        </article>
      </div>
    </section>
  );
}

export default function QrStudio() {
  const scannerRef = useRef<HTMLDivElement | null>(null);
  const scannerInstanceRef = useRef<ScannerInstance | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("scan");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [generatorMode, setGeneratorMode] = useState<GeneratorMode>("text");
  const [title, setTitle] = useState(getEmptyState("text").title);
  const [inputValue, setInputValue] = useState(getEmptyState("text").value);
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [generatedPayload, setGeneratedPayload] = useState("");
  const [scanResult, setScanResult] = useState<PayloadDescriptor | null>(null);
  const [scanStatus, setScanStatus] = useState("Camera is idle. Start scanning when you are ready.");
  const [scannerBusy, setScannerBusy] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "scan" | "create">("idle");

  useEffect(() => {
    const saved = localStorage.getItem(HISTORY_KEY);
    if (!saved) {
      return;
    }

    try {
      const parsed = JSON.parse(saved) as HistoryEntry[];
      setHistory(parsed);
    } catch {
      localStorage.removeItem(HISTORY_KEY);
    }
  }, []);

  useEffect(() => {
    const next = getEmptyState(generatorMode);
    setTitle(next.title);
    setInputValue(next.value);
    setGeneratedUrl("");
    setGeneratedPayload("");
  }, [generatorMode]);

  useEffect(() => {
    return () => {
      void stopScanner();
    };
  }, []);

  const generatedDescriptor = useMemo(() => (generatedPayload ? describePayload(generatedPayload) : null), [generatedPayload]);

  async function stopScanner() {
    if (!scannerInstanceRef.current) {
      return;
    }

    try {
      await scannerInstanceRef.current.stop();
      await scannerInstanceRef.current.clear();
    } catch {
      // Ignore cleanup noise when the scanner is already stopped.
    } finally {
      scannerInstanceRef.current = null;
      setScannerActive(false);
    }
  }

  async function startScanner() {
    if (!scannerRef.current || scannerBusy || scannerActive) {
      return;
    }

    setScannerBusy(true);
    setScanStatus("Requesting camera access and preparing the scanner...");

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-reader");
      scannerInstanceRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 240, height: 240 },
          aspectRatio: 1,
        },
        async (decodedText) => {
          const descriptor = describePayload(decodedText);
          setScanResult(descriptor);
          setScanStatus("QR code captured. You can keep scanning or pause the camera.");

          setHistory((current) => {
            const next = [makeHistoryEntry("scanned", decodedText), ...current].slice(0, MAX_HISTORY_ITEMS);
            persistHistory(next);
            return next;
          });
        },
        () => undefined,
      );

      setScannerActive(true);
      setScanStatus("Camera is live. Point it at a QR code.");
    } catch (error) {
      setScanStatus(
        error instanceof Error
          ? `Scanner unavailable: ${error.message}`
          : "Scanner unavailable. Check camera permission or try another browser.",
      );
      await stopScanner();
    } finally {
      setScannerBusy(false);
    }
  }

  async function handleGenerate() {
    const payload = buildGeneratorValue(generatorMode, inputValue);
    if (!payload) {
      setGeneratedUrl("");
      setGeneratedPayload("");
      return;
    }

    const dataUrl = await QRCode.toDataURL(payload, {
      errorCorrectionLevel: "H",
      margin: 1,
      width: 720,
      color: {
        dark: "#081226",
        light: "#f2f7ff",
      },
    });

    setGeneratedUrl(dataUrl);
    setGeneratedPayload(payload);

    setHistory((current) => {
      const next = [makeHistoryEntry("created", payload, title), ...current].slice(0, MAX_HISTORY_ITEMS);
      persistHistory(next);
      return next;
    });
  }

  async function copyText(value: string, kind: "scan" | "create") {
    await navigator.clipboard.writeText(value);
    setCopyState(kind);
    window.setTimeout(() => setCopyState("idle"), 1500);
  }

  function downloadGeneratedQr() {
    if (!generatedUrl) {
      return;
    }

    const link = document.createElement("a");
    link.href = generatedUrl;
    link.download = `${(title || "qr-code").trim().toLowerCase().replace(/\s+/g, "-")}.png`;
    link.click();
  }

  function clearHistory() {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  }

  const createModeMeta = generatorModes.find((mode) => mode.id === generatorMode)!;

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),_transparent_26%),radial-gradient(circle_at_85%_15%,_rgba(251,191,36,0.16),_transparent_18%),linear-gradient(135deg,_#07111f_0%,_#0f172a_45%,_#111827_100%)] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[36px] border border-white/10 bg-white/6 p-6 shadow-[0_30px_120px_rgba(8,15,31,0.45)] backdrop-blur-xl sm:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.12),transparent_35%,transparent_70%,rgba(56,189,248,0.12))]" />
          <div className="relative flex flex-col gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-100/80">QR Studio</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Fast QR scanner and generator
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-7 text-white/60 sm:text-base">
                Open the function you need and work there. Extra details are in the Info tab.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium transition ${
                      isActive
                        ? "bg-white text-slate-950"
                        : "border border-white/12 bg-white/8 text-white hover:bg-white/14"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mt-6 grid flex-1 gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            {activeTab === "scan" ? (
              <section className="rounded-[32px] border border-white/10 bg-white/6 p-5 backdrop-blur-xl sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-white/45">Scanner</p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">Live camera decode</h2>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={startScanner}
                      disabled={scannerBusy || scannerActive}
                      className="inline-flex items-center gap-2 rounded-full bg-cyan-300 px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-white/40"
                    >
                      {scannerBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                      Start camera
                    </button>
                    <button
                      type="button"
                      onClick={() => void stopScanner()}
                      disabled={!scannerActive}
                      className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/14 disabled:cursor-not-allowed disabled:text-white/35"
                    >
                      <Camera className="h-4 w-4" />
                      Stop
                    </button>
                  </div>
                </div>

                <div className="mt-5 overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/60 p-3">
                  <div
                    id="qr-reader"
                    ref={scannerRef}
                    className="min-h-[320px] rounded-[20px] bg-[linear-gradient(135deg,rgba(34,211,238,0.12),rgba(15,23,42,0.5))]"
                  />
                </div>

                <p className="mt-4 text-sm leading-7 text-white/65">{scanStatus}</p>
              </section>
            ) : null}

            {activeTab === "create" ? (
              <section className="rounded-[32px] border border-white/10 bg-white/6 p-5 backdrop-blur-xl sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-white/45">Generator</p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">Build custom QR codes</h2>
                  </div>
                  <div className="rounded-full border border-white/12 bg-white/8 px-4 py-2 text-xs uppercase tracking-[0.28em] text-white/60">
                    {createModeMeta.label}
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {generatorModes.map((mode) => {
                    const Icon = mode.icon;
                    const isActive = mode.id === generatorMode;

                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setGeneratorMode(mode.id)}
                        className={`rounded-[24px] border p-4 text-left transition ${
                          isActive
                            ? "border-cyan-300/35 bg-cyan-300/12"
                            : "border-white/10 bg-slate-950/20 hover:bg-white/10"
                        }`}
                      >
                        <Icon className="h-5 w-5 text-cyan-100" />
                        <p className="mt-3 text-sm font-semibold text-white">{mode.label}</p>
                        <p className="mt-2 text-sm leading-6 text-white/58">{mode.description}</p>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5 grid gap-4">
                  <label className="grid gap-2 text-sm text-white/75">
                    Title
                    <input
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      className="rounded-[18px] border border-white/12 bg-slate-950/35 px-4 py-3 text-white outline-none placeholder:text-white/25 focus:border-cyan-300/45"
                      placeholder="Name this QR"
                    />
                  </label>

                  <label className="grid gap-2 text-sm text-white/75">
                    {generatorMode === "text" ? "Content" : generatorMode === "link" ? "URL" : "Video URL"}
                    {generatorMode === "text" ? (
                      <textarea
                        value={inputValue}
                        onChange={(event) => setInputValue(event.target.value)}
                        className="min-h-32 rounded-[18px] border border-white/12 bg-slate-950/35 px-4 py-3 text-white outline-none placeholder:text-white/25 focus:border-cyan-300/45"
                        placeholder="Type any message or encoded content"
                      />
                    ) : (
                      <input
                        value={inputValue}
                        onChange={(event) => setInputValue(event.target.value)}
                        className="rounded-[18px] border border-white/12 bg-slate-950/35 px-4 py-3 text-white outline-none placeholder:text-white/25 focus:border-cyan-300/45"
                        placeholder="https://..."
                      />
                    )}
                  </label>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void handleGenerate()}
                    className="inline-flex items-center gap-2 rounded-full bg-amber-300 px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-amber-200"
                  >
                    <QrCode className="h-4 w-4" />
                    Generate QR
                  </button>
                  <button
                    type="button"
                    onClick={downloadGeneratedQr}
                    disabled={!generatedUrl}
                    className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/14 disabled:cursor-not-allowed disabled:text-white/35"
                  >
                    <Download className="h-4 w-4" />
                    Download PNG
                  </button>
                  {generatedDescriptor ? (
                    <button
                      type="button"
                      onClick={() => void copyText(generatedDescriptor.rawValue, "create")}
                      className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/14"
                    >
                      <Copy className="h-4 w-4" />
                      {copyState === "create" ? "Copied" : "Copy payload"}
                    </button>
                  ) : null}
                </div>
              </section>
            ) : null}

            {activeTab === "history" ? (
              <section className="rounded-[32px] border border-white/10 bg-white/6 p-5 backdrop-blur-xl sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-white/45">Memory</p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">Recent activity</h2>
                  </div>
                  <button
                    type="button"
                    onClick={clearHistory}
                    disabled={history.length === 0}
                    className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/14 disabled:cursor-not-allowed disabled:text-white/35"
                  >
                    <Trash2 className="h-4 w-4" />
                    Clear history
                  </button>
                </div>

                <div className="mt-5 grid gap-4">
                  {history.length > 0 ? (
                    history.map((entry) => <HistoryBadge key={entry.id} entry={entry} />)
                  ) : (
                    <div className="rounded-[28px] border border-dashed border-white/16 bg-black/15 p-6 text-sm leading-7 text-white/55">
                      Your history is empty for now.
                    </div>
                  )}
                </div>
              </section>
            ) : null}

            {activeTab === "info" ? (
              <InfoPanel showVideoHint={Boolean(generatedDescriptor?.url && isLikelyVideoUrl(generatedDescriptor.url))} />
            ) : null}
          </div>

          <div className="space-y-6">
            {activeTab !== "info" ? (
              <section className="rounded-[32px] border border-white/10 bg-white/6 p-5 backdrop-blur-xl sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-white/45">
                      {activeTab === "create" ? "Generated preview" : "Scan preview"}
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">
                      {activeTab === "create" ? "What your QR contains" : "Decoded result"}
                    </h2>
                  </div>
                  {activeTab === "scan" && scanResult ? (
                    <div className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-xs uppercase tracking-[0.28em] text-emerald-100">
                      Ready
                    </div>
                  ) : null}
                </div>

                <div className="mt-5">
                  {activeTab === "create" ? (
                    generatedUrl ? (
                      <div className="space-y-4">
                        <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#f2f7ff] p-5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={generatedUrl}
                            alt="Generated QR code"
                            className="mx-auto aspect-square w-full max-w-md"
                          />
                        </div>
                        <ResultPreview
                          descriptor={generatedDescriptor}
                          copied={copyState === "create"}
                          onCopy={() => {
                            if (generatedDescriptor) {
                              void copyText(generatedDescriptor.rawValue, "create");
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <div className="rounded-[28px] border border-dashed border-white/16 bg-black/15 p-6 text-sm leading-7 text-white/55">
                        Generate a QR code to preview it here.
                      </div>
                    )
                  ) : (
                    <ResultPreview
                      descriptor={scanResult}
                      copied={copyState === "scan"}
                      onCopy={() => {
                        if (scanResult) {
                          void copyText(scanResult.rawValue, "scan");
                        }
                      }}
                    />
                  )}
                </div>
              </section>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
