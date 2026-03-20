import { Suspense } from 'react'

import { SearchPageClient } from '@/components/search/search-page-client'

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading search...</div>}>
      <SearchPageClient />
    </Suspense>
  )
}
