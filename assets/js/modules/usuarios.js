/**
 * Users Module
 * Management of system users.
 */
const UsersModule = (function () {

    async function init() {
        await loadUsers();
    }

    async function loadUsers() {
        const tbody = document.getElementById('users-list-body');
        if (!tbody) return;

        try {
            // Note: Directly listing auth.users is restricted on client-side.
            // We usually mirror users to a public.profiles/perfis table.
            // If the table doesn't exist yet, we'll catch and show an info message.
            const { data, error } = await Database.client.from('perfis').select('*');

            if (error) {
                if (error.code === 'PGRST204' || error.message.includes('not found')) {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="3" class="text-center py-5">
                                <div class="text-muted small">TABELA DE PERFIS NÃO CONFIGURADA NO SUPABASE.</div>
                                <div class="small fw-bold text-primary mt-2">Os usuários devem ser gerenciados pelo Supabase Dashboard Auth.</div>
                            </td>
                        </tr>
                     `;
                } else { throw error; }
                return;
            }

            if (!data || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-muted">Aguardando novo cadastro...</td></tr>';
                return;
            }

            tbody.innerHTML = data.map(u => `
                <tr class="align-middle">
                    <td>
                        <div class="fw-black text-dark" style="font-size: 13px;">${u.nome.toUpperCase()}</div>
                        <div class="small text-muted" style="font-size: 10px;">ROLE: ${u.role || 'user'}</div>
                    </td>
                    <td class="small fw-bold text-muted">${u.email}</td>
                    <td><span class="badge ${u.ativo ? 'bg-success' : 'bg-danger'}">ATIVO</span></td>
                </tr>
            `).join('');

        } catch (e) {
            console.warn("Erro ao carregar usuários:", e);
            tbody.innerHTML = '<tr><td colspan="3" class="text-center text-danger small">Erro ao listar usuários.</td></tr>';
        }
    }

    return { init };
})();
