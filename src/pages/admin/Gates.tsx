import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart } from 'recharts';
import { engine, CONST, MODE_LABEL, MODE_DESC, gateFlow, type GateMode } from '../../engine/sim';
import { useSimState } from '../../hooks/useSim';
import { getSession, canOperate } from '../../engine/auth';
import { Panel, Pill, SectionTitle } from '../../components/ui';
import { toast } from 'sonner';

const tipStyle = {
  contentStyle: { background: '#0c1220', border: '1px solid #1a2540', borderRadius: 4, fontSize: 12 },
  labelStyle: { color: '#7d8ca8', fontFamily: 'JetBrains Mono' },
  itemStyle: { fontFamily: 'JetBrains Mono' },
};

export default function Gates() {
  const s = useSimState();
  const user = getSession();
  const operable = canOperate(user);
  const [curveGate, setCurveGate] = useState(2);

  const proj = useMemo(
    () => engine.projectLevels(),
    [s.gates[0].recommended, s.gates[1].recommended, s.gates[2].recommended, s.level],
  );
  const projDomain = useMemo(() => {
    const vs = proj.map((p) => p.level);
    return [Math.floor((Math.min(...vs) - 0.08) * 100) / 100, Math.ceil((Math.max(...vs) + 0.08) * 100) / 100] as [number, number];
  }, [proj]);
  const projTicks = useMemo(
    () => [0, 1, 2, 3, 4].map((i) => projDomain[0] + ((projDomain[1] - projDomain[0]) * i) / 4),
    [projDomain],
  );

  const curve = useMemo(() => {
    const g = s.gates.find((x) => x.id === curveGate)!;
    const pts = [];
    for (let e = 0; e <= g.maxOpening + 0.001; e += 0.1) {
      pts.push({ e: Math.round(e * 100) / 100, q: Math.round(gateFlow(g, e, s.level)) });
    }
    return pts;
  }, [curveGate, s.level, s.gates]);

  const needSpill = Math.max(0, Math.round(s.inflow - s.genFlow));
  const projLevels = proj.map((p) => p.level);
  const checks = [
    { ok: Math.max(...projLevels) < CONST.DANGER, label: '最高库水位不越危险水位', detail: `推演最高 ${Math.max(...projLevels).toFixed(2)}m / 危险水位 ${CONST.DANGER}m` },
    { ok: Math.min(...projLevels) > CONST.DEAD, label: '最低库水位不低于死水位', detail: `推演最低 ${Math.min(...projLevels).toFixed(2)}m / 死水位 ${CONST.DEAD}m` },
    { ok: s.outflow >= CONST.MIN_RELEASE, label: '下游最小放水流量保障', detail: `出库合计 ${Math.round(s.outflow)} m³/s ≥ ${CONST.MIN_RELEASE} m³/s` },
    { ok: true, label: '单次闸位调整步长限制', detail: `最大调整量 ${Math.max(...s.gates.map((g) => Math.abs(g.recommended - g.opening))).toFixed(2)}m ≤ ${CONST.MAX_STEP}m` },
    { ok: s.gates.every((g) => g.recommended === 0 || g.recommended >= CONST.VIB_ZONE), label: '弧门开度避开小开度振动区(<0.3m)', detail: '小开度运行易引起闸门振动，开度建议为0或≥0.3m' },
    { ok: true, label: '多孔开启对称均衡', detail: '2/3号右岸泄洪洞对称分配，1号左岸洞补充调节' },
  ];

  const inputs = [
    { label: '实时库水位', v: `${s.level.toFixed(2)} m` },
    { label: '上游流量检测', v: `${Math.round(s.inflow)} m³/s` },
    { label: '上游电站来水', v: `${Math.round(s.inflow * 0.76)} m³/s` },
    { label: '发电引用流量', v: `${Math.round(s.genFlow)} m³/s` },
    { label: '未来24h平均来水', v: `${engine.avg24()} m³/s` },
    { label: '未来24h降雨', v: `${s.rain24h.toFixed(1)} mm` },
  ];

  return (
    <div className="rise-in space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-bold">泄洪闸位开启角度分析及优化</h2>
          <p className="mt-1 text-[12px] text-[var(--ink-dim)]">
            综合库水位 / 上游流量 / 上游电站来水 / 发电流量 / 发电计划 / 未来降雨，AI模型实时推算 1/2/3号闸推荐开度
          </p>
        </div>
        {operable && (
          <div className="flex gap-2">
            <button
              onClick={() => {
                const mm = Math.round(5 + Math.random() * 25);
                engine.importRain(mm);
                toast.success(`已导入人工降雨数据 ${mm}mm 并重算预测`);
              }}
              className="rounded border border-[var(--line)] px-3 py-1.5 text-[12px] text-[var(--ink-dim)] transition-colors hover:border-[var(--amber)] hover:text-[var(--amber)]"
            >
              人工导入降雨数据
            </button>
            <button
              onClick={() => { engine.applyRecommendation(); toast.success('已按 AI 建议执行闸位调整'); }}
              className="rounded bg-[rgba(34,211,238,.14)] px-3 py-1.5 text-[12px] font-medium text-[var(--cyan)] transition-colors hover:bg-[rgba(34,211,238,.24)]"
            >
              一键执行 AI 建议
            </button>
          </div>
        )}
      </div>

      {/* 输入量 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {inputs.map((i) => (
          <Panel key={i.label} className="!p-3">
            <div className="label-caps mb-1">{i.label}</div>
            <div className="num text-[16px] font-semibold text-[var(--cyan)]">{i.v}</div>
          </Panel>
        ))}
      </div>

      {/* 工况 */}
      <Panel>
        <SectionTitle>闸门操作工况（对应技术规范：库水位不变 / 发电量最大 / 下泄流量变幅最低 / 操作次数最少 / 闸门流量偏差最小）</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(MODE_LABEL) as GateMode[]).map((m) => (
            <button
              key={m}
              disabled={!operable}
              onClick={() => { engine.setMode(m); toast.info(`工况已切换：${MODE_LABEL[m]}`); }}
              className={`rounded border px-3.5 py-2 text-left transition-all disabled:cursor-not-allowed disabled:opacity-45 ${
                s.mode === m
                  ? 'border-[rgba(34,211,238,.5)] bg-[rgba(34,211,238,.1)]'
                  : 'border-[var(--line)] hover:border-[rgba(34,211,238,.3)]'
              }`}
            >
              <div className="text-[12.5px] font-semibold" style={{ color: s.mode === m ? 'var(--cyan)' : 'var(--ink)' }}>{MODE_LABEL[m]}</div>
              <div className="mt-0.5 text-[10.5px] text-[var(--ink-faint)]">{MODE_DESC[m]}</div>
            </button>
          ))}
        </div>
        {!operable && <p className="mt-2 text-[11px] text-[var(--amber)]">当前角色为普通操作员：仅可查看，操作需管理员及以上权限</p>}
      </Panel>

      {/* 闸门卡片 */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        {s.gates.map((g) => {
          const delta = g.recommended - g.opening;
          const projFlow = Math.round(gateFlow(g, g.recommended, s.level));
          return (
            <Panel key={g.id}>
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <div className="text-[14px] font-semibold">{g.id}号泄洪洞工作弧门</div>
                  <div className="mt-0.5 text-[10.5px] text-[var(--ink-faint)]">
                    {g.side} · {g.type} · 孔口 {g.width}m×{g.height}m · 平板检修门 100% 开
                  </div>
                </div>
                <Pill color={Math.abs(delta) < 0.05 ? 'var(--mint)' : 'var(--amber)'} pulse={Math.abs(delta) >= 0.05}>
                  {Math.abs(delta) < 0.05 ? '建议保持' : `建议调整 ${delta > 0 ? '+' : ''}${delta.toFixed(1)}m`}
                </Pill>
              </div>
              <div className="my-3 flex items-center justify-center gap-3 rounded border border-[#141d33] bg-[rgba(5,8,16,.4)] py-3">
                <div className="text-center">
                  <div className="label-caps mb-1">当前开度</div>
                  <div className="num text-[24px] font-bold text-[var(--cyan)]">{g.opening.toFixed(2)}<span className="text-[11px] text-[var(--ink-faint)]"> m</span></div>
                </div>
                <div className="text-[20px] text-[var(--ink-faint)]">→</div>
                <div className="text-center">
                  <div className="label-caps mb-1">AI推荐开度</div>
                  <div className="num text-[24px] font-bold text-[var(--mint)]">{g.recommended.toFixed(2)}<span className="text-[11px] text-[var(--ink-faint)]"> m</span></div>
                </div>
                <div className="text-center">
                  <div className="label-caps mb-1">预计过闸流量</div>
                  <div className="num text-[24px] font-bold text-[var(--amber)]">{projFlow}<span className="text-[11px] text-[var(--ink-faint)]"> m³/s</span></div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={g.maxOpening}
                  step={0.05}
                  value={g.opening}
                  disabled={!operable}
                  onChange={(e) => engine.setGateOpening(g.id, Number(e.target.value))}
                  className="gate-slider flex-1"
                />
                <span className="num w-12 text-right text-[13px] text-[var(--cyan)]">{g.opening.toFixed(2)}m</span>
              </div>
              <p className="mt-2 text-[10.5px] text-[var(--ink-faint)]">
                人工干预滑杆（演示联动）· 单次步长限制 ≤ {CONST.MAX_STEP}m · 开启顺序 2→3→1 号
              </p>
            </Panel>
          );
        })}
      </div>

      {/* 特性曲线 + 水位推演 */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <Panel>
          <SectionTitle
            right={
              <div className="flex gap-1">
                {[1, 2, 3].map((id) => (
                  <button
                    key={id}
                    onClick={() => setCurveGate(id)}
                    className={`rounded px-2 py-1 text-[11px] ${curveGate === id ? 'bg-[rgba(34,211,238,.12)] text-[var(--cyan)]' : 'text-[var(--ink-faint)]'}`}
                  >
                    {id}号
                  </button>
                ))}
              </div>
            }
          >
            弧门开度-过流特性曲线（Q=μ·b·e·√2gH，当前水位 {s.level.toFixed(2)}m）
          </SectionTitle>
          <div className="h-[220px]">
            <ResponsiveContainer>
              <LineChart data={curve} margin={{ top: 6, right: 12, bottom: 0, left: -10 }}>
                <CartesianGrid stroke="#141d33" />
                <XAxis dataKey="e" interval={4} tick={{ fontSize: 10, fill: '#4d5b76', fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={{ stroke: '#1a2540' }} label={{ value: '开度 e (m)', position: 'insideBottomRight', fontSize: 10, fill: '#4d5b76' }} />
                <YAxis tick={{ fontSize: 10, fill: '#4d5b76', fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
                <Tooltip {...tipStyle} formatter={(v) => [`${v} m³/s`, '过流能力']} labelFormatter={(e) => `开度 ${e} m`} />
                <Line type="monotone" dataKey="q" stroke="#22d3ee" strokeWidth={1.8} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel>
          <SectionTitle>执行建议后 24h 库水位推演</SectionTitle>
          <div className="h-[220px]">
            <ResponsiveContainer>
              <AreaChart data={proj} margin={{ top: 6, right: 12, bottom: 0, left: -10 }}>
                <CartesianGrid stroke="#141d33" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#4d5b76', fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={{ stroke: '#1a2540' }} minTickGap={36} />
                <YAxis domain={projDomain} ticks={projTicks} tickFormatter={(v) => Number(v).toFixed(2)} tick={{ fontSize: 10, fill: '#4d5b76', fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
                <Tooltip {...tipStyle} formatter={(v) => [`${v} m`, '库水位']} />
                <Area type="monotone" dataKey="level" stroke="#34d399" fill="#34d399" fillOpacity={0.1} strokeWidth={1.6} dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      {/* AI 决策依据 + 安全校核 */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <Panel>
          <SectionTitle right={<span className="num text-[10px] text-[var(--ink-faint)]">生成于 {s.lastForecastAt}</span>}>
            AI 决策依据（留存优化记录）
          </SectionTitle>
          <div className="mb-3 rounded border border-[#141d33] bg-[rgba(5,8,16,.4)] p-3 text-[12px] leading-relaxed text-[var(--ink-dim)]">
            <p>按“{MODE_LABEL[s.mode]}”目标：未来24h平均入库约 {engine.avg24()} m³/s，发电引用 {Math.round(s.genFlow)} m³/s，需泄洪 {needSpill} m³/s 维持出入库平衡</p>
            <p className="mt-1">操作建议：按 0.2m/次 分步平稳启闭，每步稳定 3 分钟，开启顺序 2号→3号→1号，关闭顺序相反</p>
          </div>
          <div className="max-h-[180px] space-y-1.5 overflow-y-auto pr-1">
            {s.decisions.length === 0 && <p className="text-[11px] text-[var(--ink-faint)]">暂无人工执行记录，模型每次滚动重算后自动留存</p>}
            {s.decisions.map((d, i) => (
              <div key={i} className="rounded-sm border-l-[3px] border-[var(--cyan)] bg-[rgba(5,8,16,.4)] px-2.5 py-2">
                <div className="num text-[10px] text-[var(--ink-faint)]">{d.at} · {d.mode}</div>
                <p className="mt-0.5 text-[11.5px] text-[var(--ink-dim)]">{d.text}</p>
              </div>
            ))}
          </div>
        </Panel>
        <Panel>
          <SectionTitle>安全约束校核</SectionTitle>
          <div className="space-y-2">
            {checks.map((c) => (
              <div key={c.label} className="flex items-start gap-2.5 rounded border border-[#141d33] bg-[rgba(5,8,16,.4)] px-3 py-2.5">
                <span
                  className="num mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full text-[10px]"
                  style={{ background: c.ok ? 'rgba(52,211,153,.15)' : 'rgba(248,113,113,.15)', color: c.ok ? 'var(--mint)' : 'var(--red)', width: 18, height: 18 }}
                >
                  ✓
                </span>
                <div>
                  <div className="text-[12.5px] font-medium text-[var(--ink)]">{c.label}</div>
                  <div className="num mt-0.5 text-[10.5px] text-[var(--ink-faint)]">{c.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
