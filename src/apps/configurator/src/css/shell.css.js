export const configuratorShellStyles = `
  :host {
    display: block;
    color: #111827;
    font-family: "Segoe UI", Tahoma, sans-serif;
  }

  * {
    box-sizing: border-box;
  }

  .app-shell {
    height: min(100dvh, 100vh);
    min-height: 680px;
    background: #eef2f7;
    border: 1px solid #d9e0ea;
    border-radius: 10px;
    overflow: hidden;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
  }

  .workspace {
    min-height: 0;
    display: block;
    overflow: hidden;
  }

  open-configurator-section-browser {
    min-height: 0;
    padding: 0.9rem;
    overflow: hidden;
  }

  open-configurator-inspector {
    min-height: 0;
    border-left: 1px solid #dbe3ec;
    background: #ffffff;
  }

  @media (max-width: 1080px) {
    open-configurator-section-browser {
      padding: 0.8rem;
    }
  }

  @media (max-width: 760px) {
    .app-shell {
      border: none;
      border-radius: 0;
      min-height: 100dvh;
    }
    open-configurator-section-browser {
      padding: 0.65rem;
    }
  }
`;
