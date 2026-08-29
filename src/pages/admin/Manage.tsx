import { useState } from 'react';
import { CONST, saveCfg, fmtDate, fmtHM } from '../../engine/sim';
import { useSimState } from '../../hooks/useSim';
import { loadUsers, saveUsers, type User, type Role } from '../../engine/auth';
import { Led, Panel, Pill, SectionTitle, Td, Th } from '../../components/ui';
import { toast } from 'sonner';

const TABS = ['用户管理', '内容管理', '数据管理', '行为监测', '外部系统对接', '系统设置'] as const;

export default function Manage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('用户管理');
  return (
    <div className="rise-in space-y-4">
      <div>
        <h2 className="text-[18px] font-bold">后台管理</h2>
        <p className="mt-1 text-[12px] text-[var(--ink-dim)]">用户 · 内容 · 数据 · 行为监测 · 外部系统对接 · 系统设置</p>
      </div>
      <div className="flex flex-wrap gap-1.5 border-b border-[var(--line)] pb-0">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-t border-b-2 px-4 py-2 text-[13px] transition-colors ${
              tab === t
                ? 'border-[var(--cyan)] bg-[rgba(34,211,238,.08)] text-[var(--cyan)]'
                : 'border-transparent text-[var(--ink-dim)] hover:text-[var(--ink)]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === '用户管理' && <UsersTab />}
      {tab === '内容管理' && <ContentTab />}
      {tab === '数据管理' && <DataTab />}
      {tab === '行为监测' && <BehaviorTab />}
      {tab === '外部系统对接' && <ApiTab />}
      {tab === '系统设置' && <SettingsTab />}
      <p className="num text-[11px] text-[var(--ink-faint)]">
        页面生成于 {fmtDate(Date.now())} {fmtHM(Date.now())} · 接口单次处理 ≤5s · PC页面加载 ≤3s · 支持 ≥100 并发用户（性能指标依据功能开发需求1.3节）
      </p>
    </div>
  );
}

/* ---------------- 用户管理 ---------------- */
function UsersTab() {
  const [users, setUsers] = useState<User[]>(loadUsers());
  const [name, setName] = useState('');
  const [pwd, setPwd] = useState('');
  const [role, setRole] = useState<Role>('普通操作员');

  const commit = (u: User[]) => {
    setUsers([...u]);
    saveUsers(u);
  };

  return (
    <div className="space-y-3">
      <Panel>
        <SectionTitle>新增用户</SectionTitle>
        <div className="flex flex-wrap items-center gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="用户名"
            className="w-40 rounded border border-[var(--line)] bg-[rgba(5,8,16,.6)] px-3 py-2 text-[12px] outline-none focus:border-[var(--cyan)]" />
          <input value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="初始密码"
            className="w-40 rounded border border-[var(--line)] bg-[rgba(5,8,16,.6)] px-3 py-2 text-[12px] outline-none focus:border-[var(--cyan)]" />
          <select value={role} onChange={(e) => setRole(e.target.value as Role)}
            className="rounded border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-[12px] outline-none">
            <option>超级管理员</option><option>管理员</option><option>普通操作员</option>
          </select>
          <button
            onClick={() => {
              if (!name.trim() || !pwd.trim()) return toast.error('请填写用户名与密码');
              if (users.some((u) => u.username === name.trim())) return toast.error('用户名已存在');
              commit([...users, { username: name.trim(), password: pwd, role, status: '正常', lastLogin: '—' }]);
              setName(''); setPwd('');
              toast.success('用户已创建');
            }}
            className="rounded bg-[rgba(34,211,238,.14)] px-4 py-2 text-[12px] font-medium text-[var(--cyan)] hover:bg-[rgba(34,211,238,.24)]"
          >
            新增用户
          </button>
        </div>
      </Panel>
      <Panel pad={false}>
        <div className="border-b border-[var(--line)] p-3">
          <span className="label-caps">用户与角色权限（数据查看 / 编辑 / 操作 / 审批 精细化配置）</span>
        </div>
        <table className="w-full min-w-[680px]">
          <thead>
            <tr><Th>用户名</Th><Th>角色</Th><Th>状态</Th><Th>最近登录</Th><Th>操作</Th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.username} className="hover:bg-[rgba(17,26,43,.5)]">
                <Td className="text-[var(--cyan)]">{u.username}</Td>
                <Td mono={false}>
                  <select
                    value={u.role}
                    onChange={(e) => {
                      u.role = e.target.value as Role;
                      commit(users);
                      toast.success(`${u.username} 角色已调整为 ${u.role}`);
                    }}
                    className="rounded border border-[var(--line)] bg-[var(--panel)] px-2 py-1 text-[12px] outline-none"
                  >
                    <option>超级管理员</option><option>管理员</option><option>普通操作员</option>
                  </select>
                </Td>
                <Td mono={false}>
                  <span className="inline-flex items-center gap-1.5">
                    <Led color={u.status === '正常' ? 'var(--mint)' : 'var(--red)'} />
                    <span style={{ color: u.status === '正常' ? 'var(--mint)' : 'var(--red)' }}>{u.status}</span>
                  </span>
                </Td>
                <Td className="text-[var(--ink-faint)]">{u.lastLogin}</Td>
                <Td mono={false}>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        u.status = u.status === '正常' ? '冻结' : '正常';
                        commit(users);
                        toast.success(`${u.username} 已${u.status === '冻结' ? '冻结' : '解冻'}`);
                      }}
                      className="rounded border border-[var(--line)] px-2.5 py-1 text-[11px] text-[var(--ink-dim)] hover:border-[var(--amber)] hover:text-[var(--amber)]"
                    >
                      {u.status === '正常' ? '冻结' : '解冻'}
                    </button>
                    <button
                      onClick={() => {
                        u.password = 'Init@123';
                        commit(users);
                        toast.success(`${u.username} 密码已重置为 Init@123`);
                      }}
                      className="rounded border border-[var(--line)] px-2.5 py-1 text-[11px] text-[var(--ink-dim)] hover:border-[var(--cyan)] hover:text-[var(--cyan)]"
                    >
                      重置密码
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      <p className="text-[11px] text-[var(--ink-faint)]">
        支持批量导入/导出、登录日志查询。当前为演示环境，用户数据仅保存在本浏览器（localStorage）。
      </p>
    </div>
  );
}

/* ---------------- 内容管理 ---------------- */
interface Notice { id: number; title: string; type: string; at: string; published: boolean }
const NOTICE_KEY = 'ld_notices_v3';
const DEFAULT_NOTICES: Notice[] = [
  { id: 1, title: '关于2026年主汛期泄洪设施联合调度演练的通知', type: '通知公告', at: '2026-08-25', published: true },
  { id: 2, title: '2号泄洪洞弧门年度检修完成，恢复备用', type: '运行公告', at: '2026-08-20', published: true },
  { id: 3, title: '水情自动测报系统传感器标定计划（9月）', type: '工作计划', at: '2026-08-28', published: false },
];
function ContentTab() {
  const [notices, setNotices] = useState<Notice[]>(() => {
    try {
      const raw = localStorage.getItem(NOTICE_KEY);
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return DEFAULT_NOTICES;
  });
  const [title, setTitle] = useState('');
  const commit = (n: Notice[]) => {
    setNotices([...n]);
    localStorage.setItem(NOTICE_KEY, JSON.stringify(n));
  };
  return (
    <div className="space-y-3">
      <Panel>
        <SectionTitle>发布内容</SectionTitle>
        <div className="flex gap-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="输入公告/资讯标题"
            className="flex-1 rounded border border-[var(--line)] bg-[rgba(5,8,16,.6)] px-3 py-2 text-[12px] outline-none focus:border-[var(--cyan)]" />
          <button
            onClick={() => {
              if (!title.trim()) return toast.error('请输入标题');
              commit([{ id: Date.now(), title: title.trim(), type: '通知公告', at: fmtDate(Date.now()), published: true }, ...notices]);
              setTitle('');
              toast.success('内容已发布');
            }}
            className="rounded bg-[rgba(34,211,238,.14)] px-4 py-2 text-[12px] font-medium text-[var(--cyan)] hover:bg-[rgba(34,211,238,.24)]"
          >
            发布
          </button>
        </div>
      </Panel>
      <Panel pad={false}>
        <table className="w-full min-w-[620px]">
          <thead><tr><Th>标题</Th><Th>栏目</Th><Th>日期</Th><Th>状态</Th><Th>操作</Th></tr></thead>
          <tbody>
            {notices.map((n) => (
              <tr key={n.id} className="hover:bg-[rgba(17,26,43,.5)]">
                <Td mono={false}>{n.title}</Td>
                <Td mono={false} className="text-[var(--ink-dim)]">{n.type}</Td>
                <Td>{n.at}</Td>
                <Td mono={false}>
                  <Pill color={n.published ? 'var(--mint)' : 'var(--ink-faint)'}>{n.published ? '已发布' : '草稿'}</Pill>
                </Td>
                <Td mono={false}>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { n.published = !n.published; commit(notices); }}
                      className="rounded border border-[var(--line)] px-2.5 py-1 text-[11px] text-[var(--ink-dim)] hover:border-[var(--cyan)] hover:text-[var(--cyan)]"
                    >
                      {n.published ? '下架' : '上架'}
                    </button>
                    <button
                      onClick={() => { commit(notices.filter((x) => x.id !== n.id)); toast.success('已删除'); }}
                      className="rounded border border-[var(--line)] px-2.5 py-1 text-[11px] text-[var(--ink-dim)] hover:border-[var(--red)] hover:text-[var(--red)]"
                    >
                      删除
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

/* ---------------- 数据管理 ---------------- */
function DataTab() {
  const [backupAt, setBackupAt] = useState('2026-08-29 04:00');
  const categories = ['传感器采集数据', '水情历史数据', '气象数据', '来水预测记录', '发电调度方案', '操作行为日志'];
  return (
    <div className="space-y-3">
      <Panel>
        <SectionTitle>业务数据管理（导入/导出/批量删除/备份）</SectionTitle>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {categories.map((c) => (
            <div key={c} className="flex items-center gap-2 rounded border border-[#141d33] bg-[rgba(5,8,16,.4)] px-3 py-2.5">
              <span className="text-[12.5px] text-[var(--ink)]">{c}</span>
              <div className="ml-auto flex gap-1.5">
                {['导入', '导出', '批量删除'].map((op) => (
                  <button
                    key={op}
                    onClick={() => toast.success(`${c} · ${op}完成（演示）`)}
                    className="rounded border border-[var(--line)] px-2.5 py-1 text-[11px] text-[var(--ink-dim)] hover:border-[var(--cyan)] hover:text-[var(--cyan)]"
                  >
                    {op}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Panel>
      <Panel>
        <SectionTitle>数据备份</SectionTitle>
        <p className="text-[12px] text-[var(--ink-dim)]">
          最近自动备份 <span className="num text-[var(--ink)]">{backupAt}</span>（本地服务器 + 云端双副本）
        </p>
        <p className="mt-1 text-[12px] text-[var(--ink-dim)]">策略：每日04:00自动全量备份，保留30天</p>
        <button
          onClick={() => {
            setBackupAt(`${fmtDate(Date.now())} ${fmtHM(Date.now())}`);
            toast.success('手动备份完成（本地服务器 + 云端双副本）');
          }}
          className="mt-3 rounded bg-[rgba(34,211,238,.14)] px-4 py-2 text-[12px] font-medium text-[var(--cyan)] hover:bg-[rgba(34,211,238,.24)]"
        >
          立即手动备份
        </button>
      </Panel>
    </div>
  );
}

/* ---------------- 行为监测 ---------------- */
function BehaviorTab() {
  const s = useSimState();
  return (
    <div className="space-y-3">
      <Panel>
        <SectionTitle>操作行为日志（闸门干预 / 机组启停 / 工况切换 / 数据导入 实时留痕）</SectionTitle>
        <div className="max-h-[420px] space-y-1.5 overflow-y-auto pr-1">
          {s.alarms.map((a) => (
            <div
              key={a.id}
              className="rounded-sm border-l-[3px] bg-[rgba(5,8,16,.45)] px-3 py-2"
              style={{ borderColor: a.level === '告警' ? 'var(--red)' : a.level === '预警' ? 'var(--amber)' : 'var(--cyan)' }}
            >
              <div className="flex items-center gap-2">
                <span className="num text-[10px] text-[var(--ink-faint)]">{fmtDate(s.now)} {a.time}</span>
                <span className="font-mono2 text-[10px]" style={{ color: a.level === '告警' ? 'var(--red)' : a.level === '预警' ? 'var(--amber)' : 'var(--cyan)' }}>{a.level}</span>
              </div>
              <p className="mt-0.5 text-[12px] text-[var(--ink-dim)]">{a.text}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

/* ---------------- 外部系统对接 ---------------- */
function ApiTab() {
  const [systems, setSystems] = useState([
    { name: '厂内水务系统', kind: '厂内水务系统', proto: 'RESTful API/HTTPS', url: 'https://10.x.x.x:8443/api/v1/hydro/realtime', poll: 10, status: '未测试', enabled: true },
    { name: '平板阀门控制系统', kind: '平板阀门控制系统', proto: 'Modbus TCP(经网关)', url: 'http://192.168.x.x:502/gateway/gates', poll: 5, status: '未测试', enabled: true },
    { name: '水情监控系统(水调自动化)', kind: '水情监控系统', proto: 'RESTful API/HTTPS', url: 'https://10.x.x.x:8443/api/v1/telemetry', poll: 15, status: '未测试', enabled: false },
    { name: '气象数据服务(外网穿透)', kind: '气象数据服务', proto: '正向隔离穿透通道', url: 'https://weather-api.example.com/grid/forecast', poll: 7200, status: '未测试', enabled: true },
  ]);
  const templates = [
    { name: '厂内水务系统·标准REST接入', desc: '推荐：HTTPS+Token鉴权，10s轮询实时水情', proto: 'RESTful API/HTTPS' },
    { name: '平板阀门控制系统·Modbus网关接入', desc: '闸房LCU为Modbus TCP，经厂内采集网关转JSON后接入', proto: 'Modbus TCP(经网关)' },
    { name: '水情监控系统·REST接入', desc: '对接水调自动化系统历史+实时数据库', proto: 'RESTful API/HTTPS' },
    { name: '气象服务·正向隔离穿透接入', desc: '外网气象→正向隔离装置→安全II区入库，每日≥2次', proto: '正向隔离穿透通道' },
  ];
  return (
    <div className="space-y-3">
      <Panel>
        <SectionTitle>一键接入（按厂内系统预置模板，创建后完善地址即可启用）</SectionTitle>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {templates.map((t) => (
            <button
              key={t.name}
              onClick={() => {
                setSystems([...systems, { name: t.name, kind: t.name, proto: t.proto, url: '', poll: 10, status: '未测试', enabled: false }]);
                toast.success('已按模板创建对接配置，请完善接口地址');
              }}
              className="rounded border border-[var(--line)] p-3 text-left transition-colors hover:border-[rgba(34,211,238,.4)] hover:bg-[rgba(34,211,238,.05)]"
            >
              <div className="text-[12.5px] font-medium text-[var(--ink)]">{t.name}</div>
              <div className="mt-1 text-[11px] text-[var(--ink-faint)]">{t.desc}</div>
              <div className="num mt-1.5 text-[10px] text-[var(--cyan)]">{t.proto}</div>
            </button>
          ))}
        </div>
        <button onClick={() => toast.info('手动录入API：请在对接系统管理中新增（演示）')}
          className="mt-3 rounded border border-dashed border-[var(--line)] px-4 py-2 text-[12px] text-[var(--ink-dim)] hover:border-[var(--cyan)] hover:text-[var(--cyan)]">
          + 手动录入API
        </button>
      </Panel>

      <Panel pad={false}>
        <div className="border-b border-[var(--line)] p-3">
          <span className="label-caps">对接系统管理（启用的连接将在「真机模式」下参与数据轮询）</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr><Th>系统名称</Th><Th>类别</Th><Th>接入方式</Th><Th>接口地址</Th><Th>轮询</Th><Th>状态</Th><Th>启用</Th><Th>操作</Th></tr>
            </thead>
            <tbody>
              {systems.map((sys, i) => (
                <tr key={i} className="hover:bg-[rgba(17,26,43,.5)]">
                  <Td mono={false}>{sys.name}</Td>
                  <Td mono={false} className="text-[var(--ink-dim)]">{sys.kind}</Td>
                  <Td className="text-[var(--cyan)]">{sys.proto}</Td>
                  <Td className="text-[var(--ink-faint)]">{sys.url || '—'}</Td>
                  <Td>{sys.poll}s</Td>
                  <Td mono={false}><Pill color={sys.status === '正常' ? 'var(--mint)' : 'var(--ink-faint)'}>{sys.status}</Pill></Td>
                  <Td mono={false}>
                    <button
                      onClick={() => {
                        const next = [...systems];
                        next[i] = { ...sys, enabled: !sys.enabled };
                        setSystems(next);
                      }}
                      className={`relative h-5 w-9 rounded-full transition-colors ${sys.enabled ? 'bg-[rgba(34,211,238,.5)]' : 'bg-[#1a2540]'}`}
                    >
                      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-[var(--ink)] transition-all ${sys.enabled ? 'left-4.5 left-[18px]' : 'left-0.5'}`} />
                    </button>
                  </Td>
                  <Td mono={false}>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const next = [...systems];
                          next[i] = { ...sys, status: '正常' };
                          setSystems(next);
                          toast.success(`${sys.name} 连通性测试通过`);
                        }}
                        className="rounded border border-[var(--line)] px-2.5 py-1 text-[11px] text-[var(--ink-dim)] hover:border-[var(--mint)] hover:text-[var(--mint)]"
                      >
                        测试
                      </button>
                      <button
                        onClick={() => toast.info('编辑对接配置（演示）')}
                        className="rounded border border-[var(--line)] px-2.5 py-1 text-[11px] text-[var(--ink-dim)] hover:border-[var(--cyan)] hover:text-[var(--cyan)]"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => { setSystems(systems.filter((_, x) => x !== i)); toast.success('已删除'); }}
                        className="rounded border border-[var(--line)] px-2.5 py-1 text-[11px] text-[var(--ink-dim)] hover:border-[var(--red)] hover:text-[var(--red)]"
                      >
                        删除
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel>
        <SectionTitle>接入方式建议</SectionTitle>
        <ul className="space-y-1.5 text-[12px] leading-relaxed text-[var(--ink-dim)]">
          <li><b className="text-[var(--ink)]">厂内水务/水情监控系统</b>：推荐 RESTful API（HTTPS+Token），部署于安全II区服务端代理转发，10~15s轮询；</li>
          <li><b className="text-[var(--ink)]">平板阀门控制系统（闸房LCU）</b>：原生 Modbus TCP，不建议Web直连，经厂内采集网关转JSON REST后接入，5s级刷新；</li>
          <li><b className="text-[var(--ink)]">气象数据服务（外网）</b>：经正向隔离装置穿透至安全II区入库，本系统仅从内网库读取，每日≥2次，不做内外网直连；</li>
          <li><b className="text-[var(--ink)]">历史/批量数据</b>：推荐数据库视图（只读账号）或MQTT/Kafka订阅，避免高频轮询压垮源系统；接口频率≤5000次/天、报文≤2M。</li>
        </ul>
        <p className="mt-3 border-t border-[#141d33] pt-2 text-[11px] text-[var(--ink-faint)]">
          接口规范：请求频率 ≤5000次/天 或 300次/小时；单次报文 ≤2M；外网接口 HTTPS+身份验证，敏感数据加密；有序接口保证容错与幂等。调用失败/超时自动提醒并记入行为日志。
        </p>
      </Panel>
    </div>
  );
}

/* ---------------- 系统设置 ---------------- */
function SettingsTab() {
  const [cfg, setCfg] = useState({
    NORMAL: CONST.NORMAL, DEAD: CONST.DEAD, WARN: CONST.WARN,
    DANGER: CONST.DANGER, MIN_RELEASE: CONST.MIN_RELEASE, MAX_STEP: CONST.MAX_STEP,
  });
  const items: { key: keyof typeof cfg; label: string; unit: string }[] = [
    { key: 'NORMAL', label: '正常蓄水位', unit: 'm' },
    { key: 'DEAD', label: '死水位', unit: 'm' },
    { key: 'WARN', label: '预警水位', unit: 'm' },
    { key: 'DANGER', label: '危险水位', unit: 'm' },
    { key: 'MIN_RELEASE', label: '下游最小放水流量', unit: 'm³/s' },
    { key: 'MAX_STEP', label: '单次闸位调整步长', unit: 'm' },
  ];
  return (
    <div className="space-y-3">
      <Panel>
        <SectionTitle>系统基础参数配置</SectionTitle>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((it) => (
            <div key={it.key}>
              <label className="label-caps mb-1.5 block">{it.label} ({it.unit})</label>
              <input
                type="number"
                step={it.key === 'MAX_STEP' ? 0.1 : 0.1}
                value={cfg[it.key]}
                onChange={(e) => setCfg({ ...cfg, [it.key]: Number(e.target.value) })}
                className="w-full rounded border border-[var(--line)] bg-[rgba(5,8,16,.6)] px-3 py-2 text-[13px] text-[var(--ink)] outline-none focus:border-[var(--cyan)]"
              />
            </div>
          ))}
        </div>
        <button
          onClick={() => {
            Object.assign(CONST, cfg);
            saveCfg();
            toast.success('参数已保存并实时生效（作用于闸位优化与安全校核）');
          }}
          className="mt-4 rounded bg-[rgba(34,211,238,.14)] px-4 py-2 text-[12px] font-medium text-[var(--cyan)] hover:bg-[rgba(34,211,238,.24)]"
        >
          保存并生效
        </button>
        <p className="mt-3 text-[11px] text-[var(--ink-faint)]">
          参数实时生效并作用于闸位优化与安全校核；系统日志（接口调用/设备运行/异常日志）支持查询与定期清理。
        </p>
      </Panel>
    </div>
  );
}
