export const headerStyles = `
  :host {
    display: block;
  }

  .topbar {
    background: #ffffff;
    border-bottom: 1px solid #e5e7eb;
    padding: 0.85rem 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .brand {
    display: grid;
    gap: 0.15rem;
  }

  .title {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
    color: #111827;
  }

  .status {
    margin: 0;
    font-size: 0.85rem;
    color: #64748b;
  }

  .top-actions {
    display: flex;
    align-items: center;
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

  @media (max-width: 760px) {
    .topbar {
      padding: 0.55rem 0.7rem;
      gap: 0.55rem;
      align-items: center;
    }

    .title {
      font-size: 0.9rem;
    }

    #statusText,
    #workspaceContext {
      display: none;
    }

    .top-actions {
      flex-wrap: nowrap;
      margin-left: auto;
    }

    .btn {
      padding: 0.3rem 0.52rem;
      font-size: 0.77rem;
      border-radius: 7px;
    }
  }
`;
