import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Navbar } from '@/components/landing/navbar';
import { GridPattern } from '@/components/background';
import BlogArticle from '@/components/BlogArticle';
import BlogPageActions from '@/components/BlogPageActions';
import { mapPost } from '@/lib/mapPost';

/**
 * The backend, reached directly.
 *
 * Not through this site's own /api rewrite: that would have the Next server
 * call itself over the network to reach a service it can already talk to.
 */
const API = process.env.API_PROXY_URL || 'http://localhost:5000';

/**
 * Fetched without a session, deliberately.
 *
 * /blogs/public/:id answers with `userLiked` set for whoever is asking. This
 * render is cached and served to everybody, so carrying a session here would
 * mean one reader's like state being handed to the next. The page renders
 * anonymous and BlogPageActions fills in the real state in the browser.
 */
async function loadStory(id: string) {
  try {
    const res = await fetch(`${API}/api/blogs/public/${encodeURIComponent(id)}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const raw = json?.data ?? json;
    if (!raw?.id) return null;
    return mapPost(raw);
  } catch {
    // The API being unreachable is not the same as the story not existing,
    // but from here there is nothing better to say than "not found".
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const post = await loadStory(id);
  if (!post) return { title: 'Story not found' };

  const description =
    post.subtitle?.trim() ||
    post.content.replace(/\s+/g, ' ').trim().slice(0, 160);

  // Absolute, via metadataBase in the root layout: WhatsApp fetches this
  // page from the open internet and cannot resolve a relative path.
  const images = post.coverImage ? [post.coverImage] : undefined;

  return {
    title: post.title,
    description,
    alternates: { canonical: `/blogs/${id}` },
    openGraph: {
      type: 'article',
      title: post.title,
      description,
      url: `/blogs/${id}`,
      images,
      authors: [post.author],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description,
      images,
    },
  };
}

export default async function StoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = await loadStory(id);

  // A story that is not published is indistinguishable from one that does not
  // exist. The API already refuses both; this keeps it that way rather than
  // telling a stranger which ids are real.
  if (!post) notFound();

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#f8f7f4] font-sans text-gray-900">
      <GridPattern />
      <Navbar />

      <main className="relative z-10 w-full px-3 pb-20 pt-24 sm:px-5 sm:pt-28 md:px-8 md:pt-32">
        <div className="mx-auto w-full max-w-5xl">
          <Link
            href="/blogs"
            className="mb-5 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400 transition-colors hover:text-black sm:mb-8 sm:text-xs"
          >
            <ArrowLeft size={14} className="shrink-0" />
            All stories
          </Link>

          <article className="overflow-hidden rounded-2xl border border-white/70 bg-white shadow-[0_40px_80px_-25px_rgba(0,0,0,0.12)] sm:rounded-[2rem] md:rounded-[3rem]">
            <BlogArticle post={post} actions={<BlogPageActions post={post} />} />
          </article>
        </div>
      </main>
    </div>
  );
}
