<script lang="ts">
  import { logout } from '../api/ubus';

  let { active = 'dashboard', onnavigate, onlogout } = $props<{
    active?: string;
    onnavigate?: (id: string) => void;
    onlogout?: () => void;
  }>();

  const nav = [
    {
      label: 'Status', icon: '⬡',
      children: [
        { id: 'dashboard', label: 'Overview' },
        { id: 'routes', label: 'Routing' },
        { id: 'firewall-status', label: 'Firewall' },
        { id: 'syslog', label: 'System Log' },
        { id: 'processes', label: 'Processes' },
        { id: 'realtime', label: 'Realtime Graphs' },
      ]
    },
    {
      label: 'System', icon: '◇',
      children: [
        { id: 'system', label: 'System' },
        { id: 'admin', label: 'Administration' },
        { id: 'software', label: 'Software' },
        { id: 'startup', label: 'Startup' },
        { id: 'crontab', label: 'Scheduled Tasks' },
        { id: 'flash', label: 'Backup / Flash' },
      ]
    },
    {
      label: 'Network', icon: '⟁',
      children: [
        { id: 'network', label: 'Interfaces' },
        { id: 'network-routes', label: 'Routing' },
        { id: 'dhcp', label: 'DHCP' },
        { id: 'dns', label: 'DNS' },
        { id: 'diagnostics', label: 'Diagnostics' },
      ]
    },
    {
      label: 'Services', icon: '⊞',
      children: [
        { id: 'services', label: 'Services' },
        { id: 'ddns', label: 'Dynamic DNS' },
        { id: 'adguard', label: 'AdGuard Home' },
        { id: 'banip', label: 'banIP' },
        { id: 'upnp', label: 'UPnP' },
      ]
    },
  ];

  let expanded = $state<Record<string,boolean>>({ Status: true });
  const toggle = (cat: string) => expanded = {...expanded, [cat]: !expanded[cat]};

  const handleLogout = () => { logout(); onlogout?.(); };
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
    {#each nav as cat}
      <div>
        <button
          class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium tracking-wider uppercase transition-colors duration-150 text-left cursor-pointer hover:bg-white/5"
          style="color: var(--text-muted)"
          onclick={() => toggle(cat.label)}
          onmouseenter={e => (e.currentTarget as HTMLElement).style.color = 'var(--text)'}
          onmouseleave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'}
        >
          <span class="text-base">{cat.icon}</span>
          <span class="flex-1">{cat.label}</span>
          <span class="text-xs transition-transform" style="transform: rotate({expanded[cat.label]?90:0}deg)">▶</span>
        </button>
        {#if expanded[cat.label]}
          <div class="ml-4 mt-0.5 space-y-0.5">
            {#each cat.children as item}
              <button
                class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-150 text-left cursor-pointer hover:bg-white/5"
                style="
                  background: {active === item.id ? 'rgba(0,212,170,0.1)' : 'transparent'};
                  color: {active === item.id ? 'var(--accent)' : 'var(--text-muted)'};
                  border: 1px solid {active === item.id ? 'rgba(0,212,170,0.2)' : 'transparent'};
                "
                onclick={() => onnavigate?.(item.id)}
                onmouseenter={e => { if (active !== item.id) (e.currentTarget as HTMLElement).style.color = 'var(--text)'; }}
                onmouseleave={e => { if (active !== item.id) (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
              >
                <span class="font-medium text-xs">{item.label}</span>
              </button>
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  </nav>

  <div class="p-3 border-t" style="border-color: var(--border)">
    <button
      class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors duration-150 cursor-pointer hover:bg-white/5"
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
