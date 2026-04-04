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
        const port = chrome.runtime.connect({ name: "sidebar", number: 2222 });

        port.onMessage.addListener((msg) => {
                if (msg.type === "REQUEST_COMPLETED") {
                console.log("Received request data:", msg.payload);
                renderRequest(msg.payload);
                }
        });

        document.getElementById("extendBtn").addEventListener("click", (e) => {
          e.preventDefault();

          const input = document.getElementById("inputExtender").value.trim();
          console.log("Extender input:", input);

          if (!input) return;

          let url;

          try {
                  url = new URL(input).href;
          } catch {
                  url = new URL("http://" + input).href;
          }

          console.log("Normalized URL:", url);

          port.postMessage({ type: "START_ANALYSIS", url });

                try {
                        fetch(url, {
                                headers: {
                                        "DeEx-Extension": "1",
                                },
                                referrer: "",
                                referrerPolicy: "no-referrer",
                                method: "HEAD"
                        })
                } catch (err) {
                        console.error(err)
                }
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

                    tabButtons.forEach(b => b.classList.remove('active'));
                    tabContents.forEach(c => c.classList.remove('active'));

                    // Activate clicked tab and corresponding content
                    btn.classList.add('active');
                    document.getElementBy
                        Id(target).classList.add('active');
                });
        });

        // Handle textarea grow
        function autoGrow(textarea) {
            textarea.style.height = "auto";
            textarea.style.height = textarea.scrollHeight + "px";
        }

        // Apply to all textareas
        const textareas = document.querySelectorAll("textarea");

        textareas.forEach(textarea => {
                // Initial sizing
                autoGrow(textarea);
                // Grow on input
                textarea.addEventListener("input", () => autoGrow(textarea));
        });

        const copyBtn = document.getElementById("copy-btn");

        copyBtn.addEventListener("click", () => {
                const text = outputs.full_trace.textContent;

                navigator.clipboard.writeText(text)
                        .then(() => {
                                console.log("Copied to clipboard!");
                        })
                        .catch(err => {
                                console.log("failed to copy: " + err);
                        })
        })
});

