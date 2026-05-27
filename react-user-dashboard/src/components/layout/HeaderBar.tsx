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

const HeaderBar = ({ eyebrow, title, role, currentUser, actions }: HeaderBarProps) => (
  <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
    <div>
      <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-app-cyan">{eyebrow}</p>
      <h1 className="m-0 text-3xl font-black tracking-normal text-white">{title}</h1>
      {currentUser && <small className="mt-1 block text-sm font-bold text-app-muted">{currentUser.name} - {currentUser.email}</small>}
    </div>
    <div className="flex flex-wrap items-center gap-2.5">
      <div className="flex items-center gap-2 rounded-xl border border-app-border bg-app-surface px-3 py-2 text-sm font-extrabold text-app-muted">
        <span>Signed in as</span>
        <strong className="text-app-cyan">{role}</strong>
      </div>
      {actions}
    </div>
  </header>
);

export default HeaderBar;
