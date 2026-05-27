import { NavLink } from 'react-router-dom';
import type { MyActivity } from '../../types/dashboard';
import { formatDate } from '../../utils/formatters';

const MyEventsPanel = ({ activities }: { activities: MyActivity[] }) => (
  <section className="panel large-panel">
    <div className="panel-heading">
      <div>
        <p className="eyebrow">My activity</p>
        <h2>Registered Events & Competitions</h2>
      </div>
      <NavLink to="/events" className="secondary-action compact">Browse Events</NavLink>
    </div>
    <div className="event-grid">
      {activities.map((activity) => (
        <article className="event-card" key={`${activity.activity_type}-${activity.activity_id}`}>
          <span className="status-pill">{activity.status}</span>
          <h3>{activity.title}</h3>
          <p>{activity.description || activity.category_name || 'No description added yet.'}</p>
          <dl className="detail-grid compact-details">
            <div><dt>Type</dt><dd>{activity.activity_type}</dd></div>
            <div><dt>Date</dt><dd>{formatDate(activity.activity_date)}</dd></div>
            <div><dt>Venue</dt><dd>{activity.venue || '-'}</dd></div>
            <div><dt>Attendance</dt><dd>{activity.attended ? 'Present' : 'Not marked'}</dd></div>
            {activity.category_name && <div><dt>Category</dt><dd>{activity.category_name}</dd></div>}
          </dl>
        </article>
      ))}
      {activities.length === 0 && <p className="empty-state">You do not have any upcoming registered activities.</p>}
    </div>
  </section>
);

export default MyEventsPanel;
