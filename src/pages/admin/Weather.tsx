import { useMemo, useState } from 'react';
import {
  Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useSimState } from '../../hooks/useSim';
import { fmtHM, fmtDate } from '../../engine/sim';
import { Panel, SectionTitle, Td, Th } from '../../components/ui';

const tipStyle = {
  contentStyle: { background: '#0c1220', border: '1px solid #1a2540', borderRadius: 4, fontSize: 12 },
  labelStyle: { color: '#7d8ca8', fontFamily: 'JetBrains Mono' },
  itemStyle: { fontFamily: 'JetBrains Mono' },
};

type Range = 12 | 24 | 36 | 72;

export default function Weather() {
  const s = useSimState();
  const [range, setRange] = useState<Range>(24);

  const detail = useMemo(() => {
    // 逐3h 抽稀明细
    return s.weatherHourly.filter((_, i) => i % 3 === 0).slice(0, range / 3);
  }, [s.weatherHourly, range]);

  return (
    <div className="rise-in space-y-4">
      <div>
        <h2 className="text-[18px] font-bold">气象数据模块</h2>
        <p className="mt-1 text-[12px] text-[var(--ink-dim)]">
          接入流域网格化气象数据（分辨率 9×9km）· 实况每120min采集 · 预报每日≥2次 · 外网→安全II区穿透通道（电力二次安防合规）
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="未来24h累计雨量" v={`${s.rain24h.toFixed(1)} mm`} color="var(--cyan)" />
        <StatCard label="当前气温" v={`${s.temp.toFixed(1)} ℃`} color="var(--ink)" />
        <StatCard label="相对湿度" v={`${s.humidity} %`} color="var(--ink)" />
        <StatCard label="风速" v={`${s.wind.toFixed(1)} m/s`} color="var(--ink)" />
      </div>

      <Panel>
        <SectionTitle right={<span className="num text-[10px] text-[var(--ink-faint)]">前90h逐时 / 90-144h逐3h / 144-240h逐6h</span>}>
          240小时气象预报
        </SectionTitle>
        <div className="h-[240px]">
          <ResponsiveContainer>
            <ComposedChart data={s.weatherHourly} margin={{ top: 6, right: 4, bottom: 0, left: -16 }}>
              <CartesianGrid stroke="#141d33" vertical={false} />
              <XAxis dataKey="t" tickFormatter={(t) => `${fmtDate(Number(t)).slice(5)} ${fmtHM(Number(t))}`} tick={{ fontSize: 10, fill: '#4d5b76', fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={{ stroke: '#1a2540' }} minTickGap={90} />
              <YAxis yAxisId="r" tick={{ fontSize: 10, fill: '#4d5b76', fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="t" orientation="right" domain={[0, 30]} tick={{ fontSize: 10, fill: '#4d5b76', fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
              <Tooltip {...tipStyle} labelFormatter={(t) => `${fmtDate(Number(t))} ${fmtHM(Number(t))}`} />
              <Bar yAxisId="r" dataKey="rain" name="降雨量(mm)" fill="#22d3ee" fillOpacity={0.75} isAnimationActive={false} />
              <Line yAxisId="t" type="monotone" dataKey="temp" name="温度(℃)" stroke="#fbbf24" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              <Line yAxisId="t" type="monotone" dataKey="humidity" name="湿度(%)" stroke="#34d399" strokeWidth={1} dot={false} strokeDasharray="4 3" isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel>
        <SectionTitle>40天长期逐日预报（日最高/最低温度 · 降雨量 · 总云量 · 风速）</SectionTitle>
        <div className="h-[210px]">
          <ResponsiveContainer>
            <ComposedChart data={s.weatherDaily} margin={{ top: 6, right: 4, bottom: 0, left: -16 }}>
              <CartesianGrid stroke="#141d33" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#4d5b76', fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={{ stroke: '#1a2540' }} minTickGap={30} />
              <YAxis yAxisId="r" tick={{ fontSize: 10, fill: '#4d5b76', fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="t" orientation="right" domain={[0, 32]} tick={{ fontSize: 10, fill: '#4d5b76', fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
              <Tooltip {...tipStyle} />
              <Bar yAxisId="r" dataKey="rain" name="降雨量(mm)" fill="#22d3ee" fillOpacity={0.75} isAnimationActive={false} />
              <Line yAxisId="t" type="monotone" dataKey="tMax" name="最高温(℃)" stroke="#f87171" strokeWidth={1.4} dot={false} isAnimationActive={false} />
              <Line yAxisId="t" type="monotone" dataKey="tMin" name="最低温(℃)" stroke="#34d399" strokeWidth={1.4} dot={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel pad={false}>
        <div className="flex items-center justify-between border-b border-[var(--line)] p-3">
          <span className="label-caps">逐时段预报明细</span>
          <div className="flex gap-1">
            {([12, 24, 36, 72] as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`rounded px-2.5 py-1 text-[11px] ${range === r ? 'bg-[rgba(34,211,238,.12)] text-[var(--cyan)]' : 'text-[var(--ink-faint)]'}`}
              >
                {r}h
              </button>
            ))}
          </div>
        </div>
        <div className="max-h-[340px] overflow-auto">
          <table className="w-full min-w-[760px]">
            <thead className="sticky top-0 bg-[var(--panel)]">
              <tr>
                <Th>预报时间</Th><Th>降雨量(mm)</Th><Th>温度(℃)</Th><Th>湿度(%)</Th><Th>风速(m/s)</Th><Th>总云量(%)</Th><Th>辐照(W/m²)</Th>
              </tr>
            </thead>
            <tbody>
              {detail.map((w) => (
                <tr key={w.t} className={w.rain > 0.5 ? 'bg-[rgba(34,211,238,.05)]' : ''}>
                  <Td>{fmtDate(w.t)} {fmtHM(w.t)}</Td>
                  <Td className={w.rain > 0.5 ? 'text-[var(--cyan)]' : ''}>{w.rain}</Td>
                  <Td>{w.temp}</Td>
                  <Td>{w.humidity}</Td>
                  <Td>{w.wind}</Td>
                  <Td>{w.cloud}</Td>
                  <Td>{w.solar}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <p className="text-[11px] leading-relaxed text-[var(--ink-faint)]">
        数据时效性存储：预报数据随时间推进自动更新覆盖；历史实况数据长期入库，支持按时间/区域查询与导出。
      </p>
    </div>
  );
}

function StatCard({ label, v, color }: { label: string; v: string; color: string }) {
  return (
    <Panel className="!p-3.5">
      <div className="label-caps mb-1">{label}</div>
      <div className="num text-[22px] font-bold" style={{ color }}>{v}</div>
    </Panel>
  );
}
