// 点它一下的反应：每个角色在自己的资料表里写 taps（几个变体轮着来）、tapLines（台词）、
// manyTap / manyLine（两秒里被戳五下以上的"别戳了"）。这里把它们摊平成 react 事件表。
import { TAPS } from "./tapTables.js";

// 把点击反应表并进角色的资料里（tapTables.js 是单独一份，方便整体重排）
export const withTaps = (def, id) => ({ ...(def || {}), ...(TAPS[id] || {}) });

export function expandTaps(def) {
  const react = { ...(def.react || {}) };
  (def.taps || []).forEach((t, i) => { if (t && t.actions) react["tap:" + i] = t.actions; });
  if (def.manyTap && def.manyTap.actions) react["tap:many"] = def.manyTap.actions;
  return react;
}
export const tapCount = def => ((def && def.taps) || []).length;
