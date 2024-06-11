let currentTabObj = {};
let state = false;
let volume = 1;
let filters = [];
let activeTabsInfo = [];

function _browser() {
  return typeof browser !== 'undefined' ? browser : chrome;
}

// Check if current tab is active
_browser().tabs.onActivated.addListener(function(activeInfo) {
  let activeTabId = activeInfo.tabId;
  let activeTabObj = activeTabsInfo.find(tab => tab.tabId === activeTabId);
  if (activeTabObj) {
    currentTabObj = activeTabObj.obj;
    state = activeTabObj.state;
    volume = activeTabObj.volume;
  } else {
    currentTabObj = {};
    state = false;
    volume = 1;
  }
  _browser().runtime.sendMessage({action: 'updatedState', state: state});
  _browser().runtime.sendMessage({action: 'updatedVolume', gain: volume});
  _browser().runtime.sendMessage({action: 'updatedFilters', filters: filters});
});

// Clear tab info when tab is closed
_browser().tabs.onRemoved.addListener((tabId) => {
  let index = activeTabsInfo.findIndex(tab => tab.tabId === tabId);
  if (index !== -1) {
    activeTabsInfo.splice(index, 1);
  }
});

function updateTabInfo(obj, state, volume) {
  // Save current tab info
  _browser().tabs.query({active: true, currentWindow: true}, (tabs) => {
    let activeTabId = tabs[0].id;
    let activeTabObj = activeTabsInfo.find(tab => tab.tabId === activeTabId);
    if (activeTabObj) {
      activeTabObj.obj = obj;
      activeTabObj.state = state;
      activeTabObj.volume = volume;
    } else {
      activeTabsInfo.push({tabId: activeTabId, obj: currentTabObj, state: state, volume: volume});
    }
  });
}

_browser().runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'popupOpened':
      _browser().runtime.sendMessage({action: 'updatedState', state: state});
      _browser().runtime.sendMessage({action: 'updatedVolume', gain: volume});
      _browser().runtime.sendMessage({action: 'updatedFilters', filters: filters});
      break;
    case 'updateState':
      state = request.state;
      state ? createTabAudioStream() : disconnectTabAudioStream();
      updateTabInfo(currentTabObj, state, volume);
      _browser().runtime.sendMessage({action: 'updatedState', state: state});
      _browser().runtime.sendMessage({action: 'updatedVolume', gain: volume});
      _browser().runtime.sendMessage({action: 'updatedFilters', filters: filters});
      break;
    case 'updateVolume':
      if (isFinite(request.gain)) {
        volume = request.gain;
        updateTabInfo(currentTabObj, state, volume);
        _browser().runtime.sendMessage({action: 'updatedVolume', gain: volume});
        if (state === true) {
          currentTabObj.gainNode.gain.value = volume;
        }
      }
      break;
    case 'updateFilters':
      filters = request.filters;
      _browser().runtime.sendMessage({action: 'updatedFilters', filters: filters});
      // update filters for all enabled tabs
      activeTabsInfo.forEach(tabInfo => {
        if (tabInfo && tabInfo.state === true) {
          applyEQ(tabInfo.obj, filters);
        }
      });
      break;
    default:
      console.error('Unrecognized message: ', request);
  }
});

// Create audio stream for current tab
function createTabAudioStream() {
  // Disconnect any existing audio stream
  disconnectTabAudioStream();

  // Create new audio stream
  _browser().tabCapture.capture({audio: true, video: false}, (stream) => {
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

  nodes[nodes.length - 1].disconnect();

  if (filters.length === 0) {
    nodes[nodes.length - 1].connect(tab.gainNode);
    return;
  }

  filters.forEach(filterInfo => {
    const filter = tab.audioContext.createBiquadFilter();
    filter.type = filterInfo.type === "PK" ? "peaking" :
                  filterInfo.type === "LSQ" ? "lowshelf" :
                  filterInfo.type === "HSQ" ? "highshelf" : "allpass";
    filter.frequency.value = filterInfo.freq;
    filter.Q.value = filterInfo.q;
    filter.gain.value = filterInfo.gain;

    nodes[nodes.length - 1].connect(filter);
    nodes.push(filter);
  });

  nodes[nodes.length - 1].connect(tab.gainNode);
}

/* logic: 
  * 1. Listen for messages from content.js for state and volume
  * 2. If message caught, update state and volume
  * 3. Every time state is true, create audio stream for current tab and save current tab info
  * 3.5. State and Volume is Tab Specific, Filters are global
  * 4. If state is false, disconnect audio stream for current tab
  * 5. Listen to message from injector.js for filters
  * 6. Apply EQ to all tabs with state true
  */