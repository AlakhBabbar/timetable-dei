import { collection, addDoc, getDocs, query, orderBy, where, Timestamp } from "firebase/firestore";
import { db, auth } from "../firebaseConfig";

const auditLogsCol = collection(db, "audit_logs");

export const logAction = async (action, details) => {
  try {
    const user = auth.currentUser;
    const userEmail = user ? user.email : "Unknown/System";
    
    await addDoc(auditLogsCol, {
      user: userEmail,
      action,
      details,
      timestamp: Timestamp.now()
    });
  } catch (error) {
    console.error("Error logging action:", error);
  }
};

export const getRecentLogs = async (days = 30) => {
  try {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - days);
    
    const q = query(
      auditLogsCol,
      where("timestamp", ">=", Timestamp.fromDate(pastDate)),
      orderBy("timestamp", "desc")
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate() || new Date()
    }));
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return [];
  }
};
