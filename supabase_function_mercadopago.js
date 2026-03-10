
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");
        console.log("--- NOVA REQUISIÇÃO RECEBIDA ---");

        if (!MP_ACCESS_TOKEN) {
            console.error("[CRÍTICO] MP_ACCESS_TOKEN não encontrado nos Secrets!");
            return new Response(JSON.stringify({ error: "Configuração de Token ausente no Supabase." }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
            });
        }

        const { action, orcamentoId, valorTotal, description } = await req.json();
        console.log(`Dados Extraídos: Ação=${action}, Valor=${valorTotal}, ID=${orcamentoId}`);

        let endpoint = "https://api.mercadopago.com/v1/payments";
        let mpBody = {};

        if (action === 'create_payment') {
            mpBody = {
                transaction_amount: Number(valorTotal),
                description: description || "Pagamento Agile CRM",
                payment_method_id: "pix",
                payer: { email: "financeiro@agiledespachante.com.br" }
            };
        } else {
            endpoint = "https://api.mercadopago.com/checkout/preferences";
            mpBody = {
                items: [{
                    title: description || "Serviços Agile",
                    quantity: 1,
                    unit_price: Number(valorTotal),
                    currency_id: "BRL"
                }]
            };
        }

        console.log("Chamando Mercado Pago...");
        const mpRes = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(mpBody)
        });

        const mpData = await mpRes.json();
        console.log(`Resposta do Mercado Pago (Status ${mpRes.status}):`, JSON.stringify(mpData));

        return new Response(JSON.stringify(mpData), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: mpRes.status
        });

    } catch (error) {
        console.error("[ERRO NO CÓDIGO]:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
        });
    }
})
