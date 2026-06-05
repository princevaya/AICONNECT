import AnimationContainer from "@/components/global/animation-container";
import MaxWidthWrapper from "@/components/global/max-width-wrapper";
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
import {
  AUDIO_SERIES,
  BLOG_POSTS,
  FEATURED_POST,
  RESOURCE_PICKS,
  TOPICS,
} from "@/constants/blog";
import { format } from "date-fns";
import {
  ArrowUpRight,
  BookOpen,
  Clock,
  PenSquare,
  Podcast,
  Rss,
  Sparkles,
  Tag,
} from "lucide-react";
import Link from "next/link";

const BlogPage = () => {
  return (
    <div className="relative overflow-hidden bg-[radial-gradient(circle_at_top,rgba(0,0,0,0.12),transparent_55%)] pb-20">
      <MaxWidthWrapper className="relative z-10">
        <AnimationContainer>
          <section className="mx-auto flex max-w-4xl flex-col items-center gap-6 py-16 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-card/60 px-4 py-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Field Notes
            </span>
            <h1 className="text-balance font-heading text-4xl leading-[1.1] text-foreground sm:text-5xl md:text-6xl">
              Ideas, research, and playbooks for memorable hiring moments
            </h1>
            <p className="text-lg text-muted-foreground">
              Curated by the AIConnect editorial team. We publish at the pace of
              change—covering systems thinking, talent craft, and the rituals
              shaping modern recruiting.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button className="gap-2">
                Subscribe to updates
                <Rss className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="gap-2" asChild>
                <Link href="/help">
                  Pitch a story
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </section>
        </AnimationContainer>

        <AnimationContainer delay={0.1}>
          <section className="grid gap-6 rounded-4xl border border-border/60 bg-linear-to-br from-background/80 via-background/90 to-background/70 p-8 lg:grid-cols-[1.3fr_0.7fr]">
            <Card className="border-none bg-transparent shadow-none">
              <CardHeader className="space-y-4">
                <span className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  Featured insight
                </span>
                <CardTitle className="text-3xl font-semibold">
                  {FEATURED_POST.title}
                </CardTitle>
                <CardDescription className="text-base text-muted-foreground">
                  {FEATURED_POST.excerpt}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <span
                      className={`h-8 w-8 rounded-full ${FEATURED_POST.avatarColor}`}
                    />
                    {FEATURED_POST.author}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {FEATURED_POST.readingTime}
                  </span>
                  <span>{format(new Date(FEATURED_POST.date), "PP")}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {FEATURED_POST.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-border/70 px-3 py-1 text-xs uppercase tracking-wide text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  variant="ghost"
                  className="gap-2 px-0 text-primary"
                  asChild
                >
                  <Link href={`/blog/${FEATURED_POST.slug}`}>
                    Continue reading
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
            <Card className="h-full border-none bg-muted/40">
              <CardHeader>
                <CardTitle className="text-lg">Audio studio</CardTitle>
                <CardDescription>
                  Snackable episodes for teams who learn together.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {AUDIO_SERIES.map((series) => (
                  <div
                    key={series.title}
                    className="flex items-start justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{series.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {series.description}
                      </p>
                    </div>
                    <Button variant="ghost" className="gap-2 text-primary">
                      {series.action}
                      <Podcast className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        </AnimationContainer>

        <AnimationContainer delay={0.15}>
          <section className="mt-16 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {BLOG_POSTS.map((post) => (
              <Card
                key={post.id}
                className="flex h-full flex-col border-border/60 bg-card/80"
              >
                <CardHeader className="space-y-3">
                  <span className="inline-flex w-fit items-center gap-2 rounded-full bg-secondary/40 px-3 py-1 text-xs font-medium">
                    {post.category}
                    <Tag className="h-3.5 w-3.5" />
                  </span>
                  <CardTitle className="text-xl leading-tight">
                    {post.title}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {post.excerpt}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-between space-y-6">
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {post.author}
                    </span>
                    <span>•</span>
                    <span>{post.readingTime}</span>
                    <span>•</span>
                    <span>{format(new Date(post.date), "PP")}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {post.tags.map((tag) => (
                      <span
                        key={`${post.id}-${tag}`}
                        className="rounded-full border border-border/50 px-2.5 py-1 uppercase tracking-wide text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <Button
                    variant="ghost"
                    className="gap-2 px-0 text-primary"
                    asChild
                  >
                    <Link href={`/blog/${post.slug}`}>
                      Read article
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </section>
        </AnimationContainer>

        <AnimationContainer delay={0.2}>
          <section className="mt-16 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <Card className="border-border/60 bg-card/80">
              <CardHeader>
                <CardTitle className="text-2xl">Topics in rotation</CardTitle>
                <CardDescription>
                  Explore themes we are currently reporting on.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {TOPICS.map((topic) => (
                  <div
                    key={topic}
                    className="rounded-2xl border border-border/60 bg-background/60 px-4 py-3 text-sm font-medium text-foreground"
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      {topic}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="border-border/60 bg-linear-to-br from-muted/40 via-background to-muted/30">
              <CardHeader>
                <CardTitle className="text-2xl">
                  Letter from the editors
                </CardTitle>
                <CardDescription>
                  A monthly digest with behind-the-scenes notes, prototypes, and
                  job-ready frameworks.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>Tell us where to send the next edition.</p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input placeholder="your@email.com" className="h-12" />
                  <Button className="h-12 gap-2">
                    Join list
                    <PenSquare className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Expect one email per month. No noise, just handcrafted
                  dispatches.
                </p>
              </CardContent>
            </Card>
          </section>
        </AnimationContainer>

        <AnimationContainer delay={0.25}>
          <section className="mt-16 grid gap-6 md:grid-cols-2">
            <Card className="border-border/60 bg-card/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <PenSquare className="h-5 w-5 text-primary" />
                  Editor&apos;s desk
                </CardTitle>
                <CardDescription>
                  Drop us a line if you want to collaborate or syndicate our
                  research.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <p>
                  We partner with recruiting teams, design studios, and product
                  leaders to surface fresh perspectives on the craft of hiring.
                </p>
                <Button variant="outline" className="gap-2" asChild>
                  <Link href="mailto:editorial@aiconnect.com">
                    Email editorial team
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
            <Card className="border-border/60 bg-muted/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Resource shelf
                </CardTitle>
                <CardDescription>
                  Tools we keep updating for the community.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {RESOURCE_PICKS.map((resource) => (
                  <div
                    key={resource.title}
                    className="rounded-xl border border-border/50 bg-background/80 px-4 py-3"
                  >
                    <p className="text-sm font-medium">{resource.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {resource.description}
                    </p>
                  </div>
                ))}
              </CardContent>
              <CardFooter>
                <Button variant="ghost" className="gap-2 px-0 text-primary">
                  Browse templates
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </section>
        </AnimationContainer>
      </MaxWidthWrapper>

      <div className="pointer-events-none absolute inset-x-0 top-24 h-105 bg-[radial-gradient(circle,rgba(99,102,241,0.2),transparent_60%)]" />
    </div>
  );
};

export default BlogPage;
