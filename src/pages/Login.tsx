import { useState } from 'react';
import { useNavigate } from 'react-router';
import { login } from '../engine/auth';
import { Led } from '../components/ui';
import { Toaster, toast } from 'sonner';

const DEMO = [
  { label: '超级管理员', u: 'admin', p: 'admin123', color: 'var(--cyan)' },
  { label: '管理员', u: 'manager', p: 'manager123', color: 'var(--mint)' },
  { label: '普通操作员', u: 'operator', p: 'op123', color: 'var(--amber)' },
];

export default function Login() {
  const nav = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [shake, setShake] = useState(0);

  const doLogin = (u = username, p = password) => {
    const r = login(u.trim(), p);
    if (r.ok) {
      toast.success(`欢迎，${r.user!.role} ${r.user!.username}`);
      nav('/screen');
    } else {
      toast.error(r.msg);
      setShake((x) => x + 1);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <Toaster theme="dark" position="top-center" richColors />
      {/* 背景网格 + 雷达 */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(26,37,64,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(26,37,64,.5) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse 70% 60% at 50% 45%, black, transparent)',
        }}
      />
      <svg viewBox="0 0 200 200" className="pointer-events-none absolute left-1/2 top-1/2 h-[720px] w-[720px] -translate-x-1/2 -translate-y-1/2 opacity-[0.12]">
        {[40, 70, 95].map((r) => (
          <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="#22d3ee" strokeWidth="0.4" />
        ))}
        <line x1="100" y1="5" x2="100" y2="195" stroke="#22d3ee" strokeWidth="0.3" />
        <line x1="5" y1="100" x2="195" y2="100" stroke="#22d3ee" strokeWidth="0.3" />
        <g className="radar-sweep" style={{ transformOrigin: '100px 100px' }}>
          <path d="M100 100 L100 5 A95 95 0 0 1 160 22 Z" fill="url(#g1)" />
        </g>
        <defs>
          <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      <div key={shake} className="rise-in relative w-full max-w-[420px]">
        <div className="panel-glass scanlines rounded-lg p-8">
          {/* 头部 */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--panel)]">
              <svg viewBox="0 0 32 32" className="h-8 w-8">
                <path d="M4 20 C10 12, 14 24, 20 16 S28 10, 30 14" fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" className="flow-line" />
                <path d="M6 26 h20" stroke="#34d399" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
              </svg>
            </div>
            <h1 className="text-[22px] font-bold tracking-wide text-[var(--ink)]">泸定水电站</h1>
            <p className="mt-1 text-[13px] text-[var(--ink-dim)]">智慧化上下游水情控制系统</p>
            <p className="label-caps mt-3">四川华电泸定水电有限公司</p>
            <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-[var(--ink-faint)]">
              <Led color="var(--mint)" />
              泄洪闸开关作业 · 高效 · 精准 · 智能化管理
            </div>
          </div>

          {/* 表单 */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              doLogin();
            }}
            className="space-y-4"
          >
            <div>
              <label className="label-caps mb-1.5 block">用户名</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                className="w-full rounded border border-[var(--line)] bg-[rgba(5,8,16,.6)] px-3 py-2.5 text-[13px] text-[var(--ink)] outline-none transition-colors focus:border-[var(--cyan)]"
                placeholder="请输入用户名"
              />
            </div>
            <div>
              <label className="label-caps mb-1.5 block">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full rounded border border-[var(--line)] bg-[rgba(5,8,16,.6)] px-3 py-2.5 text-[13px] text-[var(--ink)] outline-none transition-colors focus:border-[var(--cyan)]"
                placeholder="请输入密码"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded bg-[var(--cyan)] py-2.5 text-[14px] font-semibold tracking-[0.5em] text-[#050810] transition-all hover:brightness-110 active:scale-[0.99]"
              style={{ boxShadow: '0 0 18px rgba(34,211,238,.35)' }}
            >
              登 录
            </button>
          </form>

          {/* 演示账号 */}
          <div className="mt-7">
            <div className="label-caps mb-2.5 text-center">演示账号（三级角色权限）</div>
            <div className="grid grid-cols-3 gap-2">
              {DEMO.map((d) => (
                <button
                  key={d.u}
                  onClick={() => {
                    setUsername(d.u);
                    setPassword(d.p);
                    doLogin(d.u, d.p);
                  }}
                  className="group rounded border border-[var(--line)] bg-[rgba(17,26,43,.5)] px-2 py-2.5 text-center transition-all hover:border-[var(--cyan)] hover:bg-[rgba(34,211,238,.06)]"
                >
                  <div className="flex items-center justify-center gap-1 text-[12px] font-medium" style={{ color: d.color }}>
                    <Led color={d.color} />
                    {d.label}
                  </div>
                  <div className="num mt-1 text-[10px] text-[var(--ink-faint)] group-hover:text-[var(--ink-dim)]">
                    {d.u} / {d.p}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-4 text-center text-[11px] text-[var(--ink-faint)]">
          演示仿真环境 · 内置数据引擎驱动 · 账号数据仅保存于本浏览器
        </p>
      </div>
    </div>
  );
}
