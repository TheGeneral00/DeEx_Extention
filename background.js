const sidePanelState = {};

chrome.action.onClicked.addListener((tab) => {
        if (!tab || !tab.id) return; // sanity check
        const tabId = tab.id;
          // Make sure the side panel is enabled for this tab
        chrome.sidePanel.setOptions({
            tabId: tab.id,
            path: "sidebar.html",
            enabled: true,
        });

        if (sidePanelState[tabId]) {
                chrome.sidePanel.close({tabId});
                sidePanelState[tabId] = false;
        } else {
                chrome.sidePanel.open({tabId});
                sidePanelState[tabId] = true;
        }
          // Open the side panel in the window of the clicked tab
});
