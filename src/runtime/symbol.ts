export const DI_CREATE = Symbol.for("silentwire:create");
export interface Token<T = unknown> {
  __asyncDiToken: string;
  readonly _type?: T;
}

export function createToken<T = unknown>(description: string): Token<T> {
  return { __asyncDiToken: description } as Token<T>;
}
