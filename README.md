# Suno Prompt Studio V2

一个静态网页工具，用于组合 Suno Style Prompt、检索 prompt 词库，并以克制方式辅助整理 Lyrics Prompt。

## 文件结构

```text
suno_prompt_studioV2/
├── index.html
├── styles.css
├── app.js
├── main.js
├── config.example.js
├── README.md
└── .gitignore
```

## 文件说明

| 文件 | 说明 |
|---|---|
| `index.html` | 页面入口 |
| `styles.css` | UI 样式 |
| `app.js` | JSON 词库数据，包含 133 个 prompt 词条和 8 个 preset |
| `main.js` | 页面交互逻辑 |
| `config.example.js` | 本地 LLM 补全配置示例，不包含真实 Key |
| `.gitignore` | 忽略本地配置、日志和依赖目录 |

## 本地预览

必须通过 HTTP 访问，不要用 `file://`。

```bash
python3 -m http.server 4174 --bind 127.0.0.1
```

打开：

```text
http://127.0.0.1:4174/
```

## Lyrics 补全

按钮名称是“补全”，不是“生成”。

本地校验顺序固定为：

```text
歌名 -> 感受 -> 故事 -> 场景 -> [Verse] 内容 -> [Chorus] 内容
```

信息不足时：

```text
不调用 LLM
不改写草稿
只提示缺项
```

信息充分时：

```text
尝试调用配置的 LLM 补全端点
结果进入“补全建议”区
用户手动选择插入、替换、追加或只使用理解摘要
```

输入语言不限。`Language` 控制最终歌词表达语言。例如用户用中文写素材，但选择 `한국어 / English`，补全会把中文素材理解后转写为韩语 / 英文歌词表达。

## 本地 LLM 配置

复制示例文件：

```bash
cp config.example.js config.js
```

然后在 `index.html` 的 `main.js` 前加载本地配置：

```html
<script src="./config.js"></script>
<script src="./main.js"></script>
```

`config.js` 已被 `.gitignore` 忽略，不应提交真实 Key。

## 公网部署

公网版本不应在前端保存 API Key。

推荐做法：

```text
前端 -> /api/lyrics-complete -> 后端代理 -> LLM API
```

后端代理可使用：

```text
Cloudflare Worker
Vercel Edge Function
Netlify Function
自有轻量服务器 API
```

如果公网版本尚未实现后端代理，应隐藏或禁用“补全”按钮。

## 验证清单

1. 页面通过 HTTP 正常加载。
2. `app.js` 返回 HTTP 200。
3. Style Builder 可选择 prompt。
4. Prompt Library 显示 133 个词条。
5. Lyrics 表单显示歌名、感受、故事、场景。
6. 空信息点击“补全”会提示缺项，不调用 LLM。
7. 目标语言与输入语言不一致时显示跨语言转写提示。
8. 未配置 LLM 端点时，信息充分后进入 Error 状态，不改写草稿。
9. 补全建议区不会自动覆盖 Lyrics Draft。
