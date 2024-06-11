graphApp = document.createElement('script');
graphApp.src = resolveExtensionUrl() + 'js/app.js';
graphApp.type = 'text/javascript';
document.body.appendChild(graphApp);

function resolveExtensionUrl() {
    if (typeof browser !== 'undefined' && browser.extension && browser.extension.getURL) {
        return browser.extension.getURL('');
    } else {
        return 'chrome-extension://' + chrome.runtime.id + '/';
    }
}

setInterval(function () {
    const media = [...document.querySelectorAll('video, audio')];
    for (let i = 0; i < media.length; i++) {
        const target = media[i];
        if (!target.crossOrigin) {
            target.setAttribute('crossorigin', 'anonymous');
            target.crossOrigin = 'anonymous';
        }
    }

}, 200)

function _browser() {
  return typeof browser !== 'undefined' ? browser : chrome;
}

function sendToBackground(action, data, onResponse) {
  _browser().runtime.sendMessage({action: action, data: data}, function(response) {
    if (onResponse) {
      onResponse(response);
    }
  });
};

function createAudioCtx() {
}

_browser().runtime.onMessage.addListener((request, sender, sendResponse) => {
  
});