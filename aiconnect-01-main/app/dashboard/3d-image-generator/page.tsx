"use client";

import { useState } from "react";

export default function ImageGenerator() {
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateImage = async () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setImage(null);

      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) {
        throw new Error("Failed to generate image");
      }

      // 🔥 IMPORTANT CHANGE (JSON → BLOB)
      const blob = await res.blob();
      const imageUrl = URL.createObjectURL(blob);
      setImage(imageUrl);

    } catch (err) {
      setError("Image generation failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white px-4">
      <div className="w-full max-w-xl rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-6 shadow-xl">
        <h1 className="text-3xl font-semibold text-center">
          3D Image Generator
        </h1>

        <p className="text-sm text-gray-400 text-center mt-2">
          Generate high-quality 3D images using AI
        </p>

        {/* Input */}
        <input
          className="mt-6 w-full p-3 rounded-lg bg-black/40 border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/30"
          placeholder="Example: 3D futuristic robot, cinematic lighting"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />

        {/* Error */}
        {error && (
          <p className="mt-2 text-sm text-red-400">{error}</p>
        )}

        {/* Button */}
        <button
          onClick={generateImage}
          disabled={loading}
          className="mt-4 w-full py-3 rounded-lg bg-white text-black font-medium hover:bg-gray-200 transition disabled:opacity-50"
        >
          {loading ? "Generating..." : "Generate Image"}
        </button>

        {/* Image Preview */}
        {image && (
          <div className="mt-6 rounded-xl overflow-hidden border border-white/10">
            <img
              src={image}
              alt="Generated"
              className="w-full object-cover"
            />
          </div>
        )}
      </div>
    </div>
  );
}
