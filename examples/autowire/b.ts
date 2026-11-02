import { type A } from "./a";

// Класс зависит от A. Конструктор будет преобразован во время сборки.
export class B {
  constructor(private readonly a: A) {}

  async use() {
    return `B(${this.a.value})`;
  }
}
