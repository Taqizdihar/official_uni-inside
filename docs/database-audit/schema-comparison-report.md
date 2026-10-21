# Migration 001 schema comparison report

**Decision: NOT VERIFIED.** Reference commit: `5384d558f65d9276069daf25e4b74c4d85c1db89`. Stored Aiven SHA-256, supplied by the administrator: `1af04aa15d82825ff80c3ecc5ba619e1e9f2956e7fa68fb30fedcbcee1119ea2`. Current Git file SHA-256, independently calculated: `cd4f1a594f7fe56f560d0854c389262d19b8014e2d40f0c22f11088a0bc22e99` (67,222 bytes). The stored hash has not been independently extracted in this workspace.

The administrator reports Aiven `defaultdb`, MySQL 8.4.11, InnoDB, 52 expected tables, matching table and column **names**, one `001` history row applied at `2026-10-16 17:04:06.652`, and the documented core and additional seed **counts**. The five existing social account codes are recognized by prepared migration 002; `social_links=5`, `product_purchase_links=0`, and `product_variants=0`. The original SQL dump and DBeaver ZIP from another conversation are **not accessible here**. Their contents have not been inspected or compared.

An isolated local MySQL 8.4.11 database was initialized from the unmodified migration 001. The reference export yielded **52 tables, 515 ordered columns, 229 ordered index parts, 71 ordered FK parts, 53 CHECK constraints**, no views/triggers/routines/events, five roles, 51 permissions, 182 role-permission mappings, and 34 stable configuration keys. The same export SQL succeeded for this local reference. A self-comparison reports MATCH, which validates export parsing and repeatability only. The disposable database was removed after export.

| Property | Production result | Classification |
| --- | --- | --- |
| Table and column names | Administrator reports all expected names | MATCH for names only; underlying export still needed |
| Table types, engines, collations, column definitions/order/defaults | No accessible full export | NOT VERIFIED |
| Primary/unique/other indexes and ordering | No accessible full export | NOT VERIFIED |
| FK columns, names, and update/delete actions | No accessible full export | NOT VERIFIED |
| CHECK expressions and enforcement | No accessible full export | NOT VERIFIED |
| Views, triggers, routines, functions, events | No accessible full export | NOT VERIFIED |
| Role/permission values, mappings, stable keys | Counts reported; values not exported here | NOT VERIFIED |
| Editable CMS content | Deliberately excluded from compatibility decision | BENIGN DIFFERENCE if edited legitimately |

There are **no verified structural differences**, but neither is there evidence that the overall production database lacks significant schema differences. A comment, whitespace, encoding, or line-ending change *could* produce a different checksum without changing database behavior; no exact historical file has been found to demonstrate that this happened. Equally, a constraint, default, index, or seed change could explain the hash. The checksum mismatch remains a genuine readiness/integrity error under the current runner; it must not be dismissed as cosmetic.

To finish the audit, generate `production-schema.csv`, `production-seeds.csv`, and the three history grids named in [README.md](README.md), then run the comparator with reference exports made by the same SQL. Review any difference and preserve the raw evidence and decision securely. Until then, production equivalence, reconciled migration 001, and execution of prepared 002–004 remain pending.
