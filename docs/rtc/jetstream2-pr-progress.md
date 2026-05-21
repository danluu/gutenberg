# RTC PR Progress Controller

- updated: 2026-05-21T22:51:59Z
- cycle sleep seconds: 120
- max active PR jobs: 2
- active PR jobs: 0
- active discovery sessions: 17
- min discovery sessions: 3
- discovery protected: no
- resource reason: headroom
- latest persona run: /media/volume/danluu-fuzz-data/rtc-pr-progress-controller-20260518/persona-runs/20260521T224338Z

## Current Decisions
action                  target                                                                                                priority  allowed  reason
launch-branch-repair    benchmark-canary-fuzzer-gap/exact-stack-focused-http-replay                                           P0        yes      Next product-progress slot; run artifact-complete title-reload-http and existing-post-crdt-http on exact stack commit 14767c60a7ef5295366fd8a1f31a64d610acdf80.
update-controller-rule  benchmark-canary-fuzzer-gap/exact-stack-closure                                                       P0        yes      Require fresh passing exact-stack title-reload-http and existing-post-crdt-http before coverage-confidence or snapshot-publication unblocks.
update-controller-rule  benchmark-canary-fuzzer-gap/canary-equivalent-success-accounting                                      P0        yes      Semantic-feature churn or forced group presence does not clear the blocker without successful title-reload-http existing-post-crdt-http and large-http-lifecycle rows.
update-controller-rule  large-http-lifecycle/benchmark-minimum                                                                P0        yes      Keep large-post-three-user-http or equivalent large-document HTTP convergence current before maintainer snapshot promotion.
publish-ready           maintainer-snapshot/all-merged-192647-latest-crdt-rich-text                                           P0        no       Snapshot remains blocked until focused title reload existing-post CRDT persistence and large HTTP lifecycle gates are green on the exact stack.
repair-ready            rtc-pr-stack-20260520T193645Z-all-merged-192647-latest-crdt-rich-text                                 P0        no       Current exact-stack benchmark evidence still has focused title reload and persistence reload failures.
cooldown-diagnostic     benchmark-canary-fuzzer-gap/zero-byte-or-setup-only-artifacts                                         P0        yes      Repeated zero-byte and setup-only continuations are non-progress; keep one artifact-complete exact-stack closure lane.
update-controller-rule  lower-http-polling/canary-oracle-retarget                                                             P0        yes      Retarget one lower-level HTTP lane to canary-derived title-body reload and persisted-CRDT reload oracles while preserving lower-level discovery.
update-controller-rule  operator-correctness-regression/exact-coverage-gates                                                  P0        yes      Replace broad re-analysis with exact promotion gates for large-post final saved-content union and list-item move-refresh ordering.
cooldown-diagnostic     reload-hydration;pre-save-search-live-collapse;rich-text-suffix-corruption/generic-interval-relaunch  P0        yes      Over-budget deferred families need a new fix head owner evidence exact-stack green evidence or explicit downscope before more generic launches.
update-controller-rule  deferred-family-budget-hard-gate                                                                      P0        yes      Block over-budget generic relaunches unless they provide new product fix heads owner evidence exact-stack promotion evidence or explicit downscope.
update-controller-rule  reload-hydration/exact-stack-promotion-gate                                                           P0        yes      Only keep or promote reload candidates with exact-stack title-reload-http and existing-post-crdt-http green plus retained large-http-lifecycle coverage.
repair-ready            reload-hydration/exact-stack-candidate                                                                P0        no       Candidate activity exists but exact-stack title reload and existing-post CRDT persistence gates are not green.
consume-owner-evidence  PR07C/HOLD-07C                                                                                        P0        yes      Cycle380 owner replay is current evidence; reconcile it before slot assignment instead of relaunching a heavy browser matrix.
launch-owner-matrix     PR07C/HOLD-07C                                                                                        P0        no       Cycle380 owner replay is already consumed current evidence; relaunch only with newer product-owned owner evidence.
update-controller-rule  PR07C/HOLD-07C-owner-evidence-consumption                                                             P0        yes      Consume current owner evidence before slot assignment and keep PR07C held until newer conclusive product-owned evidence appears.
publish-ready           ready/rtc-pr07c-reload-record-snapshots                                                               P0        no       Held until newer conclusive product-owned evidence exists and exact-stack focused HTTP promotion gates are green.
publish-ready           ready/rtc-pr06b-malformed-save-request-payload                                                        P1        no       Canonical ready/rtc-pr06b-malformed-save-request-payload-minimal is already published; full branch needs fresh product advantage.
publish-ready           ready/rtc-pr15a-fallback-group-move-green                                                             P1        no       PR14B-based PR15A variant is already published; original-base branch is duplicate under current evidence.
publish-ready           ready/rtc-pr15b-fallback-group-insert-anchor-green                                                    P1        no       PR14B-based PR15B variant is already published; original-base branch is duplicate under current evidence.
publish-ready           ready/rtc-pr15c-fallback-group-delete-green                                                           P1        no       PR14B-based PR15C variant is already published; original-base branch is duplicate under current evidence.
cooldown-diagnostic     malformed-save-payload/raw-deferred-heads                                                             P1        yes      Raw deferred heads are superseded by canonical PR06B minimal unless fresh product evidence appears.
cooldown-diagnostic     http-room-isolation/raw-deferred-heads                                                                P1        yes      Raw deferred heads are superseded by published PR02A unless fresh healthy-user HTTP room-isolation evidence appears.
cooldown-diagnostic     pr17-1020002/pre-oracle-only-replays                                                                  P1        yes      Terminal downscope remains; reopen only with fresh product evidence newer than classification.tsv and report.md.
reserve-discovery       discovery-reserve                                                                                     P0        yes      Discovery count is healthy but coverage novelty first pass is pending; allow bounded exact-stack PR work and cheap controller work only.
cooldown-diagnostic     broad-pr-analysis                                                                                     P0        yes      Avoid heavy broad PR fanout while exact-stack closure deferred jobs and discovery lanes are already active.
update-controller-rule  productive-analysis-feed-binding                                                                      P0        yes      Every P0 Productive Analysis row targeting controller loops must become a TSV action or explicit rejection.
update-controller-rule  effective-pr-slot-accounting                                                                          P0        yes      Count queued and runnable owner matrices repairs benchmark jobs deferred jobs continuations finalizers and persona loops against PR capacity.
update-controller-rule  fresh-classification-reconcile                                                                        P0        yes      Consume newer classification.tsv and report.md artifacts before slot assignment so resolved blockers stop occupying capacity.
update-controller-rule  artifact-complete-single-flight                                                                       P0        yes      Permit one lane per blocker or family and reject zero-byte setup-only pre-oracle and duplicate-head artifacts as progress.

## Progress Table
generated_at          item_id                                                             kind              priority  status                  branch_or_target                                             head_sha      next_action                                                                                                evidence                                                                                                                                                                                            
2026-05-21T22:51:55Z  branch-ready-rtc-pr02a-http-room-isolation-regression               ready-product-pr  high      published               ready/rtc-pr02a-http-room-isolation-regression               9303a7715cf3  already published by local machine after branch repair; keep validating against fuzz                       /media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517/runs/20260517T150633Z/validations/branch-ready-rtc-pr02a-http-room-isolation-regression/report.md                             
2026-05-21T22:51:55Z  branch-ready-rtc-pr03b-browser-revision-restore-crdt-invalidation   ready-product-pr  high      published               ready/rtc-pr03b-browser-revision-restore-crdt-invalidation   cbab481fe760  already published by local machine after branch repair; keep validating against fuzz                       /media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517/runs/20260517T133507Z/validations/branch-ready-rtc-pr03b-browser-revision-restore-crdt-invalidation/report.md                 
2026-05-21T22:51:55Z  branch-ready-rtc-pr06b-malformed-save-request-payload               ready-product-pr  high      held-by-controller      ready/rtc-pr06b-malformed-save-request-payload               87e0ed20ab8e  controller decision currently blocks publication                                                           /media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517/runs/20260517T145219Z/validations/branch-ready-rtc-pr06b-malformed-save-request-payload/report.md                             
2026-05-21T22:51:55Z  branch-ready-rtc-pr06b-malformed-save-request-payload-minimal       ready-product-pr  high      published               ready/rtc-pr06b-malformed-save-request-payload-minimal       7b123e0ef233  already published by local machine; keep validating against fuzz                                           /media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517/runs/20260517T150633Z/validations/branch-ready-rtc-pr06b-malformed-save-request-payload-minimal/report.md                     
2026-05-21T22:51:55Z  branch-ready-rtc-pr07b-save-response-manager-base-record            ready-product-pr  high      published               ready/rtc-pr07b-save-response-manager-base-record            c2592d5fd583  already published by local machine after branch repair; keep validating against fuzz                       /media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517/runs/20260517T145219Z/validations/branch-ready-rtc-pr07b-save-response-manager-base-record/report.md                          
2026-05-21T22:51:55Z  branch-ready-rtc-pr07c-reload-record-snapshots                      ready-product-pr  high      held-by-controller      ready/rtc-pr07c-reload-record-snapshots                      025c7638361f  controller decision currently blocks publication                                                           /media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517/runs/20260517T150048Z/validations/branch-ready-rtc-pr07c-reload-record-snapshots/report.md                                    
2026-05-21T22:51:55Z  branch-ready-rtc-pr09-store-lock-fairness                           ready-product-pr  high      published               ready/rtc-pr09-store-lock-fairness                           87b82b3be657  already published by local machine after branch repair; keep validating against fuzz                       /media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517/runs/20260517T145219Z/validations/branch-ready-rtc-pr09-store-lock-fairness/report.md                                         
2026-05-21T22:51:55Z  branch-ready-rtc-pr10-crdt-block-rebase                             ready-product-pr  high      published               ready/rtc-pr10-crdt-block-rebase                             ba7235bc8825  already published by local machine after branch repair; keep validating against fuzz                       /media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517/runs/20260517T145219Z/validations/branch-ready-rtc-pr10-crdt-block-rebase/report.md                                           
2026-05-21T22:51:55Z  branch-ready-rtc-pr11a-stale-base-record-block-append               ready-product-pr  high      published               ready/rtc-pr11a-stale-base-record-block-append               78f6df2a91a2  already published by local machine after branch repair; keep validating against fuzz                       /media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517/runs/20260517T145220Z/validations/branch-ready-rtc-pr11a-stale-base-record-block-append/report.md                             
2026-05-21T22:51:55Z  branch-ready-rtc-pr11b-stale-base-block-delete                      ready-product-pr  high      published               ready/rtc-pr11b-stale-base-block-delete                      0cdcd5ffca89  already published by local machine after branch repair; keep validating against fuzz                       /media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517/runs/20260517T145513Z/validations/branch-ready-rtc-pr11b-stale-base-block-delete/report.md                                    
2026-05-21T22:51:55Z  branch-ready-rtc-pr14-table-body-array-green                        ready-product-pr  high      published               ready/rtc-pr14-table-body-array-green                        9b090fc7e660  already published by local machine after branch repair; keep validating against fuzz                       /media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517/runs/20260517T150633Z/validations/branch-ready-rtc-pr14-table-body-array-green/report.md                                      
2026-05-21T22:51:55Z  branch-ready-rtc-pr14b-table-query-array-local-suffix-append        ready-product-pr  high      published               ready/rtc-pr14b-table-query-array-local-suffix-append        c3d45173ed99  already published by local machine; keep validating against fuzz                                           /media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517/runs/20260517T150048Z/validations/branch-ready-rtc-pr14b-table-query-array-local-suffix-append/report.md                      
2026-05-21T22:51:55Z  branch-ready-rtc-pr15a-fallback-group-move-green                    ready-product-pr  high      held-by-controller      ready/rtc-pr15a-fallback-group-move-green                    76a45dafd157  controller decision currently blocks publication                                                           /media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517/runs/20260517T150634Z/validations/branch-ready-rtc-pr15a-fallback-group-move-green/report.md                                  
2026-05-21T22:51:55Z  branch-ready-rtc-pr15a-fallback-group-move-green-on-pr14b           ready-product-pr  high      published               ready/rtc-pr15a-fallback-group-move-green-on-pr14b           125b5d030d8c  already published by local machine; keep validating against fuzz                                           /media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517/runs/20260517T150048Z/validations/branch-ready-rtc-pr15a-fallback-group-move-green-on-pr14b/report.md                         
2026-05-21T22:51:55Z  branch-ready-rtc-pr15b-fallback-group-insert-anchor-green           ready-product-pr  high      held-by-controller      ready/rtc-pr15b-fallback-group-insert-anchor-green           34af1b4f9430  controller decision currently blocks publication                                                           /media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517/runs/20260517T150634Z/validations/branch-ready-rtc-pr15b-fallback-group-insert-anchor-green/report.md                         
2026-05-21T22:51:55Z  branch-ready-rtc-pr15b-fallback-group-insert-anchor-green-on-pr14b  ready-product-pr  high      published               ready/rtc-pr15b-fallback-group-insert-anchor-green-on-pr14b  acb367667da1  already published by local machine; keep validating against fuzz                                           /media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517/runs/20260517T150048Z/validations/branch-ready-rtc-pr15b-fallback-group-insert-anchor-green-on-pr14b/report.md                
2026-05-21T22:51:55Z  branch-ready-rtc-pr15c-fallback-group-delete-green                  ready-product-pr  high      held-by-controller      ready/rtc-pr15c-fallback-group-delete-green                  921f093cc47b  controller decision currently blocks publication                                                           /media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517/runs/20260517T145219Z/validations/branch-ready-rtc-pr15c-fallback-group-delete-green/report.md                                
2026-05-21T22:51:55Z  branch-ready-rtc-pr15c-fallback-group-delete-green-on-pr14b         ready-product-pr  high      published               ready/rtc-pr15c-fallback-group-delete-green-on-pr14b         8decb9081f9f  already published by local machine; keep validating against fuzz                                           /media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517/runs/20260517T150048Z/validations/branch-ready-rtc-pr15c-fallback-group-delete-green-on-pr14b/report.md                       
2026-05-21T22:51:55Z  pr07c-owner-matrix                                                  runtime-gated-pr  high      runtime-held-consumed   PR07C/HOLD-07C                                                             do not relaunch owner matrix until newer owner evidence appears; repair setup or run exact replay instead  /media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260518T170339Z/jobs/outputs/rtc-cycle380-pr07c-owner-replay-after-browser-ready/report.md                                        
2026-05-21T22:51:55Z  reload-hydration                                                    deferred-family   high      needs-product-decision  reload-hydration                                                           promote product fix, produce owner evidence, or downscope                                                  reload-hydration                                                                                                                                                                      launches=402  last_epoch=1779403194
2026-05-21T22:51:55Z  pre-save-search-live-collapse                                       deferred-family   medium    diagnostic              tsearch-live-collapse                                                      promote only with owner evidence                                                                           pre-save-search-live-collapse                                                                                                                                                         launches=312  last_epoch=1779402271

## Branch Links
- branch-ready-rtc-pr02a-http-room-isolation-regression: [ready/rtc-pr02a-http-room-isolation-regression](https://github.com/danluu/gutenberg/tree/ready/rtc-pr02a-http-room-isolation-regression) status=published head=9303a7715cf3
- branch-ready-rtc-pr03b-browser-revision-restore-crdt-invalidation: [ready/rtc-pr03b-browser-revision-restore-crdt-invalidation](https://github.com/danluu/gutenberg/tree/ready/rtc-pr03b-browser-revision-restore-crdt-invalidation) status=published head=cbab481fe760
- branch-ready-rtc-pr06b-malformed-save-request-payload: [ready/rtc-pr06b-malformed-save-request-payload](https://github.com/danluu/gutenberg/tree/ready/rtc-pr06b-malformed-save-request-payload) status=held-by-controller head=87e0ed20ab8e
- branch-ready-rtc-pr06b-malformed-save-request-payload-minimal: [ready/rtc-pr06b-malformed-save-request-payload-minimal](https://github.com/danluu/gutenberg/tree/ready/rtc-pr06b-malformed-save-request-payload-minimal) status=published head=7b123e0ef233
- branch-ready-rtc-pr07b-save-response-manager-base-record: [ready/rtc-pr07b-save-response-manager-base-record](https://github.com/danluu/gutenberg/tree/ready/rtc-pr07b-save-response-manager-base-record) status=published head=c2592d5fd583
- branch-ready-rtc-pr07c-reload-record-snapshots: [ready/rtc-pr07c-reload-record-snapshots](https://github.com/danluu/gutenberg/tree/ready/rtc-pr07c-reload-record-snapshots) status=held-by-controller head=025c7638361f
- branch-ready-rtc-pr09-store-lock-fairness: [ready/rtc-pr09-store-lock-fairness](https://github.com/danluu/gutenberg/tree/ready/rtc-pr09-store-lock-fairness) status=published head=87b82b3be657
- branch-ready-rtc-pr10-crdt-block-rebase: [ready/rtc-pr10-crdt-block-rebase](https://github.com/danluu/gutenberg/tree/ready/rtc-pr10-crdt-block-rebase) status=published head=ba7235bc8825
- branch-ready-rtc-pr11a-stale-base-record-block-append: [ready/rtc-pr11a-stale-base-record-block-append](https://github.com/danluu/gutenberg/tree/ready/rtc-pr11a-stale-base-record-block-append) status=published head=78f6df2a91a2
- branch-ready-rtc-pr11b-stale-base-block-delete: [ready/rtc-pr11b-stale-base-block-delete](https://github.com/danluu/gutenberg/tree/ready/rtc-pr11b-stale-base-block-delete) status=published head=0cdcd5ffca89
- branch-ready-rtc-pr14-table-body-array-green: [ready/rtc-pr14-table-body-array-green](https://github.com/danluu/gutenberg/tree/ready/rtc-pr14-table-body-array-green) status=published head=9b090fc7e660
- branch-ready-rtc-pr14b-table-query-array-local-suffix-append: [ready/rtc-pr14b-table-query-array-local-suffix-append](https://github.com/danluu/gutenberg/tree/ready/rtc-pr14b-table-query-array-local-suffix-append) status=published head=c3d45173ed99
- branch-ready-rtc-pr15a-fallback-group-move-green: [ready/rtc-pr15a-fallback-group-move-green](https://github.com/danluu/gutenberg/tree/ready/rtc-pr15a-fallback-group-move-green) status=held-by-controller head=76a45dafd157
- branch-ready-rtc-pr15a-fallback-group-move-green-on-pr14b: [ready/rtc-pr15a-fallback-group-move-green-on-pr14b](https://github.com/danluu/gutenberg/tree/ready/rtc-pr15a-fallback-group-move-green-on-pr14b) status=published head=125b5d030d8c
- branch-ready-rtc-pr15b-fallback-group-insert-anchor-green: [ready/rtc-pr15b-fallback-group-insert-anchor-green](https://github.com/danluu/gutenberg/tree/ready/rtc-pr15b-fallback-group-insert-anchor-green) status=held-by-controller head=34af1b4f9430
- branch-ready-rtc-pr15b-fallback-group-insert-anchor-green-on-pr14b: [ready/rtc-pr15b-fallback-group-insert-anchor-green-on-pr14b](https://github.com/danluu/gutenberg/tree/ready/rtc-pr15b-fallback-group-insert-anchor-green-on-pr14b) status=published head=acb367667da1
- branch-ready-rtc-pr15c-fallback-group-delete-green: [ready/rtc-pr15c-fallback-group-delete-green](https://github.com/danluu/gutenberg/tree/ready/rtc-pr15c-fallback-group-delete-green) status=held-by-controller head=921f093cc47b
- branch-ready-rtc-pr15c-fallback-group-delete-green-on-pr14b: [ready/rtc-pr15c-fallback-group-delete-green-on-pr14b](https://github.com/danluu/gutenberg/tree/ready/rtc-pr15c-fallback-group-delete-green-on-pr14b) status=published head=8decb9081f9f

## Controller Push Manifest
source_branch	source_commit	intended_danluu_branch	base_ref	files_changed	insertions	deletions	validation_summary	reason

## Active Sessions
rtc-backend-api-fuzz: 1 windows (created Thu May 21 22:25:47 2026)
rtc-coverage-guided-analysis: 1 windows (created Thu May 21 22:45:17 2026)
rtc-coverage-guided-lower-level-http-polling-manager: 1 windows (created Thu May 21 22:19:12 2026)
rtc-coverage-guided-novelty: 1 windows (created Thu May 21 22:45:17 2026)
rtc-coverage-guided-supervisor: 1 windows (created Thu May 21 22:46:12 2026)
rtc-coverage-guided-watchdog: 1 windows (created Thu May 21 22:45:17 2026)
rtc-critical-continuation-benchmark-canary-fuzzer-gap-20260521T222259Z: 1 windows (created Thu May 21 22:23:02 2026)
rtc-critical-path-pr-executor-loop: 1 windows (created Thu May 21 22:36:57 2026)
rtc-deferred-job-reload-hydration-20260521T223947Z: 1 windows (created Thu May 21 22:39:54 2026)
rtc-deferred-work-promotion-loop: 1 windows (created Thu May 21 22:24:21 2026)
rtc-focused-shards-analysis: 1 windows (created Thu May 21 19:59:57 2026)
rtc-focused-shards-analysis-append-benchmark-canary-fuzzer-gap-20260521T2250Z: 1 windows (created Thu May 21 22:47:16 2026)
rtc-focused-shards-append-benchmark-canary-fuzzer-gap-20260521T2250Z: 1 windows (created Thu May 21 22:47:16 2026)
rtc-focused-shards-gap-codex-loop: 1 windows (created Thu May 21 19:59:57 2026)
rtc-focused-shards-watchdog-append-benchmark-canary-fuzzer-gap-20260521T2250Z: 1 windows (created Thu May 21 22:47:16 2026)
rtc-fuzz-level-mix-persona-loop: 1 windows (created Thu May 21 22:24:21 2026)
rtc-fuzz-level-mix-persona-loop-watchdog: 1 windows (created Thu May 21 22:24:21 2026)
rtc-fuzz-only-asserts-loop: 1 windows (created Wed May 20 18:49:25 2026)
rtc-fuzz-strict-expansion-analysis: 1 windows (created Thu May 21 22:36:56 2026)
rtc-lower-level-fuzz-loop: 1 windows (created Thu May 21 22:03:05 2026)
rtc-native-harness-persona-loop: 1 windows (created Thu May 21 22:01:49 2026)
rtc-native-persona-contrarian-20260521T224354Z: 1 windows (created Thu May 21 22:43:55 2026)
rtc-native-persona-dan-luu-20260521T224354Z: 1 windows (created Thu May 21 22:43:54 2026)
rtc-operator-correctness-fuzz-operator-correctness-20260519T214500Z: 1 windows (created Thu May 21 22:05:59 2026)
rtc-pr-progress-controller-loop: 1 windows (created Thu May 21 22:25:01 2026)
rtc-pr-progress-persona-contrarian-20260521T225157Z: 1 windows (created Thu May 21 22:51:57 2026)
rtc-pr-progress-persona-dan-luu-20260521T225157Z: 1 windows (created Thu May 21 22:51:57 2026)
rtc-pr-progress-persona-kyle-kingsbury-20260521T225157Z: 1 windows (created Thu May 21 22:51:57 2026)
rtc-pr-progress-persona-linus-torvalds-20260521T225157Z: 1 windows (created Thu May 21 22:51:57 2026)
rtc-pr-progress-persona-marc-brooker-20260521T225157Z: 1 windows (created Thu May 21 22:51:57 2026)
rtc-pr-progress-persona-tptacek-20260521T225157Z: 1 windows (created Thu May 21 22:51:57 2026)
rtc-pr-progress-synthesis-20260521T225157Z: 1 windows (created Thu May 21 22:51:57 2026)
rtc-protocol-server-fuzz: 1 windows (created Thu May 21 22:42:02 2026)
rtc-protocol-server-persona-loop: 1 windows (created Thu May 21 22:01:49 2026)
rtc-protocol-synthesis-20260521T224313Z: 1 windows (created Thu May 21 22:50:54 2026)

## Recent Log
[2026-05-20T12:51:49Z] launched persona controller round 20260520T125148Z
[2026-05-20T12:52:19Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-20T12:55:23Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-20T12:57:56Z] launched persona controller round 20260520T125755Z
[2026-05-20T12:58:27Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-20T13:01:29Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-20T13:12:30Z] launched persona controller round 20260520T131230Z
[2026-05-20T13:13:02Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-20T13:16:04Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-20T13:18:41Z] launched persona controller round 20260520T131841Z
[2026-05-20T13:19:12Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-20T13:22:15Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-20T13:24:47Z] launched persona controller round 20260520T132447Z
[2026-05-20T13:25:18Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-20T13:28:20Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-20T13:30:52Z] launched persona controller round 20260520T133051Z
[2026-05-20T13:31:22Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-20T13:34:23Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-20T13:38:15Z] launched persona controller round 20260520T133815Z
[2026-05-20T13:39:03Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-20T13:44:30Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-20T13:47:02Z] launched persona controller round 20260520T134702Z
[2026-05-20T13:47:32Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-20T13:50:37Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-20T13:53:15Z] launched persona controller round 20260520T135314Z
[2026-05-20T13:53:46Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-20T13:56:48Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-20T13:59:50Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-20T14:02:53Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-20T14:05:27Z] launched persona controller round 20260520T140526Z
[2026-05-20T14:05:57Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-20T14:09:00Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-20T14:11:32Z] launched persona controller round 20260520T141132Z
[2026-05-20T14:12:03Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-20T14:15:07Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-20T14:17:39Z] launched persona controller round 20260520T141738Z
[2026-05-20T14:18:09Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-20T14:21:12Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-20T14:23:46Z] launched persona controller round 20260520T142345Z
[2026-05-20T14:24:17Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-20T14:27:20Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-20T14:29:53Z] launched persona controller round 20260520T142953Z
[2026-05-20T14:30:25Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-20T14:33:27Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-20T14:35:59Z] launched persona controller round 20260520T143559Z
[2026-05-20T14:36:31Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-20T14:39:34Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-20T14:42:06Z] launched persona controller round 20260520T144205Z
[2026-05-20T14:42:37Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-20T14:45:40Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-20T14:48:13Z] launched persona controller round 20260520T144813Z
[2026-05-20T14:48:44Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-20T14:51:46Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-20T14:54:18Z] launched persona controller round 20260520T145418Z
[2026-05-20T14:54:50Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-20T14:57:55Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-20T15:00:28Z] launched persona controller round 20260520T150027Z
[2026-05-20T15:00:59Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-20T15:04:02Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-20T15:06:34Z] launched persona controller round 20260520T150634Z
[2026-05-20T15:07:05Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-20T15:10:07Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-20T15:12:39Z] launched persona controller round 20260520T151239Z
[2026-05-20T15:13:10Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-20T15:16:13Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-20T15:18:45Z] launched persona controller round 20260520T151845Z
[2026-05-20T15:19:16Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-21T22:09:22Z] PR progress controller started pid=1462068
[2026-05-21T22:10:44Z] PR progress controller started pid=1521067
[2026-05-21T22:10:45Z] launched persona controller round 20260521T221044Z
[2026-05-21T22:11:12Z] PR progress controller started pid=1557675
[2026-05-21T22:16:08Z] PR progress controller started pid=1856731
[2026-05-21T22:16:12Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-21T22:16:24Z] PR progress controller started pid=1870635
[2026-05-21T22:17:30Z] PR progress controller started pid=1918450
[2026-05-21T22:17:32Z] launched persona controller round 20260521T221732Z
[2026-05-21T22:17:34Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-21T22:19:37Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-21T22:21:41Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-21T22:23:44Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-21T22:24:21Z] PR progress controller started pid=2286775
[2026-05-21T22:25:01Z] PR progress controller started pid=2337474
[2026-05-21T22:25:04Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-21T22:27:06Z] launched persona controller round 20260521T222706Z
[2026-05-21T22:27:07Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-21T22:29:11Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-21T22:31:15Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-21T22:33:19Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-21T22:35:22Z] launched persona controller round 20260521T223522Z
[2026-05-21T22:35:23Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-21T22:37:27Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-21T22:39:31Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-21T22:41:35Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-21T22:43:38Z] launched persona controller round 20260521T224338Z
[2026-05-21T22:43:39Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-21T22:45:44Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-21T22:47:50Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-21T22:49:54Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
[2026-05-21T22:51:57Z] launched persona controller round 20260521T225157Z
[2026-05-21T22:51:58Z] not launching PR07C owner matrix: latest no-promote classification already consumed current owner evidence
