"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ImageIcon, Sparkles, X } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

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
  const [notices, setNotices] = useState<Array<{ id: string; kind: "info" | "success" | "error"; text: string }>>([]);

  const pushNotice = (kind: "info" | "success" | "error", text: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setNotices((prev) => [{ id, kind, text }, ...prev].slice(0, 6));
    setTimeout(() => {
      setNotices((prev) => prev.filter((n) => n.id !== id));
    }, 6000);
  };

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await fetch("/api/generate-image", { cache: "no-store" });
      const body = (await res.json().catch(() => ({}))) as { items?: GeneratedImage[]; error?: string };
      if (!res.ok) throw new Error(body.error || "Failed to load image history");
      setItems(body.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load image history");
      pushNotice("error", err instanceof Error ? err.message : "Failed to load image history");
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
      pushNotice("success", "Image generated and saved to history.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Image generation failed. Try again.";
      setError(message);
      pushNotice("error", message);
    } finally {
      setLoading(false);
    }
  };

  const latest = items[0] || null;

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto mb-3 w-full max-w-7xl space-y-2">
        {notices.map((notice) => (
          <div
            key={notice.id}
            className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${
              notice.kind === "error"
                ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300"
                : notice.kind === "success"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "border-border bg-muted/30 text-foreground"
            }`}
          >
            <span>{notice.text}</span>
            <button type="button" onClick={() => setNotices((prev) => prev.filter((item) => item.id !== notice.id))}>
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 pb-4">
        <Button variant="outline" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
            Return to dashboard
          </Link>
        </Button>
        <Button variant="outline" onClick={() => void loadHistory()} disabled={loadingHistory}>
          Refresh history
        </Button>
      </div>

      <div className="mx-auto grid w-full max-w-7xl gap-4 lg:gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>3D Image Generator</CardTitle>
            <CardDescription>Choose a preset, tune the output, and generate a deployable asset.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Prompt</label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-36"
                placeholder="Example: premium 3D render of a futuristic desk lamp with brushed aluminum body, blue ambient glow, clean studio background"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Style preset</label>
                <select
                  className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex h-10 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px]"
                  value={stylePreset}
                  onChange={(e) => setStylePreset(e.target.value)}
                >
                  {STYLE_PRESETS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Aspect ratio</label>
                <select
                  className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex h-10 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px]"
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                >
                  <option value="1:1">1:1</option>
                  <option value="16:9">16:9</option>
                  <option value="9:16">9:16</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Quality</label>
                <select
                  className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex h-10 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px]"
                  value={quality}
                  onChange={(e) => setQuality(e.target.value)}
                >
                  <option value="standard">Standard</option>
                  <option value="hd">HD</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Background</label>
                <select
                  className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex h-10 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px]"
                  value={background}
                  onChange={(e) => setBackground(e.target.value)}
                >
                  <option value="auto">Auto</option>
                  <option value="opaque">Opaque</option>
                  <option value="transparent">Transparent</option>
                </select>
              </div>
            </div>

            {error ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={generateImage} disabled={loading} className="w-full sm:w-auto">
                <Sparkles className="h-4 w-4" />
                {loading ? "Generating..." : "Generate image"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Output is saved to your history and can be re-opened later.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Latest Output</CardTitle>
            <CardDescription>Preview the most recent generated image and its settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-hidden rounded-xl border bg-muted/30">
              {latest?.imageUrl ? (
                <div className="relative aspect-square w-full">
                  <Image
                    src={latest.imageUrl}
                    alt={latest.prompt}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1280px) 100vw, 35vw"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="flex aspect-square items-center justify-center p-8 text-center text-sm text-muted-foreground">
                  {loading ? "Generating your latest image..." : "Your most recent generated image will appear here."}
                </div>
              )}
            </div>

            {latest ? (
              <div className="space-y-2 text-sm">
                <p className="font-medium">{latest.prompt}</p>
                <p className="text-muted-foreground">
                  {latest.provider} / {latest.model} • {latest.stylePreset || "custom"} • {latest.aspectRatio} • {latest.quality}
                </p>
                {latest.imageUrl ? (
                  <Button variant="outline" asChild>
                    <a href={latest.imageUrl}>Open latest image</a>
                  </Button>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="mx-auto mt-4 w-full max-w-7xl sm:mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Generation History</CardTitle>
            <CardDescription>Review previous outputs created from this account.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingHistory ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-64 animate-pulse rounded-xl border bg-muted/40 sm:h-72"
                    />
                  ))}
                </div>
            ) : items.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                No generated images yet. Create one above to start building your asset library.
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Showing three cards at a time. Swipe or scroll sideways to browse older generations.
                </p>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((item) => (
                  <Card
                    key={item.id}
                    className="gap-0 overflow-hidden py-0"
                  >
                    <div className="relative aspect-[4/3] w-full border-b bg-muted/30">
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
                        <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
                          {item.status === "failed" ? item.errorMessage || "Generation failed" : "Pending"}
                        </div>
                      )}
                    </div>
                    <CardContent className="space-y-3 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                          <ImageIcon className="h-3.5 w-3.5" />
                          {item.status}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(item.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="line-clamp-3 text-sm font-medium">{item.prompt}</p>
                      <Input readOnly value={`${item.provider} / ${item.model}`} className="h-9 text-xs" />
                      {item.imageUrl ? (
                        <Button variant="outline" asChild className="w-full">
                          <a href={item.imageUrl}>Open image</a>
                        </Button>
                      ) : null}
                    </CardContent>
                  </Card>
                ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
