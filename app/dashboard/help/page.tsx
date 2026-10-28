"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, MessageSquare, Video, Calendar, ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "How do I start a meeting?",
    a: "Go to the Dashboard and click 'New Meeting' or 'Join Meeting' to start collaborating instantly.",
    icon: Video,
  },
  {
    q: "How do I use the external chat?",
    a: "Click the 'Chat' icon in the left sidebar. You can search for users, accept incoming requests, and start direct messages.",
    icon: MessageSquare,
  },
  {
    q: "How do I schedule a meeting?",
    a: "Navigate to the Schedule tab from the sidebar, pick a date and time, and send invites to your team.",
    icon: Calendar,
  },
];

export default function HelpPage() {
  const [search, setSearch] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const filteredFaqs = faqs.filter(faq => faq.q.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-8 max-w-4xl mx-auto min-h-[calc(100vh-4rem)]">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard">
          <Button variant="outline" size="icon" className="rounded-full">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Help & Info</h1>
          <p className="text-sm text-muted-foreground">Find answers and learn how to use AIConnect Meet.</p>
        </div>
      </div>

      {/* Search Hero */}
      <div className="bg-primary/5 border border-primary/10 rounded-2xl p-8 text-center mb-8">
        <h2 className="text-xl font-semibold mb-2">How can we help you today?</h2>
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

      <div className="grid md:grid-cols-3 gap-6 mb-12">
        {[
          { title: "Getting Started", desc: "Learn the basics of AIConnect." },
          { title: "Video Meetings", desc: "Host and join high-quality calls." },
          { title: "Account & Billing", desc: "Manage your subscription." }
        ].map((cat, i) => (
          <div key={i} className="p-6 border rounded-xl bg-card hover:shadow-md transition-shadow cursor-pointer">
            <h3 className="font-semibold mb-1">{cat.title}</h3>
            <p className="text-xs text-muted-foreground">{cat.desc}</p>
          </div>
        ))}
      </div>

      {/* FAQ Section */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Frequently Asked Questions</h3>
        <div className="space-y-3">
          {filteredFaqs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No results found for "{search}"</p>
          ) : (
            filteredFaqs.map((faq, i) => {
              const Icon = faq.icon;
              const isOpen = openFaq === i;
              return (
                <div key={i} className="border rounded-lg overflow-hidden bg-card">
                  <button 
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="font-medium text-sm">{faq.q}</span>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
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
