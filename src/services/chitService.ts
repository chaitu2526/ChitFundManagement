import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  where, 
  Timestamp,
  serverTimestamp,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Member, Group, GroupMember, Auction, OperationType, FirestoreErrorInfo } from '../types';

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const chitService = {
  // Members
  async addMember(data: Omit<Member, 'id' | 'createdAt'>) {
    const path = 'members';
    try {
      return await addDoc(collection(db, path), {
        ...data,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
    }
  },

  async bulkAddMembers(members: Omit<Member, 'id' | 'createdAt'>[]) {
    const path = 'members';
    try {
      const batch = writeBatch(db);
      members.forEach((member) => {
        const newRef = doc(collection(db, path));
        batch.set(newRef, {
          ...member,
          createdAt: serverTimestamp()
        });
      });
      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
    }
  },

  getMembers(callback: (members: Member[]) => void) {
    const path = 'members';
    return onSnapshot(collection(db, path), (snapshot) => {
      const members = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Member));
      callback(members);
    }, (e) => handleFirestoreError(e, OperationType.LIST, path));
  },

  async updateMember(id: string, data: Partial<Omit<Member, 'id' | 'createdAt'>>) {
    const path = 'members';
    try {
      await updateDoc(doc(db, path, id), data);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, path);
    }
  },

  async deleteMember(id: string) {
    const path = 'members';
    try {
      await deleteDoc(doc(db, path, id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  },

  // Groups
  async addGroup(data: Omit<Group, 'id' | 'createdAt' | 'status'>) {
    const path = 'groups';
    try {
      return await addDoc(collection(db, path), {
        ...data,
        status: 'active',
        createdAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
    }
  },

  getGroups(callback: (groups: Group[]) => void) {
    const path = 'groups';
    return onSnapshot(collection(db, path), (snapshot) => {
      const groups = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Group));
      callback(groups);
    }, (e) => handleFirestoreError(e, OperationType.LIST, path));
  },

  // Group Members
  async addGroupMember(data: Omit<GroupMember, 'id' | 'joinedAt'>) {
    const path = 'groupMembers';
    try {
      return await addDoc(collection(db, path), {
        ...data,
        joinedAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
    }
  },

  getGroupMembers(groupId: string, callback: (memberships: GroupMember[]) => void) {
    const path = 'groupMembers';
    const q = query(collection(db, path), where('groupId', '==', groupId));
    return onSnapshot(q, (snapshot) => {
      const memberships = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as GroupMember));
      callback(memberships);
    }, (e) => handleFirestoreError(e, OperationType.LIST, path));
  },

  getMembershipsForMember(memberId: string, callback: (memberships: GroupMember[]) => void) {
    const path = 'groupMembers';
    const q = query(collection(db, path), where('memberId', '==', memberId));
    return onSnapshot(q, (snapshot) => {
      const memberships = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as GroupMember));
      callback(memberships);
    }, (e) => handleFirestoreError(e, OperationType.LIST, path));
  },

  getAllMemberships(callback: (memberships: GroupMember[]) => void) {
    const path = 'groupMembers';
    return onSnapshot(collection(db, path), (snapshot) => {
      const memberships = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as GroupMember));
      callback(memberships);
    }, (e) => handleFirestoreError(e, OperationType.LIST, path));
  },

  async removeGroupMember(id: string) {
    const path = 'groupMembers';
    try {
      await deleteDoc(doc(db, path, id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  },

  // Auctions
  async addAuction(data: Omit<Auction, 'id' | 'createdAt'>) {
    const path = 'auctions';
    try {
      return await addDoc(collection(db, path), {
        ...data,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
    }
  },

  getAuctions(groupId: string, callback: (auctions: Auction[]) => void) {
    const path = 'auctions';
    const q = query(collection(db, path), where('groupId', '==', groupId));
    return onSnapshot(q, (snapshot) => {
      const auctions = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Auction));
      callback(auctions);
    }, (e) => handleFirestoreError(e, OperationType.LIST, path));
  }
};
