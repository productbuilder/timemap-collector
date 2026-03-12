export const metadataStyles = `
  :host {
    display: block;
    min-height: 0;
    height: 100%;
  }

  [hidden] {
    display: none !important;
  }

  * {
    box-sizing: border-box;
  }

  .editor-panel {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    height: 100%;
    min-height: 0;
    overflow: hidden;
    background: #ffffff;
    border-left: 1px solid #e2e8f0;
    border-radius: 0;
    box-shadow: none;
  }

  .panel-header {
    padding: 0.8rem 0.95rem;
    border-bottom: 1px solid #e2e8f0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 0.7rem;
  }

  .panel-title {
    margin: 0;
    font-size: 0.95rem;
    color: #111827;
  }

  .editor-header-meta {
    display: grid;
    gap: 0.15rem;
    align-content: start;
    min-width: 0;
  }

  .editor-context {
    margin: 0;
    font-size: 0.78rem;
    color: #64748b;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .editor-header-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .editor-content {
    min-height: 0;
    overflow: auto;
  }

  .editor-wrap {
    padding: 0.95rem;
    display: grid;
    gap: 0.6rem;
    align-content: start;
    min-height: 0;
  }

  .field-row {
    display: grid;
    gap: 0.25rem;
  }

  .field-row > label {
    font-size: 0.8rem;
    color: #475569;
    font-weight: 600;
  }

  input,
  textarea {
    width: 100%;
    font: inherit;
    font-size: 0.9rem;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 0.45rem 0.55rem;
    background: #ffffff;
    color: #0f172a;
  }

  textarea {
    resize: vertical;
    min-height: 78px;
  }

  .checkbox-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.84rem;
    color: #334155;
    padding-top: 0.2rem;
  }

  .checkbox-row input {
    width: auto;
  }

  .btn {
    border: 1px solid #cbd5e1;
    background: #ffffff;
    color: #0f172a;
    border-radius: 8px;
    padding: 0.42rem 0.7rem;
    cursor: pointer;
    font: inherit;
    font-size: 0.88rem;
    font-weight: 600;
  }

  .btn:hover {
    background: #f8fafc;
  }

  .btn-primary {
    background: #0f6cc6;
    color: #ffffff;
    border-color: #0f6cc6;
  }

  .btn-primary:hover {
    background: #0d5eae;
  }

  .editor-section {
    border-top: 1px solid #e2e8f0;
    padding-top: 0.6rem;
    display: grid;
    gap: 0.45rem;
  }

  .editor-section-title {
    margin: 0;
    font-size: 0.78rem;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    color: #64748b;
    font-weight: 700;
  }

  .empty {
    border: 1px dashed #cbd5e1;
    border-radius: 8px;
    padding: 1rem;
    text-align: center;
    color: #64748b;
    background: #f8fafc;
    font-size: 0.9rem;
  }

  .editor-close-btn {
    display: none;
  }

  @media (max-width: 760px) {
    :host {
      height: auto;
    }

    .editor-panel {
      position: fixed;
      inset: 0;
      z-index: 12;
      border: none;
      border-radius: 0;
      box-shadow: none;
      background: #f3f5f8;
      display: none;
    }

    .editor-panel.is-mobile-editor-open {
      display: grid;
    }

    .panel-header {
      padding: 0.7rem 0.8rem;
      background: #ffffff;
      border-bottom: 1px solid #e2e8f0;
      position: sticky;
      top: 0;
      z-index: 2;
    }

    .editor-context {
      max-width: 160px;
    }

    .editor-wrap {
      padding: 0.8rem;
    }

    .editor-close-btn {
      display: inline-flex;
    }

    .btn {
      padding: 0.3rem 0.52rem;
      font-size: 0.77rem;
      border-radius: 7px;
    }
  }
`;
