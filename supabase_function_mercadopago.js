
// Importação padrão do Supabase Edge Functions
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Trata requisições OPTIONS (CORS)
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { action, orcamentoId, valorTotal, description, paymentMethodId } = await req.json()

        console.log(`Recebido: Action=${action}, Valor=${valorTotal}, ID=${orcamentoId}`);

        if (!MP_ACCESS_TOKEN) {
            throw new Error("SECRET 'MP_ACCESS_TOKEN' não configurada no Supabase.");
        }

        let url = "";
        let payload = {};

        if (action === 'create_payment') {
            url = "https://api.mercadopago.com/v1/payments";
            payload = {
                transaction_amount: Number(valorTotal),
                description: description || "Pagamento Agile CRM",
                payment_method_id: paymentMethodId || "pix",
                payer: {
                    email: "financeiro@agiledespachante.com.br",
                    first_name: "Cliente",
                    last_name: "Agile"
                }
            };
        } else if (action === 'create_preference') {
            url = "https://api.mercadopago.com/checkout/preferences";
            payload = {
                items: [{
                    title: description || "Serviços Agile",
                    quantity: 1,
                    currency_id: "BRL",
                    unit_price: Number(valorTotal)
                }],
                auto_return: "approved"
            };
        }

        const mpRes = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
                'X-Idempotency-Key': `key-${orcamentoId}-${Date.now()}`
            },
            body: JSON.stringify(payload)
        });

        const data = await mpRes.json();
        console.log("Resposta MP:", JSON.stringify(data));

        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: mpRes.status,
        })

    } catch (error) {
        console.error("ERRO NA FUNÇÃO:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
