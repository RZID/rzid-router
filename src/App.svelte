<script lang="ts">
  import Login from "./lib/components/Login.svelte";
  import Sidebar from "./lib/components/Sidebar.svelte";
  import Dashboard from "./lib/views/Dashboard.svelte";
  import Services from "./lib/views/Services.svelte";
  import Placeholder from "./lib/views/Placeholder.svelte";
  import Routes from "./lib/views/Routes.svelte";

  let authenticated = $state(!!localStorage.getItem("owrt_session"));
  let currentView = $state("dashboard");

  const handleAuth = () => {
    authenticated = true;
  };

  const handleLogout = () => {
    authenticated = false;
    currentView = "dashboard";
  };

  const placeholders: Record<string, { title: string; sub: string }> = {
    network: { title: "Network", sub: "Interface configuration" },
    clients: { title: "Clients", sub: "DHCP leases & device management" },
    dns: { title: "DNS / AdGuard", sub: "DNS filtering & blocklists" },
    firewall: { title: "Firewall", sub: "Rules & port forwards" },
    system: { title: "System", sub: "Logs, updates & settings" },
  };
</script>

{#if !authenticated}
  <Login onauthenticated={handleAuth} />
{:else}
  <div class="flex h-screen overflow-hidden">
    <Sidebar
      active={currentView}
      onnavigate={(id) => (currentView = id)}
      onlogout={handleLogout}
    />
    <main class="flex-1 overflow-y-auto" style="background: var(--surface)">
      {#if currentView === "dashboard"}
        <Dashboard />
      {:else if currentView === "network"}
        <Routes />
      {:else if currentView === "services"}
        <Services />
      {:else if placeholders[currentView]}
        <Placeholder
          title={placeholders[currentView].title}
          sub={placeholders[currentView].sub}
        />
      {/if}
    </main>
  </div>
{/if}
