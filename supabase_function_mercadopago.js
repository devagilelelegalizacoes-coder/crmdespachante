
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { action, orcamentoId, valorTotal, description } = await req.json()
        const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN")

        if (!MP_ACCESS_TOKEN) {
            return new Response(JSON.stringify({ error: "Token MP não configurado no Supabase" }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
            })
        }

        let endpoint = "https://api.mercadopago.com/v1/payments"
        let body = {}

        if (action === 'create_payment') {
            body = {
                transaction_amount: Number(valorTotal),
                description: description || "Pagamento Agile CRM",
                payment_method_id: "pix",
                payer: { email: "financeiro@agiledespachante.com.br" }
            }
        } else {
            endpoint = "https://api.mercadopago.com/checkout/preferences"
            body = {
                items: [{
                    title: description || "Serviços Agile",
                    quantity: 1,
                    unit_price: Number(valorTotal),
                    currency_id: "BRL"
                }]
            }
        }

        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        })

        const data = await res.json()
        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
        })
    }
})
