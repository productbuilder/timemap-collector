# TimeMap Collector — Authentication and Storage Access Architecture

## 1. Purpose

This document defines the architecture for authentication, authorization, and storage access in TimeMap Collector.

The goal is to:

- keep Collector open and portable
- allow multiple authentication systems
- allow different storage providers
- support secure credential handling
- allow deployments to choose their own security models

TimeMap Collector is responsible for collection management, metadata editing, validation, and publication workflows. Authentication and storage access are handled through pluggable layers so Collector remains independent of any single identity provider or storage platform.

## 2. Design Principles

The architecture follows these principles:

- **Separation of concerns**: core Collector workflows are distinct from identity and provider authorization details.
- **Pluggable authentication**: deployments can integrate different login systems without changing Collector core behavior.
- **Storage-provider independence**: storage operations use provider-neutral capability contracts and adapter interfaces.
- **Least privilege access**: all storage permissions should be scoped to minimum required actions.
- **Support for decentralized deployments**: institutions and self-hosted environments can use local and federated approaches.
- **Compatibility with institutional security requirements**: architecture supports enterprise identity, auditing, and policy controls.

Collector should standardize the **publication contract** (what is published, validated, and versioned), not the **authentication system** (how users or services authenticate).

## 3. Layered Architecture

TimeMap Collector should be structured into four layers:

1. **Collector Application Layer**
2. **Identity Layer**
3. **Storage Authorization Layer**
4. **Storage Provider Adapter Layer**

Diagram-style interaction flow:

**User → Identity Provider → Collector → Storage Authorization → Storage Adapter → Storage Provider**

Layer interaction model:

- Users authenticate through the Identity Layer to access Collector.
- Collector executes domain operations (editing, validation, publishing).
- When external storage operations are needed, Collector requests access through the Storage Authorization Layer.
- Authorized operations are passed to a Storage Adapter.
- The adapter performs provider-specific API calls against the target storage system.

This layering ensures provider-specific and security-model-specific concerns do not leak into Collector core logic.

## 4. Collector Application Layer

Responsibilities of the Collector Application Layer include:

- collection management
- metadata editing
- validation
- publishing
- connection management
- manifest generation

Collector should orchestrate workflows and business rules, but it should not implement complex provider-specific authentication logic internally. Instead, it invokes standardized interfaces exposed by identity and storage authorization components.

## 5. Identity Layer

The Identity Layer controls login and session identity for access to the Collector application itself.

Possible identity providers include:

- local accounts
- OIDC / OAuth login
- institutional SSO
- enterprise identity providers
- external identity platforms

Collector deployments should be able to choose their own identity backend based on operational, policy, and compliance requirements.

## 6. Storage Authorization Layer

The Storage Authorization Layer manages how Collector obtains permission to perform operations in external storage systems.

Responsibilities include:

- token management
- credential storage
- delegated authorization
- revocation
- permission scope

Collector should treat storage access as named **connections** with defined capabilities (for example: read, write, list, publish). This model allows explicit control over what each connection can do and provides predictable behavior across providers.

## 7. Storage Adapter Layer

Storage adapters encapsulate interaction with specific storage providers.

Examples:

- GitHub repository adapter
- S3-compatible storage adapter
- WebDAV adapter
- static HTTP publishing adapter

Each adapter defines the operations it supports.

Example capabilities:

- list files
- read files
- upload files
- write metadata files
- publish manifest
- generate public URLs

Adapters translate Collector capability requests into provider-specific API operations while maintaining consistent behavior at the Collector interface level.

## 8. Supported Storage Authorization Modes

Collector should support multiple storage connection types.

### Public URL Mode

- read-only
- no authentication required
- used when assets are already public

### OAuth Delegated Access

Examples:

- GitHub OAuth
- Google OAuth
- Microsoft OAuth

Collector receives a scoped token after explicit user authorization and uses that token for permitted storage operations.

### Provider Credentials

Examples:

- S3 access keys
- object storage credentials

Credentials should be stored securely (encrypted at rest, protected in transit, and handled using restricted access controls).

### External Authorization Broker

Institutions may use an external service that issues temporary tokens or credentials. Collector should integrate via broker APIs and avoid storing long-term provider secrets when broker-mediated delegation is available.

### Desktop / Local Agent Signing

In this model, a desktop or local agent holds credentials and performs signed operations on behalf of the browser application. Collector requests signed actions without directly handling the underlying long-lived secrets.

## 9. Connection Capability Model

Storage connections should be capability-based rather than provider-hardcoded.

Example connection description:

Connection
- provider: github
- auth_method: oauth
- capabilities:
  - read
  - write
  - list
  - publish_manifest

A capability-based design enables uniform behavior across diverse providers, simplifies permission reasoning, and supports incremental provider integration without changing Collector core workflows.

## 10. Recommended Authentication Standards

Recommended standards and credential models include:

### OAuth / OpenID Connect

Used for:

- user login
- delegated provider access

### SAML

Used for:

- enterprise institutional SSO

### Access Key Credentials

Used for:

- object storage systems

### Scoped Tokens

Short-lived scoped tokens are preferred over permanent credentials wherever feasible.

## 11. Security Requirements

Collector deployments should enforce these security requirements:

- least privilege access
- encrypted credential storage
- revocation support
- audit logging
- explicit write permissions
- separation between read-only and write connections
- protection against accidental exposure of private storage

Security controls should be applied consistently across both interactive and automated publishing workflows.

## 12. Recommended v1 Support

For initial implementation, Collector v1 should support:

- Public URL mode
- GitHub OAuth connection
- S3-compatible credential access

This set covers common practical use cases while keeping implementation complexity manageable for an initial release.

## 13. Future Extensions

Possible future enhancements include:

- Microsoft and Google storage connectors
- external authentication brokers
- desktop signing agents
- temporary delegated credentials
- institutional security integrations

These extensions should build on the same capability-based connection model and layered architecture.

## 14. Summary

TimeMap Collector should support:

- pluggable identity providers
- pluggable storage authorization methods
- modular storage adapters

This architecture keeps Collector open source, flexible, and compatible with a wide range of storage and institutional security environments.
