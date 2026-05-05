# Security Specification for ChitManager Pro

## Data Invariants
1. A Member must have a valid name and email.
2. A Group must have a positive total value, slots, and months.
3. An Auction must belong to an existing group.
4. An Auction's winning bid cannot exceed the total chit value of the group.
5. dividendPerSlot must equal winningBid / totalSlots.
6. Only the admin (chaitu2513@gmail.com) can write data.

## The Dirty Dozen Payloads (Rejection Tests)
1. **Anon Write**: Attempt to create a member without being signed in.
2. **Non-Admin Write**: Authenticated user (not chaitu2513@gmail.com) trying to create a group.
3. **Invalid Email**: Creating a member with an invalid email format.
4. **Negative Value**: Creating a group with `totalChitValue: -100`.
5. **Zero Slots**: Creating a group with `totalSlots: 0`.
6. **Future Start Date Junk**: Injecting a massive string as a startDate.
7. **Phantom GroupMember**: Creating a mapping for a member ID that doesn't exist.
8. **Invalid Dividend**: Creating an auction where `dividendPerSlot` is not `winningBid / totalSlots`.
9. **Auction Overbid**: `winningBid` > `totalChitValue`.
10. **Duplicate Auction**: Creating an auction for a month that already has one (handled by app logic primarily, but rules can check).
11. **Shadow Update**: Adding `isVerified: true` to a member profile via update.
12. **Status Bypass**: Manually changing group status to 'completed' without fulfilling months.

## Test Runner (Draft)
```typescript
// firestore.rules.test.ts (Conceptual)
// ... test cases for each dirty dozen ...
```
