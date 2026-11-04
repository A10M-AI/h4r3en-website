import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/blog/auth'
import { getPostByIdAdmin } from '@/lib/blog/store'
import PostEditor from '@/components/secure-blog/PostEditor'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

export default async function EditBlogPage({ params }: Props) {
  await requireAdmin()
  const { id } = await params
  const post = await getPostByIdAdmin(id)

  if (!post) {
    notFound()
  }

  return <PostEditor post={post} />
}

