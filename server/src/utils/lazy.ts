
export class Lazy<A> {
  public constructor(
    private f: () => A
  ) {}

  private value: A;
  private defined = false;

  public get get(): A {
    if (this.defined) return this.value;

    this.value = this.f();
    this.f = null;
    this.defined = true;
    return this.value;
  }
}