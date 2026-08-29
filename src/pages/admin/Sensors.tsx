import { useMemo, useState } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useSimState } from '../../hooks/useSim';
import { fmtTime } from '../../engine/sim';
import { SENSORS } from '../../data/sensors';
import { Led, Panel, SectionTitle, Td, Th } from '../../components/ui';
import { toast } from 'sonner';

const AREAS = ['全部', '库区', '1号泄洪洞', '2号泄洪洞', '3号泄洪洞', '厂房'] as const;

export default function Sensors() {
  const s = useSimState();
  const [area, setArea] = useState<(typeof AREAS)[number]>('全部');

  const rows = useMemo(
    () =>
      SENSORS.map((d) => {
        const v = d.read(s);
        return { ...d, value: v, online: v !== null };
      }),
    [s],
  );
  const filtered = area === '全部' ? rows : rows.filter((r) => r.area === area);
  const online = rows.filter((r) => r.online).length;

  return (
    <div className="rise-in space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-bold">传感器数据采集</h2>
          <p className="mt-1 text-[12px] text-[var(--ink-dim)]">
            对接新装与既有传感器 · 数据清洗解析 · 水位/闸位/流量/水压实时采集（采集对接展示，采购安装由甲方另行实施）
          </p>
        </div>
        <button
          onClick={() => toast.success('传感器台账已导出（演示）')}
          className="rounded border border-[var(--line)] px-3 py-1.5 text-[12px] text-[var(--ink-dim)] transition-colors hover:border-[var(--cyan)] hover:text-[var(--cyan)]"
        >
          导出台账
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="传感器总数" v={rows.length} color="var(--ink)" />
        <StatCard label="在线" v={online} color="var(--mint)" />
        <StatCard label="离线" v={rows.length - online} color="var(--amber)" />
        <StatCard label="故障提醒" v={0} color="var(--red)" />
      </div>

      <Panel>
        <SectionTitle right={<span className="num text-[10px] text-[var(--ink-faint)]">数据刷新周期 5s</span>}>
          关键采集量实时曲线
        </SectionTitle>
        <div className="h-[170px]">
          <ResponsiveContainer>
            <AreaChart data={s.hist} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
              <XAxis dataKey="t" tickFormatter={(t) => fmtTime(Number(t))} tick={{ fontSize: 10, fill: '#4d5b76', fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={{ stroke: '#1a2540' }} minTickGap={70} />
              <YAxis domain={[800, 1300]} tick={{ fontSize: 10, fill: '#4d5b76', fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: '#0c1220', border: '1px solid #1a2540', borderRadius: 4, fontSize: 12 }}
                labelFormatter={(t) => fmtTime(Number(t))}
              />
              <Area type="monotone" dataKey="inflow" name="入库流量" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.08} strokeWidth={1.4} dot={false} isAnimationActive={false} />
              <Area type="monotone" dataKey="outflow" name="出库流量" stroke="#e879f9" fill="none" strokeWidth={1.2} dot={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel pad={false}>
        <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--line)] p-3">
          {AREAS.map((a) => (
            <button
              key={a}
              onClick={() => setArea(a)}
              className={`rounded px-3 py-1.5 text-[12px] transition-colors ${
                area === a
                  ? 'bg-[rgba(34,211,238,.12)] text-[var(--cyan)]'
                  : 'text-[var(--ink-dim)] hover:bg-[rgba(17,26,43,.7)]'
              }`}
            >
              {a}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead>
              <tr>
                <Th>编号</Th><Th>名称/安装位置</Th><Th>类型</Th><Th>通信协议</Th><Th>当前值</Th><Th>状态</Th><Th>最后更新</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-[rgba(17,26,43,.5)]">
                  <Td className="text-[var(--cyan)]">{r.id}</Td>
                  <Td mono={false}>{r.name}</Td>
                  <Td mono={false} className="text-[var(--ink-dim)]">{r.type}</Td>
                  <Td className="text-[var(--ink-dim)]">{r.protocol}</Td>
                  <Td>{r.online ? `${r.value} ${r.unit}` : '—'}</Td>
                  <Td mono={false}>
                    <span className="inline-flex items-center gap-1.5">
                      <Led color={r.online ? 'var(--mint)' : 'var(--amber)'} />
                      <span style={{ color: r.online ? 'var(--mint)' : 'var(--amber)' }}>{r.online ? '在线' : '离线'}</span>
                    </span>
                  </Td>
                  <Td className="text-[var(--ink-faint)]">{r.online ? fmtTime(s.now) : '—'}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <p className="text-[11px] leading-relaxed text-[var(--ink-faint)]">
        数据解析：原始报文 → 清洗（剔除越限/跳变/超时无效帧）→ 标准化（统一工程量纲）→ 入库。
        传感器型号：HPS拉绳位移 / 多圈绝对编码器 / GKRD68雷达液位计 / ZKX200闸门开度仪。
      </p>
    </div>
  );
}

function StatCard({ label, v, color }: { label: string; v: number; color: string }) {
  return (
    <Panel className="!p-3.5">
      <div className="label-caps mb-1">{label}</div>
      <div className="num text-[26px] font-bold" style={{ color }}>{v}</div>
    </Panel>
  );
}
