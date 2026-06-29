<script lang="ts">
  import { onMount } from "svelte";
  import {
    KeyRound,
    Terminal,
    Shield,
    Globe,
    Lock,
    CheckCircle2,
    XCircle,
  } from "@lucide/svelte";
  import { cn } from "../../../helpers/classname";
  import { t as _t, getLocale, onLocaleChange } from "../../../i18n";
  import { statFile, execCommand } from "../../../api/ubus";
  import PasswordTab from "./PasswordTab.svelte";
  import SshKeysTab from "./SshKeysTab.svelte";
  import SshAccessTab from "./SshAccessTab.svelte";
  import HttpAccessTab from "./HttpAccessTab.svelte";
  import RepoKeysTab from "./RepoKeysTab.svelte";

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

  const tabIds = [
    "password",
    "sshkeys",
    "sshaccess",
    "httpaccess",
    "repokeys",
  ] as const;
  type TabId = (typeof tabIds)[number];
  let tab = $state<TabId>("password");
  let tabDir = $state("left");

  const tabs: { id: TabId; label: string; icon: any }[] = [
    { id: "password", label: "Router Password", icon: KeyRound },
    { id: "sshkeys", label: "SSH Keys", icon: Terminal },
    { id: "sshaccess", label: "SSH Access", icon: Shield },
    { id: "httpaccess", label: "HTTP(S) Access", icon: Globe },
    { id: "repokeys", label: "Repo Keys", icon: Lock },
  ];

  let saveFeedback = $state("");
  let feedbackType = $state<"success" | "error" | "">("");
  let feedbackTimer: ReturnType<typeof setTimeout>;
  const showFeedback = (msg: string, type: "success" | "error" = "success") => {
    saveFeedback = msg;
    feedbackType = type;
    clearTimeout(feedbackTimer);
    feedbackTimer = setTimeout(() => {
      saveFeedback = "";
      feedbackType = "";
    }, 3000);
  };

  const switchTab = (id: TabId) => {
    if (id === tab) return;
    tabDir = tabIds.indexOf(id) > tabIds.indexOf(tab) ? "left" : "right";
    tab = id;
  };

  let hasUhttpd = $state(false);
  let knownUsers = $state<string[]>(["root"]);

  onMount(() => {
    (async () => {
      const [uhttpdStat, passwd] = await Promise.all([
        statFile("/usr/sbin/uhttpd"),
        execCommand("/bin/cat", ["/etc/passwd"]),
      ]);
      hasUhttpd = Boolean(uhttpdStat);
      if (passwd?.stdout) {
        knownUsers = passwd.stdout
          .split("\n")
          .map((l) => l.split(":")[0])
          .filter(Boolean);
      }
    })();
  });
</script>

<div
  class={cn("p-6", "flex", "flex-col", "h-screen", "gap-4", "animate-fade-in")}
>
  <div
    class={cn("shrink-0", "flex", "items-start", "justify-between", "gap-4")}
  >
    <div class={cn("flex", "items-center", "gap-3")}>
      <div>
        <h1 class={cn("text-lg", "font-semibold", "text-white")}>
          {trans("Administration")}
        </h1>
        <p class={cn("text-sm", "mt-0.5", "text-muted")}>
          {trans("Password, SSH keys, access control")}
        </p>
      </div>
    </div>
    <div class={cn("flex", "items-center", "gap-3")}>
      {#if saveFeedback}
        <div
          class={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md font-medium animate-slide-up",
            feedbackType === "error"
              ? "text-danger bg-danger/10 border border-danger/20"
              : "text-accent bg-accent/10 border border-accent/20",
          )}
        >
          {#if feedbackType === "error"}<XCircle
              size={12}
            />{:else}<CheckCircle2 size={12} />{/if}
          {saveFeedback}
        </div>
      {/if}
    </div>
  </div>

  <div
    class={cn(
      "flex",
      "gap-1",
      "w-fit",
      "shrink-0",
      "p-0.5",
      "border rounded-lg bg-surface-2 border-border",
    )}
  >
    {#each tabs as t}
      <button
        class={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md font-medium",
          "transition-all duration-150 cursor-pointer select-none",
          tab === t.id
            ? "bg-accent text-surface shadow-sm"
            : "bg-transparent text-muted hover:text-white/80",
        )}
        onclick={() => switchTab(t.id)}
      >
        <t.icon size={13} />{t.label}
      </button>
    {/each}
  </div>

  <div class={cn("flex-1", "min-h-0", "overflow-y-auto")}>
    {#key tab}
      <div
        class={tabDir === "left" ? "animate-slide-left" : "animate-slide-right"}
      >
        {#if tab === "password"}
          <PasswordTab {hasUhttpd} {knownUsers} {trans} />
        {:else if tab === "sshkeys"}
          <SshKeysTab {trans} />
        {:else if tab === "sshaccess"}
          <SshAccessTab {trans} />
        {:else if tab === "httpaccess"}
          <HttpAccessTab {trans} />
        {:else if tab === "repokeys"}
          <RepoKeysTab {trans} />
        {/if}
      </div>
    {/key}
  </div>
</div>
