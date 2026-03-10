
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // CORS Handshake
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");

        // Lê o corpo da requisição com erro tratado
        const bodyText = await req.text();
        if (!bodyText) throw new Error("Corpo da requisição vazio");

        const { action, orcamentoId, valorTotal, description } = JSON.parse(bodyText);

        if (!MP_ACCESS_TOKEN) {
            return new Response(JSON.stringify({ error: "Token MP não configurado no Supabase" }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
            });
        }

        let endpoint = "https://api.mercadopago.com/v1/payments";
        let mpBody = {};

        if (action === 'create_payment') {
            mpBody = {
                transaction_amount: Number(valorTotal),
                description: description || "Pagamento Agile CRM",
                payment_method_id: "pix",
                payer: {
                    email: "financeiro@agiledespachante.com.br",
                    first_name: "Cliente",
                    last_name: "Agile"
                }
            };
        } else {
            endpoint = "https://api.mercadopago.com/checkout/preferences";
            mpBody = {
                items: [{
                    title: description || "Serviços Agile",
                    quantity: 1,
                    unit_price: Number(valorTotal),
                    currency_id: "BRL"
                }],
                auto_return: "approved"
            };
        }

        const mpRes = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(mpBody)
        });

        const mpData = await mpRes.json();

        // Retorna a resposta do Mercado Pago exatamente como veio
        return new Response(JSON.stringify(mpData), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: mpRes.status
        });

    } catch (error) {
        console.error("ERRO:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
        });
    }
})
