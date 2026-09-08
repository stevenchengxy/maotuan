import fs from "node:fs"; import path from "node:path";
import { L2D_MODELS } from "../renderer/skins/live2dCatalog.js";
const ROOT = process.env.HOME + "/Library/Application Support/毛团/live2d";
const out = {};
for (const [id, m] of Object.entries(L2D_MODELS)) {
  const dir = path.join(ROOT, m.dir), f = path.join(dir, m.file || m.dir + ".model3.json");
  if (!fs.existsSync(f)) { out[id] = { missing: true }; continue; }
  const j = JSON.parse(fs.readFileSync(f, "utf8")), fr = j.FileReferences;
  const motions = Object.fromEntries(Object.entries(fr.Motions || {}).map(([g, v]) => [g, v.length]));
  const exps = (fr.Expressions || []).map(e => e.Name);
  let params = [];
  const cdi = fr.DisplayInfo && path.join(dir, fr.DisplayInfo);
  if (cdi && fs.existsSync(cdi)) params = (JSON.parse(fs.readFileSync(cdi, "utf8")).Parameters || []).map(p => p.Id);
  else { const moc = path.join(dir, fr.Moc);
    if (fs.existsSync(moc)) params = [...new Set((fs.readFileSync(moc).toString("latin1").match(/[A-Za-z][A-Za-z0-9_]{2,40}/g) || []).filter(x => /^(Param|PARAM)/.test(x)))]; }
  let ranges = null;
  try { ranges = JSON.parse(fs.readFileSync("/tmp/l2d-params.json", "utf8"))[id] || null; } catch {}
  out[id] = { name: m.name, motions, exps, params, ranges, react: m.react || null };
}
fs.writeFileSync("/tmp/l2d-inventory.json", JSON.stringify(out, null, 1));
for (const [id, v] of Object.entries(out)) console.log(id, v.missing ? "缺模型" : `动作 ${JSON.stringify(v.motions)} 表情 ${v.exps.length} 参数 ${v.params.length}`);
