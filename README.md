/**
 * QuantumultX HTTP-REQUEST Script
 * Author: Your Name
 * Description: Modify request headers for Bilibili API.
 */

const url = $request.url;
const headers = $request.headers;

// 日志记录（可选）
console.log(`Request URL: ${url}`);
console.log(`Original Headers:`, headers);

// 修改请求头
headers["Authorization"] = "identify_v1 your_custom_authorization";
headers["User-Agent"] = "your_custom_user_agent";

// 输出结果
$done({ headers });