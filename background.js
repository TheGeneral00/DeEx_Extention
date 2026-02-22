chrome.action.onClicked.addListener(async (tab) => {
        if (!tab || !tab.windowId) return; // sanity check
          // Make sure the side panel is enabled for this tab
          await chrome.sidePanel.setOptions({
            tabId: tab.id,
            path: "sidebar.html",
            enabled: true,
          });

          // Open the side panel in the window of the clicked tab
          await chrome.sidePanel.open({
            windowId: tab.windowId
          });
});
