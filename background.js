let currentTabObj = {};
let state = false;
let volume = 1;
let filters = [];
let activeTabsInfo = [];

// check if current tab is active
chrome.tabs.onActivated.addListener(function(activeInfo) {
  let activeTabId = activeInfo.tabId;
  let activeTabObj = activeTabsInfo.find(tab => tab.tabId == activeTabId);
  if (activeTabObj) {
    currentTabObj = activeTabObj.obj;
    state = activeTabObj.state;
    volume = activeTabObj.volume;
  } else {
    currentTabObj = {};
    state = false;
    volume = 1;
  }
  chrome.runtime.sendMessage({action: 'updatedState', state: state});
  chrome.runtime.sendMessage({action: 'updatedVolume', gain: volume});
  chrome.runtime.sendMessage({action: 'updatedFilters', filters: filters});
});

function updateTabInfo(obj, state, volume) {
  // Save current tab info
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    let activeTabId = tabs[0].id;
    let activeTabObj = activeTabsInfo.find(tab => tab.tabId == activeTabId);
    if (activeTabObj) {
      activeTabObj.obj = obj;
      activeTabObj.state = state;
      activeTabObj.volume = volume;
    } else {
      activeTabsInfo.push({tabId: activeTabId, obj: currentTabObj, state: state, volume: volume});
    }
  });
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  switch (request.action) {
    case 'popupOpened':
      chrome.runtime.sendMessage({action: 'updatedState', state: state});
      chrome.runtime.sendMessage({action: 'updatedVolume', gain: volume});
      chrome.runtime.sendMessage({action: 'updatedFilters', filters: filters});
      break;
    case 'updateState':
      state = request.state;
      state ? createTabAudioStream() : disconnectTabAudioStream();
      updateTabInfo(currentTabObj, state, volume);
      chrome.runtime.sendMessage({action: 'updatedState', state: state});
      chrome.runtime.sendMessage({action: 'updatedVolume', gain: volume});
      chrome.runtime.sendMessage({action: 'updatedFilters', filters: filters});
      break;
    case 'updateVolume':
      if (isFinite(request.gain)) {
        volume = request.gain;
        updateTabInfo(currentTabObj, state, volume);
        chrome.runtime.sendMessage({action: 'updatedVolume', gain: volume});
        if (state == true) {
          currentTabObj.gainNode.gain.value = volume;
        }
      }
      break;
    case 'updateFilters':
      filters = request.filters;
      chrome.runtime.sendMessage({action: 'updatedFilters', filters: filters});
      // update filters for all enabled tabs
      activeTabsInfo.forEach(tabInfo => {
        if (tabInfo && tabInfo.state == true) {
          applyEQ(tabInfo.obj, filters);
        }
      });
      break;
    default:
      console.error('Unrecognised message: ', request);
  }
});

// Create audio stream for current tab
function createTabAudioStream() {
  // Disconnect any existing audio stream
  disconnectTabAudioStream();

  // Create new audio stream
  chrome.tabCapture.capture({audio: true, video: false}, function(stream) {
    if (stream) {
      currentTabObj.stream = stream;
      currentTabObj.audioContext = new AudioContext();
      currentTabObj.source = currentTabObj.audioContext.createMediaStreamSource(stream);
      currentTabObj.gainNode = currentTabObj.audioContext.createGain();
      currentTabObj.source.connect(currentTabObj.gainNode);
      currentTabObj.gainNode.connect(currentTabObj.audioContext.destination);
      state = true;
      currentTabObj.gainNode.gain.value = volume;
      applyEQ(currentTabObj, filters);

      // Save current tab info
      updateTabInfo(currentTabObj, state, volume);
    }
  });
}

// Disconnect audio stream for current tab
function disconnectTabAudioStream() {
  if (currentTabObj && currentTabObj.stream) {
    currentTabObj.stream.getAudioTracks()[0].stop();
    currentTabObj.audioContext.close();
    currentTabObj = {};
    state = false;

    // Save current tab info
    updateTabInfo(currentTabObj, state, volume, filters);
  }
}

// Apply EQ to current tab
function applyEQ(tab, filters) {
  let source = tab.source;
  let nodes = [source];

  if (filters.length == 0) {
    source.connect(tab.gainNode);
    return;
  }

  nodes[nodes.length - 1].disconnect();

  filters.forEach(filterInfo => {
    const filter = tab.audioContext.createBiquadFilter();
    let type;
    if (filterInfo.type == "PK") {
        type = "peaking";
    } else if (filterInfo.type == "LSQ") {
        type = "lowshelf";
    } else if (filterInfo.type == "HSQ") {
        type = "highshelf";
    }
    filter.type = type;
    filter.frequency.value = filterInfo.freq;
    filter.Q.value = filterInfo.q;
    filter.gain.value = filterInfo.gain;
    
    nodes[nodes.length - 1].connect(filter);
    nodes.push(filter);
});

  nodes[nodes.length - 1].connect(tab.gainNode);
}