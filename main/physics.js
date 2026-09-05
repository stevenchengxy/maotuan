import { screen } from "electron";

// 扔它：窗口按抛物线飞出去，碰到屏幕边缘弹一下，落地压扁。
export function throwWindow(win, vx, vy, { onBounce, onLand } = {}) {
  if (!win || win.isDestroyed()) return;
  const [w, h] = win.getSize();
  let [x, y] = win.getPosition();
  const wa = screen.getDisplayNearestPoint({ x: x + w / 2, y: y + h / 2 }).workArea;
  const floor = wa.y + wa.height - h, left = wa.x, right = wa.x + wa.width - w, top = wa.y;
  const G = 2600, REST = 0.55, WALL = 0.6, FRICTION = 0.985;
  let px = x, py = y, t0 = Date.now(), last = t0, bounces = 0, done = false;
  const timer = setInterval(() => {
    if (win.isDestroyed()) { clearInterval(timer); return; }
    const now = Date.now(); const dt = Math.min(0.05, (now - last) / 1000); last = now;
    vy += G * dt; px += vx * dt; py += vy * dt; vx *= FRICTION;
    if (py >= floor) { py = floor; if (Math.abs(vy) > 160) { vy = -vy * REST; vx *= 0.85; bounces++; if (onBounce) onBounce(Math.min(1, Math.abs(vy) / 1400)); } else { vy = 0; if (Math.abs(vx) < 40) done = true; else vx *= 0.9; } }
    if (py < top) { py = top; vy = -vy * WALL; }
    if (px < left) { px = left; vx = -vx * WALL; if (onBounce) onBounce(0.4); }
    if (px > right) { px = right; vx = -vx * WALL; if (onBounce) onBounce(0.4); }
    win.setPosition(Math.round(px), Math.round(py), false);
    if (done || now - t0 > 5000) { clearInterval(timer); win.setPosition(Math.round(px), Math.round(floor > py ? py : floor), false); if (onLand) onLand(bounces); }
  }, 16);
  return () => clearInterval(timer);
}
