import { redirect } from 'next/navigation'
import { isAdmin, isAuthConfigured } from '@/lib/blog/auth'
import LoginForm from '@/components/secure-blog/LoginForm'

export default async function SecureBlogLogin() {
  if (await isAdmin()) redirect('/secure-blog')
  return <LoginForm configured={isAuthConfigured()} />
}
