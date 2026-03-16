
import LoginForm from '@/components/LoginForm'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Image from 'next/image'

export default async function LoginPage() {
  const cookieStore = await cookies()
  const authToken = cookieStore.get('auth_token')

  if (authToken) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center">
      {/* Background Image Full Screen */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/login-bg.jpg"
          alt="Food Procurement Background"
          fill
          className="object-cover"
          priority
        />
        {/* Dark Overlay agar teks terbaca */}
        <div className="absolute inset-0 bg-black/60"></div>
      </div>

      {/* Login Form Container */}
      <div className="relative z-10 w-full max-w-md px-4">
        <div className="bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-gray-200">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Sistem Pengadaan</h1>
            <p className="text-gray-600">Masuk untuk mengelola stok & pesanan</p>
          </div>
          
          <LoginForm />
        </div>
        
        <div className="mt-8 text-center text-white/80 text-sm">
          <p>&copy; {new Date().getFullYear()} Procurement System</p>
        </div>
      </div>
    </div>
  )
}
