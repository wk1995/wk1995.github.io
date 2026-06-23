# wk1995.github.io

个人首页与博客，主题聚焦 AI 与 Android 的结合实践。

## 站点结构

- `index.html`：首页，展示个人定位、项目方向和博客入口
- `blog/`：博客列表与文章页
- `docs/`：保留的 Jekyll 文档目录，不作为当前线上首页发布源

## GitHub Pages 发布

仓库已补充 GitHub Pages Actions 工作流，默认从仓库根目录发布静态站点。

如果线上访问 `https://wk1995.github.io/` 仍然是 404，请优先检查：

1. 仓库 `wk1995/wk1995.github.io` 是否还是公开仓库
2. 仓库设置里的 `Pages` 发布方式是否切换为 `GitHub Actions`
3. 提交到 `main` 后，`Actions` 中的 `Deploy GitHub Pages` 是否执行成功

## 本地预览

这是纯静态站点，直接在浏览器打开 `index.html` 即可预览。

如果要使用 `video/` 页面的抖音分享链接解析，需要启动 Node 本地预览服务，让浏览器能访问 `api/douyin/resolve.js` 服务端处理器：

```bat
scripts\start-video-preview.cmd
```

这个 Windows 启动脚本会：

- 检查本机是否安装了 Node.js
- 如果没有 Node.js，会打开 Node.js 官网提示安装 LTS 版本
- 如果有 Node.js，会启动本地服务并挂载 `api/douyin/resolve.js`
- 自动打开 `http://127.0.0.1:8010/video/`

运行期间请保持命令窗口打开；关闭窗口后抖音解析处理器也会停止。

## 视频工具的抖音解析代理

`video/` 页面支持粘贴抖音分享文案解析无水印视频，但抖音分享页需要由服务端请求并解析，静态 GitHub Pages 不能在浏览器端直接完成这一步。

仓库提供了一个 Node/Vercel 风格的处理器：

`api/douyin/resolve.js`

接口约定：

- `POST /api/douyin/resolve`，JSON body: `{ "shareText": "抖音分享文案或链接" }`
- 返回 `download_url` 为抖音无水印直链，`proxy_url` 为同源下载代理
- `GET /api/douyin/resolve?url=<download_url>&filename=<video_id>` 会代理下载 MP4

如果将代理部署在其他域名，可在页面加载前设置：

```html
<script>
  window.WK_DOUYIN_RESOLVER = "https://your-domain.example/api/douyin/resolve";
</script>
```

## 联系方式

[kangw1995@gmail.com](mailto:kangw1995@gmail.com)

## 反馈入口

首页、聊天页和博客页的反馈按钮会直接打开仓库的新建 Issue 页面：

`https://github.com/wk1995/wk1995.github.io/issues/new`
