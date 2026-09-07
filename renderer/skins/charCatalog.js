// 「画出来的角色」：不是代码画的，也不是 Live2D，而是在你自己电脑上用 MiniMax image-01
// 画出来的精细插画——每个角色四张脸（平时 / 闭眼 / 开心 / 难过），渲染层抠掉幕布再让它动起来：
// 呼吸、轻轻上下浮、看向鼠标时的偏头、眨眼（换那张闭眼的）、被摸被点时换表情 + 特效。
// 仓库和安装包里不含任何图片，全部现画现存。
export const CHAR_FRAMES = ["idle", "blink", "happy", "sad"];

// 统一的画风：清透的日系厚涂，干净背景，方便抠图
// 姿势必须四张完全一致——只换脸，不然眨眼那一下会像换了个人
const POSE = "standing upright and symmetrical, front view facing the viewer, both arms relaxed down at the sides, feet together on the ground, full body from head to toe, whole body inside the frame with margin, centered, same camera distance";
const STYLE = "drawn digital illustration, NOT a photograph, high quality Japanese anime style, soft cel shading, clean crisp lineart, even soft lighting, adorable and appealing, chibi proportions with a big expressive head, single character, no text, no watermark, no border";
// 幕布：这句要放在最前面、说得最死，不然模型会自作主张画个背景，抠不干净
const SCREEN = "The ENTIRE background is one single flat solid pure chroma-key {SCREEN} filling every pixel behind the character, like a green screen studio. No scenery, no floor, no horizon, no cast shadow, no gradient, no vignette, no texture, no paper grain, no white, no props. Nothing but flat {SHORT} behind the character.";

const FACE = {
  idle: "calm friendly resting face: eyes open looking straight at the viewer, mouth closed in a soft small smile",
  blink: "ONLY the eyes change: both eyes fully closed into gentle downward curves; mouth and everything else exactly as before",
  happy: "ONLY the face changes: eyes curved into happy arcs, open smiling mouth, cheeks slightly pink",
  sad: "ONLY the face changes: eyes looking down and watery, small frown, brows tilted up in the middle"
};
export const framePrompt = (id, frame) => {
  const c = CHARS[id];
  const same = frame === "idle" ? "" : "keep the body pose, limbs, tail, outfit, colours and framing pixel-identical to the reference image; ";
  const screen = c.screen || "green (#00FF00)";
  return `${SCREEN.replace("{SCREEN}", screen).replace("{SHORT}", screen.split(" ")[0])} ${c.look}, ${POSE}. ${same}${FACE[frame] || FACE.idle}. ${STYLE}`;
};

export const CHARS = {
  ai_shiba: {
    name: "豆豆", kind: "狗", desc: "画的 · 柴犬",
    look: "an adorable round chibi Shiba Inu puppy standing on its hind legs, cream and ginger fur, plump cheeks, tiny curled tail, wearing a small blue scarf",
    theme: { colors: ["#E8A552", "#FFF0DC", "#7FB3E6"] },
    voice: { id: "Chinese (Mandarin)_Cute_Spirit", speed: 1.05, pitch: 2 },
    greeting: "汪！豆豆来啦，今天陪你。",
    style: "小狗的口气，热情、黏人，句子短，偶尔汪一声，很容易高兴。",
  },
  ai_cat: {
    name: "云朵", kind: "猫", desc: "画的 · 布偶猫",
    look: "an adorable fluffy chibi ragdoll cat standing on its hind legs, long silky white and grey fur, big round blue eyes, a tiny bell collar",
    theme: { colors: ["#DCE6F5", "#FFFFFF", "#B8A7D9"] },
    voice: { id: "Chinese (Mandarin)_Warm_Girl", speed: 0.98, pitch: 1 },
    greeting: "喵……我是云朵。让我在这儿趴一会儿。",
    style: "猫的口气，慵懒、话少、句尾常带「喵」，被夸会假装不在意。",
  },
  ai_panda: {
    name: "小火", kind: "小熊猫", desc: "画的 · 小熊猫",
    // 手里别拿绿色的东西：绿幕会连它一起抠掉（原本那根竹子就是这么没的）
    look: "an adorable chibi red panda standing on its hind legs, rich rust-orange fur with a cream face mask, big bushy ringed tail, holding a small red apple in both paws",
    theme: { colors: ["#E2703A", "#FFE8CC", "#8FBF6A"] },
    voice: { id: "clever_boy", speed: 1.06, pitch: 1 },
    greeting: "我是小火！你在忙什么？",
    style: "好奇心很重的小动物口气，爱提问，说话跳脱，喜欢吃的东西。",
  },
  ai_penguin: {
    name: "团子", kind: "企鹅", desc: "画的 · 企鹅",
    // 别给它戴帽子：四格里模型只在第一格画了帽子，换脸时帽子会凭空消失
    look: "an adorable round chibi baby penguin standing, fluffy grey down with a white belly and pink cheeks, tiny orange beak and feet",
    theme: { colors: ["#7FB3E6", "#FFFFFF", "#F2A03D"] },
    voice: { id: "cute_boy", speed: 1.0, pitch: 1 },
    greeting: "我是团子。这里凉凉的，很舒服。",
    style: "慢半拍、憨憨的口气，句子短，认真回答每一句话。",
  },
  ai_girl: {
    name: "星野", kind: "女孩", desc: "画的 · 二次元女孩",
    look: "an adorable anime girl with long lavender hair in twin low ponytails, big sparkling amber eyes, wearing a cream knit sweater and a pleated navy skirt, small star hairpin",
    theme: { colors: ["#C9B6E4", "#FFE9C7", "#F0A6B8"] },
    voice: { id: "Chinese (Mandarin)_Crisp_Girl", speed: 1.02, pitch: 0 },
    greeting: "我是星野。今天也一起过吧。",
    style: "开朗清爽的女孩口气，会主动关心你今天怎么样，偶尔小小地撒娇。",
  },
  ai_boy: {
    name: "阿岚", kind: "男孩", desc: "画的 · 二次元男孩",
    look: "an adorable anime boy with messy dark teal hair and a small ahoge, bright green eyes, wearing an oversized white hoodie and shorts, headphones around his neck",
    theme: { colors: ["#5C8D89", "#FFFFFF", "#8FE3C9"] },
    voice: { id: "Chinese (Mandarin)_Straightforward_Boy", speed: 1.04, pitch: 0 },
    greeting: "我是阿岚。有事叫我一声就行。",
    style: "干脆爽快的男孩口气，话不多但可靠，偶尔冒一句冷幽默。",
  }
};

// 四张脸分四次画，模型只保得住「像同一只」，保不住同一种画风、同一个体型——
// 猫画过一次就变成了四只不同的猫。改成一次画一张四格表情表：同一张图里的四格
// 天然就是同一个角色、同一种笔触、同一个体型，切成四张就行。
export const SHEET = { cols: 2, rows: 2, order: ["idle", "blink", "happy", "sad"] };
// MiniMax 的 prompt 上限是 1500 字，所以这张表的措辞得比单张紧
const SHEET_POSE = "standing upright, front view facing the viewer, arms relaxed at the sides, full body from head to toe inside the cell with margin, centered";
const SHEET_STYLE = "drawn digital illustration, NOT a photo, Japanese anime style, soft cel shading, clean lineart, chibi proportions, adorable, no text, no watermark";
export const sheetPrompt = id => {
  const c = CHARS[id];
  return [
    "A 2x2 grid of four pictures of ONE character, two rows of two, thin gaps with nothing drawn in them.",
    `Character: ${c.look}, ${SHEET_POSE}.`,
    "All four cells show the same character at the same size in the same pose, same outfit, same colours, same art style. ONLY the face differs. Follow the cell order exactly:",
    "Top-left cell: eyes wide open looking straight at the viewer, mouth closed in a soft small smile.",
    "Top-right cell: asleep — both eyes shut into two calm downward curves, mouth closed, no tears.",
    "Bottom-left cell: laughing — eyes curved into upward arcs, wide open smiling mouth, both cheeks pink.",
    "Bottom-right cell: crying and clearly unhappy — eyes squeezed shut, brows tilted up, mouth open in a wail, big tear drops on the cheeks, definitely NOT smiling, no sparkles.",
    `Background everywhere, inside and between cells, is one flat solid pure chroma-key ${c.screen || "green (#00FF00)"}: no borders, frames, labels, scenery, floor, shadow, gradient, vignette or texture.`,
    SHEET_STYLE,
  ].join(" ");
};
