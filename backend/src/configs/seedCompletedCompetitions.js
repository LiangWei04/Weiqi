const db = require("../services/db");
const competitionModel = require("../models/competitionModel");

const sampleCompetitions = [
  {
    title: "Completed Spring Ladder",
    description: "Completed sample competition for member performance analytics.",
    startDate: "2026-02-14",
    endDate: "2026-02-14",
    categoryName: "Open Division",
    participants: 12,
    rounds: 4,
    winnerPattern: "black",
  },
  {
    title: "Completed Youth Rapid Cup",
    description: "Completed sample competition with mixed results for standings and opponent records.",
    startDate: "2026-03-21",
    endDate: "2026-03-21",
    categoryName: "Junior Division",
    participants: 10,
    rounds: 4,
    winnerPattern: "alternating",
  },
  {
    title: "Completed Inter-CCA Friendly",
    description: "Completed team-friendly sample competition for achievement history.",
    startDate: "2026-04-18",
    endDate: "2026-04-18",
    categoryName: "Open Division",
    participants: 14,
    rounds: 5,
    winnerPattern: "seeded",
  },
];

const sampleTitles = sampleCompetitions.map((competition) => competition.title);

const selectDefaultIds = async () => {
  const result = await db.query(`
    SELECT
      (SELECT id FROM users WHERE email = 'admin@example.com' LIMIT 1) AS organizer_id,
      (SELECT id FROM venues WHERE name = 'SWA Training Hall' LIMIT 1) AS venue_id,
      (SELECT id FROM tournament_formats WHERE name = 'Swiss' LIMIT 1) AS tournament_format_id,
      (SELECT id FROM scoring_systems WHERE name = 'Standard Win/Loss' LIMIT 1) AS scoring_system_id;
  `);
  return result.rows[0];
};

const selectDemoParticipants = async (limit) => {
  const result = await db.query(
    `
      SELECT id, name
      FROM users
      WHERE active = TRUE
        AND role = 'Member'
        AND email LIKE 'demo.member%@example.com'
      ORDER BY email
      LIMIT $1;
    `,
    [limit]
  );
  return result.rows;
};

const createCompetition = async (competition, defaults) => {
  const result = await db.query(
    `
      INSERT INTO competitions (
        title,
        description,
        organizer_id,
        venue_id,
        start_date,
        end_date,
        status,
        registration_deadline,
        time_control,
        late_policy,
        arbiter_policy,
        rules_text
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'Completed', $7, $8, $9, $10, $11)
      RETURNING id;
    `,
    [
      competition.title,
      competition.description,
      defaults.organizer_id,
      defaults.venue_id,
      competition.startDate,
      competition.endDate,
      competition.startDate,
      "25 minutes plus 10 seconds increment from Move 1.",
      "Any player who is late by 15 minutes will automatically lose the game.",
      "For any dispute, the Chief Arbiter will make the final decision.",
      "Final name list was checked before the first round. Results are final after arbiter confirmation.",
    ]
  );

  const competitionId = result.rows[0].id;
  await db.query(
    `
      INSERT INTO competition_settings (
        competition_id,
        tournament_format_id,
        scoring_system_id,
        registration_opens_at,
        registration_closes_at,
        requires_approval,
        allow_waitlist,
        round_count
      )
      VALUES ($1, $2, $3, $4::date - INTERVAL '21 days', $4::date - INTERVAL '3 days', TRUE, FALSE, $5);
    `,
    [
      competitionId,
      defaults.tournament_format_id,
      defaults.scoring_system_id,
      competition.startDate,
      competition.rounds,
    ]
  );

  const categoryResult = await db.query(
    `
      INSERT INTO competition_categories (competition_id, name, capacity, registration_fee)
      VALUES ($1, $2, $3, 0)
      RETURNING id;
    `,
    [competitionId, competition.categoryName, Math.max(competition.participants + 4, 16)]
  );

  return {
    competitionId,
    categoryId: categoryResult.rows[0].id,
  };
};

const seedRegistrations = async ({ categoryId, participants, competitionIndex }) => {
  for (let index = 0; index < participants.length; index += 1) {
    await db.query(
      `
        INSERT INTO competition_registrations (
          user_id,
          category_id,
          status,
          attended,
          seed_number,
          initial_mms,
          registered_at
        )
        VALUES ($1, $2, 'Registered', TRUE, $3, 10, NOW() - ($4::int * INTERVAL '1 day'));
      `,
      [participants[index].id, categoryId, index + 1, 60 - competitionIndex * 12 - index]
    );
  }
};

const resultForMatch = (match, pattern, roundNumber) => {
  if (!match.white_user_id) {
    return "Bye";
  }

  if (pattern === "black") {
    return "Black Win";
  }

  if (pattern === "alternating") {
    return (Number(match.table_number) + roundNumber) % 2 === 0 ? "Black Win" : "White Win";
  }

  const blackSeed = Number(match.black_player_number || 0);
  const whiteSeed = Number(match.white_player_number || 0);
  return blackSeed > 0 && whiteSeed > 0 && blackSeed < whiteSeed ? "Black Win" : "White Win";
};

const completeCompetitionRounds = async ({ competitionId, categoryId, rounds, winnerPattern }) => {
  for (let round = 1; round <= rounds; round += 1) {
    await competitionModel.generateRound({
      competition_id: competitionId,
      category_id: categoryId,
      generated_by: null,
    });

    const tournament = await competitionModel.selectTournament({ competition_id: competitionId });
    const category = tournament.categories.find((item) => Number(item.id) === Number(categoryId));
    const latestRound = Math.max(...category.matches.map((match) => Number(match.round_number || 0)));
    const matches = category.matches.filter((match) => Number(match.round_number) === latestRound);

    for (const match of matches) {
      const result = resultForMatch(match, winnerPattern, round);
      await competitionModel.updateMatchResult({
        match_id: match.id,
        result,
      });
    }

    await competitionModel.recordRankingSnapshot({
      competition_id: competitionId,
      category_id: categoryId,
    });
  }
};

module.exports = async function seedCompletedCompetitions() {
  await db.query("DELETE FROM competitions WHERE title = ANY($1::text[]);", [sampleTitles]);

  const defaults = await selectDefaultIds();

  for (let index = 0; index < sampleCompetitions.length; index += 1) {
    const competition = sampleCompetitions[index];
    const participants = await selectDemoParticipants(competition.participants);

    if (participants.length < competition.participants) {
      throw new Error(`Need ${competition.participants} demo members for ${competition.title}, found ${participants.length}`);
    }

    const created = await createCompetition(competition, defaults);
    await seedRegistrations({
      categoryId: created.categoryId,
      participants,
      competitionIndex: index,
    });
    await completeCompetitionRounds({
      competitionId: created.competitionId,
      categoryId: created.categoryId,
      rounds: competition.rounds,
      winnerPattern: competition.winnerPattern,
    });
  }

  console.log(`Seeded ${sampleCompetitions.length} completed competitions.`);
  console.log("Use demo_member_01 / member123 to see personal competition performance history.");
};
