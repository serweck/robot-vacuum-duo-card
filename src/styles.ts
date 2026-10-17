import { css } from "lit";

export const styles = css`
  :host {
    --rv-chip: var(--secondary-background-color, #262626);
    --rv-line: var(--divider-color, #2c2c2c);
    --rv-mut: var(--secondary-text-color, #9b9b9b);
    --rv-blue: 59, 130, 246;
    --rv-red: 239, 68, 68;
    --rv-amber: 245, 158, 11;
    --rv-green: 34, 197, 94;
  }
  ha-card { overflow: hidden; }
  ha-icon { --mdc-icon-size: 20px; }
  .top { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 12px 14px; border-bottom: 1px solid var(--rv-line); }
  .top .t { display: flex; gap: 8px; align-items: center; font-weight: 600; font-size: 15px; }
  .lock { display: flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 999px; font-size: 12px; cursor: pointer;
          user-select: none; background: rgba(var(--rv-red), .15); color: rgb(var(--rv-red)); border: 1px solid rgba(var(--rv-red), .35); }
  .lock ha-icon { --mdc-icon-size: 16px; }
  .lock.off { background: var(--rv-chip); color: var(--rv-mut); border-color: var(--rv-line); }
  .lock.na { background: var(--rv-chip); color: var(--rv-mut); border: 1px dashed var(--rv-line); cursor: default; }
  .alert { margin: 10px 14px 0; padding: 9px 11px; border-radius: 12px; font-size: 12.5px; display: flex; gap: 8px; align-items: center;
           background: rgba(var(--rv-amber), .12); border: 1px solid rgba(var(--rv-amber), .35); color: rgb(var(--rv-amber)); }
  .alert.maint { cursor: pointer; }
  .alert.err { background: rgba(var(--rv-red), .12); border-color: rgba(var(--rv-red), .35); color: rgb(var(--rv-red)); }
  .alert ha-icon { --mdc-icon-size: 18px; flex: none; }
  .maint-list { margin: 8px 14px 0; display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .mi { background: var(--rv-chip); border-radius: 10px; padding: 7px 9px; font-size: 12px; display: flex; justify-content: space-between; gap: 6px; }
  .mi b { color: rgb(var(--rv-red)); font-weight: 600; white-space: nowrap; }
  .mi b.warn { color: rgb(var(--rv-amber)); }
  .robots { margin-top: 8px; }
  .robot { padding: 12px 14px; border-top: 1px solid var(--rv-line); }
  .robot:first-child { border-top: none; }
  .row { display: flex; gap: 12px; align-items: center; cursor: pointer; }
  .ring { width: 52px; height: 52px; border-radius: 50%; flex: none; display: grid; place-items: center;
          background: conic-gradient(rgb(var(--c)) calc(var(--p) * 1%), var(--rv-chip) 0); }
  .ring > div { width: 42px; height: 42px; border-radius: 50%; background: var(--ha-card-background, var(--card-background-color, #1c1c1c));
                display: grid; place-items: center; color: rgb(var(--c)); }
  .ring ha-icon { --mdc-icon-size: 24px; }
  .ring.run ha-icon { animation: rv-wob 1.4s ease-in-out infinite; }
  @keyframes rv-wob { 0%, 100% { transform: rotate(0); } 25% { transform: rotate(-8deg); } 75% { transform: rotate(8deg); } }
  .info { flex: 1; min-width: 0; }
  .name { font-weight: 600; font-size: 15px; display: flex; align-items: center; gap: 6px; }
  .badge { font-size: 11px; padding: 1px 6px; border-radius: 6px; background: rgba(var(--rv-red), .18); color: rgb(var(--rv-red)); font-weight: 500; }
  .state { color: var(--rv-mut); font-size: 12.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .bat { font-size: 12px; color: var(--rv-mut); display: flex; align-items: center; gap: 3px; }
  .bat ha-icon { --mdc-icon-size: 14px; }
  .btns { display: flex; gap: 6px; }
  .ib { width: 38px; height: 38px; border-radius: 12px; background: var(--rv-chip); border: none; color: var(--primary-text-color);
        display: grid; place-items: center; cursor: pointer; padding: 0; }
  .ib.pri { background: rgba(var(--rv-blue), .2); color: rgb(var(--rv-blue)); }
  .bar { height: 5px; border-radius: 3px; background: var(--rv-chip); margin-top: 10px; overflow: hidden; }
  .bar > div { height: 100%; background: rgb(var(--rv-blue)); border-radius: 3px; transition: width .6s ease; }
  .detail { margin-top: 4px; }
  .lbl { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: var(--rv-mut); margin: 12px 0 6px; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip { padding: 7px 11px; border-radius: 10px; background: var(--rv-chip); font-size: 12.5px; cursor: pointer; display: flex; gap: 6px; align-items: center; }
  .chip ha-icon { --mdc-icon-size: 16px; }
  .chip.rut { background: rgba(var(--rv-green), .12); color: rgb(var(--rv-green)); }
  .chip.dis { opacity: .45; cursor: default; }
  .seg { display: flex; flex-wrap: wrap; background: var(--rv-chip); border-radius: 10px; padding: 3px; gap: 3px; }
  .seg div { flex: 1 1 auto; min-width: 0; text-align: center; padding: 6px 6px; border-radius: 8px; font-size: 12px; cursor: pointer;
             color: var(--rv-mut); white-space: nowrap; }
  .seg div.on { background: var(--primary-color, rgb(var(--rv-blue))); color: var(--text-primary-color, #fff); }
  .rooms-note { font-size: 12px; color: var(--rv-mut); display: flex; gap: 6px; align-items: center; }
  .rooms-note ha-icon { --mdc-icon-size: 16px; }
  .pad { height: 4px; }
`;
