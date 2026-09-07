// 二次元角色：Live2D 官方免费示例模型（© Live2D Inc.）。
// 本仓库不含模型文件——第一次选中某个角色时，从 Live2D 官方 GitHub（或 jsDelivr 镜像）下载到本机；
// 渲染引擎 Cubism Core 也是第一次用时从 Live2D 官方 CDN 取。用法遵守《Live2D Free Material License》：
// This content uses sample data owned and copyrighted by Live2D Inc.
export const L2D_BASES = [
  "https://raw.githubusercontent.com/Live2D/CubismWebSamples/develop/Samples/Resources/",
  "https://cdn.jsdelivr.net/gh/Live2D/CubismWebSamples@develop/Samples/Resources/"
];
export const L2D_CORE_URL = "https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js";
export const L2D_CREDIT = "角色模型 © Live2D Inc.（官方免费示例，按 Live2D Free Material License 使用）";

// 每个角色一张"反应表"：事件 → 一串动作。
//   motion: ["组", 序号]   exp: 表情名（hold 毫秒后恢复）   params: {参数: 值}（dur 毫秒内每帧盖上去）
//   fx: [["burst","petal",20,{...}], ["ring",{...}], ...]（见 fx2d.js）   hop / spin / squash / delay
// 事件都是从角色自己的角度说的：rps:win = 它赢了。
// voice: MiniMax 音色（speed 是倍率，pitch 是半音偏移）。lines 里 {it}{me} 是出的手势 / 点数，{n} 是接到的个数。
const smileParams = { ParamEyeLSmile: 1, ParamEyeRSmile: 1, ParamMouthForm: 1 };
const sadParams = { ParamMouthForm: -1, ParamBrowLY: -0.6, ParamBrowRY: -0.6, ParamBrowLForm: -0.7, ParamBrowRForm: -0.7, ParamAngleY: -10 };
const wowParams = { ParamEyeLOpen: 1.4, ParamEyeROpen: 1.4, ParamMouthOpenY: 0.45, ParamBrowLY: 0.6, ParamBrowRY: 0.6 };

export const L2D_MODELS = {
  l2d_hiyori: {
    dir: "Hiyori", name: "日和", full: "桃濑日和 Hiyori Momose", gender: "女", desc: "Live2D · 校服", scale: 1.0, dy: 0, headY: 0.15,
    theme: { love: "heart", colors: ["#F8B4C4", "#FCD5DF", "#F49BB0"] },
    moods: { happy: { params: { ParamEyeLSmile: 0.8, ParamEyeRSmile: 0.8, ParamMouthForm: 0.8 } }, thinking: { params: { ParamEyeBallX: 0.5, ParamEyeBallY: 0.6, ParamMouthForm: -0.3, ParamAngleZ: -6 } } },
    react: {
      pet: [{ params: { ParamCheek: 1, ...smileParams }, dur: 1500, fx: [["burst", "heart", 2, { at: "headR", speed: 40 }]] }],
      poke: [{ motion: ["TapBody", 0], hop: 1, fx: [["burst", "heart", 4, { speed: 70 }]] }],
      "rps:reveal": [{ params: wowParams, dur: 900 }],
      "rps:win": [{ params: { ...smileParams, ParamCheek: 0.6 }, dur: 2400, hop: 1, fx: [["shower", "petal", 28, { dur: 1.4 }], ["burst", "heart", 5], ["ring", { color: "#F8B4C4", r1: 80 }]] }],
      "rps:lose": [{ params: sadParams, dur: 2400, fx: [["burst", "sweat", 1, { at: "headR", speed: 20, lift: 0 }], ["cloud", { dur: 2 }]] }],
      "rps:tie": [{ params: wowParams, dur: 1300, fx: [["burst", "note", 4, { speed: 50 }]] }],
      "dice:start": [{ hop: 1, params: { ParamEyeLSmile: 0.5, ParamEyeRSmile: 0.5 }, dur: 900 }],
      "dice:win": [{ spin: 1, params: { ...smileParams, ParamCheek: 0.5 }, dur: 2400, fx: [["burst", "petal", 22, { speed: 130 }], ["ring", { color: "#F8B4C4" }]] }],
      "dice:lose": [{ params: sadParams, dur: 2400, fx: [["burst", "sweat", 1, { at: "headR", speed: 20, lift: 0 }], ["cloud", { dur: 1.8 }]] }],
      "dice:tie": [{ params: wowParams, dur: 1300, fx: [["burst", "sparkle", 8, { colors: ["#FCD5DF", "#FFFFFF"] }]] }],
      "catch:start": [{ params: { ParamEyeLSmile: 0.6, ParamEyeRSmile: 0.6 }, dur: 1200 }],
      "catch:get": [{ fx: [["burst", "petal", 2, { speed: 60, size: 0.8 }]] }],
      "catch:five": [{ hop: 1, fx: [["burst", "heart", 3]] }],
      "catch:miss": [{ params: { ParamMouthForm: -0.6 }, dur: 600, fx: [["burst", "sweat", 1, { at: "headR", speed: 15, lift: 0 }]] }],
      "catch:great": [{ params: { ...smileParams, ParamCheek: 0.6 }, dur: 2600, hop: 1, fx: [["shower", "petal", 32, { dur: 1.8 }], ["burst", "heart", 6]] }],
      "catch:ok": [{ params: smileParams, dur: 2000, fx: [["burst", "petal", 10]] }],
      "catch:bad": [{ params: sadParams, dur: 2400, fx: [["cloud", { dur: 2 }]] }],
      land: [{ fx: [["ring", { color: "#F8B4C4", r1: 60, dur: 0.5 }]] }],
      spin: [{ fx: [["burst", "heart", 3]] }]
    },
    voice: { id: "Chinese (Mandarin)_Crisp_Girl", speed: 1.02, pitch: 0 },
    greeting: "我是日和！今天也请多关照呀。",
    style: "元气、有礼貌，句尾偶尔带「呀」「哦」，会主动关心主人今天过得怎么样。",
    lines: { rps: { win: "我出{it}！赢啦赢啦～", lose: "我出{it}……输了呀。再来一次嘛。", tie: "我也出{it}！心有灵犀！" }, dice: { win: "我 {it} 点，你 {me} 点。嘿嘿，我运气好！", lose: "我 {it} 点，你 {me} 点……输给你啦。", tie: "都是 {it} 点，平手呀！" }, catch: { great: "{n} 个！你手好快呀！", ok: "接到 {n} 个，不错不错！", bad: "才 {n} 个……没关系，再来！" } }
  },
  l2d_haru: {
    dir: "Haru", name: "春", full: "Haru", gender: "女", desc: "Live2D · 职业装", scale: 1.0, dy: 0, headY: 0.17,
    theme: { love: "sparkle", colors: ["#F2C46B", "#5C7CC9", "#FFFFFF"] },
    moods: { happy: { exp: "F01", params: { ParamEyeLSmile: 0.5, ParamEyeRSmile: 0.5 } }, thinking: { exp: "F08", params: { ParamEyeBallX: 0.4, ParamEyeBallY: 0.5 } } },
    react: {
      pet: [{ exp: "F07", hold: 1600, fx: [["burst", "heart", 2, { at: "headR", speed: 40 }]] }],
      poke: [{ motion: ["TapBody", 1], exp: "F01", hold: 1500, fx: [["burst", "sparkle", 5, { colors: ["#F2C46B", "#FFFFFF"] }]] }],
      "rps:reveal": [{ exp: "F06", hold: 1000 }],
      "rps:win": [{ exp: "F05", hold: 2400, motion: ["TapBody", 3], fx: [["burst", "confetti", 44, { speed: 190, lift: 140, size: 1.2 }], ["ring", { color: "#F2C46B", r1: 85 }], ["burst", "sparkle", 8]] }],
      "rps:lose": [{ exp: "F04", hold: 2400, motion: ["TapBody", 2], fx: [["burst", "sweat", 1, { at: "headR", speed: 20, lift: 0 }], ["cloud", { dur: 2 }]] }],
      "rps:tie": [{ exp: "F06", hold: 1400, fx: [["burst", "sparkle", 6, { colors: ["#5C7CC9", "#FFFFFF"] }]] }],
      "dice:start": [{ motion: ["TapBody", 0], exp: "F01", hold: 1000 }],
      "dice:win": [{ exp: "F02", hold: 2400, fx: [["shower", "confetti", 44, { dur: 1.4, size: 1.2 }], ["ring", { color: "#F2C46B" }]] }],
      "dice:lose": [{ exp: "F08", hold: 2400, fx: [["cloud", { dur: 1.8 }]] }],
      "dice:tie": [{ exp: "F06", hold: 1400, fx: [["burst", "sparkle", 6]] }],
      "catch:start": [{ exp: "F01", hold: 1500 }],
      "catch:get": [{ fx: [["burst", "sparkle", 2, { speed: 50, size: 0.8, colors: ["#F2C46B", "#FFFFFF"] }]] }],
      "catch:five": [{ exp: "F01", hold: 1200, fx: [["burst", "heart", 3]] }],
      "catch:miss": [{ exp: "F08", hold: 700 }],
      "catch:great": [{ exp: "F05", hold: 2600, motion: ["TapBody", 3], fx: [["shower", "confetti", 36, { dur: 1.8 }], ["burst", "sparkle", 8]] }],
      "catch:ok": [{ exp: "F01", hold: 2000, fx: [["burst", "sparkle", 8]] }],
      "catch:bad": [{ exp: "F04", hold: 2400, fx: [["cloud", { dur: 2 }]] }],
      land: [{ fx: [["ring", { color: "#F2C46B", r1: 60, dur: 0.5 }]] }],
      spin: [{ fx: [["burst", "sparkle", 5]] }]
    },
    voice: { id: "Chinese (Mandarin)_Sweet_Lady", speed: 0.98, pitch: 0 },
    greeting: "您好，我是春。有什么需要，随时叫我。",
    style: "像前台小姐姐，礼貌周到，偶尔用「您」，笑容职业但真诚，会把事情安排得妥妥当当。",
    lines: { rps: { win: "我出{it}。承让了，这局是我赢。", lose: "我出{it}……是您赢了，恭喜。", tie: "我们都出{it}，很默契呢。" }, dice: { win: "我 {it} 点，您 {me} 点。这局我拿下了。", lose: "我 {it} 点，您 {me} 点，您赢了。", tie: "都是 {it} 点，平局。" }, catch: { great: "{n} 个，太厉害了，我得给您鼓掌。", ok: "接到 {n} 个，很稳。", bad: "{n} 个……没关系，下次一定。" } }
  },
  l2d_rice: {
    dir: "Rice", name: "莱丝", full: "Rice Glassfield", gender: "女", desc: "Live2D · 贝雷帽", scale: 1.75, dy: 0, headY: 0.21,
    theme: { love: "snow", colors: ["#BFE6FF", "#FFFFFF"] },
    moods: { happy: { params: { ParamAngleZ: 4 } }, thinking: { params: { ParamAngleZ: -7, ParamEyeBallX: 0.5, ParamEyeBallY: 0.5 } } },
    react: {
      pet: [{ params: { ParamEyeLOpen: 0.55, ParamEyeROpen: 0.55 }, dur: 1300, fx: [["burst", "snow", 3, { at: "headR", speed: 30 }]] }],
      poke: [{ motion: ["TapBody", 1], fx: [["burst", "sparkle", 6, { colors: ["#FFF2B0", "#FFFFFF"] }]] }],
      "rps:reveal": [{ motion: ["TapBody", 1] }],
      "rps:win": [{ motion: ["TapBody", 2], delay: 200, fx: [["flash", { color: "#FFE9C7", alpha: 0.35 }], ["burst", "snow", 18, { speed: 120 }], ["burst", "sparkle", 10, { colors: ["#FFB347", "#FFFFFF"] }]] }],
      "rps:lose": [{ motion: ["TapBody", 0], fx: [["burst", "sweat", 1, { at: "headR", speed: 20, lift: 0 }]] }],
      "rps:tie": [{ fx: [["shower", "snow", 14, { dur: 1.2 }]] }],
      "dice:start": [{ motion: ["TapBody", 1] }],
      "dice:win": [{ motion: ["TapBody", 2], delay: 200, fx: [["ring", { color: "#BFE6FF", r1: 90 }], ["burst", "snow", 18, { speed: 120 }], ["burst", "sparkle", 8]] }],
      "dice:lose": [{ motion: ["TapBody", 0], fx: [["cloud", { dur: 1.8, color: "#B9C7D6" }]] }],
      "dice:tie": [{ fx: [["shower", "snow", 12]] }],
      "catch:start": [{ motion: ["TapBody", 1] }],
      "catch:get": [{ fx: [["burst", "snow", 2, { speed: 50, size: 0.8 }]] }],
      "catch:five": [{ motion: ["TapBody", 1], fx: [["burst", "sparkle", 4]] }],
      "catch:miss": [{ fx: [["burst", "sweat", 1, { at: "headR", speed: 15, lift: 0 }]] }],
      "catch:great": [{ motion: ["TapBody", 2], delay: 200, fx: [["shower", "snow", 30, { dur: 1.8 }], ["burst", "sparkle", 10, { colors: ["#FFB347", "#FFFFFF"] }]] }],
      "catch:ok": [{ fx: [["burst", "snow", 10]] }],
      "catch:bad": [{ motion: ["TapBody", 0], fx: [["cloud", { dur: 2, color: "#B9C7D6" }]] }],
      land: [{ fx: [["ring", { color: "#BFE6FF", r1: 60, dur: 0.5 }]] }],
      spin: [{ fx: [["burst", "snow", 6]] }]
    },
    voice: { id: "Chinese (Mandarin)_Warm_Girl", speed: 0.93, pitch: -1 },
    greeting: "……我是莱丝。我会安静地待在这里。",
    style: "话少，句子短，常有省略号，温柔但有点腼腆，偶尔提到自己的魔法书。",
    lines: { rps: { win: "……{it}。我赢了。", lose: "{it}……输了。没关系。", tie: "……都是{it}。" }, dice: { win: "{it} 点……比你的 {me} 点多一点。", lose: "{it} 点……你的 {me} 点更大。", tie: "都是 {it} 点……" }, catch: { great: "{n} 个……好厉害。", ok: "{n} 个……不错。", bad: "{n} 个……再试一次吧。" } }
  },
  l2d_mao: {
    dir: "Mao", name: "真绪", full: "虹色真绪 Niziiro Mao", gender: "女", desc: "Live2D · 小魔女", scale: 1.0, dy: 0, headY: 0.19,
    theme: { love: "star", colors: ["#B48CFF", "#FFB347", "#7FC8A9", "#F08A9B"] },
    moods: { happy: { exp: "exp_01", params: { ParamCheek: 0.4 } }, thinking: { exp: "exp_08" }, sleepy: { exp: "exp_03" } },
    react: {
      pet: [{ exp: "exp_06", hold: 1600, motion: ["TapBody", 1], fx: [["burst", "heart", 2, { at: "headR", speed: 40 }]] }],
      poke: [{ motion: ["TapBody", 3], fx: [["burst", "star", 8, { speed: 90 }]] }],
      "rps:reveal": [{ exp: "exp_07", hold: 1000, motion: ["TapBody", 2] }],
      "rps:win": [{ exp: "exp_04", hold: 2600, motion: ["TapBody", 4], fx: [["magic", { color: "#B48CFF", dur: 2 }], ["burst", "star", 18, { speed: 140, colors: ["#B48CFF", "#FFB347", "#7FC8A9", "#F08A9B"] }], ["burst", "sparkle", 8]] }],
      "rps:lose": [{ exp: "exp_05", hold: 2400, motion: ["TapBody", 5], fx: [["rise", "smoke", 8, { at: "chest", speed: 0.8 }], ["burst", "sweat", 1, { at: "headR", speed: 20, lift: 0 }]] }],
      "rps:tie": [{ exp: "exp_08", hold: 1400, fx: [["burst", "sparkle", 8, { colors: ["#B48CFF", "#FFFFFF"] }]] }],
      "dice:start": [{ motion: ["TapBody", 3], fx: [["burst", "star", 5]] }],
      "dice:win": [{ exp: "exp_04", hold: 2400, fx: [["magic", { color: "#FFB347", dur: 1.8 }], ["burst", "star", 16, { speed: 130 }]] }],
      "dice:lose": [{ exp: "exp_05", hold: 2400, fx: [["rise", "smoke", 8, { at: "chest" }], ["cloud", { dur: 1.6 }]] }],
      "dice:tie": [{ exp: "exp_08", hold: 1400, fx: [["burst", "sparkle", 8]] }],
      "catch:start": [{ exp: "exp_02", hold: 1200 }],
      "catch:get": [{ fx: [["burst", "star", 2, { speed: 60, size: 0.8 }]] }],
      "catch:five": [{ motion: ["TapBody", 3], fx: [["burst", "star", 6]] }],
      "catch:miss": [{ exp: "exp_05", hold: 600 }],
      "catch:great": [{ exp: "exp_04", hold: 2600, motion: ["TapBody", 4], fx: [["shower", "confetti", 34, { dur: 1.8, colors: ["#B48CFF", "#FFB347", "#7FC8A9", "#F08A9B", "#5C7CC9"] }], ["magic", { color: "#B48CFF", dur: 2 }]] }],
      "catch:ok": [{ exp: "exp_02", hold: 2000, fx: [["burst", "star", 10]] }],
      "catch:bad": [{ exp: "exp_05", hold: 2400, fx: [["rise", "smoke", 8, { at: "chest" }]] }],
      land: [{ fx: [["magic", { color: "#B48CFF", dur: 0.8, r: 50 }]] }],
      spin: [{ fx: [["burst", "star", 6]] }]
    },
    voice: { id: "qiaopi_mengmei", speed: 1.06, pitch: 0 },
    greeting: "真绪登场！要看魔法吗？",
    style: "俏皮、古灵精怪，爱把事情说成魔法，会说「变～」，偶尔恶作剧但心地好。",
    lines: { rps: { win: "我出{it}！魔法生效～我赢啦！", lose: "我出{it}……咒语念错了！", tie: "都是{it}？你偷看我魔法书了吧！" }, dice: { win: "{it} 点对 {me} 点，魔法骰子听我的！", lose: "{it} 点……骰子今天不听话。", tie: "都是 {it} 点，这也太巧了！" }, catch: { great: "{n} 个！你是不是也会魔法？", ok: "{n} 个，还行还行～", bad: "{n} 个……要不我给你的手施个咒？" } }
  },
  l2d_mark: {
    dir: "Mark", name: "马克", full: "Mark-kun", gender: "男", desc: "Live2D · 小男孩", scale: 1.1, dy: 0, headY: 0.3,
    theme: { love: "star", colors: ["#F2C46B", "#FF6B6B", "#FFFFFF"] },
    moods: { happy: { motion: ["Idle", 2] }, thinking: { motion: ["Idle", 3], params: { ParamEyeBallX: 0.5, ParamEyeBallY: -0.4 } } },
    react: {
      pet: [{ motion: ["Idle", 2], fx: [["burst", "heart", 2, { at: "headR", speed: 40 }]] }],
      poke: [{ motion: ["Idle", 5], hop: 1, fx: [["burst", "star", 6, { speed: 90 }]] }],
      "rps:reveal": [{ motion: ["Idle", 3] }],
      "rps:win": [{ motion: ["Idle", 5], hop: 1, fx: [["lines", { color: "#33303A", n: 16 }], ["burst", "star", 14, { speed: 140 }], ["text", "耶！", { color: "#E8553A", size: 22, at: "headR" }]] }, { delay: 500, hop: 1 }],
      "rps:lose": [{ motion: ["Idle", 3], fx: [["burst", "sweat", 2, { at: "headR", speed: 20, lift: 0 }], ["cloud", { dur: 2 }]] }],
      "rps:tie": [{ motion: ["Idle", 4], fx: [["text", "?", { color: "#33303A", size: 26, at: "headR" }]] }],
      "dice:start": [{ hop: 1, motion: ["Idle", 1] }],
      "dice:win": [{ motion: ["Idle", 5], hop: 1, fx: [["lines", { n: 16 }], ["burst", "star", 12, { speed: 130 }]] }],
      "dice:lose": [{ motion: ["Idle", 3], fx: [["cloud", { dur: 1.8 }]] }],
      "dice:tie": [{ motion: ["Idle", 4], fx: [["text", "?", { size: 26, at: "headR" }]] }],
      "catch:start": [{ motion: ["Idle", 2], hop: 1 }],
      "catch:get": [{ fx: [["burst", "star", 2, { speed: 60, size: 0.8 }]] }],
      "catch:five": [{ motion: ["Idle", 2], hop: 1, fx: [["burst", "star", 5]] }],
      "catch:miss": [{ motion: ["Idle", 3], fx: [["burst", "sweat", 1, { at: "headR", speed: 15, lift: 0 }]] }],
      "catch:great": [{ motion: ["Idle", 5], hop: 1, fx: [["lines", { n: 18 }], ["shower", "star", 24, { dur: 1.6 }], ["text", "厉害！", { color: "#E8553A", size: 20, at: "headR" }]] }],
      "catch:ok": [{ motion: ["Idle", 2], fx: [["burst", "star", 8]] }],
      "catch:bad": [{ motion: ["Idle", 3], fx: [["cloud", { dur: 2 }]] }],
      land: [{ fx: [["lines", { n: 10, len: 26, dur: 0.35 }], ["ring", { color: "#F2C46B", r1: 55, dur: 0.45 }]] }],
      spin: [{ fx: [["burst", "star", 5]] }]
    },
    voice: { id: "cute_boy", speed: 1.08, pitch: 1 },
    greeting: "我是马克！我们来玩点什么吧！",
    style: "小男孩口吻，好奇心重，爱用感叹号，动不动就问「为什么」。",
    lines: { rps: { win: "我出{it}！耶——我赢了！", lose: "我出{it}……啊，输了！再来再来！", tie: "都是{it}！好巧！" }, dice: { win: "{it} 点！比你的 {me} 点大！", lose: "才 {it} 点……你的 {me} 点好大。", tie: "都是 {it} 点！" }, catch: { great: "{n} 个！你太厉害了吧！", ok: "{n} 个！还不错！", bad: "{n} 个……再来一次！这次肯定行！" } }
  },
  l2d_natori: {
    dir: "Natori", name: "名取", full: "名取仁 Jin Natori", gender: "男", desc: "Live2D · 西装", scale: 1.0, dy: 0, headY: 0.17, license: "collab",
    theme: { love: "sparkle", colors: ["#F2C46B", "#5C7CC9", "#FFFFFF"] },
    moods: { happy: { exp: "exp_01" }, thinking: { exp: "exp_03", params: { ParamEyeBallX: 0.4, ParamEyeBallY: 0.5 } }, sleepy: { exp: "exp_05" } },
    react: {
      pet: [{ exp: "Blushing", hold: 1600, motion: ["TapBody", 1], fx: [["burst", "heart", 2, { at: "headR", speed: 35, colors: ["#F2C46B"] }]] }],
      poke: [{ motion: ["TapBody", 0], params: { ParamGrassHighlight: 1, ParamGrassHighlightMove: 1 }, dur: 900, fx: [["burst", "sparkle", 3, { at: "head", speed: 40, colors: ["#FFFFFF", "#BFE6FF"] }]] }],
      "rps:reveal": [{ motion: ["TapBody", 0], params: { ParamGrassHighlight: 1 }, dur: 800 }],
      "rps:win": [{ exp: "exp_02", hold: 2400, motion: ["TapBody", 2], fx: [["ring", { color: "#F2C46B", r1: 90 }], ["burst", "sparkle", 10, { speed: 90, colors: ["#F2C46B", "#FFFFFF"] }]] }],
      "rps:lose": [{ exp: "Sad", hold: 2400, motion: ["TapBody", 3], fx: [["burst", "sweat", 1, { at: "headR", speed: 20, lift: 0 }]] }],
      "rps:tie": [{ exp: "Surprised", hold: 1400, motion: ["TapBody", 4], fx: [["burst", "sparkle", 4, { colors: ["#5C7CC9", "#FFFFFF"] }]] }],
      "dice:start": [{ motion: ["TapBody", 0], params: { ParamGrassHighlight: 1 }, dur: 800 }],
      "dice:win": [{ exp: "Smile", hold: 2400, motion: ["TapBody", 2], fx: [["burst", "sparkle", 10, { colors: ["#F2C46B", "#FFFFFF"] }], ["ring", { color: "#5C7CC9" }]] }],
      "dice:lose": [{ exp: "exp_03", hold: 2400, fx: [["cloud", { dur: 1.6, rain: false }]] }],
      "dice:tie": [{ exp: "Surprised", hold: 1400 }],
      "catch:start": [{ exp: "exp_01", hold: 1500 }],
      "catch:get": [{ fx: [["burst", "sparkle", 1, { speed: 40, size: 0.8, colors: ["#F2C46B", "#FFFFFF"] }]] }],
      "catch:five": [{ motion: ["TapBody", 0], params: { ParamGrassHighlight: 1 }, dur: 800 }],
      "catch:miss": [{ exp: "exp_03", hold: 700 }],
      "catch:great": [{ exp: "exp_02", hold: 2600, motion: ["TapBody", 2], fx: [["shower", "sparkle", 22, { dur: 1.8, colors: ["#F2C46B", "#FFFFFF", "#5C7CC9"] }]] }],
      "catch:ok": [{ exp: "exp_01", hold: 2000, fx: [["burst", "sparkle", 6]] }],
      "catch:bad": [{ exp: "Sad", hold: 2400 }],
      land: [{ fx: [["ring", { color: "#5C7CC9", r1: 60, dur: 0.5 }]] }],
      spin: [{ fx: [["burst", "sparkle", 4]] }]
    },
    voice: { id: "Chinese (Mandarin)_Gentleman", speed: 0.95, pitch: -1 },
    greeting: "初次见面，我是名取。请多指教。",
    style: "温和斯文的大哥哥，慢条斯理，用词讲究，偶尔推一下眼镜。",
    lines: { rps: { win: "我出{it}。承让。", lose: "我出{it}……输得心服口服。", tie: "都是{it}，看来想到一起去了。" }, dice: { win: "{it} 点对 {me} 点，运气站在我这边。", lose: "{it} 点……你的 {me} 点更胜一筹。", tie: "都是 {it} 点，平分秋色。" }, catch: { great: "{n} 个，身手不凡。", ok: "{n} 个，稳稳当当。", bad: "{n} 个……不急，慢慢来。" } }
  },
  l2d_koharu: {
    dir: "Koharu", file: "Koharu.model3.json", name: "小春", full: "小春 Koharu", gender: "女", desc: "Live2D · 啦啦队女孩", scale: 1.05, dy: 0, headY: 0.2,
    base: "https://raw.githubusercontent.com/Live2D/CubismPhotographyApp/master/Assets/Live2D/Cubism/Samples/Models/",
    // 这个模型的 model3.json 里没写动作，动作文件在 Animation/ 里，下载时补进去
    addMotions: { Idle: ["Animation/body.motion3.json"], TapBody: ["Animation/face01.motion3.json", "Animation/face02.motion3.json"] },
    ids: { cheek: "PARAM_CHEEK", eyeL: "PARAM_EYE_L_OPEN", eyeR: "PARAM_EYE_R_OPEN", mouthOpen: "PARAM_MOUTH_OPEN_Y", mouthForm: "PARAM_MOUTH_FORM", angleZ: "PARAM_ANGLE_Z", angleY: "PARAM_ANGLE_Y", bodyZ: "PARAM_BODY_ANGLE_Z", ballX: "PARAM_EYE_BALL_X", ballY: "PARAM_EYE_BALL_Y" },
    theme: { love: "heart", colors: ["#F5A623", "#4A7FC1", "#FFFFFF"] },
    moods: { happy: { params: { PARAM_EYE_L_SMILE: 1, PARAM_EYE_R_SMILE: 1, PARAM_MOUTH_FORM: 1, PARAM_CHEEK: 0.5 } }, thinking: { params: { PARAM_EYE_BALL_X: 0.6, PARAM_EYE_BALL_Y: 0.6, PARAM_ANGLE_Z: -8 } }, sleepy: { params: { PARAM_EYE_L_OPEN: 0, PARAM_EYE_R_OPEN: 0, PARAM_DROOL: 0.6 } } },
    voice: { id: "lovely_girl", speed: 1.04, pitch: 1 },
    greeting: "我是小春！我来给你加油！",
    style: "啦啦队小女孩的口气，蹦蹦跳跳，句子短，爱用感叹号，会给你打气，也会撒娇。",
    lines: { rps: { win: "我出{it}！我赢啦！", lose: "我出{it}……呜，输了。", tie: "都是{it}！再来一次！" }, dice: { win: "{it} 点！比你大！", lose: "{it} 点……你好厉害。", tie: "都是 {it} 点！" }, catch: { great: "{n} 个！好厉害呀！", ok: "{n} 个！不错不错！", bad: "{n} 个……再来一次嘛。" } }
  },
  l2d_wanko: {
    dir: "Wanko", name: "年糕犬", full: "わんころもち Wankoromochi", gender: "犬", desc: "Live2D · 小狗", scale: 1.3, dy: 0, headY: 0.46,
    ids: { cheek: "PARAM_TERE", eyeL: "PARAM_EYE_L_OPEN", eyeR: "PARAM_EYE_R_OPEN", mouthOpen: "PARAM_MOUTH_OPEN_Y", mouthForm: "PARAM_MOUTH_FORM", angleZ: "PARAM_ANGLE_Z", angleY: "PARAM_ANGLE_Y", bodyZ: "PARAM_BODY_ANGLE_Z" },
    theme: { love: "paw", colors: ["#C68B59", "#FFF6E5"] },
    moods: { happy: { params: { PARAM_MOUTH_FORM: 1 } }, thinking: { params: { PARAM_ANGLE_Z: 12 } }, sleepy: { params: { PARAM_BOWL_LID: 1 } } },
    react: {
      pet: [{ params: { PARAM_TERE: 1, PARAM_MOUTH_FORM: 1 }, dur: 1500, fx: [["burst", "paw", 2, { at: "headR", speed: 40 }]] }],
      poke: [{ motion: ["TapBody", 0], hop: 1, fx: [["burst", "bone", 4, { speed: 80 }]] }],
      "rps:reveal": [{ motion: ["TapBody", 1] }],
      "rps:win": [{ params: { PARAM_FACE_01: 1 }, dur: 2400, hop: 1, fx: [["burst", "bone", 12, { speed: 130 }], ["burst", "paw", 6], ["ring", { color: "#C68B59", r1: 80 }]] }],
      "rps:lose": [{ params: { PARAM_EYE_L_OPEN: 0, PARAM_EYE_R_OPEN: 0, PARAM_YUGE_01: 1, PARAM_YUGE_02: 1 }, dur: 2400, fx: [["rise", "smoke", 6, { at: "chest", colors: ["#E8E2E0"], speed: 0.7 }], ["burst", "sweat", 1, { at: "headR", speed: 20, lift: 0 }]] }],
      "rps:tie": [{ params: { PARAM_ANGLE_Z: 14 }, dur: 1300, fx: [["text", "?", { size: 24, at: "headR" }], ["burst", "paw", 3]] }],
      "dice:start": [{ hop: 1, motion: ["TapBody", 1] }],
      "dice:win": [{ params: { PARAM_FACE_01: 1 }, dur: 2400, hop: 1, fx: [["burst", "bone", 10, { speed: 120 }], ["ring", { color: "#C68B59" }]] }],
      "dice:lose": [{ params: { PARAM_YUGE_01: 1, PARAM_YUGE_02: 1, PARAM_EYE_L_OPEN: 0.3, PARAM_EYE_R_OPEN: 0.3 }, dur: 2400, fx: [["cloud", { dur: 1.8 }]] }],
      "dice:tie": [{ fx: [["burst", "paw", 5]] }],
      "catch:start": [{ hop: 1, params: { PARAM_MOUTH_FORM: 1 }, dur: 1200 }],
      "catch:get": [{ fx: [["burst", "paw", 1, { speed: 50, size: 0.8 }]] }],
      "catch:five": [{ motion: ["TapBody", 0], hop: 1, fx: [["burst", "bone", 4]] }],
      "catch:miss": [{ params: { PARAM_EYE_L_OPEN: 0.3, PARAM_EYE_R_OPEN: 0.3 }, dur: 600 }],
      "catch:great": [{ params: { PARAM_FACE_01: 1 }, dur: 2600, hop: 1, fx: [["shower", "bone", 22, { dur: 1.6 }], ["burst", "paw", 8]] }],
      "catch:ok": [{ params: { PARAM_MOUTH_FORM: 1 }, dur: 2000, fx: [["burst", "paw", 6]] }],
      "catch:bad": [{ params: { PARAM_YUGE_01: 1, PARAM_YUGE_02: 1, PARAM_EYE_L_OPEN: 0.3, PARAM_EYE_R_OPEN: 0.3 }, dur: 2400, fx: [["cloud", { dur: 2 }]] }],
      land: [{ params: { PARAM_BOWL_SWING: 1 }, dur: 500, fx: [["ring", { color: "#C68B59", r1: 60, dur: 0.5 }]] }],
      spin: [{ fx: [["burst", "paw", 4]] }]
    },
    voice: { id: "Chinese (Mandarin)_Cute_Spirit", speed: 1.05, pitch: 2 },
    greeting: "汪！我是年糕犬，碗里很暖和。",
    style: "偶尔汪一声，句子简单直白，特别黏主人，喜欢提到自己的碗。",
    lines: { rps: { win: "汪！{it}！我赢啦！", lose: "呜……{it}……输了。汪。", tie: "都是{it}！汪汪！" }, dice: { win: "{it} 点！汪！比你的 {me} 点大！", lose: "{it} 点……你的 {me} 点大。呜。", tie: "都是 {it} 点！汪？" }, catch: { great: "{n} 个！汪汪汪！", ok: "{n} 个！汪！", bad: "{n} 个……汪。再来！" } }
  }
};
