'use client'

import { useState } from 'react'
import Sidebar from './Sidebar'
import { logout } from '@/app/actions/auth'
import { usePathname } from 'next/navigation'
import UncategorizedBadge from './UncategorizedBadge'

export default function LayoutWrapper({
  children
}: {
  children: React.ReactNode
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true)
  const pathname = usePathname()
  
  // Show sidebar on all pages except login page ('/') and share pages ('/share/*')
  const showSidebar = pathname !== '/' && !pathname.startsWith('/share')

  if (!showSidebar) {
    return <>{children}</>
  }

  const toggleSidebar = () => {
    if (window.innerWidth >= 768) {
      setIsDesktopSidebarOpen(!isDesktopSidebarOpen)
    } else {
      setIsSidebarOpen(!isSidebarOpen)
    }
  }

  return (
    <div className="flex">
      <Sidebar 
        isOpen={isSidebarOpen} 
        isDesktopOpen={isDesktopSidebarOpen}
        onClose={() => setIsSidebarOpen(false)} 
      />
      <div className={`flex-1 min-h-screen bg-gray-50 flex flex-col transition-[margin] duration-300 ${isDesktopSidebarOpen ? 'md:ml-64' : 'md:ml-0'} ml-0`}>
        {/* Header with Logout */}
        <header className="bg-white shadow-sm h-16 flex items-center justify-between px-4 md:px-8 sticky top-0 z-10 print:hidden">
          <div className="flex items-center gap-4">
            <button 
              className="text-gray-500 hover:text-gray-700"
              onClick={toggleSidebar}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="font-semibold text-gray-700 uppercase tracking-wider">
              {pathname.split('/').filter(Boolean).join(' / ') || 'Dashboard'}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <UncategorizedBadge />
            <button
              onClick={() => logout()}
              className="text-sm font-medium text-red-600 hover:text-red-800 transition-colors flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
              </svg>
              <span className="hidden md:inline">Logout</span>
            </button>
          </div>
        </header>
        
        <main className="p-4 md:p-8 text-gray-800 print:p-0 print:bg-white flex-1 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}
