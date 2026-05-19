# Project Kerjasama (POLNEP)

## Project Overview
This project is a comprehensive system for managing, analyzing, and visualizing cooperation documents (MoU - Memorandum of Understanding and PKS - Perjanjian Kerja Sama) between **Politeknik Negeri Pontianak (POLNEP)** and various national/international partners (Mitra).

The system follows a data-driven architecture where primary data is sourced from Google Sheets, processed locally using Python, and presented through both an interactive web dashboard and a portable offline report.

### Key Components
- **Data Layer (`data/`):** Contains CSV files serving as the local data store. Tables follow a specific naming convention:
    - `T_`: Main entity tables (e.g., `T_pengajuan_kerjasama`, `T_mitra`).
    - `M_`: Many-to-many mapping tables (e.g., `M_mitra_bekerjasama`, `M_kegiatan_kerjasama`).
    - `N_`: Nomenclature or reference tables (e.g., `N_prodi`, `N_kabupaten_kota`).
- **Data Ingestion (`data_handler.py`):** Python script to download and join data from Google Sheets using Pandas and Selenium.
- **Visualization (Web - `fungsi/main_table/`):** A Next.js application (React 19, Tailwind CSS 4) providing an interactive, searchable, and filterable dashboard.
- **Visualization (Offline - `buat_html_offline.py`):** Generates `Tabel_Offline_Share.html`, a self-contained HTML file using Vue.js and Tailwind CSS for portability without a server.
- **Analysis Modules (`fungsi/`):** Specialized scripts for analyzing specific aspects like partner distribution, study program (prodi) involvement, and submission (pengajuan) trends.

## Tech Stack
- **Languages:** Python 3, TypeScript, JavaScript.
- **Data Processing:** Pandas, CSV.
- **Web Frontend:** Next.js (App Router), React, Lucide React, Framer Motion, Tailwind CSS.
- **Offline Frontend:** Vue.js (CDN/Inlined), Tailwind CSS (Inlined).
- **Automation:** Selenium (for Google Sheets export), Requests.

## Building and Running

### Data & Backend (Python)
Ensure Python 3 is installed with required dependencies (`pandas`, `requests`, `selenium`, `webdriver-manager`).

- **Update Data:**
  ```bash
  python data_handler.py
  ```
- **Generate Offline Report:**
  ```bash
  python buat_html_offline.py
  ```

### Web Frontend (Next.js)
Navigate to the frontend directory:
```bash
cd fungsi/main_table
npm install
npm run dev
```
To build for production:
```bash
npm run build
```

## Development Conventions

### Git & GitHub Procedure
- **Remote Repository:** `https://github.com/yosirodotcom/kerjasama.git`
- **User Identity:**
    - Username: `yosirodotcom`
    - Email: `yosironadi@gmail.com`
- **Workflow:**
    - Always verify data integrity before committing.
    - Large binary files (like `.xlsx` or images) should be managed carefully; ensure they are intentionally included if required for reports.
    - Use descriptive commit messages in English or Indonesian.

### Data Schema
The database structure is documented in `schema.txt` using **DBML (Database Markup Language)**. Refer to this file for table relationships and field definitions.

### Coding Style
- **Python:** Use Pandas for data manipulation. Keep data processing logic centralized in `data_handler.py` or within specific `fungsi/` subdirectories.
- **Frontend:**
    - Prefer **Vanilla CSS** or **Tailwind CSS** for styling (Tailwind 4 is used in the main table).
    - Use a **Dark Theme** (Slate/Indigo color palette) for consistency across web and offline versions.
    - Components should be modular (e.g., `DataTable.tsx` handles table logic, filtering, and sorting).

### Naming Conventions
- CSV files and table references must strictly follow the `T_`, `M_`, `N_` prefix system.
- Indonesian is primarily used for business logic terms (e.g., `kerjasama`, `pengajuan`, `mitra`), while code structure follows standard English conventions.

## Project Structure
- `data/`: Local CSV storage.
- `fungsi/`: Sub-projects and analysis modules.
    - `main_table/`: Primary Next.js web application.
    - `analisis_mitra/`: Partner-specific analysis.
    - `analisis_pengajuan/`: Submission-specific analysis.
- `schema.txt`: DBML database schema.
- `data_handler.py`: Core data synchronization and joining logic.
- `buat_html_offline.py`: Static report generator.
