document.addEventListener("DOMContentLoaded", () => {
  
        const namedEntities = {
                amp: "&",
                lt: "<",
                gt: ">",
                quot: '"',
                apos: "'",
                excl: "!",
                nbsp: "\u00A0",
        };

        const input = document.getElementById("input");

        const outputs = {
                base64: document.getElementById("out_base64"),
                url: document.getElementById("out_url"),
                qp: document.getElementById("out_qp"),
                hex: document.getElementById("out_hex"),
                html: document.getElementById("out_html"),
                trace: document.getElementById("out_trace"),
        };

        // Decode button
        document.getElementById("decodeBtn").addEventListener("click", () => {
                const inputValue = input.value.trim();

                Object.values(outputs).forEach(el => el.textContent = "");

                // Base64
                try { outputs.base64.textContent = atob(inputValue); } catch { outputs.base64.textContent = "Invalid Base64"; }

                // URL decode
                try { outputs.url.textContent = decodeURIComponent(inputValue); } catch { outputs.url.textContent = "Invalid URL encoding"; }

                // Quoted-Printable
                try {
                        outputs.qp.textContent = inputValue.replace(/=([0-9A-Fa-f]{2})/g,
                        (_, hex) => String.fromCharCode(parseInt(hex, 16)));
                } catch { 
                        outputs.qp.textContent = "Invalid quoted-printable"; }

                // Hex
                try {
                        outputs.hex.textContent = inputValue.replace(/([0-9A-Fa-f]{2})/g,
                        (_, hex) => String.fromCharCode(parseInt(hex, 16)));
                } catch { 
                        outputs.hex.textContent = "Invalid hex pairs"; }

                // HTML entities
                try {
                        outputs.html.textContent = inputValue
                        .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
                        .replace(/&#([0-9]+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
                        .replace(/&([a-zA-Z]+);/g, (_, name) => namedEntities[name] || "&" + name + ";");
                } catch { 
                        outputs.html.textContent = "Invalid html entities"; }
        });

        // Extend button
        // Extend button handler
        document.getElementById("extendBtn").addEventListener("click", async () => {
                const enableTrace = document.getElementById("enableTrace").checked;
                const urlInput = document.getElementById("input");
                const maxInput = document.getElementById("maxRedirects");
                    
                let url = urlInput.value.trim();
                if (!url) return;
                    
                // Normalize URL protocol
                if (!/^https?:\/\//i.test(url)) {
                    url = "http://" + url;
                }

                // 1. Always perform the standard extend operation
                const extendResponse = await extendURL(url);
                outputs.url.textContent = extendResponse ? extendResponse.url : "Failed to fetch URL";

                // 2. Conditionally perform the trace
                if (enableTrace) {
                    const maxRedirects = maxInput ? parseInt(maxInput.value.trim(), 10) : 10;
                        
                    outputs.trace.textContent = "Tracing...";
                    const traceResult = await runTrace(url, maxRedirects);
                    console.log(traceResult); 
                    if (traceResult.error) {
                        outputs.trace.textContent = "Error: " + traceResult.error;
                    } else {
                        outputs.trace.textContent = printRedirectChain(traceResult.chain);
                    }
                } else {
                    outputs.trace.textContent = ""; // Clear trace if disabled
                }
        });

        // Sidebar.js
async function runTrace(url, maxRedirects) {
    try {
        // Get the current tab ID so the background knows what to listen for
        const tab = await chrome.tabs.getCurrent();
        
        const response = await chrome.runtime.sendMessage({
            action: "traceURL",
            url: url,
            maxRedirects: maxRedirects,
            tabId: tab.id // Pass the tabId!
        });
        
        return response; 
    } catch (err) {
        return { error: err.message };
    }
}

async function extendURL(url) {
    try {
        // Note: fetch() returns a Response object. 
        // You likely want to return the final URL, not the object.
        const response = await fetch(url, {
            method: "GET",
            redirect: "follow",
            credentials: "omit"
        });
        return { url: response.url }; // Return the resolved URL
    } catch (err) {
        console.error("extendURL failed: ", err);
        return null;
    }
}

        function printRedirectChain(chain) {
            if (!chain || chain.length === 0) return "No redirects found.";
            
            return chain.map((hop, i) => {
                return `${i + 1}: [${hop.status}] ${hop.url} -> ${hop.redirectUrl}`;
            }).join('\n');
}
});



