export const configuratorInspectorStyles = `
  :host {
    display: block;
    min-height: 0;
  }

  * {
    box-sizing: border-box;
  }

  .panel {
    height: 100%;
    min-height: 0;
    display: grid;
    grid-template-rows: auto 1fr;
    overflow: hidden;
  }

  .head {
    border-bottom: 1px solid #e2e8f0;
    padding: 0.75rem 0.85rem;
    display: grid;
    gap: 0.2rem;
  }

  .title {
    margin: 0;
    font-size: 0.93rem;
    color: #0f172a;
  }

  .context {
    margin: 0;
    font-size: 0.8rem;
    color: #64748b;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .body {
    min-height: 0;
    overflow: auto;
    padding: 0.8rem;
    display: grid;
    gap: 0.62rem;
    align-content: start;
  }

  .empty {
    border: 1px dashed #cbd5e1;
    border-radius: 8px;
    padding: 0.85rem;
    color: #64748b;
    background: #f8fafc;
    font-size: 0.88rem;
  }

  .field {
    display: grid;
    gap: 0.25rem;
  }

  .field.three {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.5rem;
  }

  .field > label {
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
    padding: 0.44rem 0.55rem;
    background: #ffffff;
    color: #0f172a;
  }

  textarea {
    min-height: 92px;
    resize: vertical;
  }

  .checkbox {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.86rem;
    color: #334155;
  }

  .checkbox input {
    width: auto;
  }

  .invalid {
    border-color: #ef4444 !important;
    background: #fef2f2 !important;
  }

  .hint {
    margin: 0;
    font-size: 0.76rem;
    color: #64748b;
  }

  .warning-box {
    border: 1px solid #fecaca;
    border-radius: 8px;
    background: #fef2f2;
    color: #7f1d1d;
    padding: 0.5rem 0.55rem;
    font-size: 0.8rem;
  }

  .warning-box strong {
    display: block;
    margin: 0 0 0.2rem;
  }

  .warning-box ul {
    margin: 0;
    padding-left: 1rem;
    display: grid;
    gap: 0.1rem;
  }

  .preview {
    border: 1px solid #dbe3ec;
    border-radius: 8px;
    background: #f8fafc;
    padding: 0.4rem;
  }

  .preview img {
    display: block;
    width: 100%;
    max-height: 180px;
    object-fit: contain;
    border-radius: 6px;
    border: 1px solid #dbe3ec;
    background: #ffffff;
  }

  .field-group {
    border: 1px solid #dbe3ec;
    border-radius: 8px;
    background: #f8fafc;
    padding: 0.55rem;
    display: grid;
    gap: 0.45rem;
  }

  .group-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .group-title {
    margin: 0;
    font-size: 0.8rem;
    color: #334155;
    font-weight: 700;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }

  .btn {
    border: 1px solid #cbd5e1;
    background: #ffffff;
    color: #0f172a;
    border-radius: 8px;
    padding: 0.36rem 0.62rem;
    cursor: pointer;
    font: inherit;
    font-size: 0.8rem;
    font-weight: 600;
  }

  .btn.tiny {
    padding: 0.22rem 0.4rem;
    font-size: 0.75rem;
  }

  .btn.danger {
    border-color: #fecaca;
    color: #991b1b;
    background: #fff1f2;
  }

  .instance-card {
    border: 1px solid #dbe3ec;
    border-radius: 8px;
    background: #ffffff;
    padding: 0.5rem;
    display: grid;
    gap: 0.4rem;
  }

  .instance-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  @media (max-width: 760px) {
    .field.three {
      grid-template-columns: minmax(0, 1fr);
    }
  }
`;
