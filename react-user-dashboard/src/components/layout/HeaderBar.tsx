interface HeaderBarProps {
  eyebrow: string;
  title: string;
  role: string;
  currentUser: {
    name: string;
    email: string;
  } | null;
  actions: React.ReactNode;
}

const HeaderBar = ({ title, role, currentUser, actions }: HeaderBarProps) => (
  <header className="topbar">
    <div>
      <h1>{title}</h1>
      {currentUser && <small>{currentUser.name} - {currentUser.email}</small>}
    </div>
    <div className="topbar-actions"><span className="header-role">{role}</span>{actions}</div>
  </header>
);

export default HeaderBar;
