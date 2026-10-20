import { LitElement, css, html } from 'lit';

// Shared by the column heads and the rows, so that they line up
const columns = css`
  .columns {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 40px minmax(0, 1fr);
  }
  @media (max-width: 760px) {
    .columns { grid-template-columns: minmax(0, 1fr); }
  }
`;

/**
 * "Problems it solves" (_includes/sections/problems.html): one
 * <problem-item> per problem below the column heads, given as the
 * attributes before and after.
 */
export class ProblemComparison extends LitElement {
  static properties = {
    before: {},
    after: {},
  };

  static styles = [columns, css`
    :host { display: block; }
    .head {
      font-size: var(--font-size-label, 13px);
      font-weight: 700;
      letter-spacing: .08em;
      text-transform: uppercase;
      padding: 0 18px 8px;
    }
    .before { color: var(--no); }
    .after { color: var(--ok); }
    .rows { display: grid; gap: 12px; }
    @media (max-width: 760px) {
      .columns.heads { display: none; }
      /* Stacked, the space between two problems must be larger than inside one problem */
      .rows { gap: 36px; }
    }
  `];

  render() {
    return html`
      <div class="columns heads" aria-hidden="true">
        <span class="head before">${this.before}</span><span></span><span class="head after">${this.after}</span>
      </div>
      <div class="rows" role="list"><slot></slot></div>
    `;
  }
}

/**
 * One problem: the attribute heading, the slots "before" (how it is done
 * today) and "after" (with the Action API). The label attribute is read out
 * before the solution, because the column heads are only visual.
 */
export class ProblemItem extends LitElement {
  static properties = {
    heading: {},
    label: {},
  };

  static styles = [columns, css`
    :host { display: block; }
    .card {
      display: grid;
      grid-template-columns: 24px minmax(0, 1fr);
      column-gap: 14px;
      align-items: start;
      align-content: center;
      padding: 16px 18px;
      border-radius: var(--radius, 14px);
      border: 1px solid var(--border);
      font-size: var(--font-size-text, 17px);
      line-height: 26px;
    }
    .before { background: var(--surface); color: var(--muted); }
    .after {
      background: var(--ok-soft);
      border-color: color-mix(in srgb, var(--ok) 35%, var(--border));
      color: var(--fg);
      box-shadow: var(--shadow);
    }
    h3 { margin: 0 0 4px; font-size: var(--font-size-base, 18px); line-height: 26px; color: var(--fg); }
    .symbol {
      width: 24px;
      height: 24px;
      margin-top: 1px;
      border-radius: 999px;
      display: grid;
      place-items: center;
      font-size: 13px;
      font-weight: 700;
      line-height: 1;
    }
    .before .symbol { background: var(--no-soft); color: var(--no); }
    .after .symbol { background: var(--ok); color: #fff; }
    .arrow {
      display: grid;
      place-items: center;
      color: var(--accent);
      font-size: 22px;
      font-weight: 700;
    }
    .visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
    @media (max-width: 760px) {
      .arrow { height: 24px; font-size: 18px; transform: rotate(90deg); }
    }
  `];

  connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'listitem');
  }

  render() {
    return html`
      <div class="columns">
        <div class="card before">
          <span class="symbol" aria-hidden="true">✕</span>
          <div><h3>${this.heading}</h3><slot name="before"></slot></div>
        </div>
        <div class="arrow" aria-hidden="true">→</div>
        <div class="card after">
          <span class="symbol" aria-hidden="true">✓</span>
          <div><span class="visually-hidden">${this.label}: </span><slot name="after"></slot></div>
        </div>
      </div>
    `;
  }
}

customElements.define('problem-comparison', ProblemComparison);
customElements.define('problem-item', ProblemItem);
