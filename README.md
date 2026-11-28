# WorkSphere Application Completion Package

This package replaces the demo-only frontend screens with API-backed workspace screens.

## Included
- Login and registration connected to existing Express auth endpoints.
- Session storage, refresh-token rotation on 401, and sign-out.
- Protected workspace shell with organization/user details.
- Live dashboard, projects, tasks, team members and invitations.
- Analytics page wired to the Express analytics proxy endpoints.
- Task activity timeline and account/workspace settings.
- Responsive styling additions.

## Preconditions
- Apply the previously supplied `WorkSphere-Analytics-Express-Integration.zip` locally. The Analytics page expects:
  - `GET /api/v1/analytics/projects/:projectId/health`
  - `GET /api/v1/analytics/projects/:projectId/workload`
  - `GET /api/v1/analytics/projects/:projectId/delivery`
- Express API is available at `http://localhost:3001` by default.
- Frontend uses `NEXT_PUBLIC_API_URL` when set; otherwise it uses `http://localhost:3001/api/v1`.

## Apply (Windows PowerShell)
1. Extract this ZIP into `C:\Project-WorkSphere` (merge folders).
2. Open PowerShell in `C:\Project-WorkSphere`.
3. Run:
   ```powershell
   Set-ExecutionPolicy -Scope Process RemoteSigned
   .\APPLY-UPDATE.ps1
   ```
4. Start frontend:
   ```powershell
   npm run dev:frontend
   ```
5. Open `http://localhost:3000/login`.

The script backs up files it replaces into `_worksphere_backup_<timestamp>`. It does not modify `.env`, backend source, Prisma schema, database contents, or dependencies.

## Notes / honest limitations
- Browser access tokens are kept in `sessionStorage` for this local assessment build. Production should use Secure, HttpOnly, SameSite cookies and CSRF protection.
- Invitation creation returns a one-time token for manual handoff. No email provider is configured by this package.
- The analytics view expects the already-applied Express–FastAPI integration package.
- The page displays the API's current metric shape without inventing unavailable metrics.
