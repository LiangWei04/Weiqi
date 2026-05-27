const AccessNotice = ({ label }: { label: string }) => (
  <section className="panel alert-panel">
    <h2>{label}</h2>
    <p>This page is only available to users with the required committee permission.</p>
  </section>
);

export default AccessNotice;
