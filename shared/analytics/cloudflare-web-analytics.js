(() => {
  const src = "https://neutrinohit.github.io/assets/analytics/cloudflare-web-analytics.js";

  if (document.querySelector(`script[src="${src}"]`)) {
    return;
  }

  const script = document.createElement("script");
  script.defer = true;
  script.src = src;
  document.head.appendChild(script);
})();
