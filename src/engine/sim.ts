// 泸定水电站 · 内置演示数据引擎
// 单例仿真：每 1s（真实时间）推进 1min（仿真时间），驱动大屏与后台全部模块联动。

// 系统基础参数（后台「系统设置」可修改，实时生效并持久化到 localStorage）
export const CONST = {
  NORMAL: 1378, // 正常蓄水位
  DEAD: 1375, // 死水位
  WARN: 1379.2, // 预警水位
  DANGER: 1380.5, // 危险水位
  MIN_RELEASE: 150, // 下游最小放水流量 m³/s
  MAX_STEP: 0.5, // 单次闸位调整步长 m
  VIB_ZONE: 0.3, // 小开度振动区阈值
  UNIT_RATED: 230, // 单机容量 MW
  MAX_GEN_FLOW: 1650, // 最大发电引用流量 m³/s
  SURFACE: 3.2e6, // 库区水面面积 m²（用于水位演算）
};

const CFG_KEY = 'ld_cfg_v3';
(function loadCfg() {
  try {
    const raw = localStorage.getItem(CFG_KEY);
    if (raw) Object.assign(CONST, JSON.parse(raw));
  } catch {
    /* ignore */
  }
})();
export function saveCfg() {
  localStorage.setItem(CFG_KEY, JSON.stringify(CONST));
}

export type GateMode = 'level' | 'power' | 'minchange' | 'minops' | 'balance';
export const MODE_LABEL: Record<GateMode, string> = {
  level: '水位稳定',
  power: '发电量最大',
  minchange: '下泄变幅最小',
  minops: '操作次数最少',
  balance: '闸门流量均衡',
};
export const MODE_DESC: Record<GateMode, string> = {
  level: '出入库平衡，维持库水位不变',
  power: '非预警水位下关闭泄洪，来水全部发电',
  minchange: '限制下游流量小时变幅',
  minops: '偏差带内不操作，减少启闭次数',
  balance: '多孔对称均衡泄流，减小闸墩振动',
};

export interface Gate {
  id: 1 | 2 | 3;
  name: string;
  side: string;
  type: string;
  width: number; // 孔口宽 m
  height: number; // 孔口高 m
  sill: number; // 底板高程 m
  mu: number; // 流量系数
  opening: number; // 当前开度 m
  recommended: number; // AI 推荐开度 m
  flow: number; // 过闸流量 m³/s
  vibration: number; // 闸墩振动 μm
  maxOpening: number;
}

export interface Unit {
  id: number;
  on: boolean;
  power: number; // MW
  flow: number; // m³/s
  eta: number; // 效率
}

export interface Alarm {
  id: number;
  time: string;
  level: '预警' | '告警' | '信息';
  text: string;
}

export interface HistPoint {
  t: number;
  level: number;
  inflow: number;
  outflow: number;
  rain: number;
}

export interface ForecastHour {
  t: number;
  q: number;
  lo: number;
  hi: number;
  rain: number;
}
export interface ForecastDay {
  date: string;
  rain: number;
  q: number;
  lo: number;
  hi: number;
}

export interface WeatherHour {
  t: number;
  step: 1 | 3 | 6;
  rain: number;
  temp: number;
  humidity: number;
  wind: number;
  cloud: number;
  solar: number;
}
export interface WeatherDay {
  date: string;
  tMax: number;
  tMin: number;
  rain: number;
  cloud: number;
  wind: number;
}

export interface EvalRow {
  at: string;
  target: string;
  rmse: number;
  mape: number;
  pass: number;
  samples: number;
}

export interface DecisionLog {
  at: string;
  mode: string;
  text: string;
}

export interface DispatchHour {
  label: string;
  inflow: number;
  genFlow: number;
  spill: number;
  level: number;
  power: number;
}
export interface DispatchDay {
  date: string;
  inflow: number;
  genFlow: number;
  spill: number;
  power: number;
  energy: number; // 万kWh
  endLevel: number;
}

export interface SimState {
  now: number; // 仿真时钟 ms
  level: number;
  tailLevel: number;
  inflow: number;
  outflow: number;
  genFlow: number;
  spill: number;
  power: number;
  temp: number;
  humidity: number;
  wind: number;
  rain24h: number;
  mode: GateMode;
  gates: Gate[];
  units: Unit[];
  alarms: Alarm[];
  hist: HistPoint[];
  forecast24: ForecastHour[];
  forecast10d: ForecastDay[];
  weatherHourly: WeatherHour[];
  weatherDaily: WeatherDay[];
  evalRows: EvalRow[];
  decisions: DecisionLog[];
  dispatchHourly: DispatchHour[];
  dispatchDaily: DispatchDay[];
  weights: { level: number; benefit: number; energy: number };
  lastForecastAt: string;
  sensorFault: Record<string, boolean>; // true=离线
}

// ---------- deterministic rng ----------
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const fmt2 = (v: number) => Math.round(v * 100) / 100;
const pad = (n: number) => String(n).padStart(2, '0');

export function fmtTime(ms: number) {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
export function fmtHM(ms: number) {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function fmtDate(ms: number) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function fmtMD(ms: number) {
  const d = new Date(ms);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// 弧门过流：Q = μ·b·e·√(2gH)
export function gateFlow(g: Pick<Gate, 'mu' | 'width' | 'sill'>, opening: number, level: number) {
  const H = Math.max(0.5, level - g.sill);
  return g.mu * g.width * opening * Math.sqrt(2 * 9.81 * H);
}
// 反推开度 e = Q / (μ·b·√(2gH))
function openingForFlow(g: Gate, q: number, level: number) {
  const H = Math.max(0.5, level - g.sill);
  return q / (g.mu * g.width * Math.sqrt(2 * 9.81 * H));
}

class Engine {
  state: SimState;
  private listeners = new Set<() => void>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private rng: () => number;
  private alarmSeq = 1;
  private tickCount = 0;

  constructor() {
    const daySeed = Number(new Date().toISOString().slice(0, 10).replace(/-/g, ''));
    this.rng = mulberry32(daySeed);
    this.state = this.initState();
  }

  // ---------- init ----------
  private initState(): SimState {
    const now = Date.now();
    const gates: Gate[] = [
      { id: 1, name: '1号泄洪洞弧门', side: '左岸', type: '有压洞', width: 10, height: 8, sill: 1322, mu: 0.88, opening: 0, recommended: 0, flow: 0, vibration: 12, maxOpening: 3 },
      { id: 2, name: '2号泄洪洞弧门', side: '右岸', type: '无压洞', width: 12, height: 9, sill: 1315, mu: 0.9, opening: 0.5, recommended: 0.5, flow: 0, vibration: 22, maxOpening: 3 },
      { id: 3, name: '3号泄洪洞弧门', side: '右岸', type: '无压洞', width: 12, height: 9, sill: 1315, mu: 0.9, opening: 0, recommended: 0, flow: 0, vibration: 14, maxOpening: 3 },
    ];
    const units: Unit[] = [1, 2, 3, 4].map((id) => ({
      id,
      on: id !== 4,
      power: 0,
      flow: 0,
      eta: 0.928 + this.rng() * 0.004,
    }));

    // 传感器故障分布（对齐原站：约 11 离线）
    const offlineIds = [
      'WL-UP-01', 'WL-UP-02', 'RG-01', 'FL-UP-01', 'DP-G1-01', 'PR-G1-01',
      'DP-G2-01', 'ENC-G2-01', 'OP-G2-01', 'WL-DN-01', 'FL-GN-02',
    ];
    const sensorFault: Record<string, boolean> = {};
    offlineIds.forEach((id) => (sensorFault[id] = true));

    const s: SimState = {
      now,
      level: 1377.6,
      tailLevel: 1318.7,
      inflow: 1050,
      outflow: 0,
      genFlow: 0,
      spill: 0,
      power: 0,
      temp: 13.1,
      humidity: 55,
      wind: 2,
      rain24h: 9.1,
      mode: 'level',
      gates,
      units,
      alarms: [],
      hist: [],
      forecast24: [],
      forecast10d: [],
      weatherHourly: [],
      weatherDaily: [],
      evalRows: [],
      decisions: [],
      dispatchHourly: [],
      dispatchDaily: [],
      weights: { level: 40, benefit: 35, energy: 25 },
      lastForecastAt: '',
      sensorFault,
    };

    this.state = s;
    this.hydraulics();
    this.genWeather();
    this.genForecast(false);
    this.backfillHist();
    this.pushAlarm('信息', '智慧化上下游水情控制系统初始化完成，进入演示仿真模式（数据引擎内置）');
    this.pushAlarm('预警', 'FL-UP-01 库区·入库断面流量 离线，请检查RS485通信链路');
    return s;
  }

  // 回填 24h × 5min 历史
  private backfillHist() {
    const pts: HistPoint[] = [];
    let level = 1376.9 + this.rng() * 0.3;
    let inflow = 980 + this.rng() * 120;
    for (let i = 288; i >= 0; i--) {
      const t = this.state.now - i * 5 * 60_000;
      inflow += (this.rng() - 0.48) * 18;
      inflow = clamp(inflow, 850, 1250);
      const out = inflow + (this.rng() - 0.5) * 60;
      level += (inflow - out) * 300 / CONST.SURFACE + (this.rng() - 0.5) * 0.01;
      level = clamp(level, 1376.8, 1378.1);
      pts.push({ t, level: fmt2(level), inflow: Math.round(inflow), outflow: Math.round(out), rain: 0 });
    }
    pts[pts.length - 1].level = this.state.level;
    this.state.hist = pts;
  }

  // ---------- 气象 ----------
  private genWeather() {
    const rng = mulberry32(Number(new Date().toISOString().slice(0, 10).replace(/-/g, '')) + 7);
    const now = this.state.now;
    const hourly: WeatherHour[] = [];
    // 构造一场 30h 后的降雨过程 + 第7天强降雨
    const rainAt = (h: number) => {
      let r = 0;
      if (h >= 21 && h <= 39) r = Math.sin(((h - 21) / 18) * Math.PI) * 6.2;
      if (h >= 148 && h <= 172) r = Math.sin(((h - 148) / 24) * Math.PI) * 26;
      return fmt2(Math.max(0, r + (rng() - 0.5) * 0.4));
    };
    for (let h = 0; h < 240; ) {
      const step: 1 | 3 | 6 = h < 90 ? 1 : h < 144 ? 3 : 6;
      const t = now + h * 3600_000;
      const d = new Date(t);
      const hour = d.getHours();
      const diurnal = Math.sin(((hour - 9) / 24) * 2 * Math.PI);
      const raining = rainAt(h);
      const temp = fmt2(19 + 6.5 * diurnal - (raining > 0.5 ? 4 : 0) + (rng() - 0.5) * 1.2);
      hourly.push({
        t, step,
        rain: raining,
        temp,
        humidity: Math.round(clamp(58 + (raining > 0.3 ? 38 : 0) - diurnal * 8 + (rng() - 0.5) * 4, 40, 99)),
        wind: fmt2(clamp(2.6 + (raining > 0.3 ? raining * 0.45 : 0) + (rng() - 0.5) * 0.8, 0.5, 26)),
        cloud: Math.round(clamp(38 + raining * 11 + (rng() - 0.5) * 6, 5, 100)),
        solar: raining > 0.5 ? Math.round(42 * Math.max(0, diurnal)) : Math.round(600 * Math.max(0, diurnal)),
      });
      h += step;
    }
    this.state.weatherHourly = hourly;

    const daily: WeatherDay[] = [];
    for (let d = 0; d < 40; d++) {
      const t = now + d * 86400_000;
      let rain = 0;
      if (d === 1) rain = 9.1;
      if (d === 3) rain = 13.9;
      if (d === 4) rain = 22.5;
      if (d === 6) rain = 14.2;
      if (d === 7) rain = 19.1;
      if (d === 10) rain = 24.7;
      rain = fmt2(Math.max(0, rain + (rng() - 0.5) * 2));
      daily.push({
        date: fmtMD(t),
        tMax: Math.round(26 + (rng() - 0.5) * 3 - (rain > 5 ? 2 : 0)),
        tMin: Math.round(14 + (rng() - 0.5) * 2 - (rain > 5 ? 1.5 : 0)),
        rain,
        cloud: Math.round(clamp(35 + rain * 3 + (rng() - 0.5) * 8, 8, 100)),
        wind: fmt2(clamp(2.4 + rain * 0.3 + (rng() - 0.5) * 0.8, 1, 14)),
      });
    }
    this.state.weatherDaily = daily;
    this.state.rain24h = fmt2(hourly.slice(0, 24).reduce((a, b) => a + b.rain, 0));
  }

  // ---------- 来水预测（降雨-径流耦合 + 梯级传播 + AI残差校正） ----------
  genForecast(log = true) {
    const rng = this.rng;
    const now = this.state.now;
    const f24: ForecastHour[] = [];
    const base = this.state.inflow;
    for (let h = 1; h <= 24; h++) {
      const rain = this.state.weatherHourly[h]?.rain ?? 0;
      const trend = -3.2 * h + rain * 26 * Math.min(1, h / 6); // 降雨滞后汇流
      const q = Math.round(base + trend + Math.sin(h / 3.1) * 18 + (rng() - 0.5) * 12);
      const width = Math.round(58 + h * 8.6);
      f24.push({ t: now + h * 3600_000, q, lo: q - width, hi: q + width, rain });
    }
    this.state.forecast24 = f24;

    const f10: ForecastDay[] = [];
    const rains = this.state.weatherDaily.map((w) => w.rain);
    this.state.weatherDaily.slice(0, 10).forEach((w, i) => {
      // 降雨-径流：滞后权重（0~3 天退水过程），避免流量随单日降雨跳变
      let rainQ = 0;
      const lagW = [0.52, 0.28, 0.13, 0.07];
      for (let j = 0; j <= i; j++) rainQ += rains[j] * 100 * (lagW[i - j] ?? 0.04);
      const q = Math.round(1240 + i * 78 + rainQ + (rng() - 0.5) * 30);
      const width = Math.round(130 * Math.pow(1.34, i));
      f10.push({ date: w.date, rain: w.rain, q, lo: Math.max(0, q - width), hi: q + width });
    });
    this.state.forecast10d = f10;

    // 精度评估历史
    const rows: EvalRow[] = [];
    for (let i = 0; i < 12; i++) {
      const at = new Date(now - Math.floor(i / 2) * 3600_000 - (i % 2) * 21 * 60_000);
      const atStr = `${fmtDate(at.getTime())} ${fmtHM(at.getTime())}`;
      rows.push({
        at: atStr,
        target: i % 2 === 0 ? '24小时逐时' : '10天逐日',
        rmse: fmt2(30 + rng() * 16),
        mape: fmt2(4.7 + rng() * 2.6),
        pass: fmt2(88 + rng() * 8),
        samples: i % 2 === 0 ? 720 : 300,
      });
    }
    this.state.evalRows = rows;
    this.state.lastForecastAt = `${fmtDate(now)} ${fmtHM(now)}`;
    this.genDispatch();
    if (log) {
      this.pushAlarm('信息', `来水预测模型 LD-RF v2.3 完成滚动重算（LSTM+XGBoost 残差校正），24h 平均来水 ${this.avg24()} m³/s`);
      this.logDecision(`预测模型滚动重算完成：未来24h平均入库约 ${this.avg24()} m³/s，10天趋势${f10[9].q > f10[0].q ? '上涨' : '回落'}。`);
    }
  }

  avg24() {
    const f = this.state.forecast24;
    return Math.round(f.reduce((a, b) => a + b.q, 0) / Math.max(1, f.length));
  }

  // ---------- 发电优化调度推演 ----------
  private genDispatch() {
    const s = this.state;
    const hourly: DispatchHour[] = [];
    let level = s.level;
    for (let h = 1; h <= 24; h++) {
      const f = s.forecast24[h - 1];
      const d = new Date(f.t);
      const hour = d.getHours();
      // 日内峰谷：晚峰 18-22 优先保供
      const peak = hour >= 18 && hour <= 22 ? 1.0 : hour >= 7 && hour <= 11 ? 0.86 : 0.72;
      let genFlow = Math.min(CONST.MAX_GEN_FLOW, f.q, Math.round(CONST.MAX_GEN_FLOW * (0.55 + 0.45 * peak)));
      let spill = 0;
      const projected = level + ((f.q - genFlow) * 3600) / CONST.SURFACE;
      if (projected > CONST.WARN) {
        spill = Math.round(((projected - CONST.WARN) * CONST.SURFACE) / 3600);
        spill = Math.min(spill, f.q - CONST.MIN_RELEASE);
      }
      level = fmt2(level + ((f.q - genFlow - spill) * 3600) / CONST.SURFACE);
      const head = level - s.tailLevel;
      const power = Math.round((9.81 * 0.925 * genFlow * head) / 1000);
      hourly.push({ label: fmtHM(f.t), inflow: f.q, genFlow, spill, level, power });
    }
    s.dispatchHourly = hourly;

    const daily: DispatchDay[] = [];
    let lvl = s.level;
    s.forecast10d.forEach((f) => {
      const genFlow = Math.min(CONST.MAX_GEN_FLOW, f.q);
      let spill = 0;
      const projected = lvl + ((f.q - genFlow) * 86400) / CONST.SURFACE;
      if (projected > CONST.WARN) spill = Math.round(((projected - CONST.WARN) * CONST.SURFACE) / 86400);
      lvl = fmt2(clamp(lvl + ((f.q - genFlow - spill) * 86400) / CONST.SURFACE, CONST.DEAD, CONST.WARN + 0.5));
      const head = lvl - s.tailLevel;
      const power = Math.round((9.81 * 0.925 * genFlow * head) / 1000);
      daily.push({ date: f.date, inflow: f.q, genFlow, spill, power, energy: Math.round((power * 24) / 10), endLevel: lvl });
    });
    s.dispatchDaily = daily;
  }

  // ---------- 水力计算（每 tick） ----------
  private hydraulics() {
    const s = this.state;
    s.gates.forEach((g) => {
      g.flow = Math.round(gateFlow(g, g.opening, s.level));
      const inVibZone = g.opening > 0 && g.opening < CONST.VIB_ZONE;
      g.vibration = Math.round(clamp(11 + (inVibZone ? 26 * (CONST.VIB_ZONE - g.opening) * 10 : g.opening * 3) + this.rng() * 6, 8, 60));
    });
    s.spill = s.gates.reduce((a, g) => a + g.flow, 0);
    s.units.forEach((u) => {
      if (!u.on) {
        u.flow = 0; u.power = 0; u.eta = 0;
      } else {
        u.flow = Math.round(278 + this.rng() * 12);
        const head = s.level - s.tailLevel;
        u.power = Math.round((9.81 * u.eta * u.flow * head) / 1000);
      }
    });
    s.genFlow = s.units.reduce((a, u) => a + u.flow, 0);
    s.outflow = s.genFlow + s.spill;
    s.power = s.units.reduce((a, u) => a + u.power, 0);
    s.tailLevel = fmt2(1316.9 + s.outflow * 0.0016);
  }

  // ---------- AI 闸位推荐 ----------
  private recommend(): number[] {
    const s = this.state;
    let targetSpill: number;
    switch (s.mode) {
      case 'power':
        targetSpill = s.level > CONST.NORMAL - 0.2 ? Math.max(0, s.inflow - s.genFlow) : 0;
        break;
      case 'minchange':
        targetSpill = clamp(s.inflow - s.genFlow, s.spill - 100, s.spill + 100);
        targetSpill = Math.max(0, targetSpill);
        break;
      case 'minops':
        targetSpill = Math.abs(s.inflow - s.genFlow - s.spill) > 60 ? Math.max(0, s.inflow - s.genFlow) : s.spill;
        break;
      default:
        targetSpill = Math.max(0, s.inflow - s.genFlow);
    }

    const order: Gate[] = [s.gates[1], s.gates[2], s.gates[0]]; // 开启顺序 2→3→1
    const rec: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
    let rest = targetSpill;
    if (s.mode === 'balance' && rest > 0) {
      // 2/3 号对称分配，1 号补充
      const per = rest / 2;
      for (const g of [s.gates[1], s.gates[2]]) {
        let e = clamp(openingForFlow(g, per, s.level), 0, g.maxOpening);
        if (e < CONST.VIB_ZONE) e = e < 0.15 ? 0 : CONST.VIB_ZONE;
        rec[g.id] = fmt2(e);
        rest -= gateFlow(g, rec[g.id], s.level);
      }
      if (rest > 20) {
        let e = clamp(openingForFlow(s.gates[0], rest, s.level), 0, s.gates[0].maxOpening);
        if (e < CONST.VIB_ZONE) e = e < 0.15 ? 0 : CONST.VIB_ZONE;
        rec[1] = fmt2(e);
      }
    } else {
      for (const g of order) {
        if (rest <= 8) { rec[g.id] = 0; continue; }
        let e = clamp(openingForFlow(g, rest, s.level), 0, g.maxOpening);
        if (e > 0 && e < CONST.VIB_ZONE) e = CONST.VIB_ZONE; // 避开小开度振动区
        rec[g.id] = fmt2(e);
        rest -= gateFlow(g, rec[g.id], s.level);
      }
    }
    return [rec[1], rec[2], rec[3]];
  }

  // 执行推荐后 24h 库水位推演
  projectLevels(): { label: string; level: number }[] {
    const s = this.state;
    const recs = this.state.gates.map((g) => g.recommended);
    const spillQ = s.gates.reduce((a, g, i) => a + gateFlow(g, recs[i], s.level), 0);
    let lvl = s.level;
    const out: { label: string; level: number }[] = [{ label: '现在', level: fmt2(lvl) }];
    for (let h = 1; h <= 24; h++) {
      const q = s.forecast24[h - 1]?.q ?? s.inflow;
      lvl += ((q - s.genFlow - spillQ) * 3600) / CONST.SURFACE;
      out.push({ label: `+${h}h`, level: fmt2(lvl) });
    }
    return out;
  }

  // ---------- 主循环 ----------
  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), 1000);
  }
  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private tick() {
    const s = this.state;
    s.now += 1000; // 时钟实时；物理演化按 60s/步 加速（演示仿真）
    this.tickCount++;

    // 入库流量：缓变 + 噪声
    s.inflow = clamp(s.inflow + (this.rng() - 0.495) * 6, 860, 1280);

    // 闸门向推荐值微动（演示联动）
    const rec = this.recommend();
    s.gates.forEach((g, i) => {
      g.recommended = rec[i];
      // 无人工干预时缓慢跟踪推荐（minops 模式不自动跟踪）
      if (s.mode !== 'minops' && Math.abs(g.opening - g.recommended) > 0.02) {
        const d = clamp(g.recommended - g.opening, -0.02, 0.02);
        g.opening = fmt2(g.opening + d);
      }
    });

    // 气象实况：由预报第一帧插值 + 噪声
    const w0 = s.weatherHourly[0];
    if (w0) {
      s.temp = fmt2(w0.temp + (this.rng() - 0.5) * 0.3);
      s.humidity = w0.humidity;
      s.wind = w0.wind;
    }

    this.hydraulics();

    // 水位演进（每 tick = 60s）
    s.level = fmt2(clamp(s.level + ((s.inflow - s.outflow) * 60) / CONST.SURFACE, CONST.DEAD - 0.4, CONST.DANGER + 0.3));

    // 历史曲线：每 5 tick 落一点
    if (this.tickCount % 5 === 0) {
      s.hist.push({ t: s.now, level: s.level, inflow: Math.round(s.inflow), outflow: Math.round(s.outflow), rain: 0 });
      if (s.hist.length > 289) s.hist.shift();
      // 预报曲线同步滑动
      s.forecast24.shift();
      const last = s.forecast24[s.forecast24.length - 1];
      if (last) {
        const h = 24;
        const q = Math.round(last.q + (this.rng() - 0.5) * 14);
        const width = Math.round(58 + h * 8.6);
        s.forecast24.push({ t: last.t + 3600_000, q, lo: q - width, hi: q + width, rain: 0 });
      }
    }

    // 随机事件
    if (this.tickCount % 977 === 900) {
      this.pushAlarm('预警', 'RG-01 坝区雨量站通信超时 3 个周期，已自动切换备用通道');
    }
    if (s.level > CONST.WARN && this.tickCount % 60 === 0) {
      this.pushAlarm('告警', `库水位 ${s.level.toFixed(2)}m 越过预警水位 ${CONST.WARN}m，请按防汛预案处置`);
    }

    this.emit();
  }

  // ---------- actions ----------
  setGateOpening(id: number, v: number) {
    const g = this.state.gates.find((x) => x.id === id);
    if (!g) return;
    const delta = clamp(v, 0, g.maxOpening) - g.opening;
    const step = clamp(delta, -CONST.MAX_STEP, CONST.MAX_STEP);
    g.opening = fmt2(g.opening + step);
    this.hydraulics();
    this.pushAlarm('信息', `${g.name} 人工干预：开度调整至 ${g.opening.toFixed(2)}m（步长限制 ≤${CONST.MAX_STEP}m）`);
    this.emit();
  }

  applyRecommendation() {
    const s = this.state;
    s.gates.forEach((g) => (g.opening = g.recommended));
    this.hydraulics();
    this.pushAlarm('信息', `已按 AI 建议执行闸位调整（${MODE_LABEL[s.mode]} 工况）`);
    this.logDecision(`运行人员确认执行 AI 闸位建议：1号 ${s.gates[0].recommended}m / 2号 ${s.gates[1].recommended}m / 3号 ${s.gates[2].recommended}m。`);
    this.emit();
  }

  setMode(m: GateMode) {
    this.state.mode = m;
    this.pushAlarm('信息', `闸门操作工况切换为「${MODE_LABEL[m]}」：${MODE_DESC[m]}`);
    this.emit();
  }

  toggleUnit(id: number) {
    const u = this.state.units.find((x) => x.id === id);
    if (!u) return;
    u.on = !u.on;
    this.hydraulics();
    this.pushAlarm('信息', `${id}号机组 ${u.on ? '并网发电' : '解列停机'}（演示操作，已记入行为日志）`);
    this.emit();
  }

  importRain(mm: number) {
    // 人工导入降雨：叠加到未来 12~30h 预报
    for (let h = 12; h <= 30 && h < this.state.weatherHourly.length; h++) {
      this.state.weatherHourly[h].rain = fmt2(this.state.weatherHourly[h].rain + (mm / 18) * Math.sin(((h - 12) / 18) * Math.PI));
    }
    this.state.rain24h = fmt2(this.state.weatherHourly.slice(0, 24).reduce((a, b) => a + b.rain, 0));
    this.genForecast(false);
    this.pushAlarm('信息', `人工导入降雨数据 ${mm}mm，已完成汇流演算与预测重算`);
    this.emit();
  }

  setWeights(w: { level: number; benefit: number; energy: number }) {
    this.state.weights = w;
    this.genDispatch();
    this.emit();
  }

  pushReport() {
    this.pushAlarm('信息', '调度推演报表已推送至厂内水务系统与集控中心（演示）');
    this.emit();
  }

  private logDecision(text: string) {
    const s = this.state;
    s.decisions.unshift({ at: `${fmtDate(s.now)} ${fmtHM(s.now)}`, mode: MODE_LABEL[s.mode], text });
    if (s.decisions.length > 20) s.decisions.pop();
  }

  pushAlarm(level: Alarm['level'], text: string) {
    const s = this.state;
    s.alarms.unshift({ id: this.alarmSeq++, time: fmtHM(s.now), level, text });
    if (s.alarms.length > 30) s.alarms.pop();
  }

  // ---------- pub/sub ----------
  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
  private emit() {
    this.listeners.forEach((fn) => fn());
  }
}

export const engine = new Engine();
engine.start();
