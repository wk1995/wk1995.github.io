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

视频解析页如果需要解析抖音分享链接或微信公众号文章，请使用带 API 的本地 Node 预览服务：

```bash
node scripts/video-resolver-server.cjs
```

打开 `http://127.0.0.1:8024/video/` 后，页面会检测解析环境，并提供一键配置与一键清除配置入口。

解析接口约定：

- `POST /api/douyin/resolve`，JSON body: `{ "shareText": "抖音分享文案或链接" }`
- `POST /api/wechat/resolve`，JSON body: `{ "url": "微信公众号文章链接" }`
- 返回 `download_url` 为视频直链，`proxy_url` 为同源下载代理
- `GET /api/douyin/resolve?url=<download_url>&filename=<video_id>` 会代理下载 MP4

## 联系方式

[kangw1995@gmail.com](mailto:kangw1995@gmail.com)

## 反馈入口

首页、聊天页和博客页的反馈按钮会直接打开仓库的新建 Issue 页面：

`https://github.com/wk1995/wk1995.github.io/issues/new`
