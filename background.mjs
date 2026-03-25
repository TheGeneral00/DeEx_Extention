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

// ----------------------------
// Background Service Worker
// ----------------------------
class WebRequestManager {
  constructor() {
    this.requests = new Map();
    this.listenersAttached = false;
    this.ports = [];
    this.activeTarget = null; // hostname to track
    this.trackedRequestIds = new Set();

    this.handleBeforeRequest = this.handleBeforeRequest.bind(this);
    this.handleBeforeSendHeaders = this.handleBeforeSendHeaders.bind(this);
    this.handleBeforeRedirect = this.handleBeforeRedirect.bind(this);
    this.handleCompleted = this.handleCompleted.bind(this);
    this.handleError = this.handleError.bind(this);

    chrome.runtime.onConnect.addListener((port) => {
      if (port.name === "sidebar") {
        this.ports.push(port);

        port.onMessage.addListener((msg) => {
          if (msg.type === "START_ANALYSIS") {
            try {
              const url = new URL(msg.url);
              this.activeTarget = url.hostname;
              console.log("Tracking URL:", this.activeTarget);
              this.trackedRequestIds.clear();
            } catch (e) {
              console.error("Invalid URL:", msg.url);
            }
          }
        });

        port.onDisconnect.addListener(() => {
          const i = this.ports.indexOf(port);
          if (i > -1) this.ports.splice(i, 1);
        });
      }
    });
  }

  start() {
    if (this.listenersAttached) return;

    const filter = { urls: ["<all_urls>"] };

    chrome.webRequest.onBeforeRequest.addListener(
      this.handleBeforeRequest,
      filter,
      ["requestBody"]
    );
    chrome.webRequest.onBeforeSendHeaders.addListener(
      this.handleBeforeSendHeaders,
      filter,
      ["requestHeaders"]
    );
    chrome.webRequest.onBeforeRedirect.addListener(
      this.handleBeforeRedirect,
      filter,
      ["responseHeaders"]
    );
    chrome.webRequest.onCompleted.addListener(
      this.handleCompleted,
      filter
    );
    chrome.webRequest.onErrorOccurred.addListener(
      this.handleError,
      filter
    );

    this.listenersAttached = true;
  }

  // ----------------------------
  // Helpers
  // ----------------------------
  getOrCreateRequest(requestId) {
    if (!this.requests.has(requestId)) {
      this.requests.set(requestId, { id: requestId, hops: [] });
    }
    return this.requests.get(requestId);
  }

  getCurrentHop(req) {
    return req.hops[req.hops.length - 1];
  }

  shouldTrack(details) {
    if (!this.activeTarget) return false;

    // Track request if hostname matches OR requestId already tracked (for redirect chain)
    if (this.trackedRequestIds.has(details.requestId)) return true;

    try {
      const url = new URL(details.url);
      if (url.hostname.endsWith(this.activeTarget)) {
        this.trackedRequestIds.add(details.requestId);
        return true;
      }
    } catch {
      return false;
    }
    return false;
  }

  finalizeRequest(requestId) {
    const req = this.requests.get(requestId);
    if (!req) return;

    this.ports.forEach((port) =>
      port.postMessage({ type: "REQUEST_COMPLETED", payload: req })
    );

    console.log("Finalized request:", req);

    this.requests.delete(requestId);
    this.trackedRequestIds.delete(requestId);
  }

  // ----------------------------
  // Event Handlers
  // ----------------------------
  handleBeforeRequest(details) {
    if (!this.shouldTrack(details)) return;

    const req = this.getOrCreateRequest(details.requestId);

    const hop = {
      url: details.url,
      method: details.method,
      type: details.type,
      initiator: details.initiator,
      startTime: details.timeStamp,
      requestHeaders: null,
      requestBody: details.requestBody || null,
      responseHeaders: null,
      statusCode: null,
      redirectTo: null,
      error: null,
    };

    req.hops.push(hop);
    console.log("→ onBeforeRequest", details.url);
  }

  handleBeforeSendHeaders(details) {
    if (!this.shouldTrack(details)) return;
    const req = this.getOrCreateRequest(details.requestId);
    const hop = this.getCurrentHop(req);
    if (!hop) return;
    hop.requestHeaders = details.requestHeaders || [];
  }

  handleBeforeRedirect(details) {
    if (!this.shouldTrack(details)) return;
    const req = this.getOrCreateRequest(details.requestId);
    const hop = this.getCurrentHop(req);
    if (!hop) return;

    hop.statusCode = details.statusCode;
    hop.redirectTo = details.redirectUrl;
    hop.responseHeaders = details.responseHeaders || [];
    console.log(`↪ Redirect: ${details.url} → ${details.redirectUrl}`);
  }

  handleCompleted(details) {
    if (!this.shouldTrack(details)) return;
    const req = this.getOrCreateRequest(details.requestId);
    const hop = this.getCurrentHop(req);
    if (hop) hop.statusCode = details.statusCode;

    console.log("✓ Completed:", details.url);
    this.finalizeRequest(details.requestId);
  }

  handleError(details) {
    if (!this.shouldTrack(details)) return;
    const req = this.getOrCreateRequest(details.requestId);
    const hop = this.getCurrentHop(req);
    if (hop) hop.error = details.error;

    console.log("✗ Error:", details.url, details.error);
    this.finalizeRequest(details.requestId);
  }
}

// ----------------------------
// Initialize Manager
// ----------------------------
const manager = new WebRequestManager();
manager.start();
