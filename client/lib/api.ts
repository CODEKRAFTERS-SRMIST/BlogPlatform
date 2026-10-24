import { AxiosError } from "axios";
import apiClient from "./api-client";
import { compressImage, formatBytes, HARD_LIMIT_BYTES } from "./imageCompress";

export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
  status?: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
  domain?: string;
  reg_no?: string;
  year?: string;
  status?: string;
  created_at?: string;
  is_super_admin?: boolean;
}

export interface AuthResponse {
  token?: string;
  user: User;
  message?: string;
  success?: boolean;
}

export interface Comment {
  id: string;
  content: string;
  blog_id: string;
  user_id: string;
  parent_id?: string;
  created_at: string;
  user: {
    id: string;
    name: string;
  };
  replies?: Comment[];
}

export interface Post {
  id: string;
  title: string;
  content: string;
  image?: string;
  links?: string;
  status: string;
  author_id: string;
  created_at: string;
  updated_at: string;
  subtitle?: string;
  // The admin review endpoint returns the writer's whole profile so the
  // reviewer sees who they are without a second request; the public feed
  // returns only the first three.
  author: {
    id: string;
    name: string;
    email: string;
    reg_no?: string;
    year?: string;
    domain?: string;
    role?: string;
    is_super_admin?: boolean;
    status?: string;
    created_at?: string;
  };
  _count: {
    likes: number;
    comments: number;
  };
  userLiked?: boolean;
}

export const handleApiError = (error: unknown): string => {
  if (error instanceof AxiosError) {
    const respData = error.response?.data as any;
    // 1. Check nested backend format { error: { message: "..." } }
    if (respData?.error) {
      const err = respData.error;
      if (typeof err === "string") return err;
      if (err.message && typeof err.message === "string") return err.message;
      if (err.fieldErrors && typeof err.fieldErrors === "object") {
        const messages = Object.values(err.fieldErrors).flat().filter(Boolean);
        if (messages.length) return messages.join("; ");
      }
      if (Array.isArray(err)) return err.join("; ");
    }
    // 2. Check root message { message: "..." }
    if (respData?.message && typeof respData.message === "string") {
      return respData.message;
    }
    // 3. Status-code based human friendly fallbacks
    if (error.response?.status === 401) return "Incorrect email or password. Please try again.";
    if (error.response?.status === 403) return "Your account is awaiting admin approval or you do not have permission.";
    if (error.response?.status === 404) return "Requested resource was not found.";
    if (error.response?.status === 409) return "An account or resource with these details already exists.";
    if (error.response?.status === 413) return "File size is too large. Please upload an image under 5MB.";
    if (error.response?.status === 429) return "Too many requests. Please wait a moment and try again.";
    /*
     * The server stamps every error with a requestId and logs it under the
     * same one. For "already registered" that is noise - the member knows
     * what to do. For a server fault there is nothing they can do, and the
     * only useful thing they can carry to an admin is the reference that
     * finds the failure in the Render logs. So it rides along on those, and
     * nowhere else.
     */
    const ref = typeof respData?.error?.requestId === "string"
      ? ` (ref ${respData.error.requestId.slice(0, 8)})`
      : "";

    if (error.response?.status === 500) return `Something went wrong on the server. This one is not your fault - please try again in a moment, and tell an admin if it keeps happening${ref}.`;
    if (error.response?.status === 503) return "The server is starting up. Give it up to a minute and try again.";

    /*
     * No response at all.
     *
     * Axios reports every one of these as the same two words - "Network
     * Error" - whether the server is asleep, the request was refused by
     * CORS, or the phone has no signal. On screen that reads as "the whole
     * site is broken", and it is the message people saw most often, for
     * three completely different reasons with three different answers.
     *
     * There is no status to go on here, because nothing came back, so this
     * says what is actually known and what to do about it rather than
     * guessing at a cause.
     */
    if (!error.response) {
      if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
        return "The server took too long to answer. It may be waking up - please try again in a minute.";
      }
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        return "You appear to be offline. Check your connection and try again.";
      }
      return "Could not reach the server. It may be starting up, or your connection dropped - please try again in a minute.";
    }

    // Nothing above matched: say the status rather than pretend to know more.
    if (error.response.status) {
      return `The server refused that request (error ${error.response.status})${ref}. Please try again, and tell an admin if it keeps happening.`;
    }
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
};

/**
 * The machine-readable `code` the API sends with an error, e.g.
 * "PENDING_APPROVAL" or "INVALID_CREDENTIALS". Prefer this over matching
 * against the human-readable message, which is free to be reworded.
 */
export const getApiErrorCode = (error: unknown): string | null => {
  if (error instanceof AxiosError) {
    const code = (error.response?.data as any)?.error?.code;
    if (typeof code === "string") return code;
  }
  return null;
};

/**
 * Why an account was turned away, when that is the reason a call failed.
 *
 * "Waiting" and "refused" both arrive as a 403 and used to be treated as
 * the same thing, so somebody who had been rejected was sent to a page
 * saying their account was still being reviewed - and they would wait, and
 * refresh, for a decision that had already been made.
 */
export const getAccountStandingFromError = (
  error: unknown,
): "pending" | "rejected" | null => {
  const code = getApiErrorCode(error);
  if (code === "ACCOUNT_REJECTED") return "rejected";
  if (code === "PENDING_APPROVAL" || code === "NOT_APPROVED") return "pending";
  // Older responses carry no code; fall back to the message.
  return isPendingApprovalError(error) ? "pending" : null;
};

/** True when the failure was "this account is not approved yet". */
export const isPendingApprovalError = (error: unknown): boolean => {
  const code = getApiErrorCode(error);
  if (code) return code === "PENDING_APPROVAL" || code === "NOT_APPROVED";

  // Fallback for responses that carry no code
  if (error instanceof AxiosError) {
    const message = handleApiError(error).toLowerCase();
    return (
      error.response?.status === 403 &&
      (message.includes("not approved") || message.includes("awaiting"))
    );
  }
  return false;
};

export const authApi = {
  signup: async (data: {
    name: string;
    email: string;
    password: string;
    regNo: string;
    department: string;
    year: number;
    username: string;
  }): Promise<AuthResponse> => {
    const mappedData = {
      name: data.name,
      email: data.email,
      password: data.password,
      reg_no: data.regNo,
      domain: data.department,
      year: data.year.toString(),
    };
    const response = await apiClient.post("/users/register", mappedData);
    return response.data?.data || response.data;
  },

  login: async (data: {
    email: string;
    password: string;
  }): Promise<AuthResponse> => {
    const response = await apiClient.post("/auth/login", data);
    return response.data?.data || response.data;
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.post("/auth/logout");
    } finally {
      if (typeof window !== "undefined") {
        localStorage.removeItem("auth_token"); // left over from older builds
        localStorage.setItem("auth_changed", String(Date.now()));
      }
    }
  },

  getMe: async (): Promise<User> => {
    const response = await apiClient.get("/auth/me");
    return response.data?.data?.user || response.data?.user || response.data;
  },

  changePassword: async (data: any): Promise<any> => {
    const response = await apiClient.post("/auth/change-password", data);
    return response.data?.data || response.data;
  },
};

export const uploadImage = async (file: File): Promise<string> => {
  // Shrink first: phone photos are routinely larger than the API's 5 MB cap,
  // and an uncompressed cover makes the feed slow on mobile data.
  const { file: toUpload } = await compressImage(file);

  if (toUpload.size > HARD_LIMIT_BYTES) {
    throw new Error(
      `This image is ${formatBytes(toUpload.size)} even after compression. Please pick a smaller one.`,
    );
  }

  const formData = new FormData();
  formData.append("image", toUpload);
  const response = await apiClient.post("/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data?.data?.url || response.data?.url;
};

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export const blogApi = {
  getAllPosts: async (page?: number, limit?: number): Promise<Post[]> => {
    const response = await apiClient.get("/blogs/public", {
      params: { page, limit },
    });
    return response.data?.data?.blogs || response.data?.blogs || [];
  },

  /** One page of published posts, with the paging details. */
  getPostsPage: async (
    page = 1,
    limit?: number,
  ): Promise<{ posts: Post[]; pagination: Pagination }> => {
    const response = await apiClient.get("/blogs/public", {
      params: { page, limit },
    });
    const data = response.data?.data ?? response.data ?? {};
    const posts: Post[] = data.blogs ?? [];
    const pagination: Pagination = data.pagination ?? {
      page,
      limit: limit ?? posts.length,
      total: posts.length,
      totalPages: 1,
      hasMore: false,
    };
    return { posts, pagination };
  },

  getPostById: async (id: string): Promise<Post> => {
    const response = await apiClient.get(`/blogs/public/${id}`);
    return response.data?.data || response.data;
  },

  /**
   * Creates a story. With submit: true the server writes it straight to
   * pending_review, so there is no window where a story exists but has not
   * reached the moderation queue.
   */
  createPost: async (data: {
    title: string;
    subtitle?: string;
    content: string;
    image?: string;
    links?: string;
    submit?: boolean;
  }): Promise<Post> => {
    const response = await apiClient.post("/blogs", {
      title: data.title,
      subtitle: data.subtitle,
      content: data.content,
      image: data.image,
      links: data.links ?? null,
      submit: data.submit === true,
    });
    return response.data?.data || response.data;
  },

  updatePost: async (
    id: string,
    data: Partial<Post & { coverImage?: string; excerpt?: string }>,
  ): Promise<Post> => {
    const mappedData = {
      ...data,
      subtitle: data.subtitle ?? data.excerpt,
      image: data.image || data.coverImage,
    };
    const response = await apiClient.patch(`/blogs/${id}`, mappedData);
    return response.data?.data || response.data;
  },

  deletePost: async (id: string): Promise<void> => {
    await apiClient.delete(`/blogs/${id}`);
  },

  getMyPosts: async (): Promise<Post[]> => {
    const response = await apiClient.get("/blogs/my");
    return response.data?.data || response.data?.blogs || response.data || [];
  },

  submitPost: async (id: string): Promise<void> => {
    await apiClient.post(`/blogs/${id}/submit`);
  },
};

export const interactionApi = {
  getLikes: async (
    blogId: string,
  ): Promise<{ count: number; userLiked: boolean }> => {
    const response = await apiClient.get(`/likes/${blogId}`);
    return response.data?.data || response.data;
  },

  toggleLike: async (
    blogId: string,
  ): Promise<{ liked: boolean; count: number }> => {
    const response = await apiClient.post(`/like/${blogId}`);
    return response.data?.data || response.data;
  },

  getComments: async (blogId: string): Promise<Comment[]> => {
    const response = await apiClient.get(`/comments/${blogId}`);
    return response.data?.data?.comments || response.data?.comments || [];
  },

  addComment: async (
    blogId: string,
    content: string,
    parentId?: string,
  ): Promise<Comment> => {
    const response = await apiClient.post(`/comment/${blogId}`, {
      content,
      parentId,
    });
    return response.data?.data?.comment || response.data?.comment;
  },

  deleteComment: async (commentId: string): Promise<void> => {
    await apiClient.delete(`/comment/${commentId}`);
  },
};

/*
 * Three helpers lived here that could not work:
 *
 *   searchApi  called /search, a route the server has never had.
 *   healthApi  called /api/health, while the health check sits at /health and
 *              is not proxied, so it answered 404.
 *   devApi     called the development-only routes, which answer 404 in
 *              production - and were reachable from a panel any visitor
 *              could open inside the sign-in dialog.
 *
 * Nothing calls them now, and the routes behind devApi are gone.
 */

export const adminApi = {
  getStats: async (): Promise<{
    totalUsers: number;
    pendingUsers: number;
    approvedUsers: number;
    totalBlogs: number;
    pendingBlogs: number;
    totalLikes: number;
    totalComments: number;
  }> => {
    const response = await apiClient.get("/admin/stats");
    return response.data?.data || response.data;
  },

  getAllUsers: async (): Promise<User[]> => {
    const response = await apiClient.get("/admin/users/all");
    return response.data?.data?.users || response.data?.users || [];
  },

  getPendingUsers: async (): Promise<User[]> => {
    const response = await apiClient.get("/admin/users/pending");
    return response.data?.data?.users || response.data?.users || [];
  },

  approveUser: async (id: string): Promise<any> => {
    const response = await apiClient.patch(`/admin/users/${id}/approve`);
    return response.data?.data || response.data;
  },

  promoteUser: async (id: string): Promise<any> => {
    const response = await apiClient.patch(`/admin/users/${id}/promote`);
    return response.data?.data || response.data;
  },

  demoteUser: async (id: string): Promise<any> => {
    const response = await apiClient.patch(`/admin/users/${id}/demote`);
    return response.data?.data || response.data;
  },

  getBlogs: async (status?: string): Promise<Post[]> => {
    const response = await apiClient.get("/admin/blogs", {
      params: { status },
    });
    return response.data?.data?.blogs || response.data?.blogs || [];
  },

  approveBlog: async (id: string): Promise<any> => {
    const response = await apiClient.patch(`/admin/blogs/${id}/approve`);
    return response.data?.data || response.data;
  },

  rejectBlog: async (id: string, reason: string): Promise<any> => {
    const response = await apiClient.patch(`/admin/blogs/${id}/reject`, {
      reason,
    });
    return response.data?.data || response.data;
  },
};

export const api = apiClient;

export default apiClient;
