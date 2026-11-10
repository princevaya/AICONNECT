"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, MessageSquare, Video, Calendar, ChevronDown, Shield } from "lucide-react";

const CATEGORIES = [
  {
    id: "getting-started",
    title: "Getting Started",
    desc: "Learn the basics of AIConnect.",
    guide: "Open the Dashboard to start an instant meeting, accept External Chat connection requests, and configure your profile & browser notifications in Settings.",
  },
  {
    id: "video-meetings",
    title: "Video Meetings",
    desc: "Host and join high-quality calls.",
    guide: "Launch a LiveKit conference from the Dashboard or start 1:1 audio/video calls directly from any connected chat room header.",
  },
  {
    id: "account-security",
    title: "Account & E2EE Security",
    desc: "Manage encryption, requests, and privacy.",
    guide: "Enable End-to-End Encryption inside any chat room header, control who can message you via Incoming Requests, or review your settings anytime.",
  },
];

const faqs = [
  {
    category: "video-meetings",
    q: "How do I start a meeting?",
    a: "Go to the Dashboard and click 'New Meeting' or 'Join Meeting', or click the Call button inside any accepted chat room to start a 1:1 audio or video call.",
    icon: Video,
  },
  {
    category: "getting-started",
    q: "How do I use the external chat & message requests?",
    a: "Open External Chat from the sidebar, search for users, and click 'Send Request'. Direct messages require accepted requests first, ensuring unwanted users cannot message you.",
    icon: MessageSquare,
  },
  {
    category: "account-security",
    q: "How does End-to-End Encryption (E2EE) work?",
    a: "Toggle the lock icon in any chat header to enable ECDH P-256 + AES-256-GCM encryption. Keys stay in your browser and the server stores only ciphertext.",
    icon: Shield,
  },
  {
    category: "getting-started",
    q: "How do I schedule a meeting?",
    a: "Navigate to the Schedule tab from the sidebar, pick a date and time, and send invites to your team.",
    icon: Calendar,
  },
];

export default function HelpPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const filteredFaqs = faqs.filter((faq) => {
    const matchesSearch =
      !search.trim() ||
      faq.q.toLowerCase().includes(search.toLowerCase()) ||
      faq.a.toLowerCase().includes(search.toLowerCase());
    const matchesCat = !selectedCategory || faq.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const activeCategoryObj = CATEGORIES.find((c) => c.id === selectedCategory) || null;

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto min-h-[calc(100vh-4rem)]">
      <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
        <Link href="/dashboard">
          <Button variant="outline" size="icon" className="rounded-full">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Help & Info</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Find answers and learn how to use AIConnect Meet.</p>
        </div>
      </div>

      {/* Search Hero */}
      <div className="bg-primary/5 border border-primary/10 rounded-2xl p-5 sm:p-8 text-center mb-6 sm:mb-8">
        <h2 className="text-lg sm:text-xl font-semibold mb-2">How can we help you today?</h2>
        <div className="relative max-w-md mx-auto mt-4">
          <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <Input
            className="pl-10 h-11 bg-background"
            placeholder="Search for articles, guides, and FAQs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-6">
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setSelectedCategory(isSelected ? null : cat.id);
                setOpenFaq(0);
              }}
              className={`p-5 sm:p-6 border rounded-xl text-left transition-all cursor-pointer ${
                isSelected ? "border-primary bg-primary/5 ring-1 ring-primary/30 shadow-sm" : "bg-card hover:shadow-md"
              }`}
            >
              <h3 className="font-semibold mb-1">{cat.title}</h3>
              <p className="text-xs text-muted-foreground">{cat.desc}</p>
            </button>
          );
        })}
      </div>

      {activeCategoryObj && (
        <div className="mb-8 rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">{activeCategoryObj.title} Guide</p>
            <p className="text-xs text-muted-foreground mt-1">{activeCategoryObj.guide}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setSelectedCategory(null)} className="self-start sm:self-auto">
            Show All
          </Button>
        </div>
      )}

      {/* FAQ Section */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Frequently Asked Questions</h3>
        <div className="space-y-3">
          {filteredFaqs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No results found for &quot;{search}&quot;</p>
          ) : (
            filteredFaqs.map((faq, i) => {
              const Icon = faq.icon;
              const isOpen = openFaq === i;
              return (
                <div key={faq.q} className="border rounded-lg overflow-hidden bg-card">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="font-medium text-sm">{faq.q}</span>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 text-sm text-muted-foreground">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
