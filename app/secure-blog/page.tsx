import { requireAdmin } from '@/lib/blog/auth'
import { getAllPostsAdmin } from '@/lib/blog/store'
import AdminBar from '@/components/secure-blog/AdminBar'
import BlogManager from '@/components/secure-blog/BlogManager'

export const dynamic = 'force-dynamic'

export default async function SecureBlogDashboard() {
  await requireAdmin()
  const posts = await getAllPostsAdmin()

  const publishedCount = posts.filter((p) => p.status === 'published').length
  const draftCount = posts.filter((p) => p.status === 'draft').length

  return (
    <div>
      <AdminBar total={posts.length} publishedCount={publishedCount} draftCount={draftCount} />
      <BlogManager posts={posts} />
    </div>
  )
}

