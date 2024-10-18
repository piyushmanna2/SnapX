// Ensure this script only runs once
if (typeof window.isSelecting === 'undefined') {
    // Declare variables only once
    let isSelecting = false;
    let startX, startY, selectionDiv;

    const DISABLE_USER_SELECT_STYLES = {
        userSelect: 'none',
        webkitUserSelect: 'none',
        msUserSelect: 'none',
        mozUserSelect: 'none'
    };

    const ENABLE_USER_SELECT_STYLES = {
        userSelect: '',
        webkitUserSelect: '',
        msUserSelect: '',
        mozUserSelect: ''
    };

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'startSelection') {
            startScreenshotSelection();
        }
    });

    function startScreenshotSelection() {
        disableTextSelection();

        selectionDiv = createSelectionDiv();
        document.body.appendChild(selectionDiv);
        updateSelectionDiv(selectionDiv, 0, 0, 1, 1); // Ensure initial size

        document.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);

        isSelecting = true;
    }

    function onMouseDown(e) {
        if (!isSelecting) return;

        startX = e.pageX + window.scrollX;
        startY = e.pageY + window.scrollY;

        updateSelectionDiv(selectionDiv, startX, startY, 0, 0);
        selectionDiv.style.display = 'block'; // Ensure visibility
    }

    function onMouseMove(e) {
        if (!isSelecting) return;

        const currentX = e.pageX + window.scrollX;
        const currentY = e.pageY + window.scrollY;

        const width = currentX - startX;
        const height = currentY - startY;

        updateSelectionDiv(
            selectionDiv,
            width < 0 ? currentX : startX,
            height < 0 ? currentY : startY,
            Math.abs(width),
            Math.abs(height)
        );
    }

    function onMouseUp(e) {
        if (!isSelecting) return;

        isSelecting = false;

        const rect = selectionDiv.getBoundingClientRect();
        selectionDiv.style.display = 'none';

        html2canvas(document.body, {
            x: rect.left + scrollX,
            y: rect.top + scrollY,
            width: rect.width,
            height: rect.height,
            windowWidth: document.documentElement.scrollWidth,
            windowHeight: document.documentElement.scrollHeight
        }).then(canvas => {
            const imageUri = canvas.toDataURL('image/png');
            chrome.runtime.sendMessage({ action: 'screenshotCaptured', imageUri });
            resetSelection();
        });

        document.removeEventListener('mousedown', onMouseDown);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }

    function createSelectionDiv() {
        const div = document.createElement('div');
        div.classList.add('selection');
        div.style.position = 'absolute';
        div.style.border = '1px dashed black';
        div.style.zIndex = '9999';
        div.style.pointerEvents = 'none';
        return div;
    }

    function updateSelectionDiv(div, left, top, width, height) {
        div.style.left = `${left}px`;
        div.style.top = `${top}px`;
        div.style.width = `${width}px`;
        div.style.height = `${height}px`;
    }

    function disableTextSelection() {
        Object.keys(DISABLE_USER_SELECT_STYLES).forEach(style => {
            document.body.style[style] = DISABLE_USER_SELECT_STYLES[style];
        });
    }

    function enableTextSelection() {
        Object.keys(ENABLE_USER_SELECT_STYLES).forEach(style => {
            document.body.style[style] = ENABLE_USER_SELECT_STYLES[style];
        });
    }

    function resetSelection() {
        if (selectionDiv) {
            document.body.removeChild(selectionDiv);
            selectionDiv = null;
        }
        enableTextSelection();
    }

    // Store flag in window object to avoid redeclaration
    window.isSelecting = isSelecting;
}
