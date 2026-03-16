
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getUncategorizedCount } from '@/app/actions/uncategorized'

export default function UncategorizedBadge() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    // Initial fetch
    getUncategorizedCount().then(setCount)

    // Poll every 60 seconds to keep updated
    const interval = setInterval(() => {
      getUncategorizedCount().then(setCount)
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  if (count === 0) return null

  return (
    <Link 
      href="/inventory/uncategorized"
      className="flex items-center gap-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-3 py-1.5 rounded-full transition-colors mr-4 animate-pulse"
      title={`${count} items need categorization`}
    >
      <span className="text-lg">⚠️</span>
      <span className="font-bold text-sm">{count} Uncategorized Items</span>
    </Link>
  )
}
