/**
 * Firebase Firestore operations for timetables
 * This file contains ONLY database read/write operations
 * Business logic is in utils/timetableHelpers.js
 */

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";

import { db } from "../firebaseConfig";
import { logAction } from "./auditLogs";
import { normalize, DEFAULT_DAYS } from "../../utils/dataHelpers";
import {
  generateTimetableId,
  prepareTimetablePayload,
  buildScheduleOccurrences,
  reconstructTimetableFromSchedules,
} from "../../utils/timetableHelpers";
import {
  deleteSchedulesByTimetableId,
  getSchedulesByTimetableId,
  saveSchedules,
} from "./schedules";

const timetablesCol = collection(db, "timetables");

/**
 * Fetches all timetables with optional filters
 */
export async function listTimetables({ faculty, department, semester } = {}) {
  let q = query(timetablesCol, orderBy("updatedAt", "desc"), limit(50));

  const whereClauses = [];
  if (faculty) whereClauses.push(where("faculty", "==", normalize(faculty)));
  if (department) whereClauses.push(where("department", "==", normalize(department)));
  if (semester) whereClauses.push(where("semester", "==", normalize(semester)));

  if (whereClauses.length) {
    q = query(timetablesCol, ...whereClauses, orderBy("updatedAt", "desc"), limit(50));
  }

  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

/**
 * Fetches ALL timetable metadata for the settings panel (no ordering to avoid index issues)
 */
export async function listAllTimetablesMeta() {
  const snap = await getDocs(timetablesCol);
  return snap.docs
    .map((d) => d.data())
    .sort((a, b) => {
      const classCompare = (a.class || "").localeCompare(b.class || "");
      if (classCompare !== 0) return classCompare;
      const branchCompare = (a.branch || "").localeCompare(b.branch || "");
      if (branchCompare !== 0) return branchCompare;
      return Number(a.semester || 0) - Number(b.semester || 0);
    });
}

/**
 * Updates ONLY the metadata fields of a timetable (class, branch, semester, type, days, timeSlots)
 * Does NOT touch the schedules. Handles ID changes (old doc delete + new doc create).
 */
export async function updateTimetableMeta(oldTimetableId, updatedMeta) {
  const newTimetableId = generateTimetableId(updatedMeta);
  const payload = {
    ...updatedMeta,
    unid: newTimetableId,
    timetableId: newTimetableId,
    name: normalize(updatedMeta.name) || `Timetable ${newTimetableId}`,
    updatedAt: serverTimestamp(),
  };

  if (oldTimetableId === newTimetableId) {
    // Same ID: just merge-update
    await setDoc(doc(timetablesCol, newTimetableId), payload, { merge: true });
  } else {
    // ID changed: read old doc, write to new ID, delete old
    const oldRef = doc(timetablesCol, String(oldTimetableId));
    const oldSnap = await getDoc(oldRef);
    const oldData = oldSnap.exists() ? oldSnap.data() : {};
    await setDoc(doc(timetablesCol, newTimetableId), { ...oldData, ...payload });
    await deleteDoc(oldRef);
  }

  await logAction("update_timetable_meta", `Timetable metadata updated: ${newTimetableId}`);
  return newTimetableId;
}

/**
 * Creates a new blank timetable preset (no schedules)
 */
export async function createTimetablePreset(meta) {
  const timetableId = generateTimetableId(meta);
  const existingRef = doc(timetablesCol, timetableId);
  const existingSnap = await getDoc(existingRef);
  if (existingSnap.exists()) {
    throw new Error(`A timetable for ${meta.class} / ${meta.branch} / Sem ${meta.semester} / ${meta.type} already exists.`);
  }
  const payload = {
    unid: timetableId,
    timetableId,
    name: normalize(meta.name) || `Timetable ${timetableId}`,
    class: normalize(meta.class),
    branch: normalize(meta.branch),
    faculty: normalize(meta.faculty || ""),
    department: normalize(meta.department || ""),
    semester: normalize(meta.semester),
    type: normalize(meta.type),
    days: (meta.days?.length ? meta.days : DEFAULT_DAYS).map(normalize),
    timeSlots: (meta.timeSlots ?? []).map(normalize),
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  };
  await setDoc(existingRef, payload);
  await logAction("create_timetable_preset", `Timetable preset created: ${timetableId}`);
  return timetableId;
}


/**
 * Saves a complete timetable with schedules
 */
export async function saveTimetable({
  meta,
  tables,
  days,
  timeSlots,
  batchesByTable,
  batchDataByTable,
}) {
  // Use utility function to generate ID
  const timetableId = generateTimetableId(meta);

  // Use utility function to prepare payload (table names not stored)
  const payload = prepareTimetablePayload(meta, days, timeSlots);

  // Save timetable document
  const timetableRef = doc(timetablesCol, String(timetableId));
  await setDoc(
    timetableRef,
    {
      ...payload,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );

  // NOTE: We no longer delete all schedules first
  // Instead, saveSchedules will intelligently handle updates and new entries
  // This prevents orphaned entries when migrating from no-batch to multi-batch cells

  // Use utility function to build schedule occurrences
  // Tables are derived from batchesByTable keys
  console.log('🔍 Building schedules with:', {
    timetableId,
    tables: Object.keys(batchesByTable || {}),
    batchesByTable,
    batchDataByTable,
    daysCount: payload.days?.length,
    timeSlotsCount: payload.timeSlots?.length
  });
  
  const schedules = buildScheduleOccurrences({
    timetableId,
    meta: payload,
    tables: Object.keys(batchesByTable || {}),
    days: payload.days,
    timeSlots: payload.timeSlots,
    batchesByTable,
    batchDataByTable,
  });

  console.log('📋 Built schedules:', schedules.length, 'occurrences');
  console.log('📋 Sample schedule:', schedules[0]);

  // Save new schedules (intelligently updates existing entries)
  await saveSchedules({ timetableId, schedules });

  await logAction("save_timetable", `Timetable ${timetableId} saved/updated`);

  return timetableId;
}

/**
 * Loads a complete timetable with schedules
 */
export async function loadTimetable(timetableId) {
  const timetableRef = doc(timetablesCol, String(timetableId));
  const metaSnap = await getDoc(timetableRef);
  
  if (!metaSnap.exists()) return null;

  const meta = metaSnap.data();
  const schedules = await getSchedulesByTimetableId(timetableId);

  // Use utility function to reconstruct timetable data
  const { batchesByTable, batchDataByTable } = reconstructTimetableFromSchedules(schedules);

  // Derive table list from schedules instead of storing in meta
  const tableIds = Object.keys(batchesByTable);
  const tables = tableIds.length > 0 ? tableIds : ["Table 1"];

  return {
    meta,
    tables,
    days: meta.days ?? DEFAULT_DAYS,
    timeSlots: meta.timeSlots ?? [],
    batchesByTable,
    batchDataByTable,
  };
}

/**
 * Deletes a timetable and all its schedules
 */
export async function deleteTimetable(timetableId) {
  await deleteSchedulesByTimetableId(timetableId);
  await deleteDoc(doc(timetablesCol, String(timetableId)));
  await logAction("delete_timetable", `Timetable ${timetableId} deleted`);
}
