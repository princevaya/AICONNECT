import AnimationContainer from "@/components/global/animation-container";
import MaxWidthWrapper from "@/components/global/max-width-wrapper";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowRight,
  BookmarkCheck,
  Bug,
  Compass,
  Headphones,
  LifeBuoy,
  Mail,
  MessageCircle,
  Share2,
  UserRound,
} from "lucide-react";
import Link from "next/link";

const SUPPORT_TIERS = [
  {
    title: "Product guidance",
    description:
      "Live walkthroughs for new teams or features you just unlocked during onboarding.",
    icon: Compass,
    badge: "Concierge",
  },
  {
    title: "Technical escalations",
    description:
      "Direct channel to our engineering rotation for API issues, SSO, or data exports.",
    icon: Bug,
    badge: "Priority",
  },
  {
    title: "Community office hours",
    description:
      "Weekly sessions with customers sharing playbooks, templates, and growth experiments.",
    icon: Share2,
    badge: "Collective",
  },
];

const CONTACT_CHANNELS = [
  {
    label: "Email",
    value: "help@aiconnect.com",
    href: "mailto:help@aiconnect.com",
    icon: Mail,
  },
  {
    label: "Support Desk",
    value: "Open a ticket",
    href: "https://support.aiconnect.com",
    icon: LifeBuoy,
  },
  {
    label: "Slack Connect",
    value: "Request invite",
    href: "https://aiconnect.com/help/slack",
    icon: MessageCircle,
  },
  {
    label: "Live status",
    value: "status.aiconnect.com",
    href: "https://status.aiconnect.com",
    icon: Headphones,
  },
];

const FAQ_ENTRIES = [
  {
    question: "What response times can we expect?",
    answer:
      "Standard plans receive a first reply within six business hours. Teams on the Scale tier or higher have a 90-minute SLA during regional business hours.",
  },
  {
    question: "Can you help us migrate existing interview data?",
    answer:
      "Yes. Our migrations team can import recordings, transcripts, scorecards, and pipeline metadata from most ATS or cloud storage providers.",
  },
  {
    question: "Do you offer compliance documentation?",
    answer:
      "We maintain SOC 2 Type II, GDPR, and EEOC-aligned audit reports. Request the latest package through the form below.",
  },
  {
    question: "How do I join beta programs?",
    answer:
      'Complete the interest form and select the "Beta" topic. We\'ll follow up with eligibility requirements and timelines.',
  },
];

const HelpPage = () => {
  return (
    <div className="relative overflow-hidden bg-[radial-gradient(circle_at_top,rgba(0,0,0,0.12),transparent_60%)] pb-16">
      <MaxWidthWrapper className="relative z-10">
        <AnimationContainer>
          <section className="mx-auto flex max-w-4xl flex-col items-center gap-4 py-16 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-4 py-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <LifeBuoy className="h-4 w-4 text-primary" />
              Help Center
            </span>
            <h1 className="text-balance font-heading text-4xl leading-[1.1] text-foreground sm:text-5xl md:text-6xl">
              Humans + AI dedicated to your hiring flow
            </h1>
            <p className="text-lg text-muted-foreground">
              Whether you need playbooks, troubleshooting, or creative strategy,
              our support studio is on-call across every timezone.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button className="gap-2" asChild>
                <Link href="#contact">
                  Contact support
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" className="gap-2" asChild>
                <Link href="/blog">
                  Read product updates
                  <BookmarkCheck className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </section>
        </AnimationContainer>

        <AnimationContainer delay={0.1}>
          <section className="grid gap-6 rounded-4xl border border-border/60 bg-linear-to-br from-background/80 via-background/95 to-background/80 p-8 lg:grid-cols-[1.2fr_0.8fr]">
            <Card className="border-none bg-transparent shadow-none">
              <CardHeader>
                <CardTitle className="text-2xl">Layers of support</CardTitle>
                <CardDescription>
                  Choose the channel that matches the type of assistance you
                  need.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                {SUPPORT_TIERS.map((tier) => (
                  <Card
                    key={tier.title}
                    className="border-border/70 bg-card/70"
                  >
                    <CardHeader className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                          {tier.badge}
                        </span>
                        <tier.icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <CardTitle className="text-lg">{tier.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {tier.description}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
            <Card className="border-border/70 bg-muted/40">
              <CardHeader>
                <CardTitle className="text-xl">Scheduled programs</CardTitle>
                <CardDescription>
                  Secure a slot with our specialists for deeper engagements.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div className="rounded-xl border border-border/60 bg-background/80 p-4">
                  <p className="font-medium text-foreground">Executive QBRs</p>
                  <p>
                    Quarterly reviews of adoption, ROI, and roadmap influence.
                  </p>
                </div>
                <div className="rounded-xl border border-border/60 bg-background/80 p-4">
                  <p className="font-medium text-foreground">
                    Workflow studios
                  </p>
                  <p>
                    Hands-on sessions to rewire scheduling, feedback, and
                    analytics.
                  </p>
                </div>
                <div className="rounded-xl border border-border/60 bg-background/80 p-4">
                  <p className="font-medium text-foreground">
                    Security briefings
                  </p>
                  <p>
                    Invite your compliance leads for deep dives into our
                    controls.
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="ghost" className="gap-2 px-0 text-primary">
                  Reserve a session
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </section>
        </AnimationContainer>

        <AnimationContainer delay={0.15}>
          <section className="mt-16 grid gap-6 md:grid-cols-2" id="contact">
            <Card className="border-border/60 bg-card/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <LifeBuoy className="h-5 w-5 text-primary" />
                  Reach our team
                </CardTitle>
                <CardDescription>
                  Pick the fastest lane for your question.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {CONTACT_CHANNELS.map((channel) => (
                  <Link
                    key={channel.label}
                    href={channel.href}
                    className="flex items-center gap-4 rounded-2xl border border-border/60 bg-background/80 p-4 transition-colors hover:bg-accent/40"
                  >
                    <channel.icon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {channel.label}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {channel.value}
                      </p>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-linear-to-br from-muted/40 via-background to-muted/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <UserRound className="h-5 w-5 text-primary" />
                  Concierge form
                </CardTitle>
                <CardDescription>
                  Tell us what you need and we will route it to the right team.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="name">Full name</Label>
                    <Input
                      id="name"
                      placeholder="Alex Mercer"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Work email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="alex@studio.com"
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      placeholder="Studio North"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="topic">Topic</Label>
                    <div className="relative mt-1">
                      <select
                        id="topic"
                        className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
                      >
                        <option>General question</option>
                        <option>Technical issue</option>
                        <option>Billing</option>
                        <option>Security</option>
                        <option>Beta programs</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div>
                  <Label htmlFor="details">Details</Label>
                  <Textarea
                    id="details"
                    placeholder="Share relevant links, timelines, or context so we can respond faster."
                    className="mt-1 min-h-30"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <input type="checkbox" id="updates" className="h-4 w-4" />
                  <Label htmlFor="updates" className="cursor-pointer">
                    Keep me posted about launches and webinars
                  </Label>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full gap-2">
                  Submit request
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </section>
        </AnimationContainer>

        <AnimationContainer delay={0.2}>
          <section className="mt-16 rounded-4xl border border-border/60 bg-card/70 p-8">
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div>
                <h2 className="text-3xl font-heading">
                  Frequently asked questions
                </h2>
                <p className="mt-2 text-muted-foreground">
                  Still curious? Start here before reaching out.
                </p>
              </div>
              <div className="flex items-center justify-end gap-4 text-sm text-muted-foreground">
                <Share2 className="h-4 w-4" />
                Last updated{" "}
                {new Date().toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            </div>
            <Accordion
              type="single"
              collapsible
              className="mt-6 border-t border-border/50"
            >
              {FAQ_ENTRIES.map((faq, index) => (
                <AccordionItem key={faq.question} value={`faq-${index}`}>
                  <AccordionTrigger className="text-base text-foreground">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        </AnimationContainer>

        <AnimationContainer delay={0.25}>
          <section className="mt-16 grid gap-6 md:grid-cols-2">
            <Card className="border-border/60 bg-muted/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  Community hub
                </CardTitle>
                <CardDescription>
                  Join thousands of talent operators sharing experiments every
                  week.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Access weekly prompts, teardown sessions, and backstage
                  content.
                </p>
                <Button variant="outline" className="gap-2" asChild>
                  <Link href="https://community.aiconnect.com" target="_blank">
                    Enter the hub
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
            <Card className="border-border/60 bg-card/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Headphones className="h-5 w-5 text-primary" />
                  Status & uptime
                </CardTitle>
                <CardDescription>
                  Subscribe to incident updates and maintenance windows.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <p>
                  We share transparent timelines and mitigations whenever
                  performance is impacted.
                </p>
                <Button className="gap-2" variant="ghost" asChild>
                  <Link href="https://status.aiconnect.com" target="_blank">
                    View live status
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </section>
        </AnimationContainer>
      </MaxWidthWrapper>

      <div className="pointer-events-none absolute inset-x-0 top-24 h-105 bg-[radial-gradient(circle,rgba(79,70,229,0.18),transparent_55%)]" />
    </div>
  );
};

export default HelpPage;
