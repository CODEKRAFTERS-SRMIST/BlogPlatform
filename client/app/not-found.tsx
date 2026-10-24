import Link from 'next/link'

/**
 * Shown for any address that does not resolve, including a story that was
 * never published or has since been taken down - /blogs/[id] calls
 * notFound() for both, so a pending submission is indistinguishable from a
 * made-up id. That is deliberate: a different message for each would tell a
 * stranger which ids exist.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#f8f7f4] px-6 py-20 text-center">
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">
        404
      </p>
      <h1 className="mt-4 text-4xl font-black tracking-tighter text-gray-900 sm:text-6xl">
        Nothing here.
      </h1>
      <p className="mt-5 max-w-md text-base font-medium leading-relaxed text-gray-500">
        This page does not exist, or the story you are after has not been
        published yet.
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/blogs"
          className="rounded-2xl bg-gray-900 px-7 py-3.5 text-sm font-black text-white transition-colors hover:bg-[#f5b800]"
        >
          Read the feed
        </Link>
        <Link
          href="/"
          className="rounded-2xl border border-gray-200 bg-white px-7 py-3.5 text-sm font-black text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-900"
        >
          Back home
        </Link>
      </div>
    </main>
  )
}
