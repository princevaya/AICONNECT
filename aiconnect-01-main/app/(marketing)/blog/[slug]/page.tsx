import AnimationContainer from "@/components/global/animation-container";
import MaxWidthWrapper from "@/components/global/max-width-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { findBlogPost, getAllBlogPosts } from "@/constants/blog";
import { format } from "date-fns";
import { ArrowLeft, Clock, Share2, Tag } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

interface BlogArticlePageProps {
  params: { slug: string };
}

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllBlogPosts().map((post) => ({ slug: post.slug }));
}

const BlogArticlePage = async ({ params }: BlogArticlePageProps) => {
  const resolvedParams = await Promise.resolve(params);
  const normalizedSlug = decodeURIComponent(resolvedParams?.slug ?? "").trim();
  const post = findBlogPost(normalizedSlug);

  if (!post) {
    notFound();
  }

  return (
    <div className="relative overflow-hidden bg-[radial-gradient(circle_at_top,rgba(94,234,212,0.08),transparent_60%)] pb-20">
      <MaxWidthWrapper className="relative z-10">
        <AnimationContainer>
          <div className="flex flex-wrap items-center justify-between gap-4 py-10">
            <Button variant="outline" className="gap-2" asChild>
              <Link href="/blog">
                <ArrowLeft className="h-4 w-4" />
                Back to journal
              </Link>
            </Button>
            <Button variant="ghost" className="gap-2 text-muted-foreground">
              Share insight
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </AnimationContainer>

        <AnimationContainer delay={0.1}>
          <header className="space-y-6 pb-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-4 py-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {post.category}
            </div>
            <div className="max-w-4xl space-y-4">
              <p className="text-sm font-medium text-muted-foreground">
                {post.author} · {format(new Date(post.date), "PPP")}
              </p>
              <h1 className="text-balance font-heading text-4xl leading-tight text-foreground sm:text-5xl md:text-6xl">
                {post.title}
              </h1>
              <p className="text-lg text-muted-foreground">{post.excerpt}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {post.readingTime}
              </span>
              <span className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                {post.tags.join(" / ")}
              </span>
            </div>
          </header>
        </AnimationContainer>

        <AnimationContainer delay={0.2}>
          <article className="mx-auto max-w-3xl space-y-8 text-lg leading-relaxed text-muted-foreground">
            {post.body.map((paragraph) => (
              <p key={paragraph.substring(0, 24)}>{paragraph}</p>
            ))}
          </article>
        </AnimationContainer>

        <AnimationContainer delay={0.3}>
          <Card className="mt-16 border-border/60 bg-card/80">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 py-6">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
                  Stay in the loop
                </p>
                <p className="text-base text-foreground">
                  Subscribe for the next drop of AI hiring field notes.
                </p>
              </div>
              <Button asChild>
                <Link href="/blog">Go back to articles</Link>
              </Button>
            </CardContent>
          </Card>
        </AnimationContainer>
      </MaxWidthWrapper>
      <div className="pointer-events-none absolute inset-x-0 top-24 h-105 bg-[radial-gradient(circle,rgba(6,182,212,0.15),transparent_60%)]" />
    </div>
  );
};

export default BlogArticlePage;
