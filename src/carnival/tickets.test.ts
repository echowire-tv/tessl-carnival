import { describe, expect, it } from 'vitest';
import { createScoreBoard } from './scores';
import { createTicketWallet, ticketsForScore } from './tickets';

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  };
}

describe('ticket wallet', () => {
  it('starts empty', () => {
    expect(createTicketWallet(memoryStorage()).ticketBalance()).toBe(0);
  });

  it('adds up earned tickets', () => {
    const wallet = createTicketWallet(memoryStorage());
    wallet.earnTickets(2);
    wallet.earnTickets(3);
    expect(wallet.ticketBalance()).toBe(5);
  });

  it('keeps the balance in storage across page loads', () => {
    const storage = memoryStorage();
    createTicketWallet(storage).earnTickets(4);
    expect(createTicketWallet(storage).ticketBalance()).toBe(4);
  });

  it('spends tickets it has', () => {
    const wallet = createTicketWallet(memoryStorage());
    wallet.earnTickets(5);
    expect(wallet.spendTickets(3)).toBe(true);
    expect(wallet.ticketBalance()).toBe(2);
    expect(wallet.spendTickets(2)).toBe(true);
    expect(wallet.ticketBalance()).toBe(0);
  });

  it('refuses an overdraft and spends nothing', () => {
    const wallet = createTicketWallet(memoryStorage());
    wallet.earnTickets(2);
    expect(wallet.spendTickets(3)).toBe(false);
    expect(wallet.ticketBalance()).toBe(2);
  });

  it('survives corrupt storage', () => {
    const storage = memoryStorage();
    storage.setItem('tessl-carnival:tickets', 'not a number');
    const wallet = createTicketWallet(storage);
    expect(wallet.ticketBalance()).toBe(0);
    wallet.earnTickets(1);
    expect(wallet.ticketBalance()).toBe(1);
  });

  it('keeps working when storage refuses a write', () => {
    const wallet = createTicketWallet({
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    });
    expect(() => wallet.earnTickets(3)).not.toThrow();
    expect(wallet.ticketBalance()).toBe(3);
  });

  it('keeps working when storage refuses a read', () => {
    const wallet = createTicketWallet({
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {},
    });
    expect(wallet.ticketBalance()).toBe(0);
    expect(wallet.earnTickets(0)).toBe(0);
    expect(wallet.earnTickets(5)).toBe(5);
    expect(wallet.spendTickets(2)).toBe(true);
    expect(wallet.spendTickets(4)).toBe(false);
    expect(wallet.ticketBalance()).toBe(3);
  });

  it('rejects negative and fractional counts', () => {
    const wallet = createTicketWallet(memoryStorage());
    expect(() => wallet.earnTickets(-1)).toThrow();
    expect(() => wallet.earnTickets(1.5)).toThrow();
    expect(() => wallet.spendTickets(-1)).toThrow();
  });
});

describe('tickets for a score', () => {
  it('gives one ticket per full 100 points, rounded down', () => {
    expect(ticketsForScore(0)).toBe(0);
    expect(ticketsForScore(99)).toBe(0);
    expect(ticketsForScore(100)).toBe(1);
    expect(ticketsForScore(250)).toBe(2);
    expect(ticketsForScore(1999)).toBe(19);
  });
});

describe('recording a score', () => {
  it('earns floor(score / 100) tickets for every round, across games', () => {
    const wallet = createTicketWallet(memoryStorage());
    const board = createScoreBoard(memoryStorage(), () => 0, wallet);
    board.record('water-cannon', 250);
    expect(wallet.ticketBalance()).toBe(2);
    board.record('ring-toss', 99);
    expect(wallet.ticketBalance()).toBe(2);
    board.record('ring-toss', 1000);
    expect(wallet.ticketBalance()).toBe(12);
  });
});
