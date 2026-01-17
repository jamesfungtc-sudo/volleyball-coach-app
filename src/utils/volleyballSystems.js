// Volleyball systems and rotation logic based on Google Apps Script
export const VOLLEYBALL_SYSTEMS = {
  "5-1 (OH>S)": ["S", "OH (w.s)", "MB", "Oppo", "OH", "MB (w.s)"],
  "5-1 (MB>S)": ["S", "MB (w.s)", "OH", "Oppo", "MB", "OH (w.s)"],
  "4-2": ["S1", "OH1", "MB1", "S2", "OH2", "MB2"],
  "6-2": ["S1/OPP1", "MB1", "OH1", "S2/OPP2", "MB2", "OH2"]
};

export const POSITION_LABELS = [
  { key: "S", label: "S" },
  { key: "OH_WS", label: "OH (w.s)" },
  { key: "MB", label: "MB" },
  { key: "Oppo", label: "Oppo" },
  { key: "OH", label: "OH" },
  { key: "MB_WS", label: "MB (w.s)" },
  { key: "L", label: "L" }
];

// Make starting order based on which role starts in P1
export const makeStartingOrder = (baseArray, startRole) => {
  const idx = baseArray.indexOf(startRole);
  if (idx < 0) {
    throw new Error(`Invalid start role "${startRole}" not found in [${baseArray.join(', ')}]`);
  }
  return baseArray.slice(idx).concat(baseArray.slice(0, idx));
};

// Generate all 6 rotations with libero substitution logic
export const getRotations = (teamObj, orderArray, liberoReplacesRoles = [], manualSwapRole = null, isServing = false) => {
  const allRotations = [];

  for (let r = 0; r < 6; r++) {
    // Shift by r positions
    const rolesShifted = orderArray.map((_, i) => orderArray[(i + r) % 6]);

    // Create occupant objects
    let occupantObjs = rolesShifted.map(role => ({
      role: role,
      name: teamObj[role] || `???(${role})`
    }));

    // Libero substitution in back row (positions 0, 4, 5 = P1, P5, P6)
    // Priority order: P5 > P6 > P1 (substitute first match found)
    // When serving, exclude P1 (serving position) from substitution
    if (teamObj["L"]) {
      let liberoSubstituted = false;

      // Check positions in priority order: P5 (pos 4), P6 (pos 5), P1 (pos 0)
      // If serving, exclude P1 (position 0) from priority - player needs to serve
      const priorityPositions = isServing ? [4, 5] : [4, 5, 0];

      // CASE 1: Manual swap - only substitute for specific role
      if (manualSwapRole) {
        for (const pos of priorityPositions) {
          if (liberoSubstituted) break;

          const ro = occupantObjs[pos].role;
          // Only swap if this position matches manual swap role
          if (ro === manualSwapRole) {
            occupantObjs[pos] = {
              role: "L",
              name: teamObj["L"],
              originalRole: ro  // Track which role libero replaced
            };
            liberoSubstituted = true;
          }
        }
      }
      // CASE 2: Default - use liberoReplacesRoles array with priority
      else if (liberoReplacesRoles && liberoReplacesRoles.length > 0) {
        for (const pos of priorityPositions) {
          if (liberoSubstituted) break;

          const ro = occupantObjs[pos].role;
          // Check if this position's role matches any of the configured replacement targets
          if (liberoReplacesRoles.includes(ro)) {
            occupantObjs[pos] = {
              role: "L",
              name: teamObj["L"],
              originalRole: ro  // Track which role libero replaced
            };
            liberoSubstituted = true;
          }
        }
      }
    }

    allRotations.push(occupantObjs);
  }

  return allRotations;
};

// Convert serving formation to rally formation
export const getRallyLineup = (occupantObjs) => {
  const rally = {};

  // Front row positions [1,2,3] (P2, P3, P4)
  [1, 2, 3].forEach(i => {
    const player = occupantObjs[i];
    if (!player || !player.role || !player.name) {
      // Skip empty positions (e.g., libero on bench)
      return;
    }
    const { role, name } = player;
    if (role.startsWith('MB')) {
      rally.p3 = name; // MB goes to P3 (middle front)
    } else if (role.startsWith('OH')) {
      rally.p4 = name; // OH goes to P4 (left front)
    } else {
      rally.p2 = name; // S/Oppo goes to P2 (right front)
    }
  });

  // Back row positions [0,4,5] (P1, P5, P6)
  [0, 4, 5].forEach(i => {
    const player = occupantObjs[i];
    if (!player || !player.role || !player.name) {
      // Skip empty positions (e.g., libero on bench during serve)
      return;
    }
    const { role, name, originalRole } = player;
    if (role === 'L') {
      // Libero goes to the rally position of the player they're replacing
      if (originalRole && originalRole.startsWith('MB')) {
        rally.p5 = name; // Libero replacing MB → P5 (middle back)
      } else if (originalRole && originalRole.startsWith('OH')) {
        rally.p6 = name; // Libero replacing OH → P6 (left back)
      } else {
        rally.p1 = name; // Libero replacing S/Oppo → P1 (right back)
      }
    } else if (role.startsWith('MB')) {
      rally.p5 = name; // MB → P5 (middle back)
    } else if (role.startsWith('OH')) {
      rally.p6 = name; // OH → P6 (left back)
    } else {
      rally.p1 = name; // S/Oppo → P1 (right back)
    }
  });

  return [rally.p1, rally.p2, rally.p3, rally.p4, rally.p5, rally.p6];
};

export const DEFAULT_TEAM_CONFIG = {
  teamA: {
    players: {
      S: "Yennie",
      "OH (w.s)": "Alice",
      MB: "Elly",
      Oppo: "Toby",
      OH: "Amei",
      "MB (w.s)": "Venus",
      L: "Ding"
    },
    system: "5-1 (OH>S)",
    startingP1: "OH"
  },
  teamB: {
    players: {
      S: "",
      "OH (w.s)": "",
      MB: "",
      Oppo: "",
      OH: "",
      "MB (w.s)": "",
      L: ""
    },
    system: "5-1 (OH>S)",
    startingP1: "MB (w.s)"
  }
};