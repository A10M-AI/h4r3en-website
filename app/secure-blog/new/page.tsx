import { requireAdmin } from '@/lib/blog/auth'
import PostEditor from '@/components/secure-blog/PostEditor'

export const dynamic = 'force-dynamic'

export default async function NewBlogPage() {
  await requireAdmin()
  return <PostEditor />
}

