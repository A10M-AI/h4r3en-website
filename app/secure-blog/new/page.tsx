import { requireAdmin } from '@/lib/blog/auth'
import { getAllPosts } from '@/lib/blog/store'
import AdminBar from '@/components/secure-blog/AdminBar'
import PostEditor from '@/components/secure-blog/PostEditor'

export default async function NewPost() {
  await requireAdmin()
  const total = (await getAllPosts()).length

  return (
    <>
      <AdminBar total={total} />
      <PostEditor post={null} today={new Date().toISOString().slice(0, 10)} />
    </>
  )
}
