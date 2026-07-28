import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { provider, api_key, model_name } = await req.json();

    if (!provider || !api_key || !model_name) {
      return new Response(JSON.stringify({ error: 'Missing provider, api_key, or model_name' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let isValid = false;
    let errorMessage = '';

    try {
      if (provider === 'google') {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model_name}?key=${api_key}`);
        isValid = res.ok;
        if (!isValid) errorMessage = 'Request had invalid authentication credentials or model name.';
      } 
      else if (provider === 'openai') {
        const res = await fetch(`https://api.openai.com/v1/models/${model_name}`, {
          headers: { 'Authorization': `Bearer ${api_key}` }
        });
        isValid = res.ok;
        if (!isValid) errorMessage = 'Request had invalid authentication credentials or model name.';
      } 
      else if (provider === 'anthropic') {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 
            'x-api-key': api_key, 
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            model: model_name,
            max_tokens: 1,
            messages: [{ role: 'user', content: 'hi' }]
          })
        });
        isValid = res.ok;
        if (!isValid) errorMessage = 'Request had invalid authentication credentials or model name.';
      } 
      else if (provider === 'groq') {
        const res = await fetch(`https://api.groq.com/openai/v1/models/${model_name}`, {
          headers: { 'Authorization': `Bearer ${api_key}` }
        });
        isValid = res.ok;
        if (!isValid) errorMessage = 'Request had invalid authentication credentials or model name.';
      } 
      else if (provider === 'cloudflare') {
        const [accountId, token] = api_key.split(':');
        if (!accountId || !token) {
          isValid = false;
          errorMessage = 'Cloudflare API key must be in format ACCOUNT_ID:TOKEN';
        } else {
          // Send a dummy request to the specific model
          const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model_name}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] })
          });
          isValid = res.ok;
          if (!isValid) errorMessage = 'Request had invalid authentication credentials or model name.';
        }
      }
      if (!isValid && !errorMessage) {
        errorMessage = 'Request had invalid authentication credentials or model name.';
      }
    } catch (e) {
      isValid = false;
      errorMessage = 'Request had invalid authentication credentials or model name.';
    }

    return new Response(JSON.stringify({ success: isValid, error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Request had invalid authentication credentials.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
