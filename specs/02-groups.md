# 02 — Groups

## Topic
Group creation, joining via invite code, and membership management within a prediction market community.

## Acceptance Criteria

- A user can create a new group by providing a group name, becoming the group's administrator and first member
- A unique 8-character alphanumeric invite code is generated for each group
- Any authenticated user can join a group by entering a valid invite code
- A user who joins a group starts with 0 tokens and receives their first allocation on the next distribution cycle
- A user can be a member of multiple groups, each with an independent token balance
- The group admin can update the group name, weekly token amount, and distribution day
- The group admin can regenerate the invite code (invalidating the old one)
- The group admin can remove members from the group (but not themselves)
- Attempting to join a group you're already in returns a clear error
- Attempting to join with an invalid invite code returns a clear error
- The group member roster is visible to all group members

## User Flows

- **Create group:** User clicks "Create Group" → enters name → gets invite code to share → lands on dashboard for new group
- **Join group:** User clicks "Join Group" → enters invite code → joins group → lands on dashboard for joined group
- **Admin settings:** Admin navigates to `/group/settings` → can edit name, token amount, distribution day, regenerate code, remove members
