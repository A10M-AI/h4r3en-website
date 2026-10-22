import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/blog/auth'
import { getAllPosts } from '@/lib/blog/store'
import AdminBar from '@/components/secure-blog/AdminBar'
import PostEditor from '@/components/secure-blog/PostEditor'

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ created?: string }>
}

export default async function EditPost({ params, searchParams }: Props) {
  await requireAdmin()
  const [{ id }, { created }] = await Promise.all([params, searchParams])
  const posts = await getAllPosts()
  const post = posts.find((p) => p.id === id)
  if (!post) notFound()

  return (
    <>
      <AdminBar total={posts.length} />
      <PostEditor
        key={post.id}
        post={post}
        today={new Date().toISOString().slice(0, 10)}
        notice={created ? 'Post created and published.' : undefined}
      />
    </>
  )
}
