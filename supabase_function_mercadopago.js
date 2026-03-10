
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");

serve(async (req) => {
    // Configuração de CORS para permitir que seu frontend chame a função
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    };

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { action, orcamentoId, valorTotal, description, paymentMethodId } = await req.json();

        if (!MP_ACCESS_TOKEN) {
            throw new Error("MP_ACCESS_TOKEN não configurado no Supabase Secrets");
        }

        if (action === 'create_payment') {
            // GERAÇÃO DE PIX (OU PAGAMENTO DIRETO)
            const payload = {
                transaction_amount: valorTotal,
                description: description || "Pagamento Agile CRM",
                payment_method_id: paymentMethodId || "pix",
                payer: {
                    email: "cliente@agile.com",
                    first_name: "Cliente",
                    last_name: "Agile"
                }
            };

            const response = await fetch("https://api.mercadopago.com/v1/payments", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${MP_ACCESS_TOKEN}`,
                    "X-Idempotency-Key": `pay-${orcamentoId}-${Date.now()}`
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            return new Response(JSON.stringify(data), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: response.status
            });

        } else if (action === 'create_preference') {
            // GERAÇÃO DE CHECKOUT PRO (CARTÃO)
            const payload = {
                items: [
                    {
                        title: description || "Serviços Agile Legalizações",
                        quantity: 1,
                        currency_id: "BRL",
                        unit_price: valorTotal
                    }
                ],
                back_urls: {
                    success: req.headers.get("referer") || "",
                    failure: req.headers.get("referer") || "",
                    pending: req.headers.get("referer") || ""
                },
                auto_return: "approved"
            };

            const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${MP_ACCESS_TOKEN}`
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            return new Response(JSON.stringify(data), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: response.status
            });
        }

        return new Response(JSON.stringify({ error: "Ação inválida" }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
        });
    }
})
