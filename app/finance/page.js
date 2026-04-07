'use client';
import SheetsTab from './SheetsTab';

export default function FinancePage() {
  return (
    <div style={{ padding: '24px', maxWidth: '960px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '24px' }}>Finance</h2>
      <SheetsTab />
    </div>
  );
}
