import { Suspense } from "react"
import BlogPlatform from "@/components/sections/BlogPlatform"

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f8f7f4] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f5b800]" />
      </div>
    }>
      <BlogPlatform />
    </Suspense>
  )
}
