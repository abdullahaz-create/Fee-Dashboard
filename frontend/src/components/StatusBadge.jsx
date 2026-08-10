export default function StatusBadge({ status }) {
  const map = {
    PAID:    { label: 'PAID',    cls: 'status-paid'    },
    PARTIAL: { label: 'PARTIAL', cls: 'status-partial' },
    UNPAID:  { label: 'UNPAID',  cls: 'status-unpaid'  },
  };
  const { label, cls } = map[status] || { label: status, cls: '' };
  return <span className={`status-badge ${cls}`}>{label}</span>;
}
