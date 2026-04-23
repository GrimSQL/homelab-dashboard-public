// Stub for the `server-only` package used in unit tests. The real package
// throws at import time when bundled for a client component; in vitest we
// want the modules under test to import freely.
export {};
