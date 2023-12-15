let currentTabObj = {};
let state = false;
let volume = 1;
let filters = [];

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
      chrome.runtime.sendMessage({action: 'updatedState', state: state});
      chrome.runtime.sendMessage({action: 'updatedVolume', gain: volume});
      chrome.runtime.sendMessage({action: 'updatedFilters', filters: filters});
      break;
    case 'updateVolume':
      if (isFinite(request.gain)) {
        volume = request.gain;
        chrome.runtime.sendMessage({action: 'updatedVolume', gain: volume});
        if (state == true) {
          currentTabObj.gainNode.gain.value = volume;
        }
      }
      break;
    case 'updateFilters':
      filters = request.filters;
      chrome.runtime.sendMessage({action: 'updatedFilters', filters: filters});
      if (state == true) {
        applyEQ(currentTabObj, filters);
      }
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
    }
  });
}

// Disconnect audio stream for current tab
function disconnectTabAudioStream() {
  if (currentTabObj.stream) {
    currentTabObj.stream.getAudioTracks()[0].stop();
    currentTabObj.audioContext.close();
    currentTabObj = {};
    state = false;
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
    const filter = currentTabObj.audioContext.createBiquadFilter();
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