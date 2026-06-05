"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import MagicBadge from "@/components/ui/magic-badge";
import { Sparkles, Download, Loader2 } from "lucide-react";

export default function AIImageView() {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    // Simulate generation
    setTimeout(() => {
      setGeneratedImages([...generatedImages, "generated-image-1"]);
      setIsGenerating(false);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold sm:text-3xl">3D Image Generator</h1>
          <p className="text-muted-foreground">Create stunning 3D images with AI</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Generate 3D Image
            </CardTitle>
            <CardDescription>
              Describe what you want to generate in the 3D space
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Describe your 3D scene (e.g., 'A futuristic city at sunset with flying cars')"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
            />
            <Button 
              onClick={handleGenerate} 
              disabled={!prompt.trim() || isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate 3D Image
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Generations</CardTitle>
            <CardDescription>Your latest 3D creations</CardDescription>
          </CardHeader>
          <CardContent>
            {generatedImages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Sparkles className="mx-auto h-12 w-12 opacity-50 mb-4" />
                <p>No images generated yet</p>
                <p className="text-sm">Create your first 3D image above</p>
              </div>
            ) : (
              <div className="space-y-4">
                {generatedImages.map((image, index) => (
                  <div key={index} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                        <Sparkles className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="font-medium">Image {index + 1}</p>
                        <p className="text-sm text-muted-foreground">Generated just now</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <MagicBadge title="3D" />
                      <Button size="sm" variant="outline">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
