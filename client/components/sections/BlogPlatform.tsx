"use client";

import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, LayoutGroup } from "framer-motion";
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
import { useAutoLogin } from "@/lib/useAutoLogin";

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

  // Strict Auth Gate: Push to login if not logged in, or pending if not approved
  useEffect(() => {
    if (!authLoading) {
      if (!isLoggedIn) {
        router.push("/login");
      } else if (user?.status === "pending") {
        router.push("/pending");
      }
    }
  }, [authLoading, isLoggedIn, user, router]);

  // Auto-login user on first load
  useAutoLogin();

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
  } = useMutation(
    (data: {
      title: string;
      slug: string;
      content: string;
      excerpt?: string;
      coverImage?: string;
      tagSlugs?: string[];
    }) => blogApi.createPost(data),
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

      const mappedPosts = fetchedPosts.posts.map((p: any) => ({
        id: p.id,
        title: p.title,
        subtitle: p.subtitle || p.excerpt || "",
        content: p.content || "",
        coverImage:
          p.image ||
          p.coverImage ||
          "https://images.unsplash.com/photo-1499750789039-ca2a2f92c815?w=800&h=400&fit=crop",
        author: p.author?.name || "Unknown",
        date: p.publishedAt
          ? new Date(p.publishedAt).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        tags: p.tags?.map((t: any) => t.tag?.name || t.name) || [],
        status: p.status || "published",
        likes: p._count?.likes || 0,
        comments: p._count?.comments || 0,
        views: p.viewCount || 0,
      }));
      setPosts(mappedPosts);
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
      const fallbackPosts: Post[] = [
        {
          id: "1",
          title: "The Art of Minimalist Design",
          subtitle: "How simplicity can transform your creative work",
          content:
            "Minimalism isn't about having less—it's about making room for more of what matters.",
          coverImage:
            "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&h=500&fit=crop",
          author: user ? user.name : "Unknown",
          date: "2024-01-15",
          tags: ["Design", "Minimalism", "Creativity"],
          status: "published",
          likes: 234,
          comments: 45,
          views: 2847,
        },
      ];
      setPosts(fallbackPosts);
    }
  }, [fetchedPosts, postsError, postsLoading, user]);

  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [newPost, setNewPost] = useState<NewPost>({
    title: "",
    subtitle: "",
    content: "",
    coverImage: "",
    author: user ? user.name : "Author",
    date: new Date().toISOString().split("T")[0],
    tags: "",
  });
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mapBackendToPost = (p: any): Post => ({
    id: p.id,
    title: p.title,
    subtitle: p.subtitle || p.excerpt || "",
    content: p.content || "",
    coverImage:
      p.image ||
      p.coverImage ||
      "https://images.unsplash.com/photo-1499750789039-ca2a2f92c815?w=800&h=400&fit=crop",
    author: (p.author && (p.author.name || p.author.username)) || "User",
    userLiked: !!p.userLiked,
    date: p.publishedAt
      ? new Date(p.publishedAt).toISOString().split("T")[0]
      : p.created_at
        ? new Date(p.created_at).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
    tags:
      p.tags && Array.isArray(p.tags)
        ? p.tags.map((t: any) => t.tag?.name || t.name)
        : [],
    status: p.status || "published",
    // Only /blogs/my returns this, and only for the author's own rejected
    // stories - the public feed never carries it. Without it the author saw
    // a bare "rejected" badge and had no way to learn what to change.
    rejectionReason: p.rejection_reason || p.rejectionReason || undefined,
    likes: p._count?.likes || 0,
    comments: p._count?.comments || 0,
    views: p.viewCount || 0,
  });

  const myPosts: Post[] = Array.isArray(myPostsData)
    ? myPostsData.map(mapBackendToPost)
    : [];
  const totalLikes = myPosts.reduce((acc, post) => acc + post.likes, 0);
  const totalComments = myPosts.reduce((acc, post) => acc + post.comments, 0);
  const totalViews = myPosts.reduce((acc, post) => acc + post.views, 0);

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
      const mapped = fetched.map((p: any) => ({
        id: p.id,
        title: p.title,
        subtitle: p.subtitle || p.excerpt || "",
        content: p.content || "",
        coverImage:
          p.image ||
          p.coverImage ||
          "https://images.unsplash.com/photo-1499750789039-ca2a2f92c815?w=800&h=400&fit=crop",
        author: p.author?.name || "Unknown",
        date: p.publishedAt
          ? new Date(p.publishedAt).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        tags: p.tags?.map((t: any) => t.tag?.name || t.name) || [],
        status: p.status || "published",
        likes: p._count?.likes || 0,
        comments: p._count?.comments || 0,
        views: p.viewCount || 0,
      })) as Post[];
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

  const handleCreatePost = async () => {
    if (!newPost.title || !newPost.content) {
      setError("Title and content are required");
      return;
    }

    try {
      setError(null);
      const baseSlug = newPost.title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");

      const timestamp = Date.now().toString().slice(-6);
      const slug = `${baseSlug}-${timestamp}`;

      if (newPost.title.trim().length < 3) {
        setError("Title must be at least 3 characters");
        return;
      }

      if (slug.length < 3) {
        setError("Generated slug is too short (min 3 characters)");
        return;
      }

      if (newPost.content.trim().length < 20) {
        setError("Content must be at least 20 characters");
        return;
      }

      const newPostData = {
        title: newPost.title,
        slug: slug,
        content: newPost.content,
        subtitle: newPost.subtitle,
        excerpt: newPost.subtitle,
        coverImage:
          newPost.coverImage ||
          "https://images.unsplash.com/photo-1499750789039-ca2a2f92c815?w=800&h=400&fit=crop",
        tagSlugs: newPost.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      };

      const createdPost = await createPostMutation(newPostData);

      const rawPost = createdPost as any;

      // Submit for review immediately after creation
      if (rawPost?.id) {
        try {
          await blogApi.submitPost(rawPost.id);
        } catch (submitErr) {
          console.error(
            "Failed to submit for review, but blog was created:",
            submitErr,
          );
        }
      }

      const mapped = {
        ...mapBackendToPost(rawPost),
        status: "pending_review" as "pending_review",
      };

      setPosts([mapped, ...posts]);
      try {
        await refetchMyPosts();
      } catch (e) {
        // ignore
      }
      toast.success(
        "Success! Your story has been submitted for review. It will be live once approved by an admin.",
      );
      setNewPost({
        title: "",
        subtitle: "",
        content: "",
        coverImage: "",
        author: user ? user.name : "Author",
        date: new Date().toISOString().split("T")[0],
        tags: "",
      });
      setActiveSection("myblogs");
    } catch (err) {
      setError(handleApiError(err));
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
        <Sidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          onLogout={logout}
          onLogin={() => setShowAuthModal(true)}
          isLoggedIn={isLoggedIn}
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
            window.location.href = "/admin/dashboard";
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
            totalViews={totalViews}
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
