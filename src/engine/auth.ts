// 账号与权限（演示环境：数据保存在浏览器 localStorage）
export type Role = '超级管理员' | '管理员' | '普通操作员';

export interface User {
  username: string;
  password: string;
  role: Role;
  status: '正常' | '冻结';
  lastLogin: string;
}

const USERS_KEY = 'ld_users_v3';
const SESSION_KEY = 'ld_session_v3';

const DEFAULT_USERS: User[] = [
  { username: 'admin', password: 'admin123', role: '超级管理员', status: '正常', lastLogin: '2026-07-27 09:12' },
  { username: 'manager', password: 'manager123', role: '管理员', status: '正常', lastLogin: '2026-07-27 08:45' },
  { username: 'operator', password: 'op123', role: '普通操作员', status: '正常', lastLogin: '2026-07-26 22:03' },
  { username: 'diaodu01', password: 'dd123456', role: '普通操作员', status: '冻结', lastLogin: '2026-07-20 14:30' },
];

export function loadUsers(): User[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
  return [...DEFAULT_USERS];
}

export function saveUsers(users: User[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function getSession(): User | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const { username } = JSON.parse(raw);
    const u = loadUsers().find((x) => x.username === username);
    return u && u.status === '正常' ? u : null;
  } catch {
    return null;
  }
}

export function login(username: string, password: string): { ok: boolean; msg: string; user?: User } {
  const users = loadUsers();
  const u = users.find((x) => x.username === username);
  if (!u) return { ok: false, msg: '用户不存在，请检查用户名' };
  if (u.status === '冻结') return { ok: false, msg: '账号已冻结，请联系超级管理员解冻' };
  if (u.password !== password) return { ok: false, msg: '密码错误，请重新输入' };
  u.lastLogin = new Date().toLocaleString('zh-CN', { hour12: false }).replaceAll('/', '-');
  saveUsers(users);
  localStorage.setItem(SESSION_KEY, JSON.stringify({ username }));
  return { ok: true, msg: '登录成功', user: u };
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

// 权限：操作类（闸门/机组/工况）需管理员及以上；后台管理仅超级管理员
export function canOperate(u: User | null) {
  return !!u && (u.role === '超级管理员' || u.role === '管理员');
}
export function canManage(u: User | null) {
  return !!u && u.role === '超级管理员';
}
