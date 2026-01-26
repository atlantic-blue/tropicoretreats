import { useEffect } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { useFilters } from '../hooks/useFilters';
import { useLeads } from '../hooks/useLeads';
import { LeadGrid } from '../components/leads/LeadGrid';
import { LeadFilters } from '../components/leads/LeadFilters';
import { Pagination } from '../components/ui/Pagination';
import { setTokenGetter } from '../api/client';
import { useAuth } from '../hooks/useAuth';

const PAGE_SIZE = 15;

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 bg-gray-200 rounded w-32 animate-pulse" />
      <div className="h-16 bg-gray-200 rounded animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  );
}

function ErrorMessage({ error }: { error: Error }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
      <div>
        <h3 className="text-sm font-medium text-red-800">Error loading leads</h3>
        <p className="text-sm text-red-600 mt-1">{error.message}</p>
      </div>
    </div>
  );
}

export function LeadsListPage() {
  const { getAccessToken } = useAuth();
  const {
    filters,
    setPage,
    goToNextPage,
    goToPrevPage,
    getCurrentCursor,
    setNextCursor,
    hasPrevPage,
  } = useFilters();

  const cursor = getCurrentCursor();
  const { data, isLoading, isError, error, isFetching, isPlaceholderData } = useLeads({
    filters,
    cursor,
    onNextCursor: setNextCursor,
  });

  // Initialize the token getter for API calls
  useEffect(() => {
    setTokenGetter(getAccessToken);
  }, [getAccessToken]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (isError) {
    return <ErrorMessage error={error} />;
  }

  const totalCount = data?.totalCount ?? 0;
  const leads = data?.leads ?? [];
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Determine if we can go to next page based on API response
  const canGoNext = data?.nextCursor !== undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
        <div className="flex items-center gap-2">
          {isFetching && isPlaceholderData && (
            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
          )}
          <span className="text-sm text-gray-500">
            Showing {leads.length} of {totalCount} leads
          </span>
        </div>
      </div>

      {/* Filters */}
      <LeadFilters />

      {/* Lead Grid */}
      <LeadGrid leads={leads} />

      {/* Pagination */}
      <Pagination
        currentPage={filters.page}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onNextPage={goToNextPage}
        onPrevPage={goToPrevPage}
        hasNextPage={canGoNext}
        hasPrevPage={hasPrevPage}
        isLoading={isFetching && isPlaceholderData}
      />
    </div>
  );
}
