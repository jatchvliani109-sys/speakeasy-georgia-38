# SpeakBusy — Support Request Template: Manual Backup or Restore

> Keep this on hand. Copy, fill in the blanks, and send via the Lovable support
> channel **before** any risky migration, or the moment a restore is needed.
> Project reference: SpeakBusy · Lovable Cloud backend
> (Supabase project `hmpwjhzrmfyapijikkuc`).

---

## How to reach support

Send the filled template through the Lovable in-app support / chat, or email
support@lovable.dev, referencing the project name **SpeakBusy** and the Supabase
project ref above.

---

## Option A — Pre-migration manual backup (send *before* the risky change)

```
Subject: SpeakBusy — Request manual DB backup before migration

Hi Lovable team,

I'm about to run a risky schema/data migration on my Lovable Cloud project
and would like a manual backup taken first, so I can restore if it goes wrong.

Project name: SpeakBusy
Supabase project ref: hmpwjhzrmfyapijikkuc

Migration summary:
  - What I'm changing: <one line, e.g. "drop legacy tables; alter business_vocab_progress">
  - When I plan to run it: <UTC date/time>
  - Approx. rows affected: <number, or "unknown">

Could you:
  1. Take a manual snapshot / backup of the database now (or just before
     <UTC time>), and
  2. Confirm back to me that it's saved and restorable.

If point-in-time recovery (PITR) is already enabled on this project, please
tell me the earliest restore point available so I know my safe rollback
window.

Once I have your confirmation, I'll proceed with the migration.

Thanks,
Olegi
```

---

## Option B — Emergency restore (send *after* something went wrong)

```
Subject: URGENT — SpeakBusy — Restore database from backup

Hi Lovable team,

A migration/data change went wrong on my Lovable Cloud project and I need
a restore as soon as possible.

Project name: SpeakBusy
Supabase project ref: hmpwjhzrmfyapijikkuc

What happened:
  - <one or two lines, e.g. "accidentally dropped business_vocab_progress;
    no application code can reach user progress now">

When the problem occurred (UTC):
  - <date/time>

Requested restore point:
  - [ ] Latest available backup
  - [ ] Specific point in time: <UTC date/time>  (only if PITR is available)

Is there a known clean backup we can restore from? Please confirm the
target timestamp before restoring so I can verify it's after the last good
state.

Please also tell me:
  - the expected downtime,
  - whether auth, storage, and edge-function state are included in the
    restore, and
  - anything I need to do on the application side once it's back.

Thanks,
Olegi
```

---

## Fill-in checklist (keep handy)

Before sending, make sure you can answer:

- [ ] Project name: SpeakBusy
- [ ] Supabase project ref: `hmpwjhzrmfyapijikkuc`
- [ ] Exact UTC date/time of the change (or the restore point you want)
- [ ] One-line summary of what changed / what broke
- [ ] Approximate number of affected rows (if known)
- [ ] Whether you've already stopped app writes (for restores — stop writes
      to avoid overwriting the restore point with new bad data)

## Notes for yourself

- Lovable Cloud users do **not** have direct Supabase dashboard access, so
  backups/restores are performed by Lovable support on request — this
  template is the way to ask.
- PITR availability on this project is still unconfirmed. When you next
  contact support, ask them to confirm whether PITR is enabled and, if not,
  to enable it. Add their answer here:

  > PITR status: ____________ (confirmed enabled / not available / pending)

- For a **self-serve data export** (not a full backup, but a safety net for
  row-level data), you can also use the Cloud panel → Advanced settings →
  Export data, or run a `COPY ... TO` query from the Cloud SQL editor before
  the migration.
