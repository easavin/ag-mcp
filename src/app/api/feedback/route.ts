import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const { text, email, pageUrl } = await req.json()
  // Optionally get userId from session if available
  await prisma.feedback.create({ data: { text, email, pageUrl } })
  return NextResponse.json({ ok: true })
} 