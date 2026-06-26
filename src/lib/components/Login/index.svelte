<script lang="ts">
  import Input from "../Input/index.svelte";

  import { login } from "../../api/ubus";
  import { cn } from "../../helpers/classname";

  let { onauthenticated } = $props<{ onauthenticated?: () => void }>();
  let password = $state(""),
    error = $state(false),
    loading = $state(false);

  const handleLogin = async (e: Event) => {
    e.preventDefault();
    loading = true;
    error = false;
    const ok = await login(password);
    loading = false;
    if (ok) onauthenticated?.();
    else {
      error = true;
      password = "";
    }
  };
</script>

<div
  class={cn("min-h-screen", "flex", "items-center", "justify-center")}
  style="background:radial-gradient(ellipse at center,#0d1f1a 0%,#0d1117 60%)"
>
  <div class={cn("glass", "p-8", "w-full", "max-w-sm", "animate-slide-up")}>
    <div class={cn("text-center", "mb-8")}>
      <div
        class={cn(
          "w-12",
          "h-12",
          "mb-4",
          "border",
          "rounded-xl",
          "inline-flex",
          "items-center",
          "justify-center",
          "bg-accent/10",
          "border-accent/30",
        )}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
            stroke="#00d4aa"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>
      <h1 class={cn("text-xl", "font-semibold", "text-white")}>RZID Router</h1>
      <p class={cn("text-sm", "mt-1", "text-muted")}>OpenWrt Dashboard</p>
    </div>

    <form onsubmit={handleLogin} class={cn("space-y-4")}>
      <div>
        <label
          for="password"
          class={cn("block", "text-xs", "font-medium", "mb-2", "text-muted")}
        >
          PASSWORD
        </label>
        <Input
          type="password"
          bind:value={password}
          placeholder="root password"
          mono
          class={cn(
            "px-4",
            "py-3",
            "text-sm",
            "rounded-lg",
            "bg-surface-2",
            error
              ? "border-danger"
              : "border-border",
          )}
          disabled={loading}
        />
        {#if error}<p class={cn("text-xs", "mt-2", "text-danger")}>
            Invalid password
          </p>{/if}
      </div>

      <button
        type="submit"
        disabled={loading || !password}
        class={cn(
          "py-3",
          "w-full",
          "text-sm",
          "rounded-lg",
          "font-medium",
          "duration-200",
          "transition-all",
          loading || !password
            ? cn("bg-surface-3", "text-muted", "cursor-not-allowed")
            : cn("bg-accent", "text-surface", "cursor-pointer"),
        )}
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  </div>
</div>
