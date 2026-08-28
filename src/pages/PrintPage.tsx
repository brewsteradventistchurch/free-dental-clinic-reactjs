const printOptions = [
  {
    title: "Registration list",
    description: "All patients registered for the current clinic.",
    count: "124 patients",
  },
  {
    title: "Provider list",
    description: "Patients organized by assigned provider.",
    count: "18 appointments",
  },
  {
    title: "Waiting list",
    description: "Patients currently waiting to be seen.",
    count: "37 patients",
  },
];

export default function PrintPage() {
  function handlePrint() {
    window.print();
  }

  return (
    <div>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Clinic documents</span>
          <h1>Print</h1>
          <p>Generate lists for volunteers and providers.</p>
        </div>
      </div>

      <div className="print-grid">
        {printOptions.map((option) => (
          <div className="print-card" key={option.title}>
            <div className="print-icon">▣</div>

            <h2>{option.title}</h2>
            <p>{option.description}</p>

            <span>{option.count}</span>

            <button className="button primary" onClick={handlePrint}>
              Print list
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}