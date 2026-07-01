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

const teachersCol = collection(db, "teachers");

const normalize = (value) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");

let cachedTeachers = null;
let lastTeachersFetch = 0;
const CACHE_DURATION = 15000; // 15 seconds

export function clearTeachersCache() {
  cachedTeachers = null;
  lastTeachersFetch = 0;
}

export async function listTeachers({ faculty, department } = {}, forceRefresh = false) {
  const now = Date.now();
  if (cachedTeachers && !forceRefresh && (now - lastTeachersFetch < CACHE_DURATION)) {
    console.log("⚡ [listTeachers] Returning cached teachers, saved reads!");
    let result = cachedTeachers;
    if (faculty) {
      const normFaculty = normalize(faculty).toLowerCase();
      result = result.filter(t => normalize(t.faculty).toLowerCase() === normFaculty);
    }
    if (department) {
      const normDept = normalize(department).toLowerCase();
      result = result.filter(t => normalize(t.department).toLowerCase() === normDept);
    }
    return result;
  }
  
  const snap = await getDocs(teachersCol);
  cachedTeachers = snap.docs.map((d) => ({ ...d.data(), unid: Number(d.id) || d.data().unid }));
  lastTeachersFetch = now;
  
  let result = cachedTeachers;
  if (faculty) {
    const normFaculty = normalize(faculty).toLowerCase();
    result = result.filter(t => normalize(t.faculty).toLowerCase() === normFaculty);
  }
  if (department) {
    const normDept = normalize(department).toLowerCase();
    result = result.filter(t => normalize(t.department).toLowerCase() === normDept);
  }
  return result;
}

export async function upsertTeacher(teacher) {
  clearTeachersCache();
  const unid = teacher.unid ?? Date.now();
  const payload = {
    unid,
    ID: normalize(teacher.ID),
    name: normalize(teacher.name),
    faculty: normalize(teacher.faculty),
    department: normalize(teacher.department),
  };

  await setDoc(doc(teachersCol, String(unid)), payload, { merge: true });
  await logAction("upsert_teacher", `Teacher ${payload.name} updated/created`);
  return unid;
}

export async function deleteTeacher(unid) {
  clearTeachersCache();
  await deleteDoc(doc(teachersCol, String(unid)));
  await logAction("delete_teacher", `Teacher ID ${unid} deleted`);
}

export async function listFaculties(forceRefresh = false) {
  const teachers = await listTeachers({}, forceRefresh);
  const set = new Set();
  teachers.forEach((t) => {
    const faculty = normalize(t.faculty);
    if (faculty) set.add(faculty);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export async function listDepartments(faculty, forceRefresh = false) {
  if (!faculty) return [];
  const teachers = await listTeachers({ faculty }, forceRefresh);
  const set = new Set();
  teachers.forEach((t) => {
    const department = normalize(t.department);
    if (department) set.add(department);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}
