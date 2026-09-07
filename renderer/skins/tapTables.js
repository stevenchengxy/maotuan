// 点它一下的反应：每个角色几个变体轮着来，连点五下有特殊反应。
// 这张表由 scripts/merge-taps.py 生成 + 校验（特效名、粒子、锚点、Live2D 动作/表情/参数都对着真模型查过）。
export const TAPS = {
  fluff: {
    taps: [
      // 被戳到马上瘪一下，弹起来抖掉一撮绒毛，然后冒两颗心
      { actions: [{"squash": 0.72, "fx": [["burst", "petal", 4, {"at": "head", "colors": ["#F7E3B0", "#EBCB8E", "#D2A85F"], "speed": 60, "lift": 30, "gravity": 60, "size": 0.9, "spread": 12}]]}, {"delay": 120, "hop": 1, "mood": "happy"}, {"delay": 180, "fx": [["burst", "heart", 2, {"at": "headR", "colors": ["#C96A7C", "#F0A0AE"], "speed": 40, "lift": 40, "size": 0.8}]]}] },
      // 撒娇：往你手边蹭过去，蹭一下压低身子，脚边扑起一圈毛屑
      { actions: [{"look": [-0.6, 0.2], "squash": 0.5}, {"delay": 140, "squash": 1, "fx": [["ring", {"color": "#EBCB8E", "width": 3, "r0": 8, "r1": 64, "dur": 0.55}], ["burst", "dot", 5, {"at": "feet", "colors": ["#F7E3B0", "#D2A85F"], "speed": 70, "lift": 10, "gravity": 120, "size": 0.8}]]}, {"delay": 200, "look": [0, 0], "mood": "happy"}] },
      // 高兴地扭一圈，绒毛像蒲公英一样从脚下飘起来
      { actions: [{"spin": 1, "fx": [["rise", "petal", 5, {"colors": ["#F7E3B0", "#EBCB8E"], "speed": 0.8, "spread": 22, "stagger": 0.05, "size": 0.85, "life": 1.1}]]}, {"delay": 320, "mood": "happy", "fx": [["burst", "sparkle", 3, {"at": "above", "colors": ["#FFF6D8", "#F7E3B0"], "speed": 45, "lift": 20, "size": 0.8}]]}] },
      // 打盹被戳醒：先愣在那儿往旁边发呆，反应过来才蹦一下哼两声
      { actions: [{"mood": "thinking", "fx": [["burst", "dot", 3, {"at": "headR", "colors": ["#8C8494"], "speed": 35, "lift": 25, "size": 0.7}]]}, {"delay": 360, "squash": 0.85, "hop": 1, "mood": "happy", "fx": [["burst", "note", 2, {"at": "headL", "colors": ["#6E948A"], "speed": 50, "lift": 45}]]}] },
    ],
    tapLines: ["唔……毛被你压扁了", "再摸一下嘛，就一下", "今天的毛特别蓬", "戳这里会痒痒的", "抱一下好不好呀", "毛毛一直都在的"],
    // 连点：毛炸了：整团抖着掉毛，急得又蹦又晃冒汗，最后还是黏上来讨抱
    manyTap: { actions: [{"squash": 0.65, "fx": [["burst", "petal", 12, {"at": "chest", "colors": ["#F7E3B0", "#EBCB8E", "#D2A85F"], "speed": 120, "lift": 60, "gravity": 90, "spread": 18}], ["shake", {"amp": 4, "dur": 0.4}]]}, {"delay": 150, "hop": 1, "spin": 1, "fx": [["burst", "sweat", 3, {"at": "headR", "speed": 60, "lift": 30}], ["lines", {"color": "#D2A85F", "n": 10, "len": 34, "dur": 0.5}]]}, {"delay": 420, "mood": "happy", "look": [0, 0.3], "fx": [["burst", "heart", 4, {"at": "above", "colors": ["#C96A7C", "#F0A0AE"], "speed": 50, "lift": 45, "size": 0.9}]]}] },
    manyLine: "毛都被你戳乱啦……",
  },
  jelly: {
    taps: [
      // 伞轻轻一缩，从身体里吐出一串小气泡，然后柔柔地亮一下
      { actions: [{"squash": 0.85, "fx": [["burst", "bubble", 4, {"at": "chest", "colors": ["#BFE6FF", "#DFF3FF"], "speed": 35, "lift": 50, "gravity": -30, "size": 0.8, "stagger": 0.05}]]}, {"delay": 260, "mood": "happy", "fx": [["glow", {"at": "chest", "color": "#7CC4FF", "r": 52, "dur": 0.9}]]}] },
      // 被碰到的地方荡开一圈圈水波，伞跟着颤了一下
      { actions: [{"squash": 0.45, "fx": [["ring", {"at": "chest", "color": "#BFE6FF", "width": 2, "r0": 10, "r1": 70, "dur": 0.7}]]}, {"delay": 220, "mood": "happy", "fx": [["ring", {"at": "chest", "color": "#7CC4FF", "width": 1.5, "r0": 8, "r1": 88, "dur": 0.7}]]}] },
      // 慢悠悠抬头往上看，触手拖出一串气泡，再轻轻沉回去
      { actions: [{"look": [0, -0.6], "fx": [["rise", "bubble", 4, {"colors": ["#BFE6FF"], "speed": 0.7, "spread": 16, "stagger": 0.08, "size": 0.7}]]}, {"delay": 340, "squash": 0.5, "look": [0, 0], "mood": "happy", "fx": [["burst", "sparkle", 3, {"at": "above", "colors": ["#DFF3FF", "#FFFFFF"], "speed": 30, "lift": 25, "gravity": 20, "size": 0.7}]]}] },
      // 慢慢晃半圈，伞上甩下几滴水，回头对你笑
      { actions: [{"spin": 1, "fx": [["burst", "dot", 5, {"at": "head", "colors": ["#BFE6FF", "#8FCBFF"], "speed": 55, "lift": 20, "gravity": 130, "size": 0.8}]]}, {"delay": 300, "mood": "happy", "fx": [["burst", "heart", 2, {"at": "headL", "colors": ["#FF8FB1"], "speed": 38, "lift": 40, "size": 0.8}]]}] },
    ],
    tapLines: ["咕噜……", "水在晃呢", "轻轻的就好", "我在漂着", "咕噜噜，痒", "这里好安静"],
    // 连点：水被搅浑了：满身气泡直冒，光晕一圈圈扩散，晃晕了呆一会儿才缓过来
    manyTap: { actions: [{"fx": [["burst", "bubble", 16, {"at": "chest", "colors": ["#BFE6FF", "#DFF3FF"], "speed": 110, "lift": 60, "gravity": -20, "spread": 22}], ["shake", {"amp": 3, "dur": 0.5}]]}, {"delay": 180, "spin": 1, "fx": [["ring", {"at": "chest", "color": "#7CC4FF", "width": 3, "r0": 12, "r1": 110, "dur": 0.8}], ["glow", {"at": "chest", "color": "#AEDBFF", "r": 70, "dur": 1}]]}, {"delay": 460, "mood": "thinking", "fx": [["burst", "dot", 4, {"at": "above", "colors": ["#BFE6FF"], "speed": 40, "lift": 20, "size": 0.7}]]}, {"delay": 700, "mood": "idle"}] },
    manyLine: "咕噜噜……头晕了",
  },
  slime: {
    taps: [
      // 被戳出一个坑，Q地弹回来，弹两下才收住
      { actions: [{"squash": 1.2, "fx": [["burst", "dot", 4, {"at": "chest", "colors": ["#B9F2B4", "#79DB86"], "speed": 50, "lift": 20, "gravity": 110, "size": 0.9}]]}, {"delay": 130, "squash": 0.7}, {"delay": 160, "squash": 0.4, "mood": "happy"}] },
      // 黏在你手指上不撒手，扯出几根黏丝，啪地弹回一坨
      { actions: [{"squash": 0.5, "look": [0, -0.6], "fx": [["rise", "wisp", 4, {"colors": ["#9FE9A8", "#3DDC84"], "speed": 0.9, "spread": 14, "stagger": 0.06, "size": 0.8}]]}, {"delay": 240, "squash": 1.2, "fx": [["burst", "dot", 3, {"at": "feet", "colors": ["#79DB86"], "speed": 45, "lift": 5, "gravity": 140, "size": 0.8}]]}, {"delay": 180, "squash": 0.5, "look": [0, 0], "mood": "happy"}] },
      // 整坨晃三下，晃出几块小果冻碎片，然后得意地蹦一下
      { actions: [{"squash": 0.6, "fx": [["shake", {"amp": 4, "dur": 0.45}], ["burst", "confetti", 4, {"at": "chest", "colors": ["#B9F2B4", "#79DB86", "#3E9E52"], "speed": 70, "lift": 35, "gravity": 120, "size": 0.8}]]}, {"delay": 300, "hop": 1, "mood": "happy", "fx": [["burst", "sparkle", 2, {"at": "above", "colors": ["#DFFFE2"], "speed": 35, "lift": 20, "size": 0.8}]]}] },
      // 扭着翻个身，地上留下一摊黏印，甩出两片叶子似的黏块
      { actions: [{"spin": 1, "fx": [["ring", {"color": "#3E9E52", "width": 4, "r0": 6, "r1": 56, "dur": 0.6}]]}, {"delay": 280, "squash": 0.75, "mood": "happy", "fx": [["burst", "leaf", 3, {"at": "feet", "colors": ["#7FC8A9", "#79DB86"], "speed": 55, "lift": 25, "gravity": 100, "size": 0.9}]]}] },
    ],
    tapLines: ["软软的，好舒服", "黏黏的，粘住你啦", "戳戳戳，凉凉的", "晃呀晃，好软软", "再捏捏我嘛", "弹弹弹，弹回来了"],
    // 连点：被捏散架：整坨摊成一滩甩出黏块，再鼓回来，最后得意地弹一下
    manyTap: { actions: [{"squash": 1.2, "fx": [["shake", {"amp": 4, "dur": 0.5}], ["burst", "dot", 14, {"at": "chest", "colors": ["#B9F2B4", "#79DB86", "#3E9E52"], "speed": 130, "lift": 40, "gravity": 150, "spread": 20}]]}, {"delay": 200, "squash": 0.6, "fx": [["rise", "wisp", 6, {"colors": ["#3DDC84", "#B8FFD6"], "speed": 1.1, "spread": 20, "stagger": 0.05}]]}, {"delay": 300, "squash": 0.4, "hop": 1, "mood": "happy", "fx": [["ring", {"color": "#79DB86", "width": 4, "r0": 10, "r1": 96, "dur": 0.7}], ["burst", "heart", 3, {"at": "above", "colors": ["#FF8FA3"], "speed": 45, "lift": 45, "size": 0.9}]]}] },
    manyLine: "捏捏捏，捏化掉啦",
  },
  ghost: {
    taps: [
      // 吓一小跳，身子散出一点幽光又聚回来
      { actions: [{"squash": 0.85, "fx": [["burst", "wisp", 4, {"at": "chest", "colors": ["#EDE8FF", "#C9BFEE"], "speed": 70, "lift": 35, "gravity": -20, "size": 0.9}]]}, {"delay": 280, "mood": "happy", "fx": [["glow", {"color": "#B9AEEA", "r": 54, "dur": 0.9}]]}] },
      // 抬头往上飘一截，裙边晃两下，星点从脚下升起来
      { actions: [{"look": [0, -0.5], "fx": [["rise", "sparkle", 4, {"colors": ["#FFFFFF", "#DCD5F5"], "speed": 0.7, "spread": 18, "stagger": 0.07, "size": 0.75}]]}, {"delay": 360, "squash": 0.5, "look": [0, 0], "mood": "happy"}] },
      // 神秘地晃半圈，脚下浮起一个淡淡的魔法阵
      { actions: [{"spin": 1, "fx": [["burst", "wisp", 3, {"at": "headR", "colors": ["#D8CFF5", "#FFFFFF"], "speed": 50, "lift": 30, "gravity": -25, "size": 0.8}], ["magic", {"color": "#B48CFF", "r": 56, "dur": 0.9}]]}, {"delay": 380, "squash": 0.5, "mood": "idle"}] },
      // 半透明地淡下去一瞬，又慢慢显出来，冒两颗心
      { actions: [{"mood": "thinking", "fx": [["burst", "smoke", 3, {"at": "chest", "colors": ["#E7E1FA", "#CFC6EE"], "speed": 35, "lift": 20, "gravity": -25, "size": 0.9}]]}, {"delay": 320, "squash": 0.6, "mood": "happy", "fx": [["burst", "heart", 2, {"at": "headL", "colors": ["#E9A7C0"], "speed": 40, "lift": 40, "size": 0.8}]]}] },
    ],
    tapLines: ["被你看见了哦……", "轻轻的，别怕哦……", "我一直都在这里哦", "手会穿过去的哦……", "夜里我最精神了", "痒痒的……"],
    // 连点：羞得快隐形：整个人散成一团幽光，白光一闪，晃一圈才聚回来
    manyTap: { actions: [{"fx": [["burst", "wisp", 14, {"at": "chest", "colors": ["#EDE8FF", "#C9BFEE", "#FFFFFF"], "speed": 110, "lift": 50, "gravity": -30, "spread": 20}], ["flash", {"color": "#FFFFFF", "alpha": 0.3, "dur": 0.22}]]}, {"delay": 220, "spin": 1, "fx": [["glow", {"color": "#B48CFF", "r": 70, "dur": 1}], ["ring", {"color": "#C9BFEE", "width": 2, "r0": 10, "r1": 100, "dur": 0.8}]]}, {"delay": 460, "mood": "happy", "look": [0, 0.3], "fx": [["burst", "heart", 3, {"at": "above", "colors": ["#E9A7C0"], "speed": 45, "lift": 45, "size": 0.9}]]}] },
    manyLine: "我要透明掉了哦……",
  },
  robot: {
    taps: [
      // 屏幕闪一下白，弹出几道电光，然后蹦出爱心
      { actions: [{"squash": 0.9, "fx": [["flash", {"color": "#BFF7FF", "alpha": 0.18, "dur": 0.16}], ["burst", "spark", 4, {"at": "head", "colors": ["#4FEFFF", "#BFE6FF"], "speed": 70, "lift": 30, "size": 0.9}]]}, {"delay": 200, "mood": "happy", "fx": [["burst", "heart", 2, {"at": "headR", "colors": ["#FF7BAC"], "speed": 40, "lift": 40, "size": 0.8}]]}] },
      // 天线滋一声炸出电火花，冒两缕小烟，迷惑一下才恢复
      { actions: [{"fx": [["burst", "spark", 5, {"at": "above", "colors": ["#7FF3FF", "#FFFFFF"], "speed": 90, "lift": 20, "gravity": 120, "spread": 8}], ["shake", {"amp": 3, "dur": 0.3}]]}, {"delay": 240, "mood": "thinking", "fx": [["burst", "smoke", 2, {"at": "above", "colors": ["#9AA3B8"], "speed": 25, "lift": 20, "gravity": -25, "size": 0.8}]]}, {"delay": 480, "mood": "idle"}] },
      // 启动扫描光环，眼睛左右扫一遍，确认是你才笑
      { actions: [{"look": [0.4, 0], "fx": [["hud", {"at": "chest", "color": "#4FEFFF", "r": 52, "dur": 0.8}]]}, {"delay": 240, "look": [-0.4, 0]}, {"delay": 240, "look": [0, 0], "mood": "happy", "fx": [["burst", "dot", 3, {"at": "headL", "colors": ["#22E7FF"], "speed": 45, "lift": 30, "size": 0.8}]]}] },
      // 原地扭一下，履带打滑蹭出火星，最后哔一声
      { actions: [{"spin": 1, "fx": [["ring", {"color": "#4FEFFF", "width": 3, "r0": 8, "r1": 70, "dur": 0.6}], ["burst", "ember", 3, {"at": "feet", "colors": ["#7FF3FF", "#FFFFFF"], "speed": 60, "lift": 10, "gravity": 140, "size": 0.8}]]}, {"delay": 320, "hop": 1, "mood": "happy", "fx": [["text", "哔", {"at": "headR", "color": "#22E7FF", "size": 20, "dur": 0.9, "rise": 26}]]}] },
    ],
    tapLines: ["哔。检测到手指", "触摸已记录，一次", "滴滴正在待命中", "好感度上升，哔", "指令收到，哔", "请勿戳我的天线"],
    // 连点：死机重启：白光炸屏、火花四溅、冒黑烟弹出错误，重启后光环转起来
    manyTap: { actions: [{"fx": [["flash", {"color": "#FFFFFF", "alpha": 0.35, "dur": 0.2}], ["burst", "spark", 12, {"at": "head", "colors": ["#4FEFFF", "#FFFFFF", "#7FF3FF"], "speed": 130, "lift": 40, "spread": 16}], ["shake", {"amp": 4, "dur": 0.5}]]}, {"delay": 220, "mood": "thinking", "fx": [["burst", "smoke", 4, {"at": "above", "colors": ["#9AA3B8", "#7C8699"], "speed": 35, "lift": 25, "gravity": -30, "size": 1}], ["text", "错误", {"at": "headL", "color": "#4FEFFF", "size": 20, "dur": 1}]]}, {"delay": 420, "squash": 0.8, "hop": 1, "mood": "idle", "fx": [["hud", {"at": "chest", "color": "#22E7FF", "r": 56, "dur": 1}]]}] },
    manyLine: "哔哔哔——系统过载",
  },
  blob: {
    taps: [
      // 被戳中，方块猛地压扁一下，崩出像素碎点，然后蹦起来弹出 +1
      { actions: [{"squash": 0.72, "look": [0, -1], "fx": [["burst", "dot", 5, {"at": "head", "colors": ["#8360F7", "#22E7FF", "#FFFFFF"], "speed": 80, "lift": 40, "gravity": 120, "size": 1.1}]]}, {"delay": 110, "hop": 1, "mood": "happy", "fx": [["text", "+1", {"at": "above", "color": "#22E7FF", "size": 18, "rise": 26, "dur": 0.9}]]}] },
      // 当自己是存档点：脚下亮一圈，弹三枚金币，冒 GET
      { actions: [{"squash": 0.85, "fx": [["ring", {"at": "feet", "color": "#22E7FF", "r1": 64, "width": 3, "dur": 0.5}]]}, {"delay": 120, "hop": 1, "fx": [["burst", "coin", 3, {"at": "chest", "speed": 70, "lift": 55, "gravity": 150, "stagger": 0.05}]]}, {"delay": 180, "mood": "happy", "fx": [["text", "GET", {"at": "above", "color": "#F2C46B", "size": 17, "rise": 24, "dur": 0.8}]]}] },
      // 转个身撒星星，头顶跳出 LV UP，像升级过场
      { actions: [{"spin": 1, "fx": [["burst", "star", 4, {"at": "chest", "colors": ["#22E7FF", "#FFFFFF"], "speed": 90, "lift": 30, "gravity": 110, "size": 0.9}]]}, {"delay": 200, "mood": "happy", "fx": [["text", "LV UP", {"at": "above", "color": "#8360F7", "size": 16, "rise": 30, "dur": 1}]]}] },
      // 像素错位：抖一下，右脸崩出电花，脚边掉三块自己
      { actions: [{"fx": [["shake", {"amp": 4, "dur": 0.28}], ["burst", "spark", 4, {"at": "headR", "colors": ["#22E7FF"], "speed": 100, "lift": 20, "gravity": 180, "size": 0.9}]]}, {"delay": 150, "squash": 1.12, "look": [1, 0], "fx": [["burst", "dot", 3, {"at": "feet", "colors": ["#8360F7"], "speed": 50, "lift": 10, "gravity": 200}]]}] },
    ],
    tapLines: ["点到我了，判定成功", "这一格是我的，别乱走", "我血条还是满的", "再点就要进下一关了", "手感不错，熟练度不低", "存档点在这，站好"],
    // 连点：渲染崩了：集中线加剧震，整个方块炸成一堆像素，青光一闪，头顶飘 ERROR
    manyTap: { actions: [{"fx": [["shake", {"amp": 4, "dur": 0.5}], ["lines", {"at": "head", "color": "#8360F7", "n": 12, "len": 40, "dur": 0.6}]]}, {"delay": 120, "squash": 0.62, "fx": [["burst", "dot", 14, {"at": "chest", "colors": ["#8360F7", "#22E7FF", "#FFFFFF"], "speed": 150, "lift": 40, "gravity": 200, "size": 1.2}]]}, {"delay": 200, "spin": 1, "fx": [["flash", {"alpha": 0.3, "color": "#22E7FF", "dur": 0.18}]]}, {"delay": 220, "mood": "thinking", "fx": [["burst", "spark", 6, {"at": "headL", "colors": ["#22E7FF"], "speed": 120, "lift": 20, "gravity": 160}]]}] },
    manyLine: "像素乱了，得重开关卡",
  },
  pjelly: {
    taps: [
      // 慢半拍地缩一下，从身体里吐一串气泡，然后才浮起来
      { actions: [{"squash": 0.88, "look": [0, -1], "fx": [["burst", "bubble", 4, {"at": "chest", "colors": ["#5FC8FF", "#FFFFFF"], "speed": 45, "lift": 45, "gravity": 30, "spread": 14, "stagger": 0.08, "size": 1.1}]]}, {"delay": 260, "hop": 1, "mood": "happy"}] },
      // 触手放电：脚边横着蹦出电花，地上荡开一圈水波
      { actions: [{"fx": [["burst", "spark", 5, {"at": "feet", "colors": ["#22E7FF", "#FFFFFF"], "speed": 90, "lift": 0, "gravity": 60, "spread": 18}]]}, {"delay": 200, "squash": 1.1, "fx": [["ring", {"at": "feet", "color": "#5FC8FF", "r1": 70, "width": 2, "dur": 0.6}]]}] },
      // 头顶亮一团光，往上浮一下弹出 +1，脸侧洒粉色像素点
      { actions: [{"fx": [["glow", {"at": "head", "color": "#5FC8FF", "r": 46, "dur": 0.8}]]}, {"delay": 180, "hop": 1, "fx": [["text", "+1", {"at": "above", "color": "#FF7BAC", "size": 17, "rise": 24, "dur": 0.9}]]}, {"delay": 220, "mood": "happy", "fx": [["burst", "dot", 3, {"at": "headR", "colors": ["#FF7BAC", "#FFFFFF"], "speed": 60, "lift": 30, "gravity": 100}]]}] },
      // 慢悠悠转个身，甩下几颗方方的小星星
      { actions: [{"spin": 1, "look": [-1, 0]}, {"delay": 260, "fx": [["burst", "star", 4, {"at": "chest", "colors": ["#5FC8FF", "#FFFFFF"], "speed": 70, "lift": 25, "gravity": 140, "size": 0.9}]]}, {"delay": 200, "squash": 0.92}] },
    ],
    tapLines: ["嗯……点到我了", "慢一点，我在读条", "浮着呢，别急", "水里也是有像素的", "再点一下也可以", "我这一格很软的"],
    // 连点：被戳到吐一大串泡泡，转圈甩电花，最后摊平慢吞吞求你慢点
    manyTap: { actions: [{"fx": [["burst", "bubble", 10, {"at": "chest", "colors": ["#5FC8FF", "#FFFFFF"], "speed": 110, "lift": 50, "gravity": 40, "size": 1.2}]]}, {"delay": 160, "spin": 1, "fx": [["shake", {"amp": 4, "dur": 0.4}], ["burst", "spark", 8, {"at": "feet", "colors": ["#22E7FF"], "speed": 120, "lift": 10, "gravity": 80, "spread": 22}]]}, {"delay": 260, "squash": 0.7, "mood": "thinking", "fx": [["ring", {"at": "feet", "color": "#5FC8FF", "r1": 96, "width": 3, "dur": 0.7}], ["text", "慢点", {"at": "above", "color": "#5FC8FF", "size": 19, "rise": 22, "dur": 1}]]}] },
    manyLine: "等一下，我还在读条",
  },
  pcat: {
    taps: [
      // 耳朵一抖，往侧上看，甩出三个像素爪印，再蹦一下
      { actions: [{"look": [1, -1], "squash": 0.9, "fx": [["burst", "paw", 3, {"at": "headR", "colors": ["#F6B26B", "#C9843B"], "speed": 80, "lift": 35, "gravity": 120}]]}, {"delay": 180, "mood": "happy", "hop": 1}] },
      // 本来在打盹，冒出两个 z，被戳醒后一激灵冒汗
      { actions: [{"mood": "sleepy", "fx": [["burst", "zzz", 2, {"at": "headR", "colors": ["#A9B0FF"], "speed": 30, "lift": 38, "gravity": 20, "size": 1.2}]]}, {"delay": 420, "mood": "idle", "look": [-1, 0], "squash": 1.12, "fx": [["burst", "sweat", 2, {"at": "headL", "speed": 50, "lift": 20, "gravity": 160}]]}] },
      // 喵一声蹦起来，落地弹出三枚金币，像踩到问号砖
      { actions: [{"hop": 1, "mood": "happy", "fx": [["text", "喵", {"at": "above", "color": "#FF7BAC", "size": 20, "rise": 26, "dur": 0.9}]]}, {"delay": 200, "fx": [["burst", "coin", 3, {"at": "chest", "colors": ["#F2C46B"], "speed": 80, "lift": 50, "gravity": 170, "stagger": 0.05}]]}] },
      // 翻个身蹭地，脚边掉一撮橘色像素毛，荡开一圈
      { actions: [{"spin": 1, "fx": [["burst", "dot", 4, {"at": "feet", "colors": ["#F6B26B", "#C9843B"], "speed": 70, "lift": 15, "gravity": 150}]]}, {"delay": 220, "squash": 0.86, "look": [0, 1], "fx": [["ring", {"at": "feet", "color": "#F6B26B", "r1": 66, "width": 3, "dur": 0.55}]]}] },
    ],
    tapLines: ["喵……手别停", "本喵允许你点一下", "刚睡着，你就来了", "再点就收金币了，喵", "挠这里，往左一点", "唔，勉强算你会撸猫"],
    // 连点：炸毛：集中线加剧震，爪印满天飞，跳起来转身大喵一声，然后气鼓鼓地扭头
    manyTap: { actions: [{"fx": [["lines", {"at": "head", "color": "#C9843B", "n": 12, "len": 44, "dur": 0.5}], ["shake", {"amp": 4, "dur": 0.4}]]}, {"delay": 140, "squash": 0.72, "fx": [["burst", "paw", 8, {"at": "chest", "colors": ["#F6B26B", "#C9843B", "#FF7BAC"], "speed": 150, "lift": 40, "gravity": 190}]]}, {"delay": 200, "hop": 1, "spin": 1, "fx": [["text", "喵！！", {"at": "above", "color": "#FF7BAC", "size": 22, "rise": 24, "dur": 1}]]}, {"delay": 240, "mood": "thinking", "look": [-1, 0], "fx": [["burst", "sweat", 4, {"at": "headL", "speed": 80, "lift": 20, "gravity": 200}]]}] },
    manyLine: "喵！爪子要出鞘了",
  },
  pghost: {
    taps: [
      // 整只闪一下像掉帧，身上掉几粒白紫像素，再软软地缩一下
      { actions: [{"fx": [["flash", {"alpha": 0.18, "color": "#F4F1FF", "dur": 0.16}]]}, {"delay": 120, "look": [1, 0], "fx": [["burst", "dot", 4, {"at": "chest", "colors": ["#F4F1FF", "#8360F7"], "speed": 60, "lift": 35, "gravity": 90}]]}, {"delay": 220, "squash": 0.9, "mood": "happy"}] },
      // 裙边一抖，脚下升起紫色鬼火，浮起来吓你一句 BOO
      { actions: [{"fx": [["rise", "wisp", 4, {"at": "feet", "speed": 0.9, "spread": 16, "stagger": 0.08, "colors": ["#8360F7", "#C9C2E8"], "size": 0.9}]]}, {"delay": 280, "hop": 1, "fx": [["text", "BOO", {"at": "above", "color": "#8360F7", "size": 18, "rise": 26, "dur": 0.9}]]}] },
      // 原地转一圈，星星留在半空，胸口亮起一团柔光
      { actions: [{"spin": 1, "fx": [["burst", "star", 4, {"at": "head", "colors": ["#F4F1FF", "#8360F7"], "speed": 85, "lift": 30, "gravity": 70, "size": 0.9}]]}, {"delay": 240, "fx": [["glow", {"at": "chest", "color": "#C9C2E8", "r": 50, "dur": 0.8}]]}] },
      // 头顶飘来一朵不下雨的小云，抬头装神秘
      { actions: [{"look": [0, -1], "fx": [["cloud", {"at": "above", "color": "#C9C2E8", "rain": false, "dur": 1.1}]]}, {"delay": 300, "squash": 1.1, "mood": "thinking", "fx": [["burst", "dot", 3, {"at": "headL", "colors": ["#8360F7"], "speed": 50, "lift": 25, "gravity": 80}]]}] },
    ],
    tapLines: ["嘘……你看得见我", "这一格本来是空的", "手别抖，我不咬人", "再点，我就藏起来", "半夜的存档点是我", "轻一点，我很薄的"],
    // 连点：害羞过头：白光一闪，鬼火四散，脚下浮出魔法阵，边喊不见了边淡掉
    manyTap: { actions: [{"fx": [["flash", {"alpha": 0.35, "color": "#F4F1FF", "dur": 0.2}], ["shake", {"amp": 4, "dur": 0.35}]]}, {"delay": 150, "spin": 1, "fx": [["burst", "wisp", 10, {"at": "chest", "colors": ["#8360F7", "#C9C2E8", "#F4F1FF"], "speed": 140, "lift": 50, "gravity": 40}]]}, {"delay": 220, "squash": 0.68, "mood": "thinking", "fx": [["magic", {"at": "feet", "color": "#8360F7", "r": 62, "dur": 1.1}]]}, {"delay": 260, "fx": [["text", "不见了", {"at": "above", "color": "#8360F7", "size": 19, "rise": 24, "dur": 1}], ["burst", "dot", 6, {"at": "head", "colors": ["#F4F1FF"], "speed": 90, "lift": 40, "gravity": 120}]]}] },
    manyLine: "别戳了，我要透明了",
  },
  probot: {
    taps: [
      // 眼灯一闪，脑门崩出青色电花，压一下弹出 OK
      { actions: [{"look": [0, 0], "fx": [["burst", "spark", 4, {"at": "head", "colors": ["#22E7FF"], "speed": 90, "lift": 20, "gravity": 120, "size": 0.9}]]}, {"delay": 130, "squash": 0.86, "mood": "happy", "fx": [["text", "OK", {"at": "above", "color": "#22E7FF", "size": 18, "rise": 24, "dur": 0.8}]]}] },
      // 进入扫描模式：胸口 HUD 光环转一圈，眼灯扫向你，再复位
      { actions: [{"mood": "thinking", "fx": [["hud", {"at": "chest", "color": "#22E7FF", "r": 52, "dur": 0.9}]]}, {"delay": 300, "look": [1, 0], "fx": [["burst", "dot", 3, {"at": "headR", "colors": ["#22E7FF", "#FFFFFF"], "speed": 60, "lift": 30, "gravity": 110}]]}, {"delay": 260, "mood": "idle", "squash": 1.1}] },
      // 天线接触不良：抖一下窜火花，蹦一蹦顺便冒两口烟
      { actions: [{"fx": [["shake", {"amp": 4, "dur": 0.26}], ["burst", "spark", 5, {"at": "above", "colors": ["#22E7FF", "#FFFFFF"], "speed": 110, "lift": 10, "gravity": 200, "spread": 8}]]}, {"delay": 180, "hop": 1, "fx": [["burst", "smoke", 2, {"at": "headL", "colors": ["#B8C0D6"], "speed": 40, "lift": 45, "gravity": 20, "size": 0.8}]]}] },
      // 脚下亮起全息网格，垫脚起飞一下，记账 +1
      { actions: [{"fx": [["grid", {"at": "feet", "color": "#22E7FF", "dur": 1}]]}, {"delay": 200, "hop": 1, "fx": [["ring", {"at": "feet", "color": "#22E7FF", "r1": 72, "width": 2, "dur": 0.5}]]}, {"delay": 220, "mood": "happy", "fx": [["text", "+1", {"at": "above", "color": "#22E7FF", "size": 17, "rise": 22, "dur": 0.8}]]}] },
    ],
    tapLines: ["哔。接收到触摸", "哔哔。这是好事", "输入已记录，哔", "再点，会发热，哔", "系统良好。哔", "触摸值 +1。哔"],
    // 连点：过载死机：剧震喷火花，头顶冒烟，青光一闪打出过热，最后红色警告环转着原地打转
    manyTap: { actions: [{"fx": [["shake", {"amp": 4, "dur": 0.45}], ["burst", "spark", 10, {"at": "head", "colors": ["#22E7FF", "#FFFFFF"], "speed": 160, "lift": 30, "gravity": 200}]]}, {"delay": 150, "mood": "thinking", "fx": [["burst", "smoke", 5, {"at": "head", "colors": ["#B8C0D6", "#7C8699"], "speed": 50, "lift": 55, "gravity": 25, "spread": 14, "stagger": 0.06, "size": 1.1}]]}, {"delay": 200, "squash": 0.7, "fx": [["flash", {"alpha": 0.3, "color": "#22E7FF", "dur": 0.18}], ["text", "过热", {"at": "above", "color": "#FF5C8A", "size": 20, "rise": 20, "dur": 1}]]}, {"delay": 260, "spin": 1, "fx": [["hud", {"at": "chest", "color": "#FF5C8A", "r": 58, "dur": 0.9}], ["burst", "dot", 6, {"at": "feet", "colors": ["#7C8699"], "speed": 90, "lift": 10, "gravity": 200}]]}] },
    manyLine: "哔——过载。请松手",
  },
  pslime: {
    taps: [
      // 被戳成一张饼，甩出黏黏的绿像素，再噗地弹回来
      { actions: [{"squash": 0.62, "fx": [["burst", "dot", 5, {"at": "chest", "colors": ["#7CE38B", "#3FA352"], "speed": 90, "lift": 30, "gravity": 180}]]}, {"delay": 160, "squash": 1.18, "hop": 1, "mood": "happy"}] },
      // 咕叽一声往外摊开一圈，脚边慢慢冒泡泡，再鼓回来
      { actions: [{"squash": 0.78, "fx": [["ring", {"at": "feet", "color": "#7CE38B", "r1": 70, "width": 4, "dur": 0.6}]]}, {"delay": 160, "fx": [["rise", "bubble", 4, {"at": "feet", "speed": 0.9, "spread": 16, "stagger": 0.05, "colors": ["#7CE38B", "#FFFFFF"]}]]}, {"delay": 220, "squash": 1.1}] },
      // 抬头一弹跳，头顶接住金币，冒出 GET
      { actions: [{"hop": 1, "look": [0, -1], "fx": [["burst", "coin", 3, {"at": "above", "colors": ["#F2C46B"], "speed": 70, "lift": 40, "gravity": 190, "stagger": 0.05}]]}, {"delay": 240, "mood": "happy", "fx": [["text", "GET", {"at": "above", "color": "#F2C46B", "size": 18, "rise": 22, "dur": 0.8}]]}] },
      // 晃着转半圈，头上蹦小星星，脚边抖落几块深绿方块
      { actions: [{"spin": 1, "fx": [["burst", "star", 3, {"at": "head", "colors": ["#FFFFFF", "#7CE38B"], "speed": 80, "lift": 35, "gravity": 130, "size": 0.9}]]}, {"delay": 220, "squash": 0.88, "fx": [["burst", "dot", 4, {"at": "feet", "colors": ["#3FA352"], "speed": 60, "lift": 10, "gravity": 200}]]}] },
    ],
    tapLines: ["咕叽，被戳到啦", "软软的，你也试试", "黏黏的，粘住你手了", "再点会晃晃的哦", "我这格是水坑关卡", "抖抖抖抖，好舒服"],
    // 连点：被戳散架：抖着炸出一堆绿块，整个摊成一滩大圈，咕噜噜冒泡，最后勉强鼓回来喊散啦
    manyTap: { actions: [{"fx": [["shake", {"amp": 4, "dur": 0.4}], ["burst", "dot", 12, {"at": "chest", "colors": ["#7CE38B", "#3FA352", "#FFFFFF"], "speed": 150, "lift": 40, "gravity": 220}]]}, {"delay": 150, "squash": 0.5, "fx": [["ring", {"at": "feet", "color": "#7CE38B", "r1": 100, "width": 4, "dur": 0.7}]]}, {"delay": 240, "fx": [["rise", "bubble", 8, {"at": "feet", "speed": 1.1, "spread": 22, "stagger": 0.05, "colors": ["#7CE38B", "#FFFFFF"]}]]}, {"delay": 260, "squash": 1.2, "hop": 1, "mood": "thinking", "fx": [["text", "散啦", {"at": "above", "color": "#3FA352", "size": 20, "rise": 22, "dur": 1}]]}] },
    manyLine: "别戳啦，我要摊了",
  },
  l2d_hiyori: {
    taps: [
      // 被戳的瞬间小小地「呀」了一声，眼睛睁圆，然后马上笑出来冒俩心
      { actions: [{"hop": 1, "params": {"ParamEyeLOpen": 1, "ParamEyeROpen": 1, "ParamMouthOpenY": 0.45, "ParamBrowLY": 0.6, "ParamBrowRY": 0.6, "ParamAngleY": 6}, "dur": 420, "fx": [["burst", "sparkle", 3, {"at": "headR", "speed": 55, "life": 0.7, "colors": ["#FFFFFF", "#FCD5DF"]}]]}, {"delay": 380, "params": {"ParamEyeLSmile": 1, "ParamEyeRSmile": 1, "ParamMouthForm": 1, "ParamCheek": 0.5}, "dur": 700, "fx": [["burst", "heart", 2, {"at": "headR", "speed": 45, "size": 0.9}]]}] },
      // 脸一下子红了，缩着脖子低头，缓过来才害羞地笑，脚下漾开一圈粉
      { actions: [{"motion": ["TapBody", 0], "params": {"ParamCheek": 1, "ParamMouthForm": -0.3, "ParamEyeLOpen": 0.4, "ParamEyeROpen": 0.4, "ParamAngleZ": -8, "ParamBodyAngleZ": -4}, "dur": 900, "fx": [["burst", "heart", 3, {"at": "headL", "speed": 40, "lift": 55, "size": 0.9}]]}, {"delay": 420, "params": {"ParamCheek": 0.7, "ParamEyeLSmile": 0.8, "ParamEyeRSmile": 0.8, "ParamMouthForm": 0.8}, "dur": 600, "fx": [["ring", {"color": "#F8B4C4", "r1": 58, "dur": 0.5}]]}] },
      // 扭头把双马尾甩过去又甩回来，樱花跟着头发飘出来
      { actions: [{"params": {"ParamSideupRibbon": 1, "ParamAngleX": 14, "ParamBodyAngleX": 8, "ParamEyeLSmile": 0.7, "ParamEyeRSmile": 0.7}, "dur": 380, "fx": [["burst", "petal", 5, {"at": "headR", "speed": 75, "lift": 35, "spread": 22, "size": 0.9}]]}, {"delay": 340, "params": {"ParamSideupRibbon": -1, "ParamAngleX": -12, "ParamBodyAngleX": -6, "ParamMouthForm": 1, "ParamEyeLSmile": 1, "ParamEyeRSmile": 1}, "dur": 520, "fx": [["burst", "petal", 3, {"at": "headL", "speed": 60, "size": 0.85}]]}] },
      // 原地蹦一下张嘴笑着应你，落地时脚边弹起小音符和一圈粉光
      { actions: [{"hop": 1, "squash": 0.5, "params": {"ParamEyeLSmile": 1, "ParamEyeRSmile": 1, "ParamMouthOpenY": 0.5, "ParamMouthForm": 0.8, "ParamBustY": 0.6, "ParamBodyAngleY": 6}, "dur": 800, "fx": [["burst", "note", 3, {"at": "headR", "speed": 60}]]}, {"delay": 440, "fx": [["ring", {"color": "#FCD5DF", "r1": 64, "dur": 0.5}], ["burst", "sparkle", 3, {"at": "feet", "speed": 50, "lift": 20, "size": 0.8}]]}] },
    ],
    tapLines: ["呀！你戳到我啦。", "在的在的，我在听哦。", "再戳……我要笑出来啦。", "手指凉凉的，冷不冷呀？", "日和今天也很有精神哦！", "唔，是想陪我玩吗？"],
    // 连点：被连点到脸烫，皱着眉捂住脸原地打了个转，樱花哗啦啦落一片
    manyTap: { actions: [{"motion": ["TapBody", 0], "params": {"ParamCheek": 1, "ParamEyeLOpen": 0.2, "ParamEyeROpen": 0.2, "ParamMouthForm": -0.8, "ParamBrowLY": -0.6, "ParamBrowRY": -0.6, "ParamAngleZ": 10, "ParamBodyAngleZ": 6}, "dur": 1400, "fx": [["shake", {"amp": 4, "dur": 0.4}], ["burst", "sweat", 2, {"at": "headR", "speed": 20, "lift": 0}]]}, {"delay": 320, "spin": 1, "params": {"ParamCheek": 1, "ParamEyeLSmile": 1, "ParamEyeRSmile": 1, "ParamMouthForm": 0.6, "ParamSideupRibbon": 1}, "dur": 1300, "fx": [["shower", "petal", 18, {"dur": 1.2}], ["burst", "heart", 6, {"speed": 80}], ["ring", {"color": "#F8B4C4", "r1": 80}]]}] },
    manyLine: "别、别戳啦！我脸都烫了呀。",
  },
  l2d_haru: {
    taps: [
      // 标准前台微笑，侧身向你示意「在的」，肩头飘一点金色亮片
      { actions: [{"motion": ["TapBody", 0], "exp": "F01", "hold": 1200, "fx": [["burst", "sparkle", 4, {"at": "headR", "speed": 55, "colors": ["#F2C46B", "#FFFFFF"]}]]}, {"delay": 420, "params": {"ParamHandChangeR": 1, "ParamBodyAngleX": 6, "ParamAngleX": 8, "ParamEyeLSmile": 0.6, "ParamEyeRSmile": 0.6}, "dur": 600, "fx": [["glow", {"color": "#F2C46B", "r": 44, "dur": 0.6}]]}] },
      // 冷不防被戳，睁大眼吸了口气，围巾晃了一下，随即无奈地笑一笑
      { actions: [{"exp": "F06", "hold": 600, "params": {"ParamMouthOpenY": 0.5, "ParamBodyAngleZ": -6, "ParamScarf": 1}, "dur": 500, "fx": [["burst", "dot", 3, {"at": "headL", "speed": 45, "life": 0.6}], ["shake", {"amp": 3, "dur": 0.25}]]}, {"delay": 460, "exp": "F04", "hold": 900, "params": {"ParamScarf": -1, "ParamAngleZ": 6}, "dur": 600, "fx": [["burst", "sweat", 2, {"at": "headR", "speed": 18, "lift": 0}]]}] },
      // 闭眼笑着欠身，像给客人递彩带一样撒出金色小礼花
      { actions: [{"motion": ["TapBody", 2], "exp": "F05", "hold": 1300, "params": {"ParamBodyUpper": 0.6, "ParamAngleY": -8}, "dur": 900, "fx": [["burst", "confetti", 6, {"speed": 110, "lift": 80, "size": 0.9}], ["ring", {"color": "#F2C46B", "r1": 66, "dur": 0.6}]]}, {"delay": 520, "params": {"ParamBodyUpper": 0, "ParamMouthForm": 1}, "dur": 500, "fx": [["burst", "sparkle", 3, {"at": "headR", "colors": ["#FFFFFF", "#F2C46B"]}]]}] },
      // 耳根一下红了，别过头假装看别处，一秒后又把职业笑容挂回来
      { actions: [{"exp": "F07", "hold": 1300, "params": {"ParamTere": 1, "ParamAngleX": -12, "ParamAngleY": -6, "ParamBodyAngleX": -5}, "dur": 900, "fx": [["burst", "heart", 2, {"at": "headL", "speed": 38, "size": 0.85}]]}, {"delay": 520, "exp": "F01", "hold": 700, "params": {"ParamTere": 0.6, "ParamEyeLSmile": 0.8, "ParamEyeRSmile": 0.8}, "dur": 600, "fx": [["burst", "sparkle", 3, {"at": "headR", "colors": ["#FFFFFF", "#F2C46B"]}]]}] },
    ],
    tapLines: ["您好，有什么吩咐吗？", "我在的，您请说。", "您的手指很有精神呢。", "再戳，我可要记下来了。", "前台在岗，随时候命。", "需要我帮您做点什么？"],
    // 连点：职业微笑当场裂开：皱眉、集中线、冒汗地说「请稍等」，深呼吸再把笑容装回去
    manyTap: { actions: [{"motion": ["TapBody", 3], "exp": "F03", "hold": 900, "params": {"ParamBrowLY": -1, "ParamBrowRY": -1, "ParamMouthForm": -1, "ParamEyeForm": -1}, "dur": 900, "fx": [["lines", {"color": "#33303A", "n": 14, "len": 44, "dur": 0.7}], ["shake", {"amp": 4, "dur": 0.45}]]}, {"delay": 700, "exp": "F08", "hold": 1100, "params": {"ParamTere": 0.8, "ParamMouthOpenY": 0.3, "ParamAngleY": -8, "ParamScarf": 1}, "dur": 900, "fx": [["burst", "sweat", 3, {"at": "headR", "speed": 22, "lift": 0}], ["text", "请稍等", {"color": "#5C7CC9", "size": 20}]]}, {"delay": 800, "exp": "F01", "hold": 1000, "params": {"ParamEyeLSmile": 1, "ParamEyeRSmile": 1, "ParamMouthForm": 1, "ParamBodyUpper": 0.4}, "dur": 800, "fx": [["burst", "sparkle", 5, {"colors": ["#F2C46B", "#FFFFFF"]}], ["glow", {"color": "#F2C46B", "r": 50, "dur": 0.8}]]}] },
    manyLine: "……请您稍等，我整理一下表情。",
  },
  l2d_rice: {
    taps: [
      // 从书里抬起眼看你一下，手心的光慢慢亮起来
      { actions: [{"params": {"ParamEyeLOpen": 1, "ParamEyeROpen": 1, "ParamEyeBallY": 0.6, "ParamAngleX": 6, "ParamHandLightAOn": 1, "ParamHandLightASize": 0.6}, "dur": 900, "fx": [["burst", "spark", 3, {"at": "headR", "speed": 45, "life": 0.8}]]}, {"delay": 420, "params": {"ParamHandLightAOn": 1, "ParamHandLightASize": 1, "ParamEyeLOpen": 0.8, "ParamEyeROpen": 0.8}, "dur": 600, "fx": [["glow", {"color": "#BFE6FF", "r": 46, "dur": 0.7}], ["burst", "sparkle", 3, {"colors": ["#BFE6FF", "#FFFFFF"]}]]}] },
      // 装作没被戳到，低头翻过一页书，眼角还是瞟了你一下
      { actions: [{"motion": ["TapBody", 0], "params": {"ParamBookPage": 1, "ParamEyeBallX": -0.6, "ParamAngleZ": -5, "ParamBodyAngleZ": -3}, "dur": 900, "fx": [["burst", "dot", 3, {"at": "chest", "speed": 40, "life": 0.7}]]}, {"delay": 480, "params": {"ParamBookPage": 0, "ParamEyeLOpen": 0.5, "ParamEyeROpen": 0.5, "ParamEyeBallX": 0.5}, "dur": 500, "fx": [["burst", "sparkle", 2, {"at": "headL", "size": 0.8, "colors": ["#FFFFFF", "#BFE6FF"]}]]}] },
      // 指尖冒出一小簇火苗，晃了晃，火星往上飘，头上丝带跟着抖
      { actions: [{"params": {"ParamFlameOn": 1, "ParamFlame": 1, "ParamFlameShaking": 0.8, "ParamEyeLOpen": 1, "ParamEyeROpen": 1}, "dur": 1100, "fx": [["burst", "ember", 4, {"at": "headR", "speed": 60, "lift": 40, "life": 0.8}]]}, {"delay": 520, "params": {"ParamFlameOn": 1, "ParamFlame": 0.5, "ParamFlameShaking": -0.8, "ParamHeadRibbon": 1}, "dur": 600, "fx": [["rise", "ember", 3, {"at": "chest", "speed": 0.8, "stagger": 0.08, "size": 0.8}]]}] },
      // 小小蓄了一下力，脚下的魔法阵转了半圈就收掉，像随手回应你
      { actions: [{"motion": ["TapBody", 2], "params": {"ParamCharge01On": 1, "ParamCharge01": 1, "ParamShoulderL": 0.5, "ParamShoulderR": 0.5}, "dur": 700, "fx": [["rise", "spark", 4, {"at": "feet", "speed": 1.1, "stagger": 0.05}]]}, {"delay": 420, "params": {"ParamMagicAOn": 1, "ParamMagicARotation": 0.6, "ParamMagicALight": 1, "ParamMagicPowersA": 0.7}, "dur": 900, "fx": [["magic", {"color": "#BFE6FF", "r": 62, "dur": 1}], ["ring", {"color": "#BFE6FF", "r1": 70, "dur": 0.6}]]}] },
    ],
    tapLines: ["……嗯。我在。", "……手，是暖的。", "在看书……不过，可以。", "……再戳，就变青蛙。", "……我没有生气。", "书页……被你弄乱了。"],
    // 连点：被连点到没脾气，半眯着眼默默把大魔法阵开起来，冰晶炸开，示意你收手
    manyTap: { actions: [{"params": {"ParamEyeLOpen": 0.3, "ParamEyeROpen": 0.3, "ParamAngleZ": 8, "ParamBodyAngleZ": 5}, "dur": 600, "fx": [["burst", "dot", 4, {"at": "headR", "speed": 35, "life": 0.6}]]}, {"delay": 420, "motion": ["TapBody", 2], "params": {"ParamCharge01On": 1, "ParamCharge01": 1, "ParamMagicBOn": 1, "ParamMagicBRotation": 0.8}, "dur": 1200, "fx": [["rise", "spark", 8, {"at": "feet", "speed": 1.3, "stagger": 0.04}], ["shake", {"amp": 4, "dur": 0.5}]]}, {"delay": 700, "params": {"ParamMagicAOn": 1, "ParamMagicARotation": 1, "ParamMagicALight": 1, "ParamMagicPowersA": 1, "ParamHandLightAOn": 1, "ParamHandLightASize": 1}, "dur": 1200, "fx": [["magic", {"color": "#BFE6FF", "r": 78, "dur": 1.2}], ["flash", {"alpha": 0.35, "dur": 0.2}], ["burst", "ice", 10, {"speed": 120}], ["ring", {"color": "#FFFFFF", "r1": 92}], ["text", "……禁止", {"color": "#5C7CC9", "size": 20}]]}] },
    manyLine: "……最后一次。真的。",
  },
  l2d_mao: {
    taps: [
      // 魔杖转一圈甩出彩虹墨水，星星眼笑着看效果，墨滴啪地落下来
      { actions: [{"exp": "exp_04", "hold": 1000, "params": {"ParamWandRotate": 1, "ParamWandInk": 1, "ParamWandInkColorRainbow": 1, "ParamEyeEffect": 1}, "dur": 900, "fx": [["burst", "confetti", 6, {"at": "headR", "speed": 110, "lift": 70, "size": 0.9}]]}, {"delay": 460, "params": {"ParamWandRotate": -1, "ParamInkDropOn": 1, "ParamInkDrop": 1, "ParamRobeFuwa": 1}, "dur": 700, "fx": [["burst", "star", 4, {"speed": 80, "colors": ["#F2C46B", "#FFD98A"]}], ["ring", {"color": "#F2C46B", "r1": 68, "dur": 0.5}]]}] },
      // 闭眼笑着变出一颗爱心送给你，项链跟着晃，爱心还偷偷变成彩虹色
      { actions: [{"motion": ["TapBody", 1], "exp": "exp_02", "hold": 1100, "params": {"ParamHeartDrow": 1, "ParamHeartSize": 1, "ParamHeartHealOn": 1, "ParamCheek": 0.6}, "dur": 1000, "fx": [["burst", "heart", 4, {"at": "headL", "speed": 60}]]}, {"delay": 500, "params": {"ParamHeartColorRainbow": 1, "ParamAccessory1": 1, "ParamAccessory2": -1}, "dur": 600, "fx": [["glow", {"color": "#F08A9B", "r": 48, "dur": 0.7}]]}] },
      // 咒语被戳岔了：缩瞳、冒烟、脸上沾了墨，最后撇嘴不服气
      { actions: [{"motion": ["TapBody", 0], "exp": "exp_07", "hold": 700, "params": {"ParamSmokeOn": 1, "ParamSmoke": 1, "ParamFaceInkOn": 1, "ParamHatBrim": 1}, "dur": 900, "fx": [["rise", "smoke", 4, {"at": "above", "speed": 0.8, "stagger": 0.06, "size": 0.9}]]}, {"delay": 520, "exp": "exp_05", "hold": 900, "params": {"ParamHeartMissOn": 1, "ParamHatTop": -1, "ParamMouthDown": 1}, "dur": 700, "fx": [["burst", "sweat", 2, {"at": "headR", "speed": 20, "lift": 0}]]}] },
      // 帽子被戳歪，鼓腮蹦一下抖抖羽毛，扶正之后又乐了
      { actions: [{"hop": 1, "squash": 0.5, "exp": "exp_08", "hold": 800, "params": {"ParamHatForm": 1, "ParamHatBrim": -1, "ParamWing": 1, "ParamMouthAngry": 1}, "dur": 800, "fx": [["burst", "note", 3, {"at": "above", "speed": 55}]]}, {"delay": 440, "exp": "exp_02", "hold": 800, "params": {"ParamHatForm": 0, "ParamWing": -1, "ParamRobeL": 1, "ParamRobeR": -1, "ParamCheek": 0.5, "ParamMouthUp": 1}, "dur": 700, "fx": [["burst", "sparkle", 4, {"colors": ["#FFD98A", "#FFFFFF"]}]]}] },
    ],
    tapLines: ["变～是不是更可爱了？", "喂！魔杖会走火的哦。", "想许愿吗？就一下下。", "再戳，把你变成南瓜～", "嘿嘿，被你发现啦。", "咒语我记得的……大概。"],
    // 连点：戳到真的生气了：鼓腮、集中线、举杖蓄力，一声「变～」炸出满天彩带，然后得意地笑
    manyTap: { actions: [{"exp": "exp_08", "hold": 900, "params": {"ParamMouthAngry": 1, "ParamCheek": 1, "ParamHatBrim": 1}, "dur": 800, "fx": [["lines", {"color": "#33303A", "n": 12, "len": 42, "dur": 0.6}], ["shake", {"amp": 4, "dur": 0.4}]]}, {"delay": 500, "motion": ["TapBody", 4], "params": {"ParamExplosionChargeOn": 1, "ParamWandRotate": 1, "ParamEyeEffect": 1}, "dur": 900, "fx": [["rise", "ember", 8, {"at": "feet", "speed": 1.2, "stagger": 0.04}], ["magic", {"color": "#FF9F43", "r": 66, "dur": 0.9}]]}, {"delay": 700, "spin": 1, "exp": "exp_04", "hold": 1200, "params": {"ParamExplosionOn": 1, "ParamSmokeOn": 1, "ParamSmoke": 1, "ParamWandInkColorRainbow": 1, "ParamRobeFuwa": 1}, "dur": 1300, "fx": [["flash", {"alpha": 0.35, "dur": 0.22}], ["burst", "confetti", 20, {"speed": 180, "lift": 130, "size": 1.1}], ["ring", {"color": "#F2C46B", "r1": 88}], ["text", "变～", {"color": "#F08A9B", "size": 24}]]}] },
    manyLine: "别戳啦——要爆炸了！变～",
  },
  l2d_mark: {
    taps: [
      // 吓一跳：先猛地缩一下、眉毛皱起，再瞬间弹回睁眼、头一歪，漫画集中线炸开，最后张嘴「哎？」
      { actions: [{"params": {"ParamEyeLOpen": 0.1, "ParamEyeROpen": 0.1, "ParamBrowLY": -0.8, "ParamBrowRY": -0.8}, "dur": 160}, {"delay": 160, "motion": ["Idle", 5], "hop": 1, "params": {"ParamEyeLOpen": 1, "ParamEyeROpen": 1, "ParamBrowLY": 1, "ParamBrowRY": 1, "ParamAngleZ": -8}, "dur": 520, "fx": [["lines", {"n": 12, "len": 34, "dur": 0.5, "color": "#33303A"}], ["burst", "star", 4, {"at": "headR", "speed": 80, "colors": ["#F2C46B", "#FFFFFF"]}]]}, {"delay": 480, "params": {"ParamMouthOpenY": 0.8, "ParamAngleZ": 6}, "dur": 450, "fx": [["burst", "sparkle", 2, {"at": "headL", "speed": 40}]]}] },
      // 举手发问：一只手举起来，歪着头飘出「为什么？」，眼睛往上看
      { actions: [{"motion": ["Idle", 3], "params": {"ParamArmR": 30, "ParamAngleZ": 10, "ParamEyeBallY": 0.6, "ParamBrowLY": 0.6, "ParamBrowRY": 0.6}, "dur": 900, "fx": [["text", "为什么？", {"size": 18, "color": "#E8553A", "at": "headR", "dur": 1.1}]]}, {"delay": 420, "params": {"ParamArmR": 30, "ParamAngleZ": -10, "ParamEyeBallX": 0.5}, "dur": 480, "fx": [["burst", "sparkle", 3, {"at": "headR", "speed": 45, "colors": ["#F2C46B", "#FFFFFF"]}]]}] },
      // 被戳到痒：身体左右扭，眯眼偷笑，头边冒音符
      { actions: [{"squash": 0.8, "params": {"ParamBodyAngleZ": 10, "ParamMouthOpenY": 0.6, "ParamEyeLOpen": 0.2, "ParamEyeROpen": 0.2}, "dur": 500, "fx": [["burst", "note", 3, {"at": "headL", "speed": 55, "colors": ["#F2C46B", "#FF6B6B"]}]]}, {"delay": 280, "params": {"ParamBodyAngleZ": -10, "ParamMouthOpenY": 0.3}, "dur": 450, "fx": [["burst", "sparkle", 2, {"at": "headR", "speed": 40}]]}] },
      // 来玩嘛：双手举高蹦两下，脚下弹出一圈，撒几片彩带
      { actions: [{"motion": ["Idle", 2], "hop": 1, "params": {"ParamArmL": 30, "ParamArmR": 30, "ParamMouthOpenY": 0.8}, "dur": 800, "fx": [["ring", {"color": "#F2C46B", "r1": 52, "dur": 0.45}], ["burst", "star", 5, {"speed": 95, "colors": ["#F2C46B", "#FF6B6B", "#FFFFFF"]}]]}, {"delay": 340, "hop": 1, "params": {"ParamArmL": 30, "ParamArmR": 30}, "dur": 460, "fx": [["burst", "confetti", 3, {"at": "chest", "speed": 70, "colors": ["#F2C46B", "#FF6B6B", "#FFFFFF"]}]]}] },
    ],
    tapLines: ["哎？你戳我干嘛！", "我在这儿呢！我在！", "为什么要戳这里呀？", "再戳我就跳起来了！", "嘿嘿，有点痒！", "你手指头好厉害！"],
    // 连点：点疯了：张大嘴、眉毛拧起，集中线全开、画面抖，星星炸一圈；接着原地转圈转晕，星星绕着头飘，喊「别戳啦！」；最后举高双手、眯着眼冒汗
    manyTap: { actions: [{"motion": ["Idle", 5], "hop": 1, "params": {"ParamMouthOpenY": 1, "ParamBrowLY": -1, "ParamBrowRY": -1}, "dur": 700, "fx": [["lines", {"n": 20, "len": 56, "dur": 0.7, "color": "#33303A"}], ["shake", {"amp": 4, "dur": 0.5}], ["burst", "star", 10, {"speed": 130, "colors": ["#F2C46B", "#FF6B6B", "#FFFFFF"]}]]}, {"delay": 420, "spin": 1, "params": {"ParamAngleZ": 16, "ParamEyeBallX": 0.8}, "dur": 800, "fx": [["burst", "star", 8, {"at": "above", "speed": 55, "gravity": 18, "stagger": 0.05}], ["text", "别戳啦！", {"size": 22, "color": "#E8553A", "at": "headR", "dur": 1.2}]]}, {"delay": 520, "params": {"ParamArmL": 30, "ParamArmR": 30, "ParamEyeLOpen": 0.2, "ParamEyeROpen": 0.2, "ParamBrowLY": -0.6, "ParamBrowRY": -0.6}, "dur": 900, "fx": [["burst", "sweat", 2, {"at": "headR", "speed": 22, "lift": 0}]]}] },
    manyLine: "别戳啦！我头都晕了！",
  },
  l2d_natori: {
    taps: [
      // 推一下眼镜：镜框上抬、镜片反光从左划到右，头侧漾出细碎光点
      { actions: [{"motion": ["TapBody", 0], "exp": "exp_01", "hold": 1200, "params": {"ParamGlassUD": 10, "ParamGrassHighlight": 1, "ParamGrassHighlightMove": -30}, "dur": 800, "fx": [["burst", "sparkle", 3, {"at": "headR", "speed": 45, "colors": ["#FFFFFF", "#BFE6FF"]}]]}, {"delay": 420, "params": {"ParamGlassUD": 0, "ParamGrassHighlight": 1, "ParamGrassHighlightMove": 30, "ParamAngleY": 6}, "dur": 420, "fx": [["glow", {"at": "headR", "color": "#BFE6FF", "r": 30, "dur": 0.6}]]}] },
      // 掏怀表：怀表弹开、链子晃，低头看一眼时间，露出困扰的「唔？」
      { actions: [{"motion": ["TapBody", 3], "params": {"ParamWatchBOpen": 30, "ParamWatchBSwitch": -1, "ParamChainWaist": 1}, "dur": 1000, "fx": [["burst", "sparkle", 2, {"at": "chest", "speed": 35, "colors": ["#F2C46B"]}]]}, {"delay": 450, "exp": "exp_03", "hold": 900, "params": {"ParamWatchBOpen": 30, "ParamWatchBSwitch": -1, "ParamWatchBRoll": 20, "ParamAngleY": -8}, "dur": 700, "fx": [["text", "唔？", {"size": 18, "color": "#5C7CC9", "at": "headR", "dur": 1}]]}] },
      // 被碰到肩：肩一耸，回头眯眼笑，燕尾一摇，脚下淡淡一圈
      { actions: [{"motion": ["TapBody", 1], "exp": "Smile", "hold": 1300, "params": {"ParamRightShoulderUp": 25, "ParamBodyAngleX": 8}, "dur": 600, "fx": [["burst", "sparkle", 3, {"at": "headL", "speed": 40, "colors": ["#F2C46B", "#FFFFFF"]}]]}, {"delay": 360, "params": {"ParamRightShoulderUp": 0, "ParamJacket": 1, "ParamWaistAngleZ": 6}, "dur": 600, "fx": [["ring", {"color": "#5C7CC9", "r1": 48, "dur": 0.5, "width": 2}]]}] },
      // 猝不及防：先整个人一颤、吃惊，随后别开脸微微脸红
      { actions: [{"exp": "Surprised", "hold": 600, "params": {"ParamAllY": 6, "ParamAngleZ": -6}, "dur": 400, "fx": [["burst", "spark", 3, {"at": "headR", "speed": 60, "colors": ["#FFFFFF", "#BFE6FF"]}]]}, {"delay": 400, "exp": "Blushing", "hold": 1100, "params": {"ParamCheek": 1, "ParamAngleY": -10, "ParamEyeBallForm": -0.5}, "dur": 900, "fx": [["burst", "heart", 2, {"at": "headL", "speed": 32, "colors": ["#F08A9B", "#F2C46B"]}]]}] },
    ],
    tapLines: ["哎呀，被你发现了。", "你的手可真闲不住。", "有事吗？我听着呢。", "轻一点，领带会乱的。", "这也算打招呼？", "我一直都在这儿。"],
    // 连点：戳到失礼：眼镜一推、镜片整片刷白（看不见眼睛），蓝色集中线加轻微画面抖；接着沉下脸说「请自重。」；最后叹口气整理袖口，镜片反光一闪恢复常态
    manyTap: { actions: [{"motion": ["TapBody", 4], "exp": "exp_03", "hold": 1600, "params": {"ParamGlassUD": 10, "ParamGrassWhite": 1, "ParamCheek": 0.6}, "dur": 1100, "fx": [["lines", {"n": 14, "len": 40, "dur": 0.6, "color": "#5C7CC9"}], ["shake", {"amp": 4, "dur": 0.4}]]}, {"delay": 500, "exp": "Angry", "hold": 1600, "params": {"ParamGrassWhite": 1, "ParamLeftShoulderUp": 20, "ParamRightShoulderUp": 20, "ParamAngleZ": 5}, "dur": 900, "fx": [["burst", "sweat", 2, {"at": "headR", "speed": 20, "lift": 0}], ["text", "请自重。", {"size": 20, "color": "#5C7CC9", "at": "headR", "dur": 1.2}]]}, {"delay": 600, "exp": "Normal", "hold": 800, "params": {"ParamGrassWhite": 0, "ParamGrassHighlight": 1, "ParamGrassHighlightMove": -20, "ParamJacket": 1, "ParamWaistAngleZ": -6}, "dur": 700, "fx": [["glow", {"at": "headR", "color": "#BFE6FF", "r": 30, "dur": 0.5}]]}] },
    manyLine: "再戳下去，我可要生气了。",
  },
  l2d_wanko: {
    taps: [
      // 耳朵唰地竖起来，嘴一闭一张「汪」，然后全身带着碗一起摇
      { actions: [{"motion": ["TapBody", 0], "params": {"PARAM_EAR_L": 1, "PARAM_EAR_R": 1, "PARAM_MOUTH_OPEN_Y": 0.1}, "dur": 180}, {"delay": 180, "params": {"PARAM_EAR_L": 1, "PARAM_EAR_R": 1, "PARAM_MOUTH_OPEN_Y": 1, "PARAM_MOUTH_FORM": 1}, "dur": 480, "fx": [["burst", "paw", 3, {"at": "headR", "speed": 60, "colors": ["#C68B59"]}]]}, {"delay": 520, "params": {"PARAM_SWING": 1, "PARAM_BOWL_SWING": 1, "PARAM_MOUTH_FORM": 1}, "dur": 700, "fx": [["burst", "bone", 2, {"speed": 70}]]}] },
      // 害羞躲碗：啪地把碗盖盖上冒热气，一会儿又顶开盖子红着脸探出来
      { actions: [{"params": {"PARAM_BOWL_LID": 1, "PARAM_YUGE_01": 1}, "dur": 650, "fx": [["rise", "smoke", 3, {"at": "head", "speed": 0.7, "colors": ["#FFF6E5"]}]]}, {"delay": 480, "params": {"PARAM_BOWL_LID": 50, "PARAM_TERE": 1, "PARAM_MOUTH_FORM": 1, "PARAM_EYE_L_OPEN": 0.7, "PARAM_EYE_R_OPEN": 0.7}, "dur": 800, "fx": [["burst", "sparkle", 2, {"at": "headR", "speed": 35, "colors": ["#FFF6E5", "#FFFFFF"]}]]}] },
      // 举起两只前爪求摸，蹦一下，脚边弹出一圈爪印
      { actions: [{"hop": 1, "params": {"PARAM_HAND_L": 1, "PARAM_HAND_R": 1, "PARAM_MOUTH_FORM": 1, "PARAM_ANGLE_Y": -8}, "dur": 750, "fx": [["ring", {"color": "#C68B59", "r1": 46, "dur": 0.45}], ["burst", "heart", 2, {"at": "headL", "speed": 38, "colors": ["#F08A9B"]}]]}, {"delay": 380, "params": {"PARAM_TERE": 0.8, "PARAM_SWING": 1, "PARAM_MOUTH_FORM": 1}, "dur": 700, "fx": [["burst", "paw", 2, {"at": "feet", "speed": 50}]]}] },
      // 歪着头「汪？」：一只眼半眯、耳朵一垂，碗跟着晃了一下
      { actions: [{"motion": ["TapBody", 1], "params": {"PARAM_ANGLE_Z": 16, "PARAM_EAR_L": 0.2, "PARAM_EYE_L_OPEN": 0.6, "PARAM_EYE_R_OPEN": 1}, "dur": 800, "fx": [["text", "汪？", {"size": 20, "color": "#C68B59", "at": "headR", "dur": 1}]]}, {"delay": 400, "params": {"PARAM_ANGLE_Z": -14, "PARAM_BOWL_SWING": 1}, "dur": 600, "fx": [["burst", "dot", 3, {"at": "headL", "speed": 30, "colors": ["#C68B59"]}]]}] },
    ],
    tapLines: ["汪！你回来啦！", "碗里有位置，坐吗？", "呜……再摸一下嘛。", "尾巴自己在摇的。", "汪汪！我一直在等你。", "我的碗也想被摸摸。"],
    // 连点：高兴过头：整个身子带着碗一起乱晃，骨头爪印乱飞；然后得意脸一歪头「汪汪汪！」；最后玩累了，一头缩进碗里盖上盖子，冒热气和汗
    manyTap: { actions: [{"motion": ["TapBody", 0], "hop": 1, "params": {"PARAM_SWING": 1, "PARAM_BOWL_SWING": 1, "PARAM_EAR_L": 1, "PARAM_EAR_R": 1, "PARAM_MOUTH_FORM": 1}, "dur": 700, "fx": [["shake", {"amp": 4, "dur": 0.5}], ["burst", "bone", 8, {"speed": 130, "colors": ["#FFF6E5", "#F5E6CC"]}], ["burst", "paw", 4, {"at": "feet", "speed": 70}]]}, {"delay": 450, "params": {"PARAM_FACE_01": 1, "PARAM_TERE": 1, "PARAM_ANGLE_Z": 14, "PARAM_HAND_L": 1}, "dur": 800, "fx": [["ring", {"color": "#C68B59", "r1": 78, "dur": 0.6}], ["text", "汪汪汪！", {"size": 20, "color": "#C68B59", "at": "headR", "dur": 1.2}]]}, {"delay": 520, "params": {"PARAM_BOWL_LID": 1, "PARAM_YUGE_01": 1, "PARAM_YUGE_02": 1}, "dur": 1200, "fx": [["rise", "smoke", 5, {"at": "head", "speed": 0.7, "colors": ["#FFF6E5", "#E8E2E0"]}], ["burst", "sweat", 2, {"at": "headR", "speed": 20, "lift": 0}]]}] },
    manyLine: "汪汪汪！我要躲碗里了！",
  },
};
