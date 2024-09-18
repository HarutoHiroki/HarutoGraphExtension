// Haruto's Graph Extension
function _browser() {
  return typeof browser !== 'undefined' ? browser : chrome;
}

document.addEventListener('DOMContentLoaded', function() {
  const toggleButton = document.getElementById('toggleButton');
  const volumeSlider = document.getElementById('volumeSlider');
  const volumeLabel = document.getElementById('volumeLabel');
  const filtersList = document.getElementById('filtersList');
  const clearButton = document.getElementById('clearFilters');

  // Update Filters List
  function updateFiltersList(filters) {
    filtersList.innerHTML = '';
    filters.forEach((filter, index) => {
      let filterDiv = document.createElement('div');
      filterDiv.textContent = `Filter ${index + 1}: ${filter.type} - Freq: ${filter.freq}, Q: ${filter.q}, Gain: ${filter.gain}`;
      filtersList.appendChild(filterDiv);
    });
  }

  // Listen for messages from background.js
  _browser().runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updatedFilters') updateFiltersList(request.filters);
    else if (request.action ===  'updatedState') toggleButton.checked = request.state;
    else if (request.action === 'updatedVolume') {
        volumeSlider.value = request.gain * 100;
        volumeLabel.innerHTML = 'Volume: ' + volumeSlider.value + '%';
    }
  });

  // Update UI
  window.onload = function() {
    _browser().runtime.sendMessage({action:'popupOpened'});
  }

  // Toggle extension on/off
  toggleButton.addEventListener('click', function() {
    _browser().runtime.sendMessage({action:'updateState', state: toggleButton.checked});
  });

  // Volume Slider
  volumeSlider.addEventListener('input', function() {
    _browser().runtime.sendMessage({action:'updateVolume', gain: volumeSlider.value / 100});
  });

  // Clear Filters
  clearButton.addEventListener('click', function() {
    _browser().runtime.sendMessage({action: 'updateFilters', filters: []});
  });
});

/* Logic:
  * 1. Listen for messages from background.js
  * 2. Update UI accordingly
  * 3. Listen for user input
  * 4. Send message to background.js
  * 5. Update state/volume/filters list
  */