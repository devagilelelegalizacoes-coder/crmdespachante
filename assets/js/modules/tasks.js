/**
 * Tasks Module
 */
const TaskModule = (function () {

    let tasks = [];
    let services = []; // Store pre-configured services
    let currentTaskDocs = [];

    let currentTaskAndamentos = [];
    let currentTaskExigencias = [];

    async function init() {
        setupSortable();
        await Promise.all([
            loadTasks(),
            loadServices()
        ]);

        // Se estivermos em uma página de categoria, atualiza os contadores
        updateCategoryStats();

        // Listen for category changes to update service suggestions
        document.getElementById('f_categoria')?.addEventListener('change', (e) => {
            updateServiceSuggestions(e.target.value);
        });
    }

    async function loadServices() {
        try {
            services = await Database.select('config_precos');
        } catch (e) {
            console.warn("Erro ao carregar serviços para sugestão:", e);
        }
    }

    function updateServiceSuggestions(category) {
        const datalist = document.getElementById('list-servicos-sugestao');
        if (!datalist) return;

        const filtered = services.filter(s => s.categoria === category);
        datalist.innerHTML = filtered.map(s => `<option value="${s.servico}">`).join('');
    }


    function setupSortable() {
        ['analise', 'preparacao', 'concluido'].forEach(id => {
            const el = document.getElementById(`kanban-${id}`);
            if (!el) return;
            new Sortable(el, {
                group: 'kanban',
                animation: 150,
                ghostClass: 'ghost',
                onEnd: async evt => {
                    const taskId = evt.item.dataset.id;
                    const newStatus = evt.to.dataset.status;
                    CRM.showLoader(true);
                    try {
                        await Database.update('tarefas', taskId, { status: newStatus });
                        // Silently reload data
                        tasks = await Database.select('tarefas');
                        updateCounters();
                    } catch (e) { alert(e.message); }
                    CRM.showLoader(false);
                }
            });
        });
    }

    async function loadTasks() {
        try {
            const searchTxt = document.getElementById('search-task-text')?.value.toUpperCase() || '';
            const searchCat = document.getElementById('search-task-cat')?.value || '';

            let query = Database.client.from('tarefas').select('*');

            if (searchCat) query = query.eq('categoria', searchCat);

            const { data, error } = await query;
            if (error) throw error;

            tasks = data;

            // Filtro local para busca textual (mais flexível)
            if (searchTxt) {
                tasks = tasks.filter(t =>
                    t.cliente_nome?.includes(searchTxt) ||
                    t.placa_veiculo?.includes(searchTxt) ||
                    t.cpf_proprietario?.includes(searchTxt) ||
                    t.identificador_extra?.toUpperCase().includes(searchTxt)
                );
            }

            renderBoard();
        } catch (e) {
            console.error(e);
        }
    }

    function renderBoard() {
        const columns = {
            'EM ANALISE': document.getElementById('kanban-analise'),
            'EM PREPARACAO': document.getElementById('kanban-preparacao'),
            'CONCLUIDO': document.getElementById('kanban-concluido')
        };

        Object.values(columns).forEach(c => { if (c) c.innerHTML = ''; });

        tasks.forEach(t => {
            const status = t.status?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
            const col = columns[status];
            if (!col) return;

            const card = document.createElement('div');
            card.className = 'task-card-crm';
            card.dataset.id = t.id;
            card.onclick = () => openEdit(t.id);

            // Cores por categoria no card
            let catColor = '#64748b';
            if (t.categoria === 'VEICULOS') catColor = '#2563eb';
            if (t.categoria === 'RECURSO') catColor = '#f59e0b';
            if (t.categoria === 'HABILITACAO') catColor = '#10b981';

            card.style.borderLeftColor = catColor;

            card.innerHTML = `
                <div class="small fw-bold text-muted mb-1 d-flex justify-content-between">
                    <span>#${t.id.substring(0, 8)}</span>
                    <span class="badge" style="background: ${catColor}20; color: ${catColor}; font-size: 8px;">${t.categoria || 'GERAL'}</span>
                </div>
                <div class="fw-black text-dark mb-1" style="font-size: 13px;">${t.cliente_nome}</div>
                <div class="small text-muted mb-1 d-flex justify-content-between align-items-center">
                    <span><i class="fas fa-tag me-1"></i> ${t.placa_veiculo || t.identificador_extra || 'S/ IDENT'}</span>
                    ${t.exigencias?.length ? '<span class="text-danger animate-pulse"><i class="fas fa-exclamation-triangle"></i></span>' : ''}
                </div>
                <div class="d-flex justify-content-between align-items-center mt-2 pt-2 border-top">
                    <span class="text-truncate text-muted" style="font-size: 10px; max-width: 150px;">${t.tipo_servico}</span>
                    <div class="text-muted" style="font-size: 10px;"><i class="fas fa-paperclip me-1"></i>${t.docs?.length || 0}</div>
                </div>
            `;
            col.appendChild(card);
        });

        updateCounters();
    }

    function updateCounters() {
        ['analise', 'preparacao', 'concluido'].forEach(c => {
            const el = document.getElementById(`count-${c}`);
            if (el) {
                const count = tasks.filter(t => t.status?.toLowerCase().replace(/ /g, '').includes(c)).length;
                el.innerText = count;
            }
        });
    }

    async function updateCategoryStats() {
        try {
            const all = await Database.select('tarefas');
            const v = document.getElementById('count-veic-ativos');
            if (v) v.innerText = all.filter(t => t.categoria === 'VEICULOS' && t.status !== 'CONCLUIDO').length;

            const r = document.getElementById('count-rec-ativos');
            if (r) r.innerText = all.filter(t => t.categoria === 'RECURSO' && t.status !== 'CONCLUIDO').length;

            const h = document.getElementById('count-hab-ativos');
            if (h) h.innerText = all.filter(t => t.categoria === 'HABILITACAO' && t.status !== 'CONCLUIDO').length;
        } catch (e) { console.warn(e); }
    }

    // --- MODAL LOGIC ---
    function openModal(defaultCat = 'GERAL') {
        resetForm();
        setVal('f_categoria', defaultCat);
        updateServiceSuggestions(defaultCat); // Initial suggestions
        const modalEl = document.getElementById('taskModal');
        if (modalEl) {
            bootstrap.Modal.getOrCreateInstance(modalEl).show();
        }
    }


    async function openEdit(id) {
        try {
            const t = tasks.find(x => x.id === id);
            if (!t) return;

            resetForm();
            const titleEl = document.getElementById('taskModalLabel');
            if (titleEl) titleEl.innerText = "PROCESSO: " + (t.cliente_nome || '');

            setVal('task_id_hidden', t.id);
            setVal('f_categoria', t.categoria || 'GERAL');
            updateServiceSuggestions(t.categoria || 'GERAL'); // Update suggestions for this category
            setVal('f_nome', t.cliente_nome);

            setVal('f_placa', t.placa_veiculo);
            setVal('f_extra', t.identificador_extra || '');
            setVal('f_cpf', t.cpf_proprietario);
            setVal('f_servico', t.tipo_servico);
            setVal('f_tel', t.cliente_tel || '');
            setVal('f_link', t.links || '');
            setVal('f_obs', t.observacoes || '');

            const delBtn = document.getElementById('btnDelTask');
            if (delBtn) delBtn.style.display = 'block';

            currentTaskDocs = Array.isArray(t.docs) ? t.docs : [];
            currentTaskAndamentos = Array.isArray(t.andamentos) ? t.andamentos : [];
            currentTaskExigencias = Array.isArray(t.exigencias) ? t.exigencias : [];

            renderUtils();
            checkLinkedQuotes(t.placa_veiculo || t.cpf_proprietario);

            const modalEl = document.getElementById('taskModal');
            if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).show();
        } catch (err) { console.error(err); }
    }

    async function checkLinkedQuotes(val) {
        const listEl = document.getElementById('linked-quotes-list');
        if (!listEl || !val || val.length < 3) return;

        try {
            // Busca orçamentos salvos que contenham a placa ou CPF
            const { data, error } = await Database.client
                .from('historico_orcamentos')
                .select('*')
                .or(`placa.ilike.%${val}%,cpf_cnpj.ilike.%${val}%`)
                .order('created_at', { ascending: false })
                .limit(5);

            if (error) throw error;

            if (!data || data.length === 0) {
                listEl.innerHTML = '<div class="text-muted text-center py-4 small">Nenhum orçamento encontrado.</div>';
                return;
            }

            listEl.innerHTML = data.map(q => `
                <div class="d-flex justify-content-between align-items-center p-2 mb-1 bg-white border rounded shadow-sm">
                    <div>
                        <div class="fw-bold text-success" style="font-size: 11px;">#${q.id.substring(0, 6)} - R$ ${q.total?.toFixed(2)}</div>
                        <div class="text-muted" style="font-size: 9px;">${new Date(q.created_at).toLocaleDateString()}</div>
                    </div>
                </div>
            `).join('');

        } catch (e) { console.warn("Erro ao buscar orçamentos vinculados:", e); }
    }

    function setVal(id, val) {
        const el = document.getElementById(id);
        if (el) el.value = val || '';
    }

    function resetForm() {
        const form = document.getElementById('crm-task-form');
        if (form) form.reset();
        document.getElementById('task_id_hidden').value = '';
        document.getElementById('taskModalLabel').innerText = "NOVO PROCESSO";
        document.getElementById('btnDelTask').style.display = 'none';
        document.getElementById('linked-quotes-list').innerHTML = '<div class="text-muted text-center py-4 small">Informe a placa para buscar.</div>';
        currentTaskDocs = [];
        currentTaskAndamentos = [];
        currentTaskExigencias = [];
        renderUtils();
    }

    function renderUtils() {
        // Render Docs
        const docDiv = document.getElementById('modalDocList');
        if (docDiv) {
            docDiv.innerHTML = currentTaskDocs.map((d, i) => `
                <div class="d-flex justify-content-between align-items-center bg-white border p-2 mb-1 rounded shadow-sm">
                    <span class="small fw-bold text-truncate" style="max-width:180px"><i class="fas fa-file-alt me-2 text-primary"></i>${d.name || 'documento'}</span>
                    <div>
                    <button type="button" class="btn btn-sm text-primary p-0 me-2" onclick="window.open('${d.url}', '_blank')"><i class="fas fa-external-link-alt"></i></button>
                    <button type="button" class="btn btn-sm text-danger p-0" onclick="TaskModule.removeDoc(${i})"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `).join('');
        }

        // Render History
        const andDiv = document.getElementById('andamentosList');
        if (andDiv) {
            andDiv.innerHTML = [...currentTaskAndamentos].reverse().map((a, i) => `
                <div class="border-start border-primary border-3 ps-2 mb-2 bg-white p-1 rounded">
                    <div class="small fw-black text-primary d-flex justify-content-between" style="font-size: 10px;">
                        ${a.data || ''} 
                        <button type="button" class="btn btn-link text-muted p-0" onclick="TaskModule.removeHistoryItem(${currentTaskAndamentos.length - 1 - i})"><i class="fas fa-times"></i></button>
                    </div>
                    <div class="small fw-bold">${a.texto || ''}</div>
                </div>
            `).join('');
        }

        // Render Requirements
        const exDiv = document.getElementById('exigenciasList');
        if (exDiv) {
            exDiv.innerHTML = currentTaskExigencias.map((e, i) => `
                <div class="alert alert-danger p-2 mb-1 small fw-bold d-flex justify-content-between align-items-center shadow-sm">
                    <span>⚠️ ${e.texto || ''}</span>
                    <button type="button" class="btn-close" onclick="TaskModule.removeRequirement(${i})" style="font-size:8px"></button>
                </div>
            `).join('');
        }
    }

    async function uploadDocs(files) {
        CRM.showLoader(true, "Enviando documentos...");
        try {
            for (let f of files) {
                const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${f.name.split('.').pop()}`;
                const publicUrl = await Database.uploadFile('documentos-tarefas', `processos/${fileName}`, f);
                currentTaskDocs.push({ name: f.name, type: f.type, url: publicUrl });
            }
            renderUtils();
        } catch (e) { alert("Erro no upload: " + e.message); }
        CRM.showLoader(false);
    }

    function addHistoryItem() {
        const txt = document.getElementById('newAndamento').value;
        if (!txt) return;
        currentTaskAndamentos.push({ data: new Date().toLocaleString('pt-BR'), texto: txt });
        document.getElementById('newAndamento').value = '';
        renderUtils();
    }

    function addRequirement() {
        const txt = document.getElementById('newExigencia').value;
        if (!txt) return;
        currentTaskExigencias.push({ texto: txt });
        document.getElementById('newExigencia').value = '';
        renderUtils();
    }

    function removeDoc(i) { currentTaskDocs.splice(i, 1); renderUtils(); }
    function removeHistoryItem(i) { currentTaskAndamentos.splice(i, 1); renderUtils(); }
    function removeRequirement(i) { currentTaskExigencias.splice(i, 1); renderUtils(); }

    async function save() {
        const id = document.getElementById('task_id_hidden').value;
        CRM.showLoader(true, "Salvando processo...");
        try {
            const payload = {
                categoria: document.getElementById('f_categoria').value,
                cliente_nome: document.getElementById('f_nome').value.toUpperCase(),
                placa_veiculo: document.getElementById('f_placa').value.toUpperCase(),
                identificador_extra: document.getElementById('f_extra').value.toUpperCase(),
                cpf_proprietario: document.getElementById('f_cpf').value.toUpperCase(),
                tipo_servico: document.getElementById('f_servico').value.toUpperCase(),
                cliente_tel: document.getElementById('f_tel').value,
                links: document.getElementById('f_link').value,
                observacoes: document.getElementById('f_obs').value.toUpperCase(),

                docs: currentTaskDocs,
                andamentos: currentTaskAndamentos,
                exigencias: currentTaskExigencias
            };

            if (id) {
                await Database.update('tarefas', id, payload);
            } else {
                payload.status = 'EM ANALISE';
                await Database.insert('tarefas', payload);
            }

            const modalEl = document.getElementById('taskModal');
            if (modalEl) bootstrap.Modal.getInstance(modalEl).hide();

            await loadTasks();
            updateCategoryStats();
            CRM.notify("Processo salvo com sucesso!");
        } catch (e) { alert("Erro ao salvar: " + e.message); }
        CRM.showLoader(false);
    }

    async function deleteTask() {
        if (!confirm("Excluir permanentemente?")) return;
        const id = document.getElementById('task_id_hidden').value;
        CRM.showLoader(true);
        await Database.delete('tarefas', id);
        const modalEl = document.getElementById('taskModal');
        if (modalEl) bootstrap.Modal.getInstance(modalEl).hide();
        await loadTasks();
        updateCategoryStats();
        CRM.showLoader(false);
    }

    function printDossier() {
        const id = document.getElementById('task_id_hidden').value;
        const t = tasks.find(x => x.id === id);
        if (!t) return;

        let win = window.open('', '_blank');
        win.document.write(`
            <html><head><title>DOSSIÊ: ${t.cliente_nome}</title>
            <style>
                body { font-family: sans-serif; padding: 40px; text-transform: uppercase; color: #333; }
                .h { border-bottom: 4px solid #1e40af; padding-bottom: 10px; margin-bottom: 30px; display:flex; justify-content: space-between; }
                .section { margin-bottom: 30px; }
                .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
                .label { font-size: 10px; color: #666; font-weight: bold; }
                .val { font-size: 14px; font-weight: bold; margin-bottom: 10px; }
                .alert { border: 2px solid red; padding: 10px; color: red; margin-top: 10px; }
                img { max-width: 100%; border: 1px solid #ddd; margin-top: 10px; page-break-after: always; }
            </style>
            </head><body>
            <div class="h"><div><h1 style="margin:0">AGILE CRM</h1><span>DOSSIÊ: ${t.categoria}</span></div><div>ID: ${t.id.substring(0, 8)}</div></div>
            <div class="section">
                <div class="grid">
                    <div><div class="label">CLIENTE</div><div class="val">${t.cliente_nome}</div></div>
                    <div><div class="label">PLACA / ID</div><div class="val">${t.placa_veiculo || t.identificador_extra}</div></div>
                    <div><div class="label">CPF COBRANÇA</div><div class="val">${t.cpf_proprietario}</div></div>
                    <div><div class="label">SERVIÇO</div><div class="val">${t.tipo_servico}</div></div>
                </div>
            </div>
            <div class="section">
                <h3>OBSERVAÇÕES INTERNAS</h3>
                <div style="background: #f9fafb; padding: 15px; border-radius: 8px;">${t.observacoes || 'NÃO INFORMADO'}</div>
            </div>
            <div class="section">
                <h3>EXIGÊNCIAS / PENDÊNCIAS</h3>
                ${(t.exigencias && t.exigencias.length) ? t.exigencias.map(e => `<div class="alert">⚠️ ${e.texto}</div>`).join('') : 'NADA CONSTA'}
            </div>
            <div class="section">
                <h3>ANDAMENTOS</h3>
                ${(t.andamentos && t.andamentos.length) ? t.andamentos.map(a => `<div style="border-bottom:1px solid #eee; padding:5px 0"><b>${a.data || ''}</b>: ${a.texto || ''}</div>`).join('') : 'NENHUM REGISTRO'}
            </div>
            </body></html>
        `);
        win.document.close();
    }

    return {
        init, loadTasks, openModal, uploadDocs, addHistoryItem, addRequirement,
        removeDoc, removeHistoryItem, removeRequirement, save, deleteTask,
        printDossier, checkLinkedQuotes
    };
})();
