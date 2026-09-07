#!/usr/bin/env python3
"""把点击反应设计（JSON）校验后写成 renderer/skins/tapTables.js。
用法: python3 scripts/merge-taps.py taps.json"""
import json, io, os, sys, glob

OPS = {"burst","shower","rise","ring","glow","lines","cloud","flash","bolt","magic","text","web","shake","hud","clone","beam","cracks","grid"}
KINDS = {"heart","note","zzz","star","sparkle","petal","snow","confetti","bone","paw","sweat","smoke","coin","spark","ember","dot","bubble","leaf","web","wisp","ice"}
ANCHORS = {"head","chest","feet","headR","headL","above","item"}
MOODS = {"happy","thinking","sleepy","idle","reading"}
BASIC = {"fluff","jelly","slime","ghost","robot","blob","pjelly","pcat","pghost","probot","pslime"}
L2D_DIR = {"l2d_hiyori":"Hiyori","l2d_haru":"Haru","l2d_rice":"Rice","l2d_mao":"Mao","l2d_mark":"Mark","l2d_natori":"Natori","l2d_wanko":"Wanko"}
ROOT = os.path.expanduser("~/Library/Application Support/毛团/live2d")

def l2d_inventory(sid):
    d = L2D_DIR.get(sid)
    if not d: return None
    f = os.path.join(ROOT, d, d + ".model3.json")
    if not os.path.exists(f): return None
    m = json.load(io.open(f, encoding="utf-8")); fr = m["FileReferences"]
    motions = {g: len(v) for g, v in fr.get("Motions", {}).items()}
    exps = {e["Name"] for e in fr.get("Expressions", [])}
    params = set()
    cdi = fr.get("DisplayInfo")
    if cdi and os.path.exists(os.path.join(ROOT, d, cdi)):
        params = {p["Id"] for p in json.load(io.open(os.path.join(ROOT, d, cdi), encoding="utf-8")).get("Parameters", [])}
    return {"motions": motions, "exps": exps, "params": params}

warn = []
# 桌宠是常驻在别人窗口上面的，所以有硬上限：全屏白闪、画面抖动都不能太狠
FLASH_MAX = {"tap": 0.18, "many": 0.35}
SHAKE_MAX = 4

def check_fx(sid, where, fx):
    out = []
    for item in fx or []:
        if not isinstance(item, list) or not item or item[0] not in OPS:
            warn.append(f"{sid} {where}: 未知特效 {item!r}，已删"); continue
        op = item[0]
        if op in ("burst", "shower", "rise"):
            if len(item) < 3 or item[1] not in KINDS:
                warn.append(f"{sid} {where}: 未知粒子 {item[1:2]!r}，已删"); continue
            opts = item[3] if len(item) > 3 else {}
        elif op == "text":
            opts = item[2] if len(item) > 2 else {}
        else:
            opts = item[1] if len(item) > 1 else {}
        if isinstance(opts, dict) and opts.get("at") and opts["at"] not in ANCHORS:
            warn.append(f"{sid} {where}: 未知锚点 {opts['at']}，改成 head"); opts["at"] = "head"
        if isinstance(opts, dict):
            lim = FLASH_MAX["many" if where == "many" else "tap"]
            if op == "flash" and float(opts.get("alpha", 0.3)) > lim:
                warn.append(f"{sid} {where}: 白闪 {opts.get('alpha')} 太亮，压到 {lim}"); opts["alpha"] = lim
            if op == "shake" and float(opts.get("amp", 3)) > SHAKE_MAX:
                warn.append(f"{sid} {where}: 抖动 {opts.get('amp')} 太大，压到 {SHAKE_MAX}"); opts["amp"] = SHAKE_MAX
            if op == "text" and where == "many" and len(str(item[1])) > 4:
                warn.append(f"{sid} {where}: 连点时屏幕上的整句「{item[1]}」和气泡台词重复，已删"); continue
        out.append(item)
    return out

def check_actions(sid, where, actions, inv):
    kind = "l2d" if sid.startswith("l2d_") else "basic"
    out = []
    for a in actions or []:
        if not isinstance(a, dict): continue
        a = dict(a)
        if "fx" in a: a["fx"] = check_fx(sid, where, a["fx"])
        if kind != "l2d":
            for k in ("motion", "exp", "params", "hold", "dur"):
                if k in a and kind == "basic" and k in ("motion", "exp", "params", "hold"):
                    warn.append(f"{sid} {where}: 手绘/像素皮肤不该有 {k}，已删"); a.pop(k, None)
        if kind == "basic":
            if "pose" in a: warn.append(f"{sid} {where}: 没有 pose 这种键，已删"); a.pop("pose")
            if a.get("mood") and a["mood"] not in MOODS: warn.append(f"{sid} {where}: 未知心情 {a['mood']}，已删"); a.pop("mood")
        if kind == "l2d" and inv:
            if "pose" in a: warn.append(f"{sid} {where}: Live2D 没有 pose，已删"); a.pop("pose")
            mo = a.get("motion")
            if mo is not None:
                ok = isinstance(mo, list) and len(mo) == 2 and mo[0] in inv["motions"] and isinstance(mo[1], int) and 0 <= mo[1] < inv["motions"][mo[0]]
                if not ok: warn.append(f"{sid} {where}: 动作 {mo!r} 不存在，已删"); a.pop("motion")
            if a.get("exp") and inv["exps"] and a["exp"] not in inv["exps"]:
                warn.append(f"{sid} {where}: 表情 {a['exp']} 不存在，已删"); a.pop("exp"); a.pop("hold", None)
            if a.get("exp") and not inv["exps"]:
                warn.append(f"{sid} {where}: 这个模型没有表情文件，已删 exp"); a.pop("exp"); a.pop("hold", None)
            if isinstance(a.get("params"), dict) and inv["params"]:
                bad = [k for k in a["params"] if k not in inv["params"]]
                for k in bad: warn.append(f"{sid} {where}: 参数 {k} 不存在，已删"); a["params"].pop(k)
                if not a["params"]: a.pop("params"); a.pop("dur", None)
        if a: out.append(a)
    return out

def ensure_first_frame(sid, where, actions):
    """点下去 100ms 内必须有看得见的反应，不然用户以为没点上，会一直点。"""
    if not actions: return actions
    a0 = actions[0]
    if a0.get("delay"):
        warn.append(f"{sid} {where}: 第一帧延后了 {a0['delay']}ms，改成立刻"); a0.pop("delay")
    visible = any(k in a0 for k in ("squash", "hop", "spin", "pose", "motion", "fx", "exp")) or (sid.startswith("l2d_") and "params" in a0)
    if not visible:
        warn.append(f"{sid} {where}: 第一帧看不出反应，补一下形变"); a0["squash"] = 0.45
    return actions

def main():
    data = json.load(io.open(sys.argv[1], encoding="utf-8"))
    skins = data["skins"] if isinstance(data, dict) else data
    table = {}
    for sk in skins:
        sid = sk["id"]; inv = l2d_inventory(sid)
        if sid.startswith("l2d_") and inv is None: warn.append(f"{sid}: 本机没有这个模型，跳过参数校验")
        taps = []
        for i, t in enumerate(sk.get("taps") or []):
            acts = ensure_first_frame(sid, f"tap{i}", check_actions(sid, f"tap{i}", t.get("actions"), inv))
            if acts: taps.append({"note": t.get("note", ""), "actions": acts})
        entry = {"taps": taps, "tapLines": [l for l in (sk.get("lines") or []) if l and len(l) <= 16]}
        mt = sk.get("manyTap") or {}
        macts = check_actions(sid, "many", mt.get("actions"), inv)
        if macts: entry["manyTap"] = {"note": mt.get("note", ""), "actions": macts}
        if sk.get("manyLine"): entry["manyLine"] = sk["manyLine"]
        table[sid] = entry
    order = ["fluff","jelly","slime","ghost","robot","blob","pjelly","pcat","pghost","probot","pslime",
             "l2d_hiyori","l2d_haru","l2d_rice","l2d_mao","l2d_mark","l2d_natori","l2d_wanko"]
    keys = [k for k in order if k in table] + [k for k in table if k not in order]
    lines = ["// 点它一下的反应：每个角色几个变体轮着来，连点五下有特殊反应。",
             "// 这张表由 scripts/merge-taps.py 生成 + 校验（特效名、粒子、锚点、Live2D 动作/表情/参数都对着真模型查过）。",
             "export const TAPS = {"]
    for k in keys:
        e = table[k]
        lines.append("  %s: {" % k)
        lines.append("    taps: [")
        for t in e["taps"]:
            lines.append("      // " + t["note"])
            lines.append("      { actions: " + json.dumps(t["actions"], ensure_ascii=False) + " },")
        lines.append("    ],")
        lines.append("    tapLines: " + json.dumps(e["tapLines"], ensure_ascii=False) + ",")
        if e.get("manyTap"):
            lines.append("    // 连点：" + e["manyTap"]["note"].removeprefix("连点：").strip())
            lines.append("    manyTap: { actions: " + json.dumps(e["manyTap"]["actions"], ensure_ascii=False) + " },")
        if e.get("manyLine"): lines.append("    manyLine: " + json.dumps(e["manyLine"], ensure_ascii=False) + ",")
        lines.append("  },")
    lines.append("};")
    io.open("renderer/skins/tapTables.js", "w", encoding="utf-8").write("\n".join(lines) + "\n")
    print("wrote renderer/skins/tapTables.js —", len(keys), "个角色，",
          sum(len(table[k]["taps"]) for k in keys), "个变体")
    for w in warn: print("  ⚠", w)

main()
