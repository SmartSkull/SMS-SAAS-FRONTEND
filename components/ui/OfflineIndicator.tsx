'use client';

import { WifiOff, RefreshCw } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useEffect, useState } from 'react';

export function OfflineIndicator() {
  const isOnline = useNetworkStatus();
  const [hasApiNetworkError, setHasApiNetworkError] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const handleApiError = () => {
      setHasApiNetworkError(true);
    };

    // Only check when the user actually interacts or returns to the tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !window.navigator.onLine) {
        // Force a refresh of the hook's internal state if needed
        // but the hook already listens to window events.
      }
    };

    window.addEventListener('api-network-error', handleApiError);
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('api-network-error', handleApiError);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, []);

  const showOverlay = !isOnline || hasApiNetworkError;

  if (!mounted || !showOverlay) return null;

  return (
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in"
      style={{ pointerEvents: 'auto' }}
    >
      <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border border-gray-100 flex flex-col items-center max-w-sm text-center gap-6 mx-4">
        <div className="w-24 h-24 rounded-3xl bg-red-50 flex items-center justify-center text-red-500 shadow-inner">
          <WifiOff size={48} />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">
            {!isOnline ? 'No Connection' : 'Server Down'}
          </h2>
          <p className="text-gray-500 leading-relaxed">
            {!isOnline 
              ? 'Your device is currently offline. Please check your internet settings.'
              : 'Our servers are temporarily unreachable. We are working on it!'}
          </p>
        </div>

        <div className="flex flex-col w-full gap-3">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all transform active:scale-95 shadow-xl shadow-blue-200"
          >
            <RefreshCw size={20} className="animate-spin-slow" />
            Reconnect Now
          </button>
          
          {hasApiNetworkError && isOnline && (
            <button
              onClick={() => setHasApiNetworkError(false)}
              className="px-6 py-2 text-sm font-semibold text-gray-400 hover:text-gray-600 transition-colors"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
