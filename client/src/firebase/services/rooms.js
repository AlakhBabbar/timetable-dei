import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";

import { db } from "../firebaseConfig";
import { logAction } from "./auditLogs";

const roomsCol = collection(db, "rooms");

const normalize = (value) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");

let cachedRooms = null;
let lastRoomsFetch = 0;
const CACHE_DURATION = 15000; // 15 seconds

export function clearRoomsCache() {
  cachedRooms = null;
  lastRoomsFetch = 0;
}

export async function listRooms({ faculty } = {}, forceRefresh = false) {
  const now = Date.now();
  if (cachedRooms && !forceRefresh && (now - lastRoomsFetch < CACHE_DURATION)) {
    console.log("⚡ [listRooms] Returning cached rooms, saved reads!");
    if (faculty) {
      const normalizedFaculty = normalize(faculty).toLowerCase();
      return cachedRooms.filter(r => normalize(r.faculty).toLowerCase() === normalizedFaculty);
    }
    return cachedRooms;
  }
  
  const snap = await getDocs(roomsCol);
  cachedRooms = snap.docs.map((d) => ({ ...d.data(), unid: Number(d.id) || d.data().unid }));
  lastRoomsFetch = now;
  
  if (faculty) {
    const normalizedFaculty = normalize(faculty).toLowerCase();
    return cachedRooms.filter(r => normalize(r.faculty).toLowerCase() === normalizedFaculty);
  }
  return cachedRooms;
}

export async function upsertRoom(room) {
  clearRoomsCache();
  const unid = room.unid ?? Date.now();
  const payload = {
    unid,
    ID: normalize(room.ID),
    name: normalize(room.name),
    capacity: typeof room.capacity === "number" ? room.capacity : Number(room.capacity) || 0,
    floor: normalize(room.floor),
    faculty: normalize(room.faculty),
    availability: room.availability ?? {
      day: {
        mon: { time: [] },
        tue: { time: [] },
        wed: { time: [] },
        thu: { time: [] },
        fri: { time: [] },
        sat: { time: [] },
      },
    },
  };

  await setDoc(doc(roomsCol, String(unid)), payload, { merge: true });
  await logAction("upsert_room", `Room ${payload.name} updated/created`);
  return unid;
}

export async function deleteRoom(unid) {
  clearRoomsCache();
  await deleteDoc(doc(roomsCol, String(unid)));
  await logAction("delete_room", `Room ID ${unid} deleted`);
}

export async function listFaculties(forceRefresh = false) {
  const rooms = await listRooms({}, forceRefresh);
  const set = new Set();
  rooms.forEach((r) => {
    const faculty = normalize(r.faculty);
    if (faculty) set.add(faculty);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}
