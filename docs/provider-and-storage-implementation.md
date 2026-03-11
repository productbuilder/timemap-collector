# Provider and storage implementation

This note describes implementation priorities for provider packages in this repository.

## Provider packages
- `src/packages/provider-core`
- `src/packages/provider-local`
- `src/packages/provider-public-url`
- `src/packages/provider-github`
- `src/packages/provider-gdrive`

## Interface expectations
- Read collection manifests from provider-backed locations.
- Write/update published outputs with stable paths.
- Surface recoverable errors clearly (auth, missing permissions, invalid paths).
- Keep output paths protocol-friendly (`collection.json`, media/item URLs).

## Output contract
Providers can vary internally, but published outputs should remain portable and provider-agnostic.

## Related docs
- `docs/collection-manifest-spec.md`
- `docs/linked-collections-architecture.md`
- `site/storage/index.html`
