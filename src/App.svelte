<script lang="ts">
  import { onMount } from "svelte";
  import Login from "./lib/components/Login/Login.svelte";
  import Sidebar from "./lib/components/Sidebar/Sidebar.svelte";
  import Dashboard from "./lib/views/Overview/Dashboard.svelte";
  import Services from "./lib/views/Services/Services.svelte";
  import Routes from "./lib/views/Overview/Routes.svelte";
  import Firewall from "./lib/views/Overview/Firewall.svelte";
  import Logs from "./lib/views/Overview/Logs.svelte";
  import Processes from "./lib/views/Overview/Processes.svelte";
  import Realtime from "./lib/views/Overview/Realtime.svelte";
  import System from "./lib/views/System/System.svelte";
  import Admin from "./lib/views/System/Admin/index.svelte";
  import Software from "./lib/views/System/Software.svelte";
  import Startup from "./lib/views/System/Startup.svelte";
  import Crontab from "./lib/views/System/Crontab.svelte";
  import Flash from "./lib/views/System/Flash.svelte";
  import DDNS from "./lib/views/Services/DDNS/DDNS.svelte";
  import AdGuardHome from "./lib/views/Services/AdGuardHome.svelte";
  import BanIP from "./lib/views/Services/BanIP/BanIP.svelte";
  import TTYD from "./lib/views/Services/TTYD.svelte";
  import UPnP from "./lib/views/UPnP/index.svelte";
  import SQM from "./lib/views/Services/SQM/SQM.svelte";
  import Network from "./lib/views/Network/Interfaces.svelte";
  import NetworkRoutes from "./lib/views/Network/Routes.svelte";
  import DHCP from "./lib/views/Network/DHCP/DHCP.svelte";
  import DNS from "./lib/views/Network/DNS/index.svelte";
  import Diagnostics from "./lib/views/Network/Diagnostics/Diagnostics.svelte";
  import Placeholder from "./lib/views/Placeholder.svelte";
  import { cn } from "./lib/helpers/classname";
  import { parsePath, buildPath } from "./lib/router";
  import { t as _t, getLocale, onLocaleChange } from "./lib/i18n";
  import { call, restoreSession, logout } from "./lib/api/ubus";

  let locale = $state(getLocale());
  let trans = $derived.by(() => {
    locale;
    return (k: string) => _t(k);
  });
  $effect(() =>
    onLocaleChange(() => {
      locale = getLocale();
    }),
  );

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

  const handleAuth = () => {
    authenticated = true;
  };
  const handleLogout = () => {
    authenticated = false;
    navigate("dashboard");
  };

  const handleSubChange = (sub: string) => {
    navigate("realtime", sub);
  };

  const placeholders: Record<string, { title: string; sub: string }> = {};

  onMount(() => {
    (async () => {
      restoreSession();
      if (authenticated) {
        const res = await call("system", "info").catch(() => null);
        if (!res) {
          logout();
          authenticated = false;
        }
      }
    })();

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
        "flex-1",
        "min-h-0",
        "bg-surface",
        currentView === "syslog" || currentView === "ttyd"
          ? "overflow-hidden"
          : "overflow-y-auto",
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
      {:else if currentView === "sqm"}
        <SQM />
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
        <Placeholder
          title={trans("Not Found")}
          sub={trans("This page is not available")}
        />
      {/if}
    </main>
  </div>
{/if}
