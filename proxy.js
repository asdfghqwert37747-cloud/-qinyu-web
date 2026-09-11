// api/proxy.js
// Vercel Serverless Function —— 中转代理
// 作用：接收前端请求 -> 转发到 Coze 工作流接口 -> 原样返回结果
// 解决两个问题：
//   1) 浏览器跨域（CORS）：前端同域调用 /api/proxy
//   2) 长耗时：完整多 Agent 工作流约 27 秒，Netlify 函数 10 秒超时不够，
//      这里把超时设为 60 秒（Vercel Hobby 免费计划上限），Token 内置在服务端。

export const config = {
  maxDuration: 60,
};

const UPSTREAM_URL = 'https://6vjpqfwr47.coze.site/run';
const TOKEN =
  'eyJhbGciOiJSUzI1NiIsImtpZCI6ImE1OTk5ZTg0LTM4NzUtNDYwNy04MjIzLWUyM2JmNTdjYjQ0NSJ9.eyJpc3MiOiJodHRwczovL2FwaS5jb3plLmNuIiwiYXVkIjpbIlpVZmNqZFFuTUhha05yRG9oNlRXZHQ5OHZPT0hLcXJhIl0sImV4cCI6ODIxMDI2Njg3Njc5OSwiaWF0IjoxNzg5MTA0MTEzLCJzdWIiOiJzcGlmZmU6Ly9hcGkuY296ZS5jbi93b3JrbG9hZF9pZGVudGl0eS9pZDo3NjgzNDMwOTIyMzgwNjQwMjY1Iiwic3JjIjoiaW5ib3VuZF9hdXRoX2FjY2Vzc190b2tlbl9pZDo3Njg0MTQzNjU0NTA3NjQyODg2In0.jXIvrf_oxTnJ8hRFqvug--eQ7ZGtKDmYmQUmwNO63F8defW_PjeUZm3UnS9RqImYqiWICKpV38Bc-PgPghyu6msuun-HEAzUGmM_NxUFg68TgxYAr00lHV_i9AUKLXvutz5tiIng0MrXFL08yeNuRbBgIC3DY7tGAogqjGZVpAwyijs0fg8BCD0ukohjpNGVIhRAmOfSulVDBfCDy7eXCl9G54YAV9kcYUqMqqdY6J2eEZ02FLK3Z55yphlaMml40pseyovNk_xFGxEjDL1hEzqguYEn7poR-sn2REI7HkEncafMTFHZFrmDxspb6nGgdWQknv1CYip3tGZRc_7VyA';

export default async function handler(req, res) {
  // 简单的 CORS 放行（前端同域部署时其实用不到，保险起见保留）
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    // Vercel 会对 JSON 请求自动解析 req.body，这里统一转成字符串原样转发
    let body = req.body;
    if (typeof body !== 'string') {
      body = JSON.stringify(body || {});
    }

    const upstreamResp = await fetch(UPSTREAM_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + TOKEN,
      },
      body,
    });

    const text = await upstreamResp.text();

    res
      .status(upstreamResp.status)
      .setHeader('Content-Type', 'application/json')
      .send(text);
  } catch (err) {
    res.status(502).json({ error: 'Upstream request failed' });
  }
}