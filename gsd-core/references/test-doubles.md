# Test Doubles — Which Kind, Where, and What to Assert

How-to reference for choosing the right *kind* of test double — dummy, stub, spy, mock, fake — and the narrow set of seams where any double is allowed at all. Read when a test needs a stand-in for a collaborator. Pairs with `test-strategy.md` (its "mock ONLY at architectural boundaries" rule answers *where*; this file answers *what kind* and *what to assert*) and `contract-testing.md`.

## The taxonomy (Meszaros / Fowler)

| Kind | What it is | Reach for it when | What you may assert |
|---|---|---|---|
| **Dummy** | A placeholder passed only to satisfy a signature; never exercised | a constructor demands a logger/metrics object the tested path never touches | nothing — if you're asserting on it, it isn't a dummy |
| **Stub** | Canned answers to **queries**; no logic, no expectations | the test needs a specific input state ("the gateway returns 503", "the user lookup yields an admin") | **never assert ON a stub** — it feeds the test; it is not the subject |
| **Spy** | Records the calls it receives (often a stub that also records) | verifying an outbound **notification** happened: email sent, event published, webhook fired | the recorded outbound call + its key payload fields, once |
| **Mock** | Pre-programmed with expectations; fails the test itself when they're violated | same role as a spy, framework-flavored — keep rare; a spy + explicit assert reads better | outbound **commands** only |
| **Fake** | A real, working, lightweight implementation — in-memory repo, local queue, fake clock | standing in for a **port** in sociable core tests (the default — see below) | normal state/outcome assertions; the fake *behaves*, so test it like the real thing |

Two camps, one rule — Khorikov's CQS discipline:

- **Queries** (return data, no external side effect) → **stub** them, and assert on the SUT's *output or state*, never on whether/how the stub was called.
- **Commands** (side effects on the outside world) → **spy/mock** them; "the email was sent with this recipient" *is* the observable behavior, so interaction-verifying it is correct.

Interaction-verifying a query is the classic brittle-test generator: the test re-states the implementation's call sequence and breaks on every refactor while the behavior is unchanged. State/outcome verification survives refactoring; that is the whole point of behavior-over-implementation.

## Fake-at-ports — the default for a hexagonal/ports core

"Unit-test the core" does not mean per-test `jest.mock` walls. For sociable tests of an application core, prefer **one in-memory fake per driven port**:

1. The fake lives in test support and is reused by every test — not redefined inline per file.
2. It implements the port *honestly* (stores and retrieves, rejects duplicates, honors ordering) so tests assert **outcomes** ("the vehicle is now retrievable"), not interactions ("`save` was called").
3. **Verify the fake against the real adapter's contract:** write one shared contract suite and run it against *both* the fake and the real (Testcontainers-backed) adapter. A fake nobody verifies drifts from production behavior, and every core test quietly tests fiction.

```ts
// ports/vehicle-repo.ts — the port the core depends on
export interface VehicleRepo {
  save(v: Vehicle): Promise<void>;
  findById(id: string): Promise<Vehicle | null>;
}

// test/support/fake-vehicle-repo.ts — honest in-memory fake
export class FakeVehicleRepo implements VehicleRepo {
  private rows = new Map<string, Vehicle>();
  async save(v: Vehicle) { this.rows.set(v.id, structuredClone(v)); }
  async findById(id: string) { return this.rows.get(id) ?? null; }
}

// test/support/vehicle-repo.contract.ts — ONE suite, run against BOTH impls
export function vehicleRepoContract(make: () => Promise<VehicleRepo>) {
  it('round-trips a saved vehicle', async () => {
    const repo = await make();
    await repo.save(vehicle({ id: 'v1', plate: 'ABC-123' }));
    expect(await repo.findById('v1')).toMatchObject({ plate: 'ABC-123' });
  });
  it('returns null for an unknown id', async () => {
    expect(await (await make()).findById('nope')).toBeNull();
  });
}
// fake-vehicle-repo.test.ts:       vehicleRepoContract(async () => new FakeVehicleRepo());
// pg-vehicle-repo.medium.test.ts:  vehicleRepoContract(async () => pgRepo(await getDb()));
```

Core tests then take the fake and assert state — `expect(await repo.findById('v1'))…` — and you can refactor the core's internals freely; nothing in the tests names them. Pure domain functions need no doubles at all; the fake enters only where the application core meets its ports.

## The mockable-seam allow-list

Doubles are legal ONLY at **unmanaged out-of-process dependencies** — systems another party owns or observes: 3rd-party APIs, payment gateways, email/SMS providers, a partner's message bus. Everything else:

- **Your own DB / cache / filesystem (managed dependencies):** run them **real** (`test-containers.md`, `db-test-isolation.md`) — never mocked, including "for speed" (txn-rollback against a singleton container is in-memory fast).
- **In-process collaborators:** never doubled — sociable tests use the real object.
- **Ports of your core:** in-memory **fakes**, contract-verified as above.

TEST-STRATEGY.md's per-subdomain table doubles as the project's seam **allow-list**: if a seam isn't declared there, a double on it is a review-blocking smell, not a style choice.

## Choosing in five seconds

1. Collaborator is in-process? → no double; sociable test.
2. It's your DB/cache/fs? → real instance via Testcontainers.
3. It's a port of the core? → in-memory **fake**, contract-verified.
4. The test needs a canned *answer* from an unmanaged dependency? → **stub**; assert on the SUT, not the stub.
5. The behavior under test *is* an outbound command/notification to an unmanaged dependency? → **spy** (or mock); assert the call once, with its discriminating payload fields.

## Anti-patterns

- `jest.mock('../service')` on an in-process collaborator — solitary/mockist tests; brittle, refactor-hostile.
- Asserting a stub was called / called-with — interaction-verifying a query restates the implementation.
- A fake that is never contract-verified against the real adapter (the fake drifts; tests stay green; prod breaks).
- **Testing the mock:** configuring a double, then asserting the double's own canned behavior back at it.
- Mocking the DB or repositories "so tests are fast" — see `db-test-isolation.md` for the fast *real* path.
- Mixing kinds blindly because the framework calls everything `mock` — name the role (stub? spy? fake?) before writing it.

*Sources: Meszaros "xUnit Test Patterns" (the taxonomy); Fowler "Mocks Aren't Stubs" / TestDouble bliki; Khorikov "Unit Testing Principles, Practices, and Patterns" (CQS rule, managed vs unmanaged dependencies); "Software Engineering at Google" ch. 13 (prefer real implementations and fakes over mocking).*
