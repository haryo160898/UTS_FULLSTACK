# Project Functions and Components — HR Management System

Dokumen ini berisi daftar fungsi, komponen, dan endpoint utama pada proyek beserta lokasi (file dan nomor baris). Nomor baris adalah indikatif (1-based) dan bisa berubah jika file diedit; gunakan sebagai panduan navigasi.

---

## Backend

### `server.js`

- `app.post('/api/auth/forgot-password')` — handler forgot-password (lihat sekitar baris ~320-380)
- `app.post('/api/auth/reset-password')` — handler reset-password (ditambahkan setelah forgot-password, lihat sekitar baris ~380-420)
- `app.post('/api/auth/login')` — login handler (lihat bagian auth, sekitar baris ~120-220)
- `app.post('/api/auth/register')` — register handler (lihat bagian auth, awal file)
- `app.post('/api/auth/refresh')` — refresh token endpoint
- `GET /api/health`, `GET /api/db-health` — health checks
- Dashboard endpoints: `/api/dashboard/stats`, `/api/dashboard/growth`, `/api/dashboard/divisions`, `/api/dashboard/recent` (lihat bagian dashboard endpoints — search for `dashboard` in `server.js`)
- Employee endpoints: `/api/employees` (GET/POST/PUT/DELETE) — pagination and filters (search for `employees` handlers)
- Utility functions in `server.js`:
  - `const maskPassword = (pass) => ...` — (line ~28)
  - `const verifyToken = (req, res, next) => ...` — (line ~417)
  - PDF/Export helper functions (draw table, page layout) around lines ~1370-1460
- Module export: `module.exports = app;` (line ~1519)

---

## Frontend (folder `app/`)

> Catatan: semua nomor baris di bawah diambil dari snapshot file saat analisis; buka file untuk nomor baris yang tepat setelah perubahan.

### Halaman utama

- `app/page.tsx` — `export default function Home()` (line ~7)

### Auth & Reset

- `app/login/page.tsx` — `export default function LoginPage()` (line ~14)
- `app/register/page.tsx` — `export default function RegisterPage()` (line ~13)
- `app/forgot-password/page.tsx` — `export default function ForgotPasswordPage()` (line ~9)
- `app/reset-password/page.tsx` — `export default function ResetPasswordPage()` (line ~10)

### Dashboard

- `app/dashboard/page.tsx` — `export default function DashboardPage()` (line 53)
  - `formatMonthLabel` (helper) (line 70)
  - `sortByEmployeeCode` (helper) (line 121)
- `app/dashboard/reports/page.tsx` — `export default function ReportsPage()` (line 34)
- `app/dashboard/upload/page.tsx` — `export default function UploadDataPage()` (line 19)
- `app/dashboard/export/page.tsx` — `export default function ExportDataPage()` (line 10)

### Employees pages

- `app/dashboard/employees/page.tsx` — `export default function EmployeesPage()` (line 32)
- `app/dashboard/employees/new/page.tsx` — `export default function NewEmployeePage()` (line 35)
- `app/dashboard/employees/[id]/page.tsx` — `export default function EmployeeDetailPage()` (line 38)
- `app/dashboard/employees/[id]/edit/page.tsx` — `export default function EditEmployeePage()` (line 40)

### Other pages

- `app/unauthorized/page.tsx` — `export default function UnauthorizedPage()` (line 6)
- `app/dashboard/users/page.tsx` — `export default function UsersPage()` (line ~27)
- `app/dashboard/settings/page.tsx` — `export default function SettingsPage()` (line 9)

---

## Components

### App-level components (`app/components/`)

- `app/components/DashboardLayout.tsx`
  - `export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {` (line 27)
  - `handleLogout()` helper (line ~34)
- `app/components/ProtectedRoute.tsx`
  - `export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({` (line 19)
- `app/components/DataTable.tsx`
  - `export function DataTable({ ... }) {` (line 20)
- `app/components/Button.tsx` — `export function Button({ ... }) {` (line 28)
- `app/components/Modal.tsx` — `export function Modal({ isOpen, onClose, title, children, size = 'medium' }: ModalProps) {` (line 18)
- `app/components/FormInput.tsx` — `export function FormInput({ ... }) {` (line 17)
- `app/components/StatCard.tsx` — `export function StatCard({ title, value, icon: Icon, color, trend }: StatCardProps) {` (line 23)

### UI primitives (`components/ui/`)

- Banyak komponen UI kecil; beberapa contoh dengan lokasi fungsi utama:
  - `components/ui/accordion.tsx` — `function Accordion(...)` (line 9), `AccordionItem` (line 15), `AccordionTrigger` (line 28), `AccordionContent` (line 50)
  - `components/ui/alert-dialog.tsx` — `function AlertDialog(...)` (line 9), `AlertDialogTrigger`, `AlertDialogPortal`, ... (multi functions)
  - `components/ui/button.tsx` — `function Button(...)` (line 39)
  - `components/ui/card.tsx` — `function Card(...)` and subcomponents (lines 5, 18, 31, 41, 51, 64, 74)
  - `components/ui/chart.tsx` — `function useChart()` (line 27), `ChartContainer` (line 37), plus helpers
  - `components/ui/*` — banyak file dengan small components; gunakan editor search untuk navigasi cepat

---

## Hooks & Lib

- `app/contexts/AuthContext.tsx`
  - `export const AuthProvider: React.FC<{ children: React.ReactNode }>` (line 39)
  - `handleLogout()` (line ~124), `setupTokenRefresh()` (line ~134), `logout()` (line ~254), `updateUser()` (line ~262)
  - `export const useAuth = () => {` (line ~286)

- `app/lib/api.ts`
  - `export const apiClient = baseInstance;` (line 57)
  - `export const authAPI = {` (line 61)
  - `export const employeesAPI = {` (line 95)
  - `export const usersAPI = {` (line 123)
  - `export const dashboardAPI = {` (line 138)
  - `export const fileAPI = {` (line 154)
  - `export const handleApiError = (error: any): string => {` (line 171)

- `app/lib/auth.ts` (utility for token storage)
  - `export const storeTokens = (accessToken: string, refreshToken: string) => {` (line 27)
  - `export const getAccessToken = (): string | null => {` (line 38)
  - `export const isTokenExpired = (token: string): boolean => {` (line 118)
  - `export const shouldRefreshToken = (): boolean => {` (line 130)
  - banyak helper auth utilities follow

- `app/hooks/useApi.ts` — `export const useApi = <T, A extends any[]>(...)` (line ~23), `useGet`, `usePost`, `usePut`, `useDelete` (lines ~65,82,102,122)
- `app/hooks/useAuth.ts` — `export const useAuthContext`, `useIsAuthenticated`, `useUser`, etc. (lines ~8-83)
- `hooks/use-mobile.ts` — `export function useIsMobile()` (line 5)
- `hooks/use-toast.ts` — toast reducer and hooks (multiple functions; see file for details)

---

## Notes & Next Steps

- Saya membuat ringkasan ini dari hasil pencarian ekspor dan definisi fungsi di repository; untuk daftar _lengkap_ per-file (termasuk fungsi non-ekspor dan kondisi logika) saya bisa menghasilkan tabel per-file dengan setiap fungsi dan nomor baris tepat.
- Jika Anda ingin, saya bisa:
  - Menghasilkan daftar lengkap setiap file (semua fungsi dengan nomor baris) dan menyimpan ke `FUNCTION_INDEX.json`.
  - Menambahkan link markdown dengan anchor line numbers untuk editor yang mendukung (atau menyertakan `file.tsx` link dengan `#L<number>` jika diperlukan).

---

_File ini dihasilkan secara otomatis pada 2026-05-17 sebagai `PROJECT_FUNCTIONS.md`._
