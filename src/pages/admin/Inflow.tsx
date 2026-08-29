import { Area, AreaChart, Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { engine, fmtHM } from '../../engine/sim';
import { useSimState } from '../../hooks/useSim';
import { Panel, Pill, SectionTitle, Td, Th } from '../../components/ui';
import { toast } from 'sonner';

const tipStyle = {
  contentStyle: { background: '#0c1220', border: '1px solid #1a2540', borderRadius: 4, fontSize: 12 },
  labelStyle: { color: '#7d8ca8', fontFamily: 'JetBrains Mono' },
  itemStyle: { fontFamily: 'JetBrains Mono' },
};

export default function Inflow() {
  const s = useSimState();

  return (
    <div className="rise-in space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-bold">来水预测应用</h2>
          <p className="mt-1 text-[12px] text-[var(--ink-dim)]">
            降雨-径流耦合 + 梯级传播 + AI残差校正 · 模型：<b className="text-[var(--cyan)]">LD-RF v2.3</b>（机器学习集成：LSTM+XGBoost 残差校正）· 生成于 <span className="num">{s.lastForecastAt}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { engine.genForecast(); toast.success('预测模型已滚动重算'); }}
            className="rounded bg-[rgba(34,211,238,.14)] px-3 py-1.5 text-[12px] font-medium text-[var(--cyan)] transition-colors hover:bg-[rgba(34,211,238,.24)]"
          >
            重新计算
          </button>
          <button
            onClick={() => toast.success('预测报告已导出（演示）')}
            className="rounded border border-[var(--line)] px-3 py-1.5 text-[12px] text-[var(--ink-dim)] transition-colors hover:border-[var(--cyan)] hover:text-[var(--cyan)]"
          >
            导出/打印
          </button>
        </div>
      </div>

      <Panel>
        <SectionTitle>模型数据支撑（API自动接入，无需人工介入）</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {['实时水情：库水位 / 入库流量（传感器+水调系统）', '流域历史气象 / 径流资料 / 历年同期雪融来水', '上游电站（黄金坪）历史与实时下泄流量', '未来240小时网格化气象预报'].map((t) => (
            <Pill key={t} color="var(--cyan)">{t}</Pill>
          ))}
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <Panel>
          <SectionTitle>未来24小时逐时入库流量预测（含置信区间）</SectionTitle>
          <div className="h-[230px]">
            <ResponsiveContainer>
              <AreaChart data={s.forecast24} margin={{ top: 6, right: 8, bottom: 0, left: -12 }}>
                <CartesianGrid stroke="#141d33" vertical={false} />
                <XAxis dataKey="t" tickFormatter={(t) => fmtHM(Number(t))} tick={{ fontSize: 10, fill: '#4d5b76', fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={{ stroke: '#1a2540' }} minTickGap={46} />
                <YAxis tick={{ fontSize: 10, fill: '#4d5b76', fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
                <Tooltip {...tipStyle} labelFormatter={(t) => fmtHM(Number(t))} />
                <Area type="monotone" dataKey={(d) => [d.lo, d.hi]} name="置信区间" stroke="none" fill="#22d3ee" fillOpacity={0.12} isAnimationActive={false} />
                <Line type="monotone" dataKey="q" name="预测流量" stroke="#22d3ee" strokeWidth={1.8} dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel>
          <SectionTitle>未来10天逐日入库流量预测（叠加日降雨）</SectionTitle>
          <div className="h-[230px]">
            <ResponsiveContainer>
              <ComposedChart data={s.forecast10d} margin={{ top: 6, right: 4, bottom: 0, left: -12 }}>
                <CartesianGrid stroke="#141d33" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#4d5b76', fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={{ stroke: '#1a2540' }} />
                <YAxis yAxisId="q" tick={{ fontSize: 10, fill: '#4d5b76', fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10, fill: '#4d5b76', fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
                <Tooltip {...tipStyle} />
                <Bar yAxisId="r" dataKey="rain" name="日降雨(mm)" fill="#34d399" fillOpacity={0.55} isAnimationActive={false} />
                <Line yAxisId="q" type="monotone" dataKey="q" name="预测流量" stroke="#22d3ee" strokeWidth={1.8} dot={false} isAnimationActive={false} />
                <Line yAxisId="q" type="monotone" dataKey="hi" name="上限" stroke="#22d3ee" strokeWidth={0.8} strokeDasharray="3 3" dot={false} isAnimationActive={false} />
                <Line yAxisId="q" type="monotone" dataKey="lo" name="下限" stroke="#22d3ee" strokeWidth={0.8} strokeDasharray="3 3" dot={false} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <Panel pad={false}>
          <div className="border-b border-[var(--line)] p-3"><span className="label-caps">未来24小时逐时预测明细表（含来水区间）</span></div>
          <div className="max-h-[320px] overflow-auto">
            <table className="w-full min-w-[640px]">
              <thead className="sticky top-0 bg-[var(--panel)]">
                <tr><Th>时段</Th><Th>预测流量(m³/s)</Th><Th>来水区间(m³/s)</Th><Th>区间下限</Th><Th>区间上限</Th><Th>区间宽度</Th></tr>
              </thead>
              <tbody>
                {s.forecast24.map((f) => {
                  const d = new Date(f.t);
                  return (
                    <tr key={f.t}>
                      <Td>{d.getDate()}日 {String(d.getHours()).padStart(2, '0')}时</Td>
                      <Td className="text-[var(--cyan)]">{f.q}</Td>
                      <Td className="text-[var(--mint)]">{f.lo} ~ {f.hi}</Td>
                      <Td>{f.lo}</Td>
                      <Td>{f.hi}</Td>
                      <Td className="text-[var(--ink-faint)]">±{Math.round((f.hi - f.lo) / 2)}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel pad={false}>
          <div className="border-b border-[var(--line)] p-3"><span className="label-caps">未来10天逐日预测明细表（含来水区间）</span></div>
          <div className="max-h-[320px] overflow-auto">
            <table className="w-full min-w-[720px]">
              <thead className="sticky top-0 bg-[var(--panel)]">
                <tr><Th>日期</Th><Th>日降雨(mm)</Th><Th>预测流量(m³/s)</Th><Th>来水区间(m³/s)</Th><Th>区间下限</Th><Th>区间上限</Th><Th>区间宽度</Th></tr>
              </thead>
              <tbody>
                {s.forecast10d.map((f) => (
                  <tr key={f.date} className={f.rain > 8 ? 'bg-[rgba(34,211,238,.05)]' : ''}>
                    <Td>{f.date}</Td>
                    <Td className={f.rain > 8 ? 'text-[var(--mint)]' : ''}>{f.rain}</Td>
                    <Td className="text-[var(--cyan)]">{f.q}</Td>
                    <Td className="text-[var(--mint)]">{f.lo} ~ {f.hi}</Td>
                    <Td>{f.lo}</Td>
                    <Td>{f.hi}</Td>
                    <Td className="text-[var(--ink-faint)]">±{Math.round((f.hi - f.lo) / 2)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <Panel pad={false}>
        <div className="border-b border-[var(--line)] p-3">
          <span className="label-caps">预测结果评估（对照《水文情报预报规范》GB/T 22482，以四川电网两个细则考核为准）</span>
        </div>
        <div className="max-h-[300px] overflow-auto">
          <table className="w-full min-w-[680px]">
            <thead className="sticky top-0 bg-[var(--panel)]">
              <tr><Th>评估时间</Th><Th>预报对象</Th><Th>RMSE(m³/s)</Th><Th>MAPE(%)</Th><Th>合格率(%)</Th><Th>样本数</Th><Th>评定</Th></tr>
            </thead>
            <tbody>
              {s.evalRows.map((r, i) => (
                <tr key={i}>
                  <Td>{r.at}</Td>
                  <Td mono={false}>{r.target}</Td>
                  <Td>{r.rmse}</Td>
                  <Td>{r.mape}</Td>
                  <Td>{r.pass}</Td>
                  <Td>{r.samples}</Td>
                  <Td mono={false}><Pill color="var(--mint)">合格</Pill></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <p className="text-[11px] leading-relaxed text-[var(--ink-faint)]">
        评估机制：预测值与实测来水逐时段比对，许可误差内计为合格；评估结果反馈至模型参数，实现滚动校正与迭代优化。全部预测历史与评估报告留存，支持按时间查询与不同时期准确率对比。
      </p>
    </div>
  );
}
