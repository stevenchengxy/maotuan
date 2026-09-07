import { makeFluff } from "./fluff.js";
import { makeJelly } from "./jelly.js";
import { makeSlime } from "./slime.js";
import { makeGhost } from "./ghost.js";
import { makeRobot } from "./robot.js";
import { makePixelSkin } from "./pixelFamily.js";
import { SPRITES } from "./sprites.js";
import { makeLive2D } from "./live2d.js";
import { L2D_MODELS } from "./live2dCatalog.js";
import { makeOrb } from "./orb.js";
import { makeTerm } from "./term.js";
import { makeCapsule } from "./capsule.js";
import { makeMoon } from "./moon.js";
import { makeCube } from "./cube.js";
import { makeWisp } from "./wisp.js";
import { withFx } from "./withFx.js";
import { SKIN_DEFAULTS } from "./names.js";
import { withTaps } from "./taps.js";
const basic = id => { const d = withTaps(SKIN_DEFAULTS[id] || {}, id); return { ...d, character: d }; };

export const SKINS = {
  fluff: { name: "毛团", make: withFx(makeFluff, basic("fluff")), desc: "羊毛毡" },
  blob: { name: "像素团", make: makePixelSkin("blob", basic("blob")), desc: "像素" },
  jelly: { name: "水母", make: withFx(makeJelly, basic("jelly")), desc: "半透明" },
  slime: { name: "史莱姆", make: makeSlime, desc: "果冻" },
  ghost: { name: "小幽灵", make: makeGhost, desc: "会飘" },
  orb: { name: "小澈", make: makeOrb, desc: "全息光球" },
  term: { name: "小终", make: makeTerm, desc: "终端窗口" },
  capsule: { name: "罐罐", make: makeCapsule, desc: "胶囊机器人" },
  moon: { name: "小月", make: makeMoon, desc: "月牙夜灯" },
  cube: { name: "方方", make: makeCube, desc: "立方体" },
  wisp: { name: "数萤", make: makeWisp, desc: "数据光" },
  robot: { name: "小机器人", make: makeRobot, desc: "屏幕脸" }
};
for (const [id, sp] of Object.entries(SPRITES)) if (id !== "blob") SKINS[id] = { name: sp.name, make: makePixelSkin(id, basic(id)), desc: sp.desc };
for (const [id, m] of Object.entries(L2D_MODELS)) SKINS[id] = { name: m.name, make: makeLive2D(id), desc: m.desc };
export function makeSkin(id, canvas, opts) { const s = SKINS[id] || SKINS.fluff; return s.make(canvas, opts); }
