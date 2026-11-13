# 拼多多去广告 Surge 版

来源：可莉 / ZenmoFeiShi 的 Loon 插件 `PinDuoDuo_remove_ads.plugin`（仓库 Moli-X/Tool，2026-10-02，`#!loon_version=3.5.1`）。kelee.one 当时被 Cloudflare 拦住了（Sorry, you have been blocked），没法直接读 `.lpx`，但仓库里的 `.plugin` 就是同一份源码，已经按它逐条改写。

安装链接（Surge 从 URL 安装模块）：

- 模块：https://raw.githubusercontent.com/onder0402/-api/main/PinDuoDuo_remove_ads.sgmodule
- JS：https://raw.githubusercontent.com/onder0402/-api/main/PinDuoDuo_remove_ads_surge.js

注意：这个仓库以前的 `AllFootball.list`、`bilibili_request.js`、旧 `README.md` 已经按主人要求删了（旧内容还能在 Git 历史的 e230b73e30bc971a4efd8bdb7d818e9cd5e502fc 那次提交里找回来）。

## 为什么在 Surge 里只有底栏生效

原版主体根本不是 JS 脚本，是 Loon 3.5 的内置 Rewrite 语法：

- 请求拦截：`request if ${url} ~= /.../i then reject_dict(200)`，共 20 条
- 响应改写：`response if ${url} ~= /.../i then response.json.delete([...])`，共 6 组
- 响应改写：`response.json.jq(...)`，2 条（首页底栏、订单列表）

Surge 没有 `response.json.delete` / `response.json.jq` / `reject_dict` 这套语法。直接导入 `.lpx`，或用 script.hub / Sub-Store 一键转换，[Rewrite] 这部分基本会被丢掉或只转出一部分。

只有底栏那条是 `jq`，部分转换工具能把它转成 JS，所以你看到底栏简化了；个人主页、首页横幅、搜索、订单页这些全靠 `delete`，被丢了就原样回来。`[Rule]` 里 `AND((URL-REGEX),(USER-AGENT))` 和 `AND((DOMAIN),(PROTOCOL,QUIC))` 也是 Loon 复合规则，Surge 同样不支持。

## 这个 Surge 版改了什么

- `PinDuoDuo_remove_ads_surge.js`：一个 http-response JS，按 URL 分发，用 `JSON.parse` + 手工删字段实现原来 7 条 delete/jq 的全部逻辑（首页 hub、搜索、个人中心、oak、订单详情、订单页、订单列表）。
- `PinDuoDuo_remove_ads.sgmodule`：
  - `[Rule]`：域名 REJECT 照搬，直连 IP 的两条去掉 USER-AGENT 条件，只留 URL-REGEX。
  - `[URL Rewrite]`：20 条 `reject_dict(200)` 改成 Surge 的 `^url - reject-dict`。
  - `[Script]`：主 JS + 扫码取件页原版 JS（远程地址不变）。
  - `[MITM]`：`api.pinduoduo.com, m.pinduoduo.net`。

## 安装

1. 在 Surge 里从 URL 安装模块，地址就是上面那个 `.sgmodule` 的 raw 链接。模块里的 `script-path` 已经写成 JS 的绝对 raw 地址，不用再手动放文件。
2. Surge 里开启 MITM，安装并信任 Surge 证书，确认 MITM 主机名里有上面两个域名。
3. 拼多多彻底杀后台重开，清空一次缓存再试。注意：拼多多会把首页/个人页缓存下来，刚装上可能要清缓存才看得到变化。
4. 如果还有广告，大概率是拼多多换了接口路径（原版是 2026-10-02 的），把 Surge 日志里 `api.pinduoduo.com` 的新请求发我，我再按新路径补。

## 没法在 Surge 里 1:1 还原的两点

- `AND((DOMAIN, api.pinduoduo.com),(PROTOCOL, QUIC)) REJECT`：Surge 规则里没有按协议匹配的写法。替代办法是在 Surge 设置里关掉 QUIC，或靠上面的域名 REJECT 兜底。
- 开屏广告：原版主要靠上面那些请求拦截 + 首页 hub 改写，没有单独的开屏 JS；如果新版拼多多开屏走了别的接口，需要抓包补规则。
