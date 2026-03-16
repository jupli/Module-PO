
'use server'

import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function login(prevState: any, formData: FormData) {
  const username = formData.get('username') as string
  const password = formData.get('password') as string

  if (!username || !password) {
    return { message: 'Username and password are required' }
  }

  try {
    const user = await prisma.user.findUnique({
      where: { username },
    })

    if (!user || user.password !== password) {
      return { message: 'Invalid credentials' }
    }

    // Set cookie
    const cookieStore = await cookies()
    cookieStore.set('auth_token', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    })

  } catch (error) {
    console.error('Login error:', error)
    return { message: 'Internal server error' }
  }

  redirect('/dashboard')
}

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete('auth_token')
  redirect('/')
}
