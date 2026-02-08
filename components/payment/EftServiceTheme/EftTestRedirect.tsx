'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

const EftTestRedirect: React.FC = () => {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleTestRedirect = async () => {
      try {
        const test = searchParams.get('test');
        const service = searchParams.get('service');
        const amount = searchParams.get('amount') || '100.00';
        const reference = searchParams.get('reference');

        if (test === 'true' && service === 'yetopayeft') {
          const params = new URLSearchParams({
            test: 'true',
            service: 'yetopayeft',
            amount,
            ...(reference && { reference })
          });

          // Redirect to backend endpoint which will create EFT payment link and redirect
          const baseUrl = process.env.NEXT_PUBLIC_EFT_SERVICE_URL || 'http://localhost:3001';
          window.location.href = `${baseUrl}/api/v1/eft-test-payment?${params.toString()}`;
        } else {
          setError('Invalid test parameters. Use ?test=true&service=yetopayeft');
          setLoading(false);
        }
      } catch (err) {
        console.error('Test redirect error:', err);
        setError('Failed to redirect to test payment');
        setLoading(false);
      }
    };

    handleTestRedirect();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Generating test EFT payment link...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <p>{error}</p>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            Expected URL format: /payment?test=true&service=yetopayeft&amount=100.00
          </p>
        </div>
      </div>
    );
  }

  return null;
};

export default EftTestRedirect;