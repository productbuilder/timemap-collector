export const viewerStyles = `
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
    text-decoration: none;
  }

  .btn:hover {
    background: #f8fafc;
  }

  dialog {
    width: min(980px, 96vw);
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
    gap: 0.8rem;
    align-content: start;
  }

  .viewer-media-wrap {
    border: 1px solid #dbe3ec;
    border-radius: 8px;
    background: #f8fafc;
    min-height: 280px;
    max-height: 60vh;
    overflow: auto;
    display: grid;
    place-items: center;
    padding: 0.7rem;
  }

  .viewer-image {
    max-width: 100%;
    max-height: 56vh;
    width: auto;
    height: auto;
    border-radius: 7px;
    border: 1px solid #cbd5e1;
    background: #ffffff;
  }

  .viewer-video {
    max-width: 100%;
    max-height: 56vh;
    border-radius: 7px;
    border: 1px solid #cbd5e1;
    background: #0f172a;
  }

  .viewer-details {
    display: grid;
    gap: 0.55rem;
  }

  .viewer-text {
    margin: 0;
    color: #334155;
    font-size: 0.9rem;
    white-space: pre-wrap;
  }

  .badge-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .badge {
    font-size: 0.75rem;
    padding: 0.15rem 0.4rem;
    border-radius: 999px;
    border: 1px solid #cbd5e1;
    color: #475569;
    background: #f8fafc;
  }

  .badge.ok {
    border-color: #86efac;
    background: #f0fdf4;
    color: #166534;
  }

  .badge.warn {
    border-color: #fed7aa;
    background: #fff7ed;
    color: #9a3412;
  }

  .badge.source-badge {
    border-color: #bfdbfe;
    background: #eff6ff;
    color: #1d4ed8;
  }

  .dialog-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
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
`;
