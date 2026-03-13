# UI Hierarchy

## Level 0: Organization

The selected organization is shown in the header on the right.

- Current implementation: local selector
- Future: full organization switching and permissions

## Level 1: Workspace

Header tabs on the left:

- `General`
- `Products`
- `Materials`

Switching workspace resets deeper navigation to the workspace root level.

## Level 2: Collections

In `Products` and `Materials`, users first see collection lists.

- Collections are shown in rows/cards using the existing browser pattern.
- Users select and open a collection before section editing.

## Level 3: Sections

Inside an opened collection, users see section entries.

- Back button appears next to the title.
- Sections are listed as selectable rows.
- In Products, `Export / Package` appears as a contextual section.

## Level 4: Entries

Inside a selected section:

- Main panel shows entries (rows/cards)
- Right inspector edits the selected entry
- Array actions (add/duplicate/delete/reorder) stay available for array sections

## Export level

Products includes an `Export / Package` level:

- Preview generated package JSON
- Show warnings and basic validation
- Download package JSON
