(function () {
  function eastmoneySearchUrl(context, callbackName) {
    const keyword = context && context.sectorName ? context.sectorName : "";
    const param = {
      uid: "",
      keyword: keyword,
      type: ["cmsArticleWebOld"],
      client: "web",
      clientType: "web",
      clientVersion: "curr",
      param: {
        cmsArticleWebOld: {
          searchScope: "default",
          sort: "default",
          pageIndex: 1,
          pageSize: 12,
          preTag: "",
          postTag: "",
        },
      },
    };
    return "https://search-api-web.eastmoney.com/search/jsonp?cb="
      + encodeURIComponent(callbackName)
      + "&param="
      + encodeURIComponent(JSON.stringify(param));
  }

  function eastmoneyArticles(payload) {
    const rows = payload
      && payload.result
      && Array.isArray(payload.result.cmsArticleWebOld)
      ? payload.result.cmsArticleWebOld
      : [];
    return rows.map(function (item) {
      return {
        id: item.code || item.url || item.title,
        title: item.title || "",
        summary: item.content || "",
        source: item.mediaName || "东方财富",
        publishedAt: item.date || "",
        url: item.url || "",
      };
    });
  }

  window.WKStockNewsConfig = {
    maxItems: 12,
    defaultSourceIds: ["eastmoney"],
    sources: [
      {
        id: "eastmoney",
        label: "东方财富",
        type: "jsonp",
        buildUrl: eastmoneySearchUrl,
        parse: eastmoneyArticles,
      },
    ],
  };
})();
