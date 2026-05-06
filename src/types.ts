import { Timestamp } from 'firebase/firestore';

export interface Member {
  id: string;
  name: string;
  email: string;
  phone?: string;
  createdAt: Timestamp;
}

export interface Group {
  id: string;
  name: string;
  totalChitValue: number;
  totalMonths: number;
  startDate: Timestamp;
  status: 'active' | 'completed';
  totalSlots: number;
  createdAt: Timestamp;
}

export interface GroupMember {
  id: string;
  memberId: string;
  groupId: string;
  slots: number;
  joinedAt: Timestamp;
}

export interface Auction {
  id: string;
  groupId: string;
  monthNumber: number;
  winningBid: number;
  winnerMemberId: string;
  dividendPerSlot: number;
  auctionDate: Timestamp;
  createdAt: Timestamp;
}

export enum UserRole {
  MANAGER = 'manager',
  DISPLAY = 'display'
}

export interface AuthorizedUser {
  id: string;
  email: string;
  role: UserRole;
  addedAt: Timestamp;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}
