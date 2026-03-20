import { FeatureCardSkeleton } from '@/components/features/feature-card-skeleton'

export default function FeaturesLoading() {
  return (
    <div className="p-6 flex flex-col gap-3">
      <FeatureCardSkeleton />
      <FeatureCardSkeleton />
      <FeatureCardSkeleton />
    </div>
  )
}
