// Haruto's Graph Extension

document.addEventListener('DOMContentLoaded', function() {
  const toggleButton = document.getElementById('toggleButton');
  const volumeSlider = document.getElementById('volumeSlider');
  const volumeLabel = document.getElementById('volumeLabel');
  const filtersList = document.getElementById('filtersList');
  const clearButton = document.getElementById('clearFilters');

  // Update UI
  window.onload = function() {
    chrome.runtime.sendMessage({action: "popupOpened"});
  }

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
      toggleButton.checked = element.state;
    }
    if (element.action === 'updatedVolume') {
      volumeSlider.value = element.gain * 100;
      volumeLabel.innerHTML = 'Volume: ' + volumeSlider.value + '%';
    }
    if (element.action === 'updatedFilters') {
      updateFiltersList(element.filters);
    }
  });

  // Toggle extension on/off
  toggleButton.addEventListener('click', function() {
    updateState(toggleButton.checked);
  });

  // Volume Slider
  volumeSlider.addEventListener('input', function() {
    updateVolume(volumeSlider.value / 100);
  });

  // Clear Filters
  clearButton.addEventListener('click', function() {
    chrome.runtime.sendMessage({action: 'updateFilters', filters: []});
  });
});

/* Logic:
  * 1. Listen for messages from background.js
  * 2. Update UI accordingly
  * 3. Listen for user input
  * 4. Send message to background.js
  * 5. Update state/volume/filters list
  */