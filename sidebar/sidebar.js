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

        const outputs = {
                base64: document.getElementById("out_base64"),
                url: document.getElementById("out_url"),
                qp: document.getElementById("out_qp"),
                hex: document.getElementById("out_hex"),
                html: document.getElementById("out_html"),
                trace: document.getElementById("out_ext"),
                full_trace: document.getElementById("out_ext_full"),
        };

        // Decode button
        document.getElementById("decodeBtn").addEventListener("click", () => {
                console.log("Decoder button clicked!")
                const inputValue = document.getElementById("inputDecoder").value.trim();

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


        // Connect to background
        const port = chrome.runtime.connect({ name: "sidebar" });

        port.onMessage.addListener((msg) => {
                if (msg.type === "REQUEST_COMPLETED") {
                console.log("Received request data:", msg.payload);
                renderRequest(msg.payload);
                }
        });

        // Extend button
        // Extend button handler
        document.getElementById("extendBtn").addEventListener("click", (e) => {
                e.preventDefault();
                const url = document.getElementById("inputExtender").value.trim();
                console.log("Extender input: " + url)
                if (!url) return;
                    
                // Normalize URL protocol
                /*if (!/^https?:\/\//i.test(url)) {
                    url = "http://" + url;
                }*/

                port.postMessage({ type: "START_ANALYSIS" , url: url})
                // 1. Always perform the standard extend operation
                //const extendResponse = await extendURL(url);
                fetch(url).catch(console.err);
        });

        function renderRequest(req) {
                outputs.trace.innerHTML = ""; //clear previous

                req.hops.forEach((hop, i) => {
                        const div = document.createElement("div");
                        div.textContent = `${i + 1}: ${hop.url} => status: ${hop.statusCode || hop.error || "pending"}`;
                        outputs.trace.appendChild(div);
                })
                outputs.full_trace.textContent = formatResponse(req);
        }

        function formatResponse(req) {
                try {
                        return JSON.stringify(req, null, 2); //pretty
                } catch {
                        return String(req);
                }
        }

        // Handle register card switching
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const target = btn.dataset.tab;

                    // Remove active from all buttons and contents
                    tabButtons.forEach(b => b.classList.remove('active'));
                    tabContents.forEach(c => c.classList.remove('active'));

                    // Activate clicked tab and corresponding content
                    btn.classList.add('active');
                    document.getElementById(target).classList.add('active');
                });
        });

        // Handle textarea grow
        function autoGrow(textarea) {
            textarea.style.height = "auto";
            textarea.style.height = textarea.scrollHeight + "px";
        }

        // Apply to all textareas
        document.addEventListener("DOMContentLoaded", () => {
                    const textareas = document.querySelectorAll("textarea");

                    textareas.forEach(textarea => {
                        // Initial sizing
                        autoGrow(textarea);

                        // Grow on input
                        textarea.addEventListener("input", () => autoGrow(textarea));
                    });
        });
});

