<script lang="ts">
  import { cn } from "../helpers/classname";
  let { title, sub = "Coming soon" } = $props<{ title: string; sub?: string }>();
</script>

<div class={cn("p-6 animate-fade-in")}>
  <h1 class="text-lg font-semibold text-white">{title}</h1>
  <p class="text-sm mt-0.5 text-muted">{sub}</p>
  <div class="mt-6 p-12 flex glass items-center justify-center animate-slide-up">
    <p class="text-sm text-muted">Under construction</p>
  </div>
</div>
