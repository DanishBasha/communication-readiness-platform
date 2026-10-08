-- Admin endpoints scope users by identity.users.institution_id, which older rows
-- (seed data, accounts created before it was populated) leave NULL.

-- Students belong to their program's institution.
UPDATE identity.users u
SET institution_id = p.institution_id
FROM org.students s
JOIN org.programs p ON p.id = s.program_id
WHERE s.user_id = u.id AND u.institution_id IS NULL;

-- In a single-institution deployment every remaining non-owner account belongs to it.
UPDATE identity.users
SET institution_id = (SELECT id FROM org.institutions)
WHERE institution_id IS NULL
  AND role <> 'PLATFORM_OWNER'
  AND (SELECT count(*) FROM org.institutions) = 1;
