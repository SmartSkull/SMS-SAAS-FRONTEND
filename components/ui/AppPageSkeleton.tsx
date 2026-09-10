import { Skeleton } from './Skeleton';

type AppPageSkeletonProps = {
  variant?: 'portal' | 'public';
};

export default function AppPageSkeleton({ variant = 'public' }: AppPageSkeletonProps) {
  if (variant === 'portal') {
    return (
      <div className="min-h-[calc(100vh-7rem)] space-y-6 p-4 lg:p-6" aria-busy="true" aria-label="Loading page">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-7 w-40 rounded-lg" />
            <Skeleton className="h-4 w-60 rounded-md" />
          </div>
          <Skeleton className="h-10 w-28 rounded-lg" />
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
              <Skeleton className="h-3 w-20 rounded-md" />
              <Skeleton className="mt-3 h-7 w-14 rounded-md" />
              <Skeleton className="mt-3 h-2 w-full rounded-full" />
            </div>
          ))}
        </div>

        <section className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-4">
            <Skeleton className="h-10 max-w-md flex-1 rounded-lg" />
            <Skeleton className="h-10 w-28 rounded-lg" />
          </div>
          <div className="overflow-hidden">
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 border-b border-gray-100 bg-gray-50 px-5 py-3">
              {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-3 w-16 rounded-md" />)}
            </div>
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="grid grid-cols-[2fr_1fr_1fr_1fr] items-center gap-4 border-b border-gray-50 px-5 py-4 last:border-0">
                <div className="flex items-center gap-3"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-4 w-32 rounded-md" /></div>
                <Skeleton className="h-4 w-20 rounded-md" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-8 w-8 justify-self-end rounded-lg" />
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white" aria-busy="true" aria-label="Loading page">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Skeleton className="h-9 w-36 rounded-lg" />
        <div className="hidden gap-6 md:flex"><Skeleton className="h-4 w-16 rounded-md" /><Skeleton className="h-4 w-20 rounded-md" /><Skeleton className="h-4 w-16 rounded-md" /></div>
        <Skeleton className="h-10 w-24 rounded-lg" />
      </header>
      <main className="mx-auto grid max-w-7xl gap-10 px-5 pb-12 pt-12 sm:px-8 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:pt-20">
        <div className="space-y-5"><Skeleton className="h-5 w-28 rounded-full" /><Skeleton className="h-12 w-full max-w-xl rounded-lg" /><Skeleton className="h-12 w-4/5 rounded-lg" /><Skeleton className="h-5 w-full max-w-lg rounded-md" /><Skeleton className="h-5 w-3/4 rounded-md" /><Skeleton className="mt-8 h-11 w-36 rounded-lg" /></div>
        <Skeleton className="aspect-[4/3] w-full rounded-lg" />
      </main>
    </div>
  );
}
