import type { Metadata } from 'next'

import { AboutShell } from '@/components/about/about-shell'

export const metadata: Metadata = {
  title: 'About',
  description: 'The Life-as-Code ecosystem — CLI, VS Code extension, MCP server, and web app.',
}

export default function AboutPage() {
  return <AboutShell />
}
