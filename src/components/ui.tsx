import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/* ---------- 面板 ---------- */
export function Panel({ className, children, pad = true }: { className?: string; children: ReactNode; pad?: boolean }) {
  return <div className={cn('panel scanlines', pad && 'p-4', className)}>{children}</div>;
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <span className="inline-block h-3 w-[3px] bg-[var(--cyan)]" style={{ boxShadow: '0 0 8px rgba(34,211,238,.7)' }} />
        <h3 className="label-caps !text-[11px] !tracking-[0.22em] text-[var(--ink-dim)]">{children}</h3>
      </div>
      {right}
    </div>
  );
}

/* ---------- 状态灯 ---------- */
export function Led({ color = 'var(--mint)', className }: { color?: string; className?: string }) {
  return (
    <span
      className={cn('led inline-block h-[7px] w-[7px] rounded-full', className)}
      style={{ background: color, color }}
    />
  );
}

/* ---------- 徽标 ---------- */
export function Pill({
  color = 'var(--cyan)',
  children,
  pulse,
}: {
  color?: string;
  children: ReactNode;
  pulse?: boolean;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-sm border px-2 py-[3px] font-mono2 text-[10px] tracking-wider"
      style={{ borderColor: `color-mix(in srgb, ${color} 45%, transparent)`, color, background: `color-mix(in srgb, ${color} 9%, transparent)` }}
    >
      {pulse && <Led color={color} />}
      {children}
    </span>
  );
}

/* ---------- 指标块 ---------- */
export function Stat({
  label,
  value,
  unit,
  sub,
  color = 'var(--ink)',
  size = 'md',
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  sub?: ReactNode;
  color?: string;
  size?: 'md' | 'lg';
}) {
  return (
    <div className="min-w-0">
      <div className="label-caps mb-1 truncate">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className={cn('num font-semibold', size === 'lg' ? 'text-[30px] leading-none' : 'text-[22px] leading-none')} style={{ color }}>
          {value}
        </span>
        {unit && <span className="num text-[11px] text-[var(--ink-faint)]">{unit}</span>}
      </div>
      {sub && <div className="mt-1 text-[11px] text-[var(--ink-dim)]">{sub}</div>}
    </div>
  );
}

/* ---------- 水位占比环形 ---------- */
export function LevelGauge({ percent, level }: { percent: number; level: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const off = c * (1 - percent / 100);
  return (
    <div className="relative mx-auto h-[132px] w-[132px]">
      <svg viewBox="0 0 132 132" className="h-full w-full -rotate-90">
        <circle cx="66" cy="66" r={r} fill="none" stroke="#1a2540" strokeWidth="7" />
        <circle
          cx="66" cy="66" r={r} fill="none" stroke="var(--cyan)" strokeWidth="7" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={off}
          style={{ transition: 'stroke-dashoffset .6s ease', filter: 'drop-shadow(0 0 6px rgba(34,211,238,.6))' }}
        />
        {/* 雷达扫描针 */}
        <g className="radar-sweep" style={{ transformOrigin: '66px 66px' }}>
          <line x1="66" y1="66" x2="66" y2="18" stroke="rgba(34,211,238,.35)" strokeWidth="1.5" />
        </g>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="label-caps">水位占比</span>
        <span className="num text-[26px] font-bold text-[var(--cyan)] text-glow-cyan">{Math.round(percent)}<span className="text-[13px]">%</span></span>
        <span className="num text-[11px] text-[var(--ink-dim)]">{level.toFixed(2)} m</span>
      </div>
    </div>
  );
}

/* ---------- 迷你走势 ---------- */
export function Sparkline({
  data,
  color = 'var(--cyan)',
  height = 36,
  width = 120,
}: {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
}) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - 3 - ((v - min) / span) * (height - 6)}`);
  return (
    <svg width={width} height={height} className="block">
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="1.5" opacity="0.9" />
      <polyline
        points={`0,${height} ${pts.join(' ')} ${width},${height}`}
        fill={color}
        opacity="0.08"
        stroke="none"
      />
    </svg>
  );
}

/* ---------- 告警跑马灯 ---------- */
export function Ticker({ items }: { items: { id: number; text: string; level: string; time: string }[] }) {
  const color = (l: string) => (l === '告警' ? 'var(--red)' : l === '预警' ? 'var(--amber)' : 'var(--cyan)');
  const doubled = [...items, ...items];
  return (
    <div className="relative overflow-hidden border-y border-[var(--line)] bg-[rgba(12,18,32,.6)]">
      <div className="ticker-track flex w-max items-center gap-8 py-1.5 pl-4">
        {doubled.map((a, i) => (
          <span key={`${a.id}-${i}`} className="flex items-center gap-2 whitespace-nowrap text-[11px]">
            <Led color={color(a.level)} />
            <span className="font-mono2 text-[10px]" style={{ color: color(a.level) }}>{a.level}</span>
            <span className="text-[var(--ink-dim)]">{a.text}</span>
            <span className="num text-[10px] text-[var(--ink-faint)]">{a.time}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------- 空状态 ---------- */
export function Empty({ hint }: { hint: string }) {
  return (
    <div className="flex h-28 items-center justify-center rounded border border-dashed border-[var(--line)] text-[12px] text-[var(--ink-faint)]">
      {hint}
    </div>
  );
}

/* ---------- 表格 ---------- */
export function Th({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <th className={cn('label-caps whitespace-nowrap border-b border-[var(--line)] px-3 py-2 text-left font-medium', className)}>
      {children}
    </th>
  );
}
export function Td({ children, className, mono = true }: { children: ReactNode; className?: string; mono?: boolean }) {
  return (
    <td className={cn('whitespace-nowrap border-b border-[#141d33] px-3 py-[7px] text-[12px] text-[var(--ink)]', mono && 'num', className)}>
      {children}
    </td>
  );
}
