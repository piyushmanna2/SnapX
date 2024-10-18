// DOM Elements
const buttonTakeScreenshot = document.getElementById('takeScreenshot');
const buttonReset = document.getElementById('reset-button');
const buttonTryAgain = document.getElementById('try-again');
const imgElement = document.getElementById('screenshotImage');
const analysisResult = document.getElementById('result');

// Constants
const DEFAULT_IMAGE_URL = 'https://dummyimage.com/1080x720';

// Storage Keys
const IS_CODE_INJECTED_KEY = 'isCodeInjected';

/**
 * Stores a value in Chrome local storage.
 * @param {string} key - The key under which the value is stored.
 * @param {any} value - The value to store.
 */
function setStorageValue(key, value) {
    chrome.storage.local.set({ [key]: value }).then(() => {
        console.log(`${key} was set to:`, value);
    }).catch(error => {
        console.error(`Error setting ${key}:`, error);
    });
}

/**
 * Retrieves a value from Chrome local storage.
 * @param {string} key - The key to retrieve the value for.
 * @returns {Promise<any>} - The stored value or a fallback.
 */
function getStorageValue(key) {
    return chrome.storage.local.get([key]).then(result => {
        console.log(`${key} value is:`, result[key]);
        return result[key] || false;
    }).catch(error => {
        console.error(`Error getting ${key}:`, error);
        return false;
    });
}

/**
 * Handles screenshot capture initiation and injection logic.
 */
async function handleScreenshotCapture() {
    try {
        const isCodeInjected = await getStorageValue(IS_CODE_INJECTED_KEY);
        
        if (isCodeInjected) {
            chrome.runtime.sendMessage({ type: 'injectCode' });
            setStorageValue(IS_CODE_INJECTED_KEY, false);
        } else {
            chrome.runtime.sendMessage({ action: 'injectCode' });
            setStorageValue(IS_CODE_INJECTED_KEY, true);
        }
    } catch (error) {
        console.error('Error during screenshot capture:', error);
    }
}

/**
 * Resets the screenshot image and analysis result.
 */
function resetScreenshot() {
    imgElement.src = DEFAULT_IMAGE_URL;
    analysisResult.innerHTML = '';
    setStorageValue(IS_CODE_INJECTED_KEY, false);
}

/**
 * Handles screenshot analysis retry.
 * @param {string} imageUri - The URI of the image to analyze.
 */
function handleRetryAnalysis(imageUri) {
    buttonTryAgain.addEventListener('click', () => {
        analyzeImage(imageUri);
    });
}

/**
 * Analyzes the screenshot by sending it to the backend server.
 * @param {string} imageUri - The URI of the image to analyze.
 */
async function analyzeImage(imageUri) {
    try {
        const base64Image = imageUri.split(',')[1];
        
        const response = await fetch('http://localhost:3000/analyze-image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ image: base64Image }),
        });

        if (!response.ok) {
            throw new Error(`Failed to analyze image. Status: ${response.status}`);
        }

        const data = await response.json();
        analysisResult.innerHTML = data.analysis;

    } catch (error) {
        console.error('Error analyzing image:', error);
        analysisResult.textContent = 'An error occurred while analyzing the image.';
    }
}

/**
 * Handles incoming messages from the background script.
 * @param {object} request - The message request object.
 */
chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'screenshotCaptured' && request.imageUri) {
        imgElement.src = request.imageUri;
        analyzeImage(request.imageUri);
        handleRetryAnalysis(request.imageUri);
    } else {
        console.error('No image URI received or it might not be available yet.');
    }
});

/**
 * Sets up event listeners.
 */
function setupEventListeners() {
    if (buttonTakeScreenshot && buttonReset) {
        buttonTakeScreenshot.addEventListener('click', handleScreenshotCapture);
        buttonReset.addEventListener('click', resetScreenshot);
    }
}

// Initialize event listeners
document.addEventListener('DOMContentLoaded', setupEventListeners);
