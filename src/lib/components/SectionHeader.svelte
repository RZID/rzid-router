<script lang="ts">
  import { ChevronRight } from "@lucide/svelte";
  import { cn } from "../helpers/classname";

  let { title, open = true, ontoggle, badge }: {
    title: string;
    open?: boolean;
    ontoggle?: () => void;
    badge?: string;
  } = $props();
</script>

<button
  class={cn("w-full flex items-center gap-2 text-left p-5 hover:bg-white/5 transition-colors cursor-pointer rounded-xl")}
  onclick={() => ontoggle?.()}
>
  <span class={cn("text-xs font-medium tracking-wider uppercase")} style="color:var(--text-muted)">{title}</span>
  {#if badge}
    <span class={cn("text-xs font-mono px-2 py-0.5 rounded-full")} style="background:rgba(0,212,170,0.1);color:var(--accent)">{badge}</span>
  {/if}
  <span class="flex-1"></span>
  <span class="transition-transform" style="transform:rotate({open ? 90 : 0}deg)">
    <ChevronRight size={14} style="color:var(--text-muted)" />
  </span>
</button>
