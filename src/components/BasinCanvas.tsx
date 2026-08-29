import { useEffect, useRef } from 'react';
import { engine } from '../engine/sim';

/* 伪三维等距投影：拖拽改变方位角，滚轮缩放；粒子速度 ∝ 流量；降雨动画联动雨强 */

interface P3 { x: number; y: number; z: number }

// 大渡河干流（北→南）：黄金坪电站 → 姑咱镇 → 泸定电站（坝址）→ 下游硬梁包
const RIVER: P3[] = [
  { x: -0.18, y: -1.0, z: 0.16 },
  { x: -0.10, y: -0.62, z: 0.12 },
  { x: 0.02, y: -0.28, z: 0.08 },
  { x: 0.06, y: 0.0, z: 0.05 },   // 泸定坝址
  { x: 0.02, y: 0.32, z: 0.02 },
  { x: -0.08, y: 0.66, z: 0.0 },
  { x: -0.05, y: 1.0, z: -0.02 },
];
// 冷竹关河（西侧支流，于姑咱镇上游汇入大渡河）
const TRIB1: P3[] = [
  { x: -0.85, y: -0.55, z: 0.2 },
  { x: -0.55, y: -0.42, z: 0.14 },
  { x: -0.28, y: -0.5, z: 0.12 },
  { x: -0.1, y: -0.62, z: 0.12 },
];
// 瓦斯河（东侧支流，于泸定坝址上游汇入大渡河）
const TRIB2: P3[] = [
  { x: 0.8, y: -0.05, z: 0.18 },
  { x: 0.5, y: -0.02, z: 0.12 },
  { x: 0.25, y: -0.12, z: 0.08 },
  { x: 0.06, y: -0.12, z: 0.06 },
];
// 主要公路路网（沿河谷走向）
const ROADS: { name: string; pts: P3[] }[] = [
  {
    name: 'G318',
    pts: [
      { x: 0.72, y: -0.85, z: 0.1 }, { x: 0.45, y: -0.5, z: 0.07 }, { x: 0.22, y: -0.2, z: 0.05 },
      { x: 0.16, y: 0.1, z: 0.04 }, { x: 0.3, y: 0.45, z: 0.03 }, { x: 0.42, y: 0.9, z: 0.02 },
    ],
  },
  {
    name: 'G4218',
    pts: [
      { x: -0.75, y: -0.85, z: 0.12 }, { x: -0.5, y: -0.6, z: 0.09 }, { x: -0.3, y: -0.35, z: 0.06 },
      { x: -0.2, y: -0.05, z: 0.05 }, { x: -0.28, y: 0.3, z: 0.04 },
    ],
  },
  {
    name: 'S217',
    pts: [
      { x: -0.3, y: 0.5, z: 0.05 }, { x: -0.32, y: 0.75, z: 0.03 }, { x: -0.3, y: 1.0, z: 0.02 },
    ],
  },
];
// 山体（装饰多边形）
const HILLS: P3[][] = [
  [
    { x: -0.95, y: -0.2, z: 0 }, { x: -0.6, y: -0.35, z: 0 }, { x: -0.42, y: -0.1, z: 0 },
    { x: -0.55, y: 0.05, z: 0.34 }, { x: -0.8, y: 0.12, z: 0.1 },
  ],
  [
    { x: 0.45, y: -0.7, z: 0 }, { x: 0.9, y: -0.55, z: 0 }, { x: 0.95, y: -0.25, z: 0 },
    { x: 0.72, y: -0.18, z: 0.4 }, { x: 0.5, y: -0.4, z: 0.12 },
  ],
  [
    { x: 0.55, y: 0.45, z: 0 }, { x: 0.95, y: 0.5, z: 0 }, { x: 0.9, y: 0.85, z: 0 },
    { x: 0.7, y: 0.8, z: 0.3 }, { x: 0.5, y: 0.62, z: 0.08 },
  ],
  [
    { x: -0.9, y: 0.55, z: 0 }, { x: -0.55, y: 0.5, z: 0 }, { x: -0.42, y: 0.8, z: 0 },
    { x: -0.62, y: 0.9, z: 0.26 }, { x: -0.88, y: 0.85, z: 0.08 },
  ],
];

interface Particle { path: P3[]; t: number; speed: number; len: number }
interface RainDrop { x: number; y: number; z: number; v: number }

export default function BasinCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const view = useRef({ az: -0.55, scale: 1, dragging: false, lastX: 0 });

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    let raf = 0;
    let W = 0;
    let H = 0;

    const particles: Particle[] = [];
    const spawn = (path: P3[], n: number, speedBase: number) => {
      for (let i = 0; i < n; i++) {
        particles.push({ path, t: Math.random(), speed: speedBase * (0.7 + Math.random() * 0.6), len: pathLength(path) });
      }
    };
    spawn(RIVER, 90, 0.05);
    spawn(TRIB1, 26, 0.04);
    spawn(TRIB2, 26, 0.04);

    const rains: RainDrop[] = [];
    for (let i = 0; i < 160; i++) {
      rains.push({ x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: Math.random() * 0.6 + 0.2, v: 0.012 + Math.random() * 0.01 });
    }

    function pathLength(path: P3[]) {
      let L = 0;
      for (let i = 1; i < path.length; i++) {
        L += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y, path[i].z - path[i - 1].z);
      }
      return L;
    }
    function pointAt(path: P3[], t: number): P3 {
      const L = pathLength(path);
      let d = t * L;
      for (let i = 1; i < path.length; i++) {
        const seg = Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y, path[i].z - path[i - 1].z);
        if (d <= seg) {
          const k = seg === 0 ? 0 : d / seg;
          return {
            x: path[i - 1].x + (path[i].x - path[i - 1].x) * k,
            y: path[i - 1].y + (path[i].y - path[i - 1].y) * k,
            z: path[i - 1].z + (path[i].z - path[i - 1].z) * k,
          };
        }
        d -= seg;
      }
      return path[path.length - 1];
    }

    const project = (p: P3): [number, number] => {
      const { az, scale } = view.current;
      const cos = Math.cos(az);
      const sin = Math.sin(az);
      const rx = p.x * cos - p.y * sin;
      const ry = p.x * sin + p.y * cos;
      const tilt = 0.52;
      const s = Math.min(W, H) * 0.42 * scale;
      return [W / 2 + rx * s, H * 0.52 + (ry * tilt - p.z * 0.9) * s];
    };

    const resize = () => {
      const parent = canvas.parentElement!;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = parent.clientWidth;
      H = parent.clientHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);

    const onDown = (e: PointerEvent) => {
      view.current.dragging = true;
      view.current.lastX = e.clientX;
      canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!view.current.dragging) return;
      view.current.az += (e.clientX - view.current.lastX) * 0.006;
      view.current.lastX = e.clientX;
    };
    const onUp = () => (view.current.dragging = false);
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      view.current.scale = Math.min(1.8, Math.max(0.6, view.current.scale * (e.deltaY > 0 ? 0.93 : 1.07)));
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });

    const drawPath = (path: P3[], width: number, stroke: string) => {
      ctx.beginPath();
      path.forEach((p, i) => {
        const [x, y] = project(p);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.lineWidth = width;
      ctx.strokeStyle = stroke;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    };

    const label = (p: P3, title: string, lines: string[], accent: string) => {
      const [x, y] = project(p);
      ctx.font = '10px "JetBrains Mono", monospace';
      const w = Math.max(ctx.measureText(title).width, ...lines.map((l) => ctx.measureText(l).width)) + 18;
      const h = 16 + lines.length * 13;
      const bx = Math.min(Math.max(x - w / 2, 4), W - w - 4);
      const by = Math.min(Math.max(y - h - 14, 4), H - h - 4);
      ctx.fillStyle = 'rgba(12,18,32,.82)';
      ctx.strokeStyle = 'rgba(26,37,64,.9)';
      ctx.beginPath();
      ctx.roundRect(bx, by, w, h, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = accent;
      ctx.fillRect(bx, by, 2.5, h);
      ctx.fillStyle = '#7d8ca8';
      ctx.fillText(title, bx + 9, by + 12);
      lines.forEach((l, i) => {
        ctx.fillStyle = '#dbe7f4';
        ctx.fillText(l, bx + 9, by + 25 + i * 13);
      });
      // 引线
      ctx.strokeStyle = 'rgba(125,140,168,.4)';
      ctx.beginPath();
      ctx.moveTo(bx + w / 2, by + h);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    };

    const draw = () => {
      const s = engine.state;
      ctx.clearRect(0, 0, W, H);

      // 地面网格
      ctx.strokeStyle = 'rgba(26,37,64,.5)';
      ctx.lineWidth = 1;
      for (let i = -4; i <= 4; i++) {
        const [x1, y1] = project({ x: i / 4, y: -1, z: 0 });
        const [x2, y2] = project({ x: i / 4, y: 1, z: 0 });
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        const [x3, y3] = project({ x: -1, y: i / 4, z: 0 });
        const [x4, y4] = project({ x: 1, y: i / 4, z: 0 });
        ctx.beginPath(); ctx.moveTo(x3, y3); ctx.lineTo(x4, y4); ctx.stroke();
      }

      // 山体
      HILLS.forEach((hill, hi) => {
        ctx.beginPath();
        hill.forEach((p, i) => {
          const [x, y] = project(p);
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.fillStyle = hi % 2 ? 'rgba(17,26,43,.85)' : 'rgba(13,20,35,.9)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(34,55,90,.6)';
        ctx.stroke();
      });

      // 降雨（联动雨强）
      const rain = s.weatherHourly[0]?.rain ?? 0;
      if (rain > 0.2) {
        const alpha = Math.min(0.65, 0.15 + rain * 0.1);
        ctx.strokeStyle = `rgba(120,180,235,${alpha})`;
        ctx.lineWidth = 1;
        const count = Math.min(rains.length, Math.floor(30 + rain * 18));
        for (let i = 0; i < count; i++) {
          const r = rains[i];
          const [x, y] = project({ x: r.x * 0.9, y: r.y * 0.9, z: r.z });
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + 2, y + 7);
          ctx.stroke();
          r.z -= r.v * (0.6 + rain * 0.1);
          if (r.z < 0) {
            r.z = 0.6 + Math.random() * 0.25;
            r.x = Math.random() * 2 - 1;
            r.y = Math.random() * 1.6 - 1;
          }
        }
      }

      // 河道（先画深色底，再画亮水面）
      drawPath(RIVER, 15, 'rgba(8,20,38,.95)');
      drawPath(RIVER, 10, 'rgba(24,80,120,.55)');
      drawPath(TRIB1, 9, 'rgba(8,20,38,.95)');
      drawPath(TRIB1, 5, 'rgba(24,80,120,.5)');
      drawPath(TRIB2, 9, 'rgba(8,20,38,.95)');
      drawPath(TRIB2, 5, 'rgba(24,80,120,.5)');

      // 公路路网（虚线 + 路名标牌）
      ROADS.forEach((r) => {
        ctx.save();
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        r.pts.forEach((p, i) => {
          const [x, y] = project(p);
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = 'rgba(210,170,90,.55)';
        ctx.stroke();
        ctx.restore();
        const [rx, ry] = project(r.pts[Math.floor(r.pts.length / 2)]);
        ctx.font = '9px "JetBrains Mono", monospace';
        const rw = ctx.measureText(r.name).width + 8;
        ctx.fillStyle = 'rgba(30,24,12,.85)';
        ctx.strokeStyle = 'rgba(210,170,90,.6)';
        ctx.beginPath();
        ctx.roundRect(rx - rw / 2, ry - 16, rw, 12, 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#e8c877';
        ctx.fillText(r.name, rx - rw / 2 + 4, ry - 7);
      });

      // 水流粒子（速度 ∝ 流量）
      const flowK = (s.inflow + s.outflow) / 2200;
      particles.forEach((p) => {
        p.t += (p.speed * flowK) / p.len;
        if (p.t > 1) p.t -= 1;
        const pos = pointAt(p.path, p.t);
        const [x, y] = project(pos);
        ctx.fillStyle = p.path === RIVER ? 'rgba(110,220,245,.85)' : 'rgba(90,190,225,.7)';
        ctx.beginPath();
        ctx.arc(x, y, p.path === RIVER ? 1.6 : 1.2, 0, Math.PI * 2);
        ctx.fill();
      });

      // 大坝（坝址处横断墙）
      const damC = RIVER[3];
      const perp: P3 = { x: 0.16, y: 0.03, z: 0 };
      const [dx1, dy1] = project({ x: damC.x - perp.x, y: damC.y - perp.y, z: damC.z });
      const [dx2, dy2] = project({ x: damC.x + perp.x, y: damC.y + perp.y, z: damC.z });
      const [tx1, ty1] = project({ x: damC.x - perp.x, y: damC.y - perp.y, z: damC.z + 0.12 });
      const [tx2, ty2] = project({ x: damC.x + perp.x, y: damC.y + perp.y, z: damC.z + 0.12 });
      ctx.beginPath();
      ctx.moveTo(dx1, dy1); ctx.lineTo(dx2, dy2); ctx.lineTo(tx2, ty2); ctx.lineTo(tx1, ty1);
      ctx.closePath();
      ctx.fillStyle = 'rgba(40,60,95,.95)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(120,160,210,.5)';
      ctx.stroke();
      // 闸门开度光带
      s.gates.forEach((g, i) => {
        const k = (i - 1) * 0.33;
        const gx = dx1 + (dx2 - dx1) * (0.5 + k * 0.9);
        const gy = dy1 + (dy2 - dy1) * (0.5 + k * 0.9);
        if (g.opening > 0.02) {
          ctx.fillStyle = 'rgba(34,211,238,.85)';
          ctx.fillRect(gx - 3, gy - 2, 6, 2 + g.opening * 2.2);
        }
      });

      // 河名标注
      const riverName = (p: P3, name: string) => {
        const [x, y] = project(p);
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillStyle = 'rgba(110,220,245,.75)';
        ctx.fillText(name, x + 6, y - 6);
      };
      riverName({ x: -0.14, y: -0.85, z: 0.15 }, '大渡河干流');
      riverName({ x: -0.62, y: -0.47, z: 0.15 }, '冷竹关河');
      riverName({ x: 0.52, y: -0.03, z: 0.13 }, '瓦斯河');

      // 分段水文参数标签（流量 m³/s、流速 m/s）
      const hydroTag = (p: P3, q: number, v: number) => {
        const [x, y] = project(p);
        ctx.font = '9px "JetBrains Mono", monospace';
        const txt = `${Math.round(q)} m³/s · ${v.toFixed(1)} m/s`;
        const tw = ctx.measureText(txt).width + 10;
        ctx.fillStyle = 'rgba(5,12,24,.8)';
        ctx.strokeStyle = 'rgba(34,211,238,.35)';
        ctx.beginPath();
        ctx.roundRect(x - tw / 2, y - 26, tw, 13, 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#8fdcef';
        ctx.fillText(txt, x - tw / 2 + 5, y - 17);
      };
      const qUp = s.inflow * 0.72;   // 黄金坪—姑咱段
      const qMid = s.inflow * 0.94;  // 姑咱—泸定段（汇入冷竹关河）
      hydroTag({ x: -0.13, y: -0.72, z: 0.13 }, qUp, 2.6);
      hydroTag({ x: -0.01, y: -0.2, z: 0.08 }, qMid, 2.9);
      hydroTag({ x: -0.04, y: 0.55, z: 0.01 }, s.outflow, 3.2); // 坝下段
      hydroTag({ x: -0.45, y: -0.46, z: 0.13 }, s.inflow * 0.12, 1.8); // 冷竹关河
      hydroTag({ x: 0.4, y: -0.07, z: 0.1 }, s.inflow * 0.1, 1.6);     // 瓦斯河

      // 水利枢纽与场镇点位（1s 刷新：直接读引擎）
      label(RIVER[0], '黄金坪电站', [`下泄 ${Math.round(s.inflow * 0.76)} m³/s`], '#22d3ee');
      label({ x: -0.06, y: -0.5, z: 0.11 }, '姑咱镇', [`区间来水 ${Math.round(s.inflow * 0.18)} m³/s`], '#34d399');
      label({ x: -0.6, y: -0.45, z: 0.14 }, '冷竹关河汇口', [`雨强 ${rain.toFixed(1)} mm/h`], rain > 0.5 ? '#fbbf24' : '#34d399');
      label({ x: damC.x, y: damC.y, z: damC.z + 0.16 }, '泸定电站', [`库水位 ${s.level.toFixed(2)} m`, `出库 ${Math.round(s.outflow)} m³/s`], '#22d3ee');
      label(RIVER[RIVER.length - 1], '下游 · 硬梁包', [`尾水 ${s.tailLevel.toFixed(2)} m`], '#e879f9');

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('wheel', onWheel);
    };
  }, []);

  return <canvas ref={ref} className="block h-full w-full cursor-grab active:cursor-grabbing" />;
}
