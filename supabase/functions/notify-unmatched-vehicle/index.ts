// @deno-types="https://deno.land/std@0.168.0/http/server.ts"
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// @deno-types="https://esm.sh/resend@1.0.0"
import { Resend } from 'https://esm.sh/resend@1.0.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

interface UnmatchedVehicle {
  make: string;
  model: string;
  registration?: string;
  matched_size: string;
}

serve(async (req) => {
  try {
    const { make, model, registration, matched_size } = await req.json() as UnmatchedVehicle;

    // Verify request is from our Supabase function
    const authHeader = req.headers.get('Authorization');
    if (authHeader !== `Bearer ${Deno.env.get('EDGE_FUNCTION_KEY')}`) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Format registration for display
    const regDisplay = registration ? `[${registration}]` : 'Unknown';

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: 'Love4Detailing <no-reply@love4detailing.co.uk>',
      to: 'paul@evans.studio',
      subject: 'Unmatched Vehicle Detected',
      html: `
        <h2>Unmatched Vehicle Detected</h2>
        <p>A vehicle with the following details could not be matched to a size category:</p>
        <ul>
          <li><strong>Registration:</strong> ${regDisplay}</li>
          <li><strong>Make:</strong> ${make}</li>
          <li><strong>Model:</strong> ${model}</li>
        </ul>
        <p>The vehicle was automatically assigned to the <strong>${matched_size}</strong> size category.</p>
        <p>Please review and update the vehicle size reference data if needed.</p>
      `
    });

    if (error) {
      console.error('Failed to send email:', error);
      return new Response(JSON.stringify({ error: 'Failed to send email' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true, messageId: data?.id }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}); 