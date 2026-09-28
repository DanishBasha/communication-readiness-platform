# Student Import Format

> **Endpoint:** `POST /api/admin/students/import`
> **Authorization:** `PROGRAM_ADMIN` (Bearer token required)
> **Content-Type:** `multipart/form-data`

This document defines the accepted CSV format for bulk student import.

---

## File Requirements

| Property | Value |
|----------|-------|
| Field name (form) | `file` |
| File type | `.csv` (text/csv or text/plain) |
| Encoding | UTF-8 |
| Max size | Controlled by `UPLOAD_MAX_FILE_SIZE_MB` env var (default: 5 MB) |
| Header row | Required (first non-empty row) |

---

## Column Specification

### Required Columns

| Column name | Description | Validation |
|-------------|-------------|------------|
| `name` | Student full name | Non-empty string |
| `email` | Email address (case-insensitive; stored lowercase) | Valid email format; used as unique identity key |
| `password` | Temporary password | Minimum 8 characters; hashed with bcrypt immediately; **never logged, never returned** |
| `program` | Training program name (e.g. `PEP`, `HOPE`) | Non-empty; looked up case-insensitively; created if not found |

### Optional Columns

| Column name | Aliases accepted | Description |
|-------------|-----------------|-------------|
| `sub_program` | `subprogram`, `sub-program`, `specialization` | Sub-program / specialization name (e.g. `Full Stack`, `Cyber`, `AI`); leave blank if no sub-program |
| `roll_number` | `rollnumber` | Student roll number; auto-generated as `IMP-XXXXXX` if omitted |

Column names are **case-insensitive** and leading/trailing whitespace is stripped.

---

## Example Template

```csv
name,email,password,program,sub_program
Arun Kumar,arun.kumar@example.com,TempPass123!,PEP,Full Stack
Bala Murugan,bala.m@example.com,TempPass456!,PEP,Cyber
Charan S,charan.s@example.com,TempPass789!,PEP,AI
David M,david.m@example.com,TempPass321!,HOPE,
```

---

## Optional Form Fields

| Field | Description |
|-------|-------------|
| `institution_id` | UUID of the institution to associate new programs with. If omitted, the first institution in the database is used. Required only in multi-institution deployments. |

---

## Program / Sub-Program Resolution

1. Program is looked up by name (case-insensitive) within the resolved institution.
2. If not found, the program is **created automatically** with:
   - `name` = value from CSV column
   - `code` = auto-derived: uppercased, spaces → underscores, non-alphanumeric stripped (e.g. `PEP` → `PEP`, `Full Stack` → `FULL_STACK`)
3. If `sub_program` is provided, the same lookup/create logic applies under the resolved program.
4. A default **IMPORT batch** (`track = 'IMPORT'`) is created per program to satisfy the internal `batch_id NOT NULL` constraint. This batch is reused across imports.

---

## Duplicate Handling

| Scenario | Behavior |
|----------|----------|
| Email already exists, same program+sub-program | Reported as `already_enrolled`; no changes made |
| Email already exists, different sub-program | Sub-program association is **updated**; reported as `updated` |
| Email already exists, not in this program | New `student_programs` row added; reported as `updated` |
| Same email appears twice in the same file | First occurrence is processed; second is **skipped** and reported in `errors` |
| Invalid row (missing required fields, bad email) | Row **fails** and is reported in `errors`; other rows continue |

---

## Password Security

- Passwords are read from CSV, immediately hashed with `bcrypt` (10 rounds), and discarded.
- The plaintext password is **never**:
  - Stored in any variable beyond the hashing call
  - Logged to console or any log system
  - Returned in any API response
  - Written to any database column
- The CSV file itself is held in memory only for the duration of the request.

---

## Import Summary Response

```json
{
  "status": "success",
  "data": {
    "summary": {
      "total_rows": 4,
      "successful": 4,
      "failed": 0,
      "skipped": 0,
      "created_students": 3,
      "updated_students": 1,
      "already_enrolled": 0,
      "created_programs": 0,
      "created_sub_programs": 0,
      "errors": []
    }
  }
}
```

| Field | Meaning |
|-------|---------|
| `total_rows` | Number of data rows in file (excludes header) |
| `successful` | Rows processed without error |
| `failed` | Rows that threw an error (details in `errors`) |
| `skipped` | Rows skipped due to in-file duplicate email |
| `created_students` | New `identity.users` + `org.students` records created |
| `updated_students` | Existing students with updated program/sub-program association |
| `already_enrolled` | Existing students already in the same program+sub-program (no change) |
| `created_programs` | New `org.programs` rows auto-created |
| `created_sub_programs` | New `org.sub_programs` rows auto-created |
| `errors` | Array of `{ row, email, reason }` for failed/skipped rows |

---

## Error Handling

Each row is processed in its own database transaction. A failure in one row does **not** affect other rows.

Common error reasons:

| Reason | Fix |
|--------|-----|
| `name is required` | Add a non-empty name column |
| `email is required` | Add an email column |
| `email is invalid` | Check email format |
| `password is required` | Add a password column |
| `password must be at least 8 characters` | Use a longer temporary password |
| `program is required` | Add a program column |
| `duplicate email in file` | Remove duplicate rows; only first occurrence is processed |
| `No institution exists` | Create an institution first, or pass `institution_id` form field |

---

## Transaction Safety

- Programs and sub-programs are created with `ON CONFLICT DO UPDATE` (idempotent).
- If two concurrent imports create the same program simultaneously, one will win via the unique constraint and the other will fetch the existing row. No duplicates are created.
- Row-level transactions mean a 100-row file where row 50 fails will still process rows 1–49 and 51–100.
