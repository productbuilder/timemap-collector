export const browserStyles = `
  :host {
    display: block;
    min-height: 0;
  }

  * {
    box-sizing: border-box;
  }

  .panel {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  }

  .viewport-panel {
    display: grid;
    grid-template-rows: auto 1fr;
    min-height: 0;
    overflow: hidden;
  }

  .panel-header {
    padding: 0.8rem 0.95rem;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.7rem;
  }

  .panel-header-meta {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .panel-title {
    margin: 0;
    font-size: 0.95rem;
    color: #111827;
  }

  .panel-subtext {
    margin: 0;
    font-size: 0.83rem;
    color: #64748b;
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

  .viewport-actions {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    flex-wrap: wrap;
  }

  .source-filter {
    width: 220px;
    min-width: 220px;
    max-width: 220px;
    font: inherit;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 0.42rem 0.55rem;
    background: #ffffff;
    color: #0f172a;
  }

  .is-hidden {
    display: none;
  }

  .asset-wrap {
    padding: 0.9rem;
    overflow: auto;
    min-height: 0;
    position: relative;
  }

  .drop-overlay {
    position: absolute;
    inset: 0;
    border: 2px dashed #0f6cc6;
    border-radius: 10px;
    background: rgba(15, 108, 198, 0.08);
    display: none;
    align-items: center;
    justify-content: center;
    color: #0f4f8a;
    font-weight: 700;
    pointer-events: none;
    z-index: 4;
  }

  .drop-overlay.is-active {
    display: flex;
  }

  .asset-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 0.7rem;
  }

  .asset-card {
    border: 1px solid #dbe3ec;
    border-radius: 9px;
    padding: 0.55rem;
    background: #ffffff;
    display: grid;
    gap: 0.5rem;
    cursor: pointer;
    transition: border-color 120ms ease, box-shadow 120ms ease, background-color 120ms ease;
  }

  .asset-card:hover {
    border-color: #93c5fd;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
    background: #f8fbff;
  }

  .asset-card.is-selected {
    border-color: #0f6cc6;
    box-shadow: 0 0 0 1px #66a6e8 inset, 0 3px 10px rgba(15, 108, 198, 0.16);
    background: #f5faff;
  }

  .thumb {
    width: 100%;
    height: 125px;
    object-fit: cover;
    border-radius: 7px;
    border: 1px solid #dbe3ec;
    background: #eef2f7;
  }

  .thumb-placeholder {
    width: 100%;
    height: 125px;
    border-radius: 7px;
    border: 1px dashed #cbd5e1;
    display: grid;
    place-items: center;
    color: #64748b;
    background: #f8fafc;
    font-size: 0.82rem;
  }

  .card-title {
    margin: 0;
    font-size: 0.88rem;
    font-weight: 700;
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

  .card-actions {
    display: flex;
    gap: 0.45rem;
  }

  .card-actions .btn {
    flex: 1;
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

  @media (max-width: 760px) {
    .viewport-panel.panel {
      border: none;
      background: transparent;
      box-shadow: none;
    }

    .panel-header {
      border: none;
      background: transparent;
      padding: 0.1rem 0 0.45rem;
      position: sticky;
      top: 0;
      z-index: 2;
    }

    .panel-header-meta {
      width: 100%;
      justify-content: space-between;
      gap: 0.4rem;
      flex-wrap: nowrap;
    }

    .btn {
      padding: 0.3rem 0.52rem;
      font-size: 0.77rem;
      border-radius: 7px;
    }

    .asset-wrap {
      padding: 0;
    }

    .asset-grid {
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 0.55rem;
    }

    .asset-card {
      padding: 0.48rem;
      gap: 0.4rem;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
    }

    .thumb,
    .thumb-placeholder {
      height: 108px;
    }

    .card-actions .btn {
      font-size: 0.76rem;
      padding: 0.26rem 0.44rem;
    }

    #assetCount,
    #sourceFilter,
    #collectionFilter {
      display: none;
    }
  }
`;
