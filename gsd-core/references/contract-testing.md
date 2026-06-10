# Contract Testing — Verifying Integrations Without the Real Thing

How-to reference for testing the boundary between two services (or your app and a 3rd party) without standing up the real dependency in every test. Read when a component integrates with an external API/service you **can't run or seed in CI**. Pairs with `test-strategy.md` (its "contract tests where a 3rd-party can't be seeded" line).

## When to use it

- A consumer depends on a provider you can't run in CI (a partner API, another team's service, a paid 3rd party).
- You want to catch "the provider changed and broke us" **without** slow, flaky end-to-end tests against the real provider.
- Microservice boundaries: each side tested independently but kept compatible.

**Not** for: pure in-process logic (unit), or a dependency you *can* run real in CI — use an integration test with Testcontainers instead (see `test-containers.md`).

## Consumer-Driven Contracts (the dominant model — Pact-style)

The **consumer** defines what it needs from the provider as a contract (example request → expected response shape). Two halves:

1. **Consumer test** — runs the consumer against a *mock* provider that replays the contract. Proves the consumer works given that response shape, and **publishes** the contract.
2. **Provider verification** — the *real* provider is replayed the contract's requests and its actual responses are checked against the contract. Proves the provider still satisfies what the consumer needs.

A **broker** (Pact Broker / PactFlow) stores contracts and tracks which consumer/provider versions are compatible (`can-i-deploy`).

```ts
// Consumer side (Pact JS) — declare the interaction, test the client against the mock
provider.addInteraction({
  state: 'customer 42 exists',
  uponReceiving: 'a request for customer 42',
  withRequest: { method: 'GET', path: '/customers/42' },
  willRespondWith: { status: 200, body: { id: 42, email: like('a@b.com') } }, // match shape, not exact value
});
// run your client against provider.mockService.baseUrl; assert it parses the response.
// → writes a pact file the provider must later verify.
```
```ts
// Provider side — replay the published pacts against the REAL provider
await new Verifier({
  provider: 'customers-api',
  pactBrokerUrl: process.env.PACT_BROKER_URL,
  providerBaseUrl: 'http://localhost:8080',
  stateHandlers: { 'customer 42 exists': () => seedCustomer(42) },
}).verifyProvider();
```

## Contract vs integration vs e2e — when each

- **Integration (Testcontainers):** the dependency you *can* run real → test against it.
- **Contract:** the dependency you *can't* run/seed → test the boundary shape on both sides independently.
- **E2E:** a few critical journeys end-to-end (slow; keep lean — see `e2e-tiering.md`).

Contract testing replaces the temptation to mock the 3rd party in an integration test and call it covered — a mock proves nothing about the *real* provider; a **verified contract** does.

## Schema/spec-based alternative

When both sides share a spec (REST/gRPC/events) and you control them, schema-driven checks — OpenAPI/AsyncAPI validation, JSON Schema, protobuf backward-compat, Spring Cloud Contract — are a lighter alternative to full consumer-driven contracts.

## Anti-patterns

- Mocking a 3rd party in an integration test and believing it's covered (the mock can drift from reality; a verified contract can't).
- Asserting the **full** response (brittle) — assert only the fields the consumer uses (Pact matchers: `like`, `eachLike`, `term`).
- Publishing a consumer pact but never running **provider verification** (the pact alone proves nothing about the provider).
- Using contract tests where a real integration test (Testcontainers) would be cheaper and stronger.

*Sources: pact.io (consumer-driven contracts, broker, can-i-deploy); Fowler "ContractTest" / "IntegrationContractTest"; Spring Cloud Contract; OpenAPI/AsyncAPI schema validation.*
