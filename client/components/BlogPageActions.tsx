'use client';

import { useEffect, useState } from 'react';
import { Heart, Share2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Post } from '@/types/blog';
import { interactionApi } from '@/lib/api';
import { useAuth } from '@/lib/useAuth';
import ShareModal from '@/components/ShareModal';

/**
 * Like and share, on the standalone story page.
 *
 * The page itself is server-rendered and cached, so it cannot know who is
 * reading it - the like state has to be settled here, in the browser, once
 * the session is known.
 */
export default function BlogPageActions({ post }: { post: Post }) {
  const { isLoggedIn, loading: authLoading } = useAuth();
  const [liked, setLiked] = useState(Boolean(post.userLiked));
  const [count, setCount] = useState(post.likes);
  const [busy, setBusy] = useState(false);
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    // Asked for once the session is settled. Before that the answer would be
    // "not liked" for everybody, which is the white-heart bug in miniature.
    interactionApi
      .getLikes(post.id)
      .then((r) => {
        if (cancelled) return;
        setCount(r.count);
        setLiked(Boolean(r.userLiked));
      })
      .catch(() => {
        // The counts on screen came with the page; leaving them is fine.
      });

    return () => {
      cancelled = true;
    };
  }, [post.id, authLoading, isLoggedIn]);

  const toggleLike = async () => {
    if (!isLoggedIn) {
      toast('Sign in to like this story');
      return;
    }
    if (busy) return;

    // Moves on the tap, then settles on whatever the server says. Waiting for
    // the round trip made every heart feel broken on a slow connection.
    const previous = { liked, count };
    setLiked(!liked);
    setCount((c) => c + (liked ? -1 : 1));
    setBusy(true);
    try {
      const r = await interactionApi.toggleLike(post.id);
      setLiked(r.liked);
      setCount(r.count);
    } catch {
      setLiked(previous.liked);
      setCount(previous.count);
      toast.error('Could not save that. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setShowShare(true)}
        className="flex items-center gap-2 rounded-2xl bg-gray-900 px-4 py-2.5 text-[13px] font-black text-white transition-all hover:bg-black active:scale-95 sm:px-5 sm:py-3 sm:text-sm"
        title="Share story"
      >
        <Share2 size={18} />
        <span>Share</span>
      </button>

      <button
        type="button"
        onClick={toggleLike}
        aria-pressed={liked}
        className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-[13px] font-black transition-all active:scale-95 sm:px-6 sm:py-3 sm:text-sm ${
          liked
            ? 'border border-rose-100 bg-rose-50 text-rose-500'
            : 'border border-transparent bg-gray-50 text-gray-400 hover:bg-gray-100'
        }`}
      >
        <Heart size={18} className={liked ? 'fill-rose-500' : ''} />
        {count}
      </button>

      {showShare && (
        <ShareModal isOpen={showShare} onClose={() => setShowShare(false)} post={post} />
      )}
    </>
  );
}
