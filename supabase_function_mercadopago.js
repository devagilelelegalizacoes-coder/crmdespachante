
// Código atualizado para Supabase Edge Functions (Deno.serve)
const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");

Deno.serve(async (req) => {
    // CORS Headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    };

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const body = await req.json();
        const { action, orcamentoId, valorTotal, description, paymentMethodId } = body;

        console.log(`[LOG] Iniciando ação: ${action} para Orçamento: ${orcamentoId}`);

        if (!MP_ACCESS_TOKEN) {
            console.error("[ERRO] MP_ACCESS_TOKEN não está configurado nos Secrets do Supabase.");
            return new Response(JSON.stringify({ error: "Configuração incompleta: MP_ACCESS_TOKEN ausente." }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500
            });
        }

        if (action === 'create_payment') {
            const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${MP_ACCESS_TOKEN}`,
                    "X-Idempotency-Key": `pay-${orcamentoId}-${Date.now()}`
                },
                body: JSON.stringify({
                    transaction_amount: Number(valorTotal),
                    description: description || "Pagamento Agile CRM",
                    payment_method_id: paymentMethodId || "pix",
                    payer: {
                        email: "cliente@agile.com",
                        first_name: "Cliente",
                        last_name: "Agile"
                    }
                })
            });

            const data = await mpResponse.json();
            console.log("[DEBUG] Resposta Mercado Pago (Pix):", JSON.stringify(data));

            return new Response(JSON.stringify(data), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: mpResponse.status
            });

        } else if (action === 'create_preference') {
            const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${MP_ACCESS_TOKEN}`
                },
                body: JSON.stringify({
                    items: [{
                        title: description || "Serviços Agile Legalizações",
                        quantity: 1,
                        currency_id: "BRL",
                        unit_price: Number(valorTotal)
                    }],
                    back_urls: {
                        success: req.headers.get("referer") || "",
                        failure: req.headers.get("referer") || "",
                        pending: req.headers.get("referer") || ""
                    },
                    auto_return: "approved"
                })
            });

            const data = await mpResponse.json();
            console.log("[DEBUG] Resposta Mercado Pago (Preferência):", JSON.stringify(data));

            return new Response(JSON.stringify(data), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: mpResponse.status
            });
        }

        return new Response(JSON.stringify({ error: "Ação inválida" }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
        });

    } catch (error) {
        console.error("[ERRO CRÍTICO]:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
        });
    }
})
