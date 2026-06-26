<script lang="ts">
  import { cn } from "../../helpers/classname";
  import { C } from "./constants";
  import type { Series } from "./types";

  let {
    series,
    formatValue,
    height = 256,
    maxPoints = 120,
    noData = false,
    noDataMsg = "Collecting data…",
  }: {
    series: Series[];
    formatValue: (v: number) => string;
    height?: number;
    maxPoints?: number;
    noData?: boolean;
    noDataMsg?: string;
  } = $props();

  let canvas: HTMLCanvasElement | undefined = $state();
  let raf = $state(0);

  const drawGrid = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    pad: { t: number; r: number; b: number; l: number },
  ) => {
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + ((h - pad.t - pad.b) * i) / 4;
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(w - pad.r, y);
      ctx.stroke();
    }
  };

  const drawYLabels = (
    ctx: CanvasRenderingContext2D,
    yMax: number,
    pad: { t: number; r: number; b: number; l: number },
    gh: number,
  ) => {
    ctx.fillStyle = C.muted;
    ctx.textAlign = "right";
    ctx.font = "10px monospace";
    for (let i = 0; i <= 4; i++) {
      const val = (yMax * i) / 4;
      const y = pad.t + gh - (gh * i) / 4;
      ctx.fillText(formatValue(val), pad.l - 6, y + 3);
    }
  };

  const drawLine = (
    ctx: CanvasRenderingContext2D,
    data: number[],
    color: string,
    pad: { t: number; r: number; b: number; l: number },
    gw: number,
    gh: number,
    yMax: number,
  ) => {
    if (data.length < 1 || yMax <= 0) return;
    const toY = (v: number) => pad.t + gh - (v / yMax) * gh;

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
      const x = pad.l + (i / (maxPoints - 1)) * gw;
      const y = toY(data[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  };

  const calcYMax = (series: Series[]) => {
    const all = series.flatMap((s) => s.data);
    if (all.length === 0) return 10;
    const maxVal = Math.max(...all, 1);
    const scale = Math.pow(10, Math.floor(Math.log10(maxVal)));
    return Math.ceil(maxVal / scale) * scale || scale;
  };

  let bw = 0,
    bh = 0;
  const draw = () => {
    const c = canvas;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = c.clientWidth;
    const h = c.clientHeight;
    if (w === 0 || h === 0) return;

    if (w !== bw || h !== bh) {
      c.width = w * dpr;
      c.height = h * dpr;
      bw = w;
      bh = h;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const pad = { t: 24, r: 12, b: 12, l: 52 };
    const gw = w - pad.l - pad.r;
    const gh = h - pad.t - pad.b;
    if (gw <= 0 || gh <= 0) return;

    if (noData || series.every((s) => s.data.length < 1)) {
      ctx.fillStyle = C.muted;
      ctx.textAlign = "center";
      ctx.font = "12px monospace";
      ctx.fillText(noDataMsg, w / 2, h / 2);
      return;
    }

    const yMax = calcYMax(series);
    drawGrid(ctx, w, h, pad);
    drawYLabels(ctx, yMax, pad, gh);

    for (const s of series) {
      drawLine(ctx, s.data, s.color, pad, gw, gh, yMax);
    }
  };

  $effect(() => {
    const loop = () => {
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  });

  const avg = (arr: number[]) =>
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  const peak = (arr: number[]) => (arr.length ? Math.max(...arr) : 0);

  const current = (arr: number[]) => (arr.length ? arr[arr.length - 1] : 0);
</script>

<div class={cn("glass", "p-5", "animate-slide-up")}>
  <div class={cn("w-full", "rounded-lg", "overflow-hidden")}>
    <canvas bind:this={canvas} class={cn("w-full")} style="height:{height}px"
    ></canvas>
  </div>

  <div
    class={cn("mt-3", "grid", "gap-2", "text-xs", "font-mono")}
    style="grid-template-columns: repeat({series.length}, 1fr)"
  >
    {#each series as s}
      <div class={cn("space-y-1")}>
        <div class={cn("flex", "items-center", "gap-1.5")}>
          <span
            class={cn("w-2", "h-2", "rounded-full", "inline-block")}
            style="background:{s.color}"
          ></span>
          <span class={cn("text-muted", "font-sans", "font-medium")}
            >{s.label}</span
          >
        </div>
        <div class={cn("flex", "gap-3", "text-fg")}>
          <div>
            <span class={cn("text-muted")}>Cur </span>
            <span class={cn("font-semibold")}
              >{formatValue(current(s.data))}</span
            >
          </div>
          <div>
            <span class={cn("text-muted")}>Avg </span>
            <span>{formatValue(avg(s.data))}</span>
          </div>
          <div>
            <span class={cn("text-muted")}>Peak </span>
            <span>{formatValue(peak(s.data))}</span>
          </div>
        </div>
      </div>
    {/each}
  </div>
</div>
