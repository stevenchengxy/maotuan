import { makeFluff } from "./fluff.js";
import { makeJelly } from "./jelly.js";
import { makeSlime } from "./slime.js";
import { makeGhost } from "./ghost.js";
import { makeRobot } from "./robot.js";
import { makePixelSkin } from "./pixelFamily.js";
import { SPRITES } from "./sprites.js";
import { makeLive2D } from "./live2d.js";
import { L2D_MODELS } from "./live2dCatalog.js";
import { withFx } from "./withFx.js";
import { SKIN_DEFAULTS } from "./names.js";
import { withTaps } from "./taps.js";
const basic = id => { const d = withTaps(SKIN_DEFAULTS[id] || {}, id); return { ...d, character: d }; };

export const SKINS = {
  fluff: { name: "毛团", make: withFx(makeFluff, basic("fluff")), desc: "羊毛毡的圆毛球，软软的" },
  blob: { name: "像素团", make: makePixelSkin("blob", basic("blob")), desc: "照着参考图做的紫色像素团" },
  jelly: { name: "水母", make: withFx(makeJelly, basic("jelly")), desc: "半透明的小水母，安安静静地漂着" },
  slime: { name: "史莱姆", make: makeSlime, desc: "果冻一样，亮亮的，会晃" },
  ghost: { name: "小幽灵", make: makeGhost, desc: "软软的，半透明，裙边会飘" },
  robot: { name: "小机器人", make: makeRobot, desc: "小铁盒，脸是屏幕，眼睛是两道青光" }
};
for (const [id, sp] of Object.entries(SPRITES)) if (id !== "blob") SKINS[id] = { name: sp.name, make: makePixelSkin(id, basic(id)), desc: sp.desc };
for (const [id, m] of Object.entries(L2D_MODELS)) SKINS[id] = { name: m.name, make: makeLive2D(id), desc: m.desc };
export function makeSkin(id, canvas, opts) { const s = SKINS[id] || SKINS.fluff; return s.make(canvas, opts); }
