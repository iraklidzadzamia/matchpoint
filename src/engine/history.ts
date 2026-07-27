import { MatchState } from './types';

export class MatchHistoryStack {
  private stack: MatchState[] = [];
  private maxCapacity: number = 150;

  constructor(maxCapacity: number = 150) {
    this.maxCapacity = maxCapacity;
  }

  push(state: MatchState): void {
    // Deep clone to prevent mutating past states
    const clone: MatchState = JSON.parse(JSON.stringify(state));
    this.stack.push(clone);
    if (this.stack.length > this.maxCapacity) {
      this.stack.shift();
    }
  }

  pop(): MatchState | null {
    if (this.stack.length === 0) return null;
    return this.stack.pop() || null;
  }

  peek(): MatchState | null {
    if (this.stack.length === 0) return null;
    return this.stack[this.stack.length - 1];
  }

  canUndo(): boolean {
    return this.stack.length > 0;
  }

  clear(): void {
    this.stack = [];
  }

  getAll(): MatchState[] {
    return this.stack;
  }

  restore(states: MatchState[]): void {
    this.stack = states.slice(-this.maxCapacity);
  }
}
