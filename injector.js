document.addEventListener('DOMContentLoaded', function() {
  const configuratedSites = [
    "https://graphtool.harutohiroki.com/*"
  ];

  // check if current site is configurated
  function isConfigured(url) {
    return configuratedSites.some(pattern => {
      let regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(url);
    });
  }

  function injectScript() {
    const scriptElement = document.createElement('script');
    scriptElement.textContent = `
      document.addEventListener('UpdateExtensionFilters', function(event) {
        window.postMessage({ 
          type: 'GraphToolFiltersUpdate', 
          data: event.detail.filters
        }, '*');
      });
    `;
    (document.head || document.documentElement).appendChild(scriptElement);
    scriptElement.remove();
  }

  // Inject script into all isConfigured sites
  if (isConfigured(window.location.href)) {
    injectScript();
  }
  
  window.addEventListener('message', function(event) {
    if (event.source !== window || !event.data || event.data.type !== 'GraphToolFiltersUpdate') {
      return;
    }
  
    chrome.runtime.sendMessage({action: 'updateFilters', filters: event.data.data});
  });
});