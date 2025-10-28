/**
 * Inicialização automática dos bots Discord
 * Este arquivo é importado no layout root para iniciar todos os bots quando o servidor inicia
 */

import { startAllDiscordBots } from './bot-manager';

let botsInitialized = false;

export async function initializeDiscordBots() {
    if (botsInitialized) {
        console.log('[Discord Init] Bots já foram inicializados, pulando...');
        return;
    }

    console.log('[Discord Init] 🚀 Inicializando bots Discord...');
    botsInitialized = true;

    try {
        await startAllDiscordBots();
        console.log('[Discord Init] ✅ Bots Discord inicializados');
    } catch (error) {
        console.error('[Discord Init] ❌ Erro ao inicializar bots:', error);
    }
}

// Auto-inicializa no servidor
if (typeof window === 'undefined') {
    // Aguarda um pouco para o banco conectar
    setTimeout(() => {
        initializeDiscordBots().catch(err => {
            console.error('[Discord Init] Erro fatal na inicialização:', err);
        });
    }, 2000);
}


