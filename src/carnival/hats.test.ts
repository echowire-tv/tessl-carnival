import { describe, expect, it } from 'vitest';
import { createHatShop, HATS } from './hats';
import { createTicketWallet } from './tickets';

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  };
}

function shopWith(tickets: number, storage = memoryStorage()) {
  const wallet = createTicketWallet(memoryStorage());
  wallet.earnTickets(tickets);
  return { wallet, shop: createHatShop(storage, wallet) };
}

describe('hat catalogue', () => {
  it('sells a propeller beanie, a top hat and an alien mask', () => {
    expect(HATS.map((hat) => [hat.name, hat.price])).toEqual([
      ['Propeller beanie', 3],
      ['Top hat', 5],
      ['Alien mask', 8],
    ]);
  });
});

describe('hat shop', () => {
  it('starts with no hats and none worn', () => {
    const { shop } = shopWith(0);
    expect(shop.ownedHats()).toEqual([]);
    expect(shop.wornHat()).toBeUndefined();
  });

  it('buys a hat by spending its price', () => {
    const { wallet, shop } = shopWith(10);
    expect(shop.buyHat('top-hat')).toBe(true);
    expect(wallet.ticketBalance()).toBe(5);
    expect(shop.ownsHat('top-hat')).toBe(true);
  });

  it('refuses a hat the player cannot afford and spends nothing', () => {
    const { wallet, shop } = shopWith(7);
    expect(shop.buyHat('alien-mask')).toBe(false);
    expect(wallet.ticketBalance()).toBe(7);
    expect(shop.ownsHat('alien-mask')).toBe(false);
  });

  it('never sells the same hat twice', () => {
    const { wallet, shop } = shopWith(10);
    shop.buyHat('propeller-beanie');
    expect(shop.buyHat('propeller-beanie')).toBe(false);
    expect(wallet.ticketBalance()).toBe(7);
  });

  it('wears an owned hat, one at a time', () => {
    const { shop } = shopWith(8);
    shop.buyHat('propeller-beanie');
    shop.buyHat('top-hat');
    expect(shop.wearHat('propeller-beanie')).toBe(true);
    expect(shop.wornHat()).toBe('propeller-beanie');
    expect(shop.wearHat('top-hat')).toBe(true);
    expect(shop.wornHat()).toBe('top-hat');
  });

  it('will not wear a hat the player does not own', () => {
    const { shop } = shopWith(0);
    expect(shop.wearHat('top-hat')).toBe(false);
    expect(shop.wornHat()).toBeUndefined();
  });

  it('takes off the worn hat and keeps it', () => {
    const { shop } = shopWith(3);
    shop.buyHat('propeller-beanie');
    shop.wearHat('propeller-beanie');
    shop.takeOffHat();
    expect(shop.wornHat()).toBeUndefined();
    expect(shop.ownsHat('propeller-beanie')).toBe(true);
  });

  it('keeps owned hats and the worn hat across page loads', () => {
    const storage = memoryStorage();
    const { shop } = shopWith(8, storage);
    shop.buyHat('alien-mask');
    shop.wearHat('alien-mask');
    const reloaded = createHatShop(storage, createTicketWallet(memoryStorage()));
    expect(reloaded.ownedHats()).toEqual(['alien-mask']);
    expect(reloaded.wornHat()).toBe('alien-mask');
  });

  it('survives corrupt storage', () => {
    const storage = memoryStorage();
    storage.setItem('tessl-carnival:hats', 'not json');
    const { shop } = shopWith(3, storage);
    expect(shop.ownedHats()).toEqual([]);
    expect(shop.buyHat('propeller-beanie')).toBe(true);
  });

  it('keeps working when storage refuses a write', () => {
    const { shop } = shopWith(3, {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    });
    expect(shop.buyHat('propeller-beanie')).toBe(true);
    expect(shop.ownsHat('propeller-beanie')).toBe(true);
  });
});
