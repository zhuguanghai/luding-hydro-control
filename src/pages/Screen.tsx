import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  Area, AreaChart, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { engine, CONST, MODE_LABEL, fmtTime, fmtDate, fmtHM } from '../engine/sim';
import { getSession, logout, canOperate } from '../engine/auth';
import { useSimState } from '../hooks/useSim';
import BasinCanvas from '../components/BasinCanvas';
import { Led, LevelGauge, Panel, Pill, SectionTitle, Ticker } from '../components/ui';
import { Toaster, toast } from 'sonner';

const tipStyle = {
  contentStyle: { background: '#0c1220', border: '1px solid #1a2540', borderRadius: 4, fontSize: 12 },
  labelStyle: { color: '#7d8ca8', fontFamily: 'JetBrains Mono' },
  itemStyle: { fontFamily: 'JetBrains Mono' },
};

export default function Screen() {
  const nav = useNavigate();
  const s = useSimState();
  const user = getSession();
  const operable = canOperate(user);

  const levelPct = ((s.level - CONST.DEAD) / (CONST.WARN - CONST.DEAD)) * 100;
  const proj = useMemo(() => engine.projectLevels(), [s.gates[0].recommended, s.gates[1].recommended, s.gates[2].recommended, s.level]);
  const projDomain = useMemo(() => {
    const vs = proj.map((p) => p.level);
    return [Math.floor((Math.min(...vs) - 0.08) * 100) / 100, Math.ceil((Math.max(...vs) + 0.08) * 100) / 100] as [number, number];
  }, [proj]);
  const projTicks = useMemo(
    () => [0, 1, 2, 3, 4].map((i) => projDomain[0] + ((projDomain[1] - projDomain[0]) * i) / 4),
    [projDomain],
  );

  const needSpill = Math.max(0, Math.round(s.inflow - s.genFlow));
  const checks = [
    { ok: s.level < CONST.DANGER, label: '最高库水位不越危险水位' },
    { ok: s.level > CONST.DEAD, label: '最低库水位不低于死水位' },
    { ok: s.outflow >= CONST.MIN_RELEASE, label: '下游最小放水流量保障' },
    { ok: true, label: '单次闸位调整步长限制' },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <Toaster theme="dark" position="top-center" richColors />
      {/* ===== 顶栏 ===== */}
      <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[rgba(5,8,16,.85)] backdrop-blur-md">
        <div className="flex items-center gap-4 px-4 py-2.5">
          <div className="flex items-center gap-3">
            <img src="/logo-hd-mark.png" alt="中国华电" className="h-9 w-auto" style={{ filter: 'drop-shadow(0 0 6px rgba(34,211,238,.25))' }} />
            <div>
              <h1 className="text-[15px] font-bold tracking-wide">泸定水电站智慧化上下游水情控制系统</h1>
              <p className="text-[10.5px] text-[var(--ink-faint)]">
                中国华电 · 四川华电泸定水电有限公司 · 泄洪闸智能调控 · 多模态感知 · AI辅助决策
              </p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <Pill color="var(--mint)" pulse>演示仿真 · 内置数据引擎驱动</Pill>
            <div className="hidden text-right md:block">
              <div className="num text-[16px] font-semibold text-[var(--cyan)]">{fmtTime(s.now)}</div>
              <div className="num text-[10px] text-[var(--ink-faint)]">{fmtDate(s.now)}</div>
            </div>
            <div className="hidden items-center gap-3 border-l border-[var(--line)] pl-4 text-[11px] text-[var(--ink-dim)] lg:flex">
              <span>气温 <b className="num text-[var(--ink)]">{s.temp.toFixed(1)}℃</b></span>
              <span>湿度 <b className="num text-[var(--ink)]">{s.humidity}%</b></span>
              <span>风速 <b className="num text-[var(--ink)]">{s.wind.toFixed(1)}m/s</b></span>
            </div>
            <div className="flex items-center gap-2 border-l border-[var(--line)] pl-4">
              <button onClick={() => nav('/admin/gates')} className="rounded border border-[var(--line)] px-2.5 py-1.5 text-[12px] text-[var(--ink-dim)] transition-colors hover:border-[var(--cyan)] hover:text-[var(--cyan)]">
                管理后台
              </button>
              <button
                onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen())}
                className="rounded border border-[var(--line)] px-2.5 py-1.5 text-[12px] text-[var(--ink-dim)] transition-colors hover:border-[var(--cyan)] hover:text-[var(--cyan)]"
              >
                全屏
              </button>
              <button
                onClick={() => { logout(); nav('/login'); }}
                className="rounded border border-[var(--line)] px-2.5 py-1.5 text-[12px] text-[var(--ink-dim)] transition-colors hover:border-[var(--red)] hover:text-[var(--red)]"
              >
                退出
              </button>
            </div>
          </div>
        </div>
        <Ticker items={s.alarms.slice(0, 8)} />
      </header>

      {/* ===== 三栏主体 ===== */}
      <main className="mx-auto grid w-full max-w-[1760px] flex-1 grid-cols-1 gap-3 p-3 xl:grid-cols-[300px_1fr_380px]">
        {/* 左栏：实时水情总览 */}
        <div className="space-y-3">
          <Panel>
            <SectionTitle>实时水情总览</SectionTitle>
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="label-caps mb-1">坝前库水位</div>
                <div className="num text-[34px] font-bold leading-none text-[var(--cyan)] text-glow-cyan">
                  {s.level.toFixed(2)}<span className="ml-1 text-[13px] font-normal text-[var(--ink-faint)]">m</span>
                </div>
                <div className="num mt-2 space-y-0.5 text-[10.5px] text-[var(--ink-dim)]">
                  <p>正常 {CONST.NORMAL}m / 死水位 {CONST.DEAD}m</p>
                  <p>预警 {CONST.WARN}m / 危险 {CONST.DANGER}m</p>
                </div>
              </div>
              <LevelGauge percent={Math.max(0, Math.min(100, levelPct))} level={s.level} />
            </div>
          </Panel>

          <Panel>
            <div className="grid grid-cols-2 gap-x-3 gap-y-4">
              <FlowStat label="入库流量" v={s.inflow} color="var(--cyan)" />
              <FlowStat label="出库流量" v={s.outflow} color="var(--magenta)" />
              <FlowStat label="泄洪流量" v={s.spill} color="var(--amber)" />
              <FlowStat label="发电流量" v={s.genFlow} color="var(--mint)" />
              <div>
                <div className="label-caps mb-1">全厂出力</div>
                <div className="num text-[22px] font-semibold text-[var(--ink)]">{s.power}<span className="ml-1 text-[11px] text-[var(--ink-faint)]">MW</span></div>
              </div>
              <div>
                <div className="label-caps mb-1">下游尾水位</div>
                <div className="num text-[22px] font-semibold text-[var(--ink)]">{s.tailLevel.toFixed(2)}<span className="ml-1 text-[11px] text-[var(--ink-faint)]">m</span></div>
              </div>
            </div>
          </Panel>

          <Panel>
            <SectionTitle>机组运行</SectionTitle>
            <div className="space-y-2">
              {s.units.map((u) => (
                <div key={u.id} className="flex items-center gap-2.5 rounded border border-[#141d33] bg-[rgba(5,8,16,.4)] px-2.5 py-2">
                  <Led color={u.on ? 'var(--mint)' : 'var(--ink-faint)'} />
                  <span className="num whitespace-nowrap text-[12px] font-semibold">{u.id}号机组</span>
                  <span className="whitespace-nowrap text-[11px]" style={{ color: u.on ? 'var(--mint)' : 'var(--ink-faint)' }}>{u.on ? '发电' : '停机'}</span>
                  <span className="num ml-auto whitespace-nowrap text-[12px] text-[var(--ink)]">{u.power} MW</span>
                  <span className="num hidden whitespace-nowrap text-[10.5px] text-[var(--ink-faint)] 2xl:inline">{u.flow} m³/s · η {u.on ? (u.eta * 100).toFixed(1) : '0.0'}%</span>
                </div>
              ))}
            </div>
            <p className="mt-3 border-t border-[#141d33] pt-2 text-[10.5px] leading-relaxed text-[var(--ink-faint)]">
              数据接入：厂内水务系统 / 平板阀门控制系统 / 水情监控系统 · 装机 4×230MW · 正常蓄水位 1378m · 日调节水库
            </p>
          </Panel>
        </div>

        {/* 中栏：流域三维 + 24h曲线 */}
        <div className="flex min-w-0 flex-col gap-3">
          <Panel pad={false} className="relative min-h-[430px] flex-1 overflow-hidden">
            <div className="absolute left-4 top-3 z-10">
              <SectionTitle>流域三维联动</SectionTitle>
              <p className="-mt-1 text-[10.5px] text-[var(--ink-faint)]">
                大渡河干流（黄金坪→姑咱镇→泸定）· 冷竹关河 / 瓦斯河支流 · G318 / G4218 / S217 路网
              </p>
            </div>
            <div className="absolute bottom-3 left-4 z-10 text-[10px] text-[var(--ink-faint)]">
              拖拽旋转 / 滚轮缩放 · 水流粒子速度∝流量 · 降雨动画联动雨强 · 各站点数据标牌1秒刷新
            </div>
            <div className="absolute inset-0">
              <BasinCanvas />
            </div>
          </Panel>

          <Panel>
            <SectionTitle right={<span className="num text-[10px] text-[var(--ink-faint)]">5min/点 · 288点</span>}>
              水位·流量实时曲线（24h）
            </SectionTitle>
            <div className="h-[190px]">
              <ResponsiveContainer>
                <ComposedChart data={s.hist} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
                  <CartesianGrid stroke="#141d33" vertical={false} />
                  <XAxis dataKey="t" tickFormatter={(t) => fmtHM(t)} tick={{ fontSize: 10, fill: '#4d5b76', fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={{ stroke: '#1a2540' }} minTickGap={60} />
                  <YAxis yAxisId="l" domain={[1376, 1379]} tick={{ fontSize: 10, fill: '#4d5b76', fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="r" orientation="right" domain={[700, 1300]} tick={{ fontSize: 10, fill: '#4d5b76', fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
                  <Tooltip {...tipStyle} labelFormatter={(t) => fmtTime(Number(t))} />
                  <Area yAxisId="r" type="monotone" dataKey="inflow" name="入库流量" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.08} strokeWidth={1.4} dot={false} isAnimationActive={false} />
                  <Area yAxisId="r" type="monotone" dataKey="outflow" name="出库流量" stroke="#e879f9" fill="none" strokeWidth={1.2} dot={false} isAnimationActive={false} />
                  <Line yAxisId="l" type="monotone" dataKey="level" name="库水位" stroke="#34d399" strokeWidth={1.6} dot={false} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          {/* 底部：预测与推演 */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Panel>
              <SectionTitle right={<span className="text-[10px] text-[var(--ink-faint)]">含置信区间</span>}>未来24h来水预测</SectionTitle>
              <div className="h-[170px]">
                <ResponsiveContainer>
                  <AreaChart data={s.forecast24} margin={{ top: 4, right: 8, bottom: 0, left: -14 }}>
                    <CartesianGrid stroke="#141d33" vertical={false} />
                    <XAxis dataKey="t" tickFormatter={(t) => fmtHM(t)} tick={{ fontSize: 10, fill: '#4d5b76', fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={{ stroke: '#1a2540' }} minTickGap={50} />
                    <YAxis tick={{ fontSize: 10, fill: '#4d5b76', fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
                    <Tooltip {...tipStyle} labelFormatter={(t) => fmtHM(Number(t))} />
                    <Area type="monotone" dataKey={(d) => [d.lo, d.hi]} name="置信区间" stroke="none" fill="#22d3ee" fillOpacity={0.12} isAnimationActive={false} />
                    <Line type="monotone" dataKey="q" name="预测流量" stroke="#22d3ee" strokeWidth={1.6} dot={false} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Panel>
            <Panel>
              <SectionTitle right={<span className="text-[10px] text-[var(--ink-faint)]">执行AI建议后</span>}>闸位调整·24h水位推演</SectionTitle>
              <div className="h-[170px]">
                <ResponsiveContainer>
                  <AreaChart data={proj} margin={{ top: 4, right: 8, bottom: 0, left: -14 }}>
                    <CartesianGrid stroke="#141d33" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#4d5b76', fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={{ stroke: '#1a2540' }} minTickGap={40} />
                    <YAxis domain={projDomain} ticks={projTicks} tickFormatter={(v) => Number(v).toFixed(2)} tick={{ fontSize: 10, fill: '#4d5b76', fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
                    <Tooltip {...tipStyle} />
                    <Area type="monotone" dataKey="level" name="库水位" stroke="#34d399" fill="#34d399" fillOpacity={0.1} strokeWidth={1.6} dot={false} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>
        </div>

        {/* 右栏：闸门 + AI建议 + 告警 */}
        <div className="space-y-3">
          {s.gates.map((g) => (
            <Panel key={g.id}>
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="num flex h-6 w-6 items-center justify-center rounded-sm border border-[var(--line)] text-[13px] font-bold text-[var(--cyan)]">{g.id}</span>
                  <div>
                    <div className="text-[13px] font-semibold">{g.name}</div>
                    <div className="text-[10px] text-[var(--ink-faint)]">{g.side} · {g.type} · 孔口 {g.width}×{g.height}m · 底板 {g.sill}m</div>
                  </div>
                </div>
                <Pill color="var(--mint)" pulse>正常</Pill>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <GateStat label="当前开度" v={g.opening.toFixed(2)} unit="m" color="var(--cyan)" />
                <GateStat label="AI建议" v={g.recommended.toFixed(2)} unit="m" color="var(--mint)" />
                <GateStat label="过闸流量" v={String(g.flow)} unit="m³/s" color="var(--amber)" />
                <GateStat label="闸墩振动" v={String(g.vibration)} unit="μm" color={g.vibration > 40 ? 'var(--red)' : 'var(--ink)'} />
              </div>
            </Panel>
          ))}

          <Panel>
            <SectionTitle
              right={
                operable ? (
                  <button
                    onClick={() => { engine.applyRecommendation(); toast.success('已执行 AI 闸位建议'); }}
                    className="rounded bg-[rgba(34,211,238,.12)] px-2.5 py-1 text-[11px] font-medium text-[var(--cyan)] transition-colors hover:bg-[rgba(34,211,238,.22)]"
                  >
                    执行建议
                  </button>
                ) : undefined
              }
            >
              AI 闸位操作建议
            </SectionTitle>
            <div className="mb-2 flex items-center gap-2 text-[11px]">
              <Pill color="var(--cyan)">工况：{MODE_LABEL[s.mode]}</Pill>
              <span className="num text-[var(--ink-dim)]">目标泄流 {needSpill} m³/s</span>
            </div>
            <p className="text-[11.5px] leading-relaxed text-[var(--ink-dim)]">
              按“库水位不变”目标：未来24h平均入库约 {engine.avg24()} m³/s，发电引用 {Math.round(s.genFlow)} m³/s，需泄洪 {needSpill} m³/s 维持出入库平衡
            </p>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-[var(--ink-dim)]">
              操作建议：按 0.2m/次 分步平稳启闭，每步稳定 3 分钟，开启顺序 2号→3号→1号，关闭顺序相反
            </p>
            <div className="mt-3 grid grid-cols-2 gap-1.5">
              {checks.map((c) => (
                <div key={c.label} className="flex items-center gap-1.5 text-[10.5px] text-[var(--ink-dim)]">
                  <span className="num flex h-3.5 w-3.5 items-center justify-center rounded-full text-[9px]" style={{ background: c.ok ? 'rgba(52,211,153,.15)' : 'rgba(248,113,113,.15)', color: c.ok ? 'var(--mint)' : 'var(--red)' }}>✓</span>
                  {c.label}
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <SectionTitle right={<Pill color="var(--amber)">{s.alarms.filter((a) => a.level !== '信息').length} 条待关注</Pill>}>实时告警</SectionTitle>
            <div className="max-h-[240px] space-y-1.5 overflow-y-auto pr-1">
              {s.alarms.map((a) => (
                <div
                  key={a.id}
                  className="rounded-sm border-l-[3px] bg-[rgba(5,8,16,.45)] px-2.5 py-2"
                  style={{ borderColor: a.level === '告警' ? 'var(--red)' : a.level === '预警' ? 'var(--amber)' : 'var(--cyan)' }}
                >
                  <div className="flex items-center gap-2">
                    <span className="num text-[10px] text-[var(--ink-faint)]">{a.time}</span>
                    <span className="font-mono2 text-[10px]" style={{ color: a.level === '告警' ? 'var(--red)' : a.level === '预警' ? 'var(--amber)' : 'var(--cyan)' }}>{a.level}</span>
                  </div>
                  <p className="mt-0.5 text-[11.5px] leading-snug text-[var(--ink-dim)]">{a.text}</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </main>
    </div>
  );
}

function FlowStat({ label, v, color }: { label: string; v: number; color: string }) {
  return (
    <div>
      <div className="label-caps mb-1">{label}</div>
      <div className="num text-[22px] font-semibold" style={{ color }}>
        {Math.round(v)}<span className="ml-1 text-[11px] font-normal text-[var(--ink-faint)]">m³/s</span>
      </div>
    </div>
  );
}

function GateStat({ label, v, unit, color }: { label: string; v: string; unit: string; color: string }) {
  return (
    <div className="rounded border border-[#141d33] bg-[rgba(5,8,16,.4)] px-1 py-2">
      <div className="label-caps mb-1 !text-[9px]">{label}</div>
      <div className="num text-[15px] font-semibold" style={{ color }}>{v}</div>
      <div className="num text-[9px] text-[var(--ink-faint)]">{unit}</div>
    </div>
  );
}
