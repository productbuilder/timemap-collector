export const configuratorHeaderStyles = `
  :host {
    display: block;
  }

  * {
    box-sizing: border-box;
  }

  .topbar {
    background: #ffffff;
    border-bottom: 1px solid #dbe3ec;
    padding: 0.65rem 0.9rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.8rem;
  }

  .left-stack {
    min-width: 0;
    display: grid;
    gap: 0.2rem;
    flex: 1;
  }

  .title-row {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    min-width: 0;
    flex-wrap: wrap;
  }

  .title {
    margin: 0;
    font-size: 0.98rem;
    font-weight: 700;
    color: #0f172a;
    white-space: nowrap;
  }

  .workspace-tabs {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    flex-wrap: wrap;
  }

  .tab-btn {
    border: 1px solid #cbd5e1;
    background: #ffffff;
    color: #0f172a;
    border-radius: 8px;
    padding: 0.35rem 0.62rem;
    cursor: pointer;
    font: inherit;
    font-size: 0.8rem;
    font-weight: 600;
  }

  .tab-btn:hover {
    background: #f8fafc;
  }

  .tab-btn.is-active {
    border-color: #0f6cc6;
    background: #eff6ff;
    color: #1d4ed8;
  }

  .right-stack {
    display: grid;
    gap: 0.2rem;
    min-width: 180px;
  }

  .org-label {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #64748b;
    font-weight: 700;
  }

  .org-select {
    border: 1px solid #cbd5e1;
    background: #ffffff;
    color: #0f172a;
    border-radius: 8px;
    padding: 0.34rem 0.5rem;
    font: inherit;
    font-size: 0.82rem;
    min-width: 160px;
  }

  @media (max-width: 860px) {
    .topbar {
      align-items: flex-start;
      flex-direction: column;
    }

    .right-stack {
      width: 100%;
      min-width: 0;
    }

    .org-select {
      min-width: 0;
      width: 100%;
    }
  }
`;
