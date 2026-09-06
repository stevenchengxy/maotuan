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

// scale / dy：模型画布里留白多少不一样，手动微调一下站位；exp：表情文件里哪几个适合当"开心 / 想事情"
export const L2D_MODELS = {
  l2d_hiyori: { dir: "Hiyori", name: "日和", full: "桃濑日和 Hiyori Momose", gender: "女", desc: "二次元女生 · Live2D：棕发双马尾、米色开衫校服", scale: 1.0, dy: 0 },
  l2d_haru: { dir: "Haru", name: "春", full: "Haru", gender: "女", desc: "二次元女生 · Live2D：深紫短发、黑色职业装的前台小姐姐", scale: 1.0, dy: 0 },
  l2d_rice: { dir: "Rice", name: "莱丝", full: "Rice Glassfield", gender: "女", desc: "二次元女生 · Live2D：银白长发、蓝贝雷帽、白裙子", scale: 1.75, dy: 0 },
  l2d_mao: { dir: "Mao", name: "真绪", full: "虹色真绪 Niziiro Mao", gender: "女", desc: "二次元女生 · Live2D：橘发大魔女帽、彩色外套、拿着魔杖", scale: 1.0, dy: 0 },
  l2d_mark: { dir: "Mark", name: "马克", full: "Mark-kun", gender: "男", desc: "二次元男生 · Live2D：大眼睛小男孩、红卫衣短裤", scale: 1.1, dy: 0 },
  l2d_natori: { dir: "Natori", name: "名取", full: "名取仁 Jin Natori", gender: "男", desc: "二次元男生 · Live2D：深蓝发、黑西装蓝领带的青年（协作角色，仅限非商用）", scale: 1.0, dy: 0, license: "collab" },
  l2d_wanko: { dir: "Wanko", name: "年糕犬", full: "わんころもち Wankoromochi", gender: "犬", desc: "Live2D：蹲在碗里的白色小狗，附赠", scale: 1.3, dy: 0 }
};
