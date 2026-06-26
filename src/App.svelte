<script lang="ts">
  import { onMount } from "svelte";
  import Login from "./lib/components/Login.svelte";
  import Sidebar from "./lib/components/Sidebar.svelte";
  import Dashboard from "./lib/views/Dashboard.svelte";
  import Services from "./lib/views/Services.svelte";
  import Routes from "./lib/views/Routes.svelte";
  import Firewall from "./lib/views/Firewall.svelte";
  import Logs from "./lib/views/Logs.svelte";
  import Processes from "./lib/views/Processes.svelte";
  import Realtime from "./lib/views/Realtime.svelte";
  import Placeholder from "./lib/views/Placeholder.svelte";
  import { cn } from "./lib/helpers/classname";
  import { parsePath, buildPath } from "./lib/router";

  let authenticated = $state(!!localStorage.getItem("owrt_session"));
  let currentView = $state("dashboard");
  let currentSub = $state<string | undefined>(undefined);

  const navigate = (view: string, sub?: string) => {
    const path = buildPath(view, sub);
    history.pushState({ view, sub }, "", path);
    currentView = view;
    currentSub = sub;
  };

  const handleSidebarNav = (id: string) => {
    navigate(id, undefined);
  };

  const handleAuth = () => { authenticated = true; };
  const handleLogout = () => {
    authenticated = false;
    navigate("dashboard");
  };

  const handleSubChange = (sub: string) => {
    navigate("realtime", sub);
  };

  const placeholders: Record<string, { title: string; sub: string }> = {
    network: { title: "Interfaces", sub: "Network interface configuration" },
    "network-routes": { title: "Routing", sub: "Static routes & rules" },
    dhcp: { title: "DHCP", sub: "DHCP server & lease configuration" },
    dns: { title: "DNS", sub: "DNS resolver & forwarding" },
    diagnostics: { title: "Diagnostics", sub: "Ping, traceroute, nslookup" },
    ddns: { title: "Dynamic DNS", sub: "DDNS service configuration" },
    adguard: { title: "AdGuard Home", sub: "DNS filtering & blocklists" },
    banip: { title: "banIP", sub: "IP threat blocking" },
    upnp: { title: "UPnP", sub: "Port mapping & IGD" },
    system: { title: "System", sub: "System settings" },
    admin: { title: "Administration", sub: "Password, SSH, HTTP" },
    software: { title: "Software", sub: "Package management" },
    startup: { title: "Startup", sub: "Init scripts & services" },
    crontab: { title: "Scheduled Tasks", sub: "Cron jobs" },
    flash: {
      title: "Backup / Flash",
      sub: "Backup, restore, firmware upgrade",
    },
  };

  onMount(() => {
    const { view, sub, redirect } = parsePath(window.location.pathname);
    if (redirect) history.replaceState({ view, sub }, "", redirect);
    currentView = view;
    currentSub = sub;

    const onPop = () => {
      const { view, sub, redirect } = parsePath(window.location.pathname);
      if (redirect) history.replaceState({ view, sub }, "", redirect);
      currentView = view;
      currentSub = sub;
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  });
</script>

{#if !authenticated}
  <Login onauthenticated={handleAuth} />
{:else}
  <div class={cn("flex", "h-screen", "overflow-hidden")}>
    <Sidebar
      active={currentView}
      onlogout={handleLogout}
      onnavigate={handleSidebarNav}
    />
    <main
      class={cn(
        "flex-1", "min-h-0", "bg-surface",
        currentView === "syslog" ? "overflow-hidden" : "overflow-y-auto",
      )}
    >
      {#if currentView === "dashboard"}
        <Dashboard />
      {:else if currentView === "routes"}
        <Routes />
      {:else if currentView === "firewall-status"}
        <Firewall />
      {:else if currentView === "services"}
        <Services />
      {:else if currentView === "processes"}
        <Processes />
      {:else if currentView === "realtime"}
        <Realtime sub={currentSub} onsubchange={handleSubChange} />
      {:else if currentView === "syslog"}
        <Logs />
      {:else if placeholders[currentView]}
        <Placeholder
          title={placeholders[currentView].title}
          sub={placeholders[currentView].sub}
        />
      {:else}
        <Placeholder title="Not Found" sub="This page is not available" />
      {/if}
    </main>
  </div>
{/if}
