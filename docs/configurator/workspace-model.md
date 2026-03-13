# Workspace Model

## Organization model

Organization is the top workspace context.

Current state includes:

- `currentOrganizationId`
- `organizations[]`

Collections carry organization metadata:

- `ownerOrganizationId`
- `sourceOrganizationId`
- `linked` flag (future external linkage)

## Data domains

### Manufacturer source (General workspace)

Single organization-level source document:

- file handle + file name
- data object
- dirty flag
- validation

### Product collections (Products workspace)

Array of product collection documents:

- local-first file handles
- per-collection dirty/validation state
- selected collection ID

### Material collections (Materials workspace)

Array of material collection documents:

- local-first file handles
- per-collection dirty/validation state
- selected collection ID

## Generated export

Generated export is derived from:

- selected product collection (base)
- manufacturer source (additive merge)
- loaded material collections (additive merge)

Export state includes:

- `generatedPackageData`
- `exportWarnings`

## Future cross-organization collections

Model is prepared for future cross-org use by keeping collection ownership/source fields.

Next steps can add:

- explicit linked collection registry
- remote collection references
- source provenance badges and filters
