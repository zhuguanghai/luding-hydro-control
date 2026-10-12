import { NavLink, Outlet, useNavigate } from 'react-router';
import { getSession, logout, canManage } from '../../engine/auth';
import { useSimState } from '../../hooks/useSim';
import { fmtTime } from '../../engine/sim';
import { Led, Pill } from '../../components/ui';
import { Toaster } from 'sonner';

const NAV = [
  { to: '/admin/sensors', no: '2.1', name: '传感器数据采集', desc: '实时采集·解析·监视' },
  { to: '/admin/gates', no: '2.2', name: '泄洪闸位优化', desc: 'AI开度分析建议' },
  { to: '/admin/weather', no: '2.3', name: '气象数据', desc: '实况·240h·40天预报' },
  { to: '/admin/inflow', no: '2.4', name: '来水预测', desc: '10天逐日·24h逐时' },
  { to: '/admin/dispatch', no: '2.5', name: '发电优化调度', desc: '机组组合·多约束' },
  { to: '/admin/manage', no: '2.6', name: '后台管理', desc: '用户·数据·日志·接口', adminOnly: true },
];

export default function AdminLayout() {
  const nav = useNavigate();
  const s = useSimState();
  const user = getSession();

  return (
    <div className="flex min-h-screen">
      <Toaster theme="dark" position="top-center" richColors />
      {/* 侧边导航 */}
      <aside className="sticky top-0 flex h-screen w-[232px] shrink-0 flex-col border-r border-[var(--line)] bg-[rgba(8,12,22,.9)]">
        <div className="border-b border-[var(--line)] px-4 py-4">
          <div className="flex items-center gap-2.5">
            <img src="/logo-hd-mark.png" alt="中国华电" className="h-8 w-auto" />
            <div>
              <div className="text-[13px] font-bold">泸定水情控制系统</div>
              <div className="label-caps mt-0.5">中国华电 · 管理后台 v3.0</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-2.5">
          {NAV.filter((n) => !n.adminOnly || canManage(user)).map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `group flex items-start gap-2.5 rounded border px-3 py-2.5 transition-colors ${
                  isActive
                    ? 'border-[rgba(34,211,238,.4)] bg-[rgba(34,211,238,.07)]'
                    : 'border-transparent hover:border-[var(--line)] hover:bg-[rgba(17,26,43,.6)]'
                }`
              }
            >
              <span className="num mt-0.5 text-[10px] text-[var(--ink-faint)] group-hover:text-[var(--cyan)]">{n.no}</span>
              <span>
                <span className="block text-[13px] font-medium text-[var(--ink)]">{n.name}</span>
                <span className="mt-0.5 block text-[10px] text-[var(--ink-faint)]">{n.desc}</span>
              </span>
            </NavLink>
          ))}
        </nav>
        <div className="space-y-2 border-t border-[var(--line)] p-3">
          <button
            onClick={() => nav('/screen')}
            className="w-full rounded border border-[var(--line)] py-2 text-[12px] text-[var(--ink-dim)] transition-colors hover:border-[var(--cyan)] hover:text-[var(--cyan)]"
          >
            进入监控大屏
          </button>
          <button
            onClick={() => { logout(); nav('/login'); }}
            className="w-full rounded border border-[var(--line)] py-2 text-[12px] text-[var(--ink-dim)] transition-colors hover:border-[var(--red)] hover:text-[var(--red)]"
          >
            退出登录
          </button>
        </div>
      </aside>

      {/* 主区 */}
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-[var(--line)] bg-[rgba(5,8,16,.85)] px-5 py-2.5 backdrop-blur-md">
          <p className="text-[11px] text-[var(--ink-faint)]">
            四川华电泸定水电有限公司 · 大渡河干流第12级 · 二等工程/大Ⅱ型
          </p>
          <div className="ml-auto flex items-center gap-3">
            <Pill color="var(--mint)" pulse>演示仿真 · 内置数据引擎驱动</Pill>
            <span className="num text-[14px] font-semibold text-[var(--cyan)]">{fmtTime(s.now)}</span>
            <span className="flex items-center gap-1.5 border-l border-[var(--line)] pl-3 text-[12px] text-[var(--ink-dim)]">
              <Led color="var(--cyan)" />
              {user?.role} <b className="text-[var(--ink)]">{user?.username}</b>
            </span>
          </div>
        </header>
        <main className="p-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
