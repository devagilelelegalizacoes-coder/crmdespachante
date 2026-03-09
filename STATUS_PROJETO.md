# 📊 Status do Projeto: Agile CRM

Este documento resume o estado atual do desenvolvimento, o que já está operacional e o que ainda precisa ser configurado ou desenvolvido para a versão final.

---

## ✅ O que foi IMPLEMENTADO

### 1. Núcleo e Layout (Core)
- **Dashboard Dinâmico**: Painel geral com estatísticas e links rápidos.
- **Sistema de Abas**: Navegação fluida entre Veículos, Recursos, Habilitação e Gestão.
- **Responsividade Total**: Interface adaptada para Celular, Tablet e Computador.
- **Segurança**: Sistema de login integrado ao Supabase Auth.

### 2. Gestão de Processos (Kanban)
- **Quadro Kanban**: Colunas para "Em Análise", "Preparação" e "Concluído".
- **Modais de Detalhes**: Cadastro completo de processos com anexos de documentos.
- **Histórico e Exigências**: Controle de andamentos e pendências por processo.

### 3. Sistema de Orçamentos (Quotes)
- **Editor de Orçamentos**: Criação de orçamentos com cálculo automático e descontos.
- **Visualizador Digital**: Link público (`VISUALIZAR.HTML`) para o cliente ver o orçamento.
- **Exportação**: Geração de imagem/PDF para envio via WhatsApp.
- **PIX Customizado**: Possibilidade de informar uma chave PIX específica por orçamento.

### 4. Configurações e Financeiro
- **Tabela de Preços**: Gerenciamento de serviços e valores base.
- **Configuração de Pagamento**: Campos para cadastrar Chave PIX oficial e credenciais do Mercado Pago.
- **Links Rápidos**: Atalhos customizáveis para sites externos (Detran, Senatran, etc).

---

## 🛠️ O que FALTA implementar/configurar

### 1. Banco de Dados (Supabase)
- **Tabela `config_pagamentos`**: Necessário rodar o script SQL fornecido anteriormente para habilitar o salvamento das chaves de pagamento.
- **Políticas de RLS**: Refinar as permissões de segurança para que cada usuário veja apenas o que lhe é permitido.

### 2. Integração Mercado Pago
- **Checkout Dinâmico**: O sistema está preparado (SDK integrado), mas falta a criação da "Preferência de Pagamento" via backend (n8n ou API) para gerar o QR Code PIX real.
- **Webhooks**: Configurar o Mercado Pago para avisar o sistema quando um pagamento for aprovado.

### 3. Automação (n8n)
- **Notificação WhatsApp**: Envio automático do link do orçamento quando for salvo.
- **Status Automático**: Mudar o processo para "Em Preparação" assim que o pagamento for identificado.

### 4. Relatórios Avançados
- **Fluxo de Caixa**: Gráficos de faturamento mensal e anual.
- **Performance de Atendentes**: Relatório de quantos orçamentos cada colaborador gerou.

---

## 📅 Próximos Passos Recomendados

1.  **Rodar o SQL no Supabase** para ativar as configurações de pagamento.
2.  **Cadastrar os Preços Base** no menu de configurações para agilizar os orçamentos.
3.  **Configurar o n8n** para servir como ponte entre o Mercado Pago e o Supabase.

---
> [!NOTE]
> Este arquivo serve como um guia para a equipe de desenvolvimento e gestão. Última atualização: Março de 2026.
