<script lang="ts">
  import { Terminal, ExternalLink } from "@lucide/svelte";
  import { cn } from "../helpers/classname";
  import { t as _t, getLocale, onLocaleChange } from "../i18n";

  let locale = $state(getLocale());
  let trans = $derived.by(() => { locale; return (k: string) => _t(k); });
  $effect(() => onLocaleChange(() => { locale = getLocale(); }));

  const ttydUrl = "http://10.10.0.1:7681/";
  let iframeLoaded = $state(false);
  let iframeError = $state(false);

  const handleLoad = () => {
    iframeLoaded = true;
    iframeError = false;
  };

  const handleError = () => {
    iframeError = true;
    iframeLoaded = true;
  };
</script>

<div class={cn("p-6", "flex", "flex-col", "h-full", "min-h-0", "animate-fade-in", "gap-5")}>
  <div class={cn("shrink-0", "flex", "items-start", "justify-between", "gap-4")}>
    <div class={cn("flex", "items-center", "gap-3")}>
      <div class={cn("w-9", "h-9", "rounded-xl", "bg-accent/10", "flex", "items-center", "justify-center", "ring-1", "ring-accent/20", "shrink-0")}>
        <Terminal size={16} class={cn("text-accent")} />
      </div>
      <div>
        <h1 class={cn("text-lg", "font-semibold", "text-white")}>{trans("Terminal")}</h1>
        <p class={cn("text-sm", "mt-0.5", "text-muted")}>{trans("Web-based SSH terminal via ttyd")}</p>
      </div>
    </div>
    <a
      href={ttydUrl}
      target="_blank"
      rel="noreferrer noopener"
      class={cn("inline-flex", "items-center", "gap-1.5", "px-3", "py-1.5", "text-xs", "rounded-lg", "font-medium", "transition-all", "duration-150", "cursor-pointer", "select-none", "border", "text-accent", "bg-accent/10", "border-accent/20", "hover:bg-accent/20")}
    >
      <ExternalLink size={14} />
      {trans("Open in new tab")}
    </a>
  </div>

  <div class={cn("flex-1", "min-h-0", "relative", "rounded-xl", "overflow-hidden", "glass")}>
    {#if iframeError}
      <div class={cn("absolute", "inset-0", "flex", "flex-col", "items-center", "justify-center", "gap-3", "bg-surface")}>
        <Terminal size={40} class={cn("text-muted/30")} />
        <div class={cn("text-center")}>
          <p class={cn("text-sm", "font-medium", "text-white")}>{trans("Unable to connect")}</p>
          <p class={cn("text-xs", "text-muted", "mt-1")}>{trans("Make sure ttyd is running on port 7681")}</p>
        </div>
        <button
          onclick={() => { iframeError = false; iframeLoaded = false; }}
          class={cn("px-3", "py-1.5", "text-xs", "rounded-lg", "font-medium", "border", "text-accent", "bg-accent/10", "border-accent/20", "hover:bg-accent/20", "cursor-pointer", "transition-all")}
        >
          {trans("Retry")}
        </button>
      </div>
    {:else if !iframeLoaded}
      <div class={cn("absolute", "inset-0", "flex", "flex-col", "items-center", "justify-center", "gap-3", "bg-surface")}>
        <div class={cn("flex", "items-center", "gap-2")}>
          <span class={cn("w-2", "h-2", "rounded-full", "bg-accent", "animate-pulse")}></span>
          <span class={cn("w-2", "h-2", "rounded-full", "bg-accent", "animate-pulse", "[animation-delay:150ms]")}></span>
          <span class={cn("w-2", "h-2", "rounded-full", "bg-accent", "animate-pulse", "[animation-delay:300ms]")}></span>
        </div>
        <span class={cn("text-xs", "text-muted")}>{trans("Connecting to terminal...")}</span>
      </div>
    {/if}
    <iframe
      src={ttydUrl}
      class={cn("w-full", "h-full", "border-0", "block", iframeLoaded && !iframeError ? "opacity-100" : "opacity-0", "transition-opacity", "duration-300")}
      onload={handleLoad}
      onerror={handleError}
      title="ttyd terminal"
      allow="clipboard-read; clipboard-write"
    ></iframe>
  </div>
</div>
