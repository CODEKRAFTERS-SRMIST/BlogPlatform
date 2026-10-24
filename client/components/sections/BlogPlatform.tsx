"use client";

import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import { Section, Post, NewPost } from "@/types/blog";
import Sidebar from "../sidebar";
import { GridPattern } from "../background";
import DashboardSection from "./DashboardSection";
import { HomeSection, MyBlogsSection } from "./MyBlogsSection";
import SettingsSection from "./SettingsSection";

const BlogDetailModal = dynamic(() => import("../BlogDetailModal"), { ssr: false });
const CreateBlogSection = dynamic(() => import("./CreateBlogSection"), { ssr: false });
const AuthModal = dynamic(() => import("../AuthModal").then(mod => ({ default: mod.AuthModal })), { ssr: false });
import { useApi, useMutation } from "@/lib/hooks";
import { blogApi, interactionApi, uploadImage, handleApiError, Pagination } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import { mapPost } from "@/lib/mapPost";

export default function BlogPlatform() {
  const [activeSection, setActiveSection] = useState<Section>("dashboard");
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [posts, setPosts] = useState<Post[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { user, isLoggedIn, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Listen to search parameter 'section' to set active tab
  useEffect(() => {
    const sec = searchParams.get("section") as Section;
    if (
      sec &&
      ["home", "dashboard", "new", "myblogs", "settings"].includes(sec)
    ) {
      setActiveSection(sec);
    }
  }, [searchParams]);

  /*
   * Strict auth gate: signed out goes to the login form, and an account that
   * is not approved goes to the page that says so.
   *
   * "rejected" is new here. The gate knew about "pending" and nothing else,
   * so a rejected account was waved through to a dashboard where every
   * request then failed - which is exactly what the server-side gates now
   * return, so the browser has to have an answer for it.
   */
  useEffect(() => {
    if (!authLoading) {
      if (!isLoggedIn) {
        router.push("/login");
      } else if (user?.status === "rejected") {
        router.push("/pending?status=rejected");
      } else if (user?.status === "pending") {
        router.push("/pending");
      }
    }
  }, [authLoading, isLoggedIn, user, router]);

  // Fetch all posts from backend
  const {
    data: fetchedPosts,
    loading: postsLoading,
    error: postsError,
    refetch,
  } = useApi(async () => {
    try {
      return await blogApi.getPostsPage(1);
    } catch (err: any) {
      if (err.response?.status === 401) {
        setShowAuthModal(true);
      }
      throw err;
    }
  }, []);

  // Fetch user's posts
  const {
    data: myPostsData,
    loading: myPostsLoading,
    error: myPostsError,
    refetch: refetchMyPosts,
  } = useApi(async () => {
    try {
      return await blogApi.getMyPosts();
    } catch (err: any) {
      if (err.response?.status === 401) {
        setShowAuthModal(true);
      }
      throw err;
    }
  }, []);

  // Mutation for creating posts
  const {
    mutate: createPostMutation,
    loading: createLoading,
    error: createError,
  } = useMutation((data: Parameters<typeof blogApi.createPost>[0]) =>
    blogApi.createPost(data),
  );

  // Mutation for deleting posts
  const { mutate: deletePostMutation } = useMutation((id: string) =>
    blogApi.deletePost(id),
  );

  // Mutation for liking posts
  const { mutate: likePostMutation } = useMutation((id: string) =>
    interactionApi.toggleLike(id),
  );

  // Update posts when fetched
  useEffect(() => {
    if (
      fetchedPosts &&
      Array.isArray(fetchedPosts.posts) &&
      fetchedPosts.posts.length > 0
    ) {
      // Initialize liked posts state from backend userLiked property
      const likedIds = new Set<string>();
      fetchedPosts.posts.forEach((p: any) => {
        if (p.userLiked) {
          likedIds.add(p.id);
        }
      });
      setLikedPosts(likedIds);

      setPosts(fetchedPosts.posts.map(mapPost));
      setPagination(fetchedPosts.pagination);
      setLoading(false);
      setError(null);
    } else if (fetchedPosts !== null && !postsLoading) {
      setPosts([]);
      setLoading(false);
      setError(null);
    }
    if (postsError) {
      setError(postsError);
      setLoading(false);
      /*
       * Nothing is invented here any more. A failed request used to drop a
       * made-up story into the feed - a title, an author, 234 likes, 2,847
       * views - with nothing to say it was not real. An empty feed under the
       * error message is the truth.
       */
      setPosts([]);
    }
    // user?.id, not user: the session store hands back a fresh object every
    // time it re-checks who is signed in, which would re-run all of this.
  }, [fetchedPosts, postsError, postsLoading, user?.id]);

  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  /*
   * Only what actually reaches the server. The author came from a text box
   * anybody could type into and the date from a picker, and neither was ever
   * sent: the API takes the author from the session and the date from the
   * clock. Both boxes are gone, so what you type is what is saved.
   */
  const [newPost, setNewPost] = useState<NewPost>({
    title: "",
    subtitle: "",
    content: "",
    coverImage: "",
  });
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);


  const myPosts: Post[] = Array.isArray(myPostsData)
    ? myPostsData.map(mapPost)
    : [];
  const totalLikes = myPosts.reduce((acc, post) => acc + post.likes, 0);
  const totalComments = myPosts.reduce((acc, post) => acc + post.comments, 0);

  /** Appends the next page of blogs to the feed. */
  const handleLoadMore = async () => {
    if (!pagination?.hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const { posts: fetched, pagination: info } = await blogApi.getPostsPage(
        pagination.page + 1,
      );
      setLikedPosts((prev) => {
        const next = new Set(prev);
        fetched.forEach((p: any) => {
          if (p.userLiked) next.add(p.id);
        });
        return next;
      });
      const mapped = fetched.map(mapPost);
      setPosts((prev) => {
        const seen = new Set(prev.map((x) => x.id));
        return [...prev, ...mapped.filter((x) => !seen.has(x.id))];
      });
      setPagination(info);
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setLoadingMore(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;

    // Compressing a phone photo and sending it takes a few seconds, which
    // looked like nothing happening at all.
    const toastId = toast.loading("Uploading cover image...");
    try {
      const url = await uploadImage(file);
      if (!url) throw new Error("The server did not return an image URL");
      setNewPost({ ...newPost, coverImage: url });
      toast.success("Cover image uploaded", { id: toastId });
    } catch (err) {
      toast.error(handleApiError(err), { id: toastId });
    } finally {
      // Clearing the input lets the same file be picked again after a failure;
      // without this, re-choosing it fires no change event at all.
      input.value = "";
    }
  };

  /*
   * One request, and the truth about what happened to it.
   *
   * This used to create the story and then submit it for review as a second
   * request, with the second one's failure caught and logged to the console.
   * The interface went on to say "submitted for review" and show a pending
   * badge regardless - while the story sat in the database as a draft no
   * admin would ever see, and the writer had no way to know.
   *
   * The API takes submit: true now and writes it straight to pending_review,
   * so there is no gap between the two states for anything to fall into. The
   * status shown is whatever came back, not what we hoped for.
   */
  const handleCreatePost = async () => {
    // The first tap wins. Without this a second tap on a slow connection
    // sent a second create and the writer ended up with the story twice.
    if (createLoading) return;

    /*
     * No length checks here any more. They disagreed with the server - 20
     * characters against the server's 100 - so the editor waved a story
     * through and the server then refused it. CreateBlogSection keeps the
     * Publish button disabled against the real limits in lib/blogLimits.ts,
     * which mirror the server's.
     */
    if (!newPost.title.trim() || !newPost.content.trim()) {
      setError("Title and content are required");
      return;
    }

    try {
      setError(null);

      const created: any = await createPostMutation({
        title: newPost.title.trim(),
        subtitle: newPost.subtitle.trim() || undefined,
        content: newPost.content,
        // Empty rather than a stock photograph. The placeholder used to be
        // written into the database as the story's real cover.
        image: newPost.coverImage || undefined,
        submit: true,
      });

      setPosts((prev) => [mapPost(created), ...prev]);
      try {
        await refetchMyPosts();
      } catch {
        // The story is saved either way; the library refreshes on next view.
      }

      toast.success(
        "Your story has been submitted for review. It goes live once an admin approves it.",
      );
      setNewPost({ title: "", subtitle: "", content: "", coverImage: "" });
      setActiveSection("myblogs");
    } catch (err) {
      // Said out loud, not swallowed: if this failed, nothing was submitted.
      const message = handleApiError(err);
      setError(message);
      toast.error(message);
    }
  };


  const handleDeletePost = async (id: string) => {
    const postToDelete = myPosts.find((p) => p.id === id);
    const canRemovePublished = user?.role === "admin" || Boolean(user?.is_super_admin);
    if (postToDelete?.status === "published" && !canRemovePublished) {
      toast.error(
        "Published stories cannot be deleted. Ask an admin to remove it.",
      );
      return;
    }

    if (
      !confirm(
        "Are you sure you want to delete this story? This action cannot be undone.",
      )
    )
      return;

    try {
      await blogApi.deletePost(id);
      await refetchMyPosts?.();
      toast.success("Story deleted");
    } catch (err) {
      console.error("Failed to delete post:", err);
      toast.error(handleApiError(err));
    }
  };

  const handleLike = async (id: string) => {
    try {
      const result = await interactionApi.toggleLike(id);

      // Update likedPosts Set
      const newLiked = new Set(likedPosts);
      if (result.liked) {
        newLiked.add(id);
      } else {
        newLiked.delete(id);
      }
      setLikedPosts(newLiked);

      // Update posts array
      const updatePostList = (list: Post[]) =>
        list.map((p) => (p.id === id ? { ...p, likes: result.count } : p));

      setPosts((prev) => updatePostList(prev));

      // Update selectedPost if it's the one being liked
      if (selectedPost && selectedPost.id === id) {
        setSelectedPost({ ...selectedPost, likes: result.count });
      }

      // Also potentially update myPosts if affected (though it's derived from myPostsData)
      // Since myPosts is derived, we should refetch or update myPostsData if possible,
      // but for "live" feel, we can just let the derived value catch up on next render if we update the source data.
      // However, myPostsData is from a hook. Let's just update the local posts for now.
    } catch (err) {
      console.error("Failed to like post:", err);
    }
  };

  const handlePostClick = (post: Post) => {
    setSelectedPost(post);
  };

  if (postsLoading && posts.length === 0) {
    return (
      <div className="min-h-screen bg-[#f8f7f4] font-sans text-gray-900 overflow-x-hidden relative">
        <GridPattern />
        {/*
          * The same dock as the loaded page, role and all.
          *
          * This one was rendered without userRole, so while the posts were
          * being fetched every admin was handed a member's dock - the admin
          * entry simply filtered itself out. Arriving here from an admin page
          * meant a fresh mount with no posts yet, which is exactly this
          * branch: tap a tab, watch the admin button vanish, and wait for it
          * to come back when the fetch finished. On a cold backend that wait
          * is the whole point at which somebody concludes they have been
          * demoted.
          */}
        <Sidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          onLogout={logout}
          onLogin={() => setShowAuthModal(true)}
          isLoggedIn={isLoggedIn}
          userRole={user?.role}
          isSuperAdmin={user?.is_super_admin}
        />
        <main className="pb-mobile-nav relative z-10 min-h-screen w-full min-w-0 flex flex-col items-center justify-center pt-20 sm:pt-24 md:pt-12 px-3 sm:px-4">
          <div className="text-center space-y-4">
            <div className="inline-block">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f5b800]"></div>
            </div>
            <p className="text-gray-600 font-medium">Loading posts...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f7f4] font-sans text-gray-900 selection:bg-[#f5b800] selection:text-white overflow-x-hidden relative">
      {error && error !== "Authentication required" && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg z-50">
          {error}
        </div>
      )}
      <GridPattern />
      <Sidebar
        activeSection={activeSection}
        onSectionChange={(section) => {
          if (section === "admin") {
            // router.push, not window.location: assigning location threw the
            // whole app away and rebuilt it - bundle, React tree, session
            // check - for a move between two pages of the same app. The
            // Manage button beside it already did it this way.
            router.push("/admin/dashboard");
          } else {
            setActiveSection(section);
          }
        }}
        onLogout={logout}
        onLogin={() => setShowAuthModal(true)}
        isLoggedIn={isLoggedIn}
        userRole={user?.role}
        isSuperAdmin={user?.is_super_admin}
      />

      <main className="pb-mobile-nav relative z-10 min-h-screen w-full min-w-0 flex flex-col items-center pt-16 sm:pt-20 md:pt-12 px-3 sm:px-5 md:px-8 lg:pl-32 transition-all duration-300">
        {/*
         * The sections are swapped with a plain conditional, not inside an
         * <AnimatePresence mode="wait">.
         *
         * `mode="wait"` keeps the section you are leaving mounted until its
         * exit animation has finished and only then mounts the one you
         * tapped, so every switch cost an exit pass before anything new
         * appeared - the delay that made the bottom bar feel unresponsive on
         * a phone. Plain `sync` mode is not the answer either: both sections
         * would sit in this flex column at once and shove the page around
         * while the old one faded. The tab you tap now mounts on the same
         * tick and plays only its own entrance.
         */}
        {activeSection === "dashboard" && (
          <DashboardSection
            key="dashboard"
            totalLikes={totalLikes}
            totalComments={totalComments}
            myPosts={myPosts}
            setActiveSection={setActiveSection}
          />
        )}

        {activeSection === "home" && (
          <HomeSection
            key="home"
            posts={posts}
            likedPosts={likedPosts}
            handleLike={handleLike}
            handlePostClick={handlePostClick}
            setActiveSection={setActiveSection}
            total={pagination?.total}
            hasMore={pagination?.hasMore}
            loadingMore={loadingMore}
            onLoadMore={handleLoadMore}
          />
        )}

        {activeSection === "myblogs" && (
          <MyBlogsSection
            key="myblogs"
            myPosts={myPosts}
            likedPosts={likedPosts}
            handleLike={handleLike}
            handlePostClick={handlePostClick}
            handleDeletePost={handleDeletePost}
            setActiveSection={setActiveSection}
          />
        )}

        {activeSection === "new" && (
          <CreateBlogSection
            key="new"
            newPost={newPost}
            setNewPost={setNewPost}
            handleImageUpload={handleImageUpload}
            handleCreatePost={handleCreatePost}
            submitting={createLoading}
            fileInputRef={fileInputRef as React.RefObject<HTMLInputElement>}
          />
        )}

        {activeSection === "settings" && (
          <SettingsSection
            key="settings"
            showPasswordChange={showPasswordChange}
            setShowPasswordChange={setShowPasswordChange}
          />
        )}
      </main>

      {/* AnimatePresence holds the modal in the tree until its exit finishes,
          so closing shrinks the post back into the card it came from. Without
          it React unmounted the node on the same tick and the post vanished. */}
      <AnimatePresence>
        {selectedPost && (
          <BlogDetailModal
            key={selectedPost.id}
            selectedPost={selectedPost}
            setSelectedPost={setSelectedPost}
            onLike={() => handleLike(selectedPost.id)}
            isLiked={likedPosts.has(selectedPost.id)}
            /* My Library is the author reading their own work, drafts and
               rejected stories included. Liking, sharing and discussing all
               belong to the public feed, where the story has a page and an
               audience. */
            showLike={activeSection !== "myblogs"}
            showShare={activeSection !== "myblogs"}
            showComments={activeSection !== "myblogs"}
          />
        )}
      </AnimatePresence>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          setShowAuthModal(false);
          refetch();
        }}
      />
    </div>
  );
}
