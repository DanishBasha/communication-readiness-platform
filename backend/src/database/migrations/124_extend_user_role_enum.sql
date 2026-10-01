-- Add SUPER_ADMIN and PLATFORM_OWNER to identity.user_role enum
-- These roles are mock-only in the frontend until invite activation is implemented.
ALTER TYPE identity.user_role ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
ALTER TYPE identity.user_role ADD VALUE IF NOT EXISTS 'PLATFORM_OWNER';
