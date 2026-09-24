# TypeScript Rules

## Type Safety

- Enable `strict: true` in tsconfig — never disable it
- Avoid `any` — use `unknown` and narrow with type guards
- Prefer `interface` for object shapes, `type` for unions/intersections
- Use `as const` for literal types instead of type assertions
- Define return types explicitly on exported functions

## Patterns

- Use `satisfies` operator for type-safe object literals
- Prefer discriminated unions over optional fields for state machines
- Use `Readonly<T>` and `ReadonlyArray<T>` for immutable data
- Prefer `Map<K,V>` and `Set<T>` over plain objects for dynamic keys
- Use template literal types for string patterns

## Imports

- Use `import type` for type-only imports (enforced by `verbatimModuleSyntax`)
- Group imports: external → internal → types → styles
- Use path aliases (`@/`) instead of deep relative imports (`../../../`)

## Error Handling

- Throw typed errors: `class AppError extends Error { code: string }`
- Use `Result<T, E>` pattern or `neverthrow` for recoverable errors
- Always handle Promise rejections — no floating promises
- Use `unknown` in catch blocks: `catch (error: unknown)`

## Comments and Docblocks

- JSDoc only on exported API, and only for what the types do not already say.
- No comments on typed params. No `@param {string}` when TypeScript has the type.
- No JSDoc on internal functions. Name them well instead.

Bad:
```ts
/**
 * Formats the price.
 * @param {number} amount - The amount
 * @param {string} currency - The currency
 * @returns {string} The formatted price
 */
export function formatPrice(amount: number, currency: string): string {
```

Good:
```ts
/** Rounds half-up to the currency's minor unit before formatting. */
export function formatPrice(amount: number, currency: string): string {
```

## React (when applicable)

- Use function components with `FC` only when you need `children` type
- Prefer `useState` with explicit generic: `useState<User | null>(null)`
- Memoize expensive computations: `useMemo`, `useCallback` with deps
- Use `useRef<HTMLElement>(null)` for DOM refs with explicit type
- Extract custom hooks for shared stateful logic
