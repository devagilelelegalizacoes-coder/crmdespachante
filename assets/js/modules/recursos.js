/**
 * Recursos Module
 * Handles external links and action logging.
 */
const RecursosModule = (function () {

    async function init() {
        await Promise.all([
            loadLinks(),
            loadLogs()
        ]);
    }

    async function loadLinks() {
        const genContainer = document.getElementById('links-container-geral');
        const recContainer = document.getElementById('links-container-recurso');

        // Supports legacy container if user hasn't updated HTML yet
        const legacyContainer = document.getElementById('links-container');

        try {
            const links = await Database.select('config_links');

            if (legacyContainer) {
                renderList(legacyContainer, links);
                return;
            }

            if (genContainer) {
                const geral = links.filter(l => l.categoria !== 'RECURSO');
                renderList(genContainer, geral);
            }

            if (recContainer) {
                const recurso = links.filter(l => l.categoria === 'RECURSO');
                renderList(recContainer, recurso);
            }

        } catch (e) {
            console.error("Erro ao carregar links:", e);
        }
    }

    function renderList(el, list) {
        if (!el) return;
        if (list.length === 0) {
            el.innerHTML = '<div class="text-muted small p-2">Nenhum link nesta categoria.</div>';
            return;
        }
        el.innerHTML = list.map(l => `
            <button
                class="btn btn-outline-primary text-start p-3 d-flex justify-content-between align-items-center mb-2 w-100"
                onclick="RecursosModule.openLink('${l.titulo}', '${l.url}')">
                <span><i class="${l.icone || 'fas fa-link'} me-2"></i> ${l.titulo.toUpperCase()}</span>
                <i class="fas fa-external-link-alt small"></i>
            </button>
        `).join('');
    }

    async function openLink(acao, url) {
        let atendente = localStorage.getItem('crm_atendente_nome');

        if (!atendente) {
            atendente = prompt("Informe seu nome para o log de acesso:", "");
            if (!atendente) return;
            localStorage.setItem('crm_atendente_nome', atendente);
        }

        try {
            await Database.insert('logs_acoes', {
                acao: acao,
                atendente: atendente.toUpperCase(),
                data: new Date().toLocaleString('pt-br')
            });
            window.open(url, '_blank');
            await loadLogs();
        } catch (e) {
            console.error("Erro ao registrar log:", e);
            window.open(url, '_blank'); // Open anyway if DB fails
        }
    }

    async function loadLogs() {
        const tbody = document.getElementById('links-log-body');
        if (!tbody) return;

        try {
            const logs = await Database.select('logs_acoes');
            const sorted = logs.sort((a, b) => b.id > a.id ? 1 : -1).slice(0, 15);

            tbody.innerHTML = sorted.map(l => `
                <tr>
                    <td class="text-muted" style="font-size:11px">${l.data}</td>
                    <td class="fw-bold">${l.atendente}</td>
                    <td><span class="badge bg-light text-primary border">${l.acao}</span></td>
                </tr>
            `).join('');
        } catch (e) { console.warn(e); }
    }

    return { init, openLink };
})();
