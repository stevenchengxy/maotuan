const { contextBridge, ipcRenderer, webUtils } = require("electron");
const OK = /^(pet|panel|chat|feed|read|voice|settings|secret|state|app|mcp|name|say|stt|book|game|hooks|sing|draw|pictures):/;
contextBridge.exposeInMainWorld("mt", {
  invoke: (ch, data) => OK.test(ch) ? ipcRenderer.invoke(ch, data) : Promise.reject(new Error("bad channel")),
  send: (ch, data) => { if (OK.test(ch)) ipcRenderer.send(ch, data); },
  on: (ch, fn) => { const h = (_e, d) => fn(d); ipcRenderer.on(ch, h); return () => ipcRenderer.removeListener(ch, h); },
  pathFor: (file) => { try { return webUtils.getPathForFile(file); } catch { return ""; } }
});
