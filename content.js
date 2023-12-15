// Haruto's Graph Extension

document.addEventListener('DOMContentLoaded', function() {
  const toggleButton = document.getElementById('toggleButton');
  const volumeSlider = document.getElementById('volumeSlider');
  const volumeLabel = document.getElementById('volumeLabel');
  const filtersList = document.getElementById('filtersList');

  // Update UI
  window.onload = function() {
    chrome.runtime.sendMessage({action: "popupOpened"});
  };

  // Turn on/off extension
  function updateState(state) {
    chrome.runtime.sendMessage({action: 'updateState', state: state});
  }

  // Update volume of tab
  function updateVolume(volume) {
    chrome.runtime.sendMessage({action: 'updateVolume', gain: volume});
  }

  // Update Filters List
  function updateFiltersList(filters) {
    // Clear filters list
    filtersList.innerHTML = '';

    // Add filters to list
    filters.forEach((filter, index) => {
      let filterDiv = document.createElement('div');
      filterDiv.textContent = `Filter ${index + 1}: ${filter.type} - Freq: ${filter.freq}, Q: ${filter.q}, Gain: ${filter.gain}`;
      filtersList.appendChild(filterDiv);
    });
  }

  // Listen for messages from background.js
  chrome.runtime.onMessage.addListener(function(element) {
    if (element.action === 'updatedState') {
      let state = element.state;
      toggleButton.checked = state;
    }
    if (element.action === 'updatedVolume') {
      let volume = element.gain;
      volumeSlider.value = volume*100;
      volumeLabel.innerHTML = 'Volume: ' + volumeSlider.value + '%';
    }
    if (element.action === 'updatedFilters') {
      let filters = element.filters;
      updateFiltersList(filters);
    }
  });

  toggleButton.addEventListener('click', function() {
    let state = toggleButton.checked;
    updateState(state);
  });

  volumeSlider.addEventListener('input', function() {
    updateVolume(volumeSlider.value/100);
  });

  //document.addEventListener('UpdateExtensionFilters', function(e) {
  //  updateFilters(e.filters);
  //});
});
