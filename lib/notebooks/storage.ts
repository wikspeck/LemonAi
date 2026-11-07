import { Entity, entitySchema, resolveWrite } from "./model";

let connection: Promise<IDBDatabase> | undefined;
function database() {
  return connection ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("lume-notebooks", 1);
    request.onupgradeneeded = () => { request.result.createObjectStore("records", { keyPath: "id" }); request.result.createObjectStore("files"); request.result.createObjectStore("revisions", { keyPath: "revision" }); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => { connection = undefined; reject(request.error); };
    request.onblocked = () => reject(new Error("Close other Lume tabs to upgrade storage."));
  });
}
export async function loadRecords(): Promise<Entity[]> {
  const db = await database();
  return new Promise((resolve, reject) => { const q = db.transaction("records").objectStore("records").getAll(); q.onsuccess = () => { try { resolve(q.result.map(r => entitySchema.parse(r))); } catch (e) { reject(e); } }; q.onerror = () => reject(q.error); });
}
export async function saveRecord(record: Entity, expected?: string, file?: Blob): Promise<Entity> {
  entitySchema.parse(record);
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["records", "revisions", "files"], "readwrite");
    const store = tx.objectStore("records"); const q = store.get(record.id); let saved = record;
    q.onsuccess = () => { saved = resolveWrite(q.result, record, expected); if (q.result) tx.objectStore("revisions").put(q.result); store.put(saved); if (file) tx.objectStore("files").put(file, saved.id); };
    tx.oncomplete = () => resolve(saved); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error ?? new Error("Save aborted"));
  });
}
export async function readFile(id: string): Promise<Blob | undefined> {
  const db = await database(); return new Promise((resolve, reject) => { const q = db.transaction("files").objectStore("files").get(id); q.onsuccess = () => resolve(q.result); q.onerror = () => reject(q.error); });
}
export async function revisions(id: string): Promise<Entity[]> {
  const db = await database(); return new Promise((resolve, reject) => { const q = db.transaction("revisions").objectStore("revisions").getAll(); q.onsuccess = () => resolve(q.result.filter((r: Entity) => r.id === id)); q.onerror = () => reject(q.error); });
}
