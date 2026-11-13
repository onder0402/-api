// PinDuoDuo_homepage_hub.js — 仅处理 api/alexa/homepage/hub 一个接口。
// 用途：homepage/hub 的响应在双十一期间很可能超过 Surge iOS 的 Body Rewrite 1MB 上限，
// 超了 Body Rewrite 会整条原样放行，底栏一定失败。脚本的 max-size 可放宽到 10MB，
// 是 Surge 里唯一能处理 >1MB 响应的原生办法（脚本 max-size=-1 可完全不限，但 10MB 已
// 覆盖可莉实测遇到过的 5.06MB，留有余量；过大有 iOS 网络扩展内存压力风险）。
// 只做 Loon 原版 homepage/hub 的那几件事，不做其它接口，不发通知、不探针。
// 要求：模块里 [Script] 的 script-update-interval=0，否则远程脚本默认 24 小时才更新。
let body = $response.body;
try {
  const o = JSON.parse(body);
  const r = o && o.result;
  if (r && typeof r === "object") {
    if (r.dy_module && typeof r.dy_module === "object") delete r.dy_module.irregular_banner_dy;
    delete r.icon_set;
    delete r.search_bar_hot_query;
    const keep = ["index.html", "chat_list.html", "personal.html"];
    if (Array.isArray(r.bottom_tabs)) r.bottom_tabs = r.bottom_tabs.filter(t => t && keep.indexOf(t.link) !== -1);
    if (Array.isArray(r.buffer_bottom_tabs)) r.buffer_bottom_tabs = r.buffer_bottom_tabs.filter(t => t && keep.indexOf(t.link) !== -1);
    if (Array.isArray(r.all_top_opts)) {
      r.all_top_opts.forEach(t => {
        if (t && typeof t === "object") { delete t.selected_image; delete t.image; delete t.height; delete t.width; }
      });
    }
    body = JSON.stringify(o);
  }
} catch (e) {}
$done({ body });
