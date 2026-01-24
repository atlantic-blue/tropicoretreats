import { useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { ChevronLeft, Loader2, AlertCircle } from 'lucide-react';
import { useLeadDetail } from '../hooks/useLeadDetail';
import { LeadDetail } from '../components/leads/LeadDetail';
import { setTokenGetter } from '../api/client';
import { useAuth } from '../hooks/useAuth';

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Breadcrumb skeleton */}
      <div className="h-4 bg-gray-200 rounded w-40 animate-pulse" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column skeleton */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="h-6 bg-gray-200 rounded w-48 animate-pulse mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-5 bg-gray-200 rounded w-64 animate-pulse" />
              ))}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="h-5 bg-gray-200 rounded w-24 animate-pulse mb-3" />
            <div className="h-20 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>

        {/* Right column skeleton */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i}>
                <div className="h-4 bg-gray-200 rounded w-16 animate-pulse mb-2" />
                <div className="h-10 bg-gray-200 rounded w-32 animate-pulse" />
              </div>
            ))}
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="h-5 bg-gray-200 rounded w-24 animate-pulse mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ErrorMessage({ error }: { error: Error }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
      <div>
        <h3 className="text-sm font-medium text-red-800">Error loading lead</h3>
        <p className="text-sm text-red-600 mt-1">{error.message}</p>
        <Link
          to="/leads"
          className="inline-flex items-center gap-1 mt-3 text-sm text-red-700 hover:text-red-800 font-medium"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to leads
        </Link>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
      <h3 className="text-lg font-medium text-gray-900">Lead not found</h3>
      <p className="text-gray-600 mt-1">The lead you're looking for doesn't exist or has been removed.</p>
      <Link
        to="/leads"
        className="inline-flex items-center gap-1 mt-4 text-blue-600 hover:text-blue-800 font-medium"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to leads
      </Link>
    </div>
  );
}

export function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { getAccessToken } = useAuth();
  const { data: lead, isLoading, isError, error } = useLeadDetail(id!);

  // Initialize the token getter for API calls
  useEffect(() => {
    setTokenGetter(getAccessToken);
  }, [getAccessToken]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm">
          <Link to="/leads" className="flex items-center gap-1 text-gray-600 hover:text-gray-900">
            <ChevronLeft className="w-4 h-4" />
            Leads
          </Link>
          <span className="text-gray-400">/</span>
          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  if (isError) {
    return <ErrorMessage error={error} />;
  }

  if (!lead) {
    return <NotFound />;
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb navigation */}
      <nav className="flex items-center gap-2 text-sm">
        <Link to="/leads" className="flex items-center gap-1 text-gray-600 hover:text-gray-900">
          <ChevronLeft className="w-4 h-4" />
          Leads
        </Link>
        <span className="text-gray-400">/</span>
        <span className="text-gray-900 font-medium">{lead.firstName} {lead.lastName}</span>
      </nav>

      <LeadDetail lead={lead} />
    </div>
  );
}
