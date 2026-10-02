export interface Competition {
  id: number;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  status: string;
  venue_name: string | null;
  organizer_name: string | null;
  tournament_format: string | null;
  scoring_system: string | null;
  requires_approval: boolean;
  allow_waitlist: boolean;
  round_count: number;
  schedule_text: string | null;
  awards_text: string | null;
  eligibility_text: string | null;
  registration_method: string | null;
  registration_deadline: string | null;
  time_control: string | null;
  late_policy: string | null;
  arbiter_policy: string | null;
  rules_text: string | null;
  category_count: number;
  registration_count: number;
  pending_count: number;
  total_capacity: number;
  confirmed_signups: number;
  pending_signups: number;
  attended_count: number;
  is_archived: boolean;
}

export interface Category {
  id: number;
  name: string;
  capacity: number;
  registration_fee: string;
  min_age: number | null;
  max_age: number | null;
  registration_closed?: boolean;
  current_user_registration_status?: string | null;
}

export interface CompetitionDetail extends Competition {
  categories: Category[];
  registration_opens_at: string | null;
  registration_closes_at: string | null;
}

export interface Registration {
  id: number;
  status: string;
  attended: boolean;
  user_id: number;
  participant_name: string;
  participant_email: string;
  category_id: number;
  category_name: string;
  competition_id: number;
  competition_title: string;
  competition_start_date: string;
  participant_username?: string | null;
  participant_role?: string | null;
  school?: string | null;
  rank_type?: string | null;
  rank_value?: number | null;
}

export interface EventItem {
  id: number;
  title: string;
  description: string;
  event_date: string;
  registration_deadline: string | null;
  venue: string | null;
  capacity: number;
  status: string;
  requires_approval: boolean;
  pinned: boolean;
  is_archived: boolean;
  created_at: string;
  registered: number;
  pending_requests: number;
  active_signups: number;
  attended: number;
  current_user_registration_status: string | null;
  reaction_counts: Record<string, number>;
  current_user_reaction: string | null;
  comment_count: number;
}

export interface EventComment {
  id: number;
  event_id: number;
  user_id: number;
  user_name: string;
  user_role: string;
  comment_text: string;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
  is_owner: boolean;
  can_edit: boolean;
  can_delete_own: boolean;
}

export interface EventRegistration {
  id: number;
  status: string;
  attended: boolean;
  event_id: number;
  member_name: string;
  member_email: string;
  event_title: string;
  event_date: string;
  requires_approval: boolean;
  member_username?: string | null;
  member_role?: string | null;
  school?: string | null;
  rank_type?: string | null;
  rank_value?: number | null;
}

export interface SelectOption {
  id: number;
  name: string;
}

export interface OptionsResponse {
  venues: SelectOption[];
  tournament_formats: SelectOption[];
  scoring_systems: SelectOption[];
}

export interface CurrentUser {
  id: number;
  name: string;
  username: string;
  email: string;
  role: string;
  active?: boolean;
  status?: string;
  emailVerified?: boolean;
  authProvider?: string;
}

export interface ManagedUser {
  id: number;
  name: string;
  username: string | null;
  email: string;
  role: string;
  active: boolean;
  status: string;
  emailVerified: boolean;
  authProvider: string;
  createdAt: string;
}

export interface NamedTotal {
  name?: string;
  role?: string;
  status?: string;
  total: number;
}

export interface CapacityPoint {
  id: number;
  title: string;
  capacity: number;
  demand: number;
  confirmed: number;
  fill_rate: number;
}

export interface CategoryDemandPoint {
  competition_title: string;
  category_name: string;
  capacity: number;
  demand: number;
  confirmed: number;
  pending: number;
}

export interface RegistrationTrendPoint {
  registration_date: string;
  total: number;
}

export interface VenueUtilizationPoint {
  venue_name: string;
  competition_count: number;
  total_capacity: number;
  total_demand: number;
}

export interface EventPopularityPoint {
  id: number;
  title: string;
  capacity: number;
  registered: number;
  pending: number;
  attended: number;
  fill_rate: number;
}

export interface AttendancePoint {
  title: string;
  registered: number;
  attended: number;
  attendance_rate: number;
}

export interface DashboardStats {
  total_users: number;
  active_members: number;
  inactive_users: number;
  verified_users: number;
  unverified_users: number;
  verification_rate: number;
  total_events: number;
  open_events: number;
  draft_events: number;
  cancelled_events: number;
  pinned_events: number;
  upcoming_events: number;
  archived_events: number;
  open_event_capacity: number;
  approval_required_events: number;
  total_registrations: number;
  approved_registrations: number;
  pending_registrations: number;
  rejected_registrations: number;
  total_attended: number;
  attendance_rate: number;
  approval_rate: number;
  most_popular_event: string | null;
  role_breakdown: NamedTotal[];
  user_status_breakdown: NamedTotal[];
  registration_status_breakdown: NamedTotal[];
  event_comment_count: number;
  event_reaction_count: number;
  notification_count: number;
  unread_notification_count: number;
  total_competitions: number;
  open_competitions: number;
  draft_competitions: number;
  in_progress_competitions: number;
  completed_competitions: number;
  cancelled_competitions: number;
  upcoming_competitions: number;
  archived_competitions: number;
  total_categories: number;
  total_competition_capacity: number;
  total_competition_registrations: number;
  pending_competition_registrations: number;
  approved_competition_registrations: number;
  waitlisted_competition_registrations: number;
  rejected_competition_registrations: number;
  attended_competition_registrations: number;
  competition_approval_rate: number;
  competition_attendance_rate: number;
  total_competition_rounds: number;
  open_competition_rounds: number;
  total_competition_matches: number;
  scheduled_competition_matches: number;
  completed_competition_matches: number;
  ranking_snapshot_count: number;
  competition_status_breakdown: NamedTotal[];
  format_breakdown: NamedTotal[];
  competition_registration_funnel: NamedTotal[];
  competition_capacity: CapacityPoint[];
  category_demand: CategoryDemandPoint[];
  registrations_over_time: RegistrationTrendPoint[];
  venue_utilization: VenueUtilizationPoint[];
  event_popularity: EventPopularityPoint[];
  attendance_by_event: AttendancePoint[];
  competition_attendance: AttendancePoint[];
}

export interface MemberActivityStat {
  activity_type: 'Event' | 'Competition';
  title: string;
  detail: string | null;
  activity_date: string;
  venue: string | null;
  status: string;
  attended: boolean;
}

export interface MemberTrendPoint {
  month: string;
  total: number;
}

export interface MemberRecentMatch {
  competition_title: string;
  category_name: string;
  round_number: number;
  table_number: number;
  opponent_name: string | null;
  outcome: string;
  completed_at: string | null;
}

export interface MemberCompetitionAchievement {
  competition_title: string;
  category_name: string;
  round_number: number;
  rank_position: number;
}

export interface MemberStats {
  approved_registrations: number;
  attended_count: number;
  attendance_rate: number;
  competition_matches_played: number;
  competition_match_wins: number;
  competition_win_rate: number;
  first_place_count: number;
  top10_count: number;
  events_created: number;
  competitions_organized: number;
  monthly_activity: MemberTrendPoint[];
  recent_matches: MemberRecentMatch[];
  competition_achievements: MemberCompetitionAchievement[];
  upcoming_activities: MemberActivityStat[];
}

export interface UserSettings {
  notifyRegistrationUpdate: boolean;
  notifyEventReminder: boolean;
  notifyAttendanceMarked: boolean;
  defaultRequiresApproval: boolean;
  defaultEventCapacity: number;
  defaultCompetitionVenue: string;
}

export interface NotificationResult {
  sent: number;
  skipped: number;
  inApp?: number;
}

export interface AppNotification {
  id: number;
  title: string;
  message: string;
  type: string;
  activity_type: string | null;
  activity_id: number | null;
  read_at: string | null;
  created_at: string;
}

export interface AttendanceChangeRequest {
  id: number;
  activity_type: 'Event' | 'Competition';
  registration_id: number;
  requested_attended: boolean;
  reason: string | null;
  status: string;
  created_at: string;
  requester_name: string;
  requester_email: string;
  member_name: string;
  member_email: string;
  activity_title: string;
  activity_date: string;
  category_name: string | null;
  current_attended: boolean;
}

export interface MyActivity {
  activity_type: 'Event' | 'Competition';
  activity_id: number;
  title: string;
  description: string;
  activity_date: string;
  venue: string | null;
  status: string;
  attended: boolean;
  category_name: string | null;
}

export interface TournamentStanding {
  user_id: number;
  player_number: number;
  name: string;
  school: string | null;
  rank_type: string | null;
  rank_value: number | null;
  mms: number;
  sos: number;
  sosos: number;
  wins: number;
  losses: number;
  byes: number;
  rank_position: number;
  rounds: Record<string, string>;
}

export interface TournamentMatch {
  id: number;
  round_id: number;
  round_number: number;
  table_number: number;
  black_user_id: number | null;
  white_user_id: number | null;
  black_name: string | null;
  white_name: string | null;
  handicap: number;
  result: string;
}

export interface TournamentRound {
  id: number;
  category_id: number;
  round_number: number;
  status: string;
}

export interface TournamentCategory {
  id: number;
  name: string;
  capacity: number;
  player_count: number;
  standings: TournamentStanding[];
  rounds: TournamentRound[];
  matches: TournamentMatch[];
  insights: {
    completed_matches: number;
    scheduled_matches: number;
    completion_rate: number;
    tied_leaders: number;
    no_result_matches: number;
  };
}

export interface TournamentData {
  categories: TournamentCategory[];
}

export type DashboardView = 'analytics' | 'events' | 'my-events' | 'event-create' | 'competitions' | 'competition-create' | 'drafts' | 'attendance' | 'members' | 'users' | 'settings';
