import { redirect } from 'next/navigation'

/** Templates tab is now part of the unified /admin page. */
export default function AdminTemplatesPage() {
  redirect('/admin')
}
