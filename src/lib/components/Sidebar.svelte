<script lang="ts">
  import { logout } from '../api/ubus';

  let { active = 'dashboard', onnavigate, onlogout } = $props<{
    active?: string;
    onnavigate?: (id: string) => void;
    onlogout?: () => void;
  }>();

  const nav = [
    { id: 'dashboard', label: 'Dashboard', icon: '⬡' },
    { id: 'network', label: 'Network', icon: '⟁' },
    { id: 'clients', label: 'Clients', icon: '◈' },
    { id: 'dns', label: 'DNS / AdGuard', icon: '◎' },
    { id: 'firewall', label: 'Firewall', icon: '⬟' },
    { id: 'services', label: 'Services', icon: '⊞' },
    { id: 'system', label: 'System', icon: '◇' },
  ];

  const handleLogout = () => {
    logout();
    onlogout?.();
  };
  
</script>

<aside class="flex flex-col h-screen w-56 shrink-0" style="background: var(--surface-1); border-right: 1px solid var(--border)">
  <div class="p-5 border-b" style="border-color: var(--border)">
    <div class="flex items-center gap-3">
      <div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background: rgba(0,212,170,0.1); border: 1px solid rgba(0,212,170,0.2)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#00d4aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div>
        <p class="text-sm font-semibold text-white leading-none">RZID</p>
        <p class="text-xs mt-0.5" style="color: var(--text-muted)">OpenWrt 25.12</p>
      </div>
    </div>
  </div>

  <nav class="flex-1 p-3 space-y-1 overflow-y-auto">
    {#each nav as item}
      <button
        class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 text-left"
        style="
          background: {active === item.id ? 'rgba(0,212,170,0.1)' : 'transparent'};
          color: {active === item.id ? 'var(--accent)' : 'var(--text-muted)'};
          border: 1px solid {active === item.id ? 'rgba(0,212,170,0.2)' : 'transparent'};
        "
        onclick={() => onnavigate?.(item.id)}
        onmouseenter={e => { if (active !== item.id) (e.currentTarget as HTMLElement).style.color = 'var(--text)'; }}
        onmouseleave={e => { if (active !== item.id) (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
      >
        <span class="text-base w-4 text-center">{item.icon}</span>
        <span class="font-medium">{item.label}</span>
      </button>
    {/each}
  </nav>

  <div class="p-3 border-t" style="border-color: var(--border)">
    <button
      class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors duration-150"
      style="color: var(--text-muted)"
      onclick={handleLogout}
      onmouseenter={e => (e.currentTarget as HTMLElement).style.color = 'var(--danger)'}
      onmouseleave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'}
    >
      <span class="text-base w-4 text-center">⏻</span>
      <span class="font-medium">Sign out</span>
    </button>
  </div>
</aside>
