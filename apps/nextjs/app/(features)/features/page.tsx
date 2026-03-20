import { HydrateClient } from '@/trpc/rsc'
import { FeatureList } from '@/components/features/feature-list'

// FeatureList uses useInfiniteQuery with a custom queryKey — no RSC prefetch needed.
// First page loads immediately on the client with a skeleton.
export default function FeaturesPage() {
  return (
    <HydrateClient>
      <div className="p-6">
        <FeatureList />
      </div>
    </HydrateClient>
  )
}
