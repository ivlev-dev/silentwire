// Общий интерфейс хранилища.
export interface Store {
  get(key: string): string;
}
