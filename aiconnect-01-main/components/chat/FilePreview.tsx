"use client";

import { useState } from "react";
import Image from "next/image";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  file: {
    id: string;
    name: string;
    fileType: string;
    fileSize: number;
    downloadUrl: string;
  };
};

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const val = bytes / Math.pow(1024, idx);
  return `${val.toFixed(idx === 0 ? 0 : 2)} ${units[idx]}`;
}

export default function FilePreview({ file }: Props) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const isImage = file.fileType.startsWith("image/");
  const isPdf = file.fileType === "application/pdf";

  const handleDownload = async () => {
    setDownloading(true);
    setError("");
    try {
      const isDirectUrl =
        file.downloadUrl.startsWith("http://") ||
        file.downloadUrl.startsWith("https://") ||
        file.downloadUrl.startsWith("data:");

      if (isDirectUrl) {
        const link = document.createElement("a");
        link.href = file.downloadUrl;
        link.download = file.name;
        link.rel = "noopener noreferrer";
        document.body.appendChild(link);
        link.click();
        link.remove();
        return;
      }

      const response = await fetch(file.downloadUrl, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to download file");

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Failed to download file");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/20 bg-white/10 p-2">
      {isImage ? (
        <Image
          src={file.downloadUrl}
          alt={file.name}
          width={640}
          height={320}
          unoptimized
          className="max-h-44 rounded-md object-cover"
        />
      ) : isPdf ? (
        <div className="h-44 w-full overflow-hidden rounded-md border border-white/20 bg-white">
          <iframe src={file.downloadUrl} className="h-full w-full" title={file.name} />
        </div>
      ) : null}

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium">{file.name}</p>
          <p className="text-[11px] opacity-80">{formatBytes(file.fileSize)}</p>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={() => void handleDownload()} disabled={downloading}>
          {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        </Button>
      </div>
      {error ? <p className="mt-1 text-[11px] text-red-300">{error}</p> : null}
    </div>
  );
}
