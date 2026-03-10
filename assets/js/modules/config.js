/**
 * Config Module
 */
const ConfigModule = (function () {

    async function init() {
        CRM.showLoader(true);
        try {
            const [prices, dudas, links, payments] = await Promise.all([
                Database.select('config_precos'),
                Database.select('config_dudas'),
                Database.select('config_links'),
                Database.select('config_pagamentos')
            ]);

            renderPrices(prices);
            renderDudas(dudas);
            renderLinks(links);
            renderPayments(payments[0] || {});
        } catch (e) { console.error(e); }
        CRM.showLoader(false);
    }

    function renderPrices(data) {
        const tbody = document.querySelector('#table-config-precos tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        data.forEach(p => addPriceLine(p));
    }

    function addPriceLine(p = { categoria: 'GERAL', servico: '', valor: 0, desconto_max: 0 }) {
        const tbody = document.querySelector('#table-config-precos tbody');
        if (!tbody) return;
        const row = tbody.insertRow();
        const vDesc = (p.valor * (1 - (p.desconto_max / 100))).toFixed(2);
        row.innerHTML = `
            <td>
                <select class="form-select form-select-sm config-v-cat">
                    <option value="GERAL" ${p.categoria === 'GERAL' ? 'selected' : ''}>GERAL</option>
                    <option value="VEICULOS" ${p.categoria === 'VEICULOS' ? 'selected' : ''}>VEÍCULOS</option>
                    <option value="RECURSO" ${p.categoria === 'RECURSO' ? 'selected' : ''}>RECURSO</option>
                    <option value="HABILITACAO" ${p.categoria === 'HABILITACAO' ? 'selected' : ''}>HABILITAÇÃO</option>
                </select>
            </td>
            <td><input type="text" class="form-control form-control-sm config-servico" value="${p.servico}" placeholder="Ex: Transferência"></td>
            <td><input type="number" class="form-control form-control-sm config-valor" value="${p.valor}" step="0.01"></td>
            <td><input type="number" class="form-control form-control-sm config-desc" value="${p.desconto_max}"></td>
            <td class="fw-bold text-success">R$ ${vDesc}</td>
            <td><button class="btn btn-link text-danger p-0" onclick="this.closest('tr').remove()"><i class="fas fa-trash"></i></button></td>
        `;
    }


    function renderDudas(data) {
        const tbody = document.querySelector('#table-config-dudas tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        data.forEach(d => addDudaLine(d));
    }

    function addDudaLine(d = { codigo: '', descricao: '', valor: 0 }) {
        const tbody = document.querySelector('#table-config-dudas tbody');
        if (!tbody) return;
        const row = tbody.insertRow();
        row.innerHTML = `
            <td><input type="text" class="form-control form-control-sm config-d-cod" value="${d.codigo}"></td>
            <td><input type="text" class="form-control form-control-sm config-d-desc" value="${d.descricao}"></td>
            <td><input type="number" class="form-control form-control-sm config-d-val" value="${d.valor}" step="0.01"></td>
            <td><button class="btn btn-link text-danger p-0" onclick="this.closest('tr').remove()"><i class="fas fa-trash"></i></button></td>
        `;
    }

    function renderLinks(data) {
        const tbody = document.querySelector('#table-config_links-table tbody') || document.querySelector('#table-config-links tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        data.forEach(l => addLinkLine(l));
    }

    function addLinkLine(l = { titulo: '', url: '', icone: 'fas fa-external-link-alt', categoria: 'GERAL' }) {
        const tbody = document.querySelector('#table-config_links-table tbody') || document.querySelector('#table-config-links tbody');
        if (!tbody) return;
        const row = tbody.insertRow();
        row.innerHTML = `
            <td><input type="text" class="form-control form-control-sm config-l-title" value="${l.titulo || ''}" placeholder="Ex: Detran RJ"></td>
            <td><input type="text" class="form-control form-control-sm config-l-url" value="${l.url || ''}" placeholder="https://..."></td>
            <td><input type="text" class="form-control form-control-sm config-l-icon" value="${l.icone || 'fas fa-link'}" placeholder="fas fa-link"></td>
            <td>
                <select class="form-select form-select-sm config-l-cat">
                    <option value="GERAL" ${l.categoria === 'GERAL' ? 'selected' : ''}>GERAL</option>
                    <option value="RECURSO" ${l.categoria === 'RECURSO' ? 'selected' : ''}>RECURSO</option>
                </select>
            </td>
            <td><button class="btn btn-link text-danger p-0" onclick="this.closest('tr').remove()"><i class="fas fa-trash"></i></button></td>
        `;
    }

    async function savePrices() {
        CRM.showLoader(true);
        const rows = document.querySelectorAll('#table-config-precos tbody tr');
        const payload = Array.from(rows).map(r => ({
            categoria: r.querySelector('.config-v-cat').value,
            servico: r.querySelector('.config-servico').value,
            valor: parseFloat(r.querySelector('.config-valor').value) || 0,
            desconto_max: parseFloat(r.querySelector('.config-desc').value) || 0
        })).filter(x => x.servico);

        try {
            await Database.client.from('config_precos').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            await Database.insert('config_precos', payload);
            CRM.notify("Tabela de Serviços atualizada!");
        } catch (e) { alert(e.message); }
        CRM.showLoader(false);
    }


    async function saveDudas() {
        CRM.showLoader(true);
        const rows = document.querySelectorAll('#table-config-dudas tbody tr');
        const payload = Array.from(rows).map(r => ({
            codigo: r.querySelector('.config-d-cod').value,
            descricao: r.querySelector('.config-d-desc').value,
            valor: parseFloat(r.querySelector('.config-d-val').value) || 0
        })).filter(x => x.codigo || x.descricao);

        try {
            await Database.client.from('config_dudas').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            await Database.insert('config_dudas', payload);
            CRM.notify("Valores de DUDAS atualizados!");
        } catch (e) { alert(e.message); }
        CRM.showLoader(false);
    }

    async function saveLinks() {
        CRM.showLoader(true);
        const rows = document.querySelectorAll('#table-config_links-table tbody tr') || document.querySelectorAll('#table-config-links tbody tr');
        const payload = Array.from(rows).map(r => ({
            titulo: r.querySelector('.config-l-title').value,
            url: r.querySelector('.config-l-url').value,
            icone: r.querySelector('.config-l-icon').value || 'fas fa-link',
            categoria: r.querySelector('.config-l-cat').value
        })).filter(x => x.titulo && x.url);

        try {
            await Database.client.from('config_links').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            await Database.insert('config_links', payload);
            CRM.notify("Links Rápidos atualizados!");
        } catch (e) { alert(e.message); }
        CRM.showLoader(false);
    }

    function renderPayments(p) {
        document.getElementById('config-pix-key').value = p.chave_pix || '';
        document.getElementById('config-pix-name').value = p.pix_nome || '';
        document.getElementById('config-mp-public').value = p.mp_public_key || '';
        document.getElementById('config-mp-fee').value = p.mp_fee || '0';
    }

    async function savePaymentConfig() {
        CRM.showLoader(true);
        const payload = {
            chave_pix: document.getElementById('config-pix-key').value,
            pix_nome: document.getElementById('config-pix-name').value,
            mp_public_key: document.getElementById('config-mp-public').value,
            mp_fee: parseFloat(document.getElementById('config-mp-fee').value) || 0
        };

        try {
            // Delete old config (assuming only one row)
            await Database.client.from('config_pagamentos').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            await Database.insert('config_pagamentos', payload);
            CRM.notify("Configurações de Pagamento salvas!");
        } catch (e) { alert(e.message); }
        CRM.showLoader(false);
    }

    return { init, addPriceLine, addDudaLine, addLinkLine, savePrices, saveDudas, saveLinks, savePaymentConfig };
})();
