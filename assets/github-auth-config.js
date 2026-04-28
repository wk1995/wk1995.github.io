(function () {
  // exchangeUrl should be an HTTPS endpoint you control.
  // It must exchange the GitHub OAuth code for an access token on the server side.
  window.WKGitHubAuthConfig = Object.assign(
    {
      clientId: "",
      exchangeUrl: "",
      scopes: ["public_repo", "read:user"],
      owner: "wk1995",
      repo: "wk1995.github.io"
    },
    window.WKGitHubAuthConfig || {}
  );
})();
