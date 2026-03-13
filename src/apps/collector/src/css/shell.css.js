export const shellStyles = `
  :host {
    display: block;
    color: #111827;
    font-family: "Segoe UI", Tahoma, sans-serif;
  }

  * {
    box-sizing: border-box;
  }

  [hidden] {
    display: none !important;
  }

  .app-shell {
    height: min(100dvh, 100vh);
    min-height: 640px;
    background: #f3f5f8;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .content-grid {
    flex: 1;
    min-height: 0;
    padding: 0;
    display: grid;
    gap: 0rem;
    grid-template-columns: minmax(0, 1fr) 420px;
    align-items: stretch;
    overflow: hidden;
  }

  .content-grid.is-inspector-hidden {
    grid-template-columns: minmax(0, 1fr);
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

  .panel-subtext {
    margin: 0;
    font-size: 0.83rem;
    color: #64748b;
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

  textarea {
    resize: vertical;
    min-height: 78px;
  }

  dialog {
    width: min(780px, 94vw);
    border: 1px solid #dbe3ec;
    border-radius: 12px;
    padding: 0;
    box-shadow: 0 14px 36px rgba(15, 23, 42, 0.2);
    background: #ffffff;
  }

  dialog::backdrop {
    background: rgba(15, 23, 42, 0.45);
  }

  .dialog-shell {
    display: grid;
    grid-template-rows: auto 1fr;
    max-height: min(82vh, 760px);
  }

  .dialog-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;
    padding: 0.8rem 0.95rem;
    border-bottom: 1px solid #e2e8f0;
  }

  .dialog-title {
    margin: 0;
    font-size: 0.95rem;
  }

  .dialog-body {
    padding: 0.95rem;
    overflow: auto;
    display: grid;
    gap: 0.7rem;
    align-content: start;
  }

  .dialog-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .source-card {
    border: 1px solid #dbe3ec;
    border-radius: 8px;
    background: #ffffff;
    padding: 0.6rem;
    display: grid;
    gap: 0.45rem;
  }

  .source-card-label {
    margin: 0;
    font-size: 0.88rem;
    font-weight: 700;
  }

  .source-list {
    display: grid;
    gap: 0.55rem;
  }

  .storage-dialog {
    width: min(1080px, 96vw);
  }

  .storage-layout {
    display: grid;
    gap: 0.8rem;
  }

  .storage-section {
    border: 1px solid #dbe3ec;
    border-radius: 8px;
    background: #ffffff;
    padding: 0.75rem;
    display: grid;
    gap: 0.45rem;
  }

  .storage-heading {
    margin: 0;
    font-size: 0.9rem;
    color: #0f172a;
  }

  .storage-list {
    margin: 0;
    padding-left: 1.1rem;
    display: grid;
    gap: 0.3rem;
    color: #334155;
    font-size: 0.86rem;
  }

  .storage-table-wrap {
    overflow: auto;
    border: 1px solid #dbe3ec;
    border-radius: 8px;
    background: #ffffff;
  }

  .storage-table {
    width: 100%;
    min-width: 980px;
    border-collapse: collapse;
    font-size: 0.82rem;
    color: #334155;
  }

  .storage-table th,
  .storage-table td {
    border-bottom: 1px solid #e2e8f0;
    padding: 0.45rem 0.5rem;
    text-align: left;
    vertical-align: top;
  }

  .storage-table th {
    background: #f8fafc;
    color: #0f172a;
    font-weight: 700;
    position: sticky;
    top: 0;
    z-index: 1;
  }

  .storage-table tr:last-child td {
    border-bottom: none;
  }

  .storage-tag {
    display: inline-block;
    padding: 0.08rem 0.38rem;
    border-radius: 999px;
    border: 1px solid #bfdbfe;
    background: #eff6ff;
    color: #1d4ed8;
    font-size: 0.72rem;
    font-weight: 700;
    white-space: nowrap;
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

  @media (max-width: 1080px) {
    .content-grid {
      grid-template-columns: minmax(0, 1fr);
      overflow: auto;
    }
  }

  @media (max-width: 760px) {
    .app-shell {
      border: none;
      border-radius: 0;
      min-height: 100dvh;
    }

    .content-grid {
      padding: 0.65rem;
      gap: 0.65rem;
    }

    .btn {
      padding: 0.3rem 0.52rem;
      font-size: 0.77rem;
      border-radius: 7px;
    }
  }
`;
