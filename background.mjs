const sidePanelState = {};

chrome.action.onClicked.addListener((tab) => {
        if (!tab || !tab.id) return; // sanity check
        const tabId = tab.id;
          // Make sure the side panel is enabled for this tab
        chrome.sidePanel.setOptions({
            tabId: tab.id,
            path: "sidebar/sidebar.html",
            enabled: true,
        });

        if (sidePanelState[tabId]) {
                chrome.sidePanel.close({tabId});
                sidePanelState[tabId] = false;
        } else {
                chrome.sidePanel.open({tabId});
                sidePanelState[tabId] = true;
        }
});


// service-worker.js

// service-worker.js

// Map to store trace state by tabId
// service-worker.js
const activeTraces = new Map();

chrome.webRequest.onBeforeRedirect.addListener((details) => {
    const trace = activeTraces.get(details.tabId);
    if (trace && trace.chain.length < trace.maxLimit) {
        trace.chain.push({
            url: details.url,
            redirectUrl: details.redirectUrl,
            status: details.statusCode
        });
    }
}, { urls: ["<all_urls>"] });

chrome.webRequest.onCompleted.addListener((details) => {
    const trace = activeTraces.get(details.tabId);
    if (trace) {
        // Send the completed chain back to the sidebar
        trace.sendResponse({ chain: trace.chain });
        activeTraces.delete(details.tabId);
    }
}, { urls: ["<all_urls>"] });

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "traceURL") {
        // Store the state using the tabId provided by the sidebar
        activeTraces.set(request.tabId, {
            chain: [],
            maxLimit: request.maxRedirects,
            sendResponse: sendResponse
        });

        // Trigger the navigation in that specific tab
        chrome.tabs.update(request.tabId, { url: request.url });

        return true; // Keep message channel open
    }
});
