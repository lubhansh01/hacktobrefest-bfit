# Security Specification - Hacktoberfest Dehradun

## Data Invariants
1. **Tracks & Problems**: Publicly readable, modifiable only by Admins.
2. **Timeline**: Publicly readable, modifiable only by Admins.
3. **Rounds**: Publicly readable, modifiable by Admins and Mentors (for active status/order if delegated).
4. **Teams**:
   - Created by authenticated users.
   - Owners can update submissions if not eliminated.
   - Mentors can only see and evaluate teams assigned to them.
   - Admins have full access.
   - Teams can only be "Eliminated" or "Advanced" by Mentors or Admins.
5. **Users**:
   - Profiles are readable by the owner, mentors, and admins.
   - Roles can only be changed by Admins.
6. **Mentors**:
   - Metadata readable by all authenticated users.
   - Managed only by Admins.

## The "Dirty Dozen" Payloads (Denial Tests)
1. **Self-Promotion**: User attempts to create a profile with `role: 'admin'`.
2. **Identity Spoofing**: User attempts to create a team with `creatorUid` of another user.
3. **Ghost Update**: User attempts to update a team adding a field `isVerified: true`.
4. **Outcome Shortcut**: User attempts to set `status: 'approved'` on their own team.
5. **Mentor Scraper**: User attempts to list all teams they are not assigned to (as a mentor).
6. **PII Leak**: Unauthorized user attempts to 'get' a team document they don't own or mentor.
7. **Resource Poisoning**: Admin attempts to set an ID longer than 128 characters or matching invalid regex.
8. **Elimination Bypass**: Eliminated team attempts to update `roundSubmissions`.
9. **Role Escalation**: Mentor attempts to update their own `users` role to `admin`.
10. **Orphaned Team**: Creating a team with a `trackId` that doesn't exist.
11. **Future Timestamp**: Creating a team with a `createdAt` in the future (not `request.time`).
12. **Shadow Field Injection**: Adding `assignedMentorId` during team creation to pick your own mentor.

## Test Runner (Security Rules Verification Plan)
- [x] Verify `lubhanshsharma555@gmail.com` bypasses standard restrictions.
- [x] Verify `isValidId` restricts path pollution.
- [x] Verify `affectedKeys().hasOnly()` blocks shadow field updates.
- [x] Verify `exists()` check prevents orphaned records during creation.
- [x] Verify snapshot listeners for `teams` are restricted to `assignedMentorEmail`.
