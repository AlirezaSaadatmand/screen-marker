(function() {
  let isActive = false;
  let currentColor = '#f7b731';
  let currentSize = 6;
  let isDrawing = false;
  let lastX = 0, lastY = 0;
  let overlayCanvas = null;
  let ctxOverlay = null;

  function createOverlay() {
    if (overlayCanvas) return overlayCanvas;
    
    const canvas = document.createElement('canvas');
    canvas.id = 'screen-marker-canvas';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '2147483647';
    canvas.style.touchAction = 'none';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    
    overlayCanvas = canvas;
    ctxOverlay = canvas.getContext('2d');
    ctxOverlay.lineCap = 'round';
    ctxOverlay.lineJoin = 'round';
    
    window.addEventListener('resize', () => {
      if (overlayCanvas) {
        const tempData = ctxOverlay.getImageData(0, 0, overlayCanvas.width, overlayCanvas.height);
        overlayCanvas.width = window.innerWidth;
        overlayCanvas.height = window.innerHeight;
        ctxOverlay.putImageData(tempData, 0, 0);
        ctxOverlay.lineCap = 'round';
        ctxOverlay.lineJoin = 'round';
      }
    });
    
    return canvas;
  }

  function destroyOverlay() {
    if (overlayCanvas && overlayCanvas.parentNode) {
      overlayCanvas.parentNode.removeChild(overlayCanvas);
      overlayCanvas = null;
      ctxOverlay = null;
    }
  }

  function activateDrawing() {
    if (isActive) return;
    isActive = true;
    createOverlay();
    if (overlayCanvas) {
      overlayCanvas.style.pointerEvents = 'auto';
      overlayCanvas.addEventListener('mousedown', onMouseDown);
      overlayCanvas.addEventListener('mousemove', onMouseMove);
      overlayCanvas.addEventListener('mouseup', onMouseUp);
      overlayCanvas.addEventListener('mouseleave', onMouseUp);
      overlayCanvas.addEventListener('contextmenu', onContextMenu);
    }
    updateCursorStyle();
  }

  function deactivateDrawing() {
    if (!isActive) return;
    isActive = false;
    isDrawing = false;
    destroyOverlay();
    document.body.style.cursor = 'default';
  }

  function updateCursorStyle() {
    if (!isActive) {
      document.body.style.cursor = 'default';
      return;
    }
    const size = Math.min(currentSize * 2, 64);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, size, size);
    ctx.beginPath();
    ctx.arc(size/2, size/2, currentSize/2, 0, 2 * Math.PI);
    ctx.fillStyle = currentColor;
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    const dataUrl = canvas.toDataURL('image/png');
    document.body.style.cursor = `url(${dataUrl}) ${size/2} ${size/2}, crosshair`;
  }

  function onMouseDown(e) {
    if (!isActive) return;
    isDrawing = true;
    const rect = overlayCanvas.getBoundingClientRect();
    lastX = e.clientX - rect.left;
    lastY = e.clientY - rect.top;
    ctxOverlay.beginPath();
    ctxOverlay.arc(lastX, lastY, currentSize/2, 0, 2 * Math.PI);
    ctxOverlay.fillStyle = currentColor;
    ctxOverlay.fill();
  }

  function onMouseMove(e) {
    if (!isActive || !isDrawing) return;
    const rect = overlayCanvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    ctxOverlay.beginPath();
    ctxOverlay.moveTo(lastX, lastY);
    ctxOverlay.lineTo(currentX, currentY);
    ctxOverlay.strokeStyle = currentColor;
    ctxOverlay.lineWidth = currentSize;
    ctxOverlay.stroke();
    lastX = currentX;
    lastY = currentY;
  }

  function onMouseUp() {
    isDrawing = false;
  }

  function onContextMenu(e) {
    e.preventDefault();
    if (isActive) {
      deactivateDrawing();
      chrome.runtime.sendMessage({ action: 'statusChanged', isActive: false });
    }
    return false;
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch(request.action) {
      case 'toggleDrawing':
        if (isActive) {
          deactivateDrawing();
        } else {
          activateDrawing();
        }
        sendResponse({ isActive: isActive });
        break;
        
      case 'getStatus':
        sendResponse({ isActive: isActive });
        break;
        
      case 'updateColor':
        currentColor = request.color;
        if (isActive) updateCursorStyle();
        sendResponse({ success: true });
        break;
        
      case 'updateSize':
        currentSize = request.size;
        if (isActive) updateCursorStyle();
        sendResponse({ success: true });
        break;
    }
    return true;
  });

  window.addEventListener('beforeunload', () => {
    destroyOverlay();
  });

  console.log('Screen Marker content script loaded!');
})();