export const sourceManagerStyles = `
  :host {
    display: grid;
    gap: 0.7rem;
  }

  * {
    box-sizing: border-box;
  }

  .source-manager {
    display: grid;
    gap: 0.7rem;
  }

  .source-list {
    display: grid;
    gap: 0.55rem;
  }

  .source-card {
    border: 1px solid #dbe3ec;
    border-radius: 8px;
    background: #ffffff;
    padding: 0.6rem;
    display: grid;
    gap: 0.45rem;
  }

  .source-card-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.6rem;
  }

  .source-card-label {
    margin: 0;
    font-size: 0.88rem;
    font-weight: 700;
  }

  .source-card-actions {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
  }

  .source-card-actions .btn {
    font-size: 0.78rem;
    padding: 0.25rem 0.45rem;
  }

  .source-card-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .badge-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .provider-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 0.7rem;
  }

  .provider-layout.single-column {
    grid-template-columns: minmax(0, 1fr);
  }

  .provider-list {
    display: grid;
    gap: 0.5rem;
    align-content: start;
  }

  .provider-card {
    border: 1px solid #dbe3ec;
    border-radius: 8px;
    background: #ffffff;
    padding: 0.6rem;
    text-align: left;
    display: grid;
    gap: 0.2rem;
    cursor: pointer;
  }

  .provider-card.is-selected {
    border-color: #0f6cc6;
    box-shadow: 0 0 0 1px #66a6e8 inset;
    background: #f5faff;
  }

  .provider-card.is-disabled {
    cursor: not-allowed;
    background: #f8fafc;
    color: #64748b;
    border-color: #e2e8f0;
  }

  .provider-card-label-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .provider-config {
    display: grid;
    gap: 0.6rem;
    align-content: start;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #f8fafc;
    padding: 0.7rem;
  }

  .config-section-title {
    margin: 0;
    font-size: 0.83rem;
    color: #334155;
  }

  .panel-subtext {
    margin: 0;
    font-size: 0.83rem;
    color: #64748b;
  }

  .pill {
    border-radius: 999px;
    border: 1px solid #cbd5e1;
    padding: 0.1rem 0.4rem;
    font-size: 0.72rem;
    color: #475569;
    background: #f8fafc;
  }

  .pill.is-muted {
    color: #64748b;
    border-color: #e2e8f0;
    background: #f8fafc;
  }

  .dialog-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
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

  .storage-help-btn {
    margin-top: 0.5rem;
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
  textarea,
  select {
    width: 100%;
    font: inherit;
    font-size: 0.9rem;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 0.45rem 0.55rem;
    background: #ffffff;
    color: #0f172a;
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

  .is-hidden {
    display: none;
  }

  pre {
    margin: 0;
    padding: 0.75rem;
    border-radius: 8px;
    background: #0f172a;
    color: #dbeafe;
    font-size: 0.8rem;
    max-height: 280px;
    overflow: auto;
    white-space: pre-wrap;
    word-break: break-word;
  }
`;
