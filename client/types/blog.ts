export interface Post {
  id: string;
  title: string;
  subtitle: string;
  content: string;
  coverImage: string;
  image?: string;
  author: string;
  date: string;
  likes: number;
  comments: number;
  status: 'draft' | 'pending_review' | 'approved' | 'published' | 'rejected';
  rejectionReason?: string;
  userLiked?: boolean;
}

export interface NewPost {
  title: string;
  subtitle: string;
  content: string;
  coverImage: string;
  image?: string;
}

export type Section =
  | 'home'
  | 'dashboard'
  | 'new'
  | 'myblogs'
  | 'settings'
  | 'admin'
  | 'admin_pipeline'
  | 'admin_members'
  | 'admin_review';
