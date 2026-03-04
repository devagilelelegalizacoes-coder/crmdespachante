/**
 * Dashboard Module
 * Aggregates data for the overview screen.
 */
const DashboardModule = (function () {

    async function init() {
        CRM.showLoader(true, "Calculando estatísticas...");
        try {
            const [quotes, tasks] = await Promise.all([
                Database.select('historico_orcamentos'),
                Database.select('tarefas')
            ]);

            updateStats(quotes, tasks);
            renderRecentActivity(quotes);
        } catch (e) {
            console.error("Erro no dashboard:", e);
        }
        CRM.showLoader(false);
    }

    function updateStats(quotes, tasks) {
        // Sales Total (this month)
        const now = new Date();
        const thisMonth = quotes.filter(q => {
            // Basic date parsing from "DD/MM/YYYY, HH:MM:SS" or similar
            const parts = q.data_envio.split('/')[1];
            return parseInt(parts) === (now.getMonth() + 1);
        });

        const totalValue = thisMonth.reduce((sum, q) => {
            const val = parseFloat(q.total.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
            return sum + val;
        }, 0);

        document.getElementById('stat-vendas-total').innerText = totalValue.toLocaleString('pt-br', { style: 'currency', currency: 'BRL' });
        document.getElementById('stat-tasks-count').innerText = tasks.length;
        document.getElementById('stat-quotes-count').innerText = quotes.length;
    }

    function renderRecentActivity(quotes) {
        const tbody = document.getElementById('dash-recent-table');
        if (!tbody) return;

        const recent = quotes.sort((a, b) => b.id > a.id ? 1 : -1).slice(0, 5);

        tbody.innerHTML = recent.map(q => `
            <tr>
                <td class="small text-muted">${q.data_envio.split(',')[0]}</td>
                <td class="fw-black">${q.cliente}</td>
                <td class="small">${q.placa}</td>
                <td class="fw-bold text-primary">${q.total}</td>
            </tr>
        `).join('');
    }

    return { init };
})();
