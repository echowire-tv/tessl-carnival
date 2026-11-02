import { wallet, type TicketWallet } from './tickets';

type HatStorage = Pick<Storage, 'getItem' | 'setItem'>;

export interface Hat {
  id: string;
  name: string;
  /** The price in tickets. */
  price: number;
}

export const HATS: readonly Hat[] = [
  { id: 'propeller-beanie', name: 'Propeller beanie', price: 3 },
  { id: 'top-hat', name: 'Top hat', price: 5 },
  { id: 'alien-mask', name: 'Alien mask', price: 8 },
];

const STORAGE_KEY = 'tessl-carnival:hats';

interface Wardrobe {
  owned: string[];
  worn?: string;
}

function memoryStorage(): HatStorage {
  const memory = new Map<string, string>();
  return {
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, value) => void memory.set(key, value),
  };
}

const findHat = (id: string) => HATS.find((hat) => hat.id === id);

/** Owned hats and the worn hat, kept in storage. Buying spends tickets from `tickets`. */
export function createHatShop(storage: HatStorage, tickets: Pick<TicketWallet, 'spendTickets'>) {
  let store = storage;

  function load(): Wardrobe {
    let raw: string | null;
    try {
      raw = store.getItem(STORAGE_KEY);
    } catch {
      // Storage can refuse a read. Keep hats for this page load only.
      store = memoryStorage();
      raw = null;
    }
    try {
      const parsed = JSON.parse(raw ?? '{}') as Partial<Wardrobe>;
      const owned = Array.isArray(parsed.owned)
        ? parsed.owned.filter((id) => typeof id === 'string' && findHat(id))
        : [];
      const worn =
        typeof parsed.worn === 'string' && owned.includes(parsed.worn) ? parsed.worn : undefined;
      return { owned, worn };
    } catch {
      return { owned: [] };
    }
  }

  function save(wardrobe: Wardrobe) {
    const value = JSON.stringify(wardrobe);
    try {
      store.setItem(STORAGE_KEY, value);
    } catch {
      // Storage can refuse a write. Keep hats for this page load only.
      store = memoryStorage();
      store.setItem(STORAGE_KEY, value);
    }
  }

  function ownedHats(): string[] {
    return load().owned;
  }

  function ownsHat(id: string): boolean {
    return load().owned.includes(id);
  }

  function wornHat(): string | undefined {
    return load().worn;
  }

  /** Buys a hat, or returns false and spends nothing when it's owned already or too dear. */
  function buyHat(id: string): boolean {
    const hat = findHat(id);
    const wardrobe = load();
    if (!hat || wardrobe.owned.includes(id)) return false;
    if (!tickets.spendTickets(hat.price)) return false;
    save({ ...wardrobe, owned: [...wardrobe.owned, id] });
    return true;
  }

  /** Puts on an owned hat in place of any other. Returns false for a hat the player doesn't own. */
  function wearHat(id: string): boolean {
    const wardrobe = load();
    if (!wardrobe.owned.includes(id)) return false;
    save({ ...wardrobe, worn: id });
    return true;
  }

  function takeOffHat() {
    save({ owned: load().owned });
  }

  return { ownedHats, ownsHat, wornHat, buyHat, wearHat, takeOffHat };
}

export type HatShop = ReturnType<typeof createHatShop>;

function browserStorage(): HatStorage {
  try {
    return window.localStorage;
  } catch {
    // Private windows and test runs: keep hats for this page load only.
    return memoryStorage();
  }
}

export const hatShop = createHatShop(browserStorage(), wallet);
