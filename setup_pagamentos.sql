-- Script para configurar a tabela de pagamentos e políticas no Supabase

-- Criar a tabela se não existir
CREATE TABLE IF NOT EXISTS public.config_pagamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chave_pix TEXT,
    pix_nome TEXT,
    mp_public_key TEXT,
    mp_access_token TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Ativar Row Level Security
ALTER TABLE public.config_pagamentos ENABLE ROW LEVEL SECURITY;

-- 1. Política de Leitura (Qualquer um pode ler, para exibir na tela do cliente)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Permitir leitura anonima" ON public.config_pagamentos;
EXCEPTION WHEN undefined_object THEN
    NULL;
END $$;
CREATE POLICY "Permitir leitura anonima" 
ON public.config_pagamentos FOR SELECT 
USING (true);

-- 2. Política de Inserção/Edição (Apenas usuários autenticados do painel)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Permitir alteracoes autenticadas" ON public.config_pagamentos;
EXCEPTION WHEN undefined_object THEN
    NULL;
END $$;
CREATE POLICY "Permitir alteracoes autenticadas" 
ON public.config_pagamentos FOR ALL 
TO authenticated 
USING (true) WITH CHECK (true);

-- Garantir que haja apenas 1 linha configurada
INSERT INTO public.config_pagamentos (id)
SELECT '00000000-0000-0000-0000-000000000000'
WHERE NOT EXISTS (SELECT 1 FROM public.config_pagamentos);
