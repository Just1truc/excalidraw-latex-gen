// Function to inject a script into the page context
function injectScript(source) {
  const script = document.createElement('script');
  script.textContent = source;
  (document.head || document.documentElement).appendChild(script);
  script.remove();
}

// The code that will run in the page context
const injectedCode = `
  let isKaTeXLoaded = false;
  let isHtml2CanvasLoaded = false;

  // Load KaTeX and html2canvas dynamically
  const loadKaTeX = () => {
    const katexScript = document.createElement("script");
    katexScript.src = "https://cdn.jsdelivr.net/npm/katex@0.15.1/dist/katex.min.js";
    katexScript.onload = () => {
      isKaTeXLoaded = true;
      console.log("KaTeX is loaded.");
      maybeStart();
    };
    document.body.appendChild(katexScript);

    const katexStyle = document.createElement("link");
    katexStyle.rel = "stylesheet";
    katexStyle.href = "https://cdn.jsdelivr.net/npm/katex@0.15.1/dist/katex.min.css";
    document.head.appendChild(katexStyle);
  };

  const loadHtml2Canvas = () => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";
    script.onload = () => {
      isHtml2CanvasLoaded = true;
      console.log("html2canvas is loaded.");
      maybeStart();
    };
    document.body.appendChild(script);
  };

  const maybeStart = () => {
    if (isKaTeXLoaded && isHtml2CanvasLoaded) {
      observeTextEditor();
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
          
            // Match all $$...$$ LaTeX blocks (non-greedy)
            const latexBlocks = [...textContent.matchAll(/\\$\\$(.*?)\\$\\$/gs)];
          
            if (!latexBlocks.length) {
              console.log("No LaTeX blocks found.");
              return;
            }
          
            const rect = textArea.getBoundingClientRect();
          
            latexBlocks.forEach((match, index) => {
              const latex = match[1].trim();
              if (!latex) return;
          
              // Offset each formula vertically so they don't overlap
              const adjustedRect = {
                ...rect,
                top: rect.top + index * 60, // adjust spacing as needed
              };
          
              console.log(\`Rendering LaTeX block #\${index + 1}:\`, latex);
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



  const renderLaTeX = (latex, rect) => {
    console.log(\`Rendering LaTeX: \${latex}\`);
    if (!window.katex || !window.html2canvas) {
      console.error("Dependencies not loaded.");
      return;
    }

    try {
      const container = document.createElement("div");
      container.style.position = "absolute";
      container.style.left = "-9999px";
      container.style.top = "-9999px";
      container.style.fontSize = "32px";
      container.style.background = "white";
      container.style.padding = "8px";
      container.style.borderRadius = "8px";

      container.innerHTML = katex.renderToString(latex, {
        throwOnError: false,
        displayMode: true,
      });

      document.body.appendChild(container);

      html2canvas(container).then(canvas => {
        document.body.removeChild(container);
        canvas.toBlob(blob => {
          if (!blob) {
            console.error("Failed to convert canvas to blob.");
            return;
          }

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
            console.log("Pasted LaTeX image into Excalidraw.");
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

  // Load required libraries
  loadKaTeX();
  loadHtml2Canvas();
`;

// Inject the code into the page context
injectScript(injectedCode);
