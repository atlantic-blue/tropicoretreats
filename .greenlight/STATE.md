# Project State

## Overview
Email CRM for Tropico Retreats — email send/receive from admin dashboard via team@tropicoretreat.com
Stack: TypeScript (React 19 + Vite, Node.js 22 Lambda, Terraform, DynamoDB, SES)
Mode: yolo

## Slices

| ID | Name | Status | Tests | Security | Deps |
|----|------|--------|-------|----------|------|
| 1 | Email Infrastructure + Send | complete | 31/31 | pass | — |
| 2 | Email Thread View | complete | 26/26 | pass | 1 |
| 3 | Inbound Email Processing | complete | 38/38 | pass | 1 |
| 4 | Mark Read + Unread Indicators | complete | 32/32 | pass | 2, 3 |
| 5 | Backup Forwarding + Hardening | complete | 29/29 | pass | 3 |

Progress: [██████████] 5/5 slices

## Current

Slice: 5 — Backup Forwarding + Hardening
Step: complete
Last activity: 2026-02-26 — All slices complete

## Test Summary

Total: 158 passing, 0 failing, 0 security
Last run: 2026-02-26

## Decisions

- ADR-001: Emails in existing single-table (co-located with leads)
- ADR-002: Multi-route admin Lambda + event-driven receive Lambda
- ADR-003: SES → S3 → Lambda inbound pipeline
- ADR-004: mailparser for MIME parsing
- ADR-005: Scan + filter for lead matching (GSI deferred)
- ADR-006: Auto-mark-read on thread view
- ADR-007: Truncate email body at 100KB
- ADR-008: Backup forwarding as notification with link
- ADR-009: Reuse existing email field on Lead
- ADR-010: Reduced staleTime (30s) + manual refresh
- ADR-011: Basic textarea for compose
- ADR-012: Client-side reply subject auto-population
- ADR-013: New email.tf + extend existing TF files
- ADR-014: New SES receipt rule set, single rule
- ADR-015: Multi-layer email loop prevention
- ADR-016: Denormalized atomic unread counter
- ADR-017: Attachment download links only (no inline)

## Blockers

None

## Session

Last session: 2026-02-26
Resume file: None
