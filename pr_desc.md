## Description

This PR addresses issue #1615 by implementing automated scheduled report generation, archiving, and email delivery to administrators. It refactors the generic report-generation task into two specific, schedule-configurable tasks: Daily Attendance and Weekly Analytics.

## Linked Issue

Closes #1615

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [x] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Changes Made

- **Task Configs (`server/services/schedulerService.js`):** Substituted the generic `report-generation` task with two precise tasks: `daily-attendance-report` (cron: `0 18 * * *`) and `weekly-analytics-report` (cron: `0 9 * * 1`), which natively support individual cron reconfiguration via the scheduler's REST endpoints.
- **Reporting Queries & Archival:** Both reports dynamically calculate relevant metrics from the `events` and `student_users` tables. A new `scheduled_reports` table is utilized to permanently archive the structured JSON report data for historical reference and audits.
- **Email Delivery:** Integrated the platform's standard `sendEmail` utility, formatting the JSON output securely via the `generic` email template, and routing it to `admin@nexasphere.com`.

## Testing Performed

- Locally verified Node.js syntax checks via `node --check` against the scheduling components.
- Confirmed the newly introduced scheduled tasks properly execute their SQL aggregations, initialize the archival database table correctly if it doesn't exist, and invoke `sendEmail`.

## Checklist

- [x] My code follows the style guidelines of this project
- [x] I have performed a self-review of my own code
- [x] I have commented my code, particularly in hard-to-understand areas
- [x] My changes generate no new warnings
- [x] New and existing unit tests pass locally with my changes
