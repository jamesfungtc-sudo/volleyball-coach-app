// Temporary script to fetch player data for demo generation
import { getPlayers } from './src/services/googleSheetsAPI.js';

async function fetchPlayersByTeams() {
  const homeTeamId = 'c2acb531-9e4b-40be-8c76-8c9ee7239620';
  const opponentTeamId = '96b6331e-5b51-406c-a5de-592ca825d17b';

  try {
    const allPlayers = await getPlayers();

    const homePlayers = allPlayers.filter(p => p.TeamId === homeTeamId);
    const opponentPlayers = allPlayers.filter(p => p.TeamId === opponentTeamId);

    console.log('\n=== HOME TEAM PLAYERS ===');
    homePlayers.forEach(p => {
      console.log(`ID: ${p.Id}, #${p.JerseyNumber} ${p.PreferredName}`);
    });

    console.log('\n=== OPPONENT TEAM PLAYERS ===');
    opponentPlayers.forEach(p => {
      console.log(`ID: ${p.Id}, #${p.JerseyNumber} ${p.PreferredName}`);
    });

    console.log('\n=== Player IDs for Demo ===');
    console.log('Home:', homePlayers.slice(0, 5).map(p => p.Id));
    console.log('Opponent:', opponentPlayers.slice(0, 4).map(p => p.Id));
  } catch (error) {
    console.error('Error:', error);
  }
}

fetchPlayersByTeams();
