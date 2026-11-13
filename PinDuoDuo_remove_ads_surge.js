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
  "/api/aquarius/hungary/global/homepage", "/api/aquarius/hungary/global/personal_center", "/api/caterham/v3/query/order_express_group",
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
// 个人中心商品区（推荐流）：上次通知里 personal/hub 顶层有 show_recommend_feed_ban... 和 module_list_map，
// 直接把所有 show_recommend_feed* 开关关掉，并删掉 module_list_map 里带 feed/recommend 的模块。
function scrubRecommendFeed(obj, depth) {
  if (!obj || typeof obj !== "object" || depth > 6) return 0;
  let n = 0;
  if (Array.isArray(obj)) {
    obj.forEach((o) => { n += scrubRecommendFeed(o, depth + 1); });
    return n;
  }
  for (const k in obj) {
    const lk = k.toLowerCase();
    if (lk.includes("show_recommend_feed")) {
      if (obj[k] !== false && obj[k] !== 0) { obj[k] = false; n += 1; }
    } else if (k === "module_list_map" && obj[k] && typeof obj[k] === "object") {
      for (const mk in obj[k]) {
        const ml = mk.toLowerCase();
        if (ml.includes("feed") || ml.includes("recommend")) { delete obj[k][mk]; n += 1; }
      }
    }
    if (obj[k] && typeof obj[k] === "object") n += scrubRecommendFeed(obj[k], depth + 1);
  }
  return n;
}
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
  const _feed = scrubRecommendFeed(_probe, 0);
  if (_removed > 0 || _sections > 0 || _feed > 0) {
    try { $notification.post("PDD测试", "底栏/商品区过滤到了", url.slice(0, 120) + " 底栏去了" + _removed + "个 商品区去了" + _sections + "个 推荐流关了" + _feed + "个"); } catch (e) {}
    try { console.log("[PDD] scrub bottom_tabs removed=" + _removed + " sections=" + _sections + " feed=" + _feed + " url=" + url); } catch (e) {}
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
