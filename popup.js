(function() {
  let currentColor = '#f7b731';
  let currentSize = 6;
  let isActive = false;

  const activateBtn = document.getElementById('activateBtn');
  const btnLabel = document.getElementById('btnLabel');
  const colorPalette = document.getElementById('colorPalette');
  const sizeSlider = document.getElementById('sizeSlider');
  const sizeDisplay = document.getElementById('sizeDisplay');
  const statusText = document.getElementById('statusText');
  const errorMsg = document.getElementById('errorMsg');

  const colors = [
    '#f94144', '#f3722c', '#f8961e', '#f9c74f', '#90be6d', '#43aa8b',
    '#4d908e', '#577590', '#277da1', '#7209b7', '#b5179e', '#f72585'
  ];
  const paletteColors = ['#f7b731', ...colors];

  function sendMessageToContent(message, callback) {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (!tabs || tabs.length === 0) {
        showError('No active tab found');
        return;
      }
      
      try {
        chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
          if (chrome.runtime.lastError) {
            chrome.scripting.executeScript({
              target: { tabId: tabs[0].id },
              files: ['content.js']
            }, () => {
              if (chrome.runtime.lastError) {
                showError('Please refresh the page and try again');
              } else {
                setTimeout(() => {
                  chrome.tabs.sendMessage(tabs[0].id, message, callback);
                }, 100);
              }
            });
          } else if (callback) {
            callback(response);
          }
        });
      } catch (e) {
        showError('Error: ' + e.message);
      }
    });
  }

  function showError(msg) {
    errorMsg.textContent = '⚠️ ' + msg;
    errorMsg.style.display = 'block';
    setTimeout(() => {
      errorMsg.style.display = 'none';
    }, 4000);
  }

  function buildPalette() {
    colorPalette.innerHTML = '';
    paletteColors.forEach((hex) => {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch';
      swatch.style.backgroundColor = hex;
      swatch.dataset.color = hex;
      if (hex === currentColor) swatch.classList.add('active-swatch');
      swatch.addEventListener('click', () => {
        currentColor = hex;
        document.querySelectorAll('.color-swatch').forEach(el => el.classList.remove('active-swatch'));
        swatch.classList.add('active-swatch');
        sendMessageToContent({ action: 'updateColor', color: currentColor });
      });
      colorPalette.appendChild(swatch);
    });
  }
  buildPalette();

  function updateSizeDisplay() {
    currentSize = parseInt(sizeSlider.value, 10);
    sizeDisplay.textContent = currentSize;
    sendMessageToContent({ action: 'updateSize', size: currentSize });
  }
  sizeSlider.addEventListener('input', updateSizeDisplay);
  updateSizeDisplay();

  function toggleDrawing() {
    sendMessageToContent({ action: 'toggleDrawing' }, (response) => {
      if (response && response.isActive !== undefined) {
        isActive = response.isActive;
        updateUI(isActive);
      }
    });
  }

  function updateUI(active) {
    if (active) {
      activateBtn.classList.add('active');
      btnLabel.textContent = 'Deactivate';
      statusText.innerHTML = '🖌️ drawing active — right‑click to stop';
    } else {
      activateBtn.classList.remove('active');
      btnLabel.textContent = 'Activate';
      statusText.innerHTML = 'click <strong>Activate</strong> to draw';
    }
  }

  activateBtn.addEventListener('click', toggleDrawing);

  sendMessageToContent({ action: 'getStatus' }, (response) => {
    if (response && response.isActive !== undefined) {
      isActive = response.isActive;
      updateUI(isActive);
    }
  });
})();