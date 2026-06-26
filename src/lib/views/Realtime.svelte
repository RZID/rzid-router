<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import {
    Globe,
    Radio,
    Zap,
  } from "@lucide/svelte";
  import { cn } from "../helpers/classname";
  import {
    getSystemInfo,
    getBandwidth,
    getConntrackCount,
  } from "../api/ubus";

  let tab = $state<"bandwidth" | "load" | "connections">("bandwidth");
  let canvas = $state<HTMLCanvasElement>();
  let interval: ReturnType<typeof setInterval>;

  const maxPts = 120;
  const pollMs = 2000;

  let bwPoints = $state<{ t: number; rx: number; tx: number }[]>([]);
  let loadPoints = $state<{ t: number; l1: number; l5: number; l15: number }[]>([]);
  let ctPoints = $state<{ t: number; n: number }[]>([]);

  let prevRx = 0;
  let prevTx = 0;
  let prevT = 0;

  let bwInterfaces = $state<string[]>([]);
  let bwDevice = $state("");

  const fmtBits = (bps: number) => {
    if (bps >= 1e9) return `${(bps / 1e9).toFixed(1)} Gbps`;
    if (bps >= 1e6) return `${(bps / 1e6).toFixed(1)} Mbps`;
    if (bps >= 1e3) return `${(bps / 1e3).toFixed(1)} Kbps`;
    return `${bps} bps`;
  };

  const fmtBytes = (b: number) => {
    if (b >= 1e9) return `${(b / 1e9).toFixed(1)} GB`;
    if (b >= 1e6) return `${(b / 1e6).toFixed(1)} MB`;
    if (b >= 1e3) return `${(b / 1e3).toFixed(1)} KB`;
    return `${b} B`;
  };

  const fmtNum = (n: number) => {
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
    return String(n);
  };

  const fmtLoad = (n: number) => n.toFixed(2);

  const refreshBandwidth = async () => {
    const devs = await getBandwidth();
    if (!devs) return;

    const ifaces = Object.keys(devs).filter(
      (k) => k !== "lo" && !k.startsWith("ifb"),
    );
    if (ifaces.length === 0) return;

    if (bwInterfaces.length === 0) {
      bwInterfaces = ifaces;
      if (ifaces.includes("wan")) bwDevice = "wan";
      else bwDevice = ifaces[0];
    }

    const target = devs[bwDevice] || devs[ifaces[0]];
    if (!target) return;

    const now = Date.now();
    if (prevRx > 0) {
      const dt = (now - prevT) / 1000;
      if (dt > 0) {
        const rxRate = Math.max(0, (target.rx - prevRx) / dt);
        const txRate = Math.max(0, (target.tx - prevTx) / dt);
        bwPoints = [...bwPoints, { t: now, rx: rxRate, tx: txRate }].slice(
          -maxPts,
        );
      }
    }
    prevRx = target.rx;
    prevTx = target.tx;
    prevT = now;
  };

  const refreshLoad = async () => {
    const info = await getSystemInfo();
    if (!info?.load) return;
    const l = info.load;
    bwPoints = bwPoints;
    loadPoints = [
      ...loadPoints,
      { t: Date.now(), l1: l[0] / 65536, l5: l[1] / 65536, l15: l[2] / 65536 },
    ].slice(-maxPts);
  };

  const refreshConnections = async () => {
    const n = await getConntrackCount();
    if (n === null) return;
    ctPoints = [...ctPoints, { t: Date.now(), n }].slice(-maxPts);
  };

  const refresh = async () => {
    if (tab === "bandwidth") await refreshBandwidth();
    else if (tab === "load") await refreshLoad();
    else if (tab === "connections") await refreshConnections();
  };

  const draw = () => {
    const c = canvas;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = c.clientWidth;
    const h = c.clientHeight;
    c.width = w * dpr;
    c.height = h * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, w, h);

    const pad = { t: 20, r: 16, b: 28, l: 56 };
    const gw = w - pad.l - pad.r;
    const gh = h - pad.t - pad.b;

    if (gw <= 0 || gh <= 0) return;

    ctx.strokeStyle = "rgba(139,148,158,0.15)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (gh * i) / 4;
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(w - pad.r, y);
      ctx.stroke();
    }

    if (tab === "bandwidth") drawBw(ctx, w, h, pad, gw, gh);
    else if (tab === "load") drawLoad(ctx, w, h, pad, gw, gh);
    else if (tab === "connections") drawCt(ctx, w, h, pad, gw, gh);
  };

  const drawBw = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    pad: { t: number; r: number; b: number; l: number },
    gw: number,
    gh: number,
  ) => {
    const pts = bwPoints;
    if (pts.length < 2) {
      ctx.fillStyle = "var(--text-muted)";
      ctx.textAlign = "center";
      ctx.font = "12px monospace";
      ctx.fillText("Collecting data…", w / 2, h / 2);
      return;
    }

    const rates = pts.flatMap((p) => [p.rx, p.tx]);
    const maxVal = Math.max(...rates, 1);
    const scale = Math.pow(10, Math.floor(Math.log10(maxVal)));
    const yMax = Math.ceil(maxVal / scale) * scale || scale;

    const toY = (v: number) => pad.t + gh - (v / yMax) * gh;

    for (let i = 0; i <= 4; i++) {
      const val = (yMax * i) / 4;
      ctx.fillStyle = "var(--text-muted)";
      ctx.textAlign = "right";
      ctx.font = "10px monospace";
      ctx.fillText(fmtBits(val), pad.l - 8, pad.t + gh - (gh * i) / 4 + 3);
    }

    const drawLine = (data: number[], color: string) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < data.length; i++) {
        const x = pad.l + (i / (maxPts - 1)) * gw;
        const y = toY(data[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    const rxData = pts.map((p) => p.rx);
    const txData = pts.map((p) => p.tx);
    drawLine(rxData, "rgb(56,189,248)");
    drawLine(txData, "rgb(52,211,153)");

    ctx.fillStyle = "var(--text-muted)";
    ctx.textAlign = "left";
    ctx.font = "10px monospace";
    const last = pts[pts.length - 1];
    const avgRx = rxData.reduce((a, b) => a + b, 0) / rxData.length;
    const peakRx = Math.max(...rxData);
    const avgTx = txData.reduce((a, b) => a + b, 0) / txData.length;
    const peakTx = Math.max(...txData);

    const info = [
      { label: "RX", val: fmtBits(last.rx), color: "rgb(56,189,248)" },
      { label: "TX", val: fmtBits(last.tx), color: "rgb(52,211,153)" },
    ];

    ctx.font = "10px monospace";
    let lx = pad.l;
    for (const item of info) {
      ctx.fillStyle = item.color;
      ctx.fillRect(lx, 4, 8, 8);
      ctx.fillStyle = "var(--text-muted)";
      ctx.fillText(`${item.label} ${item.val}`, lx + 12, 12);
      lx += ctx.measureText(`${item.label} ${item.val}`).width + 24;
    }

    const statsY = h - 2;
    ctx.textAlign = "right";
    ctx.font = "9px monospace";
    ctx.fillStyle = "var(--text-muted)";
    ctx.fillText(
      `Avg RX ${fmtBits(avgRx)} / Peak ${fmtBits(peakRx)}  |  Avg TX ${fmtBits(avgTx)} / Peak ${fmtBits(peakTx)}`,
      w - pad.r,
      statsY,
    );
  };

  const drawLoad = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    pad: { t: number; r: number; b: number; l: number },
    gw: number,
    gh: number,
  ) => {
    const pts = loadPoints;
    if (pts.length < 2) {
      ctx.fillStyle = "var(--text-muted)";
      ctx.textAlign = "center";
      ctx.font = "12px monospace";
      ctx.fillText("Collecting data…", w / 2, h / 2);
      return;
    }

    const all = pts.flatMap((p) => [p.l1, p.l5, p.l15]);
    const maxVal = Math.max(...all, 0.1);
    const scale = Math.pow(10, Math.floor(Math.log10(maxVal)));
    const yMax = Math.ceil(maxVal / scale) * scale || scale;

    const toY = (v: number) => pad.t + gh - (v / yMax) * gh;

    for (let i = 0; i <= 4; i++) {
      const val = (yMax * i) / 4;
      ctx.fillStyle = "var(--text-muted)";
      ctx.textAlign = "right";
      ctx.font = "10px monospace";
      ctx.fillText(fmtLoad(val), pad.l - 8, pad.t + gh - (gh * i) / 4 + 3);
    }

    const lines: { data: number[]; color: string }[] = [
      {
        data: pts.map((p) => p.l1),
        color: "rgb(239,68,68)",
      },
      {
        data: pts.map((p) => p.l5),
        color: "rgb(251,146,60)",
      },
      {
        data: pts.map((p) => p.l15),
        color: "rgb(250,204,21)",
      },
    ];

    for (const line of lines) {
      ctx.strokeStyle = line.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < line.data.length; i++) {
        const x = pad.l + (i / (maxPts - 1)) * gw;
        const y = toY(line.data[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    const last = pts[pts.length - 1];
    const legend = [
      { label: "1m", val: fmtLoad(last.l1), color: "rgb(239,68,68)" },
      { label: "5m", val: fmtLoad(last.l5), color: "rgb(251,146,60)" },
      { label: "15m", val: fmtLoad(last.l15), color: "rgb(250,204,21)" },
    ];

    ctx.font = "10px monospace";
    let lx = pad.l;
    for (const item of legend) {
      ctx.fillStyle = item.color;
      ctx.fillRect(lx, 4, 8, 8);
      ctx.fillStyle = "var(--text-muted)";
      ctx.fillText(`${item.label} ${item.val}`, lx + 12, 12);
      lx += ctx.measureText(`${item.label} ${item.val}`).width + 24;
    }

    ctx.textAlign = "right";
    ctx.font = "9px monospace";
    ctx.fillStyle = "var(--text-muted)";
    const allData = pts.flatMap((p) => [p.l1, p.l5, p.l15]);
    ctx.fillText(
      `Avg ${fmtLoad(allData.reduce((a, b) => a + b, 0) / allData.length)} / Peak ${fmtLoad(Math.max(...allData))}`,
      w - pad.r,
      h - 2,
    );
  };

  const drawCt = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    pad: { t: number; r: number; b: number; l: number },
    gw: number,
    gh: number,
  ) => {
    const pts = ctPoints;
    if (pts.length < 2) {
      ctx.fillStyle = "var(--text-muted)";
      ctx.textAlign = "center";
      ctx.font = "12px monospace";
      ctx.fillText("Collecting data…", w / 2, h / 2);
      return;
    }

    const vals = pts.map((p) => p.n);
    const maxVal = Math.max(...vals, 1);
    const scale = Math.pow(10, Math.floor(Math.log10(maxVal)));
    const yMax = Math.ceil(maxVal / scale) * scale || scale;

    const toY = (v: number) => pad.t + gh - (v / yMax) * gh;

    for (let i = 0; i <= 4; i++) {
      const val = (yMax * i) / 4;
      ctx.fillStyle = "var(--text-muted)";
      ctx.textAlign = "right";
      ctx.font = "10px monospace";
      ctx.fillText(fmtNum(val), pad.l - 8, pad.t + gh - (gh * i) / 4 + 3);
    }

    ctx.strokeStyle = "rgb(56,189,248)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < vals.length; i++) {
      const x = pad.l + (i / (maxPts - 1)) * gw;
      const y = toY(vals[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.fillStyle = "rgb(56,189,248)";
    ctx.globalAlpha = 0.1;
    ctx.beginPath();
    ctx.moveTo(pad.l, toY(0));
    for (let i = 0; i < vals.length; i++) {
      const x = pad.l + (i / (maxPts - 1)) * gw;
      const y = toY(vals[i]);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(pad.l + gw, toY(0));
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    const last = pts[pts.length - 1];
    ctx.fillStyle = "rgb(56,189,248)";
    ctx.fillRect(pad.l, 4, 8, 8);
    ctx.fillStyle = "var(--text-muted)";
    ctx.font = "10px monospace";
    ctx.fillText(
      `Connections ${fmtNum(last.n)}`,
      pad.l + 12,
      12,
    );

    ctx.textAlign = "right";
    ctx.font = "9px monospace";
    ctx.fillStyle = "var(--text-muted)";
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    ctx.fillText(
      `Avg ${fmtNum(avg)} / Peak ${fmtNum(Math.max(...vals))}`,
      w - pad.r,
      h - 2,
    );
  };

  const switchTab = async (t: typeof tab) => {
    tab = t;
    bwPoints = bwPoints;
    loadPoints = loadPoints;
    ctPoints = ctPoints;
    await refresh();
  };

  onMount(async () => {
    await refresh();
    interval = setInterval(refresh, pollMs);
  });

  onDestroy(() => clearInterval(interval));

  let raf = $state(0);
  $effect(() => {
    if (tab) {
      const loop = () => {
        draw();
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(raf);
    }
  });
</script>

<div class={cn("p-6", "space-y-4", "animate-fade-in")}>
  <div>
    <h1 class={cn("text-lg", "font-semibold", "text-white")}>
      Realtime Graphs
    </h1>
    <p class={cn("text-sm", "mt-0.5", "text-muted")}>
      Load, bandwidth, connections
    </p>
  </div>

  <div
    class={cn(
      "flex",
      "gap-1",
      "p-0.5",
      "w-fit",
      "border",
      "rounded-lg",
      "bg-surface-2",
      "border-border",
    )}
  >
    {#each [
      { id: "bandwidth" as const, label: "Bandwidth", icon: Globe },
      { id: "load" as const, label: "Load", icon: Zap },
      { id: "connections" as const, label: "Connections", icon: Radio },
    ] as t}
      {@const TabIcon = t.icon}
      <button
        class={cn(
          "px-3",
          "py-1.5",
          "text-xs",
          "rounded-md",
          "font-medium",
          "transition-all",
          "flex",
          "items-center",
          "gap-1.5",
          "cursor-pointer",
        )}
        style="background:{tab === t.id
          ? 'var(--accent)'
          : 'transparent'};color:{tab === t.id
          ? '#0d1117'
          : 'var(--text-muted)'}"
        onclick={() => switchTab(t.id)}
      >
        <TabIcon size={14} />
        {t.label}
      </button>
    {/each}
  </div>

  {#if tab === "bandwidth"}
    <div class={cn("flex", "items-center", "gap-2")}>
      <label for="bw-iface" class={cn("text-xs", "text-muted")}>Interface:</label>
      <select
        id="bw-iface"
        class={cn(
          "px-2",
          "py-1",
          "border",
          "text-xs",
          "text-fg",
          "rounded-md",
          "outline-none",
          "bg-surface",
          "border-border",
        )}
        bind:value={bwDevice}
      >
        {#each bwInterfaces as iface}
          <option value={iface}>{iface}</option>
        {/each}
      </select>
    </div>
  {/if}

  <div class={cn("glass", "p-5")}>
    <div class={cn("flex", "items-center", "justify-between", "mb-3")}>
      <h3 class={cn("text-sm", "font-semibold", "text-white")}>
        {tab === "bandwidth"
          ? "Bandwidth"
          : tab === "load"
            ? "CPU Load"
            : "Active Connections"}
      </h3>
    </div>
    <canvas
      bind:this={canvas}
      class={cn("w-full", "h-64", "rounded-lg")}
    ></canvas>
  </div>
</div>
