import React, { useState } from 'react';
import { X, Lock } from 'lucide-react';

interface PaymentModalProps {
  onClose: () => void;
  onSuccess: () => void;
  gardenSize: { width: number; height: number };
  layoutGenerationId: string | null;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ 
  onClose, 
  onSuccess, 
  gardenSize,
  layoutGenerationId
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const addDebugInfo = (message: string) => {
    console.log('Payment Debug:', message);
    setDebugInfo(prev => [...prev, message]);
  };

  const handlePayment = async () => {
    setLoading(true);
    setError(null);
    setDebugInfo([]);

    try {
      addDebugInfo('Creating payment session...');
      const response = await fetch('https://aivhebrzveblftbqfnzc.supabase.co/functions/v1/create-payment-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          gardenSize,
          layoutGenerationId
        })
      });

      addDebugInfo(`Response status: ${response.status}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        addDebugInfo(`Response error: ${JSON.stringify(errorData)}`);
        throw new Error(errorData.error || 'Failed to create payment session');
      }

      const data = await response.json();
      if (!data.url) {
        throw new Error('No checkout URL received');
      }

      // Store the layout generation ID in localStorage before redirecting
      if (layoutGenerationId) {
        localStorage.setItem('pending_layout_id', layoutGenerationId);
      }

      addDebugInfo('Redirecting to Stripe checkout...');
      window.location.href = data.url;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment processing failed. Please try again.';
      console.error('Payment error:', err);
      addDebugInfo(`Error: ${errorMessage}`);
      setError(errorMessage);
      setLoading(false);
    }
  };

  const area = gardenSize.width * gardenSize.height;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl border border-spring-leaf-200 p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-display text-forest-800">Pro Garden Layout</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-spring-leaf-50 rounded-lg transition-colors text-forest-600 hover:text-forest-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="p-4 bg-spring-leaf-50 border border-spring-leaf-200 rounded-xl">
            <div className="text-forest-800">
              <div className="font-medium mb-2">Garden Size</div>
              <div>{gardenSize.width}' × {gardenSize.height}' ({area} sq ft)</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-lg">
              <span className="font-medium text-forest-800">Total</span>
              <span className="font-medium text-forest-800">$15.00</span>
            </div>
            <p className="text-sm text-forest-600">
              One-time payment for your custom garden layout
            </p>
          </div>

          {error && (
            <div className="p-3 bg-heirloom-50 border border-heirloom-200 rounded-xl text-heirloom-700 text-sm">
              {error}
            </div>
          )}

          {debugInfo.length > 0 && (
            <div className="p-3 bg-cornflower-50 border border-cornflower-200 rounded-xl text-xs font-mono space-y-1 max-h-32 overflow-y-auto">
              {debugInfo.map((info, i) => (
                <div key={i} className="text-forest-600">
                  {info}
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handlePayment}
            disabled={loading}
            className="w-full px-6 py-4 bg-spring-leaf-500 text-white rounded-full hover:bg-spring-leaf-600 transition-colors font-medium shadow-lg shadow-spring-leaf-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4" />
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Processing...</span>
              </div>
            ) : (
              'Pay $15.00'
            )}
          </button>

          <div className="text-center">
            <p className="text-sm text-forest-500">
              Secure payment powered by Stripe
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;