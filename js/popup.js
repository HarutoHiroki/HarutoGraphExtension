function _browser() {
  return typeof browser !== 'undefined' ? browser : chrome;
}

document.addEventListener('DOMContentLoaded', function() {
  const toggleButton = document.getElementById('toggleButton');
  const volumeSlider = document.getElementById('volumeSlider');
  const volumeLabel = document.getElementById('volumeLabel');
  const filtersList = document.getElementById('filtersList');
  const clearButton = document.getElementById('clearFilters');

  function sendToTab(action, data, onResponse) {
    _browser().tabs.query({active: true, currentWindow: true}, function(tabs) {
      _browser().tabs.sendMessage(tabs[0].id, {action: action, data: data}, function(response) {
        if (onResponse) {
          onResponse(response);
        }
      });
    });
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

  // Update UI
  window.onload = function() {
    sendToTab('RequestState', null, function(response) {
      toggleButton.checked = response.state;
      volumeSlider.value = response.volume * 100;
      volumeLabel.innerHTML = 'Volume: ' + volumeSlider.value + '%';
      updateFiltersList(response.filters);
    });
  }

  // Turn on/off extension
  toggleButton.addEventListener('click', function() {
    sendToTab('UpdateState', {state: toggleButton.checked});
  });

  // Update volume of tab
  volumeSlider.addEventListener('input', function() {
    volumeLabel.innerHTML = 'Volume: ' + volumeSlider.value + '%';
    sendToTab('UpdateVolume', {gain: volumeSlider.value / 100});
  });

  // Clear filters
  clearButton.addEventListener('click', function() {
    updateFiltersList([]);
    sendToTab('ClearFilters');
  });
});