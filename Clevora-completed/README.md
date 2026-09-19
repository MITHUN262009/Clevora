# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS


## Clevora completion notes

This version keeps the existing visual structure and adds the requested functional behavior:
- user-owned data starts empty; no demo student, college, subject, expense, attendance, reminder, or timetable records are seeded
- stream selection exposes the supported stream list and filters the course list to that stream
- profile photos are user-selected; the default student image has been removed
- attendance has a plus action for adding a present session and a missed-session action
- Planner includes timetable entries and an Exam Planner with completion tracking
- native scrollbars are hidden while scrolling remains enabled
- signup no longer sends an email redirect from the client

### Email confirmation
The local Supabase config disables email confirmations. For a hosted Supabase project, the project Authentication email setting must also have email confirmation disabled; this is a Supabase project setting rather than something the browser client can override securely.

### Database
Apply `drizzle/migrations/0001_clevora_personalization.sql` after the original migration. It adds profile stream/avatar fields plus `timetable_entries` and `exam_plans`, all protected by per-user row-level security.
