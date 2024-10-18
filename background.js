let capturedImageUri = null;

/**
 * Helper to get the current active tab ID
 */
async function getCurrentTabId() {
    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        return tabs.length ? tabs[0].id : null;
    } catch (error) {
        console.error('Error getting current tab ID:', error);
        return null;
    }
}

/**
 * Retrieves the value of isCodeInjected from chrome storage
 */
async function getIsCodeInjected() {
    try {
        const { isCodeInjected } = await chrome.storage.local.get("isCodeInjected");
        return isCodeInjected || false;
    } catch (error) {
        console.error('Error retrieving isCodeInjected:', error);
        return false;
    }
}

/**
 * Sets the value of isCodeInjected in chrome storage
 */
async function setIsCodeInjected(value) {
    try {
        await chrome.storage.local.set({ isCodeInjected: value });
        console.log('isCodeInjected set to:', value);
    } catch (error) {
        console.error('Error setting isCodeInjected:', error);
    }
}

/**
 * Handles injection of necessary scripts and styles into the tab
 */
async function handleInjectCode(sendResponse) {
    try {
        const tabId = await getCurrentTabId();
        if (!tabId) {
            throw new Error('Tab ID not found.');
        }

        await chrome.scripting.executeScript({
            target: { tabId },
            files: ["content.js"]
        });
        console.log('content.js injected');

        await chrome.scripting.executeScript({
            target: { tabId },
            files: ["html2canvas.min.js"]
        });
        console.log('html2canvas injected');

        await chrome.scripting.insertCSS({
            target: { tabId },
            files: ["content.css"]
        });
        console.log('content.css injected');

        // Notify content script to start selection
        chrome.tabs.sendMessage(tabId, { action: 'startSelection' });
        sendResponse({ success: true });

    } catch (error) {
        console.error('Error injecting code:', error);
        sendResponse({ success: false, error: error.message });
    }
}

/**
 * Handles when the screenshot is captured and sends the image URI
 */
function handleScreenshotCaptured(request, sendResponse) {
    try {
        const { imageUri } = request;
        capturedImageUri = imageUri;
        sendResponse({ imageUri });
    } catch (error) {
        console.error('Error in screenshot capture:', error);
        sendResponse({ success: false, error: error.message });
    }
}

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    try {
        switch (request.type) {
            case 'injectCode':
                const isCodeInjected = await getIsCodeInjected();
                if (!isCodeInjected) {
                    await handleInjectCode(sendResponse);
                    await setIsCodeInjected(true);
                } else {
                    const tabId = await getCurrentTabId();
                    if (!tabId) {
                        throw new Error('Failed to get tab ID.');
                    }
                    chrome.tabs.sendMessage(tabId, { action: 'startSelection' });
                    sendResponse({ success: true });
                }
                break;

            case 'screenshotCaptured':
                handleScreenshotCaptured(request, sendResponse);
                break;

            default:
                console.warn(`Unknown message type: ${request.type}`);
                sendResponse({ success: false, error: 'Unknown message type' });
        }
    } catch (error) {
        console.error('Error in message listener:', error);
        sendResponse({ success: false, error: error.message });
    }

    return true;  // Return true to indicate async response
});
