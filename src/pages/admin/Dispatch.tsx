import { useEffect, useState } from 'react';
import { CartesianGrid, ComposedChart, Line, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { engine, CONST } from '../../engine/sim';
import { useSimState } from '../../hooks/useSim';
import { getSession, canOperate } from '../../engine/auth';
import { Led, Panel, Pill, SectionTitle, Td, Th } from '../../components/ui';
import { toast } from 'sonner';

const tipStyle = {
  contentStyle: { background: '#0c1220', border: '1px solid #1a2540', borderRadius: 4, fontSize: 12 },
  labelStyle: { color: '#7d8ca8', fontFamily: 'JetBrains Mono' },
  itemStyle: { fontFamily: 'JetBrains Mono' },
};

export default function Dispatch() {
  const s = useSimState();
  const user = getSession();
  const operable = canOperate(user);

  const hourly = s.dispatchHourly;
  const daily = s.dispatchDaily;
  const avgPower = Math.round(hourly.reduce((a, b) => a + b.power, 0) / Math.max(1, hourly.length));
  const energy = (hourly.reduce((a, b) => a + b.power, 0)).toFixed(1);
  const spillVol = (hourly.reduce((a, b) => a + b.spill, 0) * 3600) / 10000; // 万m³
  const util = Math.max(0, 100 - (spillVol / ((hourly.reduce((a, b) => a + b.inflow, 0) * 3600) / 10000)) * 100);
  const endLevel = hourly[hourly.length - 1]?.level ?? s.level;

  const summary = [
    { label: '日内平均出力', v: `${avgPower} MW`, color: 'var(--cyan)' },
    { label: '日内发电量', v: `${energy} MWh`, color: 'var(--ink)' },
    { label: '水能利用率', v: `${util.toFixed(1)} %`, color: 'var(--mint)' },
    { label: '弃水量', v: `${spillVol.toFixed(1)} 万m³`, color: spillVol > 500 ? 'var(--amber)' : 'var(--ink)' },
    { label: '调度末水位', v: `${endLevel.toFixed(2)} m`, color: 'var(--ink)' },
  ];

  const constraints = [
    `库水位控制在 ${CONST.DEAD}~${CONST.WARN}m`,
    `下游最小放水流量 ≥ ${CONST.MIN_RELEASE} m³/s`,
    '机组负荷避开 40%~60% 振动区',
    `总出力不超装机 920MW`,
    '下泄流量变幅 ≤ 100 m³/s·h',
  ];

  const setW = (key: 'level' | 'benefit' | 'energy', v: number) => {
    engine.setWeights({ ...s.weights, [key]: v });
  };

  return (
    <div className="rise-in space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-bold">发电优化调度</h2>
          <p className="mt-1 text-[12px] text-[var(--ink-dim)]">
            依托来水预测与闸位优化结果 · 目标：水位控制 / 效益最大 / 发电量最大 · 生成于 <span className="num">{s.lastForecastAt}</span>
          </p>
        </div>
        <button
          onClick={() => { engine.pushReport(); toast.success('推演报表已推送（演示）'); }}
          className="rounded bg-[rgba(34,211,238,.14)] px-3 py-1.5 text-[12px] font-medium text-[var(--cyan)] transition-colors hover:bg-[rgba(34,211,238,.24)]"
        >
          推送推演报表
        </button>
      </div>

      {/* 权重 */}
      <Panel>
        <SectionTitle>调度目标权重（可根据电站运营需求调整：优先保水位 / 优先提效益）</SectionTitle>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {([['level', '水位控制'], ['benefit', '发电效益'], ['energy', '发电电量']] as const).map(([k, label]) => (
            <div key={k}>
              <div className="mb-1.5 flex items-center justify-between text-[12px]">
                <span className="text-[var(--ink-dim)]">{label}</span>
                <span className="num text-[var(--cyan)]">{s.weights[k]}%</span>
              </div>
              <input
                type="range" min={0} max={100} step={5} value={s.weights[k]}
                disabled={!operable}
                onChange={(e) => setW(k, Number(e.target.value))}
                className="gate-slider w-full"
              />
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-[var(--ink-faint)]">
          计算模式支持：水位控制 / 出库流量 / 出力 / 弃水最小 / 发电最多 等约束条件灵活组合；长期(月/旬)、中期(月内逐日)、短期(日内逐15分钟)三级调度。
        </p>
      </Panel>

      {/* 概要 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {summary.map((i) => (
          <Panel key={i.label} className="!p-3.5">
            <div className="label-caps mb-1">{i.label}</div>
            <div className="num text-[19px] font-bold" style={{ color: i.color }}>{i.v}</div>
          </Panel>
        ))}
      </div>

      {/* 机组组合 */}
      <Panel>
        <SectionTitle>机组最优开启组合（相同发电功率下开机台数最优化 · 避开振动区）</SectionTitle>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {s.units.map((u) => (
            <div key={u.id} className="rounded border border-[#141d33] bg-[rgba(5,8,16,.4)] p-3.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[13px] font-semibold">
                  <Led color={u.on ? 'var(--mint)' : 'var(--ink-faint)'} />
                  {u.id}号机组
                </span>
                <Pill color="var(--mint)">建议{u.on ? '保持' : '备用'}</Pill>
              </div>
              <div className="num mt-2 text-[12px] text-[var(--ink-dim)]">
                当前：{u.on ? `发电 ${u.power}MW` : '停机'}
              </div>
              <div className="num mt-1 text-[11px] text-[var(--ink-faint)]">
                {u.on ? '182.8 MW/台 · 负荷率 85%，避开振动区，单位耗水率优' : '同等发电功率下优化开机台数，备用待命'}
              </div>
              <button
                disabled={!operable}
                onClick={() => { engine.toggleUnit(u.id); toast.info(`${u.id}号机组 ${u.on ? '解列停机' : '并网发电'}指令已下发（演示）`); }}
                className={`mt-3 w-full rounded border py-1.5 text-[11.5px] transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  u.on
                    ? 'border-[rgba(248,113,113,.4)] text-[var(--red)] hover:bg-[rgba(248,113,113,.08)]'
                    : 'border-[rgba(52,211,153,.4)] text-[var(--mint)] hover:bg-[rgba(52,211,153,.08)]'
                }`}
              >
                {u.on ? '解列停机（演示）' : '并网发电（演示）'}
              </button>
            </div>
          ))}
        </div>
      </Panel>

      {/* 短期调度推演 */}
      <Panel>
        <SectionTitle right={<span className="num text-[10px] text-[var(--ink-faint)]">日内逐15分钟 · 96点</span>}>
          短期调度推演 · 短期水库调度模拟演算（日内过程仿真 + 逐日节点推演）
        </SectionTitle>
        <p className="mb-3 text-[11.5px] leading-relaxed text-[var(--ink-dim)]">
          演算输入：来水预测（降雨-径流+梯级传播）· 电网负荷（日内峰谷）· 水库约束（正常蓄水位{CONST.NORMAL}m / 死水位{CONST.DEAD}m / 预警水位{CONST.WARN}m）；输出全天入库流量、发电流量、泄洪弃水、机组出力变化过程，并以一天为节点滚动推演。
        </p>
        <div className="mb-4 flex flex-wrap gap-2">
          <Pill color="var(--cyan)">来水预测：24h平均 {engine.avg24()} m³/s</Pill>
          <Pill color="var(--amber)">电网负荷：日内峰谷双高峰（晚峰优先保供）</Pill>
          <Pill color="var(--mint)">水库约束：{CONST.DEAD}m ≤ 水位 ≤ {CONST.WARN}m</Pill>
        </div>
        <div className="h-[220px]">
          <ResponsiveContainer>
            <ComposedChart data={hourly} margin={{ top: 6, right: 4, bottom: 0, left: -14 }}>
              <CartesianGrid stroke="#141d33" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#4d5b76', fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={{ stroke: '#1a2540' }} minTickGap={40} />
              <YAxis yAxisId="l" tick={{ fontSize: 10, fill: '#4d5b76', fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="r" orientation="right" domain={[1376, 1379]} tick={{ fontSize: 10, fill: '#4d5b76', fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
              <Tooltip {...tipStyle} />
              <Bar yAxisId="l" dataKey="spill" name="泄洪弃水(m³/s)" fill="#fbbf24" fillOpacity={0.7} isAnimationActive={false} />
              <Line yAxisId="l" type="monotone" dataKey="inflow" name="入库(m³/s)" stroke="#22d3ee" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              <Line yAxisId="l" type="monotone" dataKey="genFlow" name="发电流量(m³/s)" stroke="#34d399" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              <Line yAxisId="r" type="monotone" dataKey="level" name="库水位(m)" stroke="#e879f9" strokeWidth={1.3} strokeDasharray="4 3" dot={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      {/* 逐日模拟演算（交互式） */}
      <DaySim daily={daily} startLevel={s.level} tailLevel={s.tailLevel} />

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <Panel pad={false}>
          <div className="border-b border-[var(--line)] p-3"><span className="label-caps">全天过程仿真明细（日内逐小时）</span></div>
          <div className="max-h-[360px] overflow-auto">
            <table className="w-full min-w-[600px]">
              <thead className="sticky top-0 bg-[var(--panel)]">
                <tr><Th>时段</Th><Th>入库流量(m³/s)</Th><Th>发电流量(m³/s)</Th><Th>泄洪弃水(m³/s)</Th><Th>库水位(m)</Th><Th>全厂出力(MW)</Th></tr>
              </thead>
              <tbody>
                {hourly.map((h) => (
                  <tr key={h.label}>
                    <Td>{h.label}</Td>
                    <Td className="text-[var(--cyan)]">{h.inflow}</Td>
                    <Td className="text-[var(--mint)]">{h.genFlow}</Td>
                    <Td className={h.spill > 0 ? 'text-[var(--amber)]' : ''}>{h.spill}</Td>
                    <Td>{h.level.toFixed(2)}</Td>
                    <Td>{h.power}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel pad={false}>
          <div className="border-b border-[var(--line)] p-3"><span className="label-caps">逐日节点推演明细（以一天为节点 · 未来10天滚动）</span></div>
          <div className="max-h-[360px] overflow-auto">
            <table className="w-full min-w-[680px]">
              <thead className="sticky top-0 bg-[var(--panel)]">
                <tr><Th>日期(节点)</Th><Th>预测入库(m³/s)</Th><Th>计划发电(m³/s)</Th><Th>预计弃水(m³/s)</Th><Th>日均出力(MW)</Th><Th>日电量(万kWh)</Th><Th>预计末水位(m)</Th></tr>
              </thead>
              <tbody>
                {daily.map((d) => (
                  <tr key={d.date}>
                    <Td>{d.date}</Td>
                    <Td className="text-[var(--cyan)]">{d.inflow}</Td>
                    <Td className="text-[var(--mint)]">{d.genFlow}</Td>
                    <Td className={d.spill > 0 ? 'text-[var(--amber)]' : ''}>{d.spill}</Td>
                    <Td>{d.power}</Td>
                    <Td>{d.energy}</Td>
                    <Td>{d.endLevel.toFixed(2)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <Panel>
        <SectionTitle>调度约束条件校核</SectionTitle>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          {constraints.map((c) => (
            <div key={c} className="flex items-center gap-2 rounded border border-[#141d33] bg-[rgba(5,8,16,.4)] px-3 py-2.5 text-[12px] text-[var(--ink-dim)]">
              <span className="num flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[rgba(52,211,153,.15)] text-[10px] text-[var(--mint)]">✓</span>
              {c}
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-[var(--ink-faint)]">
          演算规则：优先利用来水满发（最大引用流量{CONST.MAX_GEN_FLOW} m³/s）；水位偏低时压出力回蓄；水位达预警且来水超发电能力时产生弃水；末水位按库容曲线逐日滚动递推。结果供运行人员参考，实际下泄以调度指令为准。
        </p>
      </Panel>
    </div>
  );
}

/* ---------- 以一天为节点的短期水库调度模拟演算（交互式） ---------- */
function DaySim({ daily, startLevel, tailLevel }: { daily: { date: string; inflow: number; genFlow: number; spill: number; power: number; energy: number; endLevel: number }[]; startLevel: number; tailLevel: number }) {
  const [day, setDay] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setDay((d) => (d + 1) % Math.max(1, daily.length)), 1600);
    return () => clearInterval(t);
  }, [playing, daily.length]);

  useEffect(() => {
    if (day >= daily.length) setDay(0);
  }, [daily.length, day]);

  const cur = daily[day];
  if (!cur) return null;
  const prevEnd = day === 0 ? startLevel : daily[day - 1].endLevel;
  const dLevel = cur.endLevel - prevEnd;
  const head = cur.endLevel - tailLevel;
  const storageDelta = ((cur.inflow - cur.genFlow - cur.spill) * 86400) / 10000; // 万m³

  const stats = [
    { label: '全天入库流量', v: `${cur.inflow}`, unit: 'm³/s', color: 'var(--cyan)' },
    { label: '计划发电流量', v: `${cur.genFlow}`, unit: 'm³/s', color: 'var(--mint)' },
    { label: '泄洪弃水', v: `${cur.spill}`, unit: 'm³/s', color: cur.spill > 0 ? 'var(--amber)' : 'var(--ink)' },
    { label: '机组日均出力', v: `${cur.power}`, unit: 'MW', color: 'var(--magenta)' },
    { label: '日发电量', v: `${cur.energy}`, unit: '万kWh', color: 'var(--ink)' },
    { label: '末水位', v: `${cur.endLevel.toFixed(2)}`, unit: 'm', color: 'var(--ink)' },
  ];

  return (
    <Panel>
      <SectionTitle
        right={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPlaying((p) => !p)}
              className="rounded bg-[rgba(34,211,238,.14)] px-2.5 py-1 text-[11px] font-medium text-[var(--cyan)] transition-colors hover:bg-[rgba(34,211,238,.24)]"
            >
              {playing ? '暂停演算' : '自动演算'}
            </button>
            <span className="num text-[10px] text-[var(--ink-faint)]">节点：1天 · 共{daily.length}天</span>
          </div>
        }
      >
        短期水库调度模拟演算（以一天为节点 · 逐日仿真）
      </SectionTitle>

      {/* 节点选择器 */}
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={() => { setPlaying(false); setDay((d) => Math.max(0, d - 1)); }}
          className="rounded border border-[var(--line)] px-2.5 py-1 text-[12px] text-[var(--ink-dim)] transition-colors hover:border-[var(--cyan)] hover:text-[var(--cyan)]"
        >
          ◀ 前一天
        </button>
        <input
          type="range" min={0} max={Math.max(0, daily.length - 1)} step={1} value={day}
          onChange={(e) => { setPlaying(false); setDay(Number(e.target.value)); }}
          className="gate-slider flex-1"
        />
        <button
          onClick={() => { setPlaying(false); setDay((d) => Math.min(daily.length - 1, d + 1)); }}
          className="rounded border border-[var(--line)] px-2.5 py-1 text-[12px] text-[var(--ink-dim)] transition-colors hover:border-[var(--cyan)] hover:text-[var(--cyan)]"
        >
          后一天 ▶
        </button>
        <span className="num whitespace-nowrap text-[14px] font-bold text-[var(--cyan)]">第 {day + 1} 天 · {cur.date}</span>
      </div>

      {/* 当日演算结果 */}
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
        {stats.map((i) => (
          <div key={i.label} className="rounded border border-[#141d33] bg-[rgba(5,8,16,.4)] px-3 py-2.5">
            <div className="label-caps mb-1 !text-[9px]">{i.label}</div>
            <div className="num text-[19px] font-bold" style={{ color: i.color }}>
              {i.v}<span className="ml-1 text-[10px] font-normal text-[var(--ink-faint)]">{i.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 演算说明 */}
      <div className="mt-3 grid grid-cols-1 gap-2 text-[11.5px] leading-relaxed text-[var(--ink-dim)] md:grid-cols-3">
        <div className="rounded border border-[#141d33] bg-[rgba(5,8,16,.4)] px-3 py-2">
          <span className="text-[var(--cyan)]">水量平衡：</span>
          入库 {cur.inflow} − 发电 {cur.genFlow} − 弃水 {cur.spill} = 蓄变量 {storageDelta >= 0 ? '+' : ''}{storageDelta.toFixed(1)} 万m³/日
        </div>
        <div className="rounded border border-[#141d33] bg-[rgba(5,8,16,.4)] px-3 py-2">
          <span className="text-[var(--cyan)]">水位演算：</span>
          期初 {prevEnd.toFixed(2)}m → 期末 {cur.endLevel.toFixed(2)}m（{dLevel >= 0 ? '上升' : '下降'} {Math.abs(dLevel).toFixed(2)}m）
        </div>
        <div className="rounded border border-[#141d33] bg-[rgba(5,8,16,.4)] px-3 py-2">
          <span className="text-[var(--cyan)]">发电水头：</span>
          毛水头 {head.toFixed(1)}m，加权效率 92.5%，约束校核 {cur.endLevel > CONST.WARN ? '越预警水位' : cur.endLevel < CONST.DEAD ? '低于死水位' : '通过'}
        </div>
      </div>

      {/* 逐日过程图（高亮当前节点） */}
      <div className="mt-4 h-[150px]">
        <ResponsiveContainer>
          <ComposedChart data={daily.map((d, i) => ({ ...d, cur: i === day ? d.inflow : null }))} margin={{ top: 4, right: 4, bottom: 0, left: -14 }}>
            <CartesianGrid stroke="#141d33" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#4d5b76', fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={{ stroke: '#1a2540' }} />
            <YAxis tick={{ fontSize: 10, fill: '#4d5b76', fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
            <Tooltip {...tipStyle} />
            <Bar dataKey="spill" name="泄洪弃水(m³/s)" fill="#fbbf24" fillOpacity={0.65} isAnimationActive={false} />
            <Bar dataKey="cur" name="当前节点入库" fill="#e879f9" fillOpacity={0.9} isAnimationActive={false} />
            <Line type="monotone" dataKey="inflow" name="入库(m³/s)" stroke="#22d3ee" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="genFlow" name="发电流量(m³/s)" stroke="#34d399" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}
