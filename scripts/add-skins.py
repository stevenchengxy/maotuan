#!/usr/bin/env python3
"""把工作流产出的新皮肤写进项目：代码文件 + 注册 + 名字/性格/音色 + 皮肤列表 + 人设描述。
用法: python3 scripts/add-skins.py new-skins.json"""
import json, io, os, sys, re

data = json.load(io.open(sys.argv[1], encoding="utf-8"))
skins = data["skins"] if isinstance(data, dict) else data
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def rd(p): return io.open(os.path.join(root, p), encoding="utf-8").read()
def wr(p, s): io.open(os.path.join(root, p), "w", encoding="utf-8").write(s)

added = []
for sk in skins:
    sid, code, cat = sk["id"], sk["code"], sk.get("catalog") or {}
    fname = sk.get("file") or (sid + ".js")
    wr(os.path.join("renderer", "skins", fname), code.rstrip() + "\n")
    added.append((sid, fname, cat))
    print("写入 renderer/skins/" + fname, len(code), "字符")

# 1) index.js 注册
idx = rd("renderer/skins/index.js")
for sid, fname, cat in added:
    maker = "make" + sid[0].upper() + sid[1:]
    imp = 'import { %s } from "./%s";' % (maker, fname)
    if imp not in idx:
        idx = idx.replace('import { withFx } from "./withFx.js";', imp + '\nimport { withFx } from "./withFx.js";', 1)
    line = '  %s: { name: %s, make: %s, desc: %s },' % (sid, json.dumps(cat.get("name", sid), ensure_ascii=False), maker, json.dumps(cat.get("desc", ""), ensure_ascii=False))
    if ("\n  %s: {" % sid) not in idx:
        idx = idx.replace('  robot: {', line + '\n  robot: {', 1)
wr("renderer/skins/index.js", idx)
print("注册进 index.js")

# 新皮肤要吃到 taps / scenes：让 make 走 basic(id)
idx = rd("renderer/skins/index.js")
for sid, fname, cat in added:
    maker = "make" + sid[0].upper() + sid[1:]
    idx = idx.replace("make: %s," % maker, "make: withFx(%s, basic(%s))," % (maker, json.dumps(sid)))
wr("renderer/skins/index.js", idx)

# 2) names.js：名字 / 性格 / 音色
nm = rd("renderer/skins/names.js")
for sid, fname, cat in added:
    if ("  %s: {" % sid) in nm: continue
    entry = '  %s: { name: %s, style: %s' % (sid, json.dumps(cat.get("name", sid), ensure_ascii=False), json.dumps(cat.get("style", ""), ensure_ascii=False))
    if cat.get("voice"): entry += ', voice: ' + json.dumps(cat["voice"], ensure_ascii=False)
    entry += ' },'
    nm = nm.replace("};", entry + "\n};", 1)
wr("renderer/skins/names.js", nm)
print("名字 / 性格 / 音色写进 names.js")

# 3) main/index.js 的 SKIN_LIST
mi = rd("main/index.js")
add = "".join(', ["%s", %s, %s]' % (sid, json.dumps(cat.get("name", sid), ensure_ascii=False), json.dumps(cat.get("desc", ""), ensure_ascii=False)) for sid, _, cat in added if ('["%s"' % sid) not in mi)
if add:
    mi = mi.replace('["robot", "小机器人", "手绘，脸是屏幕"]', '["robot", "小机器人", "手绘，脸是屏幕"]' + add, 1)
    wr("main/index.js", mi); print("加进 SKIN_LIST")

# 4) persona.js 的皮肤描述
pj = rd("main/persona.js")
for sid, _, cat in added:
    if ('%s: "' % sid) in pj: continue
    desc = cat.get("persona") or cat.get("desc") or cat.get("style") or ""
    pj = pj.replace('robot: "一只圆角的小机器人，脸是一块屏幕，眼睛是两道青光"',
                    'robot: "一只圆角的小机器人，脸是一块屏幕，眼睛是两道青光", %s: %s' % (sid, json.dumps(desc, ensure_ascii=False)), 1)
wr("main/persona.js", pj); print("写进 persona 描述")

# 5) 点击反应表：合进 /tmp/taps.json，交给 merge-taps.py
tp = "/tmp/taps.json"
base = json.load(io.open(tp, encoding="utf-8")) if os.path.exists(tp) else {"skins": []}
have = {s["id"] for s in base["skins"]}
for sid, _, cat in added:
    if sid in have: continue
    base["skins"].append({
        "id": sid,
        "taps": cat.get("taps") or [],
        "lines": cat.get("tapLines") or [],
        "manyTap": cat.get("manyTap") or {"note": "", "actions": []},
        "manyLine": cat.get("manyLine") or "",
    })
json.dump(base, io.open(tp, "w", encoding="utf-8"), ensure_ascii=False)
print("反应表并进", tp, "——记得再跑一次 merge-taps.py")
