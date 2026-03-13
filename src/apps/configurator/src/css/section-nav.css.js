export const configuratorSectionNavStyles = `
  :host {
    display: block;
    min-height: 0;
  }

  * {
    box-sizing: border-box;
  }

  .nav-wrap {
    height: 100%;
    min-height: 0;
    overflow: auto;
    padding: 0.75rem 0.65rem;
    display: grid;
    gap: 0.42rem;
    align-content: start;
  }

  .nav-title {
    margin: 0 0 0.25rem;
    font-size: 0.78rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #64748b;
    font-weight: 700;
  }

  .domain-grid {
    display: grid;
    gap: 0.35rem;
    margin-bottom: 0.35rem;
  }

  .domain-btn {
    width: 100%;
    border: 1px solid #d6deea;
    background: #ffffff;
    color: #0f172a;
    border-radius: 8px;
    padding: 0.4rem 0.48rem;
    text-align: left;
    display: grid;
    gap: 0.16rem;
    cursor: pointer;
    font: inherit;
  }

  .domain-btn:hover {
    background: #f8fbff;
    border-color: #bfdbfe;
  }

  .domain-btn.is-active {
    border-color: #0f6cc6;
    background: #eff6ff;
    box-shadow: 0 0 0 1px #9bc6ee inset;
  }

  .domain-name {
    font-size: 0.83rem;
    font-weight: 700;
  }

  .nav-btn {
    width: 100%;
    border: 1px solid #d6deea;
    background: #ffffff;
    color: #0f172a;
    border-radius: 8px;
    padding: 0.45rem 0.5rem;
    text-align: left;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.6rem;
    cursor: pointer;
    font: inherit;
  }

  .nav-btn:hover {
    background: #f8fbff;
    border-color: #bfdbfe;
  }

  .nav-btn.is-active {
    border-color: #0f6cc6;
    background: #f1f7ff;
    box-shadow: 0 0 0 1px #9bc6ee inset;
  }

  .name {
    font-size: 0.84rem;
    font-weight: 600;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .count {
    font-size: 0.72rem;
    color: #475569;
    border-radius: 999px;
    border: 1px solid #cbd5e1;
    background: #f8fafc;
    padding: 0.12rem 0.42rem;
    white-space: nowrap;
  }

  .meta {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
  }

  .warn {
    font-size: 0.72rem;
    color: #991b1b;
    border-radius: 999px;
    border: 1px solid #fecaca;
    background: #fef2f2;
    padding: 0.12rem 0.42rem;
    white-space: nowrap;
    font-weight: 700;
  }

  .empty {
    border: 1px dashed #cbd5e1;
    border-radius: 8px;
    padding: 0.6rem;
    text-align: center;
    color: #64748b;
    background: #f8fafc;
    font-size: 0.8rem;
  }
`;
