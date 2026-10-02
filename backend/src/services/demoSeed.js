const fs = require("node:fs");
const path = require("node:path");
const { recordRankingSnapshot } = require("../models/competitionModel");
const ddl = fs.readFileSync(path.join(__dirname, "../../DDL.sql"), "utf8");
const audit = fs.readFileSync(path.join(__dirname, "../configs/attendanceRequestAudit.sql"), "utf8")
  .replace(/^BEGIN;\s*$/m, "").replace(/^COMMIT;\s*$/m, "");

module.exports = async (client) => {
  await client.query(ddl);
  await client.query(audit);
  const names = ['Demo Member', 'Avery Tan', 'Blair Lim', 'Casey Ng', 'Devon Lee', 'Ellis Goh', 'Finley Koh', 'Harper Teo', 'Jamie Low', 'Morgan Yeo', 'Quinn Foo', 'Riley Chua'];
  const organiser = (await client.query("INSERT INTO users(name,username,email,role,status,email_verified) VALUES ('Demo Organiser','organiser','organiser@example.com','Captain','Active',true) RETURNING id")).rows[0].id;
  const secretary = (await client.query("INSERT INTO users(name,username,email,role,status,email_verified) VALUES ('Demo Secretary','secretary','secretary@example.com','Secretary','Active',true) RETURNING id")).rows[0].id;
  const members = [];
  for (const [index, name] of names.entries()) {
    const id = (await client.query("INSERT INTO users(name,username,email,role,status,email_verified) VALUES ($1,$2,$3,'Member','Active',true) RETURNING id", [name, `member${index}`, `member${index}@example.com`])).rows[0].id;
    members.push(id);
    await client.query("INSERT INTO player_profiles(user_id,school,rank_type,rank_value) VALUES ($1,'Fictional Academy','Kyu',$2)", [id, index + 1]);
  }
  await client.query("INSERT INTO user_settings(user_id) SELECT id FROM users");
  const venue = (await client.query("INSERT INTO venues(name,address,capacity) VALUES ('Demo Club Room','Fictional campus',24) RETURNING id")).rows[0].id;
  const eventIds = [];
  for (const [title, offset, status, approval] of [['Beginner Workshop',7,'Open',true],['Open Board Practice',3,'Open',false],['Last Week’s Practice',-7,'Completed',false]]) {
    const id = (await client.query(`INSERT INTO events(title,description,event_date,registration_deadline,venue_id,capacity,status,requires_approval,created_by)
      VALUES ($1,'A fictional club activity for the interactive demo.',CURRENT_DATE + $2::integer,CURRENT_DATE + $2::integer - 1,$3,24,$4,$5,$6) RETURNING id`, [title,offset,venue,status,approval,organiser])).rows[0].id;
    eventIds.push(id);
    for (const member of [organiser, ...members.slice(title === 'Beginner Workshop' ? 1 : 0, 7)]) {
      await client.query("INSERT INTO event_registrations(user_id,event_id,status,attended) VALUES ($1,$2,'Registered',$3)", [member,id,offset < 0 && member !== members[0]]);
    }
  }
  // Give the charts a real fictional history instead of a single creation-day spike.
  for (const [week, title] of ['Opening Moves Clinic', 'Reading & Life-and-Death', 'Handicap Games Evening', 'Endgame Workshop', 'Friendly Ladder Night'].entries()) {
    const offset = [-155, -126, -96, -64, -35][week];
    const id = (await client.query(`INSERT INTO events(title,description,event_date,registration_deadline,venue_id,capacity,status,requires_approval,created_by,created_at)
      VALUES ($1,$2,CURRENT_DATE+$3::integer,CURRENT_DATE+$3::integer-1,$4,16,'Completed',false,$5,now()+($3::integer-10)*interval '1 day') RETURNING id`,
    [title,'A past fictional club session: guided play, paired games and a group review.',offset,venue,organiser])).rows[0].id;
    await client.query(`INSERT INTO event_registrations(user_id,event_id,status,attended,created_at)
      VALUES ($1,$2,'Registered',$3,now()+$4::integer*interval '1 day')`, [organiser,id,week !== 1,offset-5]);
    for (let index = 0; index < 7 + week; index++) {
      await client.query(`INSERT INTO event_registrations(user_id,event_id,status,attended,created_at)
        VALUES ($1,$2,'Registered',$3,now()+$4::integer*interval '1 day')`,
      [members[index],id,index % 5 !== week % 5,offset-7+index%6]);
    }
  }
  await client.query(`UPDATE event_registrations r SET created_at = LEAST(now()-interval '2 hours',e.event_date::timestamp-interval '4 days'-(r.user_id%5)*interval '1 day')
    FROM events e WHERE r.event_id=e.id AND e.id=ANY($1::integer[])`, [eventIds]);
  await client.query(`UPDATE events SET created_at=event_date::timestamp-interval '14 days' WHERE id=ANY($1::integer[])`, [eventIds]);
  const pastRegistration = (await client.query("SELECT id FROM event_registrations WHERE user_id=$1 AND event_id=$2", [members[0],eventIds[2]])).rows[0].id;
  const request = (await client.query(`INSERT INTO attendance_change_requests(event_registration_id,requested_attended,reason,requested_by)
    VALUES ($1,true,'The demo member attended, but their attendance was missed at check-in.',$2) RETURNING id`, [pastRegistration,secretary])).rows[0].id;
  const format = (await client.query("INSERT INTO tournament_formats(name,description) VALUES ('Swiss','Pair players across rounds') RETURNING id")).rows[0].id;
  const scoring = (await client.query("INSERT INTO scoring_systems(name,win_points,loss_points) VALUES ('Standard Win/Loss',1,0) RETURNING id")).rows[0].id;
  const competitions = [];
  const categories = [];
  for (const [competitionIndex, [title, offset]] of [
    ['Demo Club Cup', 0], ['Completed Friendly Cup', -15],
    ['Summer Ladder Cup', -65], ['Spring Open Cup', -125],
  ].entries()) {
    const completed = competitionIndex > 0;
    const players = completed ? [...members.slice(0,7), organiser] : members.slice(0,8);
    const competition = (await client.query(`INSERT INTO competitions(title,description,organizer_id,venue_id,start_date,end_date,status)
      VALUES ($1,'Eight fictional players. Explore pairings, results and standings.',$2,$3,CURRENT_DATE + $4::integer,CURRENT_DATE + $4::integer + 1,$5) RETURNING id`,
    [title,organiser,venue,offset,completed ? 'Completed' : 'In Progress'])).rows[0].id;
    competitions.push(competition);
    const category = (await client.query("INSERT INTO competition_categories(competition_id,name,capacity) VALUES ($1,'Open',8) RETURNING id", [competition])).rows[0].id;
    categories.push(category);
    await client.query("INSERT INTO competition_settings(competition_id,tournament_format_id,scoring_system_id,round_count) VALUES ($1,$2,$3,3)", [competition,format,scoring]);
    for (const [index,member] of players.entries()) {
      await client.query("INSERT INTO competition_registrations(user_id,category_id,status,attended,seed_number) VALUES ($1,$2,'Registered',true,$3)", [member,category,index+1]);
    }
    for (let roundNumber = 1; roundNumber <= (completed ? 3 : 2); roundNumber++) {
      const round = (await client.query("INSERT INTO competition_rounds(competition_id,category_id,round_number,status,generated_by) VALUES ($1,$2,$3,$4,$5) RETURNING id", [competition,category,roundNumber,completed || roundNumber === 1 ? 'Completed' : 'In Progress',organiser])).rows[0].id;
      const pairs = roundNumber === 1 ? [[0,1],[2,3],[4,5],[6,7]] : roundNumber === 2 ? [[0,2],[1,3],[4,6],[5,7]] : [[0,4],[1,5],[2,6],[3,7]];
      for (const [index,[black,white]] of pairs.entries()) {
        const done = completed || roundNumber === 1 || index < 3;
        const whiteWins = completed && (roundNumber === 2 ? index % 2 === (competitionIndex + 1) % 2 : index === 3);
        const result = done ? (whiteWins ? 'White Win' : 'Black Win') : 'Scheduled';
        await client.query(`INSERT INTO competition_matches(competition_id,category_id,round_id,table_number,black_user_id,white_user_id,result,winner_user_id,completed_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,CASE WHEN $8::integer IS NULL THEN NULL ELSE now()+$9::integer*interval '1 day' END)`, [competition,category,round,index+1,players[black],players[white],result,done ? players[whiteWins ? white : black] : null,offset]);
      }
    }
  }
  // Reuse the application standings calculation on the sandbox's transaction client.
  for (let index = 0; index < competitions.length; index++) {
    await recordRankingSnapshot({ competition_id: competitions[index], category_id: categories[index] }, client);
  }
  await client.query(`UPDATE competition_rounds r SET generated_at=c.start_date::timestamp + (r.round_number-1)*interval '1 hour'
    FROM competitions c WHERE r.competition_id=c.id`);
  await client.query(`UPDATE competition_ranking_records rr SET recorded_at=c.end_date::timestamp
    FROM competitions c WHERE rr.competition_id=c.id AND c.status='Completed'`);
  await client.query(`UPDATE competition_registrations r SET registered_at=c.start_date::timestamp-interval '3 days'-(r.user_id%7)*interval '1 day'
    FROM competition_categories cat JOIN competitions c ON c.id=cat.competition_id WHERE r.category_id=cat.id`);
  await client.query("INSERT INTO notifications(user_id,title,message,type) VALUES ($1,'Attendance correction to review','Open the attendance scenario to review a missed check-in.','Attendance'),($2,'Welcome to the club','Try joining the Beginner Workshop.','Activity')", [organiser,members[0]]);
  return { organiser, member: members[0], workshop: eventIds[0], pastEvent: eventIds[2], attendanceRequest: request, activeCompetition: competitions[0], activeCategory: categories[0] };
};
