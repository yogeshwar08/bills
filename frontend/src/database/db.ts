import Dexie, { type Table } from 'dexie';
import { SavedBill } from '../types';

export class BillSnapDatabase extends Dexie {
  bills!: Table<SavedBill, string>;

  constructor() {
    super('BillSnapDB');
    this.version(1).stores({
      bills: 'id, merchantName, date, amount, category, createdAt'
    });
  }
}

export const db = new BillSnapDatabase();

