# Project Kerjasama (POLNEP)

## Project Overview
This project is a comprehensive system for managing, analyzing, and visualizing cooperation documents (MoU - Memorandum of Understanding and PKS - Perjanjian Kerja Sama) between **Politeknik Negeri Pontianak (POLNEP)** and various national/international partners (Mitra).

The application is structured as a **Full-Stack Next.js Monorepo** where the frontend dashboard and backend API routes coexist cleanly at the root level, supported by local Python data ingestion scripts.

---

## Tech Stack
- **Web App Framework:** Next.js 16 (App Router), React 19, TypeScript.
- **Styling (CSS):** Tailwind CSS v4 (Dark Theme - Slate/Indigo palette by default).
- **Libraries:** Framer Motion (animations), Lucide React (icons), Date-fns (date formatting), ExcelJS & File-Saver (export features).
- **Data Layer:** Local CSV files as data store, compiled to a static TS store (`src/lib/data.ts`) via Python.
- **Data Ingestion (Python):** Selenium, Requests, Pandas.

---

## Building and Running

### 1. Data Processing (Python)
Ensure Python 3 is installed with required dependencies (`pandas`, `requests`, `selenium`, `webdriver-manager`).

- **Fetch from Google Sheets:**
  ```bash
  python data_handler.py
  ```
- **Compile CSVs to Web Data Store (`src/lib/data.ts`):**
  ```bash
  python sync_data_to_web.py
  ```

### 2. Next.js Web App (At Root)
- **Install Dependencies:**
  ```bash
  npm install
  ```
- **Run Local Development Server:**
  ```bash
  npm run dev
  ```
- **Build Static Production Export:**
  ```bash
  npm run build
  ```

---

## Architectural Guidelines & Conventions

To maintain a clean, highly modular, and maintainable project, **ALL future development** must strictly follow these structural rules. Do not write monolithic pages; separate concerns cleanly:

### 1. Separation of Frontend and Backend
- **Frontend Layer (UI & Interaction):**
  - All web views and pages go to `src/app/` (using App Router).
  - All interactive UI widgets go to `src/components/`.
- **Backend Layer (APIs & Business Logic):**
  - All server-side endpoints must be placed in `src/app/api/[feature]/route.ts`.
  - Database helper functions and static compilation logic must go to `src/lib/`.

### 2. Frontend Component Modularity (No Monoliths)
Do not combine complex dashboards, tables, and graphs in a single page or file. Always split them into specialized folders under `src/components/`:
- **`src/components/ui/` (Reusable Atom Components):** Basic atomic elements used across different pages (e.g., `Button.tsx`, `Modal.tsx`, `Input.tsx`, `Card.tsx`).
- **`src/components/tables/` (Data Tables):** Complex table components handling their own sorting, pagination, and columns (e.g., `MainCooperationTable.tsx`, `PartnerTable.tsx`).
- **`src/components/dashboard/` (Analytics & Charts):** Visual graphs, chart wrappers, and statistics summaries (e.g., `PartnerDistributionChart.tsx`, `StatsOverview.tsx`).

### 3. TypeScript Type Safety
- All shared interfaces and typings (e.g., `JoinedDokumen`, `MitraInfo`) must be defined inside `src/types/` (or centralized in `src/types/index.ts`).
- Both backend API routes and frontend components must import and use these shared types to ensure 100% type safety.

---

## Project Structure (Root-level Layout)
- `data/`: Local CSV data storage.
- `src/`: Next.js frontend and backend application source.
  - `app/`: Next.js pages and API routes.
  - `components/`: Modular React components (subdivided into `ui/`, `tables/`, `dashboard/`).
  - `lib/`: Business logic, helpers, and static data stores.
  - `types/`: Shared TypeScript declarations.
- `public/`: Public assets and partner logos (`T_mitra_Images/`).
- `data_handler.py`: Data ingestion script from Google Sheets.
- `sync_data_to_web.py`: Script compiling CSV data directly to `src/lib/data.ts`.
- `schema.txt`: DBML database schema documentation.

