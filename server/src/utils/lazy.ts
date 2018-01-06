
export class Lazy<A> {

  private f: (() => A) | null;

  public constructor(
    f: () => A
  ) { this.f = f; }

  private value: A;
  private defined = false;

  public get get(): A {
    if (this.defined || this.f === null) return this.value;

    this.value = this.f();
    this.f = null;
    this.defined = true;
    return this.value;
  }
}