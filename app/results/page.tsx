'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Redirect: /results -> /profile
 * The results page has been moved into the authenticated profile section.
 */
export default function ResultsRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/profile');
  }, [router]);
  
  return (
    <div className="min-h-screen bg-[#F8FAFB] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5BA4E5] mx-auto mb-4"></div>
        <p className="text-[#6B7280]">Redirecting to your profile...</p>
      </div>
    </div>
  );
}
