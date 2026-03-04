/**
 * Quotes Module
 * Logic for creating and managing quotes.
 */
const QuoteModule = (function () {

    const state = {
        items: [],
        services: []
    };


    async function init() {
        document.getElementById('q-date').innerText = new Date().toLocaleDateString('pt-br');
        // Add 4 initial lines
        for (let i = 0; i < 4; i++) addItemLine();

        await loadServices();
        loadHistory();

        // Listen for category changes
        document.getElementById('q-categoria')?.addEventListener('change', (e) => {
            updateServiceSuggestions(e.target.value);
        });
    }

    async function loadServices() {
        try {
            state.services = await Database.select('config_precos');
            updateServiceSuggestions(document.getElementById('q-categoria').value);
        } catch (e) {
            console.warn("Erro ao carregar serviços para orçamentos:", e);
        }
    }

    function updateServiceSuggestions(category) {
        const datalist = document.getElementById('list-quote-servicos');
        if (!datalist) return;

        const filtered = state.services.filter(s => s.categoria === category);
        datalist.innerHTML = filtered.map(s => `<option value="${s.servico}">`).join('');
    }

    function applyServicePrice(input) {
        const desc = input.value.toUpperCase();
        const category = document.getElementById('q-categoria').value;
        const service = state.services.find(s => s.categoria === category && s.servico.toUpperCase() === desc);

        if (service) {
            const row = input.closest('tr');
            const valInput = row.querySelector('.q-item-val');
            if (valInput) {
                valInput.value = service.valor;
                calculate();
            }
        }
    }


    function addItemLine() {
        const tbody = document.getElementById('q-items-body');
        const row = tbody.insertRow();
        const index = tbody.rows.length;

        row.innerHTML = `
            <td class="text-center text-muted small">${index}</td>
            <td><input type="text" class="form-control form-control-sm border-0 border-bottom bg-transparent q-item-desc" placeholder="Descreva o serviço..." list="list-quote-servicos" onchange="QuoteModule.applyServicePrice(this)"></td>
            <td><input type="number" class="form-control form-control-sm border-0 border-bottom bg-transparent q-item-qty text-center" value="1" oninput="QuoteModule.calculate()"></td>
            <td><input type="number" class="form-control form-control-sm border-0 border-bottom bg-transparent q-item-val text-end" value="0" step="0.01" oninput="QuoteModule.calculate()"></td>
            <td><button class="btn btn-link text-danger p-0" onclick="this.closest('tr').remove(); QuoteModule.calculate()"><i class="fas fa-trash-alt"></i></button></td>
        `;

    }

    function calculate() {
        let subtotal = 0;
        document.querySelectorAll('#q-items-body tr').forEach(row => {
            const qty = parseFloat(row.querySelector('.q-item-qty').value) || 0;
            const val = parseFloat(row.querySelector('.q-item-val').value) || 0;
            subtotal += (qty * val);
        });

        const discPercent = parseFloat(document.getElementById('q-desconto').value) || 0;
        const total = subtotal * (1 - (discPercent / 100));

        document.getElementById('q-subtotal').innerText = formatCurrency(subtotal);
        document.getElementById('q-total').innerText = formatCurrency(total);
    }

    async function saveAndSend() {
        CRM.showLoader(true);
        try {
            const container = document.getElementById('printable-quote-area');
            const canvas = await html2canvas(container, { scale: 2 });
            const imgBlob = await new Promise(res => canvas.toBlob(res, 'image/png'));

            // Get Items
            const items = Array.from(document.querySelectorAll('#q-items-body tr')).map(row => ({
                desc: row.querySelector('.q-item-desc').value.toUpperCase(),
                qty: parseFloat(row.querySelector('.q-item-qty').value) || 0,
                val: parseFloat(row.querySelector('.q-item-val').value) || 0
            })).filter(i => i.desc !== "");

            const payload = {
                atendimento: document.getElementById('q-atendente').value.toUpperCase(),
                cliente: document.getElementById('q-cliente').value.toUpperCase(),
                placa: document.getElementById('q-placa').value.toUpperCase(),
                categoria: document.getElementById('q-categoria').value,
                total: document.getElementById('q-total').innerText,
                itens: items,
                data_envio: new Date().toLocaleString('pt-br')
            };

            // 1. Upload Img
            const fileName = `orcamento_${Date.now()}.png`;
            const publicUrl = await Database.uploadFile('documentos-tarefas', `orcamentos/${fileName}`, imgBlob);
            payload.imagem_url = publicUrl;

            // 2. Save Data
            const [saved] = await Database.insert('historico_orcamentos', payload);

            // 3. Show Link
            if (saved) {
                const baseUrl = window.location.href.split('/').slice(0, -1).join('/');
                const shareLink = `${baseUrl}/VISUALIZAR.HTML?id=${saved.id}`;
                document.getElementById('public-share-link').innerText = shareLink;
                document.getElementById('quote-link-alert').classList.remove('d-none');

                // Copy img to clipboard
                const clipboardItem = new ClipboardItem({ "image/png": imgBlob });
                await navigator.clipboard.write([clipboardItem]);

                alert("🚀 ORÇAMENTO SALVO!\n✓ Dados gravados\n✓ Imagem copiada\n✓ Link gerado");
                loadHistory();
            }

        } catch (err) {
            console.error(err);
            alert("Erro ao salvar: " + err.message);
        } finally {
            CRM.showLoader(false);
        }
    }

    async function loadHistory() {
        try {
            const filterCat = document.getElementById('filter-quote-cat')?.value || '';
            let query = Database.client.from('historico_orcamentos').select('id, data_envio, placa, cliente, total, categoria');

            if (filterCat) {
                query = query.eq('categoria', filterCat);
            }

            const { data, error } = await query;
            if (error) throw error;

            const sorted = data.sort((a, b) => b.id > a.id ? 1 : -1).slice(0, 15);

            const tbody = document.getElementById('q-history-body');
            if (!tbody) return;

            tbody.innerHTML = sorted.map(h => {
                let badgeColor = '#64748b';
                if (h.categoria === 'VEICULOS') badgeColor = '#2563eb';
                if (h.categoria === 'RECURSO') badgeColor = '#f59e0b';
                if (h.categoria === 'HABILITACAO') badgeColor = '#10b981';

                return `
                <tr>
                    <td>${h.data_envio.split(',')[0]}</td>
                    <td><span class="badge" style="background: ${badgeColor}20; color: ${badgeColor}; font-size: 9px;">${h.categoria || 'GERAL'}</span></td>
                    <td class="fw-bold">${h.placa}</td>
                    <td>${h.cliente}</td>
                    <td class="fw-bold text-primary">${h.total}</td>
                    <td><button class="btn btn-sm btn-light" onclick="window.open('VISUALIZAR.HTML?id=${h.id}', '_blank')"><i class="fas fa-eye"></i></button></td>
                </tr>
            `}).join('');
        } catch (e) { console.warn(e); }
    }


    function formatCurrency(v) {
        return v.toLocaleString('pt-br', { style: 'currency', currency: 'BRL' });
    }

    function copyPublicLink() {
        const link = document.getElementById('public-share-link').innerText;
        navigator.clipboard.writeText(link);
        alert("Link copiado!");
    }

    return {
        init, calculate, addItemLine, saveAndSend, copyPublicLink, applyServicePrice
    };

})();
