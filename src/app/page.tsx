import { loadData } from '@/lib/data';
import DataTable from '@/components/DataTable';

export default function Home() {
  const data = loadData();

  return (
    <main>
      <DataTable data={data} />
    </main>
  );
}
