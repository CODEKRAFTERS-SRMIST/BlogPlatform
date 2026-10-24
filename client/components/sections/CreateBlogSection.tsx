'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ImageIcon, Upload, Save, Loader2 } from 'lucide-react';
import { NewPost } from '@/types/blog';
import { BLOG_LIMITS, counterFor, truncateChars, PREVIEW_CHARS } from '@/lib/blogLimits';
import { useAuth } from '@/lib/useAuth';
import { formatPostDate } from '@/lib/mapPost';


function FieldCounter({ field, value }: { field: 'title' | 'subtitle' | 'content'; value: string }) {
  const c = counterFor(field, value);
  return (
    <span
      className={`text-xs font-semibold tabular-nums ${
        c.tooLong ? 'text-red-500' : c.tooShort ? 'text-amber-600' : 'text-gray-400'
      }`}
    >
      {c.label}
    </span>
  );
}

interface CreateBlogSectionProps {
  newPost: NewPost;
  setNewPost: (post: NewPost) => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleCreatePost: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  /** True while the story is being sent, so the button cannot fire twice. */
  submitting?: boolean;
}

export default function CreateBlogSection({ 
  newPost, 
  setNewPost, 
  handleImageUpload,
  handleCreatePost,
  fileInputRef,
  submitting = false,
}: CreateBlogSectionProps) {
  const { user } = useAuth();
  const [isDragging, setIsDragging] = useState(false);

  /*
   * The author and the date are shown, not asked for.
   *
   * Both used to be text boxes. Neither was ever sent: the server takes the
   * author from the session and the date from the clock when the row is
   * written. So whatever was typed was discarded - and the author box in
   * particular read as an invitation to publish under somebody else's name.
   */
  const authorName = user?.name || 'You';
  const today = formatPostDate(new Date().toISOString());

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const event = {
        target: {
          files: e.dataTransfer.files
        }
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleImageUpload(event);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.18 }}
      className="w-full min-w-0 max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-8"
    >
      {/* Editor Section */}
      <motion.div
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="min-w-0 bg-white/90 rounded-3xl p-4 sm:p-6 md:p-8 shadow-lg border border-white/50 space-y-6 h-fit order-2 lg:order-1"
      >
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Create New Blog</h2>

        <div>
          <div className="flex items-baseline justify-between mb-2">
            <label className="block text-sm font-semibold text-gray-700">Title</label>
            <FieldCounter field="title" value={newPost.title} />
          </div>
          <input
            type="text"
            value={newPost.title}
            onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
            maxLength={BLOG_LIMITS.title.max}
            placeholder="Enter an engaging title..."
            className="w-full bg-gray-50 border-2 border-gray-200 rounded-2xl px-4 py-3 focus:outline-none focus:border-[#f5b800] focus:bg-white transition-all text-lg font-semibold"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Cover Image</label>
          <div className="flex gap-2">
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`w-full border-2 border-dashed px-4 py-4 rounded-2xl flex items-center justify-center gap-3 transition-colors ${
                isDragging 
                  ? 'bg-amber-50 border-[#f5b800] text-[#f5b800]' 
                  : 'bg-gray-50 hover:bg-gray-100 border-gray-300 hover:border-[#f5b800] text-gray-700'
              }`}
              title="Upload from PC or Drag and Drop"
            >
              <Upload size={20} className={isDragging ? 'text-[#f5b800]' : 'text-gray-500'} />
              <span className="font-semibold text-sm sm:text-base">
                {isDragging
                  ? 'Drop Image Here'
                  : newPost.coverImage
                    ? 'Replace cover image'
                    : 'Upload Cover Image or Drag & Drop'}
              </span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleImageUpload}
            />
          </div>

          {/* Confirmation that the upload landed. Without it the only sign of
              success was the picture appearing in the preview panel, which on
              a phone sits below the whole form. */}
          {newPost.coverImage && (
            <div className="mt-2 flex min-w-0 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
              <img
                src={newPost.coverImage}
                alt=""
                className="h-9 w-12 shrink-0 rounded-lg object-cover"
              />
              <span className="min-w-0 flex-1 text-xs font-black text-emerald-700">
                Cover image added
              </span>
              <button
                type="button"
                onClick={() => setNewPost({ ...newPost, coverImage: '' })}
                className="shrink-0 rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700 transition-colors hover:bg-emerald-100"
              >
                Remove
              </button>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-2">
            <label className="block text-sm font-semibold text-gray-700">
              Subtitle <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <FieldCounter field="subtitle" value={newPost.subtitle} />
          </div>
          <input
            type="text"
            value={newPost.subtitle}
            onChange={(e) => setNewPost({ ...newPost, subtitle: e.target.value })}
            maxLength={BLOG_LIMITS.subtitle.max}
            placeholder="A brief description shown on the card and in link previews"
            className="w-full bg-gray-50 border-2 border-gray-200 rounded-2xl px-4 py-3 focus:outline-none focus:border-[#f5b800] focus:bg-white transition-all"
          />
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-2">
            <label className="block text-sm font-semibold text-gray-700">Content</label>
            <FieldCounter field="content" value={newPost.content} />
          </div>
          <textarea
            value={newPost.content}
            onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
            maxLength={BLOG_LIMITS.content.max}
            placeholder="Write your story here..."
            rows={14}
            // Resizable on purpose: a 20,000 character post is long, and a
            // fixed box makes writing one feel like typing through a letterbox.
            className="w-full min-h-[18rem] bg-gray-50 border-2 border-gray-200 rounded-2xl px-3 sm:px-4 py-3 focus:outline-none focus:border-[#f5b800] focus:bg-white transition-all resize-y leading-relaxed text-[15px]"
          />
        </div>

        <p className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-500">
          Publishing as <span className="font-black text-gray-900">{authorName}</span> · {today}
        </p>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleCreatePost}
          disabled={
            submitting ||
            !counterFor('title', newPost.title).ok ||
            newPost.title.trim().length === 0 ||
            !counterFor('subtitle', newPost.subtitle).ok ||
            !counterFor('content', newPost.content).ok ||
            newPost.content.trim().length === 0
          }
          className="w-full bg-[#f5b800] hover:bg-[#e5a800] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl shadow-lg transition-colors flex items-center justify-center gap-3 text-lg"
        >
          {submitting ? (
            <>
              <Loader2 size={20} className="animate-spin" /> Submitting…
            </>
          ) : (
            <>
              <Save size={20} /> Submit for review
            </>
          )}
        </motion.button>
      </motion.div>

      {/* Preview Section */}
      <motion.div
        initial={{ x: 50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.08 }}
        className="min-w-0 bg-white/90 rounded-3xl p-4 sm:p-6 md:p-8 shadow-lg border border-white/50 h-fit lg:sticky lg:top-24 order-1 lg:order-2"
      >
        <h3 className="text-2xl font-bold text-gray-900 mb-6">Live Preview</h3>

        <div className="space-y-4">
          <div className="w-full aspect-[16/9] rounded-2xl overflow-hidden bg-gray-100">
            {newPost.coverImage ? (
              <img 
                src={newPost.coverImage} 
                alt="Cover preview" 
                className="w-full h-full object-cover"
                loading="lazy"
                /* No stock-photo stand-in. A cover that will not load is
                   something to notice, not to paper over with a photograph
                   of somebody else's desk. */
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <ImageIcon size={48} />
              </div>
            )}
          </div>

          <h2 className="wrap-anywhere text-xl sm:text-2xl md:text-3xl font-black text-gray-900 leading-tight">
            {newPost.title || 'Your title here...'}
          </h2>

          <p className="wrap-anywhere text-sm sm:text-base text-gray-600 leading-relaxed">
            {newPost.subtitle || 'Your subtitle here...'}
          </p>

          <div className="pt-4 border-t border-gray-200">
            <div className="flex min-w-0 items-center gap-3">
              <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-[#f5b800] to-amber-500 flex items-center justify-center text-white font-bold">
                {authorName.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="truncate font-bold text-gray-900">{authorName}</div>
                <div className="text-sm text-gray-500">{today}</div>
              </div>
            </div>
          </div>

          {newPost.content && (
            <div className="pt-4">
              <p className="wrap-anywhere text-sm sm:text-base text-gray-700 leading-relaxed">
                {truncateChars(newPost.content, PREVIEW_CHARS)}
              </p>
              {newPost.content.trim().length > PREVIEW_CHARS && (
                <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Preview only - the published post shows all{' '}
                  {newPost.content.trim().length.toLocaleString()} characters
                </p>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}