import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import OpenAI from 'https://esm.sh/openai@4.28.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Plant {
  id: string;
  name: string;
  spacing: number;
}

interface GenerateLayoutRequest {
  plants: Plant[];
  width: number;
  height: number;
  growingZone: number;
  sessionId: string;
  generationId: string;
}

async function sendNotificationEmail(email: string, layoutUrl: string) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) return;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Blooma <garden@bloomagrows.com>',
        to: email,
        subject: 'Your Garden Layout is Ready! 🌱',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1b4332;">Your Garden Layout is Ready!</h1>
            <p style="color: #374151; line-height: 1.6;">
              Great news! We've finished generating your custom garden layout. Click the button below to view your design:
            </p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${layoutUrl}" 
                 style="background-color: #9CCC57; color: white; padding: 12px 24px; text-decoration: none; border-radius: 9999px; font-weight: 500;">
                View My Garden Layout
              </a>
            </div>
            <p style="color: #374151; line-height: 1.6;">
              Happy gardening!<br>
              The Blooma Team
            </p>
          </div>
        `
      })
    });

    if (!response.ok) {
      throw new Error('Failed to send email');
    }
  } catch (error) {
    console.error('Error sending notification email:', error);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !openaiApiKey) {
      throw new Error('Missing environment variables');
    }

    // Initialize clients
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const openai = new OpenAI({ apiKey: openaiApiKey });

    // Parse request body
    const { plants, width, height, growingZone, sessionId, generationId } = await req.json() as GenerateLayoutRequest;

    // Get session UUID and email
    const { data: sessionData, error: sessionError } = await supabase
      .from('onboarding_sessions')
      .select('id, notification_email')
      .eq('session_id', sessionId)
      .single();

    if (sessionError || !sessionData) {
      throw new Error('Session not found');
    }

    try {
      // Build the prompt
      const prompt = `Create an optimal garden layout for a raised bed based on the given plants and spacing requirements.
Garden Specifications:
- ${width} feet wide (X dimension)
- ${height} feet long (Y dimension)

Plants & Spacing Requirements:
${plants.map(p => `- ${p.name} (${p.spacing} inch spacing)`).join('\n')}

This garden is in USDA hardiness zone ${growingZone}.

Guidelines:
1. Plants must be placed within the defined garden dimensions.
2. Ensure plants are spaced according to their spacing requirements (measured center-to-center).
3. Avoid overlapping plants.
4. Do not place plants on the border of the garden bed (spacing applies to the distance from the border).
5. Place taller plants toward the north (lower y values) to prevent shading.
6. Use leftover or irregularly shaped spaces to place compact, shade-tolerant herbs or ornamentals (e.g., basil, marigold, lettuce).
7. Return ONLY a JSON object that matches the schema provided below.
8. Give an even variety of plants as much as possible.
9. Strategically include large-spacing plants even if only a few can fit. Prioritize including at least one of each plant type if space permits.


Return a JSON string with exactly the following structure:
{
  "plants": [
    {
      "name": "plant name",
      "x": number, // inches from left
      "y": number  // inches from top
    }
  ]
}`;

      // Generate layout with OpenAI
      const completion = await openai.chat.completions.create({
        model: 'gpt-4.1-2025-04-14',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      });

      const layoutData = JSON.parse(completion.choices[0].message.content || '{"plants": []}');

      // Update the existing layout
      const { error: updateError } = await supabase
        .from('garden_layouts_history')
        .update({
          layout_data: {
            plants: layoutData.plants.map((item: any) => ({
              plant: plants.find(p => p.name === item.name),
              x: item.x,
              y: item.y
            })),
            width,
            height,
            status: 'completed'
          }
        })
        .eq('session_id', sessionData.id)
        .eq('generation_id', generationId);

      if (updateError) {
        throw updateError;
      }

      // Update generation status
      await supabase
        .from('garden_layout_generations')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('generation_id', generationId);

      // Send email notification if email was provided
      if (sessionData.notification_email) {
        const layoutUrl = `${supabaseUrl}?session=${sessionId}&layout=${generationId}`;
        await sendNotificationEmail(sessionData.notification_email, layoutUrl);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      // Update generation status with error
      await supabase
        .from('garden_layout_generations')
        .update({
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          completed_at: new Date().toISOString()
        })
        .eq('generation_id', generationId);

      // Update layout status to failed
      await supabase
        .from('garden_layouts_history')
        .update({
          layout_data: {
            error: error instanceof Error ? error.message : 'Unknown error',
            status: 'failed'
          }
        })
        .eq('session_id', sessionData.id)
        .eq('generation_id', generationId);

      throw error;
    }
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});