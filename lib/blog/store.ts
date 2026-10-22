import { promises as fs } from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import type { Post, PostInput } from './types'

// File-based storage: posts live in data/blog/posts.json and uploaded
// images in data/blog/uploads. Requires a writable filesystem (local
// machine, VPS or Docker volume) — swap these functions for a database
// to run on serverless hosting.
const DATA_DIR = path.join(process.cwd(), 'data', 'blog')
const POSTS_FILE = path.join(DATA_DIR, 'posts.json')
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads')

async function readPosts(): Promise<Post[]> {
  try {
    return JSON.parse(await fs.readFile(POSTS_FILE, 'utf8')) as Post[]
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
}

async function writePosts(posts: Post[]) {
  await fs.mkdir(DATA_DIR, { recursive: true })
  const tempFile = `${POSTS_FILE}.${process.pid}.tmp`
  await fs.writeFile(tempFile, JSON.stringify(posts, null, 2) + '\n', 'utf8')
  await fs.rename(tempFile, POSTS_FILE)
}

// Serialises read-modify-write cycles so concurrent saves can't drop changes.
let writeQueue: Promise<unknown> = Promise.resolve()
function withWriteLock<T>(task: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(task)
  writeQueue = run.catch(() => undefined)
  return run
}

const newestFirst = (a: Post, b: Post) => b.date.localeCompare(a.date)

export async function getAllPosts(): Promise<Post[]> {
  return (await readPosts()).sort(newestFirst)
}

export async function getPostBySlug(slug: string): Promise<Post | undefined> {
  return (await readPosts()).find((post) => post.slug === slug)
}

export type SaveResult =
  | { ok: true; post: Post }
  | { ok: false; error: string }

export function savePost(id: string | null, input: PostInput): Promise<SaveResult> {
  return withWriteLock(async () => {
    const posts = await readPosts()
    if (posts.some((post) => post.slug === input.slug && post.id !== id)) {
      return { ok: false, error: `Another post already uses the URL /blog/${input.slug}.` }
    }

    const updatedAt = new Date().toISOString()
    if (id) {
      const index = posts.findIndex((post) => post.id === id)
      if (index === -1) return { ok: false, error: 'This post no longer exists.' }
      posts[index] = { ...input, id, updatedAt }
      await writePosts(posts)
      return { ok: true, post: posts[index] }
    }

    const post: Post = { ...input, id: randomUUID(), updatedAt }
    posts.push(post)
    await writePosts(posts)
    return { ok: true, post }
  })
}

export function deletePost(id: string): Promise<Post | undefined> {
  return withWriteLock(async () => {
    const posts = await readPosts()
    const post = posts.find((p) => p.id === id)
    if (post) await writePosts(posts.filter((p) => p.id !== id))
    return post
  })
}

// `name` must already be validated against MEDIA_NAME_PATTERN.
export async function saveUpload(name: string, bytes: Uint8Array) {
  await fs.mkdir(UPLOADS_DIR, { recursive: true })
  await fs.writeFile(path.join(UPLOADS_DIR, name), bytes)
}

export function readUpload(name: string): Promise<Buffer> {
  return fs.readFile(path.join(UPLOADS_DIR, name))
}
