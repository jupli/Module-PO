import { NextResponse } from 'next/server'
import { resetDatabase } from '@/app/actions/reset'

export async function POST() {
  const result = await resetDatabase()
  
  if (result.success) {
    return NextResponse.json({ message: result.message })
  } else {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }
}
