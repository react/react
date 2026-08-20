/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// An immutable stack data structure supporting O(1) push/pop operations.
export type Stack<T> = Node<T> | Empty<T>;

// Static assertion that Stack<T> is a StackInterface<T>
function _assertStackInterface<T>(stack: Stack<T>): void {
  let _: StackInterface<T> = stack;
}

/*
 * Internal interface to enforce consistent behavior btw Node/Empty variants
 * Note that we export a union rather than the interface so that it is impossible
 * to create additional variants: a Stack should always be exactly a Node or Empty
 * instance.
 */
interface StackInterface<T> {
  push(value: T): StackInterface<T>;

  pop(): StackInterface<T>;

  contains(value: T): boolean;
  find(fn: (value: T) => boolean): boolean;

  each(fn: (value: T) => void): void;

  get value(): T | null;

  print(fn: (node: T) => string): string;
}

export function create<T>(value: T): Stack<T> {
  return new Node(value);
}

export function empty<T>(): Stack<T> {
  return EMPTY as any;
}

class Node<T> implements StackInterface<T> {
  #value: T;
  #next: Stack<T>;

  constructor(value: T, next: Stack<T> = EMPTY as any) {
    this.#value = value;
    this.#next = next;
  }

  push(value: T): Node<T> {
    return new Node(value, this);
  }

  pop(): Stack<T> {
    return this.#next;
  }

  find(fn: (value: T) => boolean): boolean {
    return fn(this.#value) ? true : this.#next.find(fn);
  }

  contains(value: T): boolean {
    return (
      value === this.#value ||
      (this.#next !== null && this.#next.contains(value))
    );
  }
  each(fn: (value: T) => void): void {
    fn(this.#value);
    this.#next.each(fn);
  }

  get value(): T {
    return this.#value;
  }

  print(fn: (node: T) => string): string {
    return fn(this.#value) + this.#next.print(fn);
  }
}

class Empty<T> implements StackInterface<T> {
  push(value: T): Stack<T> {
    return new Node(value as T, this as Stack<T>);
  }
  pop(): Stack<T> {
    return this;
  }

  find(_fn: (value: T) => boolean): boolean {
    return false;
  }
  contains(_value: T): boolean {
    return false;
  }
  each(_fn: (value: T) => void): void {
    return;
  }
  get value(): T | null {
    return null;
  }
  print(_: (node: T) => string): string {
    return '';
  }
}

const EMPTY: Stack<void> = new Empty();
