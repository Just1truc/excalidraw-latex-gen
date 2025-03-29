(function () {
    const getBaseURL = () => {
        try {
          // This should always succeed in your injected script
          const currentScript = document.currentScript;
          if (currentScript && currentScript.src) {
            return currentScript.src.replace(/injected\.js.*$/, '');
          }
      
          // Fallback (just in case)
          const scripts = document.querySelectorAll("script[src]");
          for (let script of scripts) {
            if (script.src.includes("injected.js")) {
              return script.src.replace(/injected\.js.*$/, '');
            }
          }
      
          console.warn("Unable to determine base URL, defaulting to empty string");
          return "";
        } catch (err) {
          console.error("Base URL detection failed:", err);
          return "";
        }
      };
      
      const base = getBaseURL();
      

    // const config = {
    //     katexJS: `chrome-extension://${EXT_ID}/vendor/katex.min.js`,
    //     katexCSS: `chrome-extension://${EXT_ID}/vendor/katex.min.css`,
    //     html2canvas: `chrome-extension://${EXT_ID}/vendor/html2canvas.min.js`,
    //     fontsPath: `chrome-extension://${EXT_ID}/vendor/fonts/`
    //   };

    const config = {
        katexJS: `${base}vendor/katex.min.js`,
        katexCSS: `${base}vendor/katex.min.css`,
        html2canvas: `${base}vendor/html2canvas.min.js`,
        fontsPath: `${base}vendor/fonts/`
      };
      
    if (!config) {
        console.error("No Excalidraw LaTeX config found!");
        return;
    }

    let isKaTeXLoaded = false;
    let isHtml2CanvasLoaded = false;

    const waitForLibs = async () => {
        return new Promise((resolve) => {
            const check = () => {
                if (window.katex && window.html2canvas) {
                    resolve();
                } else {
                    setTimeout(check, 50);
                }
            };
            check();
        });
    };

    const loadLocalScript = (url, onload) => {
        const script = document.createElement("script");
        script.src = url;
        script.onload = () => {
            console.log(url + " loaded.");
            if (onload) onload();
        };
        document.documentElement.appendChild(script);
    };

    const loadLocalCSS = (url, fontsPath) => {
        fetch(url)
            .then(res => res.text())
            .then(css => {
                const fixed = css.replace(/url\((.*?)fonts\//g, () => {
                    return `url(${fontsPath}`;
                });
                const style = document.createElement("style");
                style.textContent = fixed;
                document.head.appendChild(style);
            });
    };

    const renderLaTeX = async (latex, rect) => {
        console.log("Waiting for libs...");
        await waitForLibs();
        console.log("Rendering LaTeX:", latex);

        try {
            const container = document.createElement("div");
            container.style.position = "absolute";
            container.style.left = "-9999px";
            container.style.top = "-9999px";
            container.style.fontSize = "32px";
            container.style.background = "white";
            container.style.padding = "8px";
            container.style.borderRadius = "8px";
            container.style.zIndex = "9999";
            container.style.color = "black";
            container.innerHTML = katex.renderToString(latex, {
                throwOnError: false,
                displayMode: true,
            });

            console.log("KaTeX rendered successfully, appending container to DOM.");
            document.body.appendChild(container);

            html2canvas(container).then(canvas => {
                console.log("html2canvas finished rendering.");
                document.body.removeChild(container);
                canvas.toBlob(blob => {
                    if (!blob) {
                        console.error("Failed to convert canvas to blob.");
                        return;
                    }

                    console.log("Blob created from canvas, creating File object.");
                    const file = new File([blob], "latex.png", { type: "image/png" });

                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(file);

                    const pasteEvent = new ClipboardEvent("paste", {
                        clipboardData: dataTransfer,
                        bubbles: true,
                        cancelable: true
                    });

                    Object.defineProperty(pasteEvent, "clipboardData", {
                        value: dataTransfer
                    });

                    const target = document.querySelector(".excalidraw");
                    if (target) {
                        target.focus();
                        target.dispatchEvent(pasteEvent);
                        console.log("LaTeX image pasted into canvas.");
                    } else {
                        document.dispatchEvent(pasteEvent);
                        console.warn("Fallback: pasted to document.");
                    }
                }, "image/png");
            }).catch(err => {
                console.error("html2canvas rendering failed:", err);
            });
        } catch (error) {
            console.error("LaTeX rendering failed:", error);
        }
    };

    const observeTextEditor = () => {
        console.log("Observing for LaTeX editor activation...");

        const observer = new MutationObserver(() => {
            const editorContainer = document.querySelector(".excalidraw-textEditorContainer");
            if (editorContainer) {
                const textArea = editorContainer.querySelector("textarea");

                if (textArea && !textArea.dataset.latexListenerAttached) {
                    console.log("Text editor appeared. Attaching blur handler.");
                    textArea.dataset.latexListenerAttached = "true";

                    textArea.addEventListener("blur", () => {
                        const textContent = textArea.value;
                        console.log("Editor blurred. Checking content:", textContent);

                        const latexBlocks = [...textContent.matchAll(/\$\$(.*?)\$\$/gs)];

                        if (!latexBlocks.length) {
                            console.log("No LaTeX blocks found.");
                            return;
                        }

                        const rect = textArea.getBoundingClientRect();

                        latexBlocks.forEach((match, index) => {
                            const latex = match[1].trim();
                            if (!latex) return;

                            const adjustedRect = {
                                ...rect,
                                top: rect.top + index * 60,
                            };

                            console.log(`Rendering LaTeX block #${index + 1}:`, latex);
                            renderLaTeX(latex, adjustedRect);
                        });
                    });
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });

        console.log("Started observing for text editor open/close.");
    };

    // Load libraries using the config
    loadLocalScript(config.katexJS, () => {
        isKaTeXLoaded = true;
        maybeStart();
    });

    loadLocalScript(config.html2canvas, () => {
        isHtml2CanvasLoaded = true;
        maybeStart();
    });

    loadLocalCSS(config.katexCSS, config.fontsPath);

    const maybeStart = () => {
        console.log("maybeStart", { isKaTeXLoaded, isHtml2CanvasLoaded });
        if (isKaTeXLoaded && isHtml2CanvasLoaded) {
            observeTextEditor();
        }
    };
})();
