import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.17.0?target=deno';

// Edge function specific configuration
const PAYMENT_CONFIG = {
  PRO_GARDEN_THRESHOLD: 64, // Square feet threshold for pro features
  STRIPE_PRICE: 15.00,      // Price in USD
} as const;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentRequest {
  gardenSize: {
    width: number;
    height: number;
  };
  layoutGenerationId?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new Error('Missing Stripe secret key');
    }

    const stripe = new Stripe(stripeKey, {
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Parse request body
    const { gardenSize, layoutGenerationId } = await req.json() as PaymentRequest;

    console.log('PAYLOAD');
    console.log(JSON.stringify(req.json));

    // Calculate garden area and verify it meets the pro threshold
    const area = gardenSize.width * gardenSize.height;
    if (area < PAYMENT_CONFIG.PRO_GARDEN_THRESHOLD) {
      throw new Error('Garden size does not require pro features');
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Pro Garden Layout',
              description: `Custom AI-powered layout for your ${gardenSize.width}' × ${gardenSize.height}' garden`,
            },
            unit_amount: Math.round(PAYMENT_CONFIG.STRIPE_PRICE * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/g?payment=success&layout=${layoutGenerationId || ''}`,
      cancel_url: `${req.headers.get('origin')}?payment=canceled`,
      metadata: {
        layoutGenerationId
      }
    });

    // Return the checkout URL
    return new Response(
      JSON.stringify({ url: session.url }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    console.error('Payment session creation error:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to create payment session'
      }),
      { 
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});