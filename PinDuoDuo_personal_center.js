// 个人中心商品区清理脚本
// 移植自 ZenmoFeiShi 的 Pinduoduo.js（https://github.com/ZenmoFeiShi/Qx，2026-11-04，
// 针对拼多多 App 8.29.0），只取其中 hungary/global 分支。
//
// 做法和可莉原版不同：可莉是对 api/aquarius/hungary/global/personal_center 整条返回 {}，
// 而 ZenmoFeiShi 是保留响应信封、只把顶层 list 清空成 []。整条 {} 可能被 App 视为
// 模块加载失败而走备用 feed，清空 list 则 App 正常渲染一个空区块。
// 另外他的模式还覆盖了可莉原版没有的两个变体：命名空间 flow（api/flow/hungary/…）
// 和 window/ 子路径（…/hungary/window/global/…），当前 App 里这些变体真实存在。
//
// 字符扫描写法（不整段 JSON.parse）可处理大响应体；$request/$response/$done 在
// Surge 和 Quantumult X 里都支持。
const url = $request.url;

let body = $response.body;

function scanFields(s, depthWant, keys) {
  const found = {};

  let depth = 0, i = 0, n = s.length, lastKey = null, keyDepth = -1;

  while (i < n) {
    const c = s[i];

    if (c === '"') {
      let j = i + 1;
      while (j < n && s[j] !== '"') j += s[j] === "\\" ? 2 : 1;

      const str = s.slice(i + 1, j);

      let k = j + 1;
      while (k < n && /\s/.test(s[k])) k++;

      if (s[k] === ":" && depth === depthWant && keys.includes(str)) {
        lastKey = str;
        keyDepth = depth;
        k++;
        while (k < n && /\s/.test(s[k])) k++;
        found[str] = { start: k };
        i = k;
        continue;
      }

      i = j + 1;
      continue;
    }

    if (c === "{" || c === "[") depth++;
    else if (c === "}" || c === "]") {
      depth--;
      if (lastKey && depth === keyDepth && found[lastKey].end === undefined) {
        found[lastKey].end = i + 1;
        lastKey = null;
      }
    } else if (lastKey && depth === keyDepth && c === ",") {
      if (found[lastKey].end === undefined) found[lastKey].end = i;
      lastKey = null;
    }

    i++;
  }

  return found;
}

function splice(s, found, fn) {
  const items = Object.keys(found).map(k => ({ k, ...found[k] })).filter(x => x.end > x.start).sort((a, b) => b.start - a.start);

  let changed = false;

  for (const it of items) {
    const raw = s.slice(it.start, it.end);
    const rep = fn(it.k, raw);

    if (rep !== null && rep !== raw) {
      s = s.slice(0, it.start) + rep + s.slice(it.end);
      changed = true;
    }
  }

  return changed ? s : null;
}

try {
  let out = null;

  if (/\/hungary\/(window\/)?global\//.test(url)) {
    const f = scanFields(body, 1, ["list"]);
    out = splice(body, f, (k, raw) => {
      const arr = JSON.parse(raw);
      return Array.isArray(arr) && arr.length ? "[]" : null;
    });
  }

  if (out !== null) body = out;
} catch (e) {}

$done({ body });
