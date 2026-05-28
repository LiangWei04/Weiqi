import React from 'react';
import apiClient from '../../utils/apiClient';
import type { CurrentUser, UserSettings } from '../../types/dashboard';
import FormInput from '../shared/FormInput';
import PermissionCard from '../shared/PermissionCard';

const SettingsPanel = ({
  currentUser,
  settings,
  canManageDefaults,
  onProfileUpdated,
  onSettingsUpdated,
  onMessage,
  onDeactivate,
}: {
  currentUser: CurrentUser | null;
  settings: UserSettings;
  canManageDefaults: boolean;
  onProfileUpdated: (user: CurrentUser, message: string) => void;
  onSettingsUpdated: (settings: UserSettings, message: string) => void;
  onMessage: (message: string) => void;
  onDeactivate: () => void;
}) => {
  const [profileForm, setProfileForm] = React.useState({
    name: currentUser?.name || '',
    username: currentUser?.username || '',
  });
  const [passwordForm, setPasswordForm] = React.useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [settingsForm, setSettingsForm] = React.useState<UserSettings>(settings);

  React.useEffect(() => {
    setProfileForm({
      name: currentUser?.name || '',
      username: currentUser?.username || '',
    });
  }, [currentUser?.name, currentUser?.username]);

  React.useEffect(() => {
    setSettingsForm(settings);
  }, [settings]);

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    const response = await apiClient.put<CurrentUser>('/users/me/profile', profileForm);
    onProfileUpdated(response.data, 'Profile updated.');
  };

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      onMessage('New password and confirmation do not match.');
      return;
    }

    await apiClient.put('/users/me/password', {
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    onMessage('Password updated.');
  };

  const saveSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    const response = await apiClient.put<UserSettings>('/users/me/settings', settingsForm);
    onSettingsUpdated(response.data, 'Settings saved.');
  };

  const resendVerification = async () => {
    const response = await apiClient.post<{ message: string; verificationLink?: string }>('/users/me/resend-verification');
    onMessage(response.data.verificationLink ? `${response.data.message}: ${response.data.verificationLink}` : response.data.message);
  };

  return (
    <section id="settings" className="settings-page">
      <div className="settings-grid">
        <form className="panel settings-panel" onSubmit={saveProfile}>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Profile</p>
              <h2>Account Details</h2>
            </div>
          </div>
          <div className="form-grid">
            <FormInput label="Name" value={profileForm.name} onChange={(name) => setProfileForm({ ...profileForm, name })} required />
            <FormInput label="Username" value={profileForm.username} onChange={(username) => setProfileForm({ ...profileForm, username })} required />
          </div>
          <div className="settings-readonly-grid">
            <ReadonlySetting label="Email" value={currentUser?.email || '-'} />
            <ReadonlySetting label="Role" value={currentUser?.role || '-'} />
            <ReadonlySetting label="Status" value={currentUser?.status || 'Active'} />
            <ReadonlySetting label="Provider" value={currentUser?.authProvider || 'local'} />
          </div>
          <button type="submit" className="primary-action compact">Save Profile</button>
        </form>

        <form className="panel settings-panel" onSubmit={changePassword}>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Security</p>
              <h2>Password & Verification</h2>
            </div>
          </div>
          <div className="settings-row">
            <span>
              <strong>Email verification</strong>
              <small>{currentUser?.emailVerified ? 'Your email is verified.' : 'Verify your email before relying on account recovery.'}</small>
            </span>
            <button type="button" className="secondary-action compact" onClick={resendVerification} disabled={currentUser?.emailVerified}>
              Resend Email
            </button>
          </div>
          <div className="form-grid">
            <FormInput label="Current Password" type="password" value={passwordForm.currentPassword} onChange={(currentPassword) => setPasswordForm({ ...passwordForm, currentPassword })} required />
            <FormInput label="New Password" type="password" value={passwordForm.newPassword} onChange={(newPassword) => setPasswordForm({ ...passwordForm, newPassword })} required />
            <FormInput label="Confirm New Password" type="password" value={passwordForm.confirmPassword} onChange={(confirmPassword) => setPasswordForm({ ...passwordForm, confirmPassword })} required />
          </div>
          <button type="submit" className="primary-action compact">Change Password</button>
        </form>

        <form className="panel settings-panel" onSubmit={saveSettings}>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Notifications</p>
              <h2>Preferences</h2>
            </div>
          </div>
          <div className="settings-toggle-list">
            <ToggleSetting label="Registration updates" detail="Email me when my registration is approved or rejected." checked={settingsForm.notifyRegistrationUpdate} onChange={(value) => setSettingsForm({ ...settingsForm, notifyRegistrationUpdate: value })} />
            <ToggleSetting label="Event reminders" detail="Email me before upcoming events or competitions." checked={settingsForm.notifyEventReminder} onChange={(value) => setSettingsForm({ ...settingsForm, notifyEventReminder: value })} />
            <ToggleSetting label="Attendance updates" detail="Email me when attendance is marked for my account." checked={settingsForm.notifyAttendanceMarked} onChange={(value) => setSettingsForm({ ...settingsForm, notifyAttendanceMarked: value })} />
          </div>

          <div className="settings-subsection">
            <p className="eyebrow">Defaults</p>
            <div className="form-grid">
              <FormInput label="Default Event Capacity" type="number" value={String(settingsForm.defaultEventCapacity)} onChange={(defaultEventCapacity) => setSettingsForm({ ...settingsForm, defaultEventCapacity: Number(defaultEventCapacity) || 1 })} required />
              <FormInput label="Default Competition Venue" value={settingsForm.defaultCompetitionVenue} onChange={(defaultCompetitionVenue) => setSettingsForm({ ...settingsForm, defaultCompetitionVenue })} />
            </div>
            <ToggleSetting label="Require approval by default" detail="Use this as your preferred default when creating activities." checked={settingsForm.defaultRequiresApproval} onChange={(value) => setSettingsForm({ ...settingsForm, defaultRequiresApproval: value })} disabled={!canManageDefaults} />
          </div>
          <button type="submit" className="primary-action compact">Save Preferences</button>
        </form>

        <section className="panel settings-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">System</p>
              <h2>Role Permissions</h2>
            </div>
          </div>
          <div className="permission-grid settings-permission-grid">
            <PermissionCard role="Captain" permissions="Users, roles, events, competitions, approvals, attendance" />
            <PermissionCard role="Vice-Captain" permissions="Attendance marking only" />
            <PermissionCard role="Secretary" permissions="Events, competitions, registration approvals, member records" />
            <PermissionCard role="Member" permissions="View events, view competitions, register" />
          </div>
        </section>

        <section className="panel settings-panel danger-zone">
          <div className="settings-row">
            <span>
              <strong>Deactivate account</strong>
              <small>This marks your account inactive and logs you out. Captains can still see the inactive record.</small>
            </span>
            <button type="button" className="danger-action" onClick={onDeactivate}>Deactivate My Account</button>
          </div>
        </section>
      </div>
    </section>
  );
};

const ReadonlySetting = ({ label, value }: { label: string; value: string }) => (
  <div>
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);

const ToggleSetting = ({
  label,
  detail,
  checked,
  disabled = false,
  onChange,
}: {
  label: string;
  detail: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) => (
  <label className={disabled ? 'settings-toggle disabled' : 'settings-toggle'}>
    <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
    <span>
      <strong>{label}</strong>
      <small>{detail}</small>
    </span>
  </label>
);

export default SettingsPanel;
