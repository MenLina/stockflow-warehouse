export const stylesheet = `
:root {
  color-scheme: light;
  --bg: #f2f5f2; --ink: #172a23; --muted: #53645c; --line: #dce5df;
  --panel: #fff; --dark: #122520; --green: #176345; --green-dark: #104d35;
  --mint: #dfefe4; --danger: #9b3130; --radius: 15px;
  font: 16px/1.5 "Inter", "Segoe UI", Arial, sans-serif;
}
*, *::before, *::after { box-sizing: border-box; }
body { margin: 0; color: var(--ink); background: var(--bg); min-width: 280px; }
a { color: var(--green); }
button, input, select, textarea { font: inherit; }
button { cursor: pointer; }
:focus-visible { outline: 3px solid #2d825d; outline-offset: 3px; }
.skip { position: absolute; z-index: 1; top: -100px; left: 16px; padding: 8px; background: white; }
.skip:focus { top: 8px; }
.app { display: grid; grid-template-columns: 230px minmax(0, 1fr); min-height: 100vh; }
.sidebar { position: sticky; top: 0; align-self: start; display: flex; flex-direction: column;
  min-height: 100vh; padding: 26px 16px 16px; background: var(--dark); color: #fff; }
.brand { display: flex; align-items: center; gap: 12px; color: inherit; text-decoration: none;
  font-weight: 760; font-size: 1.32rem; letter-spacing: -.035em; line-height: 1.2; }
.sidebar .brand { margin: 0 8px 38px; }
.brand small { display: block; margin-top: 4px; color: #abc4b7; font-size: .72rem;
  font-weight: 500; letter-spacing: .01em; }
.logo { display: grid; align-content: center; justify-content: center; gap: 3px;
  width: 40px; height: 40px; border-radius: 12px; background: #b6e8a5; flex: none; }
.logo i { width: 17px; height: 3px; border-radius: 2px; background: #255635; }
.logo i:nth-child(2) { width: 12px; }
.logo i:nth-child(3) { width: 8px; }
.sidebar nav { display: grid; gap: 6px; }
.sidebar nav a { display: flex; align-items: center; gap: 12px; border-radius: 9px; padding: 10px 11px;
  font-size: .89rem; text-decoration: none; color: #d0dfd5; }
.sidebar nav a > span { display: inline-grid; place-items: center; width: 22px; font-size: 1.15rem; line-height: 1; }
.sidebar nav a:hover { background: #213b32; color: #fff; }
.sidebar nav a[aria-current] { background: #29483b; color: #d8f5ca; font-weight: 700; }
.account { margin-top: auto; display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
  padding: 16px 6px 4px; border-top: 1px solid #335146; }
.avatar { display: grid; place-items: center; flex: none; width: 34px; height: 34px; border-radius: 50%;
  color: #e1f6dd; background: #345749; font-weight: 750; }
.account-name { overflow: hidden; min-width: 0; flex: 1; }
.account-name strong, .account-name small { display: block; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; }
.account-name strong { font-size: .78rem; }
.account-name small { font-size: .72rem; color: #abc4b7; }
.logout { display: inline-block; color: #cee1d3; background: transparent; border: 0; padding: 5px 3px; font-size: .74rem; }
.account form { margin: 0; }
.logout:hover { color: #fff; text-decoration: underline; }
.main { width: 100%; max-width: 1510px; margin: 0 auto; padding: 24px clamp(18px, 4vw, 55px) 50px; }
.topbar { min-height: 40px; display: flex; align-items: center; justify-content: space-between; gap: 12px;
  border-bottom: 1px solid var(--line); padding-bottom: 14px; color: var(--muted); font-size: .85rem; }
.warehouse { display: flex; align-items: center; gap: 8px; color: var(--ink); font-weight: 650; }
.warehouse span { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #41855e; }
.page-head { display: flex; flex-wrap: wrap; align-items: end; justify-content: space-between; gap: 16px;
  margin: 29px 0 22px; }
h1, h2, p { margin: 0; }
h1 { font-size: clamp(1.95rem, 4vw, 2.8rem); line-height: 1.11; letter-spacing: -.05em; }
.page-head p { color: var(--muted); margin-top: 8px; font-size: .95rem; }
h2 { font-size: 1.13rem; letter-spacing: -.015em; }
.actions { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.button { display: inline-flex; justify-content: center; align-items: center; text-align: center;
  min-height: 42px; padding: 8px 14px; border: 1px solid #cddbd2; border-radius: 9px;
  background: #fff; color: var(--ink); text-decoration: none; font-size: .88rem; font-weight: 660; }
.button:hover { background: #edf4ee; border-color: #aec5b7; }
.button.primary { background: var(--green); color: #fff; border-color: var(--green); }
.button.primary:hover { background: var(--green-dark); border-color: var(--green-dark); }
.button.quiet { background: transparent; border-color: transparent; color: var(--green); }
.button.quiet:hover { background: #edf4ee; }
.button.danger { color: var(--danger); border-color: #e2babb; }
.button.danger:hover { background: #fff2f2; }
.metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 13px; margin-bottom: 21px; }
.metric, .panel { border: 1px solid var(--line); border-radius: var(--radius); background: var(--panel); }
.metric { display: grid; justify-items: start; align-content: start; min-height: 126px; padding: 15px 17px; }
.metric-icon { display: grid; place-items: center; background: var(--mint); color: var(--green-dark);
  width: 33px; height: 33px; border-radius: 8px; font-size: 1.16rem; }
.metric p { margin-top: 8px; color: var(--muted); font-size: .83rem; }
.metric strong { font-size: 1.95rem; line-height: 1.18; letter-spacing: -.04em; }
.panel-head { min-height: 62px; padding: 15px 20px; display: flex; align-items: center;
  flex-wrap: wrap; justify-content: space-between; gap: 10px; }
.text-link { font-size: .87rem; font-weight: 680; text-decoration: none; }
.text-link:hover { text-decoration: underline; }
.table-scroll { width: 100%; overflow: auto; border-radius: 0 0 var(--radius) var(--radius); }
table { border-collapse: collapse; width: 100%; text-align: left; font-size: .89rem; }
th, td { padding: 12px 18px; border-bottom: 1px solid #e8ede9; }
tbody tr:last-child td { border-bottom: 0; }
tbody tr:hover { background: #fafcf9; }
th { font-weight: 670; color: #43574c; background: #f4f7f4; border-top: 1px solid #e8ede9; white-space: nowrap; font-size: .79rem; }
td small { display: block; color: var(--muted); font-size: .76rem; margin-top: 2px; }
.sku { color: #425b4d; font: .84rem ui-monospace, monospace; white-space: nowrap; }
.status { display: inline-block; border-radius: 999px; padding: 3px 9px; font-size: .75rem;
  line-height: 1.35; font-weight: 680; white-space: nowrap; }
.in-stock { color: #205b3d; background: #e5f2e8; }
.out-of-stock { color: #6a4c29; background: #f5ede2; }
.movement { font-weight: 700; }
.positive { color: #216545; }
.nowrap { white-space: nowrap; }
.filters { display: flex; flex-wrap: wrap; align-items: end; gap: 11px; padding: 17px 18px; }
.filters label:first-child { min-width: min(220px, 100%); flex: 1; }
.filters label { flex: 1; min-width: min(141px, 100%); }
.form-panel { max-width: 670px; padding: 22px; }
.form-panel > p { margin-bottom: 15px; color: var(--muted); }
.form { display: grid; gap: 16px; }
.operation-types { margin-bottom: 16px; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
label { display: grid; gap: 5px; color: var(--ink); font-size: .88rem; font-weight: 680; }
input, select, textarea { display: block; min-width: 0; width: 100%; min-height: 42px; padding: 8px 10px;
  background: white; color: var(--ink); border: 1px solid #cbd9cf; border-radius: 8px; font-weight: 450; }
textarea { resize: vertical; }
input::placeholder, textarea::placeholder { color: #61746a; }
.optional { font-weight: 400; color: var(--muted); font-size: .77rem; }
.form .actions { margin-top: 4px; }
.remove { border-top: 1px solid var(--line); margin-top: 21px; padding-top: 15px; }
.remove summary { color: var(--danger); cursor: pointer; font-size: .87rem; font-weight: 680; }
.remove p { margin: 8px 0 12px; font-size: .88rem; color: var(--muted); }
.notice { padding: 11px 14px; margin-bottom: 17px; border: 1px solid #b9d8c3;
  border-radius: 9px; background: #e9f5ea; color: #184d32; }
.notice-error { background: #fff0f0; border-color: #ebc0bf; color: #8a292b; }
.empty { padding: 31px 18px; color: var(--muted); }
.empty strong { color: var(--ink); }
.empty p { margin-top: 4px; font-size: .88rem; }
.pagination { display: flex; gap: 12px; align-items: center; justify-content: center; padding: 14px; color: var(--muted); }
.login-body { background: radial-gradient(ellipse at 90% 8%, #d4e8d5 0, transparent 51%), var(--bg); }
.login { display: grid; min-height: 100vh; place-items: center; padding: 22px; }
.login-card { width: min(100%, 425px); padding: clamp(20px, 6vw, 36px); background: white;
  border: 1px solid var(--line); border-radius: 20px; box-shadow: 0 14px 38px #16382912; }
.login-card .brand small { color: var(--muted); }
.login-card h1 { font-size: 1.87rem; margin: 23px 0 17px; }
.demo { margin-top: 17px; color: var(--muted); font-size: .84rem; }
.demo summary { cursor: pointer; color: var(--green); font-weight: 650; }
.demo dt { font-weight: 680; }
.demo dd { margin: 0 0 6px; }
@media (max-width: 950px) {
  .app { grid-template-columns: 188px minmax(0, 1fr); }
  .sidebar { padding-inline: 10px; }
  .sidebar nav a { padding-inline: 9px; }
  .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 700px) {
  .app { display: block; }
  .sidebar { position: static; min-height: auto; flex-direction: row; flex-wrap: wrap; align-items: center; gap: 10px; padding: 12px; }
  .sidebar .brand { margin: 0; }
  .sidebar nav { order: 3; width: 100%; display: flex; flex-wrap: wrap; gap: 4px; }
  .sidebar nav a { padding: 6px; gap: 3px; font-size: .78rem; }
  .sidebar nav a > span { font-size: .93rem; width: 18px; }
  .account { margin: 0 0 0 auto; padding: 0; border: 0; }
  .avatar { display: none; }
  .main { padding-top: 17px; }
  .page-head { margin-top: 21px; gap: 12px; }
  .metric { min-height: 116px; }
  .filters, .form-panel { padding: 15px; }
  th, td { padding: 10px 12px; }
}
@media (max-width: 390px) { .account-name { display: none; } .form-grid { grid-template-columns: 1fr; } }
`;
