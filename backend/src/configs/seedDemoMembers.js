const bcrypt = require("bcrypt");
const db = require("../services/db");

const memberNames = [
  "Aarav Tan",
  "Beatrice Lim",
  "Chen Wei",
  "Danish Rahman",
  "Emily Koh",
  "Farhan Aziz",
  "Grace Ong",
  "Hannah Lee",
  "Isaac Ng",
  "Jia Xin",
  "Kai Wen",
  "Liyana Noor",
  "Marcus Teo",
  "Natalie Goh",
  "Oscar Chua",
  "Priya Nair",
  "Qian Yu",
  "Ryan Foo",
  "Sarah Wong",
  "Timothy Low",
  "Uma Devi",
  "Victor Seah",
  "Wei Jie",
  "Xin Yi",
  "Yasmin Binte",
  "Zachary Ho",
  "Adeline Sim",
  "Brandon Yeo",
  "Clara Tay",
  "Darren Quek",
];

const statuses = ["Registered", "Registered", "Registered", "Pending Approval", "Registered", "Rejected"];

const insertDemoMembers = async () => {
  const passwordHash = await bcrypt.hash("member123", 10);
  const insertedUsers = [];

  for (let index = 0; index < memberNames.length; index += 1) {
    const number = String(index + 1).padStart(2, "0");
    const name = memberNames[index];
    const username = `demo_member_${number}`;
    const email = `demo.member${number}@example.com`;

    const result = await db.query(
      `
        INSERT INTO users (name, username, email, password_hash, role, active, status, email_verified, auth_provider)
        VALUES ($1, $2, $3, $4, 'Member', TRUE, 'Active', TRUE, 'local')
        ON CONFLICT (email) DO UPDATE SET
          name = EXCLUDED.name,
          username = EXCLUDED.username,
          password_hash = EXCLUDED.password_hash,
          role = 'Member',
          active = TRUE,
          status = 'Active',
          email_verified = TRUE,
          auth_provider = 'local'
        RETURNING id, name, username, email;
      `,
      [name, username, email, passwordHash]
    );

    insertedUsers.push(result.rows[0]);
  }

  await db.query(`
    INSERT INTO user_roles (user_id, role_id)
    SELECT u.id, r.id
    FROM users u
    JOIN roles r ON r.name = u.role
    WHERE u.email LIKE 'demo.member%@example.com'
    ON CONFLICT DO NOTHING;
  `);

  return insertedUsers;
};

const seedEventRegistrations = async (users) => {
  const events = await db.query("SELECT id FROM events ORDER BY event_date, id;");

  for (let userIndex = 0; userIndex < users.length; userIndex += 1) {
    for (let eventIndex = 0; eventIndex < events.rows.length; eventIndex += 1) {
      if ((userIndex + eventIndex) % 3 === 0) {
        continue;
      }

      const status = statuses[(userIndex + eventIndex) % statuses.length];
      const attended = false;

      await db.query(
        `
          INSERT INTO event_registrations (user_id, event_id, status, attended)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (user_id, event_id) DO UPDATE SET
            status = EXCLUDED.status,
            attended = EXCLUDED.attended;
        `,
        [users[userIndex].id, events.rows[eventIndex].id, status, attended]
      );
    }
  }
};

const seedCompetitionRegistrations = async (users) => {
  const categories = await db.query(`
    SELECT cc.id, cc.capacity
    FROM competition_categories cc
    JOIN competitions c ON c.id = cc.competition_id
    ORDER BY c.start_date, cc.id;
  `);

  if (categories.rows.length === 0) {
    return;
  }

  for (let userIndex = 0; userIndex < users.length; userIndex += 1) {
    const primaryCategory = categories.rows[userIndex % categories.rows.length];
    const secondaryCategory = categories.rows[(userIndex + 1) % categories.rows.length];
    const selectedCategories = userIndex % 5 === 0
      ? [primaryCategory, secondaryCategory]
      : [primaryCategory];

    for (let categoryIndex = 0; categoryIndex < selectedCategories.length; categoryIndex += 1) {
      const status = statuses[(userIndex + categoryIndex) % statuses.length];
      const attended = false;

      await db.query(
        `
          INSERT INTO competition_registrations (user_id, category_id, status, attended, registered_at)
          VALUES ($1, $2, $3, $4, NOW() - ($5::int * INTERVAL '1 day'))
          ON CONFLICT (user_id, category_id) DO UPDATE SET
            status = EXCLUDED.status,
            attended = EXCLUDED.attended,
            registered_at = EXCLUDED.registered_at;
        `,
        [users[userIndex].id, selectedCategories[categoryIndex].id, status, attended, userIndex % 14]
      );
    }
  }
};

module.exports = async function seedDemoMembers() {
  const users = await insertDemoMembers();
  await seedEventRegistrations(users);
  await seedCompetitionRegistrations(users);

  console.log(`Seeded ${users.length} demo members.`);
  console.log("Demo member login pattern: demo_member_01 / member123");
  console.log("Demo member emails use demo.member01@example.com through demo.member30@example.com.");
};
