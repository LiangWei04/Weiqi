const PermissionCard = ({ role, permissions }: { role: string; permissions: string }) => (
  <article className="permission-card">
    <strong>{role}</strong>
    <span>{permissions}</span>
  </article>
);

export default PermissionCard;
