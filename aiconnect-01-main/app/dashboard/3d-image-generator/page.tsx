"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type GeneratedImage = {
  id: string;
  status: "pending" | "succeeded" | "failed";
  prompt: string;
  enhancedPrompt: string | null;
  stylePreset: string | null;
  aspectRatio: string;
  quality: string;
  background: string | null;
  provider: string;
  model: string;
  mimeType: string | null;
  width: number | null;
  height: number | null;
  errorMessage: string | null;
  imageUrl: string | null;
  createdAt: string;
};

const STYLE_PRESETS = [
  { value: "product", label: "Product" },
  { value: "character", label: "Character" },
  { value: "environment", label: "Environment" },
  { value: "isometric", label: "Isometric" },
  { value: "toy", label: "Toy" },
];

export default function ImageGeneratorPage() {
  const [prompt, setPrompt] = useState("");
  const [stylePreset, setStylePreset] = useState("product");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [quality, setQuality] = useState("standard");
  const [background, setBackground] = useState("auto");
  const [items, setItems] = useState<GeneratedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await fetch("/api/generate-image", { cache: "no-store" });
      const body = (await res.json().catch(() => ({}))) as { items?: GeneratedImage[]; error?: string };
      if (!res.ok) throw new Error(body.error || "Failed to load image history");
      setItems(body.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load image history");
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    void loadHistory();
  }, []);

  const generateImage = async () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          stylePreset,
          aspectRatio,
          quality,
          background,
        }),
      });

      const body = (await res.json().catch(() => ({}))) as { item?: GeneratedImage; error?: string };
      if (!res.ok || !body.item) {
        throw new Error(body.error || "Failed to generate image");
      }

      setItems((prev) => [body.item!, ...prev.filter((item) => item.id !== body.item!.id)]);
      setPrompt("");
      await loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image generation failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const latest = items[0] || null;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(80,120,255,0.18),transparent_30%),linear-gradient(135deg,#050816,#111827_55%,#0f172a)] px-4 py-10 text-white">
      <div className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-3xl border border-white/10 bg-white/6 p-6 shadow-2xl backdrop-blur-xl">
          <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/80">Production AI Imaging</p>
          <h1 className="mt-3 text-3xl font-semibold">3D Image Generator</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Generate polished 3D-style visuals with persisted history, provider-backed rendering, and deployable API controls.
          </p>

          <div className="mt-6 grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm text-slate-200">Prompt</span>
              <textarea
                className="min-h-36 rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm outline-none ring-0 transition focus:border-cyan-300/40"
                placeholder="Example: premium 3D render of a futuristic desk lamp with brushed aluminum body, soft blue ambient light, studio background"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="grid gap-2">
                <span className="text-sm text-slate-200">Style preset</span>
                <select
                  className="rounded-xl border border-white/10 bg-slate-950/70 p-3 text-sm"
                  value={stylePreset}
                  onChange={(e) => setStylePreset(e.target.value)}
                >
                  {STYLE_PRESETS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm text-slate-200">Aspect ratio</span>
                <select
                  className="rounded-xl border border-white/10 bg-slate-950/70 p-3 text-sm"
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                >
                  <option value="1:1">1:1</option>
                  <option value="16:9">16:9</option>
                  <option value="9:16">9:16</option>
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm text-slate-200">Quality</span>
                <select
                  className="rounded-xl border border-white/10 bg-slate-950/70 p-3 text-sm"
                  value={quality}
                  onChange={(e) => setQuality(e.target.value)}
                >
                  <option value="standard">Standard</option>
                  <option value="hd">HD</option>
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm text-slate-200">Background</span>
                <select
                  className="rounded-xl border border-white/10 bg-slate-950/70 p-3 text-sm"
                  value={background}
                  onChange={(e) => setBackground(e.target.value)}
                >
                  <option value="auto">Auto</option>
                  <option value="opaque">Opaque</option>
                  <option value="transparent">Transparent</option>
                </select>
              </label>
            </div>

            {error ? <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p> : null}

            <button
              onClick={generateImage}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-2xl bg-cyan-300 px-5 py-3 font-medium text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Generating..." : "Generate 3D Image"}
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-slate-950/65 p-6 shadow-2xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Latest Output</p>
              <h2 className="mt-1 text-xl font-semibold">Preview</h2>
            </div>
            <button
              onClick={() => void loadHistory()}
              className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/6"
              type="button"
            >
              Refresh
            </button>
          </div>

          <div className="mt-5 overflow-hidden rounded-3xl border border-white/10 bg-black/40">
            {latest?.imageUrl ? (
              <div className="relative aspect-square w-full">
                <Image
                  src={latest.imageUrl}
                  alt={latest.prompt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 40vw"
                  unoptimized
                />
              </div>
            ) : (
              <div className="flex aspect-square items-center justify-center p-8 text-center text-sm text-slate-400">
                {loading ? "Rendering your image..." : "Your latest generated result will appear here."}
              </div>
            )}
          </div>

          {latest ? (
            <div className="mt-4 grid gap-2 text-sm text-slate-300">
              <p><span className="text-slate-500">Prompt:</span> {latest.prompt}</p>
              <p><span className="text-slate-500">Provider:</span> {latest.provider} / {latest.model}</p>
              <p><span className="text-slate-500">Settings:</span> {latest.stylePreset || "custom"} • {latest.aspectRatio} • {latest.quality}</p>
              {latest.imageUrl ? (
                <a
                  href={latest.imageUrl}
                  className="inline-flex w-fit rounded-xl border border-white/10 px-3 py-2 text-sm text-cyan-200 transition hover:bg-white/6"
                >
                  Download latest image
                </a>
              ) : null}
            </div>
          ) : null}
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Generation History</h2>
              <p className="mt-1 text-sm text-slate-400">Persisted generations for the signed-in user.</p>
            </div>
            {loadingHistory ? <span className="text-sm text-slate-400">Loading...</span> : null}
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <article key={item.id} className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/55">
                <div className="relative aspect-[4/3] w-full bg-black/50">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.prompt}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1280px) 50vw, 25vw"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center px-4 text-center text-sm text-slate-500">
                      {item.status === "failed" ? item.errorMessage || "Generation failed" : "Pending"}
                    </div>
                  )}
                </div>
                <div className="grid gap-2 p-4 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full border border-white/10 px-2 py-1 text-xs uppercase tracking-[0.18em] text-slate-300">
                      {item.status}
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(item.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="line-clamp-3 text-slate-100">{item.prompt}</p>
                  <p className="text-xs text-slate-400">
                    {item.provider} / {item.model} • {item.aspectRatio} • {item.quality}
                  </p>
                  {item.imageUrl ? (
                    <a
                      href={item.imageUrl}
                      className="inline-flex w-fit rounded-xl border border-white/10 px-3 py-2 text-xs text-cyan-200 transition hover:bg-white/6"
                    >
                      Open image
                    </a>
                  ) : null}
                </div>
              </article>
            ))}

            {!loadingHistory && items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 px-6 py-10 text-sm text-slate-400 md:col-span-2 xl:col-span-3">
                No generations yet. Create your first production-ready 3D-style image above.
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
