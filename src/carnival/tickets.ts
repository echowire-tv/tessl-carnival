type TicketStorage = Pick<Storage, 'getItem' | 'setItem'>;

const STORAGE_KEY = 'tessl-carnival:tickets';
const POINTS_PER_TICKET = 100;

function memoryStorage(): TicketStorage {
  const memory = new Map<string, string>();
  return {
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, value) => void memory.set(key, value),
  };
}

/** One ticket for each full 100 points, rounded down. */
export function ticketsForScore(score: number): number {
  return Math.max(0, Math.floor(score / POINTS_PER_TICKET));
}

function checkCount(n: number) {
  if (!Number.isInteger(n) || n < 0) {
    throw new Error(`Tickets must be a non-negative whole number, got ${n}`);
  }
}

export function createTicketWallet(storage: TicketStorage) {
  let store = storage;

  function ticketBalance(): number {
    const parsed = Number(store.getItem(STORAGE_KEY) ?? 0);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
  }

  function save(balance: number) {
    const value = String(balance);
    try {
      store.setItem(STORAGE_KEY, value);
    } catch {
      // Storage can refuse a write, for example when it's full or blocked.
      // Keep tickets for this page load only.
      store = memoryStorage();
      store.setItem(STORAGE_KEY, value);
    }
  }

  function earnTickets(n: number): number {
    checkCount(n);
    const balance = ticketBalance() + n;
    if (n > 0) save(balance);
    return balance;
  }

  /** Spends `n` tickets, or returns false and spends nothing when the balance is too low. */
  function spendTickets(n: number): boolean {
    checkCount(n);
    const balance = ticketBalance();
    if (n > balance) return false;
    if (n > 0) save(balance - n);
    return true;
  }

  return { ticketBalance, earnTickets, spendTickets };
}

export type TicketWallet = ReturnType<typeof createTicketWallet>;

function browserStorage(): TicketStorage {
  try {
    return window.localStorage;
  } catch {
    // Private windows and test runs: keep tickets for this page load only.
    return memoryStorage();
  }
}

export const wallet = createTicketWallet(browserStorage());

export const ticketBalance = wallet.ticketBalance;
export const earnTickets = wallet.earnTickets;
export const spendTickets = wallet.spendTickets;
