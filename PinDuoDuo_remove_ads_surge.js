/*
  拼多多去广告 - Surge 版
  来源: 可莉 / ZenmoFeiShi 的 Loon 插件 PinDuoDuo_remove_ads.plugin
        (Moli-X/Tool, 2026-10-02, Loon 3.5.1)
  改写原因: 原版主体不是 JS, 而是 Loon 3.5 新的内置 Rewrite 语法
        response.json.delete / response.json.jq / request ... reject_dict(200)
        Surge 没有这套语法, 直接导入/转换会被丢掉, 所以改成 Surge 的
        http-response JS, 用 $response.body + JSON.parse 手工实现同样的删除/过滤.
  用法见同目录 PinDuoDuo_remove_ads.sgmodule
*/

const url = $request.url || "";
let body = $response.body || "";
// Loon 的 reject_dict(200)：返回 200 + 空字典 {}，App 收到空数据就简化/不显示。
// Surge 的 Rule REJECT 是直接断连，App 会用缓存，底栏就不变，所以这里用 JS 返回 {} 来模拟。
const REJECT_PATHS = [
  "/api/aristotle/unrated_order_for_unreceived_tab", "/api/aristotle/query_order_list_tabs_element",
  "/api/aquarius/hungary/global/homepage", "/api/caterham/v3/query/order_express_group",
  "/search_hotquery", "/api/zaire_biz/chat/resource/get_list_data", "/api/caterham/v3/query/new_chat_group",
  "/api/alexa/goods/back_up", "/api/caterham/v3/query/personal", "/api/brand-olay/goods_detail/bybt_guide",
  "/api/engels/reviews/require/append", "/api/caterham/v3/query/my_order_group", "/api/caterham/v3/query/likes",
  "/api/phantom/gbdbpdv/extra", "/api/manufacturer/cross/shortcut/list",
  "/api/dunkirk/liveactivity/push/create/url/report", "/api/growth/nagato/app/index/gather",
  "/api/engels/wait/receive/review", "/api/buffon/nasus/recommend", "/api/caterham/v2/query/goods_detail_with_tags",
];
const isRejectDict = REJECT_PATHS.some((p) => url.includes(p));
if (isRejectDict) {
  try { console.log("[PDD] reject_dict url=" + url); } catch (e) {}
  body = "{}";
}
// 结构探针：personal / oak / render 这几条是个人中心的数据源，通知里报它们返回的顶层字段，
// 就能知道商品区到底叫什么字段（之前猜的 bottom_section_list 一个都没命中）。
// 深探针：personal/hub 里重点找 recommend/feed/goods 相关的字段和 module_list_map 的键，
// 上次通知里看到 show_recommend_feed_ban... 被截断了，这次把带 recommend/feed 的键和值都报出来。
try {
  if (!isRejectDict && /personal\/hub/.test(url) && body) {
    const _o = JSON.parse(body);
    const _found = [];
    const _walk = (o, depth, path) => {
      if (!o || typeof o !== "object" || depth > 3) return;
      if (Array.isArray(o)) { o.slice(0, 2).forEach((x) => _walk(x, depth + 1, path)); return; }
      for (const k in o) {
        const lk = k.toLowerCase();
        if (lk.includes("recommend") || lk.includes("feed") || lk.includes("goods_list")) {
          const v = o[k];
          _found.push(path + k + "=" + (typeof v === "object" ? "obj" : String(v)).slice(0, 30));
        }
        if (k === "module_list_map" && o[k] && typeof o[k] === "object") {
          _found.push("module_list_map keys=" + Object.keys(o[k]).join(",").slice(0, 100));
        }
        if (o[k] && typeof o[k] === "object") _walk(o[k], depth + 1, path + k + ".");
      }
    };
    _walk(_o, 0, "");
    $notification.post("PDD深探", "personal/hub", _found.join(" | ").slice(0, 300) || "no recommend/feed keys");
  } else if (!isRejectDict && /personal|oak|render/.test(url) && body) {
    const _o = JSON.parse(body);
    const _keys = Object.keys(_o).join(",");
    const _rk = _o.result && typeof _o.result === "object" ? Object.keys(_o.result).join(",") : "";
    $notification.post("PDD结构", url.split("?")[0].slice(-60), "顶层:" + _keys.slice(0, 120) + " | result:" + _rk.slice(0, 120));
  }
} catch (e) {}
try { console.log("[PDD] hit url=" + url + " body_len=" + body.length); } catch (e) {}
// 通用兜底：不管接口叫什么，只要返回里有 bottom_tabs 就过滤。
// 2026-11-14 用户实测：最近请求里根本没有 homepage/hub 这条，说明新版 App
// 已经不走 api/alexa/homepage/hub 了，之前只认这一个 URL 的写法永远跑不到。
// 个人中心下面那排商品（图里 YAYA、帮宝适那排）大概率是 oak/render 的 bottom_section_list，
// 但它不一定在顶层，可能嵌在 result/ui/data 下面任意一层，之前只删顶层删不到。
// 这里递归删掉任何层级的 bottom_section_list，顺带删 personal_banner / monthly_card_entrance。
function scrubSectionList(obj, depth) {
  if (!obj || typeof obj !== "object" || depth > 6) return 0;
  let n = 0;
  if (Array.isArray(obj)) {
    obj.forEach((o) => { n += scrubSectionList(o, depth + 1); });
    return n;
  }
  ["bottom_section_list", "personal_banner", "monthly_card_entrance"].forEach((k) => {
    if (k in obj) { delete obj[k]; n += 1; }
  });
  if (obj.ui && typeof obj.ui === "object" && obj.ui.bottom_section) { delete obj.ui.bottom_section; n += 1; }
  for (const k in obj) {
    if (obj[k] && typeof obj[k] === "object") n += scrubSectionList(obj[k], depth + 1);
  }
  return n;
}
function scrubBottomTabs(obj, depth) {
  if (!obj || typeof obj !== "object" || depth > 6) return 0;
  let n = 0;
  if (Array.isArray(obj)) {
    obj.forEach((o) => { n += scrubBottomTabs(o, depth + 1); });
    return n;
  }
  const keep = ["index.html", "chat_list.html", "personal.html"];
  ["bottom_tabs", "buffer_bottom_tabs"].forEach((k) => {
    if (Array.isArray(obj[k])) {
      const before = obj[k].length;
      obj[k] = obj[k].filter((t) => t && keep.includes(t.link));
      if (obj[k].length !== before) n += before - obj[k].length;
    }
  });
  for (const k in obj) {
    if (obj[k] && typeof obj[k] === "object") n += scrubBottomTabs(obj[k], depth + 1);
  }
  return n;
}
try {
  const _probe = JSON.parse(body);
  const _removed = scrubBottomTabs(_probe, 0);
  const _sections = scrubSectionList(_probe, 0);
  if (_removed > 0 || _sections > 0) {
    try { $notification.post("PDD测试", "底栏/商品区过滤到了", url.slice(0, 120) + " 底栏去了" + _removed + "个 商品区去了" + _sections + "个"); } catch (e) {}
    try { console.log("[PDD] scrub bottom_tabs removed=" + _removed + " sections=" + _sections + " url=" + url); } catch (e) {}
    body = JSON.stringify(_probe);
  }
} catch (e) {}

function delPath(obj, path) {
  if (!obj || typeof obj !== "object") return;
  const keys = path.split(".");
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    cur = cur[keys[i]];
    if (!cur || typeof cur !== "object") return;
  }
  delete cur[keys[keys.length - 1]];
}

function delPaths(obj, paths) {
  paths.forEach((p) => delPath(obj, p));
}

try {
  const obj = JSON.parse(body);
  let changed = false;

  // 首页 hub: 删横幅/图标集/热搜, 底栏只留 首页/消息/我的, 顶部入口去图
  // 原 Loon:
  // response.json.delete(["result.dy_module.irregular_banner_dy","result.icon_set","result.search_bar_hot_query"])
  // response.json.jq(".result.bottom_tabs? |= map(select(.link | IN(\"index.html\",\"chat_list.html\",\"personal.html\"))) | .result.buffer_bottom_tabs? |= map(select(...)) | .result.all_top_opts |= map(del(.selected_image,.image,.height,.width))")
  if (/\/api\/alexa\/homepage\/hub/.test(url)) {
    delPaths(obj, [
      "result.dy_module.irregular_banner_dy",
      "result.icon_set",
      "result.search_bar_hot_query",
    ]);
    const keep = ["index.html", "chat_list.html", "personal.html"];
    ["bottom_tabs", "buffer_bottom_tabs"].forEach((k) => {
      if (obj.result && Array.isArray(obj.result[k])) {
        obj.result[k] = obj.result[k].filter((t) => t && keep.includes(t.link));
      }
    });
    try { console.log("[PDD] homepage bottom_tabs before=" + (obj.result && obj.result.bottom_tabs ? obj.result.bottom_tabs.length : "none") + " keys=" + (obj.result ? Object.keys(obj.result).join(",") : "no-result")); } catch (e) {}
    if (obj.result && Array.isArray(obj.result.all_top_opts)) {
      obj.result.all_top_opts.forEach((o) => {
        if (o && typeof o === "object") {
          delete o.selected_image; delete o.image; delete o.height; delete o.width;
        }
      });
    }
    changed = true;
  }

  // 搜索: 删 expansion
  else if (/\/search/.test(url)) {
    delPaths(obj, ["expansion", "result.expansion"]);
    changed = true;
  }

  // 个人中心 hub: 精简个人主页
  // 原 Loon: delete(["monthly_card_entrance","personal_center_style_v2_vo","icon_set.icons","icon_set.top_personal_icons","personal_banner"])
  else if (/\/api\/philo\/personal\/hub/.test(url)) {
    delPaths(obj, [
      "monthly_card_entrance",
      "personal_center_style_v2_vo",
      "icon_set.icons",
      "icon_set.top_personal_icons",
      "personal_banner",
      "result.monthly_card_entrance",
      "result.personal_center_style_v2_vo",
      "result.personal_banner",
    ]);
    changed = true;
  }

  // oak render: 删底部/直播浮层
  // 原 Loon: delete(["bottom_section_list","ui.bottom_section","ui.live_section.float_info"])
  else if (/\/api\/oak\/integration\/render/.test(url)) {
    delPaths(obj, [
      "bottom_section_list",
      "ui.bottom_section",
      "ui.live_section.float_info",
      "result.bottom_section_list",
    ]);
    changed = true;
  }

  // 订单详情: 删商品推荐列表
  else if (/\/api\/caterham\/v3\/query\/order_detail_group/.test(url)) {
    delPaths(obj, ["data.goods_list"]);
    changed = true;
  }

  // 订单页: 删营销横幅
  else if (/\/order\//.test(url)) {
    delPaths(obj, ["marketing_banner_vo", "shipping.banner_above_recommend"]);
    changed = true;
  }

  // 订单列表 v4: 删订单按钮里的成长提示
  // 原 Loon: jq(".orders |= map(.order_buttons |= map(del(.order_growth_tip)))")
  else if (/\/api\/aristotle\/order_list_v4/.test(url)) {
    if (Array.isArray(obj.orders)) {
      obj.orders.forEach((o) => {
        if (o && Array.isArray(o.order_buttons)) {
          o.order_buttons.forEach((b) => { if (b) delete b.order_growth_tip; });
        }
      });
    }
    changed = true;
  }

  if (changed) body = JSON.stringify(obj);
} catch (e) {
  // 解析失败就原样返回, 不破坏正常请求
}

$done({ body });
