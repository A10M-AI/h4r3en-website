import { requireAdmin } from '@/lib/blog/auth'
import { getAllPosts } from '@/lib/blog/store'
import AdminBar from '@/components/secure-blog/AdminBar'
import BlogManager from '@/components/secure-blog/BlogManager'

export default async function SecureBlog() {
  await requireAdmin()
  const posts = await getAllPosts()

  return (
    <>
      <AdminBar total={posts.length} />
      <BlogManager posts={posts} />
    </>
  )
}
