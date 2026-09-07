import { makeFx } from "./fx2d.js";
import { expandTaps } from "./taps.js";

// 给"自带渲染循环、不走 vectorBase"的皮肤（毛团、水母）加一层特效：
// 在它的画布上面盖一张透明画布画特效，抖动用 CSS transform 抖原来那张。
export function withFx(make, def = {}) {
  return function (canvas, opts = {}) {
    const base = make(canvas, opts);
    const over = document.createElement("canvas");
    over.style.cssText = "position:absolute;left:0;top:0;pointer-events:none;";
    canvas.parentNode.insertBefore(over, canvas.nextSibling);
    const octx = over.getContext("2d");
    const fx = makeFx(() => { const g = base.geometry(); const hy = g.cy - g.R * (def.headK ?? 0.5); return { cx: g.cx, cy: g.cy, R: g.R, head: { x: g.cx, y: hy }, chest: { x: g.cx, y: g.cy }, feet: { x: g.cx, y: g.cy + g.R * 0.95 } }; });
    const REACT = expandTaps(def);
    let alive = true, raf = 0, last = performance.now(), timers = [];
    const dpr = () => Math.min(2, window.devicePixelRatio || 1);
    // 盖在那张画布正上方（舞台可能比窗口小、还带 translateX(-50%)，所以按实际位置对齐）
    function size() {
      const pr = canvas.parentNode.getBoundingClientRect(), r = canvas.getBoundingClientRect(), d = dpr();
      over.style.left = (r.left - pr.left) + "px"; over.style.top = (r.top - pr.top) + "px";
      over.style.width = r.width + "px"; over.style.height = r.height + "px";
      over.width = Math.max(1, Math.round(r.width * d)); over.height = Math.max(1, Math.round(r.height * d));
      octx.setTransform(d, 0, 0, d, 0, 0);
    }
    size();
    const ro = new ResizeObserver(size); ro.observe(canvas);
    const onWin = () => setTimeout(size, 20); window.addEventListener("resize", onWin);
    (function loop(now) {
      if (!alive) return;
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      fx.tick(dt);
      const d = dpr(); const sh = fx.shakeOffset();
      octx.setTransform(d, 0, 0, d, 0, 0);
      octx.clearRect(0, 0, over.width / d, over.height / d);
      octx.save(); octx.translate(sh.x, sh.y);
      fx.drawLayers(octx, true); fx.drawParts(octx); fx.drawLayers(octx, false);
      octx.restore();
    })(last);
    function runSteps(steps, ctxArg) {
      let t = 0;
      for (const st of steps || []) {
        t += st.delay || 0;
        const go = () => {
          if (!alive) return;
          if (st.fx) fx.run(st.fx, ctxArg);
          if (st.hop) base.S.hop = 1.0001;
          if (st.spin) base.spin();
          if (st.squash) base.S.squash = 1 + st.squash * 0.22;
          if (st.mood) base.setMood(st.mood);
          if (st.look && base.S.lookTarget) { base.S.lookTarget.x = st.look[0]; base.S.lookTarget.y = st.look[1]; }
        };
        if (t) timers.push(setTimeout(go, t)); else go();
      }
    }
    return {
      ...base, fx, character: def.character || null, lines: (def.character && def.character.lines) || null,
      react: (ev, ctxArg) => { const steps = REACT[ev]; if (steps) runSteps(steps, ctxArg); return !!steps; },
      resize: () => { size(); base.resize && base.resize(); },
      destroy: () => { alive = false; cancelAnimationFrame(raf); for (const t of timers) clearTimeout(t); ro.disconnect(); window.removeEventListener("resize", onWin); over.remove(); base.destroy(); }
    };
  };
}
