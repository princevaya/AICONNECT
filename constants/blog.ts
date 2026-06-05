export type BlogPost = {
  slug: string;
  id: string;
  title: string;
  excerpt: string;
  author: string;
  avatarColor: string;
  date: string;
  readingTime: string;
  category: string;
  tags: string[];
  body: string[];
};

export const FEATURED_POST: BlogPost = {
  slug: "bias-aware-interviewing",
  id: "featured",
  title: "What AI hiring panels taught us about bias-aware interviewing",
  excerpt:
    "We analyzed over 12,000 interview transcripts to understand how AI co-pilots can coach hiring teams toward more inclusive conversations without losing velocity.",
  author: "Riya Patel",
  avatarColor: "bg-emerald-500",
  date: "2025-12-02",
  readingTime: "7 min read",
  category: "Research",
  tags: ["bias", "ai", "culture"],
  body: [
    "AI copilots don't magically eliminate bias, but they do make it visible. By analyzing thousands of interviews we noticed how subtle shifts in pacing, prompt framing, and recap notes changed downstream hiring decisions.",
    "The most effective teams used AI as a reflection partner rather than a judge. They replayed moments where interviewers interrupted candidates, highlighted leading questions, and suggested alternate follow-ups.",
    "We share the frameworks those teams adopted so you can design equitable panels without slowing down offers.",
  ],
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "cinematic-candidate-journeys",
    id: "1",
    title: "Designing candidate journeys that feel cinematic",
    excerpt:
      "From invitation to follow-up, here is a creative blueprint for teams that want every interview touchpoint to feel effortlessly premium.",
    author: "Marco Silva",
    avatarColor: "bg-indigo-500",
    date: "2025-11-18",
    readingTime: "5 min read",
    category: "Experience",
    tags: ["journey", "brand"],
    body: [
      "World-class recruiting teams storyboard their funnels like a film. Every transition—calendar invite, reminder, waiting-room copy—carries emotional weight.",
      "We break down the beats from teams who pair motion, tone, and personalization so candidates never feel lost.",
      "Steal the templates to audit your current journey and upgrade the next cohort of interviews.",
    ],
  },
  {
    slug: "signals-after-technical-screens",
    id: "2",
    title: "Signals that predict conversion after technical screens",
    excerpt:
      "We tracked offer acceptances across 30 SaaS companies to surface the conversational cues that correlate with closing senior talent.",
    author: "Dylan Kim",
    avatarColor: "bg-fuchsia-500",
    date: "2025-11-07",
    readingTime: "8 min read",
    category: "Playbooks",
    tags: ["metrics", "technical"],
    body: [
      "Candidates reveal intent long before closing. Using LiveKit transcripts and AIConnect scoring, we found five linguistic cues that predict acceptance with 76% accuracy.",
      "The top signals: future-tense ownership, proactive trade-off questions, and collaborative mirroring.",
      "Instrument these cues in your scorecards to prioritize follow-ups with high-intent candidates.",
    ],
  },
  {
    slug: "crafting-hiring-data-stories",
    id: "3",
    title: "Why your hiring data deserves the same craft as your product",
    excerpt:
      "Data storytelling for talent teams is still an afterthought. Here is a system for making insights as polished as your roadmap decks.",
    author: "Isabelle Laurent",
    avatarColor: "bg-amber-500",
    date: "2025-10-29",
    readingTime: "6 min read",
    category: "Data",
    tags: ["analytics", "ops"],
    body: [
      "Executives trust hiring metrics when they feel as considered as product dashboards. We distilled a four-layer narrative stack borrowed from growth squads.",
      "It starts with clarity around baselines, introduces tension with asymmetry, and closes with a cinematic call-to-action.",
      "Download the slide anatomy we use internally to brief stakeholders in under five minutes.",
    ],
  },
  {
    slug: "founders-first-hundred-interviews",
    id: "4",
    title: "Founders on recording their first hundred hiring conversations",
    excerpt:
      "Four founders share how they used AIConnect's intelligent recording stack to build better narratives for investors and candidates alike.",
    author: "Nadia Choi",
    avatarColor: "bg-cyan-500",
    date: "2025-10-11",
    readingTime: "9 min read",
    category: "Stories",
    tags: ["founders", "voice"],
    body: [
      "Early-stage founders often juggle pitching and interviewing in the same day. Recording those conversations helped them create highlight reels for boards and top prospects.",
      "We collected rituals from teams who annotate clips, build soundbites, and reuse stories in onboarding.",
      "If you're scaling from 10 to 50 employees, these practices compress the feedback loop dramatically.",
    ],
  },
  {
    slug: "async-debrief-playbook",
    id: "5",
    title: "The new rules of async debriefs",
    excerpt:
      "Your hiring squads are global, but your debrief ritual is still synchronous. We gathered templates for running async decisions with confidence.",
    author: "Priya Iver",
    avatarColor: "bg-rose-500",
    date: "2025-09-21",
    readingTime: "4 min read",
    category: "Collaboration",
    tags: ["async", "rituals"],
    body: [
      "Async debriefs don't mean chaos. They require structure, guardrails, and shared language.",
      "We walk through the cadence that keeps context high while reducing meetings by 60% for distributed teams.",
      "Use the included Notion template to pilot an async cycle next week.",
    ],
  },
  {
    slug: "product-thinking-in-talent-ops",
    id: "6",
    title: "Layering product thinking into talent operations",
    excerpt:
      "Borrow theses from product management to iterate on your interview loops with the same rigor as you ship new features.",
    author: "Cassidy Bright",
    avatarColor: "bg-blue-500",
    date: "2025-09-03",
    readingTime: "10 min read",
    category: "Strategy",
    tags: ["ops", "pm"],
    body: [
      "Your hiring engine deserves sprints, retros, and velocity charts just like your product roadmap.",
      "We translate the rituals of great PM orgs into the world of recruiting so you can treat each role like a mini product launch.",
      "Expect a backlog template, experiment tracker, and service blueprint ready to clone.",
    ],
  },
];

export const TOPICS = [
  "AI copilots",
  "Employer brand",
  "Structured interviews",
  "Enablement",
  "Data storytelling",
  "Leadership",
  "Compensation",
  "Culture",
];

export const AUDIO_SERIES = [
  {
    title: "Signals & Stories",
    description: "Bi-weekly deconstructions of extraordinary hiring moments.",
    action: "Listen",
  },
  {
    title: "The Operator's Notebook",
    description: "Mini workshops for talent leaders in under ten minutes.",
    action: "Queue episode",
  },
];

export const RESOURCE_PICKS = [
  {
    title: "Interview Motion System 2.0",
    description:
      "A Figma kit for architecting consistent interview experiences.",
  },
  {
    title: "Hiring Health Dashboard",
    description:
      "A Notion template to narrate your funnel to execs in minutes.",
  },
  {
    title: "Story-driven scorecards",
    description:
      "Prompts that help interviewers capture nuance beyond ratings.",
  },
];

export function getAllBlogPosts(): BlogPost[] {
  return [FEATURED_POST, ...BLOG_POSTS];
}

export function findBlogPost(slug: string): BlogPost | undefined {
  return getAllBlogPosts().find((post) => post.slug === slug);
}
