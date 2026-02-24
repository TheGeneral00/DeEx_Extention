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
    } catch { outputs.qp.textContent = "Invalid quoted-printable"; }

    // Hex
    try {
      outputs.hex.textContent = inputValue.replace(/([0-9A-Fa-f]{2})/g,
        (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    } catch { outputs.hex.textContent = "Invalid hex pairs"; }

    // HTML entities
    try {
      outputs.html.textContent = inputValue
        .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
        .replace(/&#([0-9]+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
        .replace(/&([a-zA-Z]+);/g, (_, name) => namedEntities[name] || "&" + name + ";");
    } catch { outputs.html.textContent = "Invalid html entities"; }
  });

  // Extend button
  document.getElementById("extendBtn").addEventListener("click", async () => {
    let url = input.value.trim();
    if (!url) return;

    if (!/^https?:\/\//i.test(url)) {
      url = "http://" + url;
    }

    try {
      const response = await fetch(url, {
        method: "GET",
        redirect: "follow",
        credentials: "omit",
      });
      outputs.url.textContent = response.url;
    } catch (err) {
      outputs.url.textContent = "Extension failed.";
    }
  });

});
