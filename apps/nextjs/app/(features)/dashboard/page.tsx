import { redirect } from 'next/navigation'

/**
 * Dashboard content is now part of the unified home page (/).
 * Redirect all existing /dashboard links and bookmarks.
 */
export default function DashboardPage() {
  redirect('/')
}
