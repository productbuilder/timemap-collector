# Open Collections Protocol Site Narrative Roadmap

## Purpose
This roadmap aligns the repository and published site around one coherent public narrative for **Open Collections Protocol**. It defines phased work so improvements are incremental, reviewable, and verifiable rather than a one-pass rewrite.

## Core framing (must remain consistent)
- **Open Collections Protocol** = umbrella public framing.
- **LinkedCollections** = architectural model.
- **Domain Collections Discovery (DCD)** = domain-level discovery mechanism.
- **Collection Manager** = editing/publishing tool and embeddable component.
- **Collection Browser** = viewing/browsing tool and embeddable component.
- **Collection Registry** = public-facing registry tool.
- **Registrator** = internal architectural term for Collection Registry.
- **Collection Indexer** = indexing/processing tool.
- **TimeMap** = exploratory presentation layer.

## Target audiences
1. Non-technical collection owners and publishers.
2. Museums, archives, libraries, local history groups, and community curators.
3. Developers and integrators.
4. Tool builders.

## Workstreams
1. **Narrative and naming alignment**
   - Standardize public names and preserve internal terms only where explicitly needed.
   - Remove or revise outdated/ambiguous terms.
2. **Information architecture and navigation**
   - Keep global navigation consistent across Home, Protocol, Tools, Storage Providers, Documentation, and Demo.
   - Improve cross-linking so major pages are not orphaned.
3. **Public ecosystem pages**
   - Ensure complete and aligned coverage for Tools, Storage Providers, Collection Registry, Collection Indexer, WordPress integration, and Publish a collection.
4. **Technical documentation organization**
   - Provide a clear docs landing page with non-technical and technical paths.
   - Keep implementation depth in lower-level docs while preserving plain-language top-level pages.
5. **Quality and verification**
   - Run phase-by-phase consistency checks, link checks (manual path checks), and published-site spot checks where possible.
   - Track unresolved items explicitly.

## Phased execution plan

### Phase 0 — Roadmap setup
- Create this roadmap in-repo.
- Define acceptance criteria and verification approach.

### Phase 1 — Naming, navigation, and docs landing
- Standardize naming in Home + key site pages.
- Ensure global navigation is consistent.
- Improve Documentation landing page with audience-based entry points.

### Phase 2 — Ecosystem page completion
- Refine/complete Tools page.
- Refine/complete Storage Providers page.
- Refine Collection Registry + Collection Indexer page with explicit distinction.
- Refine WordPress integration page and link it clearly into ecosystem flow.

### Phase 3 — Publishing and integration guidance
- Add/refine **Publish a collection** page for non-technical and technical readers.
- Add/refine components and embedding documentation path.
- Add/refine provider/storage implementation guidance and link from docs landing.

### Phase 4 — Consistency pass and verification wrap-up
- End-to-end narrative pass across site/docs.
- Internal-link and nav verification pass.
- Published-site comparison checks (best effort) and log any unresolved/pending deployment differences.

## Acceptance criteria
- A roadmap exists in the repository and documents phased work and verification.
- Public-facing naming is consistent with the required core framing.
- Ecosystem pages are present, linked, and coherent.
- Documentation landing page clearly separates beginner/non-technical pathways from deeper technical references.
- Navigation is consistent across key pages and avoids orphaned major pages.
- Verification notes are honest about what was and was not confirmed.

## Verification approach
After each phase:
1. Review changed files for naming consistency and framing.
2. Verify internal links changed in that phase (manual path checks and targeted command checks).
3. Verify navigation consistency on changed pages.
4. Attempt published-site URL spot checks and record whether results are conclusive.
5. Log unresolved issues and follow-up tasks.

## Phase execution log

### Phase 0 log
- Status: Completed.
- Output: Roadmap created at `projects/roadmap/site-narrative-roadmap.md`.
- Notes: Remaining phases executed below.

### Phase 1 log
- Status: Completed.
- Completed work: Updated Home narrative framing, standardized terminology cues, and rebuilt Documentation landing around audience paths.
- Checks run:
  - Naming consistency spot check across updated pages.
  - Navigation consistency check on Home and Documentation pages.
  - Internal local-link validation for changed docs entry points.

### Phase 2 log
- Status: Completed.
- Completed work: Refined Tools, Storage Providers, Collection Registry/Indexer, and WordPress integration pages with explicit role separation and shared naming.
- Checks run:
  - Naming consistency spot check across ecosystem pages.
  - Cross-link review between Tools/Storage/Documentation ecosystem pages.

### Phase 3 log
- Status: Completed.
- Completed work: Added Publish a collection, Components and embedding, and Provider/storage implementation pages; added supporting Markdown technical notes.
- Checks run:
  - Internal local-link validation after new pages were added.
  - Documentation path review for non-technical vs technical routing.

### Phase 4 log
- Status: Completed (with partial external verification).
- Checks run:
  - Repo-wide naming and framing spot check on top-level site pages and docs pages.
  - Internal href existence check across site HTML pages.
  - Published-site URL comparison attempt for likely GitHub Pages URLs.
- Verification limitation:
  - Published-site checks were inconclusive in this environment because external URL fetch attempts returned status `000` (connection unavailable).

## Unresolved issues tracker
- Published-site verification remains unresolved from this run due to network-level connection failures (curl status `000`) when attempting likely public URLs.
