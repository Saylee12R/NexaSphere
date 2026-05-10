# [note] src/pages/membership/

In-website **NexaSphere Membership Form**  2-section form that collects member details and writes responses directly to Google Sheets via Apps Script.

---

## Files

| File | Purpose |
|---|---|
| `MembershipPage.jsx` | Full membership form component |

---

## Form Sections

### Section 1  Personal Details
| Field | Type | Required |
|---|---|---|
| Full Name | Text input | [ok] |
| University Roll Number | Text input (uppercase, alphanumeric) | [ok] |
| Course | Dropdown (B-Tech / MBA / Other + custom) | [ok] |
| Branch / Department | Dropdown (7 options + Other + custom) | [ok] |
| Section | Dropdown (AF) | [ok] |
| Semester | Dropdown (IVIII) | [ok] |
| WhatsApp Number | Tel input (10 digits, validated) | [ok] |

### Section 2  Domain Selection
| Field | Type | Required |
|---|---|---|
| NexaSphere groups to join | Multi-select chips (8 groups) | [ok] (min 1) |
| Why do you want to join? | Textarea | [ok] |

---

## Google Sheets Integration

| Setting | Value |
|---|---|
| Apps Script project | **"NexaSphere Membership"** |
| Spreadsheet tab | `Membership` (auto-created on first run) |
| Deployment ID | `AKfycbyRQOW3Xjv13vXvft8ezD9sJdvjV3kf-VHm1l_mImHRDUAEqsilK0wb5QBD5GOkixwe` |
| Web App URL | `https://script.google.com/macros/s/AKfycbyRQOW3Xjv13vXvft8ezD9sJdvjV3kf-VHm1l_mImHRDUAEqsilK0wb5QBD5GOkixwe/exec` |
| Script source | `google-apps-script/Code.gs` |

The URL is hardcoded in `MEMBERSHIP_SCRIPT_URL` at the top of `MembershipPage.jsx`. To update it after a new deployment, change that constant.

---

## Sheet Columns (written on each submission)

| # | Column | Source |
|---|---|---|
| 1 | Timestamp | Server time (ISO 8601) |
| 2 | Full Name | `form.fullName` |
| 3 | University Roll Number | `form.rollNumber` |
| 4 | Course | `form.course` (or `courseOther`) |
| 5 | Branch | `form.branch` (or `branchOther`) |
| 6 | Section | `form.section` |
| 7 | Semester | `form.semester` |
| 8 | WhatsApp Number | `form.whatsapp` |
| 9 | Groups Selected | `form.groups` (comma-separated) |
| 10 | Why Join NexaSphere | `form.whyJoin` |
| 11 | Submitted At | Client ISO timestamp |
| 12 | User Agent | Browser user-agent string |

---

## Duplicate Submission Guard

To prevent the same device from submitting twice, the submitted WhatsApp number is stored in `localStorage` under `ns_member_emails`. On mount, the form checks this key and shows a warning if an entry exists.

This is a **device-level** guard only  it does not prevent submissions from different devices with the same number.

---

## Success Screen

After submission, the user sees:
- [ok] Confirmation message
- -> Button to join the NexaSphere WhatsApp Group
- [work] Button to follow NexaSphere on LinkedIn
- [pin] Reminder to mention "I have already filled the NexaSphere form" when requesting to join the WhatsApp group

---

## To Update the Apps Script URL

If you redeploy the Apps Script and get a new URL:

```js
// MembershipPage.jsx  line ~33
const MEMBERSHIP_SCRIPT_URL = 'https://script.google.com/macros/s/<NEW_ID>/exec';
```
