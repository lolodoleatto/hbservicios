import Dexie from 'dexie'

export const db = new Dexie('hbservicios')

db.version(1).stores({
  products: 'id',
  clients: 'id',
  pendingOrders: '++localId',
})
