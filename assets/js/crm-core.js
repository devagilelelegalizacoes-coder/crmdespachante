/**
 * UI & App Controller
 * Manages the main CRM layout and navigation.
 */
const CRM = (function () {

    const state = {
        currentTab: 'dashboard',
        isSidebarOpen: true
    };

    const elements = {
        content: null,
        loader: null,
        userEmail: null
    };


    const viewMapping = {
        'dashboard': { title: 'PAINEL ESTATÍSTICO', file: 'dashboard_view.html', module: 'DashboardModule' },
        'veiculos': { title: 'GESTÃO DE VEÍCULOS', file: 'veiculos_view.html', module: 'TaskModule' },
        'recursos_externos': { title: 'RECURSOS DE TRÂNSITO', file: 'recursos_externos_view.html', module: 'TaskModule' },
        'habilitacao': { title: 'HABILITAÇÃO', file: 'habilitacao_view.html', module: 'TaskModule' },
        'quotes': { title: 'ORÇAMENTOS E FATURAMENTO', file: 'quotes_view.html', module: 'QuotesModule' },
        'tasks': { title: 'GESTÃO TOTAL (KANBAN)', file: 'tasks_view.html', module: 'TaskModule' },
        'recursos': { title: 'CONSULTAS E LINKS', file: 'recursos_view.html', module: 'RecursosModule' },
        'usuarios': { title: 'GESTÃO DE ACESSOS', file: 'usuarios_view.html', module: 'UsersModule' },
        'config': { title: 'CONFIGURAÇÕES DO SISTEMA', file: 'config_view.html', module: 'ConfigModule' }
    };


    async function init() {
        elements.content = document.getElementById('crm-view-content');
        elements.loader = document.getElementById('global-loader');
        elements.userEmail = document.getElementById('user-email-header');

        // 1. Session check
        const { data: { session } } = await Database.client.auth.getSession();
        if (!session) {
            window.location.href = 'login.html';
            return;
        }

        if (elements.userEmail) elements.userEmail.innerText = session.user.email.toUpperCase();

        // Handle initial navigation
        const initialTab = new URLSearchParams(window.location.search).get('tab') || 'dashboard';
        switchTab(initialTab);

        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const tab = e.currentTarget.dataset.tab;
                if (tab) switchTab(tab);
            });
        });
    }

    async function logout() {
        if (!confirm("Deseja realmente sair?")) return;
        showLoader(true, "Finalizando sessão...");
        await Database.client.auth.signOut();
        window.location.href = 'login.html';
    }


    async function switchTab(tabId) {
        const openModals = document.querySelectorAll('.modal.show');
        openModals.forEach(m => {
            const inst = bootstrap.Modal.getInstance(m);
            if (inst) inst.hide();
        });

        document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';

        state.currentTab = tabId;
        showLoader(true);

        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.tab === tabId);
        });

        try {
            const mapping = viewMapping[tabId] || viewMapping['dashboard'];
            const response = await fetch(mapping.file);
            if (!response.ok) throw new Error("Falha ao carregar arquivo de visão.");

            const html = await response.text();
            elements.content.innerHTML = html;

            initializeTabScripts(tabId);

        } catch (err) {
            console.error("Error loading view:", err);
            elements.content.innerHTML = `<div class="alert alert-danger p-4"><i class="fas fa-exclamation-triangle me-2"></i> Erro ao carregar módulo ${tabId}: ${err.message}</div>`;
        } finally {
            showLoader(false);
        }
    }

    function showLoader(show, msg = "CARREGANDO...") {
        if (elements.loader) {
            elements.loader.style.display = show ? 'flex' : 'none';
            const h5 = elements.loader.querySelector('h5');
            if (h5) h5.innerText = msg.toUpperCase();
        }
    }

    function initializeTabScripts(tabId) {
        const mapping = viewMapping[tabId];
        if (mapping && mapping.module && window[mapping.module]) {
            console.log(`Initializing module ${mapping.module} for ${tabId}`);
            window[mapping.module].init();
        }
    }

    function notify(msg, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `crm-toast ${type} fade-in`;
        toast.innerText = msg;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    return {
        init,
        switchTab,
        notify,
        showLoader,
        logout
    };

})();

document.addEventListener('DOMContentLoaded', CRM.init);
