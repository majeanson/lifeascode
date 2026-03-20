import { redirect } from 'next/navigation'

/**
 * The wizard is now the Edit tab inside the feature detail view.
 * Redirect any existing /wizard bookmarks or links to the detail page.
 * The detail page auto-selects the Edit tab when ?edit=1 is passed.
 */
export default async function WizardPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/features/${id}?edit=1`)
}
