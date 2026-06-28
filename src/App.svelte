<script lang="ts">
  import { onMount } from "svelte";
  import Login from "./lib/components/Login/index.svelte";
  import Sidebar from "./lib/components/Sidebar/index.svelte";
  import Dashboard from "./lib/views/Dashboard.svelte";
  import Services from "./lib/views/Services.svelte";
  import Routes from "./lib/views/Routes.svelte";
  import Firewall from "./lib/views/Firewall.svelte";
  import Logs from "./lib/views/Logs.svelte";
  import Processes from "./lib/views/Processes.svelte";
  import Realtime from "./lib/views/Realtime.svelte";
  import System from "./lib/views/System.svelte";
  import Admin from "./lib/views/Admin.svelte";
  import Software from "./lib/views/Software.svelte";
  import Startup from "./lib/views/Startup.svelte";
  import Crontab from "./lib/views/Crontab.svelte";
  import Flash from "./lib/views/Flash.svelte";
  import DDNS from "./lib/views/DDNS.svelte";
  import AdGuardHome from "./lib/views/AdGuardHome.svelte";
  import BanIP from "./lib/views/BanIP.svelte";
  import TTYD from "./lib/views/TTYD.svelte";
  import UPnP from "./lib/views/UPnP.svelte";
  import Network from "./lib/views/Network.svelte";
  import NetworkRoutes from "./lib/views/NetworkRoutes.svelte";
  import DHCP from "./lib/views/DHCP.svelte";
  import DNS from "./lib/views/DNS.svelte";
  import Diagnostics from "./lib/views/Diagnostics.svelte";
  import Placeholder from "./lib/views/Placeholder.svelte";
  import { cn } from "./lib/helpers/classname";
  import { parsePath, buildPath } from "./lib/router";
  import { t as _t, getLocale, onLocaleChange } from "./lib/i18n";

  let locale = $state(getLocale());
  let trans = $derived.by(() => { locale; return (k: string) => _t(k); });
  $effect(() => onLocaleChange(() => { locale = getLocale(); }));

  let authenticated = $state(Boolean(localStorage.getItem("owrt_session")));
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
  };

  onMount(() => {
    const { view, sub } = parsePath(window.location.pathname);
    currentView = view;
    currentSub = sub;

    const onPop = () => {
      const { view, sub } = parsePath(window.location.pathname);
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
        currentView === "syslog" || currentView === "ttyd" ? "overflow-hidden" : "overflow-y-auto",
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
      {:else if currentView === "system"}
        <System />
      {:else if currentView === "admin"}
        <Admin />
      {:else if currentView === "software"}
        <Software />
      {:else if currentView === "startup"}
        <Startup />
      {:else if currentView === "crontab"}
        <Crontab />
      {:else if currentView === "flash"}
        <Flash />
      {:else if currentView === "ddns"}
        <DDNS />
      {:else if currentView === "adguard"}
        <AdGuardHome />
      {:else if currentView === "banip"}
        <BanIP />
      {:else if currentView === "ttyd"}
        <TTYD />
      {:else if currentView === "upnp"}
        <UPnP />
      {:else if currentView === "network"}
        <Network />
      {:else if currentView === "network-routes"}
        <NetworkRoutes />
      {:else if currentView === "dhcp"}
        <DHCP />
      {:else if currentView === "dns"}
        <DNS />
      {:else if currentView === "diagnostics"}
        <Diagnostics />
      {:else if placeholders[currentView]}
        <Placeholder
          title={trans(placeholders[currentView].title)}
          sub={trans(placeholders[currentView].sub)}
        />
      {:else}
        <Placeholder title={trans("Not Found")} sub={trans("This page is not available")} />
      {/if}
    </main>
  </div>
{/if}
