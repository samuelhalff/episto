# Disaster Recovery and Drills

**Status:** Authoritative operational runbook  
**Scope:** Backup validation, restore rehearsal, recovery proof, and recurring drill rules.  
**See also:** [`deployment-and-ci.md`](deployment-and-ci.md) ·
[`incident-response.md`](incident-response.md) ·
[`pre-launch-checklist.md`](pre-launch-checklist.md)

---

## Core rule

A backup that has never been restored successfully is not a trustworthy recovery path.

Episto must prove recovery through drills, not assumptions.

---

## 1. Recovery surfaces

Recovery planning must account for:

- PostgreSQL data
- object storage for attachments/signatures/renders
- Redis/BullMQ operational state
- runtime configuration and secrets

Each has a different recovery posture. Do not pretend they are interchangeable.

---

## 2. Database recovery

Launch posture from existing operations docs:

- daily automated backups
- monthly manual restore test
- point-in-time recovery if provider support exists

Recovery rule:

- before launch, perform at least one successful restore to a temporary target
- verify schema version and representative row counts
- record the measured recovery result in operational notes

Do not claim an RPO or RTO better than the infrastructure and drill results prove.

---

## 3. Object storage recovery

MVP posture:

- provider-level redundancy is the primary protection
- no cross-provider backup is required for MVP

Operational consequence:

- do not market stronger file-recovery guarantees than the storage path actually provides
- verify that retention cleanup and asset lookups still behave correctly after restore or failover

---

## 4. Redis and queue recovery

Redis/BullMQ recovery must assume some in-flight work may need reconciliation after failure.

Recovery rule:

- queues may be rebuilt from canonical database state where necessary
- no queue is the sole source of truth for payment or dispatch outcomes
- after Redis loss, verify whether pending render, email, or reconciliation work needs to be re-enqueued safely

Do not treat Redis durability as a substitute for canonical backend records.

---

## 5. RTO / RPO rule

Episto should record target recovery values, but only launch with values that are backed by a
real drill or provider capability.

If point-in-time recovery is unavailable:

- do not claim sub-backup-interval RPO

If restore time is not yet measured:

- do not claim an aggressive RTO

Measured reality beats aspirational diagrams.

---

## 6. Drill cadence

Minimum operational cadence:

- monthly database restore rehearsal
- periodic queue recovery check when infrastructure changes materially
- pre-launch proof that backup restore, queue pause/resume, and post-restore verification all work

The cadence may tighten later, but must not be weaker before launch.

---

## 7. Drill checklist

Every recovery drill should record:

- start time
- trigger scenario
- systems involved
- restore source used
- verification checks run
- recovery completion time
- open follow-up issues

If a drill reveals missing documentation, update the docs before closing the follow-up.

---

## 8. Launch gate

Before public launch:

- a database restore test has completed successfully
- recovery verification steps are documented
- Redis/BullMQ recovery posture is understood
- no public claims overstate the actual proven recovery path

If these conditions are not met, operational readiness is incomplete.
