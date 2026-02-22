const input = document.getElementById("input");
const output = document.getElementById("output");

chrome.tabs.onUpdate.addListener(async (tabId, info, tab) => {
})

document.getElementById("encodeBtn").addEventListener("click", () => {
        try {
                output.textContent = btoa(input.value);
        } catch {
                output.textContent = "Encoding failed.";
        }
});

document.getElementById("decodeBtn").addEventListener("click", () => {
        const input = document.getElementById("inputField");
        const output = document.getElementById("output");
        const value = input.value.trim();

        // Regex patterns
        const base64Regex = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
        const qpRegex = /^(?:[^\r\n=]|=(?:[0-9A-Fa-f]{2}))*$/;
        const urlEncodedRegex = /%(?:[0-9A-Fa-f]{2})/;
        const hexRegex = /^(?:[0-9A-Fa-f]{2}\s?)+$/;
        const utf7Regex = /^\+[A-Za-z0-9/]+-$/;

        function detectEncoding(str) {
          str = str.trim();
          if (str.length >= 8 && base64Regex.test(str)) return "base64";
          if (qpRegex.test(str)) return "quoted-printable";
          if (urlEncodedRegex.test(str)) return "url";
          if (hexRegex.test(str)) return "hex";
          if (utf7Regex.test(str)) return "utf7";
          return null;
        }

        function decodeOnce(str, encoding) {
          try {
            switch (encoding) {
              case "base64": return atob(str);
              case "quoted-printable":
                return str.replace(/=([0-9A-Fa-f]{2})/g, (_, hex) =>
                  String.fromCharCode(parseInt(hex, 16))
                );
              case "url": return decodeURIComponent(str);
              case "hex":
                return str.replace(/([0-9A-Fa-f]{2})/g, (_, hex) =>
                  String.fromCharCode(parseInt(hex, 16))
                );
              case "utf7":
                return str.replace(/^\+([A-Za-z0-9/]+)-$/, (_, b64) => atob(b64));
              default: return str;
            }
          } catch (e) {
            return str;
          }
        }

        function decodeRecursive(str, maxIterations = 10) {
          let last = str;
          let iterations = 0;

          while (iterations < maxIterations) {
            const encoding = detectEncoding(last);
            if (!encoding) break;

            const decoded = decodeOnce(last, encoding);
            if (decoded === last) break;

            last = decoded;
            iterations++;
          }

          return last;
        }

        const result = decodeRecursive(value);
        output.textContent = result;
});

document.getElementById("extendBtn").addEventListener("click", async () => {
        const url = input.value.trim();

        if(!url.startsWith("http")) {
                output.textContent = "Invalid URL.";
                return;
        }

        try{
                const response = await fetch(url, {
                        method: "GET",
                        redirect: "follow",
                        credentials: "omit",
                });

                output.textContent = response.url;
        } catch {
                output.textContent = "Extension failed.";
        }
});
