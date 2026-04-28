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

## 联系方式

[kangw1995@gmail.com](mailto:kangw1995@gmail.com)

## GitHub Login Setup

The homepage and chat page now include a GitHub login entry and a feedback form that creates repository issues.

Because this site is deployed on GitHub Pages, the frontend cannot safely store a GitHub OAuth app `client_secret`.
You need to configure:

1. `assets/github-auth-config.js`
   - `clientId`: your GitHub OAuth app client ID
   - `exchangeUrl`: your own HTTPS endpoint that exchanges the OAuth code for an access token
2. Your OAuth app callback URL should point to:
   - `https://wk1995.github.io/auth/callback/`
3. Your exchange endpoint should accept:
   - `clientId`
   - `code`
   - `codeVerifier`
   - `redirectUri`
4. Your exchange endpoint should call:
   - `POST https://github.com/login/oauth/access_token`
   - using the OAuth app `client_secret` on the server side
5. Your exchange endpoint should return JSON containing:
   - `access_token`
   - `scope`
   - `token_type`
