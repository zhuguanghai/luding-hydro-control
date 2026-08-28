import type { SimState } from '../engine/sim';

export interface SensorDef {
  id: string;
  name: string;
  area: '库区' | '1号泄洪洞' | '2号泄洪洞' | '3号泄洪洞' | '厂房';
  type: string;
  protocol: string;
  unit: string;
  read: (s: SimState) => number | null; // null=离线
}

export const SENSORS: SensorDef[] = [
  { id: 'WL-UP-01', name: '库区·坝前库水位', area: '库区', type: '雷达液位计', protocol: '4-20mA', unit: 'm', read: () => null },
  { id: 'WL-UP-02', name: '库区·库尾水位', area: '库区', type: '雷达液位计', protocol: 'RS485', unit: 'm', read: () => null },
  { id: 'RG-01', name: '库区·坝区雨量站', area: '库区', type: '雨量计', protocol: 'RS485', unit: 'mm', read: () => null },
  { id: 'RG-02', name: '库区·库区左岸雨量站', area: '库区', type: '雨量计', protocol: 'RS485', unit: 'mm', read: () => 0 },
  { id: 'FL-UP-01', name: '库区·入库断面流量', area: '库区', type: '流量计', protocol: 'Modbus-TCP', unit: 'm³/s', read: () => null },
  { id: 'DP-G1-01', name: '1号泄洪洞·1号弧门开度(左)', area: '1号泄洪洞', type: '拉绳位移', protocol: 'RS485', unit: 'm', read: () => null },
  { id: 'ENC-G1-01', name: '1号泄洪洞·1号弧门开度(右)', area: '1号泄洪洞', type: '多圈编码器', protocol: 'RS485', unit: 'm', read: (s) => s.gates[0].opening },
  { id: 'OP-G1-01', name: '1号泄洪洞·1号弧门综合开度', area: '1号泄洪洞', type: '闸门开度仪', protocol: 'RS485', unit: 'm', read: (s) => s.gates[0].opening },
  { id: 'PR-G1-01', name: '1号泄洪洞·1号洞进口水压', area: '1号泄洪洞', type: '压力传感器', protocol: '4-20mA', unit: 'MPa', read: () => null },
  { id: 'DP-G2-01', name: '2号泄洪洞·2号弧门开度(左)', area: '2号泄洪洞', type: '拉绳位移', protocol: 'RS485', unit: 'm', read: () => null },
  { id: 'ENC-G2-01', name: '2号泄洪洞·2号弧门开度(右)', area: '2号泄洪洞', type: '多圈编码器', protocol: 'RS485', unit: 'm', read: () => null },
  { id: 'OP-G2-01', name: '2号泄洪洞·2号弧门综合开度', area: '2号泄洪洞', type: '闸门开度仪', protocol: 'RS485', unit: 'm', read: () => null },
  { id: 'OP-G2-02', name: '2号泄洪洞·2号平板检修门开度', area: '2号泄洪洞', type: '闸门开度仪', protocol: 'RS485', unit: 'm', read: () => 9 },
  { id: 'WL-G2-01', name: '2号泄洪洞·2号洞闸前水位', area: '2号泄洪洞', type: '雷达液位计', protocol: 'RS485', unit: 'm', read: (s) => s.level + 0.14 },
  { id: 'DP-G3-01', name: '3号泄洪洞·3号弧门开度(左)', area: '3号泄洪洞', type: '拉绳位移', protocol: 'RS485', unit: 'm', read: (s) => s.gates[2].opening },
  { id: 'ENC-G3-01', name: '3号泄洪洞·3号弧门开度(右)', area: '3号泄洪洞', type: '多圈编码器', protocol: 'RS485', unit: 'm', read: (s) => s.gates[2].opening },
  { id: 'OP-G3-01', name: '3号泄洪洞·3号弧门综合开度', area: '3号泄洪洞', type: '闸门开度仪', protocol: 'RS485', unit: 'm', read: (s) => s.gates[2].opening },
  { id: 'OP-G3-02', name: '3号泄洪洞·3号平板检修门开度', area: '3号泄洪洞', type: '闸门开度仪', protocol: 'RS485', unit: 'm', read: () => 9 },
  { id: 'WL-G3-01', name: '3号泄洪洞·3号洞闸前水位', area: '3号泄洪洞', type: '雷达液位计', protocol: 'RS485', unit: 'm', read: (s) => s.level + 0.11 },
  { id: 'WL-DN-01', name: '厂房·下游尾水位', area: '厂房', type: '雷达液位计', protocol: '4-20mA', unit: 'm', read: () => null },
  { id: 'FL-GN-01', name: '厂房·1号机发电流量', area: '厂房', type: '流量计', protocol: 'Modbus-TCP', unit: 'm³/s', read: (s) => s.units[0].flow },
  { id: 'FL-GN-02', name: '厂房·2号机发电流量', area: '厂房', type: '流量计', protocol: 'Modbus-TCP', unit: 'm³/s', read: () => null },
  { id: 'FL-GN-03', name: '厂房·3号机发电流量', area: '厂房', type: '流量计', protocol: 'Modbus-TCP', unit: 'm³/s', read: (s) => s.units[2].flow },
  { id: 'FL-GN-04', name: '厂房·4号机发电流量', area: '厂房', type: '流量计', protocol: 'Modbus-TCP', unit: 'm³/s', read: (s) => s.units[3].flow },
];
