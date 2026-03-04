/**
 * Supabase Module
 * Encapsulates all database interactions.
 */
const Database = (function () {
    const SB_URL = 'https://bjkmaabneqnpemhudkzy.supabase.co';
    const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqa21hYWJuZXFucGVtaHVka3p5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5Njg3NDQsImV4cCI6MjA4NzU0NDc0NH0.xL1mCJ0sN6xVdRahM3jTOQzYvDio_oCJLnDWv7nnmAM';

    // Private client instance
    const _client = supabase.createClient(SB_URL, SB_KEY);

    return {
        get client() { return _client; },

        // Generic wrapper for table operations
        async select(table, query = '*') {
            const { data, error } = await _client.from(table).select(query);
            if (error) throw error;
            return data;
        },

        async insert(table, payload) {
            const { data, error } = await _client.from(table).insert(payload).select();
            if (error) throw error;
            return data;
        },

        async update(table, id, payload) {
            const { data, error } = await _client.from(table).update(payload).eq('id', id).select();
            if (error) throw error;
            return data;
        },

        async delete(table, id) {
            const { error } = await _client.from(table).delete().eq('id', id);
            if (error) throw error;
            return true;
        },

        // Storage helpers
        async uploadFile(bucket, path, file) {
            const { data, error } = await _client.storage.from(bucket).upload(path, file);
            if (error) throw error;

            const { data: { publicUrl } } = _client.storage.from(bucket).getPublicUrl(path);
            return publicUrl;
        },

        // New helper for getting services
        async getServicesByCategory(category) {
            const { data, error } = await _client.from('config_precos').select('*').eq('categoria', category);
            if (error) throw error;
            return data;
        }
    };
})();


// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Database;
}
